"use strict";

(function exposeTechnicalTradeLevels(root, factory) {
  const indicators = typeof module === "object" && module.exports
    ? require("./technical-indicators.js")
    : root.StockTechnicalIndicators;
  const api = factory(indicators);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StockTechnicalTradeLevels = api;
})(typeof window !== "undefined" ? window : globalThis, function createTechnicalTradeLevels(indicators) {
  const { clamp } = indicators;
  const finite = value => value !== null && value !== "" && Number.isFinite(Number(value));

  function uniqueCandidates(candidates) {
    const seen = new Set();
    return candidates.filter(candidate => {
      if (!finite(candidate.value)) return false;
      const key = `${candidate.source}:${Number(candidate.value).toFixed(4)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function clusterCandidates(candidates, atr) {
    if (!finite(atr) || atr <= 0) return [];
    const threshold = 0.8 * atr;
    const clusters = [];
    uniqueCandidates(candidates).forEach(seed => {
      const members = candidates.filter(candidate => Math.abs(candidate.value - seed.value) < threshold);
      const sources = [...new Set(members.map(member => member.source))];
      if (sources.length < 2) return;
      const values = members.map(member => member.value);
      const cluster = {
        lower: Math.min(...values),
        upper: Math.max(...values),
        center: values.reduce((sum, value) => sum + value, 0) / values.length,
        sources,
        strength: sources.length
      };
      if (!clusters.some(existing => Math.abs(existing.center - cluster.center) < atr * 0.15)) clusters.push(cluster);
    });
    return clusters.sort((left, right) => right.strength - left.strength || left.center - right.center);
  }

  function calculateTradeLevels(scoreResult) {
    const set = scoreResult.indicators;
    const structure = scoreResult.structure;
    const profile = set.profile || {};
    const unit = profile.barLabel || "交易日";
    const maPeriods = profile.maPeriods || [5, 10, 20, 60];
    const structureLookback = Math.max(3, Number(profile.structureLookback) || 20);
    const longLookback = Math.max(structureLookback, maPeriods[3] || 60);
    const majorLookback = Math.max(longLookback, Number(profile.percentileLookback) || 120);
    const index = set.candles.length - 1;
    const current = set.candles[index];
    const atr = set.atr[index];
    if (!current || !finite(atr) || atr <= 0) {
      return { buyZone: null, breakout: null, stop: null, targets: [], reduceSignal: null, supports: [], resistances: [] };
    }

    const lastSwingLow = structure.pivots.lows.at(-1)?.value;
    const lastSwingHigh = structure.pivots.highs.at(-1)?.value;
    const priorResistance = structure.platform?.resistance;
    const recentBreakoutLevel = structure.platform?.recentBreakout?.level;
    const high20 = Math.max(...set.candles.slice(Math.max(0, index - structureLookback), index).map(candle => candle.high));
    const high60 = Math.max(...set.candles.slice(Math.max(0, index - longLookback), index).map(candle => candle.high));
    const historicalHigh = Math.max(...set.candles.slice(Math.max(0, index - majorLookback), index).map(candle => candle.high));
    const supports = uniqueCandidates([
      { source: `MA${maPeriods[2]}`, value: set.ma[20][index] },
      { source: `MA${maPeriods[3]}`, value: set.ma[60][index] },
      { source: "最近 Swing Low", value: lastSwingLow },
      { source: "突破平台顶部", value: recentBreakoutLevel }
    ]).filter(candidate => candidate.value <= current.close + atr * 0.25);
    const resistances = uniqueCandidates([
      { source: "最近 Swing High", value: lastSwingHigh },
      { source: `${structureLookback}${unit}高点`, value: high20 },
      { source: `${longLookback}${unit}高点`, value: high60 },
      { source: "平台顶部", value: priorResistance },
      { source: "BOLL 上轨", value: set.boll.upper[index] },
      { source: `${majorLookback}${unit}重要高点`, value: historicalHigh }
    ]);
    const supportClusters = clusterCandidates(supports, atr)
      .filter(cluster => cluster.center <= current.close + atr * 0.25)
      .sort((left, right) => right.center - left.center || right.strength - left.strength);
    const resistanceClusters = clusterCandidates(resistances, atr)
      .filter(cluster => cluster.center >= current.close - atr * 0.25)
      .sort((left, right) => left.center - right.center || right.strength - left.strength);
    const support = supportClusters[0] || null;
    const pressure = resistanceClusters[0] || null;
    const buyZone = support ? {
      lower: support.lower - atr * 0.12,
      upper: support.upper + atr * 0.12,
      sources: support.sources,
      label: "缩量回踩"
    } : null;
    const volumeRatio = scoreResult.dimensions.volumePrice.values.ratio;
    const breakoutLevel = finite(priorResistance)
      ? priorResistance
      : resistances.filter(candidate => candidate.value >= current.close).sort((a, b) => a.value - b.value)[0]?.value;
    const breakoutTriggered = finite(breakoutLevel) && current.close > breakoutLevel && finite(volumeRatio) && volumeRatio >= 1.3;
    const breakout = finite(breakoutLevel) ? {
      price: breakoutLevel,
      triggered: breakoutTriggered,
      label: breakoutTriggered ? "放量突破买点" : "关注突破",
      condition: `收盘站上且量比≥1.30（当前${finite(volumeRatio) ? volumeRatio.toFixed(2) : "--"}）`
    } : null;
    let stopBase = finite(support?.lower) ? support.lower : (finite(lastSwingLow) ? lastSwingLow : null);
    if (finite(support?.lower) && finite(lastSwingLow) && Math.abs(support.lower - lastSwingLow) < atr * 1.5) {
      stopBase = Math.min(support.lower, lastSwingLow);
    }
    const stop = finite(stopBase) ? stopBase - atr * 0.4 : null;
    const entry = buyZone ? (buyZone.lower + buyZone.upper) / 2 : current.close;
    const risk = finite(stop) && entry > stop ? entry - stop : atr;
    const targetFloor = Math.max(entry, current.close) + atr * 0.2;
    const overhead = uniqueCandidates(resistances)
      .map(candidate => candidate.value)
      .filter(value => value > targetFloor)
      .sort((a, b) => a - b)
      .filter((value, position, values) => position === 0 || value - values[position - 1] > atr * 0.35);
    const target1 = overhead[0] ?? entry + 2 * risk;
    const target2Candidate = overhead.find(value => value > target1 + atr * 0.35);
    const target2 = target2Candidate ?? Math.max(entry + 3 * risk, target1 + risk);
    const rsi = scoreResult.dimensions.momentum.values.rsi;
    const hist = set.macd.histogram;
    const momentumFalling = hist.slice(-3).every(finite) && hist.at(-1) < hist.at(-2) && hist.at(-2) < hist.at(-3);
    const nearPressure = pressure && Math.abs(pressure.center - current.close) < atr * 0.5;
    const reduceSignal = nearPressure && (rsi > 75 || scoreResult.dimensions.momentum.divergence || momentumFalling)
      ? {
          active: true,
          label: "接近压力区且动量衰减",
          evidence: [
            `距离压力共振区 ${Math.abs(pressure.center - current.close).toFixed(2)}，小于 0.5 ATR`,
            rsi > 75 ? `RSI ${rsi.toFixed(1)} 偏热` : scoreResult.dimensions.momentum.divergence ? "价格与动量出现顶背离" : `MACD 动量连续3${unit}下降`
          ]
        }
      : { active: false, label: "暂未出现减仓共振", evidence: ["需同时接近强压力区并出现动量衰减"] };

    return {
      buyZone,
      breakout,
      stop,
      targets: [target1, target2].filter(finite),
      reduceSignal,
      supports,
      resistances,
      supportClusters,
      resistanceClusters,
      atr,
      entry,
      confidence: clamp(((support?.strength || 0) + (pressure?.strength || 0)) / 6 * 100, 0, 100)
    };
  }

  return { clusterCandidates, calculateTradeLevels };
});
