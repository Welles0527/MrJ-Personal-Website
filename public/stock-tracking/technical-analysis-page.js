"use strict";

(function createTechnicalAnalysisPage(global) {
  const indicatorOptions = [
    { id: "volume", label: "成交量" },
    { id: "macd", label: "MACD" },
    { id: "rsi", label: "RSI" },
    { id: "atr", label: "ATR" },
    { id: "relativeStrength", label: "相对强弱" }
  ];
  const diagnosisIndicator = {
    trend: "volume",
    structure: "volume",
    momentum: "macd",
    volume: "volume",
    relative: "relativeStrength",
    volatility: "atr",
    position: "rsi",
    multiTimeframe: "macd"
  };
  const signalTypeLabels = {
    trend: "趋势",
    structure: "结构",
    momentum: "动能",
    volume: "量价",
    relative: "强弱",
    risk: "风险"
  };
  const rangeLabels = [
    ["1m", "1个月"],
    ["3m", "3个月"],
    ["6m", "6个月"],
    ["1y", "1年"],
    ["3y", "3年"]
  ];
  const horizonLabels = [
    ["short", "短线"],
    ["swing", "波段"],
    ["medium", "中期"]
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value, digits = 2) {
    return Number(value).toLocaleString("zh-CN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function formatCompactAmount(value) {
    if (value >= 1000000000000) return `${formatNumber(value / 1000000000000)}万亿`;
    if (value >= 100000000) return `${formatNumber(value / 100000000)}亿`;
    if (value >= 10000) return `${formatNumber(value / 10000)}万`;
    return formatNumber(value, 0);
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("zh-CN", {
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

  function toneLabel(tone) {
    return { positive: "偏强", negative: "偏弱", warning: "留意", neutral: "中性" }[tone] || "中性";
  }

  function renderChoiceGroup(label, action, options, current) {
    return `
      <div class="ta-control-group" aria-label="${label}">
        <span class="ta-control-label">${label}</span>
        <div class="ta-segmented">
          ${options.map(([value, text]) => `
            <button type="button" data-action="${action}" data-value="${value}"
              class="${value === current ? "selected" : ""}" aria-pressed="${value === current}">
              ${text}
            </button>`).join("")}
        </div>
      </div>`;
  }

  function StockSearchBar(context, state) {
    const query = state.searchQuery.trim();
    const matches = query
      ? context.allStocks
        .filter(stock => stockMatchesSearch(stock, query))
        .slice(0, 6)
      : [];
    return `
      <div class="ta-search-wrap">
        <label class="ta-stock-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>
          <input type="search" value="${escapeHtml(state.searchQuery)}" data-technical-search
            placeholder="名称 / 代码 / 拼音首字母" autocomplete="off" aria-label="搜索股票名称、代码或拼音首字母">
          ${state.searchQuery ? `<button type="button" data-action="clear-technical-search" aria-label="清除搜索">×</button>` : ""}
        </label>
        ${query ? `
          <div class="ta-search-results" role="listbox">
            ${matches.length ? matches.map(stock => {
              const hasQuote = Number.isFinite(Number(stock.changePct)) && stock.changePct !== null;
              return `
                <button type="button" role="option" data-action="select-stock" data-stock-id="${stock.id}" data-stock-view="technical">
                  <span><strong>${escapeHtml(stock.name)}</strong><small>${stock.code}</small></span>
                  <span class="${hasQuote ? (Number(stock.changePct) >= 0 ? "rise" : "fall") : ""}">
                    ${hasQuote ? `${Number(stock.changePct) >= 0 ? "+" : ""}${formatNumber(stock.changePct)}%` : escapeHtml(stock.market || "暂无行情")}
                  </span>
                </button>`;
            }).join("") : `
              <div class="ta-search-empty">没有匹配的股票</div>`}
          </div>` : ""}
      </div>`;
  }

  function StockOverviewHeader(result, context, state) {
    const stock = result.overview;
    const rising = stock.changePct >= 0;
    return `
      <header class="ta-overview">
        <div class="ta-title-row">
          <div class="ta-page-identity">
            <button type="button" class="ta-back" data-action="return-stock-view" aria-label="返回个股跟踪">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <span class="ta-page-name">个股技术分析</span>
              <strong>${escapeHtml(stock.name)} <small>${stock.code}</small></strong>
            </div>
          </div>
          ${StockSearchBar(context, state)}
          <div class="ta-header-actions">
            <button type="button" class="ta-action-button" data-action="refresh-technical" ${state.status === "loading" ? "disabled" : ""}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9A7 7 0 0 1 18.5 7M17.9 15A7 7 0 0 1 5.5 17"/></svg>
              ${state.status === "loading" ? "刷新中" : "刷新"}
            </button>
            <button type="button" class="ta-action-button ${stock.inWatchlist ? "is-saved" : ""}" data-action="add-watchlist" data-stock-id="${stock.id}" ${stock.inWatchlist ? "disabled" : ""}>
              <svg viewBox="0 0 24 24" aria-hidden="true">${stock.inWatchlist ? `<path d="m5 12 4 4L19 6"/>` : `<path d="M12 5v14M5 12h14"/>`}</svg>
              ${stock.inWatchlist ? "已在自选" : "加入自选"}
            </button>
          </div>
        </div>
        <div class="ta-market-row">
          <div class="ta-price-block ${rising ? "rise" : "fall"}">
            <strong>${formatNumber(stock.price)}</strong>
            <span>${rising ? "+" : ""}${formatNumber(stock.change)}　${rising ? "+" : ""}${formatNumber(stock.changePct)}%</span>
          </div>
          <dl class="ta-overview-metrics">
            <div><dt>换手率</dt><dd>${formatNumber(stock.turnoverRate)}%</dd></div>
            <div><dt>成交额</dt><dd>${formatCompactAmount(stock.turnoverAmount)}</dd></div>
            <div><dt>所属行业</dt><dd>${escapeHtml(stock.industry)}</dd></div>
            <div><dt>总市值</dt><dd>${formatCompactAmount(stock.marketCap)}</dd></div>
            <div><dt>数据更新</dt><dd>${formatDateTime(stock.updatedAt)}</dd></div>
          </dl>
        </div>
        <div class="ta-control-row">
          ${renderChoiceGroup("周期", "set-technical-period", [["day", "日线"], ["week", "周线"]], state.query.period)}
          <div class="ta-control-group">
            <span class="ta-control-label">复权</span>
            <div class="ta-segmented"><button type="button" class="selected" aria-pressed="true">前复权</button></div>
          </div>
          ${renderChoiceGroup("区间", "set-technical-range", rangeLabels, state.query.range)}
          ${renderChoiceGroup("策略", "set-technical-horizon", horizonLabels, state.query.horizon)}
        </div>
      </header>`;
  }

  function TechnicalDiagnosisCard(diagnosis, state) {
    const selected = state.selectedDiagnosisId === diagnosis.id;
    return `
      <button type="button" class="ta-diagnosis-card tone-${diagnosis.tone} ${selected ? "selected" : ""}"
        data-action="select-diagnosis" data-diagnosis-id="${diagnosis.id}" aria-pressed="${selected}">
        <span class="ta-card-head">
          <strong>${escapeHtml(diagnosis.title)}</strong>
          <span class="ta-status">${escapeHtml(diagnosis.status)}</span>
        </span>
        <span class="ta-card-conclusion">${escapeHtml(diagnosis.conclusion)}</span>
        <span class="ta-card-evidence">
          ${diagnosis.evidence.slice(0, 3).map(item => `<span>${escapeHtml(item)}</span>`).join("")}
        </span>
        <span class="ta-card-foot">
          <span>${formatDateTime(diagnosis.updatedAt)} 更新</span>
          <span class="ta-strength"><i style="--strength:${diagnosis.strength}%"></i>${diagnosis.strength}%可信</span>
          <span class="ta-detail-link">${selected ? "正在查看" : "查看详情"}</span>
        </span>
      </button>`;
  }

  function TechnicalDiagnosisGrid(result, state) {
    return `
      <section class="ta-section" aria-labelledby="diagnosis-title">
        <div class="ta-section-heading">
          <div><h2 id="diagnosis-title">技术状态诊断</h2><p>选择卡片，图表和结论将聚焦对应证据</p></div>
          <span class="ta-section-note">模型：${state.query.horizon === "swing" ? "波段" : state.query.horizon === "short" ? "短线" : "中期"} · 模拟数据</span>
        </div>
        <div class="ta-diagnosis-grid">
          ${result.diagnoses.map(item => TechnicalDiagnosisCard(item, state)).join("")}
        </div>
      </section>`;
  }

  function IndicatorSelector(state) {
    return `
      <div class="ta-indicator-selector" role="group" aria-label="副图指标">
        ${indicatorOptions.map(option => `
          <button type="button" data-action="set-technical-indicator" data-indicator="${option.id}"
            class="${state.selectedIndicator === option.id ? "selected" : ""}"
            aria-pressed="${state.selectedIndicator === option.id}">
            ${option.label}
          </button>`).join("")}
      </div>`;
  }

  function SupportResistanceLegend(result) {
    return `
      <div class="ta-zone-legend" aria-label="支撑与压力图例">
        ${result.zones.map(zone => `
          <span class="${zone.type}">
            <i></i>${escapeHtml(zone.label)} ${formatNumber(zone.lower)}—${formatNumber(zone.upper)}
          </span>`).join("")}
        <span class="signal"><i></i>有效信号点</span>
      </div>`;
  }

  function CandlestickWorkspace(result, state) {
    const selected = result.diagnoses.find(item => item.id === state.selectedDiagnosisId) || result.diagnoses[0];
    return `
      <section class="ta-chart-panel" aria-labelledby="chart-title">
        <header class="ta-chart-head">
          <div>
            <h2 id="chart-title">${state.query.period === "day" ? "日线" : "周线"}价格结构</h2>
            <p>当前聚焦：${escapeHtml(selected.title)} · ${escapeHtml(selected.status)}</p>
          </div>
          ${IndicatorSelector(state)}
        </header>
        <div id="technical-candlestick-chart" class="ta-chart" role="img"
          aria-label="${escapeHtml(result.overview.name)}K线、均线、支撑压力和${indicatorOptions.find(item => item.id === state.selectedIndicator)?.label || "成交量"}图表"></div>
        ${SupportResistanceLegend(result)}
      </section>`;
  }

  function TechnicalAnalysisPanel(result) {
    const summary = result.summary;
    const scoreTone = summary.score > 20 ? "positive" : summary.score < -20 ? "negative" : "neutral";
    return `
      <aside class="ta-analysis-panel" aria-labelledby="analysis-title">
        <header>
          <span>综合技术状态</span>
          <h2 id="analysis-title">${escapeHtml(summary.status)}</h2>
          <p>基于当前周期内可验证信号的条件式判断</p>
        </header>
        <div class="ta-score-row">
          <div><span>方向分</span><strong class="${scoreTone}">${summary.score > 0 ? "+" : ""}${summary.score}</strong><small>-100 至 +100</small></div>
          <div><span>可信度</span><strong>${summary.confidence}%</strong><small>证据一致性</small></div>
        </div>
        <div class="ta-score-scale" aria-label="方向分 ${summary.score}">
          <span style="left:${Math.max(0, Math.min(100, (summary.score + 100) / 2))}%"></span>
        </div>
        <p class="ta-core-conclusion">${escapeHtml(summary.conclusion)}</p>
        <section class="ta-analysis-block support">
          <h3>支持证据</h3>
          <ul>${summary.supportEvidence.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
        <section class="ta-analysis-block conflict">
          <h3>矛盾信号</h3>
          <ul>${summary.conflicts.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
        <dl class="ta-key-zones">
          <div><dt>最近支撑</dt><dd>${escapeHtml(summary.supportZone)}</dd></div>
          <div><dt>最近压力</dt><dd>${escapeHtml(summary.resistanceZone)}</dd></div>
        </dl>
        <section class="ta-analysis-block invalidation">
          <h3>判断失效条件</h3>
          <p>${escapeHtml(summary.invalidation)}</p>
        </section>
        <section class="ta-analysis-block watch">
          <h3>后续观察</h3>
          <ul>${summary.watchConditions.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </section>
        <footer>数据截至 ${formatDateTime(summary.updatedAt)} · 结论仅供研究参考</footer>
      </aside>`;
  }

  function SignalEvidenceTable(result, state) {
    return `
      <section class="ta-section ta-evidence-section" aria-labelledby="evidence-title">
        <div class="ta-section-heading">
          <div><h2 id="evidence-title">技术信号证据</h2><p>点击行查看完整计算依据和阈值说明</p></div>
          <span class="ta-section-note">${result.signals.filter(item => item.active).length} 条信号仍然有效</span>
        </div>
        <div class="ta-evidence-table" role="table" aria-label="技术信号证据列表">
          <div class="ta-evidence-header" role="row">
            <span role="columnheader">日期</span>
            <span role="columnheader">信号名称</span>
            <span role="columnheader">类型</span>
            <span role="columnheader">结论</span>
            <span role="columnheader">计算证据</span>
            <span role="columnheader">强度</span>
            <span role="columnheader">有效性</span>
            <span role="columnheader">关联指标</span>
          </div>
          ${result.signals.map(signal => {
            const expanded = state.expandedSignalId === signal.id;
            return `
              <div class="ta-evidence-record ${expanded ? "expanded" : ""}" role="row">
                <button type="button" class="ta-evidence-row" data-action="toggle-technical-signal" data-signal-id="${signal.id}" aria-expanded="${expanded}">
                  <time>${signal.date.slice(5)}</time>
                  <strong>${escapeHtml(signal.name)}</strong>
                  <span><i class="ta-signal-type type-${signal.type}">${signalTypeLabels[signal.type]}</i></span>
                  <span>${escapeHtml(signal.conclusion)}</span>
                  <span class="ta-evidence-summary">${escapeHtml(signal.evidence)}</span>
                  <span class="ta-signal-strength">${signal.strength}</span>
                  <span class="ta-validity ${signal.active ? "active" : "inactive"}">${signal.active ? "有效" : "失效"}</span>
                  <span class="ta-indicator-list">${signal.indicators.map(item => `<i>${escapeHtml(item)}</i>`).join("")}</span>
                </button>
                ${expanded ? `
                  <div class="ta-evidence-detail">
                    <span>完整依据</span>
                    <p>${escapeHtml(signal.detail)}</p>
                  </div>` : ""}
              </div>`;
          }).join("")}
        </div>
      </section>`;
  }

  function LoadingState(context, state) {
    return `
      <section class="ta-loading" aria-live="polite" aria-busy="true">
        <div class="ta-loading-head">
          <button type="button" class="ta-back" data-action="return-stock-view" aria-label="返回个股跟踪">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          ${StockSearchBar(context, state)}
        </div>
        <div class="ta-skeleton overview"></div>
        <div class="ta-skeleton-grid">${new Array(8).fill('<div class="ta-skeleton card"></div>').join("")}</div>
        <div class="ta-skeleton workspace"></div>
        <span>正在读取当前股票的技术状态…</span>
      </section>`;
  }

  function EmptyState(stock, context, state) {
    return `
      <section class="ta-empty-state">
        <header>
          <button type="button" class="ta-back" data-action="return-stock-view" aria-label="返回个股跟踪">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          ${StockSearchBar(context, state)}
        </header>
        <div class="ta-empty-content">
          <span>${escapeHtml(stock.name || "当前股票")} · ${escapeHtml(stock.code || "")}</span>
          <h2>暂时没有模拟技术数据</h2>
          <p>第一阶段仅为浩通科技、宁德时代和中际旭创准备完整演示。该空状态将由后续 AKShare 或 Tushare Provider 返回的真实数据替换。</p>
          <div>
            ${context.trackedCodes.has(stock.code) ? "" : `<button type="button" class="ta-secondary-button" data-action="add-watchlist" data-stock-id="${stock.id}">加入自选</button>`}
            <button type="button" class="ta-primary-button" data-action="select-stock" data-stock-id="301026">查看浩通科技演示</button>
            <button type="button" class="ta-secondary-button" data-action="return-stock-view">返回个股跟踪</button>
          </div>
        </div>
      </section>`;
  }

  function ErrorState(state, context) {
    return `
      <section class="ta-empty-state ta-error-state">
        <header>${StockSearchBar(context, state)}</header>
        <div class="ta-empty-content">
          <span>技术数据读取失败</span>
          <h2>当前诊断暂时无法生成</h2>
          <p>${escapeHtml(state.error || "请稍后重试。")}</p>
          <button type="button" class="ta-primary-button" data-action="refresh-technical">重新读取</button>
        </div>
      </section>`;
  }

  class TechnicalAnalysisPage {
    constructor(provider, onChange) {
      this.provider = provider;
      this.onChange = onChange;
      this.currentStockCode = "";
      this.chartElement = null;
      this.resizeObserver = typeof ResizeObserver === "function"
        ? new ResizeObserver(entries => {
          if (entries.some(entry => entry.target === this.chartElement)) {
            global.requestAnimationFrame(() => global.StockTechnicalChart?.resize(this.chartElement));
          }
        })
        : null;
      this.state = {
        status: "idle",
        result: null,
        error: "",
        selectedDiagnosisId: "trend",
        selectedIndicator: "volume",
        expandedSignalId: null,
        searchQuery: "",
        query: {
          period: "day",
          range: "6m",
          horizon: "swing",
          adjustment: "forward"
        }
      };
    }

    async load(stockCode, options = {}) {
      if (!stockCode) return;
      if (!options.forceRefresh && this.currentStockCode === stockCode && ["loading", "ready", "empty"].includes(this.state.status)) return;
      this.currentStockCode = stockCode;
      this.state.status = "loading";
      this.state.error = "";
      this.state.result = null;
      this.onChange();
      try {
        const result = await this.provider.getTechnicalAnalysis(stockCode, this.state.query, options);
        if (this.currentStockCode !== stockCode) return;
        this.state.result = result;
        this.state.status = result ? "ready" : "empty";
        this.state.selectedDiagnosisId = "trend";
        this.state.selectedIndicator = "volume";
        this.state.expandedSignalId = null;
      } catch (error) {
        if (this.currentStockCode !== stockCode) return;
        this.state.status = "error";
        this.state.error = error?.message || "未知错误";
      }
      this.onChange();
    }

    render(stock, context) {
      if (this.state.status === "idle" || (this.currentStockCode && this.currentStockCode !== stock.code)) {
        return LoadingState(context, this.state);
      }
      if (this.state.status === "loading") return LoadingState(context, this.state);
      if (this.state.status === "error") return ErrorState(this.state, context);
      if (this.state.status === "empty" || !this.state.result) return EmptyState(stock, context, this.state);
      const result = this.state.result;
      result.overview.inWatchlist = Boolean(context.trackedCodes.has(result.overview.code));
      return `
        <div class="technical-analysis-page">
          ${StockOverviewHeader(result, context, this.state)}
          ${TechnicalDiagnosisGrid(result, this.state)}
          <section class="ta-workspace">
            ${CandlestickWorkspace(result, this.state)}
            ${TechnicalAnalysisPanel(result)}
          </section>
          ${SignalEvidenceTable(result, this.state)}
        </div>`;
    }

    mount(root, stock) {
      if (!stock?.code) return;
      if (this.currentStockCode !== stock.code || this.state.status === "idle") {
        this.load(stock.code);
        return;
      }
      const nextChartElement = root.querySelector("#technical-candlestick-chart");
      if (!nextChartElement || !this.state.result) return;
      if (this.chartElement && this.chartElement !== nextChartElement) {
        this.resizeObserver?.unobserve(this.chartElement);
        global.StockTechnicalChart?.dispose(this.chartElement);
      }
      this.chartElement = nextChartElement;
      this.resizeObserver?.observe(nextChartElement);
      global.StockTechnicalChart?.render(nextChartElement, this.state.result, {
        query: this.state.query,
        indicator: this.state.selectedIndicator,
        diagnosisId: this.state.selectedDiagnosisId
      });
    }

    handleAction(target) {
      const action = target.dataset.action;
      if (action === "select-diagnosis") {
        this.state.selectedDiagnosisId = target.dataset.diagnosisId;
        this.state.selectedIndicator = diagnosisIndicator[this.state.selectedDiagnosisId] || "volume";
        return true;
      }
      if (action === "set-technical-indicator") {
        this.state.selectedIndicator = target.dataset.indicator;
        return true;
      }
      if (action === "set-technical-period") {
        this.state.query.period = target.dataset.value;
        return true;
      }
      if (action === "set-technical-range") {
        this.state.query.range = target.dataset.value;
        return true;
      }
      if (action === "set-technical-horizon") {
        this.state.query.horizon = target.dataset.value;
        return true;
      }
      if (action === "toggle-technical-signal") {
        const signalId = target.dataset.signalId;
        this.state.expandedSignalId = this.state.expandedSignalId === signalId ? null : signalId;
        return true;
      }
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
