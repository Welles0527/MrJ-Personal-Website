"use strict";

(function exposeTechnicalStructure(root, factory) {
  const indicators = typeof module === "object" && module.exports
    ? require("./technical-indicators.js")
    : root.StockTechnicalIndicators;
  const api = factory(indicators);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StockTechnicalStructure = api;
})(typeof window !== "undefined" ? window : globalThis, function createTechnicalStructure(indicators) {
  const { clamp, linearRegression } = indicators;
  const finite = value => value !== null && value !== "" && Number.isFinite(Number(value));

  function findConfirmedPivots(candles, radius = 5) {
    const highs = [];
    const lows = [];
    for (let index = radius; index < candles.length - radius; index += 1) {
      const window = candles.slice(index - radius, index + radius + 1);
      const high = candles[index].high;
      const low = candles[index].low;
      if (window.every((candle, offset) => offset === radius || high > candle.high)) {
        highs.push({ index, date: candles[index].date, value: high, confirmedAt: candles[index + radius].date });
      }
      if (window.every((candle, offset) => offset === radius || low < candle.low)) {
        lows.push({ index, date: candles[index].date, value: low, confirmedAt: candles[index + radius].date });
      }
    }
    return { highs, lows };
  }

  function latestPriorResistance(candles, lookback = 20) {
    if (candles.length < 2) return null;
    const end = candles.length - 1;
    const window = candles.slice(Math.max(0, end - lookback), end);
    return window.length ? Math.max(...window.map(candle => candle.high)) : null;
  }

  function scoreStructure(indicatorSet) {
    const { candles, close, ma, atr } = indicatorSet;
    const profile = indicatorSet.profile || {};
    const lookback = Math.max(3, Number(profile.structureLookback) || 20);
    const pivotRadius = Math.max(1, Number(profile.pivotRadius) || 5);
    const minimumBars = Math.max(3, Number(profile.minimumBars) || 60);
    const unit = profile.barLabel || "交易日";
    const maPeriods = profile.maPeriods || [5, 10, 20, 60];
    const index = candles.length - 1;
    if (index < minimumBars - 1) return { score: null, details: [], pivots: { highs: [], lows: [] }, platform: null, channel: null };
    const current = candles[index];
    const pivots = findConfirmedPivots(candles, pivotRadius);
    const recentHighs = pivots.highs.slice(-2);
    const recentLows = pivots.lows.slice(-2);
    const hasHH = recentHighs.length === 2 ? recentHighs[1].value > recentHighs[0].value : null;
    const hasHL = recentLows.length === 2 ? recentLows[1].value > recentLows[0].value : null;
    const hasLH = recentHighs.length === 2 ? recentHighs[1].value < recentHighs[0].value : null;
    const hasLL = recentLows.length === 2 ? recentLows[1].value < recentLows[0].value : null;

    let swingPoints = 10;
    let swingLabel = "枢轴尚未形成完整序列";
    if (hasHH === true && hasHL === true) {
      swingPoints = 30;
      swingLabel = "高点与低点同步抬升（HH + HL）";
    } else if (hasLH === true && hasLL === true) {
      swingPoints = 0;
      swingLabel = "高点与低点同步下移（LH + LL）";
    } else if (hasHH === true || hasHL === true) {
      swingPoints = 18;
      swingLabel = hasHH ? "高点抬升，低点尚待确认" : "低点抬升，高点尚待确认";
    } else if (hasLH === true || hasLL === true) {
      swingPoints = 6;
      swingLabel = hasLH ? "高点下移" : "低点下移";
    }

    const resistance = latestPriorResistance(candles, lookback);
    const atrValue = atr[index];
    const breakoutNow = finite(resistance) && current.close > resistance;
    let recentBreakout = null;
    for (let cursor = Math.max(lookback, index - Math.min(5, lookback)); cursor <= index; cursor += 1) {
      const prior = Math.max(...candles.slice(cursor - lookback, cursor).map(candle => candle.high));
      if (candles[cursor].close > prior) recentBreakout = { index: cursor, date: candles[cursor].date, level: prior };
    }
    let platformPoints = 6;
    let platformLabel = `仍在近${lookback}${unit}平台内部`;
    if (breakoutNow) {
      platformPoints = 25;
      platformLabel = `收盘价突破前${lookback}${unit}压力`;
    } else if (recentBreakout && current.close >= recentBreakout.level - (finite(atrValue) ? atrValue * 0.35 : 0)) {
      platformPoints = 20;
      platformLabel = "近期突破后仍守住平台顶部";
    } else if (finite(resistance) && finite(atrValue) && resistance - current.close <= atrValue) {
      platformPoints = 12;
      platformLabel = `接近近${lookback}${unit}平台压力`;
    }

    const channelWindow = close.slice(-lookback);
    const channel = linearRegression(channelWindow);
    let channelPoints = null;
    let channelLabel = "通道数据不足";
    if (finite(channel.normalizedSlope) && finite(channel.r2)) {
      if (channel.normalizedSlope > 0) {
        const slopeQuality = clamp(channel.normalizedSlope / 0.45, 0, 1);
        channelPoints = clamp(4 + channel.r2 * 10 + slopeQuality * 6, 0, 20);
        channelLabel = `${lookback}${unit}通道向上，拟合度 R² ${channel.r2.toFixed(2)}`;
      } else {
        channelPoints = clamp(5 + channel.normalizedSlope * 8, 0, 5);
        channelLabel = `${lookback}${unit}通道斜率为 ${channel.normalizedSlope.toFixed(2)}%/${unit}`;
      }
    }

    const supportCandidates = [ma[20][index], ma[60][index], recentLows.at(-1)?.value, recentBreakout?.level].filter(finite);
    const nearestSupport = supportCandidates.filter(value => value <= current.close + (atrValue || 0) * 0.25).sort((a, b) => b - a)[0];
    let supportPoints = null;
    let supportLabel = "关键支撑数据不足";
    if (finite(nearestSupport) && finite(atrValue) && atrValue > 0) {
      const distance = (current.close - nearestSupport) / atrValue;
      supportPoints = distance >= -0.2 ? clamp(15 - Math.max(0, distance - 2.5) * 2.5, 4, 15) : 0;
      supportLabel = distance >= -0.2 ? "收盘仍位于关键支撑上方" : "收盘跌破关键支撑";
    }

    const recentHigh = Math.max(...candles.slice(-lookback).map(candle => candle.high));
    const drawdownInAtr = finite(atrValue) && atrValue > 0 ? (recentHigh - current.close) / atrValue : null;
    let pullbackPoints = null;
    let pullbackLabel = "回撤数据不足";
    if (finite(drawdownInAtr)) {
      if (drawdownInAtr >= 0.4 && drawdownInAtr <= 2.2) {
        pullbackPoints = 10;
        pullbackLabel = "回撤幅度处于健康区间";
      } else if (drawdownInAtr < 0.4) {
        pullbackPoints = 7;
        pullbackLabel = "接近阶段高位，回撤空间较小";
      } else {
        pullbackPoints = clamp(8 - (drawdownInAtr - 2.2) * 2.5, 0, 8);
        pullbackLabel = "回撤深度扩大";
      }
    }

    const details = [
      { id: "swing", label: "HH / HL", points: swingPoints, max: 30, evidence: swingLabel },
      { id: "platform", label: "平台突破", points: platformPoints, max: 25, evidence: platformLabel },
      { id: "channel", label: "上升通道", points: channelPoints, max: 20, evidence: channelLabel },
      { id: "support", label: "关键支撑", points: supportPoints, max: 15, evidence: supportLabel },
      { id: "pullback", label: "回撤健康度", points: pullbackPoints, max: 10, evidence: pullbackLabel }
    ];
    const available = details.filter(detail => finite(detail.points));
    const score = available.length
      ? Math.round(100 * available.reduce((sum, detail) => sum + detail.points, 0) / available.reduce((sum, detail) => sum + detail.max, 0))
      : null;
    return {
      score,
      details,
      pivots,
      platform: { resistance, breakoutNow, recentBreakout },
      channel,
      nearestSupport,
      maPeriods,
      flags: { hasHH, hasHL, hasLH, hasLL }
    };
  }

  return { findConfirmedPivots, latestPriorResistance, scoreStructure };
});
