"use strict";

(function createTechnicalChart(global) {
  const instances = new WeakMap();
  const RANGE_DAYS = { "1m": 22, "3m": 66, "6m": 132, "1y": 264, "3y": 780 };
  const colors = {
    text: "#c8d0d8",
    muted: "#7f8b97",
    line: "#26313c",
    rise: "#d85d64",
    fall: "#43a96d",
    ma5: "#e4bd72",
    ma20: "#6f9fd3",
    ma60: "#ae86d6",
    ma120: "#87929d",
    accent: "#ff6848"
  };

  function round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  }

  function movingAverage(values, period) {
    return values.map((_, index) => {
      if (index < period - 1) return "-";
      let sum = 0;
      for (let cursor = 0; cursor < period; cursor += 1) sum += values[index - cursor];
      return round(sum / period);
    });
  }

  function ema(values, period) {
    const multiplier = 2 / (period + 1);
    const result = [];
    let previous = values[0] || 0;
    values.forEach((value, index) => {
      previous = index === 0 ? value : value * multiplier + previous * (1 - multiplier);
      result.push(round(previous, 4));
    });
    return result;
  }

  function macd(values) {
    const fast = ema(values, 12);
    const slow = ema(values, 26);
    const diff = fast.map((value, index) => round(value - slow[index], 4));
    const dea = ema(diff, 9);
    return {
      diff,
      dea,
      histogram: diff.map((value, index) => round((value - dea[index]) * 2, 4))
    };
  }

  function rsi(values, period = 14) {
    const result = new Array(values.length).fill(50);
    let gain = 0;
    let loss = 0;
    for (let index = 1; index < values.length; index += 1) {
      const change = values[index] - values[index - 1];
      const currentGain = Math.max(change, 0);
      const currentLoss = Math.max(-change, 0);
      if (index <= period) {
        gain += currentGain / period;
        loss += currentLoss / period;
      } else {
        gain = (gain * (period - 1) + currentGain) / period;
        loss = (loss * (period - 1) + currentLoss) / period;
      }
      if (index >= period) {
        const strength = loss === 0 ? 100 : gain / loss;
        result[index] = round(100 - 100 / (1 + strength), 2);
      }
    }
    return result;
  }

  function atr(candles, period = 14) {
    let current = 0;
    return candles.map((candle, index) => {
      const previousClose = index === 0 ? candle.close : candles[index - 1].close;
      const trueRange = Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose)
      );
      current = index === 0 ? trueRange : (current * (period - 1) + trueRange) / period;
      return round((current / candle.close) * 100, 2);
    });
  }

  function toWeekly(candles) {
    const weeks = [];
    candles.forEach(candle => {
      const date = new Date(`${candle.time}T12:00:00`);
      const monday = new Date(date);
      const offset = (date.getDay() + 6) % 7;
      monday.setDate(date.getDate() - offset);
      const key = monday.toISOString().slice(0, 10);
      const current = weeks[weeks.length - 1];
      if (!current || current.key !== key) {
        weeks.push({ key, time: candle.time, open: candle.open, close: candle.close, low: candle.low, high: candle.high, volume: candle.volume });
      } else {
        current.time = candle.time;
        current.close = candle.close;
        current.low = Math.min(current.low, candle.low);
        current.high = Math.max(current.high, candle.high);
        current.volume += candle.volume;
      }
    });
    return weeks.map(({ key, ...candle }) => candle);
  }

  function prepareCandles(result, query) {
    const wantedDays = RANGE_DAYS[query.range] || RANGE_DAYS["6m"];
    const source = result.candles.slice(-wantedDays);
    return query.period === "week" ? toWeekly(source) : source;
  }

  function relativeSeries(result, candles) {
    const source = result.indicators.relativeStrength;
    const valueByTime = new Map(source.timestamps.map((time, index) => [time, source.values[index]]));
    let lastValue = 0;
    return candles.map(candle => {
      if (valueByTime.has(candle.time)) lastValue = valueByTime.get(candle.time);
      return lastValue;
    });
  }

  function zoneMarkArea(result, diagnosisId) {
    const opacity = diagnosisId === "structure" ? 0.18 : 0.1;
    return {
      silent: true,
      label: { show: diagnosisId === "structure", color: colors.muted, fontSize: 11, position: "insideTopLeft" },
      data: result.zones.map(zone => [
        {
          name: zone.label,
          yAxis: zone.lower,
          itemStyle: { color: zone.type === "support" ? `rgba(67,169,109,${opacity})` : `rgba(216,93,100,${opacity})` }
        },
        { yAxis: zone.upper }
      ])
    };
  }

  function signalMarkPoints(result, visibleTimes, closeByTime, diagnosisId) {
    const allowedTypes = diagnosisId === "structure" ? ["structure"] : diagnosisId === "momentum" ? ["momentum"] : ["trend", "structure"];
    return result.signals
      .filter(signal => signal.active && allowedTypes.includes(signal.type) && visibleTimes.has(signal.date))
      .map(signal => ({
        name: signal.name,
        coord: [signal.date, closeByTime.get(signal.date)],
        value: signal.name,
        symbol: signal.type === "risk" ? "triangle" : "circle",
        symbolSize: 8,
        itemStyle: { color: signal.type === "risk" ? colors.accent : "#e4bd72" },
        label: { show: false }
      }));
  }

  function baseLine(name, data, color, width = 1.2) {
    return {
      name,
      type: "line",
      data,
      xAxisIndex: 0,
      yAxisIndex: 0,
      symbol: "none",
      smooth: false,
      connectNulls: false,
      lineStyle: { width, color },
      emphasis: { lineStyle: { width: width + 0.8 } },
      z: 4
    };
  }

  function subSeries(indicator, candles, result) {
    const closes = candles.map(item => item.close);
    if (indicator === "volume") {
      return [{
        name: "成交量",
        type: "bar",
        data: candles.map(item => ({
          value: item.volume,
          itemStyle: { color: item.close >= item.open ? "rgba(216,93,100,.62)" : "rgba(67,169,109,.62)" }
        })),
        xAxisIndex: 1,
        yAxisIndex: 1,
        barMaxWidth: 7
      }];
    }
    if (indicator === "macd") {
      const values = macd(closes);
      return [
        {
          name: "MACD柱",
          type: "bar",
          data: values.histogram.map(value => ({ value, itemStyle: { color: value >= 0 ? "rgba(216,93,100,.62)" : "rgba(67,169,109,.62)" } })),
          xAxisIndex: 1,
          yAxisIndex: 1,
          barMaxWidth: 7
        },
        { ...baseLine("DIFF", values.diff, colors.ma5, 1.1), xAxisIndex: 1, yAxisIndex: 1 },
        { ...baseLine("DEA", values.dea, colors.ma20, 1.1), xAxisIndex: 1, yAxisIndex: 1 }
      ];
    }
    if (indicator === "rsi") {
      return [{
        ...baseLine("RSI(14)", rsi(closes), colors.ma20, 1.4),
        xAxisIndex: 1,
        yAxisIndex: 1,
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: { color: "#3a4652", type: "dashed" },
          data: [{ yAxis: 30 }, { yAxis: 70 }]
        }
      }];
    }
    if (indicator === "atr") {
      return [{ ...baseLine("ATR%", atr(candles), colors.accent, 1.4), xAxisIndex: 1, yAxisIndex: 1, areaStyle: { color: "rgba(255,104,72,.08)" } }];
    }
    return [{
      ...baseLine("相对沪深300", relativeSeries(result, candles), colors.ma5, 1.4),
      xAxisIndex: 1,
      yAxisIndex: 1,
      markLine: {
        silent: true,
        symbol: "none",
        label: { show: false },
        lineStyle: { color: "#3a4652", type: "dashed" },
        data: [{ yAxis: 0 }]
      }
    }];
  }

  function buildOption(result, query, indicator, diagnosisId) {
    const candles = prepareCandles(result, query);
    const times = candles.map(item => item.time);
    const closes = candles.map(item => item.close);
    const trendFocus = diagnosisId === "trend" || diagnosisId === "multiTimeframe";
    const chartData = candles.map(item => [item.open, item.close, item.low, item.high]);
    const visibleTimes = new Set(times);
    const closeByTime = new Map(candles.map(item => [item.time, item.close]));
    const mainSeries = [
      {
        name: "K线",
        type: "candlestick",
        data: chartData,
        xAxisIndex: 0,
        yAxisIndex: 0,
        itemStyle: {
          color: colors.rise,
          color0: colors.fall,
          borderColor: colors.rise,
          borderColor0: colors.fall
        },
        markArea: zoneMarkArea(result, diagnosisId),
        markPoint: {
          silent: true,
          data: signalMarkPoints(result, visibleTimes, closeByTime, diagnosisId),
          tooltip: { show: true }
        },
        z: 3
      },
      baseLine("MA5", movingAverage(closes, 5), colors.ma5, trendFocus ? 1.8 : 1.1),
      baseLine("MA20", movingAverage(closes, 20), colors.ma20, trendFocus ? 2 : 1.3),
      baseLine("MA60", movingAverage(closes, 60), colors.ma60, trendFocus ? 1.8 : 1.15),
      baseLine("MA120", movingAverage(closes, 120), colors.ma120, trendFocus ? 1.6 : 1)
    ];

    return {
      animationDuration: 220,
      animationEasing: "cubicOut",
      backgroundColor: "transparent",
      textStyle: { color: colors.text, fontFamily: '"Segoe UI Variable","Microsoft YaHei UI",sans-serif' },
      axisPointer: { link: [{ xAxisIndex: [0, 1] }] },
      legend: {
        top: 8,
        left: 14,
        itemWidth: 18,
        itemHeight: 2,
        textStyle: { color: colors.muted, fontSize: 11 },
        selectedMode: true,
        data: ["K线", "MA5", "MA20", "MA60", "MA120"]
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross", crossStyle: { color: "#5d6a78" }, label: { backgroundColor: "#26313c" } },
        backgroundColor: "rgba(10,17,25,.96)",
        borderColor: "#34414e",
        borderWidth: 1,
        textStyle: { color: colors.text, fontSize: 12 },
        extraCssText: "box-shadow:none;border-radius:6px"
      },
      grid: [
        { left: 66, right: 22, top: 46, height: "56%" },
        { left: 66, right: 22, top: "72%", height: "15%" }
      ],
      xAxis: [
        {
          type: "category",
          data: times,
          boundaryGap: true,
          axisLine: { lineStyle: { color: colors.line } },
          axisTick: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
          min: "dataMin",
          max: "dataMax"
        },
        {
          type: "category",
          gridIndex: 1,
          data: times,
          boundaryGap: true,
          axisLine: { lineStyle: { color: colors.line } },
          axisTick: { show: false },
          axisLabel: { color: colors.muted, fontSize: 10, hideOverlap: true },
          splitLine: { show: false },
          min: "dataMin",
          max: "dataMax"
        }
      ],
      yAxis: [
        {
          scale: true,
          splitNumber: 5,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: colors.muted, fontSize: 10, formatter: value => Number(value).toFixed(2) },
          splitLine: { lineStyle: { color: "rgba(39,50,62,.62)" } }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: colors.muted, fontSize: 9 },
          splitLine: { lineStyle: { color: "rgba(39,50,62,.45)" } }
        }
      ],
      dataZoom: [
        { type: "inside", xAxisIndex: [0, 1], start: 0, end: 100, zoomOnMouseWheel: true, moveOnMouseMove: true },
        {
          type: "slider",
          xAxisIndex: [0, 1],
          bottom: 7,
          height: 16,
          borderColor: "transparent",
          backgroundColor: "#0b121a",
          fillerColor: "rgba(119,169,230,.14)",
          handleStyle: { color: "#62778d", borderColor: "#62778d" },
          moveHandleStyle: { color: "#62778d" },
          dataBackground: { lineStyle: { color: "#526171" }, areaStyle: { color: "#202b36" } },
          selectedDataBackground: { lineStyle: { color: "#779eca" }, areaStyle: { color: "#24394d" } },
          textStyle: { color: colors.muted, fontSize: 9 },
          showDetail: false
        }
      ],
      series: [...mainSeries, ...subSeries(indicator, candles, result)]
    };
  }

  function render(element, result, options) {
    if (!global.echarts || !element || !result) return null;
    let chart = instances.get(element);
    if (!chart) {
      chart = global.echarts.init(element, null, { renderer: "canvas", useDirtyRect: true });
      instances.set(element, chart);
    }
    chart.setOption(buildOption(result, options.query, options.indicator, options.diagnosisId), { notMerge: true, lazyUpdate: false });
    return chart;
  }

  function dispose(element) {
    const chart = instances.get(element);
    if (chart) {
      chart.dispose();
      instances.delete(element);
    }
  }

  function resize(element) {
    instances.get(element)?.resize();
  }

  global.StockTechnicalChart = { render, resize, dispose };
})(window);
