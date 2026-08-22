"use strict";

(function exposeOperationAdviceEngine(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StockOperationAdviceEngine = api;
})(typeof window !== "undefined" ? window : globalThis, function createOperationAdviceEngine() {
  const ENGINE_VERSION = "three-layer-v2";
  const PERIODS = ["day", "week", "month", "quarter", "year"];
  const SCORE_BOUNDARIES = { weak: 45, strong: 65 };
  const DEFAULT_WEIGHTS = { trend: 30, structure: 25, momentum: 20, volumePrice: 15, volatility: 10 };
  const PERIOD_LABELS = { day: "日线", week: "周线", month: "月线", quarter: "季线", year: "年线" };
  const CONFIDENCE_WEIGHTS = { day: 15, week: 20, month: 20, quarter: 30, year: 15 };
  const BUY_REQUIRED_PERIODS = PERIODS.slice();
  const BUY_RECOMMENDATION_IDS = new Set(["trend_add", "pullback_buy", "core_tactical"]);

  const RECOMMENDATIONS = {
    trend_add: {
      id: "trend_add", label: "趋势加仓", tone: "positive",
      summary: "长周期方向一致，周月趋势延续，日线执行条件转强。"
    },
    pullback_buy: {
      id: "pullback_buy", label: "回调分批买入", tone: "positive",
      summary: "中长期结构仍完整，短周期回调已经止跌并重新转强。"
    },
    hold_no_chase: {
      id: "hold_no_chase", label: "持有不追", tone: "neutral",
      summary: "趋势仍占优，但当前位置不提供新的追价性价比。"
    },
    core_tactical: {
      id: "core_tactical", label: "核心持有加机动高抛低吸", tone: "neutral",
      summary: "战略仓位可以保留，周月以区间节奏为主，机动仓执行高抛低吸。"
    },
    wait_confirm: {
      id: "wait_confirm", label: "等待确认", tone: "warning",
      summary: "当前条件尚未形成可执行共振，等待日线止跌转强或结构重新确认。"
    },
    rebound_reduce: {
      id: "rebound_reduce", label: "反弹减仓", tone: "warning",
      summary: "中期仍弱，短线转强更接近反弹窗口，应借反弹降低风险敞口。"
    },
    defensive_reduce: {
      id: "defensive_reduce", label: "减仓防守", tone: "danger",
      summary: "风险信号已覆盖买入条件，应先降低仓位并等待结构修复。"
    },
    exit: {
      id: "exit", label: "退出观望", tone: "danger",
      summary: "关键周期结构发生严重破坏，当前首要目标是退出并保留现金。"
    }
  };

  const finite = value => value !== null && value !== "" && Number.isFinite(Number(value));
  const numberOrNull = value => finite(value) ? Number(value) : null;
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const round = (value, digits = 0) => {
    if (!finite(value)) return null;
    const factor = 10 ** digits;
    return Math.round(Number(value) * factor) / factor;
  };
  const unique = values => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
  const average = values => {
    const usable = values.filter(finite).map(Number);
    return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
  };

  function normalizeWeights(weights) {
    const resolved = {};
    Object.keys(DEFAULT_WEIGHTS).forEach(key => {
      const value = Number(weights?.[key]);
      resolved[key] = Number.isFinite(value) && value >= 0 ? value : DEFAULT_WEIGHTS[key];
    });
    return resolved;
  }

  function dimensionScore(dimensions, key) {
    const value = dimensions?.[key];
    return numberOrNull(typeof value === "object" ? value?.score : value);
  }

  function calculateWeightedScore(dimensions, weights = DEFAULT_WEIGHTS) {
    const resolved = normalizeWeights(weights);
    const available = Object.entries(resolved)
      .map(([key, weight]) => ({ score: dimensionScore(dimensions, key), weight }))
      .filter(item => item.weight > 0 && finite(item.score));
    const weightSum = available.reduce((sum, item) => sum + item.weight, 0);
    if (!weightSum) return null;
    return Math.round(clamp(available.reduce((sum, item) => sum + item.score * item.weight, 0) / weightSum, 0, 100));
  }

  function historyScore(item, weights) {
    if (finite(item)) return Number(item);
    const dimensions = item?.dimensions || item?.scores?.dimensions;
    if (dimensions) return calculateWeightedScore(dimensions, weights);
    return numberOrNull(item?.score);
  }

  function normalizeHistory(items, weights) {
    return (Array.isArray(items) ? items : [])
      .map(item => ({
        date: typeof item === "object" && item ? String(item.date || item.scoreDate || "") : "",
        score: historyScore(item, weights)
      }))
      .filter(item => finite(item.score));
  }

  function appendCurrentScore(historyInput, scoreDate, score) {
    const history = historyInput.slice();
    if (!finite(score)) return history;
    const last = history.at(-1);
    if (last && scoreDate && last.date === scoreDate) {
      last.score = Number(score);
    } else if (!last || finite(last.score) && Number(last.score) !== Number(score) || scoreDate && last.date !== scoreDate) {
      history.push({ date: scoreDate, score: Number(score) });
    }
    return history;
  }

  function slopeState(history) {
    const current = history.at(-1)?.score;
    const previous = history.at(-2)?.score;
    const beforePrevious = history.at(-3)?.score;
    const delta = finite(current) && finite(previous) ? Number(current) - Number(previous) : null;
    const priorDelta = finite(previous) && finite(beforePrevious) ? Number(previous) - Number(beforePrevious) : null;
    const direction = !finite(delta) ? "unknown" : delta > 0.5 ? "up" : delta < -0.5 ? "down" : "flat";
    const turn = finite(priorDelta) && priorDelta < -0.5 && delta > 0.5
      ? "turning_up"
      : finite(priorDelta) && priorDelta > 0.5 && delta < -0.5
        ? "turning_down"
        : direction;
    return {
      direction,
      turn,
      value: round(delta, 2),
      priorValue: round(priorDelta, 2),
      previousScore: numberOrNull(previous)
    };
  }

  function boundaryState(score) {
    if (!finite(score)) {
      return { zone: "unknown", nearest: null, distance: null, lower: SCORE_BOUNDARIES.weak, upper: SCORE_BOUNDARIES.strong };
    }
    const value = Number(score);
    const zone = value < SCORE_BOUNDARIES.weak ? "weak" : value < SCORE_BOUNDARIES.strong ? "neutral" : "strong";
    const boundaries = [SCORE_BOUNDARIES.weak, SCORE_BOUNDARIES.strong];
    const nearest = boundaries.reduce((best, candidate) => Math.abs(value - candidate) < Math.abs(value - best) ? candidate : best);
    return {
      zone,
      nearest,
      distance: round(Math.abs(value - nearest), 2),
      lower: SCORE_BOUNDARIES.weak,
      upper: SCORE_BOUNDARIES.strong
    };
  }

  function scoreZone(score) {
    if (!finite(score)) return "unknown";
    const value = Number(score);
    return value < SCORE_BOUNDARIES.weak ? "weak" : value < SCORE_BOUNDARIES.strong ? "neutral" : "strong";
  }

  function periodCompleteness(period, scoreDate) {
    if (!["quarter", "year"].includes(period)) return { factor: 1, partial: false };
    const match = String(scoreDate || "").match(/^\d{4}-(\d{2})/);
    const month = match ? Number(match[1]) : null;
    const complete = period === "quarter" ? [3, 6, 9, 12].includes(month) : month === 12;
    return { factor: complete ? 1 : 0.6, partial: !complete };
  }

  function latestValue(values) {
    if (!Array.isArray(values)) return numberOrNull(values);
    for (let index = values.length - 1; index >= 0; index -= 1) {
      if (finite(values[index])) return Number(values[index]);
    }
    return null;
  }

  function priceRangeHeat(candles) {
    const recent = (Array.isArray(candles) ? candles : []).slice(-20);
    const close = numberOrNull(recent.at(-1)?.close);
    const highs = recent.map(item => numberOrNull(item?.high)).filter(finite);
    const lows = recent.map(item => numberOrNull(item?.low)).filter(finite);
    if (!finite(close) || !highs.length || !lows.length) return null;
    const high = Math.max(...highs);
    const low = Math.min(...lows);
    return high > low ? clamp(100 * (close - low) / (high - low), 0, 100) : 50;
  }

  function bollHeat(result) {
    const candles = result?.candles || [];
    const close = numberOrNull(candles.at(-1)?.close ?? result?.overview?.price);
    const indicatorBoll = result?.scores?.indicators?.boll;
    const sparkBoll = result?.sparklines?.boll;
    const upper = latestValue(indicatorBoll?.upper ?? sparkBoll?.upper);
    const lower = latestValue(indicatorBoll?.lower ?? sparkBoll?.lower);
    if (!finite(close) || !finite(upper) || !finite(lower) || upper <= lower) return null;
    return clamp(100 * (close - lower) / (upper - lower), 0, 100);
  }

  function calculateHeat(result, dimensions) {
    const explicit = numberOrNull(result?.heat ?? result?.positionHeat ?? result?.metrics?.heat);
    if (finite(explicit)) return round(clamp(explicit, 0, 100));
    const rsi = numberOrNull(dimensions?.momentum?.values?.rsi ?? result?.sparklines?.latest?.rsi);
    const rsiHeat = finite(rsi) ? clamp(100 * (rsi - 30) / 40, 0, 100) : null;
    const factors = [
      { value: priceRangeHeat(result?.candles), weight: 0.45 },
      { value: rsiHeat, weight: 0.3 },
      { value: bollHeat(result), weight: 0.25 }
    ].filter(item => finite(item.value));
    const weightSum = factors.reduce((sum, item) => sum + item.weight, 0);
    return weightSum ? round(factors.reduce((sum, item) => sum + item.value * item.weight, 0) / weightSum) : null;
  }

  function structureBreakState(result, dimensions) {
    if (typeof result?.structure_break === "boolean") {
      return {
        active: result.structure_break,
        determinable: true,
        reasons: result.structure_break ? ["调用方标记结构破坏"] : [],
        evidence: ["调用方提供结构破坏判断"]
      };
    }
    const structure = result?.scores?.structure || dimensions?.structure || {};
    const flags = structure?.flags || {};
    const close = numberOrNull(result?.candles?.at(-1)?.close ?? result?.overview?.price);
    const support = numberOrNull(structure?.nearestSupport);
    const atr = numberOrNull(result?.tradeLevels?.atr ?? result?.sparklines?.latest?.atr);
    const recentBreakout = structure?.platform?.recentBreakout;
    const structureScore = dimensionScore(dimensions, "structure");
    const reasons = [];
    const evidence = [];
    const flagCount = Object.values(flags).filter(value => typeof value === "boolean").length;
    const pivotCount = (Array.isArray(structure?.pivots?.highs) ? structure.pivots.highs.length : 0)
      + (Array.isArray(structure?.pivots?.lows) ? structure.pivots.lows.length : 0);
    const detailCount = (Array.isArray(structure?.details) ? structure.details : []).filter(detail => finite(detail?.points)).length;
    if (flagCount >= 2) evidence.push("枢轴高低点序列可判断");
    if (finite(close) && finite(support)) evidence.push("关键支撑距离可判断");
    if (finite(close) && finite(structure?.platform?.resistance)) evidence.push("平台压力与突破状态可判断");
    if (pivotCount >= 3) evidence.push("已形成多个确认枢轴");
    if (detailCount >= 3) evidence.push("结构评分明细充分");
    if (flags.hasLH === true && flags.hasLL === true) reasons.push("高点与低点同步下移");
    if (finite(close) && finite(support) && close < support - (finite(atr) ? atr * 0.15 : 0)) reasons.push("收盘跌破关键支撑");
    if (finite(close) && finite(recentBreakout?.level) && close < Number(recentBreakout.level) - (finite(atr) ? atr * 0.35 : 0)) {
      reasons.push("近期突破平台失守");
    }
    if (finite(structureScore) && structureScore < 35 && (flags.hasLL === true || flags.hasLH === true)) reasons.push("结构评分低且枢轴转弱");
    return {
      active: reasons.length > 0,
      determinable: evidence.length > 0,
      reasons: unique(reasons),
      evidence: unique(evidence)
    };
  }

  function calculateConfidence(result, period, dimensions, history, structureBreak, score, boundary, heat, scoreDate) {
    const explicit = numberOrNull(result?.confidence);
    if (!result || !finite(score)) return { value: 0, reasons: ["缺少有效评分"] };
    const dimensionCount = Object.keys(DEFAULT_WEIGHTS).filter(key => finite(dimensionScore(dimensions, key))).length;
    const coverage = (1 + dimensionCount) / 6;
    const historyCoverage = Math.min(history.length / 4, 1);
    const dimensionZones = Object.keys(DEFAULT_WEIGHTS)
      .map(key => scoreZone(dimensionScore(dimensions, key)))
      .filter(zone => zone !== "unknown");
    const zoneCounts = dimensionZones.reduce((counts, zone) => ({ ...counts, [zone]: (counts[zone] || 0) + 1 }), {});
    const agreement = dimensionZones.length ? Math.max(...Object.values(zoneCounts)) / dimensionZones.length : 0;
    const separation = finite(boundary?.distance) ? Math.min(Number(boundary.distance) / 10, 1) : 0;
    const completeness = periodCompleteness(period, scoreDate);
    const modelValue = coverage * 30
      + historyCoverage * 25
      + agreement * 20
      + separation * 15
      + completeness.factor * 10;
    let value = finite(explicit) ? clamp(explicit, 0, 100) : modelValue;
    const caps = [];
    if (history.length < 2) caps.push({ value: 45, reason: "历史点少于 2 个" });
    else if (history.length === 2) caps.push({ value: 55, reason: "历史点仅 2 个" });
    else if (history.length === 3) caps.push({ value: 65, reason: "历史点仅 3 个" });
    if (completeness.partial) caps.push({ value: 70, reason: `${PERIOD_LABELS[period]}尚未完成` });
    if (!finite(heat)) caps.push({ value: 40, reason: "位置热度无法判断" });
    if (!structureBreak.determinable) caps.push({ value: 40, reason: "结构破坏无法可靠判断" });
    caps.forEach(cap => { value = Math.min(value, cap.value); });
    const reasons = [
      `评分与维度覆盖 ${dimensionCount + 1}/6，贡献 ${round(coverage * 30, 1)}/30`,
      `历史点 ${history.length}，贡献 ${round(historyCoverage * 25, 1)}/25`,
      `五维分区一致率 ${round(agreement * 100)}%，贡献 ${round(agreement * 20, 1)}/20`,
      `距边界 ${finite(boundary?.distance) ? boundary.distance : "--"}，贡献 ${round(separation * 15, 1)}/15`,
      `${completeness.partial ? "未完周期" : "完整周期"}，贡献 ${round(completeness.factor * 10, 1)}/10`
    ];
    if (finite(explicit)) reasons.unshift(`采用调用方可信度 ${round(explicit)}`);
    reasons.push(...caps.map(cap => `可信度上限 ${cap.value}：${cap.reason}`));
    if (structureBreak.active) reasons.push("结构破坏证据明确");
    return {
      value: round(clamp(value, 0, 100)),
      reasons,
      components: {
        coverage: round(coverage * 30, 1),
        history: round(historyCoverage * 25, 1),
        agreement: round(agreement * 20, 1),
        separation: round(separation * 15, 1),
        completeness: round(completeness.factor * 10, 1)
      },
      partial: completeness.partial
    };
  }

  function buildPeriodState(result, options = {}) {
    const weights = normalizeWeights(options.weights);
    const period = String(result?.overview?.period || result?.dataMeta?.period || result?.query?.period || options.period || "");
    const dimensions = result?.scores?.dimensions || result?.dimensions || {};
    const score = calculateWeightedScore(dimensions, weights) ?? numberOrNull(result?.scores?.total ?? result?.score);
    const scoreDate = String(result?.overview?.scoreDate || result?.scoreDate || result?.dataMeta?.completedThrough || "");
    const historyInput = Array.isArray(options.weightedHistory) ? options.weightedHistory : result?.scoreHistory;
    const history = appendCurrentScore(normalizeHistory(historyInput, weights), scoreDate, score);
    const slope = slopeState(history);
    const boundary = boundaryState(score);
    const heat = calculateHeat(result, dimensions);
    const breakState = structureBreakState(result, dimensions);
    const confidence = calculateConfidence(result, period, dimensions, history, breakState, score, boundary, heat, scoreDate);
    return {
      period,
      period_label: result?.overview?.periodLabel || result?.dataMeta?.periodLabel || PERIOD_LABELS[period] || period,
      score,
      slope: slope.direction,
      distance_to_boundary: boundary.distance,
      heat,
      structure_break: breakState.active,
      confidence: confidence.value,
      prior_score: slope.previousScore,
      score_delta: slope.value,
      prior_score_delta: slope.priorValue,
      slope_turn: slope.turn,
      boundary,
      heat_state: !finite(heat) ? "unknown" : heat >= 85 ? "extreme" : heat >= 70 ? "hot" : heat < 35 ? "cool" : "balanced",
      structure_break_determinable: breakState.determinable,
      structure_break_reasons: breakState.reasons,
      structure_evidence: breakState.evidence,
      confidence_reasons: confidence.reasons,
      confidence_components: confidence.components,
      partial_period: confidence.partial,
      dimensions: Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map(key => [key, dimensionScore(dimensions, key)])),
      score_date: scoreDate,
      history: history.slice(-30),
      history_source: Array.isArray(options.weightedHistory) ? "weighted" : "provider",
      weights,
      valid: finite(score),
      data_meta: result?.dataMeta || {}
    };
  }

  function normalizeState(value, period, options) {
    if (value?.scores || value?.overview || value?.candles) {
      return buildPeriodState(value, {
        period,
        weights: options.weights,
        weightedHistory: options.weightedHistories?.[period]
      });
    }
    const dimensions = value?.dimensions || {};
    const score = numberOrNull(value?.score);
    const boundary = value?.boundary || boundaryState(score);
    return {
      period,
      period_label: value?.period_label || PERIOD_LABELS[period],
      score,
      slope: ["up", "down", "flat", "unknown"].includes(value?.slope) ? value.slope : "unknown",
      distance_to_boundary: numberOrNull(value?.distance_to_boundary ?? boundary.distance),
      heat: numberOrNull(value?.heat),
      structure_break: Boolean(value?.structure_break),
      confidence: finite(value?.confidence) ? clamp(Number(value.confidence), 0, 100) : score === null ? 0 : 60,
      prior_score: numberOrNull(value?.prior_score),
      score_delta: numberOrNull(value?.score_delta),
      prior_score_delta: numberOrNull(value?.prior_score_delta),
      slope_turn: value?.slope_turn || value?.slope || "unknown",
      boundary,
      heat_state: value?.heat_state || (!finite(value?.heat) ? "unknown" : Number(value.heat) >= 85 ? "extreme" : Number(value.heat) >= 70 ? "hot" : Number(value.heat) < 35 ? "cool" : "balanced"),
      structure_break_determinable: typeof value?.structure_break_determinable === "boolean"
        ? value.structure_break_determinable
        : Object.hasOwn(value || {}, "structure_break"),
      structure_break_reasons: Array.isArray(value?.structure_break_reasons) ? value.structure_break_reasons : [],
      structure_evidence: Array.isArray(value?.structure_evidence) ? value.structure_evidence : [],
      confidence_reasons: Array.isArray(value?.confidence_reasons) ? value.confidence_reasons : [],
      confidence_components: value?.confidence_components || null,
      partial_period: Boolean(value?.partial_period),
      dimensions: Object.fromEntries(Object.keys(DEFAULT_WEIGHTS).map(key => [key, dimensionScore(dimensions, key)])),
      score_date: value?.score_date || "",
      history: Array.isArray(value?.history) ? value.history : [],
      valid: value?.valid !== false && score !== null,
      data_meta: value?.data_meta || {}
    };
  }

  function periodMap(periodStates, options) {
    const source = Array.isArray(periodStates)
      ? Object.fromEntries(periodStates.filter(Boolean).map(item => [item.period || item.overview?.period || item.dataMeta?.period, item]))
      : periodStates || {};
    return Object.fromEntries(PERIODS.map(period => [period, normalizeState(source[period], period, options)]));
  }

  function directionalState(state) {
    if (!state?.valid || !finite(state.score)) return "unknown";
    const trend = state.dimensions.trend;
    const structure = state.dimensions.structure;
    const combined = average([trend, structure]);
    if (state.structure_break) return "weak";
    if (finite(trend) && finite(structure) && trend >= 60 && structure >= 55 && combined >= 60) return "bullish";
    if (finite(structure) && structure < 40 || finite(trend) && trend < 40 || finite(combined) && combined < 45) return "weak";
    return "neutral";
  }

  function evaluateStrategic(states) {
    const quarter = states.quarter;
    const year = states.year;
    const quarterDirection = directionalState(quarter);
    const yearDirection = directionalState(year);
    const bothKnown = quarterDirection !== "unknown" && yearDirection !== "unknown";
    const conflict = bothKnown && quarterDirection !== yearDirection;
    const strongConflict = bothKnown && new Set([quarterDirection, yearDirection]).has("bullish") && new Set([quarterDirection, yearDirection]).has("weak");
    let state = "neutral";
    let label = "中性";
    let coreCap = 30;
    let maxPosition = 50;
    const reasons = [];

    if (quarterDirection === "unknown") {
      if (yearDirection === "bullish") {
        state = "neutral";
        coreCap = 25;
        maxPosition = 45;
        reasons.push("季线数据不足，年线偏强仅作辅助");
      } else if (yearDirection === "weak") {
        state = "weak";
        label = "弱势";
        coreCap = 0;
        maxPosition = 20;
        reasons.push("季线数据不足且年线偏弱");
      } else {
        state = "uncertain";
        label = "方向待确认";
        coreCap = 0;
        maxPosition = 20;
        reasons.push("季线战略输入不足");
      }
    } else if (quarterDirection === "weak") {
      state = "weak";
      label = "弱势";
      coreCap = 0;
      maxPosition = yearDirection === "bullish" ? 25 : 20;
      reasons.push("季线趋势或结构偏弱，战略层优先防守");
    } else if (quarterDirection === "bullish") {
      if (yearDirection === "weak") {
        state = "neutral";
        label = "中性（长周期冲突）";
        coreCap = 25;
        maxPosition = 45;
        reasons.push("季线偏强但年线偏弱，保留长周期冲突");
      } else {
        state = "long_bullish";
        label = conflict ? "长期多头（周期待共振）" : "长期多头";
        coreCap = conflict ? 45 : 60;
        maxPosition = conflict ? 65 : 80;
        reasons.push(conflict ? "季线偏强，年线尚未完全确认" : "季线与年线趋势结构共同偏强");
      }
    } else if (yearDirection === "weak") {
      state = "neutral";
      label = "中性偏弱";
      coreCap = 15;
      maxPosition = 35;
      reasons.push("季线中性但年线偏弱");
    } else {
      reasons.push(yearDirection === "bullish" ? "季线中性、年线偏强，等待季线确认" : "季线与年线均未形成明确方向");
    }

    if (strongConflict && !reasons.some(reason => reason.includes("冲突"))) reasons.push("季线与年线方向直接冲突");
    if (quarter.structure_break) reasons.push("季线结构破坏");
    if (year.structure_break) reasons.push("年线结构破坏");
    return {
      state,
      label,
      conflict,
      conflict_detail: conflict ? { quarter: quarterDirection, year: yearDirection, strong: strongConflict } : null,
      core_cap: coreCap,
      max_position: maxPosition,
      reasons: unique(reasons),
      directions: { quarter: quarterDirection, year: yearDirection }
    };
  }

  function evaluateHolding(states) {
    const month = states.month;
    const week = states.week;
    const monthDirection = directionalState(month);
    const weekDirection = directionalState(week);
    const reasons = [];
    let state = "range";
    let label = "区间震荡";

    if (monthDirection === "unknown" || weekDirection === "unknown") {
      state = "uncertain";
      label = "状态待确认";
      reasons.push("月线或周线数据不足");
    } else if (month.structure_break || week.structure_break && monthDirection === "weak") {
      state = "top_weakening";
      label = "顶部转弱";
      reasons.push(month.structure_break ? "月线结构已经破坏" : "月线偏弱且周线结构破坏");
    } else if (monthDirection === "bullish" && weekDirection === "bullish" && week.slope !== "down") {
      state = "trend_continuation";
      label = "趋势延续";
      reasons.push("月线与周线趋势结构保持偏强");
    } else if (monthDirection === "bullish" && !week.structure_break && (week.slope === "down" || week.slope === "flat" || week.score < month.score)) {
      state = "healthy_pullback";
      label = "健康回调";
      reasons.push("月线结构完整，周线回落但尚未破坏趋势");
    } else if (monthDirection === "weak" && (week.slope === "up" || week.slope_turn === "turning_up")) {
      state = "weak_rebound";
      label = "弱势反弹";
      reasons.push("月线仍弱，周线仅出现向上修复");
    } else if (monthDirection === "weak" && weekDirection === "weak") {
      state = "top_weakening";
      label = "顶部转弱";
      reasons.push("月线与周线同步偏弱");
    } else if (finite(month.score) && month.score >= 55 && month.slope === "down" && finite(week.score) && week.score < SCORE_BOUNDARIES.weak && week.slope === "down") {
      state = "top_weakening";
      label = "顶部转弱";
      reasons.push("月线转弱且周线跌入弱势区间");
    } else {
      reasons.push("月线与周线信号未形成单边共振");
    }
    return { state, label, reasons, directions: { month: monthDirection, week: weekDirection } };
  }

  function signal(id, label, tone) {
    return { id, label, tone };
  }

  function evaluateExecution(states, holding) {
    const day = states.day;
    const reasons = [];
    const signals = [];
    let state = "wait_confirm";
    let label = "等待确认";
    if (!day.valid || !finite(day.score) || day.confidence < 35) {
      reasons.push("日线评分或可信度不足");
      signals.push(signal("insufficient", "执行信号不足", "warning"));
    } else if (day.structure_break) {
      state = "defensive";
      label = "结构破坏，先防守";
      reasons.push("日线结构破坏，执行层停止买入");
      signals.push(signal("structure_break", "日线结构破坏", "danger"));
    } else if (finite(day.heat) && day.heat >= 80 && (day.slope === "down" || day.slope_turn === "turning_down")) {
      state = "reduce";
      label = "过热转弱，执行减仓";
      reasons.push("日线位置过热且分数转弱");
      signals.push(signal("hot_turn_down", "高热度转弱", "danger"));
    } else if (day.score < SCORE_BOUNDARIES.weak) {
      if ((day.slope === "up" || day.slope_turn === "turning_up")
        && (day.slope_turn === "turning_up" || day.score_delta >= 2)
        && (day.dimensions.structure === null || day.dimensions.structure >= 40)
        && (day.dimensions.momentum === null || day.dimensions.momentum >= 35)
        && (day.dimensions.volumePrice === null || day.dimensions.volumePrice >= 35)) {
        state = "pullback_entry";
        label = "低位止跌转强";
        reasons.push("低分区停止下降并出现向上拐点");
        signals.push(signal("low_turn_up", "低分止跌转强", "positive"));
      } else {
        reasons.push(day.slope === "down" ? "低分仍在下降，禁止买入" : "低分区尚未形成明确转强");
        signals.push(signal("low_not_confirmed", day.slope === "down" ? "低分继续下降" : "低分未确认", "warning"));
      }
    } else if (day.score >= SCORE_BOUNDARIES.strong) {
      if (day.slope === "up" || day.slope === "flat") {
        state = "hold_no_chase";
        label = "高分延续，持有不追";
        reasons.push("高分继续上升不构成卖出条件");
        signals.push(signal("high_rising", "高分延续", "positive"));
      } else {
        reasons.push("高分转弱但尚未同时满足过热减仓条件");
        signals.push(signal("high_softening", "高分转弱待确认", "warning"));
      }
    } else if ((day.slope === "up" || day.slope_turn === "turning_up")
      && (day.dimensions.momentum === null || day.dimensions.momentum >= 50)
      && (day.dimensions.structure === null || day.dimensions.structure >= 50)
      && (day.dimensions.volumePrice === null || day.dimensions.volumePrice >= 45)) {
      state = holding.state === "healthy_pullback" ? "pullback_entry" : "trend_entry";
      label = holding.state === "healthy_pullback" ? "回调转强执行" : "趋势转强执行";
      reasons.push("日线动量、结构与量价达到执行门槛");
      signals.push(signal(state, label, "positive"));
    } else if (holding.state === "range") {
      state = "tactical";
      label = "区间节奏执行";
      reasons.push("日线未突破，按区间节奏管理机动仓");
      signals.push(signal("range", "区间节奏", "neutral"));
    } else {
      reasons.push("日线未形成新的执行条件");
      signals.push(signal("wait", "等待日线确认", "neutral"));
    }
    return { state, label, reasons, signals };
  }

  function evaluateConfidence(states, strategic) {
    let total = 0;
    let weightSum = 0;
    PERIODS.forEach(period => {
      const weight = CONFIDENCE_WEIGHTS[period];
      total += states[period].confidence * weight;
      weightSum += weight;
    });
    let value = weightSum ? total / weightSum : 0;
    const zones = PERIODS.map(period => scoreZone(states[period].score)).filter(zone => zone !== "unknown");
    const zoneCounts = zones.reduce((counts, zone) => ({ ...counts, [zone]: (counts[zone] || 0) + 1 }), {});
    const agreement = zones.length ? Math.max(...Object.values(zoneCounts)) / zones.length : 0;
    value -= 4 + (1 - agreement) * 10;
    if (strategic.conflict) value -= strategic.conflict_detail?.strong ? 8 : 4;
    return round(clamp(value, 0, 100));
  }

  function evaluateRisk(states, strategic, holding, execution, confidence, minimumConfidence) {
    const reasons = [];
    const codes = [];
    const add = (level, code, reason) => {
      reasons.push(reason);
      codes.push(code);
      return level;
    };
    let level = "none";
    const critical = states.quarter.structure_break && states.year.structure_break
      || states.month.structure_break && states.week.structure_break
      || strategic.state === "weak" && states.month.structure_break && states.day.structure_break;
    if (critical) {
      level = add("critical", "RISK_MULTI_PERIOD_BREAK", "多个关键周期同步结构破坏");
    } else if (states.quarter.structure_break || states.year.structure_break) {
      level = add("high", "RISK_LONG_STRUCTURE_BREAK", states.quarter.structure_break ? "季线结构破坏" : "年线结构破坏");
    } else if (states.month.structure_break) {
      level = add("high", "RISK_MONTH_STRUCTURE_BREAK", "月线结构破坏");
    } else if (states.week.structure_break && states.day.structure_break) {
      level = add("high", "RISK_WEEK_DAY_BREAK", "周线与日线同步结构破坏");
    } else if (strategic.state === "weak" && holding.state === "top_weakening") {
      level = add("high", "RISK_STRATEGIC_HOLDING_WEAK", "战略弱势且持仓状态继续转弱");
    }
    if (level === "none" && (states.week.structure_break || states.day.structure_break)) {
      level = add("watch", "RISK_SHORT_STRUCTURE_BREAK", states.week.structure_break ? "周线结构破坏" : "日线结构破坏");
    }
    if (level === "none" && execution.state === "reduce") {
      level = add("watch", "RISK_OVERHEAT_TURN_DOWN", "日线高热度且转弱");
    }
    if (strategic.conflict) {
      if (level === "none") level = "watch";
      reasons.push("季线与年线方向冲突");
      codes.push("RISK_STRATEGIC_CONFLICT");
    }
    const brokenPeriods = PERIODS.filter(period => states[period].structure_break);
    const indeterminableBuyPeriods = BUY_REQUIRED_PERIODS.filter(period => !states[period].structure_break_determinable);
    const lowConfidenceBuyPeriods = BUY_REQUIRED_PERIODS.filter(period => states[period].confidence < minimumConfidence);
    if (brokenPeriods.length) {
      if (level === "none") level = "watch";
      reasons.push(`${brokenPeriods.map(period => PERIOD_LABELS[period]).join("、")}结构破坏，禁止新增仓位`);
      codes.push("RISK_ANY_STRUCTURE_BREAK");
    }
    if (indeterminableBuyPeriods.length) {
      if (level === "none") level = "watch";
      reasons.push(`${indeterminableBuyPeriods.map(period => PERIOD_LABELS[period]).join("、")}结构破坏无法判断，禁止新增仓位`);
      codes.push("RISK_BUY_STRUCTURE_UNKNOWN");
    }
    if (lowConfidenceBuyPeriods.length) {
      if (level === "none") level = "watch";
      reasons.push(`${lowConfidenceBuyPeriods.map(period => PERIOD_LABELS[period]).join("、")}可信度低于 ${minimumConfidence}，禁止新增仓位`);
      codes.push("RISK_BUY_PERIOD_LOW_CONFIDENCE");
    }
    const missingRequired = [states.quarter, states.year, states.month, states.week, states.day].some(state => !state.valid);
    if (missingRequired || confidence < minimumConfidence) {
      if (level === "none") level = "watch";
      reasons.push(missingRequired ? "关键周期数据不完整" : `综合可信度低于 ${minimumConfidence}`);
      codes.push(missingRequired ? "RISK_MISSING_PERIOD" : "RISK_LOW_CONFIDENCE");
    }
    const blockedBuy = ["high", "critical"].includes(level)
      || brokenPeriods.length > 0
      || indeterminableBuyPeriods.length > 0
      || lowConfidenceBuyPeriods.length > 0
      || missingRequired
      || confidence < minimumConfidence;
    return { active: level !== "none", level, reasons: unique(reasons), blocked_buy: blockedBuy, codes: unique(codes) };
  }

  function baseRecommendation(strategic, holding, execution) {
    if (execution.state === "reduce" || execution.state === "defensive") return RECOMMENDATIONS.defensive_reduce;
    if (strategic.state === "weak" && holding.state === "weak_rebound") return RECOMMENDATIONS.rebound_reduce;
    if (holding.state === "top_weakening") return execution.state === "reduce" || execution.state === "defensive"
      ? RECOMMENDATIONS.defensive_reduce : RECOMMENDATIONS.rebound_reduce;
    if (holding.state === "weak_rebound") return RECOMMENDATIONS.rebound_reduce;
    if (execution.state === "hold_no_chase") return RECOMMENDATIONS.hold_no_chase;
    if (strategic.state === "long_bullish" && holding.state === "trend_continuation" && execution.state === "trend_entry") {
      return RECOMMENDATIONS.trend_add;
    }
    if (["long_bullish", "neutral"].includes(strategic.state) && holding.state === "healthy_pullback" && execution.state === "pullback_entry") {
      return RECOMMENDATIONS.pullback_buy;
    }
    if (["long_bullish", "neutral"].includes(strategic.state) && holding.state === "range" && execution.state === "tactical") {
      return RECOMMENDATIONS.core_tactical;
    }
    return RECOMMENDATIONS.wait_confirm;
  }

  function applyRiskOverride(candidate, risk) {
    let recommendation = candidate;
    if (risk.level === "critical") recommendation = RECOMMENDATIONS.exit;
    else if (risk.level === "high") recommendation = RECOMMENDATIONS.defensive_reduce;
    else if (risk.blocked_buy && BUY_RECOMMENDATION_IDS.has(candidate.id)) recommendation = RECOMMENDATIONS.wait_confirm;
    const summary = recommendation.id !== candidate.id && risk.reasons.length
      ? `${recommendation.summary} 风险覆盖：${risk.reasons[0]}。`
      : recommendation.summary;
    return { ...recommendation, summary, originalLabel: candidate.label };
  }

  function calculateAllocation(recommendation, strategic, risk, options) {
    const currentPosition = finite(options.current_position) ? clamp(Number(options.current_position), 0, 100) : null;
    let maximum = strategic.max_position;
    if (risk.level === "high") maximum = Math.min(maximum, 20);
    if (risk.level === "critical") maximum = 0;
    let core = Math.min(strategic.core_cap, maximum);
    let tactical = 0;
    let buyStep = 0;
    if (recommendation.id === "trend_add") {
      tactical = Math.min(20, maximum - core);
      buyStep = 20;
    } else if (recommendation.id === "pullback_buy") {
      tactical = Math.min(10, maximum - core);
      buyStep = 15;
    } else if (recommendation.id === "hold_no_chase") {
      tactical = Math.min(10, maximum - core);
    } else if (recommendation.id === "core_tactical") {
      tactical = Math.min(20, maximum - core);
      buyStep = 10;
    } else if (recommendation.id === "wait_confirm") {
      tactical = 0;
    } else if (recommendation.id === "rebound_reduce") {
      maximum = Math.min(maximum, 30);
      core = Math.min(core, 20, maximum);
    } else if (recommendation.id === "defensive_reduce") {
      maximum = Math.min(maximum, 20);
      core = Math.min(core, 10, maximum);
    } else if (recommendation.id === "exit") {
      maximum = 0;
      core = 0;
    }
    core = Math.max(0, round(core));
    tactical = Math.max(0, Math.min(round(tactical), maximum - core));
    const remainingCapacity = currentPosition === null ? maximum : Math.max(0, maximum - currentPosition);
    const newBuyCap = risk.blocked_buy ? 0 : Math.max(0, Math.min(buyStep, remainingCapacity));
    return {
      core,
      tactical,
      cash: Math.max(0, 100 - core - tactical),
      max: Math.max(0, round(maximum)),
      new_buy_cap: round(newBuyCap)
    };
  }

  function buildTriggers(states, strategic, holding, execution, risk) {
    const positive = [];
    const negative = [];
    if (states.day.score < SCORE_BOUNDARIES.weak) positive.push("日线停止下降并转强，且结构保持完整");
    else positive.push("日线趋势、结构与量价继续共振");
    if (holding.state === "healthy_pullback") positive.push("周线回调结束并重新站稳关键支撑");
    if (strategic.conflict) positive.push("季线与年线方向重新一致");
    negative.push("日线高热度后分数转弱");
    negative.push("周线跌破关键支撑或形成结构破坏");
    if (["long_bullish", "neutral"].includes(strategic.state)) negative.push("季线趋势或结构跌入弱势区间");
    if (execution.state === "reduce") negative.unshift("当前已出现日线过热转弱");
    negative.unshift(...risk.reasons);
    return { positive: unique(positive), negative: unique(negative) };
  }

  function evaluate(periodStates, options = {}) {
    const states = periodMap(periodStates, options);
    const strategic = evaluateStrategic(states);
    const holding = evaluateHolding(states);
    const execution = evaluateExecution(states, holding);
    const confidence = evaluateConfidence(states, strategic);
    const minimumConfidence = finite(options.minimum_confidence) ? clamp(Number(options.minimum_confidence), 45, 100) : 45;
    const risk = evaluateRisk(states, strategic, holding, execution, confidence, minimumConfidence);
    const candidate = baseRecommendation(strategic, holding, execution);
    const recommendation = applyRiskOverride(candidate, risk);
    const allocation = calculateAllocation(recommendation, strategic, risk, options);
    const triggers = buildTriggers(states, strategic, holding, execution, risk);
    const reasonCodes = unique([
      `STRATEGIC_${strategic.state.toUpperCase()}`,
      strategic.conflict ? "STRATEGIC_CONFLICT" : "",
      `HOLDING_${holding.state.toUpperCase()}`,
      `EXECUTION_${execution.state.toUpperCase()}`,
      ...risk.codes,
      `RECOMMENDATION_${recommendation.id.toUpperCase()}`
    ]);
    return {
      recommendation,
      confidence,
      strategic,
      holding,
      execution,
      risk: {
        active: risk.active,
        level: risk.level,
        reasons: risk.reasons,
        blocked_buy: risk.blocked_buy
      },
      allocation,
      triggers,
      reason_codes: reasonCodes,
      engine_version: ENGINE_VERSION
    };
  }

  return {
    ENGINE_VERSION,
    PERIODS,
    SCORE_BOUNDARIES,
    DEFAULT_WEIGHTS,
    RECOMMENDATIONS,
    calculateWeightedScore,
    buildPeriodState,
    evaluate
  };
});
