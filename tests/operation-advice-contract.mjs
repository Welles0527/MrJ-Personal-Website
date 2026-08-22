import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("public/stock-tracking/operation-advice-engine.js", "utf8");
const pageSource = fs.readFileSync("public/stock-tracking/operation-advice-page.js", "utf8");
const appSource = fs.readFileSync("public/stock-tracking/app.js", "utf8");
const entrySource = fs.readFileSync("src/pages/stock-tracking/index.astro", "utf8");

const commonJsContext = { module: { exports: {} }, exports: {} };
commonJsContext.globalThis = commonJsContext;
vm.runInNewContext(source, commonJsContext, { filename: "operation-advice-engine.js" });
const engine = commonJsContext.module.exports;

const browserContext = { window: {} };
browserContext.globalThis = browserContext;
vm.runInNewContext(source, browserContext, { filename: "operation-advice-engine.browser.js" });
vm.runInNewContext(pageSource, browserContext, { filename: "operation-advice-page.browser.js" });

assert.equal(commonJsContext.StockOperationAdviceEngine, engine, "CommonJS 分支也应暴露全局 API");
assert.equal(browserContext.window.StockOperationAdviceEngine.ENGINE_VERSION, engine.ENGINE_VERSION, "浏览器应暴露 StockOperationAdviceEngine");
assert.equal(browserContext.window.StockOperationAdviceEngine.ENGINE_VERSION, "three-layer-v2", "审查修复后必须更新引擎版本");
for (const method of ["calculateWeightedScore", "buildPeriodState", "evaluate"]) {
  assert.equal(typeof engine[method], "function", `缺少 ${method} 导出`);
}

for (const fragment of [
  '"operation-advice"',
  "StockOperationAdvicePage.create",
  "renderOperationAdviceView",
  '["operation-advice", "flag", "操作建议"]'
]) {
  assert.ok(appSource.includes(fragment), `应用路由缺少操作建议接线：${fragment}`);
}
for (const asset of ["operation-advice.css", "operation-advice-engine.js", "operation-advice-page.js"]) {
  assert.ok(entrySource.includes(asset), `页面入口缺少操作建议资源：${asset}`);
}
assert.ok(
  entrySource.indexOf("operation-advice-engine.js") < entrySource.indexOf("operation-advice-page.js")
    && entrySource.indexOf("operation-advice-page.js") < entrySource.indexOf("app.js"),
  "操作建议脚本必须按 engine -> page -> app 顺序加载"
);
assert.ok(pageSource.includes("Promise.allSettled(PERIODS.map"), "操作建议页必须独立读取五周期真实行情");
assert.ok(pageSource.includes("stock-tracking-score-matrix-weights-v1"), "操作建议页必须复用评分矩阵当前权重");
for (const field of ["score", "slope", "distance_to_boundary", "heat", "structure_break", "confidence"]) {
  assert.ok(pageSource.includes(field), `操作建议快照缺少持久化字段：${field}`);
}

const pageInternals = browserContext.window.StockOperationAdvicePage.internals;
assert.equal(pageInternals.finite(null), false, "null 不能被当成有效数值 0");
assert.equal(pageInternals.finite(undefined), false, "undefined 不能被当成有效数值 0");
assert.equal(pageInternals.finite(""), false, "空字符串不能被当成有效数值 0");
assert.equal(pageInternals.finite(0), true, "真实的数值 0 必须保留");

const fridayClose = Date.parse("2026-08-21T07:05:00Z");
assert.equal(pageInternals.isCompletedPeriod("2026-08-21", "week", fridayClose - 1), false, "周五 15:05 前不能纳入当周");
assert.equal(pageInternals.isCompletedPeriod("2026-08-21", "week", fridayClose), true, "周五 15:05 后应纳入当周");
assert.equal(pageInternals.isCompletedPeriod("2026-08-21", "week", Date.parse("2026-08-22T04:00:00Z")), true, "周末应保留已完成周线");
const holidayWeekClose = Date.parse("2026-10-02T07:05:00Z");
assert.equal(pageInternals.isCompletedPeriod("2026-10-01", "week", holidayWeekClose - 1), false, "周四为最后交易日时仍应等到周五收盘截止");
assert.equal(pageInternals.isCompletedPeriod("2026-10-01", "week", holidayWeekClose), true, "自然周截止后应确认节假日周线");
assert.equal(pageInternals.isCompletedPeriod("2026-08-21", "month", Date.parse("2026-08-22T00:00:00Z")), false, "月中不能使用未完成月线");
assert.equal(pageInternals.isCompletedPeriod("2026-08-21", "quarter", Date.parse("2026-08-22T00:00:00Z")), false, "季度中不能使用未完成季线");
assert.equal(pageInternals.isCompletedPeriod("2026-08-21", "year", Date.parse("2026-08-22T00:00:00Z")), false, "年中不能使用未完成年线");
assert.equal(pageInternals.isCompletedPeriod("2026-12-31", "year", Date.parse("2027-01-01T00:00:00Z")), true, "次年应确认上一完整年线");

