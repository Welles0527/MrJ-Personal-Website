"use strict";

(function initializeStandaloneStockTracking() {
  const data = window.STOCK_TRACKING_MOCK_DATA;
  const accountStorage = window.StockTrackingAccountStorage;
  const importanceRank = { "高": 3, "中": 2, "低": 1 };
  const evidenceDescriptions = {
    "事实": "公司公告、财报、监管文件或其他可核验的权威材料",
    "推断": "依据公开数据形成的研究判断",
    "传闻": "尚未经公司或权威来源确认"
  };
  const stockGroups = [
    { id: "all", title: "全部动态", icon: "all", categories: null, size: "primary" },
    { id: "health", title: "持仓结论", icon: "flag", categories: ["health"], size: "primary" },
    { id: "industry", title: "行业大事件", icon: "globe", categories: ["macro"], size: "secondary" },
    { id: "company", title: "公司动态", icon: "building", categories: ["company", "risk", "valuation", "capital", "other"], size: "secondary" },
    { id: "technical", title: "技术分析", icon: "chart", categories: ["technical"], size: "secondary" }
  ];
  const iconPaths = {
    all: "<path d='M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'/>",
    globe: "<circle cx='12' cy='12' r='8.5'/><path d='M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5S14.4 18.2 12 20.5C9.6 18.2 8.4 15.4 8.4 12S9.6 5.8 12 3.5z'/>",
    building: "<path d='M4 20V8l7-4v16M11 9h9v11M2.5 20h19M7 10h.01M7 14h.01M7 17h.01M15 12h1.5M15 16h1.5'/>",
    chart: "<rect x='3.5' y='4' width='17' height='16' rx='2'/><path d='M7 15l3-3 2.5 2 4.5-5M16.5 9H19v2.5'/>",
    flag: "<path d='M6 21V4M6 5h10l2 3-2 3H6'/>",
    pulse: "<path d='M3 12h4l2-5 4 10 2-5h6'/>",
    news: "<path d='M5 4h12a2 2 0 012 2v14H7a2 2 0 01-2-2zM8 8h8M8 12h8M8 16h5'/>",
    edit: "<path d='M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4'/>",
    search: "<circle cx='10.5' cy='10.5' r='6.5'/><path d='M15.5 15.5L21 21'/>",
    refresh: "<path d='M20 7v5h-5M4 17v-5h5M18.5 9A7 7 0 006 7l-2 5M5.5 15A7 7 0 0018 17l2-5'/>"
  };

  const requestedCategory = new URLSearchParams(window.location.search).get("category");
  const legacyGroupMap = {
    macro: "industry",
    risk: "company",
    valuation: "company",
    capital: "company",
    other: "company"
  };
  const requestedGroup = stockGroups.some(group => group.id === requestedCategory)
    ? requestedCategory
    : legacyGroupMap[requestedCategory] || "all";
  const state = {
    selectedStockId: data?.stocks?.[0]?.id || "",
    viewMode: "stock",
    activeGroup: requestedGroup,
    expandedMessageId: null,
    query: "",
    readOverrides: new Set(),
    thesisExpanded: false,
    editField: null,
    costDraft: "",
    thesisDraft: "",
    saveError: "",
    filters: { risk: "all", evidence: "all", read: "all" },
    universe: [],
    universeMeta: null,
    refreshing: false,
    refreshNotice: "",
    lastRefreshAt: data?.updatedAt || new Date().toISOString()
  };

  let root;

  function mount() {
    root = document.getElementById("app");
    if (!root || !data || !accountStorage) return;
    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    window.addEventListener("storage", handleExternalStorageChange);
    window.addEventListener("site-auth-change", handleExternalStorageChange);
    render();
    loadStockUniverse();
  }

  function handleExternalStorageChange() {
    state.editField = null;
    state.saveError = "";
    render();
  }

  function selectedStock() {
    const tracked = data.stocks.find(stock => stock.id === state.selectedStockId);
    if (tracked) return { ...tracked, tracked: true };
    const basic = state.universe.find(stock => stock.code === state.selectedStockId);
    if (!basic) return { ...data.stocks[0], tracked: true };
    return {
      id: basic.code,
      name: basic.name,
      code: basic.code,
      market: basic.market,
      tracked: false,
      price: null,
      change: null,
      changePct: null,
      buyDate: "",
      holdingDays: null,
      cost: 0,
      positionPct: 0,
      returnPct: null,
      thesis: "尚未填写买入理由，可点击编辑后按当前登录账号保存。",
      messages: []
    };
  }

  function allStocks() {
    const trackedCodes = new Set(data.stocks.map(stock => stock.code));
    return [
      ...data.stocks.map(stock => ({ ...stock, tracked: true })),
      ...state.universe
        .filter(stock => !trackedCodes.has(stock.code))
        .map(stock => ({ ...stock, id: stock.code, tracked: false, messages: [] }))
    ];
  }

  function activeGroup() {
    return stockGroups.find(group => group.id === state.activeGroup) || stockGroups[0];
  }

  function categoryName(categoryId, messageId = "") {
    if (messageId.startsWith("market-macro-")) return "宏观大事件";
    const names = {
      macro: "行业大事件",
      company: "公司动态",
      risk: "公司动态",
      valuation: "公司动态",
      capital: "公司动态",
      other: "公司动态",
      technical: "技术分析",
      health: "持仓结论"
    };
    return names[categoryId] || "其他信息";
  }

  function isUnread(message) {
    return Boolean(message.unread) && !state.readOverrides.has(message.id);
  }

  function groupIncludes(group, message) {
    return !group.categories || group.categories.includes(message.category);
  }

  function messagesForGroup(stock, group = activeGroup()) {
    return (stock.messages || []).filter(message => groupIncludes(group, message));
  }

  function unreadCount(stock, group = null) {
    const messages = group ? messagesForGroup(stock, group) : stock.messages;
    return messages.filter(isUnread).length;
  }

  function riskLabel(importance) {
    return `${importance}风险`;
  }

  function messageMatchesFilters(message) {
    if (state.filters.risk !== "all" && message.importance !== state.filters.risk) return false;
    if (state.filters.evidence !== "all" && message.evidence !== state.filters.evidence) return false;
    if (state.filters.read === "unread" && !isUnread(message)) return false;
    if (state.filters.read === "read" && isUnread(message)) return false;
    return true;
  }

  function filteredStockMessages(stock) {
    return messagesForGroup(stock).filter(messageMatchesFilters).sort(sortByNewest);
  }

  function filteredMacroNews() {
    return data.market.macroNews.filter(messageMatchesFilters).sort(sortByNewest);
  }

  function sortByNewest(left, right) {
    return new Date(right.publishedAt) - new Date(left.publishedAt);
  }

  function formatNumber(value, digits = 2) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return "—";
    return Number(value).toLocaleString("zh-CN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function formatSigned(value, suffix = "") {
    const number = Number(value);
    if (value === null || value === undefined || !Number.isFinite(number)) return "—";
    return `${number > 0 ? "+" : ""}${formatNumber(number)}${suffix}`;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    const parts = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function icon(name) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.news}</svg>`;
  }

  function positionValues(stock) {
    const saved = accountStorage.load(stock.id);
    const cost = Number(saved.cost);
    return {
      cost: Number.isFinite(cost) && cost > 0 ? cost : stock.cost,
      thesis: typeof saved.thesis === "string" && saved.thesis.trim() ? saved.thesis.trim() : stock.thesis
    };
  }

  async function loadStockUniverse(bustCache = false) {
    try {
      const suffix = bustCache ? `?refresh=${Date.now()}` : "";
      const response = await fetch(`./stock-universe.json${suffix}`, {
        cache: bustCache ? "no-store" : "default"
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.stocks) || payload.stocks.length < 5000) {
        throw new Error("股票库数据不完整");
      }
      state.universe = payload.stocks;
      state.universeMeta = payload;
      if (bustCache) {
        state.lastRefreshAt = new Date().toISOString();
        state.refreshNotice = `已刷新 ${payload.count.toLocaleString("zh-CN")} 只股票及当前页面信息`;
      }
    } catch (error) {
      state.refreshNotice = `刷新失败：${error.message}`;
    } finally {
      state.refreshing = false;
      render();
    }
  }

  function refreshAllInformation() {
    if (state.refreshing) return;
    state.refreshing = true;
    state.refreshNotice = "正在刷新股票库与全部页面信息…";
    render();
    loadStockUniverse(true);
  }

  function render() {
    const stock = selectedStock();
    root.innerHTML = `
      <div class="tracking-layout">
        ${renderSidebar(stock)}
        <main class="tracking-main">
          ${state.viewMode === "stock" ? renderStockView(stock) : ""}
          ${state.viewMode === "macro" ? renderMacroView() : ""}
          ${state.viewMode === "market" ? renderMarketTechnicalView() : ""}
        </main>
      </div>`;
  }

  function renderStockView(stock) {
    return `
      ${renderPositionHeader(stock)}
      ${renderBoards(stock)}
      ${renderMessageHeader("stock")}
      ${renderFilters()}
      ${renderTimeline(filteredStockMessages(stock))}`;
  }

  function renderSidebar(stock) {
    const query = state.query.trim().toLowerCase();
    const searchResults = query
      ? allStocks().filter(item => `${item.name} ${item.code}`.toLowerCase().includes(query))
      : data.stocks.map(item => ({ ...item, tracked: true }));
    const stocks = searchResults.slice(0, 60);
    const universeCount = state.universeMeta?.count || state.universe.length;
    return `
      <aside class="watchlist" aria-label="自选股持仓">
        <div class="watchlist-top">
          <div class="watchlist-heading">
            <h1>自选股持仓</h1>
            <button class="refresh-all ${state.refreshing ? "refreshing" : ""}" type="button" data-action="refresh-all"
              ${state.refreshing ? "disabled" : ""} aria-label="刷新全部信息">
              ${icon("refresh")}<span>${state.refreshing ? "刷新中" : "刷新全部"}</span>
            </button>
          </div>
          <nav class="market-tools" aria-label="全市场看板">
            ${renderMarketTool("macro", "news", "宏观大事件", "5 则市场要闻")}
            ${renderMarketTool("market", "pulse", "大盘技术走势", "指数与技术指标")}
          </nav>
          <label class="stock-search">
            ${icon("search")}
            <input id="stock-search" type="search" value="${escapeHtml(state.query)}" placeholder="搜索股票名称 / 代码" autocomplete="off">
          </label>
        </div>
        <div class="watchlist-label">${query ? `全量股票 · ${universeCount.toLocaleString("zh-CN")} 只` : `持仓股票 · ${data.stocks.length} 只`}</div>
        <div class="watchlist-items">
          ${stocks.length ? stocks.map(item => renderStockItem(item, stock)).join("") : `
            <div class="watchlist-empty"><strong>${state.universe.length ? "未找到匹配股票" : "股票库正在载入"}</strong><span>${state.universe.length ? "请输入股票名称或代码" : "请稍候"}</span></div>`}
          ${searchResults.length > stocks.length ? `<div class="search-result-note">显示前 ${stocks.length} 条，共 ${searchResults.length} 条匹配</div>` : ""}
        </div>
        ${state.refreshNotice ? `<div class="refresh-notice" aria-live="polite">${escapeHtml(state.refreshNotice)}</div>` : ""}
        <div class="last-updated">
          ${icon("refresh")}
          <span>最后更新 ${formatDateTime(state.lastRefreshAt)}</span>
        </div>
      </aside>`;
  }

  function renderMarketTool(view, iconName, title, description) {
    const active = state.viewMode === view;
    return `
      <button class="market-tool ${active ? "selected" : ""}" type="button" data-action="select-view" data-view="${view}" aria-pressed="${active}">
        <span class="market-tool-icon">${icon(iconName)}</span>
        <span><strong>${title}</strong><small>${description}</small></span>
        <span class="market-tool-arrow">›</span>
      </button>`;
  }

  function renderStockItem(stock, selected) {
    const active = state.viewMode === "stock" && stock.id === selected.id;
    const unread = unreadCount(stock);
    const hasQuote = Number.isFinite(Number(stock.changePct)) && stock.changePct !== null;
    return `
      <button class="watchlist-item ${active ? "selected" : ""}" type="button" data-action="select-stock" data-stock-id="${stock.id}" aria-pressed="${active}">
        <span class="stock-identity"><strong>${escapeHtml(stock.name)}</strong><small>${stock.code}</small></span>
        <span class="stock-change ${hasQuote ? (stock.changePct >= 0 ? "positive" : "negative") : "unavailable"}">${hasQuote ? formatSigned(stock.changePct, "%") : escapeHtml(stock.market || "暂无行情")}</span>
        <span class="stock-unread ${unread ? "" : "zero"}">${unread}</span>
      </button>`;
  }

  function renderPositionHeader(stock) {
    const hasQuote = Number.isFinite(Number(stock.price)) && stock.price !== null;
    const direction = hasQuote && stock.changePct >= 0 ? "positive" : "negative";
    const position = positionValues(stock);
    const returnPct = hasQuote && position.cost > 0 ? ((stock.price - position.cost) / position.cost) * 100 : null;
    const account = accountStorage.getAccount();
    return `
      <header class="position-header">
        <div class="quote-block">
          <div class="quote-title">
            <h2>${escapeHtml(stock.name)}</h2>
            <span>${stock.code}</span>
            <span class="market-badge ${stock.tracked ? "" : "static-data"}"><i></i>${stock.tracked ? "交易中" : stock.market || "静态股票库"}</span>
          </div>
          <div class="quote-price ${direction}">
            <strong>${formatNumber(stock.price)}</strong>
            ${hasQuote ? `<span>${formatSigned(stock.change)}</span><span>${formatSigned(stock.changePct, "%")}</span>` : `<span class="quote-unavailable">暂无行情数据</span>`}
          </div>
          <div class="position-return">持仓收益 <strong class="${returnPct === null ? "" : returnPct >= 0 ? "positive" : "negative"}">${returnPct === null ? "—" : formatSigned(returnPct, "%")}</strong></div>
        </div>
        <dl class="position-metrics">
          ${renderEditableCost(position.cost)}
          <div><dt>买入日期</dt><dd>${stock.buyDate || "—"}</dd></div>
          <div><dt>持仓天数</dt><dd>${stock.holdingDays === null ? "—" : `${stock.holdingDays} 天`}</dd></div>
          <div><dt>持仓占比</dt><dd>${formatNumber(stock.positionPct, 1)}%</dd></div>
          ${renderEditableThesis(position.thesis)}
          <div class="account-save-state">
            <span class="${account.signedIn ? "signed-in" : ""}"></span>
            ${account.signedIn ? "已按登录账号保存" : "未登录 · 当前浏览器访客空间"}
          </div>
        </dl>
      </header>`;
  }

  function renderEditableCost(cost) {
    if (state.editField === "cost") {
      return `
        <div class="editable-metric editing">
          <dt>持仓成本</dt>
          <dd><input id="cost-editor" type="number" min="0.01" step="0.01" value="${escapeHtml(state.costDraft)}" aria-label="持仓成本"></dd>
          <span class="edit-actions">
            <button type="button" data-action="save-cost">保存</button>
            <button type="button" data-action="cancel-edit">取消</button>
          </span>
          ${state.saveError ? `<small class="edit-error">${escapeHtml(state.saveError)}</small>` : ""}
        </div>`;
    }
    return `
      <div class="editable-metric">
        <dt>持仓成本</dt>
        <dd>${cost > 0 ? formatNumber(cost) : "未设置"}</dd>
        <button class="edit-button" type="button" data-action="edit-position" data-field="cost" aria-label="编辑持仓成本">${icon("edit")}</button>
      </div>`;
  }

  function renderEditableThesis(thesis) {
    if (state.editField === "thesis") {
      return `
        <div class="buy-reason editing">
          <dt>买入理由</dt>
          <dd><textarea id="thesis-editor" rows="2" aria-label="买入理由">${escapeHtml(state.thesisDraft)}</textarea></dd>
          <span class="edit-actions">
            <button type="button" data-action="save-thesis">保存</button>
            <button type="button" data-action="cancel-edit">取消</button>
          </span>
          ${state.saveError ? `<small class="edit-error">${escapeHtml(state.saveError)}</small>` : ""}
        </div>`;
    }
    return `
      <div class="buy-reason ${state.thesisExpanded ? "expanded" : ""}">
        <dt>买入理由</dt>
        <dd>${escapeHtml(thesis)}</dd>
        <span class="reason-actions">
          <button class="edit-button" type="button" data-action="edit-position" data-field="thesis" aria-label="编辑买入理由">${icon("edit")}</button>
          <button type="button" data-action="toggle-thesis" aria-expanded="${state.thesisExpanded}">${state.thesisExpanded ? "收起" : "展开"}</button>
        </span>
      </div>`;
  }

  function renderBoards(stock) {
    return `
      <section class="board-grid" aria-label="信息分类看板">
        ${stockGroups.map(group => renderBoard(stock, group)).join("")}
      </section>`;
  }

  function renderBoard(stock, group) {
    const messages = messagesForGroup(stock, group).sort(sortByNewest);
    const unread = messages.filter(isUnread).length;
    const latest = messages[0];
    const highest = messages.reduce((value, message) => Math.max(value, importanceRank[message.importance] || 0), 0);
    const risk = Object.keys(importanceRank).find(key => importanceRank[key] === highest);
    const selected = state.activeGroup === group.id;
    const status = latest?.summary || "暂无更新";
    return `
      <button class="info-board board-${group.size} ${selected ? "selected" : ""}" type="button" data-action="select-group" data-group="${group.id}" aria-pressed="${selected}">
        <span class="board-line">
          <span class="board-icon">${icon(group.icon)}</span>
          <strong>${group.title}</strong>
          <span class="board-unread ${unread ? "" : "zero"}">${unread}</span>
        </span>
        <span class="board-status">${escapeHtml(status)}</span>
        <span class="board-meta">
          <time>${latest ? formatDateTime(latest.publishedAt) : "暂无时间"}</time>
          ${risk ? `<b class="risk-text risk-${risk}">${riskLabel(risk)}</b>` : ""}
        </span>
      </button>`;
  }

  function renderMessageHeader(mode) {
    const group = activeGroup();
    const messages = mode === "macro" ? data.market.macroNews : messagesForGroup(selectedStock());
    const unread = messages.filter(isUnread).length;
    const title = mode === "macro" ? "宏观大事件" : group.title;
    return `
      <header class="message-header">
        <div>
          <strong>${title}</strong>
          <span>· 最新消息与提示</span>
          ${mode === "stock" && group.id !== "all" ? `<button type="button" data-action="show-all">查看全部动态</button>` : ""}
        </div>
        <button class="mark-read" type="button" data-action="mark-read" ${unread ? "" : "disabled"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16.5 9"/></svg>
          ${unread ? `全部标记已读（${unread}）` : "全部已读"}
        </button>
      </header>`;
  }

  function renderFilters() {
    return `
      <section class="message-filters" aria-label="消息筛选">
        ${renderFilterGroup("风险等级", "risk", [
          ["all", "全部风险"],
          ["高", "高风险"],
          ["中", "中风险"],
          ["低", "低风险"]
        ])}
        ${renderFilterGroup("信息属性", "evidence", [
          ["all", "全部属性"],
          ["事实", "事实"],
          ["推断", "推断"],
          ["传闻", "传闻"]
        ])}
        ${renderFilterGroup("阅读状态", "read", [
          ["all", "全部状态"],
          ["unread", "未读"],
          ["read", "已读"]
        ])}
        ${filtersActive() ? `<button class="clear-filters" type="button" data-action="clear-filters">清除筛选</button>` : ""}
      </section>`;
  }

  function renderFilterGroup(label, key, options) {
    return `
      <div class="filter-group">
        <span>${label}</span>
        <div class="filter-options">
          ${options.map(([value, text]) => `
            <button type="button" class="${state.filters[key] === value ? "selected" : ""}"
              data-action="set-filter" data-filter-key="${key}" data-filter-value="${value}"
              aria-pressed="${state.filters[key] === value}">${text}</button>`).join("")}
        </div>
      </div>`;
  }

  function filtersActive() {
    return Object.values(state.filters).some(value => value !== "all");
  }

  function renderTimeline(messages) {
    return `
      <section class="message-timeline" aria-label="最新消息时间流">
        ${messages.length ? messages.map(renderMessage).join("") : `
          <div class="timeline-empty"><strong>没有符合条件的信息</strong><span>请调整上方筛选项后再查看</span></div>`}
      </section>`;
  }

  function renderMessage(message) {
    const expanded = state.expandedMessageId === message.id;
    const unread = isUnread(message);
    return `
      <article class="message-row ${expanded ? "expanded" : ""} ${unread ? "unread" : "read"}">
        <time datetime="${message.publishedAt}">${formatDateTime(message.publishedAt)}</time>
        <span class="timeline-track" aria-hidden="true"></span>
        <div class="message-body">
          <button class="message-toggle" type="button" data-action="toggle-message" data-message-id="${message.id}" aria-expanded="${expanded}">
            <span class="message-heading">
              <strong>${escapeHtml(message.title)}</strong>
              <span class="message-badges">
                <span class="message-tag evidence-${message.evidence}">${message.evidence}</span>
                <span class="message-tag risk-badge risk-${message.importance}">${riskLabel(message.importance)}</span>
                <span class="message-tag sentiment-${message.sentiment}">${message.sentiment}</span>
                <span class="message-tag read-badge ${unread ? "is-unread" : ""}"><i></i>${unread ? "未读" : "已读"}</span>
              </span>
            </span>
            <span class="message-summary">${escapeHtml(message.summary)}</span>
          </button>
          <div class="message-meta">
            <span>${categoryName(message.category, message.id)}</span>
            <span>信息来源：${escapeHtml(message.source)}</span>
            <a href="${escapeHtml(message.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看来源
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M17 13v6H5V7h6"/></svg>
            </a>
          </div>
          ${expanded ? `
            <div class="message-detail">
              <p>${escapeHtml(message.detail)}</p>
              <span><b>证据说明</b>${evidenceDescriptions[message.evidence]}</span>
            </div>` : ""}
        </div>
      </article>`;
  }

  function renderMacroView() {
    return `
      <section class="global-view">
        <header class="global-header">
          <div class="global-title-icon">${icon("news")}</div>
          <div>
            <p>全市场视角 · 与个股无关</p>
            <h2>宏观大事件</h2>
            <span>收录对 A 股整体市场影响较大的 5 则新闻</span>
          </div>
          <div class="demo-source">演示数据 · 来源待确认</div>
        </header>
        ${renderMessageHeader("macro")}
        ${renderFilters()}
        ${renderTimeline(filteredMacroNews())}
      </section>`;
  }

  function renderMarketTechnicalView() {
    const market = data.market.technical;
    const direction = market.changePct >= 0 ? "positive" : "negative";
    return `
      <section class="global-view technical-view">
        <header class="global-header market-index-header">
          <div class="global-title-icon">${icon("pulse")}</div>
          <div>
            <p>全市场视角 · 与个股无关</p>
            <h2>大盘技术走势</h2>
            <span>${market.indexName} ${market.code} · ${formatDateTime(market.updatedAt)}</span>
          </div>
          <div class="market-index-quote ${direction}">
            <strong>${formatNumber(market.price)}</strong>
            <span>${formatSigned(market.change)}　${formatSigned(market.changePct, "%")}</span>
          </div>
        </header>
        <div class="technical-conclusion">
          <span>当前结论</span>
          <strong>${escapeHtml(market.conclusion)}</strong>
        </div>
        <section class="market-chart-panel" aria-label="上证指数近期走势">
          <div class="panel-heading"><strong>近期走势</strong><span>模拟收盘点位 · 最近 12 个交易日</span></div>
          ${renderMarketChart(market.points, market.labels)}
        </section>
        <section class="indicator-grid" aria-label="大盘技术指标">
          ${market.indicators.map(indicator => `
            <article class="indicator-card">
              <span>${escapeHtml(indicator.name)}</span>
              <strong class="indicator-${indicator.level}">${escapeHtml(indicator.value)}</strong>
              <small>${escapeHtml(indicator.note)}</small>
            </article>`).join("")}
        </section>
      </section>`;
  }

  function renderMarketChart(points, labels) {
    const width = 960;
    const height = 214;
    const paddingX = 26;
    const paddingY = 22;
    const min = Math.min(...points) - 8;
    const max = Math.max(...points) + 8;
    const xStep = (width - paddingX * 2) / (points.length - 1);
    const yFor = value => paddingY + ((max - value) / (max - min)) * (height - paddingY * 2);
    const coordinates = points.map((point, index) => `${paddingX + index * xStep},${yFor(point)}`).join(" ");
    const area = `${paddingX},${height - paddingY} ${coordinates} ${width - paddingX},${height - paddingY}`;
    const labelIndexes = [0, 3, 6, 9, points.length - 1];
    return `
      <div class="market-chart">
        <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="指数近十二个交易日震荡上行">
          <defs>
            <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#58bf79" stop-opacity=".24"/>
              <stop offset="100%" stop-color="#58bf79" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path class="chart-grid" d="M26 46H934M26 107H934M26 168H934"/>
          <polygon points="${area}" fill="url(#chartArea)" stroke="none"/>
          <polyline class="chart-line" points="${coordinates}"/>
          ${points.map((point, index) => `<circle class="chart-point" cx="${paddingX + index * xStep}" cy="${yFor(point)}" r="3"/>`).join("")}
          ${labelIndexes.map(index => `<text x="${paddingX + index * xStep}" y="207" text-anchor="${index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}">${labels[index]}</text>`).join("")}
        </svg>
      </div>`;
  }

  function resetForNavigation() {
    state.expandedMessageId = null;
    state.editField = null;
    state.saveError = "";
    state.filters = { risk: "all", evidence: "all", read: "all" };
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "select-view") {
      state.viewMode = target.dataset.view;
      resetForNavigation();
    } else if (action === "select-stock") {
      state.selectedStockId = target.dataset.stockId;
      state.viewMode = "stock";
      state.activeGroup = "all";
      state.thesisExpanded = false;
      resetForNavigation();
    } else if (action === "select-group") {
      state.activeGroup = target.dataset.group;
      state.expandedMessageId = null;
    } else if (action === "show-all") {
      state.activeGroup = "all";
      state.expandedMessageId = null;
    } else if (action === "toggle-message") {
      const messageId = target.dataset.messageId;
      state.readOverrides.add(messageId);
      state.expandedMessageId = state.expandedMessageId === messageId ? null : messageId;
    } else if (action === "mark-read") {
      const messages = state.viewMode === "macro" ? filteredMacroNews() : filteredStockMessages(selectedStock());
      messages.forEach(message => state.readOverrides.add(message.id));
    } else if (action === "toggle-thesis") {
      state.thesisExpanded = !state.thesisExpanded;
    } else if (action === "edit-position") {
      const position = positionValues(selectedStock());
      state.editField = target.dataset.field;
      state.costDraft = formatNumber(position.cost);
      state.thesisDraft = position.thesis;
      state.saveError = "";
    } else if (action === "cancel-edit") {
      state.editField = null;
      state.saveError = "";
    } else if (action === "save-cost") {
      saveCost();
    } else if (action === "save-thesis") {
      saveThesis();
    } else if (action === "clear-filters") {
      state.filters = { risk: "all", evidence: "all", read: "all" };
      state.expandedMessageId = null;
    } else if (action === "set-filter") {
      state.filters[target.dataset.filterKey] = target.dataset.filterValue;
      state.expandedMessageId = null;
    } else if (action === "refresh-all") {
      refreshAllInformation();
      return;
    }
    render();
    focusEditorIfNeeded();
  }

  function saveCost() {
    const value = Number(state.costDraft);
    if (!Number.isFinite(value) || value <= 0) {
      state.saveError = "请输入大于 0 的持仓成本";
      return;
    }
    accountStorage.save(selectedStock().id, { cost: Number(value.toFixed(2)) });
    state.editField = null;
    state.saveError = "";
  }

  function saveThesis() {
    const value = state.thesisDraft.trim();
    if (!value) {
      state.saveError = "买入理由不能为空";
      return;
    }
    accountStorage.save(selectedStock().id, { thesis: value });
    state.editField = null;
    state.saveError = "";
  }

  function focusEditorIfNeeded() {
    if (state.editField === "cost") document.getElementById("cost-editor")?.focus();
    if (state.editField === "thesis") document.getElementById("thesis-editor")?.focus();
  }

  function handleInput(event) {
    if (event.target.id === "cost-editor") {
      state.costDraft = event.target.value;
      return;
    }
    if (event.target.id === "thesis-editor") {
      state.thesisDraft = event.target.value;
      return;
    }
    if (event.target.id !== "stock-search") return;
    const cursor = event.target.selectionStart;
    state.query = event.target.value;
    render();
    const input = document.getElementById("stock-search");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  }

  document.addEventListener("DOMContentLoaded", mount);
})();
