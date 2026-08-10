"use strict";

(function exposeTechnicalIndicators(root, factory) {
  const timeframes = typeof module === "object" && module.exports
    ? require("./technical-timeframes.js")
    : root.StockTechnicalTimeframes;
  const api = factory(timeframes);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StockTechnicalIndicators = api;
})(typeof window !== "undefined" ? window : globalThis, function createTechnicalIndicators(timeframes) {
  const finite = value => value !== null && value !== "" && Number.isFinite(Number(value));
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  function normalizeCandles(candles) {
    return (Array.isArray(candles) ? candles : [])
      .map(candle => ({
        date: String(candle.date || candle.time || ""),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume),
        amount: finite(candle.amount) ? Number(candle.amount) : null,
        turnoverRate: finite(candle.turnoverRate) ? Number(candle.turnoverRate) : null
      }))
      .filter(candle => candle.date && [candle.open, candle.high, candle.low, candle.close, candle.volume].every(finite))
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  function sma(values, period) {
    const result = new Array(values.length).fill(null);
    let sum = 0;
    let valid = 0;
    for (let index = 0; index < values.length; index += 1) {
      const value = Number(values[index]);
      if (Number.isFinite(value)) {
        sum += value;
        valid += 1;
      }
      if (index >= period) {
        const expired = Number(values[index - period]);
        if (Number.isFinite(expired)) {
          sum -= expired;
          valid -= 1;
        }
      }
      if (index >= period - 1 && valid === period) result[index] = sum / period;
    }
    return result;
  }

  function ema(values, period) {
    const result = new Array(values.length).fill(null);
    const multiplier = 2 / (period + 1);
    let previous = null;
    values.forEach((rawValue, index) => {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) return;
      previous = previous === null ? value : value * multiplier + previous * (1 - multiplier);
      result[index] = previous;
    });
    return result;
  }

  function macd(values, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fast = ema(values, fastPeriod);
    const slow = ema(values, slowPeriod);
    const dif = values.map((_, index) => finite(fast[index]) && finite(slow[index]) ? fast[index] - slow[index] : null);
    const dea = ema(dif, signalPeriod);
    const histogram = dif.map((value, index) => finite(value) && finite(dea[index]) ? (value - dea[index]) * 2 : null);
    return { dif, dea, histogram };
  }

  function rsi(values, period = 14) {
    const result = new Array(values.length).fill(null);
    if (values.length <= period) return result;
    let averageGain = 0;
    let averageLoss = 0;
    for (let index = 1; index <= period; index += 1) {
      const change = Number(values[index]) - Number(values[index - 1]);
      averageGain += Math.max(change, 0);
      averageLoss += Math.max(-change, 0);
    }
    averageGain /= period;
    averageLoss /= period;
    result[period] = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss));
    for (let index = period + 1; index < values.length; index += 1) {
      const change = Number(values[index]) - Number(values[index - 1]);
      averageGain = ((averageGain * (period - 1)) + Math.max(change, 0)) / period;
      averageLoss = ((averageLoss * (period - 1)) + Math.max(-change, 0)) / period;
      result[index] = averageLoss === 0 ? 100 : 100 - (100 / (1 + averageGain / averageLoss));
    }
    return result;
  }

  function trueRanges(candles) {
    return candles.map((candle, index) => {
      const previousClose = index ? candles[index - 1].close : candle.close;
      return Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose)
      );
    });
  }

  function wilder(values, period) {
    const result = new Array(values.length).fill(null);
    if (values.length < period) return result;
    let seed = 0;
    for (let index = 0; index < period; index += 1) seed += Number(values[index]) || 0;
    result[period - 1] = seed / period;
    for (let index = period; index < values.length; index += 1) {
      result[index] = ((result[index - 1] * (period - 1)) + (Number(values[index]) || 0)) / period;
    }
    return result;
  }

  function atr(candles, period = 14) {
    return wilder(trueRanges(candles), period);
  }

  function adx(candles, period = 14) {
    const plusDm = new Array(candles.length).fill(0);
    const minusDm = new Array(candles.length).fill(0);
    for (let index = 1; index < candles.length; index += 1) {
      const upMove = candles[index].high - candles[index - 1].high;
      const downMove = candles[index - 1].low - candles[index].low;
      plusDm[index] = upMove > downMove && upMove > 0 ? upMove : 0;
      minusDm[index] = downMove > upMove && downMove > 0 ? downMove : 0;
    }
    const averageTr = wilder(trueRanges(candles), period);
    const averagePlus = wilder(plusDm, period);
    const averageMinus = wilder(minusDm, period);
    const plusDI = candles.map((_, index) => finite(averageTr[index]) && averageTr[index] !== 0
      ? 100 * averagePlus[index] / averageTr[index]
      : null);
    const minusDI = candles.map((_, index) => finite(averageTr[index]) && averageTr[index] !== 0
      ? 100 * averageMinus[index] / averageTr[index]
      : null);
    const dx = candles.map((_, index) => {
      if (!finite(plusDI[index]) || !finite(minusDI[index])) return null;
      const sum = plusDI[index] + minusDI[index];
      return sum ? 100 * Math.abs(plusDI[index] - minusDI[index]) / sum : 0;
    });
    const compactDx = dx.map(value => finite(value) ? value : 0);
    const adxValues = wilder(compactDx, period).map((value, index) => index < (period * 2 - 2) ? null : value);
    return { adx: adxValues, plusDI, minusDI };
  }

  function kdj(candles, period = 9) {
    const k = new Array(candles.length).fill(null);
    const d = new Array(candles.length).fill(null);
    const j = new Array(candles.length).fill(null);
    let previousK = 50;
    let previousD = 50;
    for (let index = period - 1; index < candles.length; index += 1) {
      const window = candles.slice(index - period + 1, index + 1);
      const highest = Math.max(...window.map(item => item.high));
      const lowest = Math.min(...window.map(item => item.low));
      const rsv = highest === lowest ? 50 : 100 * (candles[index].close - lowest) / (highest - lowest);
      previousK = previousK * 2 / 3 + rsv / 3;
      previousD = previousD * 2 / 3 + previousK / 3;
      k[index] = previousK;
      d[index] = previousD;
      j[index] = 3 * previousK - 2 * previousD;
    }
    return { k, d, j };
  }

  function bollinger(values, period = 20, multiplier = 2) {
    const middle = sma(values, period);
    const upper = new Array(values.length).fill(null);
    const lower = new Array(values.length).fill(null);
    const bandwidth = new Array(values.length).fill(null);
    for (let index = period - 1; index < values.length; index += 1) {
      const window = values.slice(index - period + 1, index + 1).map(Number);
      const mean = middle[index];
      const variance = window.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / period;
      const deviation = Math.sqrt(variance);
      upper[index] = mean + multiplier * deviation;
      lower[index] = mean - multiplier * deviation;
      bandwidth[index] = mean ? (upper[index] - lower[index]) / mean : null;
    }
    return { middle, upper, lower, bandwidth };
  }

  function obv(candles) {
    const result = new Array(candles.length).fill(0);
    for (let index = 1; index < candles.length; index += 1) {
      const direction = Math.sign(candles[index].close - candles[index - 1].close);
      result[index] = result[index - 1] + direction * candles[index].volume;
    }
    return result;
  }

  function cmf(candles, period = 20) {
    const flow = candles.map(candle => {
      const range = candle.high - candle.low;
      const multiplier = range ? ((candle.close - candle.low) - (candle.high - candle.close)) / range : 0;
      return multiplier * candle.volume;
    });
    const result = new Array(candles.length).fill(null);
    for (let index = period - 1; index < candles.length; index += 1) {
      const start = index - period + 1;
      const flowSum = flow.slice(start, index + 1).reduce((sum, value) => sum + value, 0);
      const volumeSum = candles.slice(start, index + 1).reduce((sum, candle) => sum + candle.volume, 0);
      result[index] = volumeSum ? flowSum / volumeSum : null;
    }
    return result;
  }

  function roc(values, period = 10) {
    return values.map((value, index) => {
      if (index < period || !finite(values[index - period]) || Number(values[index - period]) === 0) return null;
      return 100 * (Number(value) / Number(values[index - period]) - 1);
    });
  }

  function realizedVolatility(values, period, periodsPerYear = 252) {
    const returns = values.map((value, index) => index
      ? Math.log(Number(value) / Number(values[index - 1]))
      : null);
    const result = new Array(values.length).fill(null);
    for (let index = period; index < values.length; index += 1) {
      const sample = returns.slice(index - period + 1, index + 1).filter(finite).map(Number);
      if (sample.length !== period) continue;
      const mean = sample.reduce((sum, value) => sum + value, 0) / sample.length;
      const variance = sample.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / sample.length;
      result[index] = Math.sqrt(variance) * Math.sqrt(periodsPerYear);
    }
    return result;
  }

  function percentileSeries(values, lookback = 120) {
    return values.map((rawValue, index) => {
      if (!finite(rawValue)) return null;
      const start = Math.max(0, index - lookback + 1);
      const sample = values.slice(start, index + 1).filter(finite).map(Number);
      if (sample.length < Math.min(30, lookback)) return null;
      const belowOrEqual = sample.filter(value => value <= Number(rawValue)).length;
      return 100 * belowOrEqual / sample.length;
    });
  }

  function slopePercent(values, lookback) {
    const last = values.length - 1;
    const previous = last - lookback;
    if (previous < 0 || !finite(values[last]) || !finite(values[previous]) || Number(values[previous]) === 0) return null;
    return 100 * (Number(values[last]) / Number(values[previous]) - 1);
  }

  function linearRegression(values) {
    const sample = values.map(Number).filter(Number.isFinite);
    if (sample.length !== values.length || sample.length < 2) return { slope: null, normalizedSlope: null, r2: null };
    const n = sample.length;
    const meanX = (n - 1) / 2;
    const meanY = sample.reduce((sum, value) => sum + value, 0) / n;
    let numerator = 0;
    let denominator = 0;
    let totalVariance = 0;
    let residualVariance = 0;
    sample.forEach((value, index) => {
      numerator += (index - meanX) * (value - meanY);
      denominator += (index - meanX) ** 2;
    });
    const slope = denominator ? numerator / denominator : 0;
    const intercept = meanY - slope * meanX;
    sample.forEach((value, index) => {
      const predicted = intercept + slope * index;
      totalVariance += (value - meanY) ** 2;
      residualVariance += (value - predicted) ** 2;
    });
    const r2 = totalVariance ? clamp(1 - residualVariance / totalVariance, 0, 1) : 0;
    return { slope, normalizedSlope: meanY ? 100 * slope / meanY : null, r2 };
  }

  function calculate(candlesInput, options = {}) {
    const candles = normalizeCandles(candlesInput);
    const close = candles.map(candle => candle.close);
    const volume = candles.map(candle => candle.volume);
    const profile = options.profile || timeframes?.getProfile(options.period) || timeframes?.getProfile("day") || {};
    const maPeriods = profile.maPeriods || [5, 10, 20, 60];
    const macdPeriods = profile.macdPeriods || [12, 26, 9];
    const volumePeriods = profile.volumePeriods || [5, 20];
    const volatilityPeriods = profile.volatilityPeriods || [5, 20];
    const ma = {
      5: sma(close, maPeriods[0]),
      10: sma(close, maPeriods[1]),
      20: sma(close, maPeriods[2]),
      60: sma(close, maPeriods[3])
    };
    const macdValues = macd(close, ...macdPeriods);
    const rsiValues = rsi(close, profile.rsiPeriod || 14);
    const atrValues = atr(candles, profile.atrPeriod || 14);
    const adxValues = adx(candles, profile.adxPeriod || 14);
    const kdjValues = kdj(candles, profile.kdjPeriod || 9);
    const boll = bollinger(close, profile.bollPeriod || 20, 2);
    const obvValues = obv(candles);
    const cmfValues = cmf(candles, profile.cmfPeriod || 20);
    const rocValues = roc(close, profile.rocPeriod || 10);
    const rv5 = realizedVolatility(close, volatilityPeriods[0], profile.periodsPerYear || 252);
    const rv20 = realizedVolatility(close, volatilityPeriods[1], profile.periodsPerYear || 252);
    return {
      candles,
      close,
      volume,
      ma,
      macd: macdValues,
      rsi: rsiValues,
      atr: atrValues,
      adx: adxValues,
      kdj: kdjValues,
      profile,
      boll: { ...boll, percentile: percentileSeries(boll.bandwidth, profile.percentileLookback || 120) },
      obv: obvValues,
      cmf: cmfValues,
      roc: rocValues,
      realizedVolatility: { 5: rv5, 20: rv20 },
      atrPercentile: percentileSeries(atrValues.map((value, index) => finite(value) && close[index] ? value / close[index] : null), profile.percentileLookback || 120),
      trueRange: trueRanges(candles),
      volumeAverage: { 5: sma(volume, volumePeriods[0]), 20: sma(volume, volumePeriods[1]) }
    };
  }

  return {
    clamp,
    normalizeCandles,
    sma,
    ema,
    macd,
    rsi,
    atr,
    adx,
    kdj,
    bollinger,
    obv,
    cmf,
    roc,
    realizedVolatility,
    percentileSeries,
    slopePercent,
    linearRegression,
    calculate
  };
});