browserContext.window.StockTechnicalTimeframes = {
  getProfile: period => ({ id: period, lineLabel: `${period}-line`, minimumBars: 1, historyCount: 4, historyMinimum: 1 })
};
browserContext.window.StockTechnicalScores = {
  calculateTechnicalScore: (candles, { profile }) => ({
    total: candles.at(-1).close,
    dimensions: {},
    indicators: { profile }
  }),
  calculateScoreHistory: candles => candles.map(candle => ({ date: candle.date, score: candle.close }))
};
browserContext.window.StockTechnicalTradeLevels = {
  calculateTradeLevels: scoreResult => ({ atr: scoreResult.total / 10 })
};
const completedMonth = pageInternals.completedDecisionResult({
  overview: { period: "month", scoreDate: "2026-08-21" },
  candles: [{ date: "2026-07-31", close: 10 }, { date: "2026-08-21", close: 12 }],
  dataMeta: { period: "month" }
}, "month", Date.parse("2026-08-22T00:00:00Z"));
assert.equal(completedMonth.candles.length, 1, "操作建议必须过滤未完成高周期 K 线");
assert.equal(completedMonth.scores.total, 10, "当前分数必须由已完成周期重新计算");
assert.equal(completedMonth.scoreHistory.at(-1).score, completedMonth.scores.total, "历史斜率与当前分数必须使用同一份已完成数据");
assert.equal(completedMonth.dataMeta.excludedPartialCount, 1);
assert.equal(completedMonth.dataMeta.completedThrough, "2026-07-31");
assert.throws(
  () => pageInternals.completedDecisionResult({ candles: [{ date: "2026-08-21", close: 12 }] }, "month", Date.parse("2026-08-22T00:00:00Z")),
  /已完成周期仅 0 个/,
  "已完成周期不足时不得退回未完成分数"
);

function dimensions(score, overrides = {}) {
  return Object.fromEntries(["trend", "structure", "momentum", "volumePrice", "volatility"].map(key => [
    key,
    { score: overrides[key] ?? score, values: key === "momentum" ? { rsi: 55 } : {} }
  ]));
}

function analysisResult(period, score, overrides = {}) {
  const scoreDate = overrides.scoreDate || "2026-08-21";
  return {
    overview: { period, periodLabel: `${period}-line`, scoreDate, price: 10 },
    scores: { total: score, dimensions: overrides.dimensions || dimensions(score) },
    scoreHistory: overrides.scoreHistory || [
      { date: "2026-08-19", score: score - 2 },
      { date: "2026-08-20", score: score - 1 },
      { date: "2026-08-21", score }
    ],
    candles: overrides.candles || Array.from({ length: 60 }, (_, index) => ({
      date: `2026-07-${String(index + 1).padStart(2, "0")}`,
      high: 9 + index / 50,
      low: 8 + index / 50,
      close: 8.5 + index / 50
    })),
    dataMeta: { period, rawCount: overrides.rawCount ?? 60, source: "fixture", completedThrough: scoreDate },
    heat: overrides.heat,
    structure_break: overrides.structure_break,
    confidence: overrides.confidence
  };
}

const customWeights = { trend: 50, structure: 50, momentum: 0, volumePrice: 0, volatility: 0 };
const weightedResult = analysisResult("day", 0, {
  dimensions: dimensions(0, { trend: 80, structure: 40, momentum: 10, volumePrice: 10, volatility: 10 }),
  heat: 88,
  structure_break: true,
  confidence: 76
});
const weightedState = engine.buildPeriodState(weightedResult, {
  weights: customWeights,
  weightedHistory: [
    { date: "2026-08-19", score: 50 },
    { date: "2026-08-20", score: 46 },
    { date: "2026-08-21", dimensions: weightedResult.scores.dimensions }
  ]
});

