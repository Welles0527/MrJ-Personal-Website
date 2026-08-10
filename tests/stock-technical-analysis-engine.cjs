"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = vm.createContext({ console });
[
  "technical-indicators.js",
  "technical-structure.js",
  "technical-scores.js",
  "technical-trade-levels.js"
].forEach(file => {
  const source = fs.readFileSync(path.join(__dirname, "..", "public", "stock-tracking", file), "utf8");
  vm.runInContext(source, context, { filename: file });
});
const indicators = context.StockTechnicalIndicators;
const scores = context.StockTechnicalScores;
const trades = context.StockTechnicalTradeLevels;

function tradingDate(index) {
  const date = new Date(Date.UTC(2024, 0, 2 + index));
  return date.toISOString().slice(0, 10);
}

function buildCandles(count = 330) {
  return Array.from({ length: count }, (_, index) => {
    const trend = 18 + index * 0.035;
    const cycle = Math.sin(index / 6) * 0.72 + Math.sin(index / 19) * 0.38;
    const close = trend + cycle;
    const previous = index ? trend - 0.035 + Math.sin((index - 1) / 6) * 0.72 + Math.sin((index - 1) / 19) * 0.38 : close;
    const open = previous + Math.sin(index / 3) * 0.12;
    const range = 0.48 + Math.abs(Math.sin(index / 5)) * 0.24;
    const volume = 750000 + index * 1400 + Math.sin(index / 4) * 120000;
    return {
      date: tradingDate(index),
      open,
      high: Math.max(open, close) + range,
      low: Math.min(open, close) - range,
      close,
      volume,
      amount: volume * close,
      turnoverRate: 2.2 + Math.sin(index / 8) * 0.5
    };
  });
}

function run() {
  const candles = buildCandles();
  const result = scores.calculateTechnicalScore(candles);
  assert.ok(Number.isInteger(result.total));
  assert.ok(result.total >= 0 && result.total <= 100);
  Object.values(result.dimensions).forEach(dimension => {
    assert.ok(Number.isInteger(dimension.score));
    assert.ok(dimension.score >= 0 && dimension.score <= 100);
    assert.ok(dimension.details.every(detail => detail.points === null || (detail.points >= 0 && detail.points <= detail.max)));
  });

  const expected = Math.round(
    result.dimensions.trend.score * 0.30
    + result.dimensions.structure.score * 0.25
    + result.dimensions.momentum.score * 0.20
    + result.dimensions.volumePrice.score * 0.15
    + result.dimensions.volatility.score * 0.10
  );
  assert.strictEqual(result.total, expected);

  const history = scores.calculateScoreHistory(candles, 30, 120);
  assert.strictEqual(history.length, 30);
  assert.strictEqual(history.at(-1).score, result.total);
  assert.ok(history.every(item => Number.isFinite(item.changePct)));
  assert.ok(new Set(history.map(item => item.score)).size > 1, "30日评分不能复制同一个当前值");

  const performance = scores.calculateScorePerformance([
    { date: "2026-01-01", score: 65, changePct: 1 },
    { date: "2026-01-02", score: 70, changePct: 2 },
    { date: "2026-01-03", score: 40, changePct: -1 },
    { date: "2026-01-04", score: 50, changePct: -2 },
    { date: "2026-01-05", score: 30, changePct: 1 },
    { date: "2026-01-06", score: 70, changePct: -1 }
  ]);
  assert.strictEqual(performance.evaluatedCount, 4);
  assert.strictEqual(performance.hitCount, 3);
  assert.strictEqual(performance.hitRate, 75);
  assert.strictEqual(performance.comparisons[1].hit, true);
  assert.strictEqual(performance.comparisons[2].hit, false);
  assert.strictEqual(performance.comparisons[4].hit, null);

  const cutoff = 295;
  const causalAtCutoff = scores.calculateTechnicalScore(candles.slice(0, cutoff)).total;
  const sameCutoffFromLongerSeries = scores
    .calculateScoreHistory(candles, candles.length, 120)
    .find(item => item.date === candles[cutoff - 1].date)?.score;
  assert.strictEqual(causalAtCutoff, sameCutoffFromLongerSeries, "历史评分不得读取截止日之后数据");

  const modified = candles.map(candle => ({ ...candle }));
  for (let index = modified.length - 24; index < modified.length; index += 1) {
    const pressure = (index - (modified.length - 24) + 1) * 0.14;
    modified[index].open -= pressure * 0.8;
    modified[index].close -= pressure;
    modified[index].high = Math.max(modified[index].open, modified[index].close) + 0.35;
    modified[index].low = Math.min(modified[index].open, modified[index].close) - 0.7;
    modified[index].volume *= 1.8;
    modified[index].amount = modified[index].volume * modified[index].close;
  }
  const changed = scores.calculateTechnicalScore(modified);
  assert.notStrictEqual(changed.total, result.total, "修改 OHLCV 后综合评分必须重新计算");
  assert.notDeepStrictEqual(
    Object.fromEntries(Object.entries(changed.dimensions).map(([key, value]) => [key, value.score])),
    Object.fromEntries(Object.entries(result.dimensions).map(([key, value]) => [key, value.score]))
  );

  const indicatorSet = indicators.calculate(candles);
  assert.ok(Number.isFinite(indicatorSet.adx.adx.at(-1)));
  assert.ok(Number.isFinite(indicatorSet.kdj.k.at(-1)));
  assert.ok(Number.isFinite(indicatorSet.boll.bandwidth.at(-1)));
  assert.ok(Number.isFinite(indicatorSet.cmf.at(-1)));

  const clustered = trades.clusterCandidates([
    { source: "MA20", value: 20.1 },
    { source: "平台顶部", value: 20.25 },
    { source: "Swing Low", value: 18.4 }
  ], 0.5);
  assert.strictEqual(clustered.length, 1);
  assert.deepStrictEqual(Array.from(clustered[0].sources).sort(), ["MA20", "平台顶部"].sort());

  console.log(JSON.stringify({ total: result.total, dimensions: Object.fromEntries(Object.entries(result.dimensions).map(([key, value]) => [key, value.score])), historyPoints: history.length, changedTotal: changed.total }));
}

run();
