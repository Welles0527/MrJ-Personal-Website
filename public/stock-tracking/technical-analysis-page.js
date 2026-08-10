"use strict";

(function createTechnicalAnalysisPage(global) {
  const dimensionMeta = {
    trend: { label: "趋势", tone: "blue", description: "均线、MACD 与 ADX 共同判断方向" },
    structure: { label: "结构", tone: "mint", description: "枢轴、平台与通道共同判断健康度" },
    momentum: { label: "动量", tone: "green", description: "RSI、MACD、KDJ 与 ROC 判断推动力" },
    volumePrice: { label: "量价", tone: "purple", description: "量比、OBV、CMF 与突破量能互证" },
    volatility: { label: "波动", tone: "orange", description: "带宽、ATR 与实现波动率判断扩张质量" }
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return number.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date).replaceAll("/", "-");
  }

  function normalizeSearchText(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function isFuzzySubsequence(needle, haystack) {
    if (!needle || !haystack) return false;
    let index = 0;
    for (const character of haystack) {
      if (character === needle[index]) index += 1;
      if (index === needle.length) return true;
    }
    return false;
  }

  function stockMatchesSearch(stock, rawQuery) {
    const query = normalizeSearchText(rawQuery);
    const fields = [stock.name, stock.code, stock.initials].map(normalizeSearchText).filter(Boolean);
    return fields.some(field => field.includes(query) || isFuzzySubsequence(query, field));
  }

  function icon(name) {
    const paths = {
      trend: '<path d="M4 17l5-5 3 3 7-8"/><path d="M14 7h5v5"/>',
      structure: '<path d="M5 18V9l7-4 7 4v9"/><path d="M8 12l4-2 4 2v5H8z"/>',
      momentum: '<path d="M5 16a7 7 0 1 1 14 0"/><path d="m12 13 4-4"/><circle cx="12" cy="16" r="1"/>',
      volumePrice: '<path d="M5 18v-4M9 18V9M13 18v-7M17 18V5M21 18H3"/>',
      volatility: '<path d="M3 12c3-6 6 6 9 0s6 6 9 0"/><path d="M3 17c3-4 6 4 9 0s6 4 9 0"/>',
      search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
      refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.2 9A7 7 0 0 1 18.5 7M17.8 15A7 7 0 0 1 5.5 17"/>',
      back: '<path d="m15 18-6-6 6-6"/>',
      buy: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
      breakout: '<path d="M4 18l5-5 3 3 7-9"/><path d="M14 7h5v5"/><path d="M5 21h14"/>',
      stop: '<path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 10 4.1-1.7 7-5.6 7-10V6z"/><path d="m9 12 2 2 4-5"/>',
      target: '<path d="M5 21V4"/><path d="M6 5h11l-2 3 2 3H6"/>',
      reduce: '<path d="M12 3 3 20h18z"/><path d="M12 9v5M12 17h.01"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.trend}</svg>`;
  }

  function linePath(values, width = 118, height = 34) {
    const finiteValues = values.map(Number).filter(Number.isFinite);
    if (finiteValues.length < 2) return "";
    const minimum = Math.min(...finiteValues);
    const maximum = Math.max(...finiteValues);
    const range = maximum - minimum || 1;
    return values.map((rawValue, index) => {
      const value = Number(rawValue);
      const x = index / Math.max(1, values.length - 1) * width;
      const y = height - 3 - ((value - minimum) / range) * (height - 6);
      return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  function renderSparkline(id, result) {
    const values = result.sparklines[id] || [];
    if (id === "momentum") {
      const maximum = Math.max(...values.map(value => Math.abs(Number(value) || 0)), 0.0001);
      return `<svg class="ta-spark bars" viewBox="0 0 118 34" aria-hidden="true">
        ${values.map((value, index) => {
          const height = Math.max(1, Math.abs(Number(value) || 0) / maximum * 14);
          const y = Number(value) >= 0 ? 17 - height : 18;
          return `<rect x="${(index * 6.3).toFixed(1)}" y="${y.toFixed(1)}" width="3.4" height="${height.toFixed(1)}" class="${Number(value) >= 0 ? "positive" : "negative"}"/>`;
        }).join("")}
        <path d="M0 17.5H118" class="baseline"/>
      </svg>`;
    }
    if (id === "volumePrice") {
      const volumes = result.sparklines.volumePrice;
      const prices = result.sparklines.trend;
      const maxVolume = Math.max(...volumes.map(Number), 1);
      return `<svg class="ta-spark combo" viewBox="0 0 118 34" aria-hidden="true">
        ${volumes.map((value, index) => `<rect x="${(index * 6.3).toFixed(1)}" y="${(32 - Number(value) / maxVolume * 15).toFixed(1)}" width="3.2" height="${(Number(value) / maxVolume * 15).toFixed(1)}"/>`).join("")}
        <path d="${linePath(prices)}"/>
      </svg>`;
    }
    return `<svg class="ta-spark" viewBox="0 0 118 34" aria-hidden="true"><path d="${linePath(values)}"/></svg>`;
  }

  function detailsTooltip(meta, dimension) {
    return `<span class="ta-score-tooltip" role="tooltip">
      <strong>${meta.label}评分 ${formatNumber(dimension.score, 0)}</strong>
      ${dimension.details.map(detail => `<span><b>${escapeHtml(detail.label)}</b><em>${Number.isFinite(Number(detail.points)) ? `${formatNumber(detail.points, 1)}/${detail.max}` : "--"}</em></span><small>${escapeHtml(detail.evidence)}</small>`).join("")}
    </span>`;
  }

  function StockSearchBar(context, state) {
    const query = state.searchQuery.trim();
    const matches = query ? context.allStocks.filter(stock => stockMatchesSearch(stock, query)).slice(0, 7) : [];
    return `<div class="ta-search-wrap">
      <label class="ta-stock-search">
        ${icon("search")}
        <input type="search" value="${escapeHtml(state.searchQuery)}" data-technical-search placeholder="输入名称 / 代码" autocomplete="off" aria-label="搜索任意A股">
        ${query ? '<button type="button" data-action="clear-technical-search" aria-label="清除搜索">×</button>' : ""}
      </label>
      ${query ? `<div class="ta-search-results" role="listbox">
        ${matches.length ? matches.map(stock => `<button type="button" role="option" data-action="select-stock" data-stock-id="${stock.id}" data-stock-view="technical">
          <span><strong>${escapeHtml(stock.name)}</strong><small>${stock.code}</small></span>
          <em>${escapeHtml(stock.market || "A股")}</em>
        </button>`).join("") : '<div class="ta-search-empty">没有匹配的股票</div>'}
      </div>` : ""}
    </div>`;
  }

  function DashboardHeader(result, context, state) {
    const stock = result.overview;
    const rising = Number(stock.changePct) >= 0;
    return `<header class="ta-dashboard-header">
      <div class="ta-identity">
        <button type="button" class="ta-back" data-action="return-stock-view" aria-label="返回个股跟踪">${icon("back")}</button>
        <span class="ta-brand-mark">${icon("trend")}</span>
        <div><h1>${escapeHtml(stock.name)}技术总览</h1><p>${stock.code} · 日线前复权 · 评分截至 ${escapeHtml(stock.scoreDate)} 收盘</p></div>
      </div>
      ${StockSearchBar(context, state)}
      <div class="ta-live-quote ${rising ? "rise" : "fall"}">
        <strong>${formatNumber(stock.price)}</strong>
        <span>${rising ? "+" : ""}${formatNumber(stock.change)}　${rising ? "+" : ""}${formatNumber(stock.changePct)}%</span>
      </div>
      <div class="ta-status-stack">
        <span class="ta-status-chip market">${escapeHtml(stock.tradingStatus)}</span>
        <span class="ta-status-chip score">${escapeHtml(result.scores.label)}</span>
      </div>
      <div class="ta-update">
        <span>数据更新 · ${formatDateTime(stock.updatedAt)}</span>
        <button type="button" data-action="refresh-technical" aria-label="刷新真实行情" ${state.status === "loading" ? "disabled" : ""}>${icon("refresh")}</button>
      </div>
    </header>`;
  }

  function DimensionMetric(id, result) {
    const meta = dimensionMeta[id];
    const dimension = result.scores.dimensions[id];
    return `<button type="button" class="ta-dimension ta-dimension-${id} tone-${meta.tone}" aria-describedby="ta-${id}-tip">
      <span class="ta-dimension-icon">${icon(id)}</span>
      <span class="ta-dimension-copy">
        <span class="ta-dimension-title">${meta.label} <strong>${formatNumber(dimension.score, 0)}</strong></span>
        ${renderSparkline(id, result)}
        <small>${escapeHtml(dimension.details.find(detail => Number.isFinite(Number(detail.points)))?.evidence || meta.description)}</small>
      </span>
      <span id="ta-${id}-tip">${detailsTooltip(meta, dimension)}</span>
    </button>`;
  }

  function TotalScoreTooltip(result) {
    const rows = Object.entries(dimensionMeta).map(([id, meta]) => {
      const score = result.scores.dimensions[id].score;
      const weight = global.StockTechnicalScores.DIMENSION_WEIGHTS[id];
      return `<span><b>${meta.label} ${formatNumber(score, 0)}</b><em>× ${weight}%</em></span>`;
    }).join("");
    return `<span class="ta-score-tooltip ta-total-tooltip" role="tooltip"><strong>综合技术评分</strong>${rows}<small>= ${formatNumber(result.scores.total, 0)}</small></span>`;
  }

  function RadarOverview(result) {
    return `<section class="ta-radar-panel" aria-labelledby="ta-radar-title">
      <div class="ta-panel-title"><h2 id="ta-radar-title">综合技术评分 <span>（满分100）</span></h2><p>五维评分全部由最近完成交易日的真实行情计算</p></div>
      <div class="ta-radar-stage">
        ${DimensionMetric("trend", result)}
        ${DimensionMetric("structure", result)}
        ${DimensionMetric("momentum", result)}
        ${DimensionMetric("volumePrice", result)}
        ${DimensionMetric("volatility", result)}
        <div id="technical-radar-chart" class="ta-radar-chart" role="img" aria-label="${escapeHtml(result.overview.name)}五维技术雷达图"></div>
        <button type="button" class="ta-total-score" aria-label="综合技术评分 ${formatNumber(result.scores.total, 0)}，${escapeHtml(result.scores.label)}">
          <strong>${formatNumber(result.scores.total, 0)}</strong><span>${escapeHtml(result.scores.label)}</span>${TotalScoreTooltip(result)}
        </button>
      </div>
      <div class="ta-conclusions"><strong>技术结论</strong><div>
        ${result.scores.chips.length ? result.scores.chips.map(chip => `<span class="tone-${chip.tone}">${escapeHtml(chip.label)}</span>`).join("") : '<span class="tone-muted">暂无达到阈值的技术结论</span>'}
      </div></div>
    </section>`;
  }

  function tradeItem(iconName, tone, title, value, detail) {
    return `<div class="ta-trade-item tone-${tone}"><span class="ta-trade-icon">${icon(iconName)}</span><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(value)}</span>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div></div>`;
  }

  function TradePositionPanel(result) {
    const levels = result.tradeLevels;
    const buy = levels.buyZone;
    const breakout = levels.breakout;
    const target1 = levels.targets[0];
    const target2 = levels.targets[1];
    return `<aside class="ta-trade-panel" aria-labelledby="ta-trade-title">
      <div class="ta-panel-title"><h2 id="ta-trade-title">交易位置 / 买卖点</h2><p>基于支撑压力共振与 ATR 距离，不构成交易建议</p></div>
      <div class="ta-trade-list">
        ${tradeItem("buy", "mint", "买点", buy ? `缩量回踩 ${formatNumber(buy.lower)}～${formatNumber(buy.upper)}` : "--", buy ? buy.sources.join(" + ") : "等待两项以上支撑共振")}
        ${tradeItem("breakout", "green", breakout?.triggered ? "突破买点" : "关注突破", breakout ? `${breakout.triggered ? "放量站上" : "放量站上"} ${formatNumber(breakout.price)}` : "--", breakout?.condition || "尚未识别主要压力")}
        ${tradeItem("stop", "red", "止损位", formatNumber(levels.stop), levels.stop ? `支撑下沿 - 0.4 ATR（ATR ${formatNumber(levels.atr)}）` : "支撑结构不足")}
        ${tradeItem("target", "blue", "第一目标位", formatNumber(target1), target1 ? "优先采用上方真实技术压力" : "--")}
        ${tradeItem("target", "purple", "第二目标位", formatNumber(target2), target2 ? "次级压力；无压力时采用风险收益模型" : "--")}
        ${tradeItem("reduce", "orange", "减仓信号", levels.reduceSignal?.label || "--", levels.reduceSignal?.evidence?.join("；") || "未形成共振")}
      </div>
    </aside>`;
  }

  function ScoreTrend(result) {
    return `<section class="ta-score-trend" aria-labelledby="ta-score-trend-title">
      <div class="ta-panel-title"><h2 id="ta-score-trend-title">综合评分趋势（近30个交易日）</h2><p>每个交易日均仅使用当时已确认的数据重新计算</p></div>
      <div id="technical-score-trend-chart" class="ta-score-trend-chart" role="img" aria-label="近30个交易日综合技术评分趋势"></div>
      <div class="ta-latest-score"><strong>${formatNumber(result.scores.total, 0)}</strong><span>最新评分</span><small>${result.overview.scoreDate.slice(5)}</small></div>
    </section>`;
  }

  function LoadingState(context, state) {
    return `<div class="technical-analysis-page ta-state-page">
      <header class="ta-state-header"><button type="button" class="ta-back" data-action="return-stock-view">${icon("back")}</button>${StockSearchBar(context, state)}</header>
      <section class="ta-loading" aria-live="polite" aria-busy="true"><span class="ta-loader"></span><h2>正在读取真实行情</h2><p>加载至少250个交易日的前复权日线，并逐日计算技术评分…</p></section>
    </div>`;
  }

  function ErrorState(state, context) {
    return `<div class="technical-analysis-page ta-state-page">
      <header class="ta-state-header"><button type="button" class="ta-back" data-action="return-stock-view">${icon("back")}</button>${StockSearchBar(context, state)}</header>
      <section class="ta-error-state"><span>行情数据未连接</span><h2>无法生成正式技术评分</h2><p>${escapeHtml(state.error || "真实行情暂不可用，请稍后重试。")}</p><button type="button" data-action="refresh-technical">重新读取真实行情</button></section>
    </div>`;
  }

  class TechnicalAnalysisPage {
    constructor(provider, onChange) {
      this.provider = provider;
      this.onChange = onChange;
      this.currentStockCode = "";
      this.chartElements = [];
      this.resizeObserver = typeof ResizeObserver === "function"
        ? new ResizeObserver(() => global.requestAnimationFrame(() => this.chartElements.forEach(element => global.StockTechnicalChart?.resize(element))))
        : null;
      this.state = {
        status: "idle",
        result: null,
        error: "",
        searchQuery: "",
        query: { period: "day", adjustment: "forward" }
      };
    }

    async load(stockCode, options = {}) {
      if (!stockCode) return;
      if (!options.forceRefresh && this.currentStockCode === stockCode && ["loading", "ready"].includes(this.state.status)) return;
      this.currentStockCode = stockCode;
      this.state.status = "loading";
      this.state.error = "";
      this.state.result = null;
      this.onChange();
      try {
        const result = await this.provider.getTechnicalAnalysis(stockCode, this.state.query, options);
        if (this.currentStockCode !== stockCode) return;
        this.state.result = result;
        this.state.status = "ready";
      } catch (error) {
        if (this.currentStockCode !== stockCode) return;
        this.state.status = "error";
        this.state.error = error?.message || "未知错误";
      }
      this.onChange();
    }

    render(stock, context) {
      if (this.state.status === "idle" || (this.currentStockCode && this.currentStockCode !== stock.code)) return LoadingState(context, this.state);
      if (this.state.status === "loading") return LoadingState(context, this.state);
      if (this.state.status === "error" || !this.state.result) return ErrorState(this.state, context);
      this.state.result.overview.name = stock.name || this.state.result.overview.name;
      return `<div class="technical-analysis-page">
        ${DashboardHeader(this.state.result, context, this.state)}
        <div class="ta-dashboard-grid">${RadarOverview(this.state.result)}${TradePositionPanel(this.state.result)}</div>
        ${ScoreTrend(this.state.result)}
        <footer class="ta-data-foot">${escapeHtml(this.state.result.dataMeta.source)} · ${this.state.result.dataMeta.rawCount} 个已完成交易日 · 前复权 · 技术评分描述当前状态，不代表上涨概率</footer>
      </div>`;
    }

    mount(root, stock) {
      if (!stock?.code) return;
      if (this.currentStockCode !== stock.code || this.state.status === "idle") {
        this.load(stock.code);
        return;
      }
      if (!this.state.result || this.state.status !== "ready") return;
      this.chartElements.forEach(element => this.resizeObserver?.unobserve(element));
      this.chartElements = [root.querySelector("#technical-radar-chart"), root.querySelector("#technical-score-trend-chart")].filter(Boolean);
      this.chartElements.forEach(element => this.resizeObserver?.observe(element));
      global.StockTechnicalChart?.renderRadar(this.chartElements[0], this.state.result);
      global.StockTechnicalChart?.renderTrend(this.chartElements[1], this.state.result);
    }

    handleAction(target) {
      const action = target.dataset.action;
      if (action === "clear-technical-search") {
        this.state.searchQuery = "";
        return true;
      }
      if (action === "refresh-technical") {
        this.load(this.currentStockCode, { forceRefresh: true });
        return "async";
      }
      return false;
    }

    handleInput(target) {
      if (!target.matches("[data-technical-search]")) return false;
      this.state.searchQuery = target.value;
      return true;
    }

    clearSearch() {
      this.state.searchQuery = "";
    }
  }

  global.StockTechnicalAnalysisPage = {
    create(provider, onChange) {
      return new TechnicalAnalysisPage(provider, onChange);
    }
  };
})(window);