assert.equal(weightedState.score, 60, "当前分数必须使用调用方传入的矩阵权重");
assert.equal(weightedState.slope, "up");
assert.equal(weightedState.slope_turn, "turning_up");
assert.equal(weightedState.score_delta, 14);
assert.equal(weightedState.distance_to_boundary, 5);
assert.equal(weightedState.heat, 88);
assert.equal(weightedState.structure_break, true);
assert.equal(weightedState.confidence, 65, "三个历史点时显式可信度也必须受 65 分上限约束");
assert.equal(weightedState.history_source, "weighted");
for (const field of ["score", "slope", "distance_to_boundary", "heat", "structure_break", "confidence"]) {
  assert.ok(Object.hasOwn(weightedState, field), `周期状态缺少 ${field}`);
}

const lowerBoundary = engine.buildPeriodState(analysisResult("day", 45), { weights: engine.DEFAULT_WEIGHTS });
const upperBoundary = engine.buildPeriodState(analysisResult("day", 65), { weights: engine.DEFAULT_WEIGHTS });
assert.equal(lowerBoundary.boundary.zone, "neutral");
assert.equal(lowerBoundary.distance_to_boundary, 0);
assert.equal(upperBoundary.boundary.zone, "strong");
assert.equal(upperBoundary.distance_to_boundary, 0);

function scoreHistory(count, score, finalDate = "2026-08-21") {
  return Array.from({ length: count }, (_, index) => ({
    date: index === count - 1 ? finalDate : `2026-08-${String(index + 1).padStart(2, "0")}`,
    score: score - count + index + 1
  }));
}

const realDimensions = dimensions(60);
realDimensions.structure = {
  score: 60,
  details: [
    { points: 20, max: 30 },
    { points: 15, max: 25 },
    { points: 12, max: 20 }
  ],
  flags: { hasHH: true, hasHL: true, hasLH: false, hasLL: false },
  pivots: { highs: [{ value: 9.8 }, { value: 10.2 }], lows: [{ value: 8.8 }, { value: 9.1 }] },
  platform: { resistance: 10.4, breakoutNow: false, recentBreakout: null },
  nearestSupport: 9.1
};
const realShape = engine.buildPeriodState(analysisResult("day", 60, {
  dimensions: realDimensions,
  scoreHistory: scoreHistory(4, 60)
}));
assert.equal(realShape.structure_break_determinable, true, "真实结构对象应能区分未破坏与无法判断");
assert.equal(realShape.confidence, 93, "完整真实形态应按五个解释分量计算，而不是直接得到 100");
assert.deepEqual(
  Object.keys(realShape.confidence_components).sort(),
  ["agreement", "completeness", "coverage", "history", "separation"].sort()
);

const boundaryConfidence = engine.buildPeriodState(analysisResult("day", 45, {
  scoreHistory: scoreHistory(4, 45), heat: 55, structure_break: false
}));
const separatedConfidence = engine.buildPeriodState(analysisResult("day", 55, {
  scoreHistory: scoreHistory(4, 55), heat: 55, structure_break: false
}));
assert.equal(boundaryConfidence.confidence, 85, "正处状态边界时 separation 不应贡献可信度");
assert.equal(separatedConfidence.confidence, 100, "距离边界十分快且五维完全一致时周期模型可满分");

for (const [historyCount, expectedCap] of [[1, 45], [2, 55], [3, 65]]) {
  const capped = engine.buildPeriodState(analysisResult("day", 60, {
    scoreHistory: scoreHistory(historyCount, 60),
    heat: 55,
    structure_break: false,
    confidence: 100
  }));
  assert.equal(capped.confidence, expectedCap, `${historyCount} 个历史点应封顶 ${expectedCap}`);
}

for (const period of ["quarter", "year"]) {
  const partial = engine.buildPeriodState(analysisResult(period, 70, {
    scoreDate: "2026-08-21",
    scoreHistory: scoreHistory(4, 70),
    heat: 60,
    structure_break: false,
    confidence: 100
  }));
  assert.equal(partial.partial_period, true);
  assert.equal(partial.confidence, 70, `${period} 未完周期必须封顶 70`);
}

