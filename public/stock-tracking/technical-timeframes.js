"use strict";

(function exposeTechnicalTimeframes(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StockTechnicalTimeframes = api;
})(typeof window !== "undefined" ? window : globalThis, function createTechnicalTimeframes() {
  const PROFILES = {
    day: {
      id: "day", label: "日", lineLabel: "日线", barLabel: "交易日", sourcePeriod: "day", sourceLimit: 360,
      minimumBars: 60, historyMinimum: 120, historyCount: 30, validationMonths: 3, validationLabel: "近3个月",
      periodsPerYear: 252, maPeriods: [5, 10, 20, 60], macdPeriods: [12, 26, 9], rsiPeriod: 14,
      atrPeriod: 14, adxPeriod: 14, kdjPeriod: 9, bollPeriod: 20, cmfPeriod: 20, rocPeriod: 10,
      volumePeriods: [5, 20], volatilityPeriods: [5, 20], percentileLookback: 120,
      slopeLookbacks: [5, 10], slopeThresholds: [4, 5], structureLookback: 20, pivotRadius: 5, divergenceLookback: 20
    },
    week: {
      id: "week", label: "周", lineLabel: "周线", barLabel: "周", sourcePeriod: "week", sourceLimit: 360,
      minimumBars: 60, historyMinimum: 120, historyCount: 30, validationMonths: 12, validationLabel: "近12个月",
      periodsPerYear: 52, maPeriods: [4, 8, 13, 26], macdPeriods: [12, 26, 9], rsiPeriod: 14,
      atrPeriod: 14, adxPeriod: 14, kdjPeriod: 9, bollPeriod: 20, cmfPeriod: 20, rocPeriod: 10,
      volumePeriods: [4, 13], volatilityPeriods: [4, 13], percentileLookback: 104,
      slopeLookbacks: [4, 8], slopeThresholds: [8, 10], structureLookback: 20, pivotRadius: 3, divergenceLookback: 13
    },
    month: {
      id: "month", label: "月", lineLabel: "月线", barLabel: "月", sourcePeriod: "month", sourceLimit: 360,
      minimumBars: 36, historyMinimum: 36, historyCount: 30, validationMonths: 36, validationLabel: "近3年",
      periodsPerYear: 12, maPeriods: [3, 6, 12, 24], macdPeriods: [6, 12, 5], rsiPeriod: 9,
      atrPeriod: 6, adxPeriod: 6, kdjPeriod: 6, bollPeriod: 12, cmfPeriod: 6, rocPeriod: 6,
      volumePeriods: [3, 12], volatilityPeriods: [3, 12], percentileLookback: 60,
      slopeLookbacks: [3, 6], slopeThresholds: [15, 20], structureLookback: 12, pivotRadius: 2, divergenceLookback: 8
    },
    quarter: {
      id: "quarter", label: "季", lineLabel: "季线", barLabel: "季度", sourcePeriod: "month", sourceLimit: 500,
      minimumBars: 12, historyMinimum: 12, historyCount: 24, validationMonths: 72, validationLabel: "近6年",
      periodsPerYear: 4, maPeriods: [2, 4, 8, 12], macdPeriods: [4, 8, 3], rsiPeriod: 6,
      atrPeriod: 4, adxPeriod: 4, kdjPeriod: 4, bollPeriod: 8, cmfPeriod: 4, rocPeriod: 4,
      volumePeriods: [2, 8], volatilityPeriods: [2, 8], percentileLookback: 24,
      slopeLookbacks: [2, 4], slopeThresholds: [25, 35], structureLookback: 8, pivotRadius: 1, divergenceLookback: 6
    },
    year: {
      id: "year", label: "年", lineLabel: "年线", barLabel: "年度", sourcePeriod: "month", sourceLimit: 500,
      minimumBars: 4, historyMinimum: 4, historyCount: 20, validationMonths: 240, validationLabel: "近20年",
      periodsPerYear: 1, maPeriods: [1, 2, 3, 5], macdPeriods: [2, 4, 2], rsiPeriod: 3,
      atrPeriod: 2, adxPeriod: 2, kdjPeriod: 3, bollPeriod: 3, cmfPeriod: 3, rocPeriod: 2,
      volumePeriods: [1, 3], volatilityPeriods: [2, 3], percentileLookback: 5,
      slopeLookbacks: [1, 2], slopeThresholds: [40, 60], structureLookback: 4, pivotRadius: 1, divergenceLookback: 2
    }
  };

  function normalizePeriod(value) {
    const period = String(value || "day").toLowerCase();
    return Object.hasOwn(PROFILES, period) ? period : "day";
  }

  function getProfile(value) {
    return PROFILES[normalizePeriod(value)];
  }

  function aggregateCandles(candlesInput, period) {
    const normalizedPeriod = normalizePeriod(period);
    if (!["quarter", "year"].includes(normalizedPeriod)) return Array.isArray(candlesInput) ? candlesInput.slice() : [];
    const groups = new Map();
    (Array.isArray(candlesInput) ? candlesInput : []).forEach(candle => {
      const [year, month] = String(candle?.date || "").split("-").map(Number);
      if (!Number.isFinite(year) || !Number.isFinite(month)) return;
      const key = normalizedPeriod === "year" ? String(year) : `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(candle);
    });
    const candles = [...groups.values()].map(items => {
      const first = items[0];
      const last = items.at(-1);
      const finite = value => Number.isFinite(Number(value));
      const sum = key => items.reduce((total, item) => total + (finite(item[key]) ? Number(item[key]) : 0), 0);
      return {
        date: last.date,
        open: Number(first.open),
        high: Math.max(...items.map(item => Number(item.high))),
        low: Math.min(...items.map(item => Number(item.low))),
        close: Number(last.close),
        volume: sum("volume"),
        amount: sum("amount"),
        turnoverRate: items.some(item => finite(item.turnoverRate)) ? sum("turnoverRate") : null
      };
    });
    return candles.map((candle, index) => {
      const previousClose = candles[index - 1]?.close;
      const change = Number.isFinite(previousClose) ? candle.close - previousClose : null;
      return {
        ...candle,
        change,
        changePct: Number.isFinite(change) && previousClose ? change / previousClose * 100 : null,
        amplitude: Number.isFinite(previousClose) && previousClose ? (candle.high - candle.low) / previousClose * 100 : null
      };
    });
  }

  return { PROFILES, normalizePeriod, getProfile, aggregateCandles };
});
