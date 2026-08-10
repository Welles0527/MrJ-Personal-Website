"use strict";

(function createTechnicalChart(global) {
  const instances = new WeakMap();
  const dimensionOrder = ["trend", "structure", "momentum", "volatility", "volumePrice"];
  const labels = { trend: "趋势", structure: "结构", momentum: "动量", volumePrice: "量价", volatility: "波动" };
  const colors = { trend: "#75a5ff", structure: "#53e1bc", momentum: "#34eda4", volumePrice: "#a77bff", volatility: "#ffb84d" };

  function getChart(element) {
    if (!element || !global.echarts) return null;
    let chart = instances.get(element);
    if (!chart) {
      chart = global.echarts.init(element, null, { renderer: "canvas", useDirtyRect: true });
      instances.set(element, chart);
    }
    return chart;
  }

  function detailsHtml(result, id) {
    const dimension = result.scores.dimensions[id];
    return `<div class="ta-echart-tooltip"><strong>${labels[id]}评分 ${dimension.score ?? "--"}</strong>${dimension.details.map(detail => `<span>${detail.label}<b>${Number.isFinite(Number(detail.points)) ? `${Number(detail.points).toFixed(1)}/${detail.max}` : "--"}</b></span>`).join("")}</div>`;
  }

  function renderRadar(element, result) {
    const chart = getChart(element);
    if (!chart || !result) return;
    const reduceMotion = global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    chart.setOption({
      animation: !reduceMotion,
      animationDuration: 420,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        confine: true,
        backgroundColor: "rgba(5,7,9,.96)",
        borderColor: "rgba(255,255,255,.12)",
        borderWidth: 1,
        padding: 0,
        textStyle: { color: "#f7f8fc" },
        formatter: params => dimensionOrder.map(id => detailsHtml(result, id)).join("")
      },
      radar: {
        center: ["50%", "52%"],
        radius: "68%",
        startAngle: 90,
        splitNumber: 4,
        shape: "circle",
        indicator: dimensionOrder.map(id => ({ name: labels[id], max: 100 })),
        name: { color: "rgba(228,232,242,.5)", fontSize: 11, formatter: () => "" },
        axisNameGap: 0,
        axisLine: { lineStyle: { color: "rgba(140,157,189,.16)", width: 1 } },
        splitLine: { lineStyle: { color: ["rgba(140,157,189,.08)", "rgba(140,157,189,.10)", "rgba(140,157,189,.13)", "rgba(140,157,189,.17)"], width: 1 } },
        splitArea: { areaStyle: { color: ["rgba(59,76,108,.015)", "rgba(59,76,108,.035)"] } }
      },
      series: [{
        type: "radar",
        silent: false,
        symbol: "circle",
        symbolSize: 8,
        data: [{
          value: dimensionOrder.map(id => result.scores.dimensions[id].score),
          name: "五维技术评分",
          lineStyle: { color: "#7a91ff", width: 2 },
          areaStyle: { color: "rgba(94,105,255,.27)" },
          itemStyle: { color: "#d9e2ff", borderColor: "#5b7cff", borderWidth: 2 }
        }]
      }]
    }, { notMerge: true });
  }

  function renderTrend(element, result) {
    const chart = getChart(element);
    if (!chart || !result) return;
    const data = result.scoreHistory.filter(item => Number.isFinite(Number(item.score)));
    const comparisons = result.scorePerformance?.comparisons || [];
    const comparisonByDate = new Map(comparisons.map(item => [item.date, item]));
    const dates = data.map(item => item.date);
    const maximumMove = Math.max(2, Math.ceil(Math.max(...data.map(item => Math.abs(Number(item.changePct) || 0)))));
    const reduceMotion = global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    chart.setOption({
      animation: !reduceMotion,
      animationDuration: 420,
      animationEasing: "cubicOut",
      grid: [
        { top: 14, right: 32, height: "49%", left: 46, containLabel: false },
        { top: "67%", right: 32, bottom: 30, left: 46, containLabel: false }
      ],
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: "rgba(5,7,9,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#f7f8fc" },
        formatter: points => {
          const date = points[0]?.axisValue;
          const item = data.find(entry => entry.date === date);
          const comparison = comparisonByDate.get(date);
          const changePct = Number(item?.changePct);
          const changeLabel = Number.isFinite(changePct) ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : "--";
          const verdict = comparison?.hit === true ? "命中" : comparison?.hit === false ? "未命中" : "不计入样本";
          return `<div class="ta-echart-tooltip ta-comparison-tooltip"><strong>${date}</strong><span>综合技术评分<b>${item?.score ?? "--"}</b></span><span>当日涨跌幅<b>${changeLabel}</b></span><span>前日评分信号<b>${comparison?.signalLabel || "--"}${Number.isFinite(comparison?.priorScore) ? ` ${comparison.priorScore}` : ""}</b></span><span>方向验证<b>${verdict}</b></span></div>`;
        }
      },
      axisPointer: { link: [{ xAxisIndex: [0, 1] }] },
      xAxis: [
        {
          type: "category",
          gridIndex: 0,
          boundaryGap: true,
          data: dates,
          axisLine: { lineStyle: { color: "rgba(255,255,255,.09)" } },
          axisTick: { show: false },
          axisLabel: { show: false }
        },
        {
          type: "category",
          gridIndex: 1,
          boundaryGap: true,
          data: dates,
          axisLine: { lineStyle: { color: "rgba(255,255,255,.12)" } },
          axisTick: { show: false },
          axisLabel: {
            color: "rgba(220,225,238,.52)",
            fontSize: 10,
            formatter: value => value.slice(5),
            interval: Math.max(0, Math.floor(data.length / 6) - 1)
          }
        }
      ],
      yAxis: [
        {
          type: "value",
          gridIndex: 0,
          min: 0,
          max: 100,
          interval: 25,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: "rgba(220,225,238,.48)", fontSize: 10 },
          splitLine: { lineStyle: { color: "rgba(255,255,255,.055)" } }
        },
        {
          type: "value",
          gridIndex: 1,
          min: -maximumMove,
          max: maximumMove,
          splitNumber: 2,
          axisLine: { show: true, lineStyle: { color: "rgba(255,255,255,.14)" } },
          axisTick: { show: false },
          axisLabel: { color: "rgba(220,225,238,.48)", fontSize: 10, formatter: value => `${value}%` },
          splitLine: { lineStyle: { color: "rgba(255,255,255,.045)" } }
        }
      ],
      series: [
        {
          name: "综合技术评分",
          type: "bar",
          xAxisIndex: 0,
          yAxisIndex: 0,
          barMaxWidth: 18,
          data: data.map(item => item.score),
          itemStyle: {
            color: params => params.dataIndex === data.length - 1 ? "#4ee0bc" : "#7891ff",
            borderRadius: [4, 4, 0, 0]
          },
          markLine: {
            silent: true,
            symbol: "none",
            label: { show: false },
            lineStyle: { type: "dashed", width: 1, color: "rgba(162,120,255,.28)" },
            data: [{ yAxis: 60 }, { yAxis: 45 }]
          }
        },
        {
          name: "当日涨跌幅",
          type: "bar",
          xAxisIndex: 1,
          yAxisIndex: 1,
          barMaxWidth: 18,
          data: data.map(item => Number.isFinite(Number(item.changePct)) ? Number(item.changePct) : 0),
          itemStyle: {
            color: params => params.value > 0 ? "#ff6b78" : params.value < 0 ? "#38e79f" : "#9496a0",
            borderRadius: params => params.value >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3]
          }
        }
      ]
    }, { notMerge: true });
  }

  function resize(element) {
    instances.get(element)?.resize();
  }

  function dispose(element) {
    const chart = instances.get(element);
    if (chart) chart.dispose();
    instances.delete(element);
  }

  global.StockTechnicalChart = { renderRadar, renderTrend, resize, dispose };
})(window);