const completedQuarter = engine.buildPeriodState(analysisResult("quarter", 70, {
  scoreDate: "2026-06-30",
  scoreHistory: scoreHistory(4, 70, "2026-06-30"),
  heat: 60,
  structure_break: false,
  confidence: 100
}));
assert.equal(completedQuarter.partial_period, false);
assert.equal(completedQuarter.confidence, 100);

const noHeatDimensions = Object.fromEntries(Object.keys(engine.DEFAULT_WEIGHTS).map(key => [key, { score: 60, values: {} }]));
const unknownHeat = engine.buildPeriodState(analysisResult("day", 60, {
  dimensions: noHeatDimensions,
  scoreHistory: scoreHistory(4, 60),
  candles: [],
  structure_break: false,
  confidence: 100
}));
assert.equal(unknownHeat.heat, null);
assert.equal(unknownHeat.confidence, 40, "热度无法判断时可信度最多 40");

const unknownStructure = engine.buildPeriodState(analysisResult("day", 60, {
  scoreHistory: scoreHistory(4, 60),
  heat: 55,
  confidence: 100
}));
assert.equal(unknownStructure.structure_break_determinable, false);
assert.equal(unknownStructure.confidence, 40, "结构破坏无法判断时可信度最多 40");

function state(period, overrides = {}) {
  const score = overrides.score ?? 60;
  return {
    period,
    score,
    slope: overrides.slope ?? "flat",
    slope_turn: overrides.slope_turn ?? overrides.slope ?? "flat",
    score_delta: overrides.score_delta ?? 0,
    prior_score_delta: overrides.prior_score_delta ?? 0,
    distance_to_boundary: Math.min(Math.abs(score - 45), Math.abs(score - 65)),
    heat: overrides.heat ?? 50,
    structure_break: overrides.structure_break ?? false,
    structure_break_determinable: overrides.structure_break_determinable ?? true,
    confidence: overrides.confidence ?? 90,
    dimensions: {
      trend: overrides.trend ?? score,
      structure: overrides.structure ?? score,
      momentum: overrides.momentum ?? score,
      volumePrice: overrides.volumePrice ?? score,
      volatility: overrides.volatility ?? score
    },
    valid: overrides.valid ?? true,
    structure_break_reasons: overrides.structure_break ? ["测试结构破坏"] : []
  };
}

function bullishStates() {
  return {
    day: state("day", { score: 60, slope: "up", score_delta: 3, trend: 65, structure: 65, volumePrice: 60 }),
    week: state("week", { score: 70, slope: "up", trend: 70, structure: 70 }),
    month: state("month", { score: 72, slope: "up", trend: 72, structure: 72 }),
    quarter: state("quarter", { score: 75, slope: "up", trend: 75, structure: 75 }),
    year: state("year", { score: 72, slope: "up", trend: 72, structure: 72 })
  };
}

function healthyPullbackStates() {
  const states = bullishStates();
  states.week = state("week", { score: 52, slope: "down", score_delta: -3, trend: 52, structure: 55 });
  return states;
}

const trendAdd = engine.evaluate(bullishStates(), { current_position: 75 });
assert.equal(trendAdd.recommendation.id, "trend_add");
assert.equal(trendAdd.strategic.state, "long_bullish");
assert.equal(trendAdd.holding.state, "trend_continuation");
assert.equal(trendAdd.execution.state, "trend_entry");
assert.equal(trendAdd.allocation.max, 80);
assert.equal(trendAdd.allocation.new_buy_cap, 5, "新增仓位不能突破战略最大仓位");

const uniformConfidenceStates = Object.fromEntries(engine.PERIODS.map(period => [
  period,
  state(period, { score: 70, slope: "up", trend: 70, structure: 70, confidence: 100 })
]));
const uniformConfidence = engine.evaluate(uniformConfidenceStates);
assert.equal(uniformConfidence.confidence, 96, "五周期完全一致且各周期满分时，总可信度仍应保留模型折减");
assert.notEqual(uniformConfidence.confidence, 100, "数据齐全不能自动等于建议可信度 100");

