"use strict";

(function createOperationAdvicePage(global) {
  const PERIODS = [
    { id: "year", label: "年线", role: "长期方向" },
    { id: "quarter", label: "季线", role: "战略主导" },
    { id: "month", label: "月线", role: "核心持仓" },
    { id: "week", label: "周线", role: "波段节奏" },
    { id: "day", label: "日线", role: "今日执行" }
  ];
  const DIMENSIONS = [
    { id: "trend", label: "趋势", tone: "blue" },
    { id: "structure", label: "结构", tone: "mint" },
    { id: "momentum", label: "动量", tone: "green" },
    { id: "volumePrice", label: "量价", tone: "purple" },
    { id: "volatility", label: "波动", tone: "amber" }
  ];
  const DEFAULT_WEIGHTS = { trend: 30, structure: 25, momentum: 20, volumePrice: 15, volatility: 10 };
  const WEIGHT_STORAGE_KEY = "stock-tracking-score-matrix-weights-v1";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function finite(value) {
    if (value === null || value === undefined || typeof value === "boolean") return false;
    if (typeof value === "string" && value.trim() === "") return false;
    return Number.isFinite(Number(value));
  }

  function clamp(value, minimum = 0, maximum = 100) {
    return Math.max(minimum, Math.min(maximum, Number(value) || 0));
  }

  function formatNumber(value, digits = 0) {
    if (!finite(value)) return "--";
    return Number(value).toFixed(digits);
  }

  function formatSigned(value, digits = 0) {
    if (!finite(value)) return "--";
    const number = Number(value);
    return `${number > 0 ? "+" : ""}${number.toFixed(digits)}`;
  }

  function weightsAreValid(weights) {
    const values = DIMENSIONS.map(item => Number(weights?.[item.id]));
    return values.every(value => Number.isFinite(value) && value >= 0 && value <= 100)
      && Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) < 0.001;
  }

  function readWeights() {
    try {
      const saved = JSON.parse(global.localStorage.getItem(WEIGHT_STORAGE_KEY) || "null");
      if (weightsAreValid(saved)) {
        return Object.fromEntries(DIMENSIONS.map(item => [item.id, Number(saved[item.id])]));
      }
    } catch (_) {
      // A blocked or malformed local preference falls back to the documented score model.
    }
    return { ...DEFAULT_WEIGHTS };
  }

  function parseYmd(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return { year, month, day };
  }

  function completedAtMs(dateString, period) {
    const parts = parseYmd(dateString);
    if (!parts) return NaN;
    const { year, month, day } = parts;
    if (period === "day") return Date.UTC(year, month - 1, day, 7, 5);
    if (period === "week") {
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7;
      return Date.UTC(year, month - 1, day + 5 - weekday, 7, 5);
    }
    if (period === "month") return Date.UTC(year, month, 0, 7, 5);
    if (period === "quarter") return Date.UTC(year, Math.ceil(month / 3) * 3, 0, 7, 5);
    if (period === "year") return Date.UTC(year, 12, 0, 7, 5);
    return NaN;
  }

  function isCompletedPeriod(dateString, period, nowMs = Date.now()) {
    const completedAt = completedAtMs(dateString, period);
    return Number.isFinite(completedAt) && completedAt <= Number(nowMs);
  }

  function completedDecisionResult(rawResult, period, nowMs = Date.now()) {
    const scoreApi = global.StockTechnicalScores;
    const profile = rawResult?.scores?.indicators?.profile || global.StockTechnicalTimeframes?.getProfile?.(period);
    const sourceCandles = Array.isArray(rawResult?.candles) ? rawResult.candles : [];
    const candles = sourceCandles.filter(candle => isCompletedPeriod(candle?.date, period, nowMs));
    const minimumBars = Math.max(1, Number(profile?.minimumBars) || 1);
    if (!profile || !scoreApi?.calculateTechnicalScore || !scoreApi?.calculateScoreHistory) {
      throw new Error(`${profile?.lineLabel || period}评分模块未能加载`);
    }
    if (candles.length < minimumBars) {
      throw new Error(`${profile.lineLabel}已完成周期仅 ${candles.length} 个，少于正式决策所需的 ${minimumBars} 个`);
    }
    const scores = scoreApi.calculateTechnicalScore(candles, { profile });
    if (!finite(scores?.total)) throw new Error(`${profile.lineLabel}已完成周期无法形成正式评分`);
    const scoreHistory = scoreApi.calculateScoreHistory(
      candles,
      profile.historyCount,
      profile.historyMinimum,
      { profile }
    );
    const tradeLevels = global.StockTechnicalTradeLevels?.calculateTradeLevels
      ? global.StockTechnicalTradeLevels.calculateTradeLevels(scores)
      : rawResult?.tradeLevels;
    const lastDate = candles.at(-1)?.date || "";
    return {
      ...rawResult,
      candles,
      scores,
      tradeLevels,
      scoreHistory,
      overview: { ...rawResult?.overview, scoreDate: lastDate },
      dataMeta: {
        ...rawResult?.dataMeta,
        rawCount: candles.length,
        completedThrough: lastDate,
        decisionUsesCompletedPeriods: true,
        excludedPartialCount: sourceCandles.length - candles.length
      }
    };
  }

  function scoreTone(score) {
    if (!finite(score)) return "muted";
    if (Number(score) >= 65) return "bull";
    if (Number(score) < 45) return "bear";
    return "neutral";
  }

  function scoreLabel(score) {
    if (!finite(score)) return "待形成";
    if (Number(score) >= 65) return "偏多";
    if (Number(score) < 45) return "偏弱";
    return "中性";
  }

  function slopeLabel(direction) {
    if (direction === "up") return { icon: "↑", label: "上升", tone: "up" };
    if (direction === "down") return { icon: "↓", label: "下降", tone: "down" };
    if (direction === "flat") return { icon: "→", label: "走平", tone: "flat" };
    return { icon: "·", label: "待形成", tone: "unknown" };
  }

  function heatLabel(value) {
    if (!finite(value)) return "待形成";
    if (Number(value) >= 85) return "极热";
    if (Number(value) >= 70) return "偏热";
    if (Number(value) < 35) return "偏冷";
    return "正常";
  }

  function confidenceLabel(value) {
    if (!finite(value)) return "待形成";
    if (Number(value) >= 70) return "较高";
    if (Number(value) >= 50) return "中等";
    return "偏低";
  }

  function icon(name) {
    const paths = {
      flag: "<path d='M6 21V4M6 5h10l2 3-2 3H6'/>",
      shield: "<path d='M12 3l7 3v5c0 4.6-2.7 8.1-7 10-4.3-1.9-7-5.4-7-10V6z'/><path d='M9 12l2 2 4-4'/>",
      layers: "<path d='M12 3l9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5'/>",
      target: "<circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='3'/><path d='M12 2v3M12 19v3M2 12h3M19 12h3'/>",
      pulse: "<path d='M3 12h4l2-5 4 10 2-5h6'/>",
      chart: "<path d='M4 19V5M4 19h16M7 15l4-4 3 2 5-6'/>",
      history: "<path d='M4 8V4m0 0h4M4 4l3 3a8 8 0 11-2 8'/><path d='M12 8v5l3 2'/>",
      refresh: "<path d='M20 7v5h-5M4 17v-5h5M18.5 9A7 7 0 006 7l-2 5M5.5 15A7 7 0 0018 17l2-5'/>",
      weights: "<path d='M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6'/>",
      check: "<path d='M5 12l4 4L19 6'/>",
      warning: "<path d='M12 3l9 17H3z'/><path d='M12 9v4M12 17h.01'/>",
      lock: "<rect x='5' y='10' width='14' height='10' rx='2'/><path d='M8 10V7a4 4 0 018 0v3'/>",
      arrow: "<path d='M5 12h14M14 7l5 5-5 5'/>",
      info: "<circle cx='12' cy='12' r='9'/><path d='M12 11v6M12 7h.01'/>",
      calendar: "<rect x='4' y='5.5' width='16' height='14.5' rx='2'/><path d='M8 3.5v4M16 3.5v4M4 10h16'/>",
      coin: "<circle cx='12' cy='12' r='8'/><path d='M9 9.5c0-1 1.1-1.8 3-1.8s3 .8 3 2-1 1.7-3 2c-2 .3-3 1-3 2.2 0 1.3 1.2 2.2 3 2.2s3-.9 3-2M12 5.5v13'/>",
      radar: "<path d='M12 3l8.5 6.2-3.2 10H6.7l-3.2-10z'/><path d='M12 3v9l8.5-2.8M12 12l5.3 7.2M12 12l-5.3 7.2M12 12L3.5 9.2'/>",
      bolt: "<path d='M13 2L5 14h6l-1 8 9-13h-6z'/>",
      portfolio: "<path d='M4 8h16v11H4zM8 8V5h8v3M4 12h16M10 12v2h4v-2'/>",
      trend: "<path d='M4 16l5-5 3 3 7-8M15 6h4v4'/>",
      structure: "<path d='M4 18V9l8-5 8 5v9zM9 18v-6h6v6'/>",
      momentum: "<path d='M4 15a8 8 0 0116 0M12 15l4-5'/>",
      volumePrice: "<path d='M5 19v-5M10 19V9M15 19v-8M20 19V5'/>",
      volatility: "<path d='M3 13c2-5 4-5 6 0s4 5 6 0 4-5 6 0'/>",
      day: "<rect x='4' y='5.5' width='16' height='14.5' rx='2'/><path d='M8 3.5v4M16 3.5v4M4 10h16'/>",
      week: "<rect x='4' y='5.5' width='16' height='14.5' rx='2'/><path d='M8 3.5v4M16 3.5v4M4 10h16M8 14h3M8 17h6'/>",
      month: "<path d='M5 4h14v16H5zM8 8h8M8 12h8M8 16h5'/>",
      quarter: "<path d='M4 20V6h16v14M8 6V3h8v3M8 10h8M8 14h8'/>",
      year: "<circle cx='12' cy='12' r='8'/><path d='M12 4v16M4 12h16'/>",
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
  }

  class OperationAdvicePage {
    constructor(provider, accountStorage, requestRender) {
      this.provider = provider;
      this.accountStorage = accountStorage;
      this.requestRender = requestRender;
      this.root = null;
      this.stock = null;
      this.status = "idle";
      this.error = "";
      this.errors = {};
      this.results = {};
      this.periodStates = {};
      this.decision = null;
      this.weights = readWeights();
      this.history = [];
      this.selectedPeriod = "day";
      this.generation = 0;
      this.accountKey = "";
    }

    setStock(stock) {
      const code = String(stock?.code || stock?.id || "").padStart(6, "0");
      const accountKey = String(this.accountStorage?.getAccount?.()?.key || "guest");
      const stockChanged = code && code !== this.stock?.code;
      const accountChanged = accountKey !== this.accountKey;
      if (!code || (!stockChanged && !accountChanged)) return;
      this.generation += 1;
      this.accountKey = accountKey;
      this.stock = { ...stock, code, id: stock?.id || code };
      this.status = "idle";
      this.error = "";
      this.errors = {};
      this.results = {};
      this.periodStates = {};
      this.decision = null;
      this.selectedPeriod = "day";
      this.restoreHistory();
    }

    syncWeights() {
      const next = readWeights();
      if (JSON.stringify(next) === JSON.stringify(this.weights)) return;
      this.weights = next;
      this.generation += 1;
      this.status = "idle";
      this.results = {};
      this.periodStates = {};
      this.decision = null;
      this.error = "";
    }

    restoreHistory() {
      try {
        const saved = this.accountStorage?.load(this.stock?.id)?.operationAdvice;
        this.history = Array.isArray(saved?.history) ? saved.history.slice(0, 24) : [];
      } catch (_) {
        this.history = [];
      }
    }

    render(stock) {
      this.setStock(stock);
      this.syncWeights();
      return `<section class="operation-advice-page" aria-labelledby="operation-advice-title">
        ${this.renderPageHeader()}
        <nav class="oa-section-nav" aria-label="操作建议子导航">
          <button type="button" data-action="scroll-operation-section" data-section="oa-overview">${icon("flag")}<span>操作建议</span></button>
          <button type="button" data-action="scroll-operation-section" data-section="oa-periods">${icon("layers")}<span>多周期状态</span></button>
          <button type="button" data-action="scroll-operation-section" data-section="oa-engine">${icon("pulse")}<span>三层引擎</span></button>
          <button type="button" data-action="scroll-operation-section" data-section="oa-evidence">${icon("radar")}<span>技术证据</span></button>
          <button type="button" data-action="scroll-operation-section" data-section="oa-history">${icon("history")}<span>历史回溯</span></button>
        </nav>
        ${this.renderBody()}
        <footer class="oa-disclaimer">数据来自东方财富公开行情；模型仅依据已完成周期的技术证据生成，不构成任何投资建议。市场有风险，决策需结合自身仓位与风险承受能力。</footer>
      </section>`;
    }

    renderPageHeader() {
      const day = this.results.day;
      const overview = day?.overview || {};
      const change = Number(overview.changePct);
      const changeTone = finite(change) ? (change >= 0 ? "positive" : "negative") : "muted";
      const price = finite(overview.price) ? Number(overview.price).toFixed(2) : "--";
      const latestDate = this.latestScoreDate();
      return `<header class="oa-page-header">
        <div class="oa-title-group">
          <span class="oa-title-icon">${icon("flag")}</span>
          <div>
            <p>三层决策引擎 · 风险规则优先</p>
            <h1 id="operation-advice-title">技术操作建议</h1>
            <span>${escapeHtml(this.stock?.name || "当前股票")} <b>${escapeHtml(this.stock?.code || "")}</b></span>
          </div>
        </div>
        <div class="oa-market-meta">
          <div class="oa-quote ${changeTone}"><strong>${price}</strong><span>${finite(change) ? `${formatSigned(change, 2)}%` : "真实行情读取中"}</span></div>
          <div class="oa-asof"><span>数据日期</span><b>${escapeHtml(latestDate || "--")}</b><small>五周期独立计算</small></div>
          <button class="oa-secondary-button" type="button" data-action="select-view" data-view="score-matrix">${icon("weights")}<span>调整评分权重</span></button>
          <button class="oa-refresh-button ${this.status === "loading" ? "is-loading" : ""}" type="button" data-action="refresh-operation-advice" ${this.status === "loading" ? "disabled" : ""}>${icon("refresh")}<span>${this.status === "loading" ? "计算中" : "刷新建议"}</span></button>
        </div>
      </header>`;
    }

    renderBody() {
      if (this.status === "idle" || this.status === "loading") return this.renderLoading();
      if (this.status === "error" && !this.decision) return this.renderError();
      return `${this.renderDecisionOverview()}${this.renderPeriodOverview()}${this.renderEngineLayers()}${this.renderEvidenceGrid()}`;
    }

    renderLoading() {
      const periodLabels = PERIODS.map(item => item.label).join("、");
      return `<section class="oa-state-card" aria-live="polite">
        <span class="oa-loading-mark">${icon("pulse")}</span>
        <div><strong>正在建立三层操作建议</strong><p>读取${periodLabels}真实行情，计算分数斜率、边界距离、位置热度、结构状态与可信度。</p></div>
      </section>`;
    }

    renderError() {
      return `<section class="oa-state-card is-error" role="alert">
        <span>${icon("warning")}</span>
        <div><strong>暂时无法生成正式操作建议</strong><p>${escapeHtml(this.error || "五周期真实行情不完整，请稍后重试。")}</p></div>
        <button type="button" data-action="refresh-operation-advice">重新读取真实行情</button>
      </section>`;
    }

    renderDecisionOverview() {
      const recommendation = this.decision?.recommendation || {};
      const strategic = this.decision?.strategic || {};
      const risk = this.decision?.risk || {};
      const allocation = this.decision?.allocation || {};
      const confidence = clamp(this.decision?.confidence);
      const positive = this.decision?.triggers?.positive || [];
      const negative = this.decision?.triggers?.negative || [];
      const tone = recommendation.tone || (risk.active ? "risk" : "neutral");
      const core = clamp(allocation.core);
      const tactical = clamp(allocation.tactical);
      const maximum = clamp(allocation.max ?? (core + tactical));
      const cash = clamp(allocation.cash ?? (100 - maximum));
      return `<section class="oa-decision-overview" id="oa-overview" aria-labelledby="oa-overview-title">
        <article class="oa-recommendation-card tone-${escapeHtml(tone)}" aria-live="polite">
          <div class="oa-card-kicker">${icon("flag")}<span id="oa-overview-title">综合操作建议</span></div>
          <h2>${escapeHtml(recommendation.label || "等待确认")}</h2>
          <div class="oa-phase-row"><span>${escapeHtml(strategic.label || "战略状态待确认")}</span>${strategic.conflict ? `<b>${icon("warning")}季年冲突已保留</b>` : ""}</div>
          <p>${escapeHtml(recommendation.summary || "多周期证据尚未形成一致方向，等待风险与执行条件进一步确认。")}</p>
          ${risk.active ? `<div class="oa-risk-override" role="alert">${icon("shield")}<span><b>风险覆盖已生效</b>${escapeHtml(risk.reasons?.[0] || "风险规则优先于全部买入条件")}</span></div>` : `<div class="oa-risk-clear">${icon("check")}<span>未触发高级别风险覆盖；买入仍需执行层确认。</span></div>`}
        </article>

        <article class="oa-confidence-card">
          <div class="oa-card-kicker">${icon("target")}<span>信号可信度</span></div>
          <div class="oa-confidence-gauge" style="--oa-confidence:${confidence}%" role="img" aria-label="信号可信度 ${confidence}%">
            <div><strong>${formatNumber(confidence)}%</strong><span>${confidenceLabel(confidence)}</span></div>
          </div>
          <p>覆盖度、历史长度、五维一致性与边界距离共同计算。</p>
        </article>

        <article class="oa-trigger-card">
          <div class="oa-trigger-group is-positive">
            <h3>${icon("check")}买入 / 加仓条件</h3>
            <ul>${(positive.length ? positive : ["等待日线止跌转强并通过量价确认"]).slice(0, 3).map(item => `<li>${icon("check")}<span>${escapeHtml(item)}</span></li>`).join("")}</ul>
          </div>
          <div class="oa-trigger-group is-negative ${risk.active ? "is-active" : ""}">
            <h3>${icon("shield")}减仓 / 风险条件</h3>
            <ul>${(negative.length ? negative : ["结构破坏或高热转弱时优先降低风险"]).slice(0, 3).map(item => `<li>${icon("warning")}<span>${escapeHtml(item)}</span></li>`).join("")}</ul>
          </div>
          ${risk.blocked_buy ? `<div class="oa-buy-blocked">${icon("lock")}风险覆盖期间暂停执行买入条件</div>` : ""}
        </article>

        <article class="oa-allocation-card">
          <div class="oa-card-kicker">${icon("portfolio")}<span>仓位上限规划</span></div>
          <div class="oa-allocation-visual">
            <div class="oa-allocation-ring" style="--oa-core:${core}%;--oa-max:${maximum}%" role="img" aria-label="核心仓上限 ${core}%，机动仓上限 ${tactical}%，现金底线 ${cash}%"><span><b>${maximum}%</b>总仓上限</span></div>
            <dl>
              <div><dt><i class="is-core"></i>核心仓</dt><dd>${core}%</dd></div>
              <div><dt><i class="is-tactical"></i>机动仓</dt><dd>${tactical}%</dd></div>
              <div><dt><i class="is-cash"></i>现金底线</dt><dd>${cash}%</dd></div>
            </dl>
          </div>
          <p>由季线优先、年线约束决定上限；不代表当前已持仓。</p>
        </article>
      </section>`;
    }

    renderPeriodOverview() {
      return `<section class="oa-period-section" id="oa-periods" aria-labelledby="oa-period-title">
        <header class="oa-section-heading"><div><span>${icon("layers")}</span><div><h2 id="oa-period-title">多周期状态总览</h2><p>每个周期独立保存六个状态字段，不对五周期总分做简单平均。</p></div></div><small>边界：45 偏弱 / 65 偏多</small></header>
        <div class="oa-period-grid">${PERIODS.map(period => this.renderPeriodCard(period)).join("")}</div>
      </section>`;
    }

    renderPeriodCard(period) {
      const state = this.periodStates[period.id];
      const error = this.errors[period.id];
      if (!state) {
        return `<article class="oa-period-card is-unavailable"><header><span>${icon(period.id)}</span><div><h3>${period.label}</h3><p>${period.role}</p></div></header><strong>--</strong><p>${escapeHtml(error || "周期数据待形成")}</p></article>`;
      }
      const slope = slopeLabel(state.slope);
      const score = clamp(state.score);
      const boundary = finite(state.boundary?.nearest) ? Number(state.boundary.nearest) : (score < 45 ? 45 : 65);
      const distance = finite(state.distance_to_boundary) ? Math.abs(Number(state.distance_to_boundary)) : null;
      const structureCopy = state.structure_break === true ? "结构已破坏" : state.structure_break === false ? "结构完整" : "结构待确认";
      return `<article class="oa-period-card tone-${scoreTone(state.score)} ${state.structure_break === true ? "has-break" : ""}">
        <header><span>${icon(period.id)}</span><div><h3>${period.label}</h3><p>${period.role}</p></div><time>${escapeHtml(state.score_date || "--")}</time></header>
        <div class="oa-period-score"><strong>${formatNumber(state.score)}</strong><span>${scoreLabel(state.score)}</span><b class="slope-${slope.tone}">${slope.icon} ${finite(state.score_delta) ? formatSigned(state.score_delta, 1) : "--"} ${slope.label}</b></div>
        <div class="oa-score-rail" style="--oa-score:${score}%" aria-label="${period.label}综合评分 ${formatNumber(state.score)}">
          <i class="boundary-45"></i><i class="boundary-65"></i><b></b>
          <span class="label-0">0</span><span class="label-45">45</span><span class="label-65">65</span><span class="label-100">100</span>
        </div>
        <dl class="oa-period-facts">
          <div><dt>边界距离</dt><dd>${distance === null ? "--" : `${formatNumber(distance)} 分 · 距 ${boundary}`}</dd></div>
          <div><dt>位置热度</dt><dd>${finite(state.heat) ? `${formatNumber(state.heat)} · ${heatLabel(state.heat)}` : "--"}</dd></div>
          <div class="${state.structure_break === true ? "is-risk" : ""}"><dt>结构状态</dt><dd>${structureCopy}</dd></div>
          <div><dt>可信度</dt><dd>${finite(state.confidence) ? `${formatNumber(state.confidence)}% · ${confidenceLabel(state.confidence)}` : "--"}</dd></div>
        </dl>
      </article>`;
    }

    renderEngineLayers() {
      const strategic = this.decision?.strategic || {};
      const holding = this.decision?.holding || {};
      const execution = this.decision?.execution || {};
      const cards = [
        { number: "01", icon: "layers", title: "战略方向层", source: "季线 + 年线", label: strategic.label || "等待战略证据", state: strategic, copy: `决定核心仓与总仓上限${strategic.conflict ? "；季年冲突未被平均掩盖" : ""}` },
        { number: "02", icon: "portfolio", title: "持仓状态层", source: "月线 + 周线", label: holding.label || "等待持仓证据", state: holding, copy: "识别趋势延续、健康回调、区间震荡、顶部转弱与弱势反弹" },
        { number: "03", icon: "bolt", title: "执行层", source: "日线", label: execution.label || "等待执行证据", state: execution, copy: "只决定何时执行；低分下行不买，高分上行不直接卖" }
      ];
      return `<section class="oa-engine-section" id="oa-engine" aria-labelledby="oa-engine-title">
        <header class="oa-section-heading"><div><span>${icon("pulse")}</span><div><h2 id="oa-engine-title">三层决策引擎</h2><p>战略定方向，月周定持仓，日线只定执行；风险覆盖在所有买入规则之前。</p></div></div></header>
        <div class="oa-layer-grid">${cards.map((card, index) => `<article class="oa-layer-card ${index < cards.length - 1 ? "has-connector" : ""}">
          <header><b>${card.number}</b><span>${icon(card.icon)}</span><div><h3>${card.title}</h3><p>${card.source}</p></div></header>
          <strong>${escapeHtml(card.label)}</strong>
          <p>${escapeHtml(card.copy)}</p>
          <ul>${(card.state.reasons || ["关键状态字段正在形成"]).slice(0, 3).map(reason => `<li>${icon("arrow")}<span>${escapeHtml(reason)}</span></li>`).join("")}</ul>
        </article>`).join("")}</div>
      </section>`;
    }

    renderEvidenceGrid() {
      const state = this.periodStates[this.selectedPeriod] || this.periodStates.day || Object.values(this.periodStates)[0];
      const dimensions = state?.dimensions || {};
      const entryValue = this.entryValue(state);
      const entryLabel = entryValue >= 70 ? "性价比较好" : entryValue >= 50 ? "性价比一般" : "等待更好位置";
      return `<section class="oa-evidence-section" id="oa-evidence" aria-labelledby="oa-evidence-title">
        <header class="oa-section-heading"><div><span>${icon("radar")}</span><div><h2 id="oa-evidence-title">技术证据与建议回溯</h2><p>雷达仅展示所选单周期五维证据，不参与跨周期简单平均。</p></div></div></header>
        <div class="oa-evidence-grid">
          <article class="oa-strength-card">
            <header><div><h3>单周期趋势强度</h3><p>${escapeHtml(PERIODS.find(item => item.id === this.selectedPeriod)?.label || "日线")} · 五维评分</p></div><div class="oa-period-tabs" role="tablist" aria-label="切换证据周期">${PERIODS.slice().reverse().map(period => `<button type="button" role="tab" aria-selected="${this.selectedPeriod === period.id}" class="${this.selectedPeriod === period.id ? "selected" : ""}" data-action="set-operation-period" data-period="${period.id}">${period.label.slice(0, 1)}</button>`).join("")}</div></header>
            <div class="oa-strength-body">${this.renderRadar(dimensions)}<div class="oa-dimension-bars">${DIMENSIONS.map(item => `<div><span>${icon(item.id)}${item.label}</span><i><b class="tone-${item.tone}" style="--oa-value:${clamp(dimensions[item.id])}%"></b></i><strong>${formatNumber(dimensions[item.id])}</strong></div>`).join("")}</div></div>
          </article>

          <article class="oa-entry-card">
            <header><h3>入场性价比</h3><span>${icon("coin")}</span></header>
            <div class="oa-entry-meter" style="--oa-entry:${entryValue}%"><i></i><b></b></div>
            <div class="oa-entry-score"><strong>${entryValue}</strong><span>/100</span><b>${entryLabel}</b></div>
            <dl>
              <div><dt>位置热度</dt><dd>${finite(state?.heat) ? `${formatNumber(state.heat)} / 100` : "--"}</dd></div>
              <div><dt>结构质量</dt><dd>${formatNumber(dimensions.structure)} / 100</dd></div>
              <div><dt>量价确认</dt><dd>${formatNumber(dimensions.volumePrice)} / 100</dd></div>
              <div><dt>风险覆盖</dt><dd class="${this.decision?.risk?.active ? "is-risk" : ""}">${this.decision?.risk?.active ? "已生效" : "未触发"}</dd></div>
            </dl>
            <p>仅衡量执行窗口，不替代战略与风险判断。</p>
          </article>

          ${this.renderHistoryCard()}
        </div>
      </section>`;
    }

    renderRadar(dimensions) {
      const center = 92;
      const radius = 62;
      const angleFor = index => -Math.PI / 2 + index * Math.PI * 2 / DIMENSIONS.length;
      const point = (index, scale) => `${(center + Math.cos(angleFor(index)) * radius * scale).toFixed(1)},${(center + Math.sin(angleFor(index)) * radius * scale).toFixed(1)}`;
      const polygon = scale => DIMENSIONS.map((_, index) => point(index, scale)).join(" ");
      const data = DIMENSIONS.map((item, index) => point(index, clamp(dimensions[item.id]) / 100)).join(" ");
      return `<svg class="oa-radar" viewBox="0 0 184 184" role="img" aria-label="${escapeHtml(this.selectedPeriod)}五维技术评分雷达图">
        <polygon class="grid" points="${polygon(1)}"></polygon><polygon class="grid" points="${polygon(0.66)}"></polygon><polygon class="grid" points="${polygon(0.33)}"></polygon>
        ${DIMENSIONS.map((_, index) => `<line class="axis" x1="${center}" y1="${center}" x2="${point(index, 1).split(",")[0]}" y2="${point(index, 1).split(",")[1]}"></line>`).join("")}
        <polygon class="data" points="${data}"></polygon>
        ${DIMENSIONS.map((item, index) => { const [x, y] = point(index, clamp(dimensions[item.id]) / 100); return `<circle cx="${x}" cy="${y}" r="3.5"></circle>`; }).join("")}
      </svg>`;
    }

    renderHistoryCard() {
      const items = this.history.slice(0, 6);
      return `<article class="oa-history-card" id="oa-history">
        <header><div><h3>历史建议回溯</h3><p>同一行情快照不会重复保存</p></div><span>${icon("history")}</span></header>
        ${items.length ? `<ol>${items.map(item => `<li class="tone-${escapeHtml(item.tone || "neutral")}"><i></i><time>${escapeHtml(item.as_of || item.created_at?.slice(0, 10) || "--")}</time><div><strong>${escapeHtml(item.label || "等待确认")}</strong><p>${escapeHtml(item.summary || item.reason || "多周期状态更新")}</p></div></li>`).join("")}</ol>` : `<div class="oa-history-empty">${icon("history")}<strong>首次建议将在本次计算后保存</strong><p>后续行情日期或评分状态变化时追加记录。</p></div>`}
      </article>`;
    }

    entryValue(state) {
      if (!state) return 0;
      const heatComponent = finite(state.heat) ? 100 - clamp(state.heat) : 50;
      const structure = finite(state.dimensions?.structure) ? clamp(state.dimensions.structure) : 50;
      const volumePrice = finite(state.dimensions?.volumePrice) ? clamp(state.dimensions.volumePrice) : 50;
      return Math.round(heatComponent * 0.4 + structure * 0.35 + volumePrice * 0.25);
    }

    latestScoreDate() {
      return Object.values(this.periodStates).map(item => item?.score_date || "").filter(Boolean).sort().at(-1)
        || Object.values(this.results).map(item => item?.overview?.scoreDate || "").filter(Boolean).sort().at(-1)
        || "";
    }

    mount(root, stock) {
      this.root = root;
      this.setStock(stock);
      this.syncWeights();
      if (this.status === "idle" && this.stock?.code) void this.load(false);
    }

    handleAction(target) {
      const action = target?.dataset?.action;
      if (action === "refresh-operation-advice") {
        void this.load(true);
        return "async";
      }
      if (action === "set-operation-period") {
        const period = String(target.dataset.period || "");
        if (PERIODS.some(item => item.id === period)) this.selectedPeriod = period;
        this.requestRender();
        return "async";
      }
      if (action === "scroll-operation-section") {
        const section = this.root?.querySelector(`#${target.dataset.section}`);
        section?.scrollIntoView({ behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth", block: "start" });
        return "async";
      }
      return false;
    }

    refresh() {
      return this.load(true);
    }

    weightedHistory(result) {
      const scoreApi = global.StockTechnicalScores;
      const candles = Array.isArray(result?.candles) ? result.candles : [];
      const profile = result?.scores?.indicators?.profile;
      if (!scoreApi?.calculateTechnicalScore || !scoreApi?.calculateTotalScore || !profile || !candles.length) {
        return Array.isArray(result?.scoreHistory) ? result.scoreHistory.slice(-4) : [];
      }
      const minimum = Math.max(1, Number(profile.minimumBars) || 1);
      const start = Math.max(minimum - 1, candles.length - 4);
      const history = [];
      for (let index = start; index < candles.length; index += 1) {
        const scoreResult = scoreApi.calculateTechnicalScore(candles.slice(0, index + 1), { profile });
        history.push({
          date: candles[index]?.date || "",
          score: scoreApi.calculateTotalScore(scoreResult.dimensions || {}, this.weights)
        });
      }
      return history;
    }

    async load(forceRefresh) {
      const engine = global.StockOperationAdviceEngine;
      if (!this.provider || !engine || !this.stock?.code) {
        this.status = "error";
        this.error = !engine ? "三层决策引擎未能加载，请刷新页面。" : "真实行情服务暂不可用。";
        this.requestRender();
        return;
      }
      const generation = ++this.generation;
      this.status = "loading";
      this.error = "";
      this.errors = {};
      this.requestRender();
      const decisionNowMs = Date.now();
      const settled = await Promise.allSettled(PERIODS.map(async period => {
        const rawResult = await this.provider.getTechnicalAnalysis(this.stock.code, {
          period: period.id,
          adjustment: "forward"
        }, { forceRefresh: Boolean(forceRefresh) });
        const result = completedDecisionResult(rawResult, period.id, decisionNowMs);
        return { period, result };
      }));
      if (generation !== this.generation) return;
      this.results = {};
      this.periodStates = {};
      settled.forEach((entry, index) => {
        const period = PERIODS[index];
        if (entry.status === "fulfilled") {
          const result = entry.value.result;
          this.results[period.id] = result;
          this.periodStates[period.id] = engine.buildPeriodState(result, {
            weights: this.weights,
            weightedHistory: this.weightedHistory(result)
          });
        } else {
          this.errors[period.id] = entry.reason?.message || `${period.label}真实行情读取失败`;
        }
      });
      try {
        this.decision = engine.evaluate(this.periodStates, { stock: this.stock, weights: this.weights });
      } catch (error) {
        this.decision = null;
        this.error = error?.message || "三层决策计算失败";
      }
      if (!this.decision) {
        this.status = "error";
        if (!this.error) this.error = "五周期有效数据不足，风险优先规则不输出正式建议。";
        this.requestRender();
        return;
      }
      this.status = Object.keys(this.errors).length ? "partial" : "ready";
      this.persistSnapshot();
      this.requestRender();
    }

    persistSnapshot() {
      if (!this.accountStorage?.save || !this.stock?.id || !this.decision) return;
      const engineVersion = this.decision.engine_version || global.StockOperationAdviceEngine?.ENGINE_VERSION || "three-layer-v2";
      const periodSnapshot = Object.fromEntries(PERIODS.map(period => {
        const state = this.periodStates[period.id];
        if (!state) return [period.id, null];
        return [period.id, {
          as_of: state.score_date,
          score: state.score,
          slope: state.slope,
          distance_to_boundary: state.distance_to_boundary,
          heat: state.heat,
          structure_break: state.structure_break,
          structure_break_determinable: state.structure_break_determinable,
          confidence: state.confidence,
          confidence_components: state.confidence_components,
          boundary: state.boundary,
          partial_period: state.partial_period,
          dimensions: state.dimensions
        }];
      }));
      const signature = JSON.stringify({
        engineVersion,
        weights: this.weights,
        periods: periodSnapshot,
        recommendation: this.decision.recommendation?.id,
        confidence: this.decision.confidence,
        allocation: this.decision.allocation,
        reason_codes: this.decision.reason_codes || []
      });
      const previous = this.accountStorage.load(this.stock.id)?.operationAdvice || {};
      if (previous.latest?.signature === signature) {
        this.history = Array.isArray(previous.history) ? previous.history.slice(0, 24) : this.history;
        return;
      }
      const recommendation = this.decision.recommendation || {};
      const historyEntry = {
        signature,
        created_at: new Date().toISOString(),
        as_of: this.latestScoreDate(),
        label: recommendation.label || "等待确认",
        tone: recommendation.tone || "neutral",
        summary: recommendation.summary || "多周期状态更新",
        reason_codes: this.decision.reason_codes || [],
        risk_active: Boolean(this.decision.risk?.active),
        periods: periodSnapshot,
        strategic: this.decision.strategic,
        holding: this.decision.holding,
        execution: this.decision.execution,
        risk: this.decision.risk,
        recommendation: this.decision.recommendation,
        allocation: this.decision.allocation,
        confidence: this.decision.confidence
      };
      const history = [historyEntry, ...(Array.isArray(previous.history) ? previous.history : [])]
        .filter((item, index, items) => items.findIndex(other => other.signature === item.signature) === index)
        .slice(0, 24);
      const latest = {
        signature,
        schema_version: 2,
        engine_version: engineVersion,
        created_at: historyEntry.created_at,
        stock: { code: this.stock.code, name: this.stock.name },
        weights: this.weights,
        periods: periodSnapshot,
        strategic: this.decision.strategic,
        holding: this.decision.holding,
        execution: this.decision.execution,
        risk: this.decision.risk,
        recommendation: this.decision.recommendation,
        allocation: this.decision.allocation,
        confidence: this.decision.confidence,
        reason_codes: this.decision.reason_codes || []
      };
      try {
        this.accountStorage.save(this.stock.id, {
          operationAdvice: { schemaVersion: 2, engineVersion, latest, history }
        });
        this.history = history;
      } catch (_) {
        this.history = history;
      }
    }
  }

  global.StockOperationAdvicePage = {
    PERIODS,
    internals: { finite, completedAtMs, isCompletedPeriod, completedDecisionResult },
    create(provider, accountStorage, requestRender) {
      return new OperationAdvicePage(provider, accountStorage, requestRender);
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
