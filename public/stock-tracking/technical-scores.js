"use strict";

(function exposeTechnicalScores(root, factory) {
  const indicators = typeof module === "object" && module.exports
    ? require("./technical-indicators.js")
    : root.StockTechnicalIndicators;
  const structure = typeof module === "object" && module.exports
    ? require("./technical-structure.js")
    : root.StockTechnicalStructure;
  const api = factory(indicators, structure);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StockTechnicalScores = api;
})(typeof window !== "undefined" ? window : globalThis, function createTechnicalScores(indicators, structure) {
  const { clamp, slopePercent, linearRegression } = indicators;
  const finite = value => value !== null && value !== "" && Number.isFinite(Number(value));
  const DIMENSION_WEIGHTS = { trend: 30, structure: 25, momentum: 20, volumePrice: 15, volatility: 10 };

  function normalizedDetails(details) {
    const available = details.filter(detail => finite(detail.points));
    if (!available.length) return null;
    const earned = available.reduce((sum, detail) => sum + Number(detail.points), 0);
    const possible = available.reduce((sum, detail) => sum + Number(detail.max), 0);
    return possible ? Math.round(clamp(100 * earned / possible, 0, 100)) : null;
  }

  function signedScore(value, low, high) {
    if (!finite(value)) return null;
    return 100 * clamp((Number(value) - low) / (high - low), 0, 1);
  }

  function calculateTrendScore(set) {
    const profile = set.profile || {};
    const maPeriods = profile.maPeriods || [5, 10, 20, 60];
    const slopeLookbacks = profile.slopeLookbacks || [5, 10];
    const slopeThresholds = profile.slopeThresholds || [4, 5];
    const index = set.candles.length - 1;
    const close = set.close[index];
    const ma5 = set.ma[5][index];
    const ma10 = set.ma[10][index];
    const ma20 = set.ma[20][index];
    const ma60 = set.ma[60][index];
    const arrangementConditions = [close > ma5, ma5 > ma10, ma10 > ma20, ma20 > ma60];
    const arrangementPoints = [close, ma5, ma10, ma20, ma60].every(finite)
      ? arrangementConditions.filter(Boolean).length / arrangementConditions.length * 30
      : null;
    const ma20Slope = slopePercent(set.ma[20].slice(0, index + 1), slopeLookbacks[0]);
    const ma60Slope = slopePercent(set.ma[60].slice(0, index + 1), slopeLookbacks[1]);
    const slopeParts = [
      { value: finite(ma20Slope) ? signedScore(ma20Slope, -slopeThresholds[0], slopeThresholds[0]) : null, weight: 0.6 },
      { value: finite(ma60Slope) ? signedScore(ma60Slope, -slopeThresholds[1], slopeThresholds[1]) : null, weight: 0.4 }
    ].filter(part => finite(part.value));
    const slopeWeight = slopeParts.reduce((sum, part) => sum + part.weight, 0);
    const slopePoints = slopeParts.length
      ? slopeParts.reduce((sum, part) => sum + part.value * part.weight, 0) / slopeWeight * 0.25
      : null;
    const dif = set.macd.dif[index];
    const dea = set.macd.dea[index];
    const histogram = set.macd.histogram[index];
    const previousHistogram = set.macd.histogram[index - 1];
    const macdConditions = [dif > dea, dif > 0, dea > 0, histogram > 0, histogram > previousHistogram];
    const macdPoints = [dif, dea, histogram, previousHistogram].every(finite)
      ? macdConditions.filter(Boolean).length / macdConditions.length * 25
      : null;
    const adx = set.adx.adx[index];
    const plusDI = set.adx.plusDI[index];
    const minusDI = set.adx.minusDI[index];
    let adxPoints = null;
    if ([adx, plusDI, minusDI].every(finite)) {
      const strength = adx < 15 ? adx / 15 * 25 : adx < 25 ? 25 + (adx - 15) * 3.5 : adx < 35 ? 60 + (adx - 25) * 3 : 90 + Math.min(10, adx - 35);
      adxPoints = strength / 100 * 20 * (plusDI > minusDI ? 1 : 0.2);
    }
    const details = [
      { id: "arrangement", label: "均线排列", points: arrangementPoints, max: 30, evidence: finite(arrangementPoints) ? `${arrangementConditions.filter(Boolean).length}/4 个多头条件成立` : "均线数据不足" },
      { id: "slope", label: "均线斜率", points: slopePoints, max: 25, evidence: finite(ma20Slope) && finite(ma60Slope) ? `MA${maPeriods[2]} ${ma20Slope.toFixed(2)}%，MA${maPeriods[3]} ${ma60Slope.toFixed(2)}%` : "斜率数据不足" },
      { id: "macd", label: "MACD 趋势", points: macdPoints, max: 25, evidence: finite(macdPoints) ? `${macdConditions.filter(Boolean).length}/5 个趋势条件成立` : "MACD 数据不足" },
      { id: "adx", label: "ADX", points: adxPoints, max: 20, evidence: finite(adx) ? `ADX ${adx.toFixed(1)}，${plusDI > minusDI ? "+DI 占优" : "-DI 占优"}` : "ADX 数据不足" }
    ];
    return { score: normalizedDetails(details), details, values: { ma20Slope, ma60Slope, adx, plusDI, minusDI } };
  }

  function rsiHealthScore(value) {
    if (!finite(value)) return null;
    if (value < 30) return signedScore(value, 10, 30) * 0.25;
    if (value < 50) return 25 + (value - 30) / 20 * 35;
    if (value < 60) return 60 + (value - 50) / 10 * 35;
    if (value <= 72) return 95 + (value - 60) / 12 * 5;
    if (value <= 80) return 100 - (value - 72) / 8 * 25;
    return clamp(75 - (value - 80) * 2.5, 25, 75);
  }

  function detectBearishDivergence(set) {
    const index = set.candles.length - 1;
    const lookback = Math.max(2, Number(set.profile?.divergenceLookback) || 20);
    if (index < lookback * 2) return false;
    const recentPrice = Math.max(...set.close.slice(index - lookback + 1, index + 1));
    const priorPrice = Math.max(...set.close.slice(index - lookback * 2 + 1, index - lookback + 1));
    const recentRsi = Math.max(...set.rsi.slice(index - lookback + 1, index + 1).filter(finite));
    const priorRsi = Math.max(...set.rsi.slice(index - lookback * 2 + 1, index - lookback + 1).filter(finite));
    const recentMacd = Math.max(...set.macd.histogram.slice(index - lookback + 1, index + 1).filter(finite));
    const priorMacd = Math.max(...set.macd.histogram.slice(index - lookback * 2 + 1, index - lookback + 1).filter(finite));
    return recentPrice > priorPrice && (recentRsi < priorRsi || recentMacd < priorMacd);
  }

  function calculateMomentumScore(set) {
    const profile = set.profile || {};
    const unit = profile.barLabel || "交易日";
    const momentumLookback = Math.min(3, Math.max(1, Number(profile.slopeLookbacks?.[0]) || 3));
    const index = set.candles.length - 1;
    const rsi = set.rsi[index];
    const rsiPoints = finite(rsi) ? rsiHealthScore(rsi) * 0.3 : null;
    const histogram = set.macd.histogram[index];
    const hist3Ago = set.macd.histogram[index - momentumLookback];
    const dif = set.macd.dif[index];
    const previousDif = set.macd.dif[index - 1];
    const dea = set.macd.dea[index];
    const previousDea = set.macd.dea[index - 1];
    let macdHealth = null;
    if ([histogram, hist3Ago, dif, previousDif, dea, previousDea].every(finite)) {
      macdHealth = 20;
      macdHealth += histogram > 0 ? 30 : 0;
      macdHealth += histogram > hist3Ago ? 25 : 0;
      macdHealth += dif > previousDif ? 15 : 0;
      macdHealth += dea > previousDea ? 10 : 0;
      if (histogram < 0 && histogram < hist3Ago) macdHealth = Math.max(0, macdHealth - 20);
    }
    const macdPoints = finite(macdHealth) ? macdHealth * 0.35 : null;
    const k = set.kdj.k[index];
    const d = set.kdj.d[index];
    const j = set.kdj.j[index];
    const previousK = set.kdj.k[index - 1];
    const previousD = set.kdj.d[index - 1];
    let kdjHealth = null;
    if ([k, d, j, previousK, previousD].every(finite)) {
      kdjHealth = 35 + (k > d ? 30 : 0) + (k > previousK && d > previousD ? 25 : 0);
      if (j > 95) kdjHealth -= Math.min(25, (j - 95) * 0.8 + 10);
      kdjHealth = clamp(kdjHealth, 0, 100);
    }
    const kdjPoints = finite(kdjHealth) ? kdjHealth * 0.2 : null;
    const roc = set.roc[index];
    let rocHealth = null;
    if (finite(roc)) {
      if (roc <= -15) rocHealth = 5;
      else if (roc < 0) rocHealth = 5 + (roc + 15) / 15 * 40;
      else if (roc <= 10) rocHealth = 45 + roc / 10 * 55;
      else if (roc <= 20) rocHealth = 100 - (roc - 10) * 3;
      else rocHealth = clamp(70 - (roc - 20) * 2, 20, 70);
    }
    const rocPoints = finite(rocHealth) ? rocHealth * 0.15 : null;
    const details = [
      { id: "rsi", label: "RSI", points: rsiPoints, max: 30, evidence: finite(rsi) ? `RSI${profile.rsiPeriod || 14} ${rsi.toFixed(1)}` : "RSI 数据不足" },
      { id: "macdMomentum", label: "MACD 动能", points: macdPoints, max: 35, evidence: finite(histogram) ? `柱体 ${histogram >= 0 ? "为正" : "为负"}且近${momentumLookback}${unit}${histogram > hist3Ago ? "增强" : "减弱"}` : "MACD 数据不足" },
      { id: "kdj", label: "KDJ", points: kdjPoints, max: 20, evidence: finite(k) ? `K ${k.toFixed(1)} / D ${d.toFixed(1)} / J ${j.toFixed(1)}` : "KDJ 数据不足" },
      { id: "roc", label: "ROC", points: rocPoints, max: 15, evidence: finite(roc) ? `${profile.rocPeriod || 10}${unit} ROC ${roc.toFixed(2)}%` : "ROC 数据不足" }
    ];
    const divergence = detectBearishDivergence(set);
    const rawScore = normalizedDetails(details);
    return { score: finite(rawScore) ? Math.round(clamp(rawScore - (divergence ? 10 : 0), 0, 100)) : null, details, divergence, values: { rsi, histogram, roc, k, d, j } };
  }

  function calculateVolumePriceScore(set, structureResult) {
    const profile = set.profile || {};
    const unit = profile.barLabel || "交易日";
    const volumePeriods = profile.volumePeriods || [5, 20];
    const index = set.candles.length - 1;
    const avg5 = set.volumeAverage[5][index];
    const avg20 = set.volumeAverage[20][index];
    const ratio = finite(avg5) && finite(avg20) && avg20 ? avg5 / avg20 : null;
    const priceSlope = index >= volumePeriods[0] ? 100 * (set.close[index] / set.close[index - volumePeriods[0]] - 1) : null;
    let ratioHealth = null;
    if (finite(ratio)) {
      if (ratio < 0.6) ratioHealth = 25;
      else if (ratio < 1.1) ratioHealth = 25 + (ratio - 0.6) / 0.5 * 45;
      else if (ratio <= 1.8) ratioHealth = 85 + (1 - Math.abs(ratio - 1.4) / 0.4) * 15;
      else if (ratio <= 2.5) ratioHealth = 85 - (ratio - 1.8) / 0.7 * 35;
      else ratioHealth = clamp(50 - (ratio - 2.5) * 20, 10, 50);
      if (finite(priceSlope) && priceSlope < 0 && ratio > 1.3) ratioHealth *= 0.65;
    }
    const ratioPoints = finite(ratioHealth) ? clamp(ratioHealth, 0, 100) * 0.3 : null;

    const obvLookback = Math.max(3, volumePeriods[1]);
    const obvWindow = set.obv.slice(-(obvLookback + 1));
    const obvRegression = obvWindow.length === obvLookback + 1 ? linearRegression(obvWindow) : { normalizedSlope: null };
    const obvNewHigh = set.obv[index] >= Math.max(...set.obv.slice(Math.max(0, index - obvLookback + 1), index + 1));
    let obvHealth = finite(obvRegression.normalizedSlope) ? signedScore(obvRegression.normalizedSlope, -4, 4) : null;
    if (finite(obvHealth) && obvNewHigh) obvHealth = clamp(obvHealth + 15, 0, 100);
    if (finite(obvHealth) && finite(priceSlope) && priceSlope > 0 && obvRegression.normalizedSlope < 0) obvHealth = clamp(obvHealth - 30, 0, 100);
    const obvPoints = finite(obvHealth) ? obvHealth * 0.25 : null;

    const cmf = set.cmf[index];
    const cmfHealth = finite(cmf) ? signedScore(cmf, -0.2, 0.2) : null;
    const cmfPoints = finite(cmfHealth) ? cmfHealth * 0.25 : null;
    const resistance = structureResult.platform?.resistance;
    const atr = set.atr[index];
    const nearResistance = finite(resistance) && finite(atr) && resistance - set.close[index] <= atr;
    const breakout = structureResult.platform?.breakoutNow || structureResult.platform?.recentBreakout;
    let confirmationHealth = 50;
    let confirmationEvidence = "当前未处于主要突破窗口";
    if (breakout || nearResistance) {
      confirmationHealth = finite(ratio) && ratio >= 1.3 ? 100 : finite(ratio) && ratio < 0.9 ? 10 : 40;
      confirmationEvidence = finite(ratio) && ratio >= 1.3 ? "压力位附近量比达到放量确认" : "压力位附近尚未获得量能确认";
    }
    const confirmationPoints = confirmationHealth * 0.2;
    const details = [
      { id: "volumeRatio", label: "Volume Ratio", points: ratioPoints, max: 30, evidence: finite(ratio) ? `${volumePeriods[0]}${unit}/${volumePeriods[1]}${unit}均量 ${ratio.toFixed(2)}` : "成交量数据不足" },
      { id: "obv", label: "OBV", points: obvPoints, max: 25, evidence: finite(obvRegression.normalizedSlope) ? `OBV ${obvLookback}${unit}斜率 ${obvRegression.normalizedSlope.toFixed(2)}%/${unit}` : "OBV 数据不足" },
      { id: "cmf", label: "CMF", points: cmfPoints, max: 25, evidence: finite(cmf) ? `CMF${profile.cmfPeriod || 20} ${cmf.toFixed(3)}` : "CMF 数据不足" },
      { id: "breakoutVolume", label: "突破量能", points: confirmationPoints, max: 20, evidence: confirmationEvidence }
    ];
    return { score: normalizedDetails(details), details, values: { ratio, cmf, obvSlope: obvRegression.normalizedSlope, priceSlope }, confirmedBreakout: Boolean(breakout && finite(ratio) && ratio >= 1.3) };
  }

  function bellPercentileScore(percentile) {
    if (!finite(percentile)) return null;
    if (percentile < 25) return 35 + percentile / 25 * 35;
    if (percentile <= 70) return 70 + (1 - Math.abs(percentile - 52.5) / 22.5) * 30;
    if (percentile <= 88) return 85 - (percentile - 70) / 18 * 35;
    return clamp(50 - (percentile - 88) * 3, 10, 50);
  }

  function calculateVolatilityScore(set) {
    const profile = set.profile || {};
    const unit = profile.barLabel || "交易日";
    const volatilityPeriods = profile.volatilityPeriods || [5, 20];
    const percentileLookback = profile.percentileLookback || 120;
    const index = set.candles.length - 1;
    const bandwidth = set.boll.bandwidth[index];
    const bandwidthPercentile = set.boll.percentile[index];
    const previousBandwidth = set.boll.bandwidth[index - volatilityPeriods[0]];
    const compressionThenExpansion = finite(bandwidth) && finite(previousBandwidth) && bandwidth > previousBandwidth && bandwidthPercentile < 80;
    let bollHealth = bellPercentileScore(bandwidthPercentile);
    if (finite(bollHealth) && compressionThenExpansion) bollHealth = clamp(bollHealth + 15, 0, 100);
    const bollPoints = finite(bollHealth) ? bollHealth * 0.35 : null;
    const atrPercentile = set.atrPercentile[index];
    const atrHealth = bellPercentileScore(atrPercentile);
    const atrPoints = finite(atrHealth) ? atrHealth * 0.25 : null;
    const rv5 = set.realizedVolatility[5][index];
    const rv20 = set.realizedVolatility[20][index];
    const rvRatio = finite(rv5) && finite(rv20) && rv20 ? rv5 / rv20 : null;
    let rvHealth = null;
    if (finite(rvRatio)) {
      if (rvRatio < 0.6) rvHealth = 35;
      else if (rvRatio < 1.05) rvHealth = 35 + (rvRatio - 0.6) / 0.45 * 50;
      else if (rvRatio <= 1.5) rvHealth = 100;
      else if (rvRatio <= 2) rvHealth = 100 - (rvRatio - 1.5) / 0.5 * 55;
      else rvHealth = clamp(45 - (rvRatio - 2) * 25, 5, 45);
    }
    const rvPoints = finite(rvHealth) ? rvHealth * 0.2 : null;
    const recentExtremeRatios = set.trueRange.slice(-volatilityPeriods[0]).map((range, offset) => {
      const candleIndex = index - volatilityPeriods[0] + 1 + offset;
      const atr = set.atr[candleIndex - 1] ?? set.atr[candleIndex];
      return finite(atr) && atr > 0 ? range / atr : null;
    }).filter(finite);
    const extremeRatio = recentExtremeRatios.length ? Math.max(...recentExtremeRatios) : null;
    const extremeHealth = finite(extremeRatio) ? (extremeRatio > 3 ? 0 : extremeRatio > 2.2 ? 40 : 100) : null;
    const extremePoints = finite(extremeHealth) ? extremeHealth * 0.2 : null;
    const details = [
      { id: "boll", label: "BOLL 带宽", points: bollPoints, max: 35, evidence: finite(bandwidthPercentile) ? `${percentileLookback}${unit}分位 ${bandwidthPercentile.toFixed(0)}%，${compressionThenExpansion ? "压缩后扩张" : "未形成压缩后扩张"}` : "BOLL 数据不足" },
      { id: "atr", label: "ATR%", points: atrPoints, max: 25, evidence: finite(atrPercentile) ? `ATR% ${percentileLookback}${unit}分位 ${atrPercentile.toFixed(0)}%` : "ATR 数据不足" },
      { id: "realizedVol", label: "实现波动率", points: rvPoints, max: 20, evidence: finite(rvRatio) ? `${volatilityPeriods[0]}${unit}/${volatilityPeriods[1]}${unit}实现波动率 ${rvRatio.toFixed(2)}` : "波动率数据不足" },
      { id: "extremeRisk", label: "极端波动风险", points: extremePoints, max: 20, evidence: finite(extremeRatio) ? `近${volatilityPeriods[0]}${unit}最大 TR/ATR ${extremeRatio.toFixed(2)}` : "极端风险数据不足" }
    ];
    return { score: normalizedDetails(details), details, values: { bandwidth, bandwidthPercentile, atrPercentile, rvRatio, extremeRatio }, compressionThenExpansion };
  }

  function calculateTotalScore(dimensions) {
    const available = Object.entries(DIMENSION_WEIGHTS)
      .filter(([key]) => finite(dimensions[key]?.score));
    if (!available.length) return null;
    const weighted = available.reduce((sum, [key, weight]) => sum + dimensions[key].score * weight, 0);
    const weightSum = available.reduce((sum, [, weight]) => sum + weight, 0);
    return Math.round(clamp(weighted / weightSum, 0, 100));
  }

  function scoreLabel(total, dimensions) {
    if (!finite(total)) return "行情数据未连接";
    let label = total >= 85 ? "强势上行"
      : total >= 75 ? "综合偏强"
        : total >= 65 ? "偏多震荡"
          : total >= 45 ? "中性震荡"
            : total >= 30 ? "综合偏弱"
              : "弱势下行";
    if (label === "强势上行" && (dimensions.trend?.score < 45 || dimensions.structure?.score < 45)) label = "综合偏强";
    return label;
  }

  function calculateTechnicalScore(candlesInput, options = {}) {
    const indicatorSet = indicators.calculate(candlesInput, options);
    const minimumBars = Number(indicatorSet.profile?.minimumBars) || 60;
    if (indicatorSet.candles.length < minimumBars) {
      return { total: null, label: "行情数据不足", dimensions: {}, indicators: indicatorSet, structure: null, chips: [] };
    }
    const structureResult = structure.scoreStructure(indicatorSet);
    const dimensions = {
      trend: calculateTrendScore(indicatorSet),
      structure: structureResult,
      momentum: calculateMomentumScore(indicatorSet),
      volumePrice: calculateVolumePriceScore(indicatorSet, structureResult),
      volatility: calculateVolatilityScore(indicatorSet)
    };
    const total = calculateTotalScore(dimensions);
    const chips = [];
    if (dimensions.trend.score >= 75) chips.push({ id: "trend", label: "多头趋势", tone: "blue" });
    if (structureResult.platform?.breakoutNow || structureResult.platform?.recentBreakout) chips.push({ id: "breakout", label: "平台突破", tone: "green" });
    if (dimensions.volumePrice.score >= 70) chips.push({ id: "volume", label: "量价配合", tone: "mint" });
    if (dimensions.volatility.compressionThenExpansion) chips.push({ id: "volatility", label: "波动扩张", tone: "yellow" });
    if (dimensions.momentum.score >= 70) chips.push({ id: "momentum", label: "动能偏强", tone: "purple" });
    return { total, label: scoreLabel(total, dimensions), dimensions, indicators: indicatorSet, structure: structureResult, chips };
  }

  function calculateScoreHistory(candles, count = 30, minimumHistory = 120, options = {}) {
    const normalized = indicators.normalizeCandles(candles);
    const start = Math.max(minimumHistory - 1, normalized.length - count);
    const history = [];
    for (let index = start; index < normalized.length; index += 1) {
      const result = calculateTechnicalScore(normalized.slice(0, index + 1), options);
      const previousClose = normalized[index - 1]?.close;
      const changePct = Number.isFinite(previousClose) && previousClose !== 0
        ? (normalized[index].close / previousClose - 1) * 100
        : null;
      history.push({ date: normalized[index].date, score: result.total, changePct });
    }
    return history.slice(-count);
  }

  function scoreSignal(score) {
    const value = Number(score);
    if (!Number.isFinite(value)) return { id: "neutral", label: "无有效评分" };
    if (value >= 65) return { id: "bullish", label: "偏多" };
    if (value < 45) return { id: "bearish", label: "偏空" };
    return { id: "neutral", label: "中性" };
  }

  function calculateScorePerformance(scoreHistory, options = {}) {
    const fromDate = String(options.fromDate || "");
    let hitCount = 0;
    let evaluatedCount = 0;
    const comparisons = (Array.isArray(scoreHistory) ? scoreHistory : []).map((item, index, history) => {
      const previous = history[index - 1];
      const signal = scoreSignal(previous?.score);
      const changePct = Number(item?.changePct);
      const direction = Number.isFinite(changePct) && changePct !== 0 ? (changePct > 0 ? "up" : "down") : "flat";
      const inPeriod = !fromDate || String(item?.date || "") >= fromDate;
      const eligible = inPeriod && Boolean(previous) && signal.id !== "neutral" && direction !== "flat";
      const hit = eligible ? (signal.id === "bullish" ? direction === "up" : direction === "down") : null;
      if (eligible) {
        evaluatedCount += 1;
        if (hit) hitCount += 1;
      }
      return {
        ...item,
        priorScore: Number.isFinite(Number(previous?.score)) ? Number(previous.score) : null,
        signal: signal.id,
        signalLabel: signal.label,
        direction,
        hit
      };
    });
    const periodComparisons = fromDate ? comparisons.filter(item => String(item.date || "") >= fromDate) : comparisons;
    const comparableCount = periodComparisons.filter(item => item.priorScore !== null).length;
    return {
      comparisons: periodComparisons,
      hitCount,
      evaluatedCount,
      ignoredCount: Math.max(0, comparableCount - evaluatedCount),
      hitRate: evaluatedCount ? Math.round(hitCount / evaluatedCount * 100) : null,
      methodology: "前一交易日评分≥65视为偏多、<45视为偏空，对照下一交易日涨跌方向；中性评分和平盘不计。"
    };
  }

  return {
    DIMENSION_WEIGHTS,
    calculateTrendScore,
    calculateMomentumScore,
    calculateVolumePriceScore,
    calculateVolatilityScore,
    calculateTotalScore,
    calculateTechnicalScore,
    calculateScoreHistory,
    calculateScorePerformance,
    scoreSignal,
    scoreLabel,
    detectBearishDivergence
  };
});