const lowFallingStates = healthyPullbackStates();
lowFallingStates.day = state("day", { score: 42, slope: "down", score_delta: -3, trend: 42, structure: 52 });
const lowFalling = engine.evaluate(lowFallingStates);
assert.equal(lowFalling.execution.state, "wait_confirm");
assert.equal(lowFalling.recommendation.id, "wait_confirm", "低分继续下降不能买入");
assert.equal(lowFalling.allocation.new_buy_cap, 0);

const lowTurningStates = healthyPullbackStates();
lowTurningStates.day = state("day", {
  score: 42,
  slope: "up",
  slope_turn: "turning_up",
  score_delta: 3,
  prior_score_delta: -4,
  trend: 44,
  structure: 52
});
const lowTurning = engine.evaluate(lowTurningStates);
assert.equal(lowTurning.execution.state, "pullback_entry");
assert.equal(lowTurning.recommendation.id, "pullback_buy", "低分止跌转强才允许回调买入");

const highRisingStates = bullishStates();
highRisingStates.day = state("day", { score: 76, slope: "up", score_delta: 4, heat: 78, trend: 76, structure: 72 });
const highRising = engine.evaluate(highRisingStates);
assert.equal(highRising.execution.state, "hold_no_chase");
assert.equal(highRising.recommendation.id, "hold_no_chase", "高分继续上升不能直接卖出");

const hotTurningStates = bullishStates();
hotTurningStates.day = state("day", { score: 76, slope: "down", slope_turn: "turning_down", score_delta: -4, heat: 90, trend: 72, structure: 70 });
const hotTurning = engine.evaluate(hotTurningStates);
assert.equal(hotTurning.execution.state, "reduce");
assert.equal(hotTurning.recommendation.id, "defensive_reduce", "高分必须同时过热且转弱才触发减仓");

const conflictStates = bullishStates();
conflictStates.year = state("year", { score: 35, slope: "down", trend: 35, structure: 35 });
const conflict = engine.evaluate(conflictStates);
assert.equal(conflict.strategic.conflict, true);
assert.equal(conflict.strategic.conflict_detail.quarter, "bullish");
assert.equal(conflict.strategic.conflict_detail.year, "weak");
assert.notEqual(conflict.strategic.state, "long_bullish", "季年直接冲突不得被平均成长期多头");
assert.ok(conflict.confidence < trendAdd.confidence, "季年冲突与五周期分区不一致必须降低总可信度");

const riskOverrideStates = lowTurningStates;
riskOverrideStates.year = state("year", { score: 70, slope: "up", trend: 70, structure: 70, structure_break: true });
const riskOverride = engine.evaluate(riskOverrideStates);
assert.equal(riskOverride.risk.level, "high");
assert.equal(riskOverride.risk.blocked_buy, true);
assert.equal(riskOverride.recommendation.id, "defensive_reduce", "结构风险必须覆盖回调买入");
assert.equal(riskOverride.recommendation.originalLabel, "回调分批买入");
assert.equal(riskOverride.allocation.new_buy_cap, 0);

const exitStates = bullishStates();
exitStates.quarter = state("quarter", { score: 30, slope: "down", trend: 30, structure: 25, structure_break: true });
exitStates.year = state("year", { score: 28, slope: "down", trend: 28, structure: 25, structure_break: true });
const exitAdvice = engine.evaluate(exitStates);
assert.equal(exitAdvice.risk.level, "critical");
assert.equal(exitAdvice.recommendation.id, "exit");
assert.deepEqual(
  [exitAdvice.allocation.core, exitAdvice.allocation.tactical, exitAdvice.allocation.max, exitAdvice.allocation.new_buy_cap],
  [0, 0, 0, 0]
);

const coreTacticalStates = bullishStates();
coreTacticalStates.month = state("month", { score: 55, slope: "flat", trend: 55, structure: 55 });
coreTacticalStates.week = state("week", { score: 54, slope: "flat", trend: 54, structure: 54 });
coreTacticalStates.day = state("day", { score: 55, slope: "flat", trend: 52, structure: 55 });
const coreTactical = engine.evaluate(coreTacticalStates);
assert.equal(coreTactical.recommendation.id, "core_tactical");

