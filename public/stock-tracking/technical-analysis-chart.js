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
    const reduceMotion = global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    chart.setOption({
      animation: !reduceMotion,
      animationDuration: 420,
      animationEasing: "cubicOut",
      grid: { top: 18, right: 26, bottom: 28, left: 42, containLabel: false },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(5,7,9,.96)",
        borderColor: "rgba(255,255,255,.12)",
        textStyle: { color: "#f7f8fc" },
        formatter: points => `${points[0].axisValue}<br><strong>综合技术评分 ${points[0].value}</strong>`
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: data.map(item => item.date.slice(5)),
        axisLine: { lineStyle: { color: "rgba(255,255,255,.09)" } },
        axisTick: { show: false },
        axisLabel: { color: "rgba(220,225,238,.52)", fontSize: 10, interval: Math.max(0, Math.floor(data.length / 6) - 1) }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "rgba(220,225,238,.48)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,.055)" } }
      },
      series: [{
        type: "line",
        smooth: 0.32,
        showSymbol: false,
        symbol: "circle",
        symbolSize: 8,
        data: data.map(item => item.score),
        lineStyle: { color: "#7188ff", width: 2.2 },
        itemStyle: { color: "#93a5ff" },
        areaStyle: {
          color: new global.echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(113,136,255,.38)" },
            { offset: 1, color: "rgba(41,223,183,.015)" }
          ])
        },
        markPoint: {
          symbol: "circle",
          symbolSize: 10,
          label: { show: false },
          data: data.length ? [{ coord: [data.length - 1, data.at(-1).score] }] : [],
          itemStyle: { color: "#78f0c3", borderColor: "#07100d", borderWidth: 2 }
        }
      }]
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