const weekBreakStates = {
  ...coreTacticalStates,
  week: state("week", { score: 54, slope: "flat", trend: 54, structure: 54, structure_break: true })
};
const weekBreak = engine.evaluate(weekBreakStates);
assert.equal(weekBreak.risk.blocked_buy, true, "任一周线结构破坏都必须硬阻断新增仓位");
assert.equal(weekBreak.recommendation.originalLabel, "核心持有加机动高抛低吸");
assert.equal(weekBreak.recommendation.id, "wait_confirm", "硬阻断时不得保留机动新增语义");
assert.equal(weekBreak.allocation.new_buy_cap, 0);
assert.ok(weekBreak.reason_codes.includes("RISK_ANY_STRUCTURE_BREAK"));

for (const period of engine.PERIODS) {
  const brokenStates = bullishStates();
  brokenStates[period] = { ...brokenStates[period], structure_break: true };
  const advice = engine.evaluate(brokenStates);
  assert.equal(advice.risk.blocked_buy, true, `${period} 结构破坏必须阻断买入`);
  assert.equal(advice.allocation.new_buy_cap, 0, `${period} 结构破坏时新增仓位必须为 0`);
  assert.ok(!["trend_add", "pullback_buy", "core_tactical"].includes(advice.recommendation.id));
}

const dayUnknownStates = bullishStates();
dayUnknownStates.day = state("day", {
  score: 60,
  slope: "up",
  score_delta: 3,
  trend: 65,
  structure: 65,
  momentum: 60,
  volumePrice: 60,
  confidence: 40,
  structure_break_determinable: false
});
const dayUnknown = engine.evaluate(dayUnknownStates);
assert.equal(dayUnknown.execution.state, "trend_entry", "该场景应先产生趋势加仓候选以验证风险覆盖");
assert.ok(dayUnknown.confidence > 45, "五周期平均可信度应仍高于总门槛，验证不能被平均掩盖");
assert.equal(dayUnknown.risk.blocked_buy, true);
assert.equal(dayUnknown.recommendation.originalLabel, "趋势加仓");
assert.equal(dayUnknown.recommendation.id, "wait_confirm");
assert.equal(dayUnknown.allocation.new_buy_cap, 0);
assert.ok(dayUnknown.reason_codes.includes("RISK_BUY_STRUCTURE_UNKNOWN"));
assert.ok(dayUnknown.reason_codes.includes("RISK_BUY_PERIOD_LOW_CONFIDENCE"));

const reboundStates = {
  day: state("day", { score: 50, slope: "up", trend: 50, structure: 50 }),
  week: state("week", { score: 38, slope: "up", score_delta: 4, trend: 38, structure: 38 }),
  month: state("month", { score: 36, slope: "down", trend: 36, structure: 36 }),
  quarter: state("quarter", { score: 36, slope: "down", trend: 36, structure: 36 }),
  year: state("year", { score: 38, slope: "flat", trend: 38, structure: 38 })
};
const rebound = engine.evaluate(reboundStates);
assert.equal(rebound.holding.state, "weak_rebound");
assert.equal(rebound.recommendation.id, "rebound_reduce");

const allAdvice = [trendAdd, lowTurning, highRising, coreTactical, lowFalling, rebound, hotTurning, exitAdvice];
assert.deepEqual(
  [...new Set(allAdvice.map(item => item.recommendation.id))].sort(),
  Object.keys(engine.RECOMMENDATIONS).sort(),
  "八类建议都必须由互斥规则产生"
);

for (const advice of [...allAdvice, conflict, riskOverride, weekBreak, dayUnknown]) {
  assert.deepEqual(
    Object.keys(advice).sort(),
    ["allocation", "confidence", "engine_version", "execution", "holding", "reason_codes", "recommendation", "risk", "strategic", "triggers"].sort()
  );
  assert.ok(advice.allocation.core + advice.allocation.tactical <= advice.allocation.max, "建议仓位不能超过最大仓位");
  assert.equal(advice.allocation.core + advice.allocation.tactical + advice.allocation.cash, 100, "仓位与现金必须合计 100%");
  assert.ok(Array.isArray(advice.triggers.positive) && Array.isArray(advice.triggers.negative));
  assert.ok(advice.reason_codes.includes(`RECOMMENDATION_${advice.recommendation.id.toUpperCase()}`));
}

console.log("个股操作建议三层决策引擎契约检查通过");
