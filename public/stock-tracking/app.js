"use strict";

(function initializeStandaloneStockTracking() {
  const data = window.STOCK_TRACKING_MOCK_DATA;
  const accountStorage = window.StockTrackingAccountStorage;
  const messageTaxonomy = window.StockTrackingMessageTaxonomy;
  if (!messageTaxonomy) throw new Error("消息分类模块未加载");
  const MESSAGE_CATEGORY = messageTaxonomy.categories;
  const seedStocks = (data?.stocks || []).map(stock => ({
    ...stock,
    messages: (stock.messages || []).map(normalizeMessage)
  }));
  const seedStockCodes = seedStocks.map(stock => stock.code);
  const stockCache = new Map(seedStocks.map(stock => [stock.code, stock]));
  const liveDataProvider = window.StockTrackingLiveData
    ? new window.StockTrackingLiveData.EastmoneyStockLiveDataProvider()
    : null;
  const REFRESH_INTERVALS = {
    quote: 15 * 1000,
    announcements: 2 * 60 * 1000,
    news: 5 * 60 * 1000,
    events: 5 * 60 * 1000
  };
  const technicalProvider = window.StockTechnicalAnalysis
    ? new window.StockTechnicalAnalysis.MockTechnicalAnalysisProvider()
    : null;
  const stockGroups = [
    { id: "all", title: "全部动态", icon: "all", categories: [MESSAGE_CATEGORY.INDUSTRY, MESSAGE_CATEGORY.COMPANY], size: "primary" },
    { id: "industry", title: "行业大事件", icon: "globe", categories: [MESSAGE_CATEGORY.INDUSTRY], size: "secondary" },
    { id: "company", title: "公司动态", icon: "building", categories: [MESSAGE_CATEGORY.COMPANY], size: "secondary" },
    { id: "technical", title: "技术分析", icon: "chart", categories: [MESSAGE_CATEGORY.TECHNICAL], size: "secondary" },
    { id: "health", title: "持仓结论", icon: "flag", categories: [MESSAGE_CATEGORY.HEALTH], size: "primary" }
  ];
  const iconPaths = {
    all: "<path d='M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'/>",
    globe: "<circle cx='12' cy='12' r='8.5'/><path d='M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5S14.4 18.2 12 20.5C9.6 18.2 8.4 15.4 8.4 12S9.6 5.8 12 3.5z'/>",
    building: "<path d='M4 20V8l7-4v16M11 9h9v11M2.5 20h19M7 10h.01M7 14h.01M7 17h.01M15 12h1.5M15 16h1.5'/>",
    chart: "<rect x='3.5' y='4' width='17' height='16' rx='2'/><path d='M7 15l3-3 2.5 2 4.5-5M16.5 9H19v2.5'/>",
    flag: "<path d='M6 21V4M6 5h10l2 3-2 3H6'/>",
    pulse: "<path d='M3 12h4l2-5 4 10 2-5h6'/>",
    news: "<path d='M5 4h12a2 2 0 012 2v14H7a2 2 0 01-2-2zM8 8h8M8 12h8M8 16h5'/>",
    digest: "<path d='M6 3.5h12v17H6zM9 8h6M9 12h6M9 16h3'/><path d='M4 7h2M4 12h2M4 17h2'/>",
    edit: "<path d='M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4'/>",
    search: "<circle cx='10.5' cy='10.5' r='6.5'/><path d='M15.5 15.5L21 21'/>",
    refresh: "<path d='M20 7v5h-5M4 17v-5h5M18.5 9A7 7 0 006 7l-2 5M5.5 15A7 7 0 0018 17l2-5'/>",
    plus: "<path d='M12 5v14M5 12h14'/>",
    remove: "<path d='M6 6l12 12M18 6L6 18'/>",
    user: "<circle cx='12' cy='8' r='3.5'/><path d='M5 20c.6-4 3-6 7-6s6.4 2 7 6'/>",
    logout: "<path d='M10 5H5v14h5M14 8l4 4-4 4M18 12H9'/>"
  };

  const initialParams = new URLSearchParams(window.location.search);
  const requestedCategory = initialParams.get("category");
  const requestedView = initialParams.get("view");
  const requestedStockId = initialParams.get("stock");
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
    selectedStockId: requestedStockId || data?.stocks?.[0]?.id || "",
    viewMode: ["technical", "daily"].includes(requestedView) ? requestedView : "stock",
    activeGroup: requestedGroup,
    query: "",
    readOverridesByScope: new Map(),
    editField: null,
    costDraft: "",
    thesisDraft: "",
    saveError: "",
    filters: { sentiment: "all", date: "all" },
    universe: [],
    universeMeta: null,
    refreshing: false,
    refreshNotice: "",
    marketUpdatedAt: null,
    dynamicsCheckedByCode: new Map(),
    announcementsCheckedByCode: new Map(),
    newsCheckedByCode: new Map(),
    eventsCheckedByCode: new Map(),
    pendingRefreshOptions: null,
    searchComposing: false,
    technicalSearchComposing: false,
    authMode: null,
    authEmail: "",
    authPassword: "",
    authCode: "",
    authBusy: false,
    authMessage: ""
  };

  let root;
  let technicalPage;
  let completeEmailSignUp;
  let accountSyncPromise = null;
  const refreshTimers = [];

  function mount() {
    root = document.getElementById("app");
    if (!root || !data || !accountStorage) return;
    restoreWatchlist();
    if (technicalProvider && window.StockTechnicalAnalysisPage) {
      technicalPage = window.StockTechnicalAnalysisPage.create(technicalProvider, render);
    }
    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.addEventListener("submit", handleSubmit);
    root.addEventListener("compositionstart", handleCompositionStart);
    root.addEventListener("compositionend", handleCompositionEnd);
    window.addEventListener("storage", handleExternalStorageChange);
    window.addEventListener("site-auth-change", handleExternalStorageChange);
    window.addEventListener("stock-auth-ready", handleAuthReady);
    window.addEventListener("stock-preference-cloud-ready", syncAccountPreferences);
    window.addEventListener("stock-preferences-cloud-change", handleCloudPreferencesChange);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);
    render();
    void syncAccountPreferences();
    loadStockUniverse();
    refreshAllInformation({
      silent: true,
      force: true,
      feedCodes: state.viewMode === "daily" ? data.stocks.map(stock => stock.code) : undefined
    });
    startAutomaticRefresh();
  }

  function handleExternalStorageChange(event) {
    state.editField = null;
    state.saveError = "";
    state.readOverridesByScope.clear();
    restoreWatchlist();
    render();
    if (event?.type === "site-auth-change") void syncAccountPreferences();
  }

  function handleAuthReady() {
    state.authMessage = "";
    render();
    void syncAccountPreferences();
  }

  function handleCloudPreferencesChange() {
    state.editField = null;
    state.saveError = "";
    state.readOverridesByScope.clear();
    restoreWatchlist();
    render();
  }

  function syncAccountPreferences() {
    if (accountSyncPromise || typeof accountStorage.sync !== "function") return accountSyncPromise;
    accountSyncPromise = accountStorage.sync(seedStockCodes)
      .then(() => {
        state.readOverridesByScope.clear();
        restoreWatchlist();
        render();
      })
      .finally(() => {
        accountSyncPromise = null;
      });
    return accountSyncPromise;
  }

  function shanghaiMarketClock() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return {
      weekday: values.weekday,
      minuteOfDay: Number(values.hour) * 60 + Number(values.minute)
    };
  }

  function isMarketPollingWindow() {
    const clock = shanghaiMarketClock();
    if (["Sat", "Sun"].includes(clock.weekday)) return false;
    return (
      (clock.minuteOfDay >= 9 * 60 + 15 && clock.minuteOfDay <= 11 * 60 + 30)
      || (clock.minuteOfDay >= 13 * 60 && clock.minuteOfDay <= 15 * 60 + 5)
    );
  }

  function runAutomaticRefresh(sections) {
    if (document.visibilityState !== "visible" || !liveDataProvider) return;
    const feedSections = sections.filter(section => section !== "quote");
    const options = {
      silent: true,
      quoteCodes: sections.includes("quote") ? [selectedStock().code] : [],
      feedSections,
      feedCodes: feedSections.length
        ? state.viewMode === "daily" ? data.stocks.map(stock => stock.code) : [selectedStock().code]
        : []
    };
    refreshAllInformation(options);
  }

  function startAutomaticRefresh() {
    refreshTimers.forEach(timer => window.clearInterval(timer));
    refreshTimers.length = 0;
    refreshTimers.push(window.setInterval(() => {
      if (isMarketPollingWindow()) runAutomaticRefresh(["quote"]);
    }, REFRESH_INTERVALS.quote));
    refreshTimers.push(window.setInterval(
      () => runAutomaticRefresh(["announcements"]),
      REFRESH_INTERVALS.announcements
    ));
    refreshTimers.push(window.setInterval(
      () => runAutomaticRefresh(["news", "events"]),
      REFRESH_INTERVALS.news
    ));
  }

  function handleVisibilityRefresh() {
    if (document.visibilityState !== "visible") return;
    const feedCodes = state.viewMode === "daily"
      ? data.stocks.map(stock => stock.code)
      : [selectedStock().code];
    refreshAllInformation({
      silent: true,
      force: true,
      quoteCodes: [selectedStock().code],
      feedCodes,
      feedSections: ["announcements", "news", "events"]
    });
  }

  function createBasicStockRecord(basic) {
    const code = String(basic?.code || "").padStart(6, "0");
    const cached = stockCache.get(code);
    if (cached) {
      if ((!cached.name || cached.name === code) && basic?.name) cached.name = basic.name;
      if (!cached.market && basic?.market) cached.market = basic.market;
      if (!cached.initials && basic?.initials) cached.initials = basic.initials;
      return cached;
    }
    const record = {
      id: code,
      name: basic?.name || code,
      code,
      market: basic?.market || "",
      initials: basic?.initials || "",
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
    stockCache.set(code, record);
    return record;
  }

  function stockRecord(stockId) {
    const code = String(stockId || "").padStart(6, "0");
    return stockCache.get(code)
      || createBasicStockRecord(state.universe.find(stock => stock.code === code) || { code });
  }

  function restoreWatchlist() {
    state.readOverridesByScope.clear();
    const codes = accountStorage.loadWatchlist(seedStockCodes);
    data.stocks = codes.map(stockRecord);
  }

  function persistWatchlist() {
    accountStorage.saveWatchlist(data.stocks.map(stock => stock.code));
  }

  function selectedStock() {
    const tracked = data.stocks.find(stock => stock.id === state.selectedStockId);
    if (tracked) return { ...tracked, tracked: true };
    const cached = stockCache.get(state.selectedStockId);
    if (cached) return { ...cached, tracked: false };
    const basic = state.universe.find(stock => stock.code === state.selectedStockId);
    if (basic) return { ...createBasicStockRecord(basic), tracked: false };
    const fallback = seedStocks[0] || createBasicStockRecord({ code: state.selectedStockId || "301026" });
    return { ...fallback, tracked: data.stocks.some(stock => stock.code === fallback.code) };
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
    if (!query) return true;
    const fields = [
      normalizeSearchText(stock.name),
      normalizeSearchText(stock.code),
      normalizeSearchText(stock.initials)
    ].filter(Boolean);
    return fields.some(field => field.includes(query) || isFuzzySubsequence(query, field));
  }

  function activeGroup() {
    return stockGroups.find(group => group.id === state.activeGroup) || stockGroups[0];
  }

  function readStorageScope(stockId = "") {
    if (stockId) return String(stockId);
    if (state.viewMode === "macro") return "market-macro";
    return String(selectedStock().id || "unknown");
  }

  function messageScopeId(message) {
    return readStorageScope(message?.trackingStockId || "");
  }

  function messageIsUnread(message) {
    return isUnread(message, messageScopeId(message));
  }

  function readOverridesFor(scopeId = readStorageScope()) {
    if (!state.readOverridesByScope.has(scopeId)) {
      const saved = accountStorage.load(scopeId);
      const values = Array.isArray(saved.readOverrides)
        ? saved.readOverrides.map(value => String(value || "")).filter(Boolean)
        : [];
      state.readOverridesByScope.set(scopeId, new Set(values));
    }
    return state.readOverridesByScope.get(scopeId);
  }

  function persistReadOverrides(scopeId, overrides) {
    accountStorage.save(scopeId, {
      readOverrides: [...overrides].slice(-1000)
    });
  }

  function isUnread(message, scopeId = readStorageScope()) {
    return Boolean(message.unread) !== readOverridesFor(scopeId).has(message.id);
  }

  function groupIncludes(group, message) {
    return !group.categories || messageTaxonomy.groupIncludes(group.categories, message.category);
  }

  function messagesForGroup(stock, group = activeGroup()) {
    return (stock.messages || []).filter(message => groupIncludes(group, message));
  }

  function unreadCount(stock, group = null) {
    const messages = group ? messagesForGroup(stock, group) : stock.messages;
    const scopeId = readStorageScope(stock.id);
    return messages.filter(message => isUnread(message, scopeId)).length;
  }

  function normalizeSentiment(sentiment) {
    return sentiment === "利多" ? "利好" : sentiment;
  }

  function normalizeMessage(message) {
    if (!messageTaxonomy.isKnownCategory(message.category)) {
      console.warn(`[StockTracking] 未知消息分类“${message.category || "空值"}”，已归入公司动态。`);
    }
    return {
      ...message,
      category: messageTaxonomy.normalizeCategory(message.category),
      sentiment: normalizeSentiment(message.sentiment)
    };
  }

  function sentimentLabel(sentiment) {
    return normalizeSentiment(sentiment);
  }

  function messageMatchesFilters(message) {
    if (state.filters.sentiment !== "all" && message.sentiment !== state.filters.sentiment) return false;
    if (!messageMatchesDateFilter(message, state.filters.date)) return false;
    return true;
  }

  function shanghaiDateParts(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const year = Number(values.year);
    const month = Number(values.month);
    const day = Number(values.day);
    const ordinal = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
    return {
      year,
      month,
      day,
      ordinal,
      weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    };
  }

  function messageMatchesDateFilter(message, dateFilter) {
    if (!dateFilter || dateFilter === "all") return true;
    const messageDate = shanghaiDateParts(message.publishedAt);
    const today = shanghaiDateParts();
    if (!messageDate || !today) return false;
    if (dateFilter === "today") return messageDate.ordinal === today.ordinal;
    if (dateFilter === "week") {
      const mondayOffset = (today.weekday + 6) % 7;
      const weekStart = today.ordinal - mondayOffset;
      return messageDate.ordinal >= weekStart && messageDate.ordinal <= weekStart + 6;
    }
    if (dateFilter === "month") {
      return messageDate.year === today.year && messageDate.month === today.month;
    }
    return true;
  }

  function filteredStockMessages(stock) {
    return messagesForGroup(stock).filter(messageMatchesFilters).sort(sortByNewest);
  }

  function filteredMacroNews() {
    return data.market.macroNews.filter(messageMatchesFilters).sort(sortByNewest);
  }

  function dailyDigestMessages(applySentimentFilter = true) {
    const allDynamicsGroup = stockGroups.find(group => group.id === "all") || stockGroups[0];
    return data.stocks
      .flatMap(stock => messagesForGroup(stock, allDynamicsGroup)
        .filter(message => messageMatchesDateFilter(message, "today"))
        .map(message => ({
          ...message,
          trackingStockId: stock.id,
          trackingStockCode: stock.code,
          trackingStockName: stock.name
        })))
      .filter(message => !applySentimentFilter
        || state.filters.sentiment === "all"
        || message.sentiment === state.filters.sentiment)
      .sort(sortByNewest);
  }

  function dailyDigestCounts() {
    return dailyDigestMessages(false).reduce((counts, message) => {
      if (Object.hasOwn(counts, message.sentiment)) counts[message.sentiment] += 1;
      return counts;
    }, { "利好": 0, "利空": 0, "中性": 0 });
  }

  function dailyDigestCheckState() {
    const checkedTimes = data.stocks
      .map(stock => state.dynamicsCheckedByCode.get(stock.code))
      .filter(Boolean)
      .sort((left, right) => new Date(right) - new Date(left));
    return {
      checkedCount: checkedTimes.length,
      latestAt: checkedTimes[0] || null
    };
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

  function formatMessageTime(value) {
    return formatDateTime(value).slice(5);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function specificSourceUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.href);
      if (!["http:", "https:"].includes(url.protocol)) return "";
      const path = url.pathname.replace(/\/+$/, "") || "/";
      const current = new URL(window.location.href);
      if (url.origin === current.origin && path === (current.pathname.replace(/\/+$/, "") || "/")) return "";
      const genericPaths = new Set([
        "/",
        "/officialwebsite",
        "/stock-tracking",
        "/news",
        "/notices",
        "/stockcalendar",
        "/dzjy"
      ]);
      const normalizedPath = path.toLowerCase();
      if (genericPaths.has(normalizedPath)) return "";
      if (/^\/(?:stockcalendar|bbsj)\/\d{6}\.html$/.test(normalizedPath)) return "";
      if (/^\/dzjy\/detail\/\d{6}\.html$/.test(normalizedPath)) return "";
      const pathParts = normalizedPath.split("/").filter(Boolean);
      if (pathParts.length === 1 && !/\.(?:s?html?|pdf)$/.test(pathParts[0]) && !/\d{6,}/.test(pathParts[0])) {
        return "";
      }
      return url.href;
    } catch {
      return "";
    }
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
      const suffix = bustCache ? `?v=20260729v2&refresh=${Date.now()}` : "?v=20260729v2";
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
      data.stocks.forEach(stock => createBasicStockRecord(
        state.universe.find(item => item.code === stock.code) || stock
      ));
    } catch (error) {
      state.refreshNotice = `股票库载入失败：${error.message}`;
    }
    render();
  }

  function applyLiveQuote(quote) {
    const record = stockRecord(quote.code);
    Object.assign(record, {
      name: quote.name || record.name,
      price: quote.price,
      change: quote.change,
      changePct: quote.changePct,
      quoteUpdatedAt: quote.updatedAt,
      quoteSource: quote.source,
      turnoverRate: quote.turnoverRate,
      amount: quote.amount,
      totalMarketValue: quote.totalMarketValue,
      circulatingMarketValue: quote.circulatingMarketValue,
      quoteKind: quote.quoteKind || "realtime"
    });
    if (
      quote.updatedAt
      && (!state.marketUpdatedAt || new Date(quote.updatedAt) > new Date(state.marketUpdatedAt))
    ) {
      state.marketUpdatedAt = quote.updatedAt;
    }
  }

  function applyLatestInformation(stockCode, information, sections) {
    const record = stockRecord(stockCode);
    const existingById = new Map((record.messages || []).map(message => [message.id, message]));
    const retainedMessages = (record.messages || []).filter(message =>
      ["technical", "health"].includes(message.category)
    );
    const existingAnnouncements = (record.messages || []).filter(message =>
      message.live && String(message.id).startsWith("live-announcement-")
    );
    const existingNews = (record.messages || []).filter(message =>
      message.live && String(message.id).startsWith("live-news-")
    );
    const existingEvents = (record.messages || []).filter(message =>
      message.live && String(message.id).startsWith("live-event-")
    );
    const preserveReadState = messages => messages.map(message => ({
      ...normalizeMessage(message),
      unread: existingById.has(message.id) ? existingById.get(message.id).unread : true
    }));
    const announcements = sections.includes("announcements")
      ? preserveReadState(information.announcements || [])
      : existingAnnouncements;
    const news = sections.includes("news")
      ? preserveReadState(information.news || [])
      : existingNews;
    const events = sections.includes("events")
      ? preserveReadState(information.events || [])
      : existingEvents;
    const latestMessages = [...announcements, ...news, ...events];
    record.messages = [...retainedMessages, ...latestMessages].sort(sortByNewest);
    record.dynamicLatestAt = latestMessages.sort(sortByNewest)[0]?.publishedAt || null;
    record.liveMessagesLoaded = true;
    const checkedAt = information.checkedAt || new Date().toISOString();
    if (sections.includes("announcements")) state.announcementsCheckedByCode.set(stockCode, checkedAt);
    if (sections.includes("news")) state.newsCheckedByCode.set(stockCode, checkedAt);
    if (sections.includes("events")) state.eventsCheckedByCode.set(stockCode, checkedAt);
    state.dynamicsCheckedByCode.set(stockCode, checkedAt);
  }

  async function refreshAllInformation(options = {}) {
    if (!liveDataProvider) return;
    if (state.refreshing) {
      if (!state.pendingRefreshOptions || options.force) {
        state.pendingRefreshOptions = {
          ...options,
          silent: true,
          quoteCodes: options.quoteCodes || [selectedStock().code],
          feedCodes: options.feedCodes || [selectedStock().code]
        };
      }
      return;
    }
    const selected = selectedStock();
    const quoteCodes = options.quoteCodes || [
      ...new Set([...data.stocks.map(stock => stock.code), selected.code])
    ];
    const feedSections = Array.isArray(options.feedSections)
      ? options.feedSections.filter(section => ["announcements", "news", "events"].includes(section))
      : ["announcements", "news", "events"];
    const feedCodes = Array.isArray(options.feedCodes)
      ? [...new Set(options.feedCodes.map(code => String(code).padStart(6, "0")))]
      : [selected.code];
    const feedStocks = feedCodes.map(code => stockRecord(code));
    state.refreshing = true;
    if (!options.silent) {
      const feedLabel = feedStocks.length > 1 ? `${feedStocks.length} 只自选股` : selected.name;
      state.refreshNotice = `正在刷新 ${quoteCodes.length} 只股票的实时行情与 ${feedLabel} 最新公告、新闻、公司事件…`;
      render();
    }

    const quoteRequests = quoteCodes.map(code =>
      liveDataProvider.getRealtimeQuote(code, { force: options.force }).then(quote => {
        applyLiveQuote(quote);
        return quote;
      })
    );
    const informationRequests = feedSections.length
      ? feedStocks.map(stock => liveDataProvider
        .getLatestInformation(stock.code, {
          sections: feedSections,
          force: options.force,
          name: stock.name
        })
        .then(information => {
          applyLatestInformation(stock.code, information, feedSections);
          return information;
        }))
      : [];
    const [quoteResults, informationResults] = await Promise.all([
      Promise.allSettled(quoteRequests),
      Promise.allSettled(informationRequests)
    ]);

    const quoteSuccesses = quoteResults.filter(result => result.status === "fulfilled").length;
    const informationSuccesses = informationResults.filter(result => result.status === "fulfilled").length;
    const informationSucceeded = !feedSections.length || informationSuccesses > 0;
    const informationErrors = informationResults
      .filter(result => result.status === "fulfilled")
      .flatMap(result => Object.values(result.value?.errors || {}));
    const errors = [
      ...quoteResults.filter(result => result.status === "rejected").map(result => result.reason?.message),
      ...informationResults.filter(result => result.status === "rejected").map(result => result.reason?.message),
      ...informationErrors
    ].filter(Boolean);

    state.refreshing = false;
    if (quoteSuccesses || informationSucceeded) {
      const marketTime = state.marketUpdatedAt ? `行情 ${formatDateTime(state.marketUpdatedAt)}` : "行情暂未更新";
      if (feedStocks.length > 1) {
        state.refreshNotice = `${marketTime} · 已检查 ${informationSuccesses}/${feedStocks.length} 只自选股动态`;
      } else {
        const announcementTime = state.announcementsCheckedByCode.get(selected.code);
        const newsTime = state.newsCheckedByCode.get(selected.code);
        const eventTime = state.eventsCheckedByCode.get(selected.code);
        state.refreshNotice = `${marketTime} · 公告 ${announcementTime ? formatDateTime(announcementTime) : "待检查"} · 新闻 ${newsTime ? formatDateTime(newsTime) : "待检查"} · 事项 ${eventTime ? formatDateTime(eventTime) : "待检查"}`;
      }
      if (errors.length) state.refreshNotice += ` · ${errors.length} 项未成功`;
    } else {
      state.refreshNotice = `刷新失败：${errors[0] || "公开数据源暂不可用"}`;
    }
    render();
    const pendingOptions = state.pendingRefreshOptions;
    state.pendingRefreshOptions = null;
    if (pendingOptions) refreshAllInformation(pendingOptions);
  }

  function render() {
    const stock = selectedStock();
    document.title = state.viewMode === "technical"
      ? `${stock.name}技术分析 - A股个股跟踪`
      : state.viewMode === "daily"
        ? "今日必读 - A股个股跟踪"
        : "A股个股跟踪";
    root.innerHTML = `
      <div class="tracking-layout">
        ${renderSidebar(stock)}
        <main class="tracking-main ${state.viewMode === "technical" ? "technical-main" : ""}">
          ${state.viewMode === "stock" ? renderStockView(stock) : ""}
          ${state.viewMode === "daily" ? renderDailyDigestView() : ""}
          ${state.viewMode === "macro" ? renderMacroView() : ""}
          ${state.viewMode === "market" ? renderMarketTechnicalView() : ""}
          ${state.viewMode === "technical" ? renderTechnicalView(stock) : ""}
        </main>
      </div>
      ${renderAuthModal()}`;
    syncUrl();
    if (state.viewMode === "technical") technicalPage?.mount(root, stock);
  }

  function renderStockView(stock) {
    return `
      ${renderPositionHeader(stock)}
      ${renderBoards(stock)}
      ${renderMessageHeader("stock")}
      ${renderFilters()}
      ${renderMessageResults(filteredStockMessages(stock))}`;
  }

  function renderTechnicalView(stock) {
    if (!technicalPage) {
      return `<section class="ta-empty-state"><div class="ta-empty-content"><h2>技术分析模块未能加载</h2><p>请刷新页面后重试。</p></div></section>`;
    }
    return technicalPage.render(stock, {
      allStocks: allStocks(),
      trackedCodes: new Set(data.stocks.map(item => item.code))
    });
  }

  function renderDailyDigestView() {
    const account = accountStorage.getAccount();
    const counts = dailyDigestCounts();
    const checkState = dailyDigestCheckState();
    const messages = dailyDigestMessages();
    return `
      <section class="global-view daily-digest-view">
        <header class="global-header daily-digest-header">
          <div class="global-title-icon">${icon("digest")}</div>
          <div>
            <p>${account.signedIn ? "登录账号自选股" : "当前浏览器自选股"} · 上海时间今日</p>
            <h2>今日必读</h2>
            <span>汇总 ${data.stocks.length} 只自选股当天发布的公告、新闻与公司事件</span>
          </div>
          <div class="daily-digest-summary" aria-label="今日消息汇总">
            <span class="positive"><b>${counts["利好"]}</b>利好</span>
            <span class="negative"><b>${counts["利空"]}</b>利空</span>
            <span class="neutral"><b>${counts["中性"]}</b>中性</span>
            <small>已检查 ${checkState.checkedCount}/${data.stocks.length}${checkState.latestAt ? ` · ${formatDateTime(checkState.latestAt)}` : ""}</small>
          </div>
        </header>
        ${renderMessageHeader("daily")}
        ${renderDailyDigestFilters()}
        ${renderMessageResults(messages)}
      </section>`;
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    if (["technical", "daily"].includes(state.viewMode)) {
      url.searchParams.set("view", state.viewMode);
      url.searchParams.set("stock", state.selectedStockId);
      url.searchParams.delete("category");
    } else {
      url.searchParams.delete("view");
      url.searchParams.set("stock", state.selectedStockId);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function renderSidebar(stock) {
    const query = state.query.trim();
    const searchResults = query
      ? allStocks().filter(item => stockMatchesSearch(item, query))
      : data.stocks.map(item => ({ ...item, tracked: true }));
    const stocks = searchResults.slice(0, 60);
    const universeCount = state.universeMeta?.count || state.universe.length;
    return `
      <aside class="watchlist" aria-label="自选股持仓">
        <div class="watchlist-top">
          <div class="watchlist-heading">
            <h1>自选股持仓</h1>
            <button class="refresh-all ${state.refreshing ? "refreshing" : ""}" type="button" data-action="refresh-all"
              ${state.refreshing ? "disabled" : ""} aria-label="刷新实时行情与最新新闻" title="立即刷新实时行情、公告与新闻">
              ${icon("refresh")}<span>${state.refreshing ? "刷新中" : "刷新"}</span>
            </button>
          </div>
          ${renderSharedAccount()}
          <nav class="market-tools" aria-label="全市场看板">
            ${renderMarketTool("daily", "digest", "今日必读", `${data.stocks.length} 只自选 · 今日 ${dailyDigestMessages(false).length} 条`)}
            ${renderMarketTool("macro", "news", "宏观大事件", "5 则市场要闻")}
            ${renderMarketTool("market", "pulse", "大盘技术走势", "指数与技术指标")}
          </nav>
          <label class="stock-search">
            ${icon("search")}
            <input id="stock-search" type="search" value="${escapeHtml(state.query)}" placeholder="名称 / 代码 / 拼音首字母" autocomplete="off">
          </label>
        </div>
        <div class="watchlist-label">${query ? `搜索股票 · 全量 ${universeCount.toLocaleString("zh-CN")} 只` : `我的自选 · ${data.stocks.length} 只`}</div>
        <div class="watchlist-items">
          ${stocks.length ? stocks.map(item => renderStockItem(item, stock)).join("") : `
            <div class="watchlist-empty"><strong>${state.universe.length ? "未找到匹配股票" : "股票库正在载入"}</strong><span>${state.universe.length ? "请输入股票名称或代码" : "请稍候"}</span></div>`}
          ${searchResults.length > stocks.length ? `<div class="search-result-note">显示前 ${stocks.length} 条，共 ${searchResults.length} 条匹配</div>` : ""}
        </div>
        ${state.refreshNotice ? `<div class="refresh-notice" aria-live="polite">${escapeHtml(state.refreshNotice)}</div>` : ""}
        <div class="last-updated" aria-label="数据更新时间">
          ${icon("refresh")}
          <span>
            <b>行情 ${state.marketUpdatedAt ? formatDateTime(state.marketUpdatedAt) : "等待同步"} · 盘中15秒</b>
            <small>公告 ${state.announcementsCheckedByCode.get(stock.code) ? formatDateTime(state.announcementsCheckedByCode.get(stock.code)) : "等待"} · 新闻 ${state.newsCheckedByCode.get(stock.code) ? formatDateTime(state.newsCheckedByCode.get(stock.code)) : "等待"}</small>
          </span>
        </div>
      </aside>`;
  }

  function renderSharedAccount() {
    const account = accountStorage.getAccount();
    const sync = accountStorage.getSyncStatus?.() || { mode: "local" };
    const syncCopy = !account.signedIn
      ? "与 magicj.cn 使用同一登录"
      : sync.mode === "cloud"
        ? "自选股与已读状态已同步云端"
        : sync.mode === "error"
          ? "云同步暂不可用 · 已保留本机"
          : "正在同步云端账号";
    return `
      <section class="shared-account ${account.signedIn ? "signed-in" : ""}" aria-label="共享登录账号">
        <span class="shared-account-icon">${icon("user")}</span>
        <span class="shared-account-copy">
          <strong>${account.signedIn ? escapeHtml(account.label) : "官网共享账号"}</strong>
          <small>${syncCopy}</small>
        </span>
        <button type="button" data-action="${account.signedIn ? "auth-signout" : "open-auth"}"
          ${state.authBusy ? "disabled" : ""}>
          ${account.signedIn ? icon("logout") : ""}${account.signedIn ? "退出" : "登录"}
        </button>
      </section>`;
  }

  function renderAuthModal() {
    if (!state.authMode) return "";
    const authReady = Boolean(window.StockTrackingSharedAuth);
    const isVerify = state.authMode === "verify";
    const isSignUp = state.authMode === "signup";
    const title = isVerify ? "验证邮箱" : isSignUp ? "创建共享账号" : "登录共享账号";
    const description = isVerify
      ? `验证码已发送至 ${escapeHtml(state.authEmail)}`
      : "与 J先生AI学习网站使用同一套账号和登录状态";
    return `
      <div class="auth-modal-backdrop" role="presentation">
        <section class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title"
          data-auth-dialog>
          <button class="auth-modal-close" type="button" data-action="close-auth" aria-label="关闭登录窗口">${icon("remove")}</button>
          <div class="auth-modal-heading">
            <span>${icon("user")}</span>
            <div>
              <p>MAGICJ ACCOUNT</p>
              <h2 id="auth-modal-title">${title}</h2>
              <small>${description}</small>
            </div>
          </div>
          ${!authReady ? `
            <div class="auth-service-note">
              <strong>本地预览暂不连接账号服务</strong>
              <span>发布后的正式页面会直接启用官网登录。也可先在官网完成登录。</span>
              <a href="https://www.magicj.cn/officialwebsite/topics/space/planning/todo" target="_blank" rel="noopener noreferrer">前往官网登录</a>
            </div>` : ""}
          <form class="auth-form" data-auth-form="${state.authMode}">
            ${isVerify ? `
              <label>
                <span>邮箱验证码</span>
                <input id="auth-code" type="text" inputmode="numeric" autocomplete="one-time-code"
                  value="${escapeHtml(state.authCode)}" placeholder="输入邮件中的验证码" required>
              </label>` : `
              <label>
                <span>邮箱</span>
                <input id="auth-email" type="email" autocomplete="username"
                  value="${escapeHtml(state.authEmail)}" placeholder="name@example.com" required>
              </label>
              <label>
                <span>密码</span>
                <input id="auth-password" type="password" autocomplete="${isSignUp ? "new-password" : "current-password"}"
                  value="${escapeHtml(state.authPassword)}" placeholder="${isSignUp ? "至少 8 位" : "输入密码"}"
                  ${isSignUp ? 'minlength="8"' : ""} required>
              </label>`}
            ${state.authMessage ? `<p class="auth-form-message" role="status">${escapeHtml(state.authMessage)}</p>` : ""}
            <button class="auth-submit" type="submit" ${state.authBusy || !authReady ? "disabled" : ""}>
              ${state.authBusy ? "处理中…" : isVerify ? "完成验证并登录" : isSignUp ? "发送邮箱验证码" : "登录"}
            </button>
          </form>
          <div class="auth-modal-switch">
            ${isVerify
              ? `<button type="button" data-action="switch-auth" data-auth-mode="signup">返回修改邮箱</button>`
              : `<span>${isSignUp ? "已有账号？" : "还没有账号？"}</span>
                 <button type="button" data-action="switch-auth" data-auth-mode="${isSignUp ? "login" : "signup"}">${isSignUp ? "直接登录" : "创建账号"}</button>`}
          </div>
          <p class="auth-session-note">登录状态默认保留 3 天；账号与 officialwebsite 完全共享。</p>
        </section>
      </div>`;
  }

  function renderMarketTool(view, iconName, title, description) {
    const active = state.viewMode === view;
    return `
      <button class="market-tool market-tool-${view} ${active ? "selected" : ""}" type="button" data-action="select-view" data-view="${view}" aria-pressed="${active}">
        <span class="market-tool-icon">${icon(iconName)}</span>
        <span><strong>${title}</strong><small>${description}</small></span>
        <span class="market-tool-arrow">›</span>
      </button>`;
  }

  function renderStockItem(stock, selected) {
    const active = ["stock", "technical"].includes(state.viewMode) && stock.id === selected.id;
    const unread = unreadCount(stock);
    const hasQuote = Number.isFinite(Number(stock.changePct)) && stock.changePct !== null;
    const manageAction = stock.tracked ? "remove-watchlist" : "add-watchlist";
    const manageLabel = stock.tracked ? `从自选股删除${stock.name}` : `将${stock.name}加入自选股`;
    return `
      <div class="watchlist-item ${active ? "selected" : ""}">
        <button class="watchlist-select" type="button" data-action="select-stock" data-stock-id="${stock.id}" aria-pressed="${active}">
          <span class="stock-identity"><strong>${escapeHtml(stock.name)}</strong><small>${stock.code}</small></span>
          <span class="stock-change ${hasQuote ? (stock.changePct >= 0 ? "positive" : "negative") : "unavailable"}">${hasQuote ? formatSigned(stock.changePct, "%") : escapeHtml(stock.market || "暂无行情")}</span>
          <span class="stock-unread ${unread ? "" : "zero"}">${unread}</span>
        </button>
        <button class="watchlist-manage ${stock.tracked ? "remove" : "add"}" type="button"
          data-action="${manageAction}" data-stock-id="${stock.id}" aria-label="${escapeHtml(manageLabel)}" title="${escapeHtml(manageLabel)}">
          ${icon(stock.tracked ? "remove" : "plus")}
        </button>
      </div>`;
  }

  function renderPositionHeader(stock) {
    const hasQuote = Number.isFinite(Number(stock.price)) && stock.price !== null;
    const direction = hasQuote && stock.changePct >= 0 ? "positive" : "negative";
    const position = positionValues(stock);
    const returnPct = hasQuote && position.cost > 0 ? ((stock.price - position.cost) / position.cost) * 100 : null;
    const account = accountStorage.getAccount();
    const sync = accountStorage.getSyncStatus?.() || { mode: "local" };
    const saveState = !account.signedIn
      ? "未登录 · 当前浏览器访客空间"
      : sync.mode === "cloud"
        ? "已同步至登录账号云端"
        : sync.mode === "error"
          ? "云同步失败 · 已保留本机"
          : "正在同步登录账号";
    return `
      <header class="position-header">
        <div class="quote-block">
          <div class="quote-title">
            <h2>${escapeHtml(stock.name)}</h2>
            <span>${stock.code}</span>
            <span class="market-badge ${stock.tracked ? "" : "static-data"}"><i></i>${stock.tracked ? "已加入自选" : "未加入自选"}</span>
            <button class="header-watchlist-action ${stock.tracked ? "remove" : "add"}" type="button"
              data-action="${stock.tracked ? "remove-watchlist" : "add-watchlist"}" data-stock-id="${stock.id}">
              ${icon(stock.tracked ? "remove" : "plus")}<span>${stock.tracked ? "移除" : "加入自选"}</span>
            </button>
          </div>
          <div class="quote-price ${direction}">
            <strong>${formatNumber(stock.price)}</strong>
            ${hasQuote ? `<span>${formatSigned(stock.change)}</span><span>${formatSigned(stock.changePct, "%")}</span>` : `<span class="quote-unavailable">暂无行情数据</span>`}
          </div>
          <div class="position-return">
            持仓收益 <strong class="${returnPct === null ? "" : returnPct >= 0 ? "positive" : "negative"}">${returnPct === null ? "—" : formatSigned(returnPct, "%")}</strong>
          <span class="quote-updated-at">${stock.quoteKind === "realtime" ? "实时行情" : stock.quoteKind === "delayed" ? "延迟行情" : "收盘行情"} ${stock.quoteUpdatedAt ? formatDateTime(stock.quoteUpdatedAt) : "等待刷新"}</span>
          </div>
        </div>
        <dl class="position-metrics">
          ${renderEditableCost(position.cost)}
          <div><dt>买入日期</dt><dd>${stock.buyDate || "—"}</dd></div>
          <div><dt>持仓天数</dt><dd>${stock.holdingDays === null ? "—" : `${stock.holdingDays} 天`}</dd></div>
          <div><dt>持仓占比</dt><dd>${formatNumber(stock.positionPct, 1)}%</dd></div>
          <div class="account-save-state">
            <span class="${account.signedIn ? "signed-in" : ""}"></span>
            ${saveState}
          </div>
        </dl>
        ${renderEditableThesis(position.thesis)}
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
    const reasons = thesis
      .split(/\r?\n/)
      .map(reason => reason.trim())
      .filter(Boolean);
    const reasonList = `
      <ol class="buy-logic-list">
        ${reasons.map((reason, index) => `
          <li>
            <span>${index + 1}</span>
            <p>${escapeHtml(reason)}</p>
          </li>`).join("")}
      </ol>`;

    if (state.editField === "thesis") {
      return `
        <section class="buy-logic-row editing" aria-label="买入逻辑">
          <div class="buy-logic-title"><strong>买入逻辑</strong><small>每行一条理由</small></div>
          <div class="buy-logic-content">
            <textarea id="thesis-editor" rows="3" aria-label="编辑买入逻辑">${escapeHtml(state.thesisDraft)}</textarea>
            <span class="edit-actions">
              <button type="button" data-action="save-thesis">保存</button>
              <button type="button" data-action="cancel-edit">取消</button>
            </span>
            ${state.saveError ? `<small class="edit-error">${escapeHtml(state.saveError)}</small>` : ""}
          </div>
        </section>`;
    }

    if (state.editField === "add-thesis") {
      return `
        <section class="buy-logic-row adding" aria-label="买入逻辑">
          <div class="buy-logic-title"><strong>买入逻辑</strong><small>新增理由</small></div>
          <div class="buy-logic-content">
            ${reasonList}
            <div class="buy-logic-composer">
              <textarea id="thesis-add-editor" rows="2" placeholder="输入一条新的买入理由" aria-label="新增买入理由">${escapeHtml(state.thesisDraft)}</textarea>
              <span class="edit-actions">
                <button type="button" data-action="append-thesis">添加</button>
                <button type="button" data-action="cancel-edit">取消</button>
              </span>
              ${state.saveError ? `<small class="edit-error">${escapeHtml(state.saveError)}</small>` : ""}
            </div>
          </div>
        </section>`;
    }

    return `
      <section class="buy-logic-row" aria-label="买入逻辑">
        <div class="buy-logic-title"><strong>买入逻辑</strong><small>${reasons.length} 条理由</small></div>
        <div class="buy-logic-content">${reasonList}</div>
        <div class="buy-logic-tools">
          <button class="edit-button" type="button" data-action="edit-position" data-field="thesis" aria-label="编辑买入逻辑">${icon("edit")}</button>
          <button class="add-reason-button" type="button" data-action="add-thesis" aria-label="添加买入理由"><span aria-hidden="true">+</span></button>
        </div>
      </section>`;
  }

  function renderBoards(stock) {
    return `
      <section class="board-grid" aria-label="信息分类看板">
        ${stockGroups.map(group => renderBoard(stock, group)).join("")}
      </section>`;
  }

  function renderBoard(stock, group) {
    const messages = messagesForGroup(stock, group).sort(sortByNewest);
    const unread = messages.filter(message => isUnread(message)).length;
    const latest = messages[0];
    const riskCounts = messages.reduce((counts, message) => {
      if (Object.hasOwn(counts, message.importance)) counts[message.importance] += 1;
      return counts;
    }, { "高": 0, "中": 0, "低": 0 });
    const selected = state.activeGroup === group.id;
    return `
      <button class="info-board board-${group.size} ${selected ? "selected" : ""}" type="button" data-action="select-group" data-group="${group.id}" aria-pressed="${selected}">
        <span class="board-line">
          <span class="board-icon">${icon(group.icon)}</span>
          <span class="board-title">
            <strong>${group.title}</strong>
            ${group.id === "health" ? `<em>建议仅供参考</em>` : ""}
          </span>
          <span class="board-unread ${unread ? "" : "zero"}">${unread}</span>
        </span>
        <span class="board-meta">
          <time>${latest ? formatDateTime(latest.publishedAt) : "暂无时间"}</time>
          <span class="board-risk-summary" aria-label="风险分布">
            <b class="board-risk-count risk-高" aria-label="${riskCounts["高"]}条高风险" title="${riskCounts["高"]}条高风险"><span>高</span>${riskCounts["高"]}</b>
            <b class="board-risk-count risk-中" aria-label="${riskCounts["中"]}条中性" title="${riskCounts["中"]}条中性"><span>中</span>${riskCounts["中"]}</b>
            <b class="board-risk-count risk-低" aria-label="${riskCounts["低"]}条低风险" title="${riskCounts["低"]}条低风险"><span>低</span>${riskCounts["低"]}</b>
          </span>
        </span>
      </button>`;
  }

  function renderMessageHeader(mode) {
    const group = activeGroup();
    const stock = selectedStock();
    const messages = mode === "macro"
      ? data.market.macroNews
      : mode === "daily"
        ? dailyDigestMessages()
        : messagesForGroup(stock);
    const unread = messages.filter(messageIsUnread).length;
    const title = mode === "macro" ? "宏观大事件" : mode === "daily" ? "今日自选动态" : group.title;
    const checkedAt = mode === "stock" ? state.dynamicsCheckedByCode.get(stock.code) : null;
    return `
      <header class="message-header">
        <div class="message-header-title">
          <strong>${title}</strong>
          <span>· 最新消息与提示</span>
          ${mode === "stock" && group.id !== "all" ? `<button type="button" data-action="show-all">查看全部动态</button>` : ""}
        </div>
        <div class="message-header-tools">
          ${mode === "stock" ? `<span class="dynamic-update-stamp">${stock.dynamicLatestAt ? `最新动态 ${formatDateTime(stock.dynamicLatestAt)}` : "暂无最新动态"} · 检查 ${checkedAt ? formatDateTime(checkedAt) : "等待刷新"}</span>` : ""}
          <button class="mark-read" type="button" data-action="mark-read" ${unread ? "" : "disabled"}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16.5 9"/></svg>
            ${unread ? `全部标记已读（${unread}）` : "全部已读"}
          </button>
        </div>
      </header>`;
  }

  function renderFilters() {
    return `
      <section class="message-filters" aria-label="消息筛选">
        ${renderFilterGroup("消息类型", "sentiment", [
          ["all", "全部"],
          ["利好", "利好"],
          ["利空", "利空"],
          ["中性", "中性"]
        ])}
        ${renderFilterGroup("日期", "date", [
          ["all", "全部"],
          ["today", "今日"],
          ["week", "本周"],
          ["month", "本月"]
        ])}
        ${filtersActive() ? `<button class="clear-filters" type="button" data-action="clear-filters">清除筛选</button>` : ""}
      </section>`;
  }

  function renderDailyDigestFilters() {
    return `
      <section class="message-filters daily-digest-filters" aria-label="今日必读消息筛选">
        ${renderFilterGroup("消息类型", "sentiment", [
          ["all", "全部"],
          ["利好", "利好"],
          ["利空", "利空"],
          ["中性", "中性"]
        ])}
        ${state.filters.sentiment !== "all" ? `<button class="clear-filters" type="button" data-action="clear-filters">清除筛选</button>` : ""}
      </section>`;
  }

  function renderFilterGroup(label, key, options) {
    return `
      <div class="filter-group" data-filter-group="${key}">
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

  function renderMessageResults(messages) {
    if (state.filters.sentiment !== "all") return renderTimeline(messages);
    const columns = [
      { value: "利好", label: "利好", tone: "positive" },
      { value: "利空", label: "利空", tone: "negative" },
      { value: "中性", label: "中性", tone: "neutral" }
    ];
    const populatedColumns = columns
      .map(column => ({
        ...column,
        messages: messages.filter(message => message.sentiment === column.value)
      }))
      .filter(column => column.messages.length);
    if (!populatedColumns.length) return renderTimeline([]);
    return `
      <section class="sentiment-columns sentiment-columns-${populatedColumns.length}" aria-label="按消息性质分组">
        ${populatedColumns.map(column => `
            <section class="sentiment-column sentiment-column-${column.tone}" aria-label="${column.label}消息">
              <header class="sentiment-column-header">
                <strong>${column.label}</strong>
                <span>${column.messages.length}</span>
              </header>
              ${renderTimeline(column.messages)}
            </section>`).join("")}
      </section>`;
  }

  function renderMessage(message) {
    const scopeId = messageScopeId(message);
    const unread = isUnread(message, scopeId);
    const sourceUrl = specificSourceUrl(message.sourceUrl);
    const stockBadge = message.trackingStockId
      ? `<button class="message-stock-link" type="button" data-action="select-stock" data-stock-id="${escapeHtml(message.trackingStockId)}" title="查看${escapeHtml(message.trackingStockName)}全部动态">${escapeHtml(message.trackingStockName)} <span>${escapeHtml(message.trackingStockCode)}</span></button>`
      : "";
    const eventBadge = message.eventLabel
      ? `<span class="message-tag event-kind-${escapeHtml(message.eventKind || "reminder")}">${escapeHtml(message.eventLabel)}</span>`
      : "";
    const sourceLink = sourceUrl
      ? `<a class="message-source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">查看来源
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M17 13v6H5V7h6"/></svg>
        </a>`
      : "";
    return `
      <article class="message-row ${unread ? "unread" : "read"}">
        <span class="message-time-cell">
          <time datetime="${message.publishedAt}">${formatMessageTime(message.publishedAt)}</time>
          <button class="message-read-check ${unread ? "" : "checked"}" type="button"
            data-action="toggle-message-read" data-message-id="${message.id}" data-message-scope="${escapeHtml(scopeId)}"
            role="checkbox" aria-label="${unread ? "标记为已读" : "取消已读"}" aria-checked="${!unread}">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.2l2.8 2.8 6.2-6.2"/></svg>
          </button>
        </span>
        <span class="timeline-track" aria-hidden="true"></span>
        <div class="message-body">
          <div class="message-main">
            <div class="message-heading">
              <strong>${escapeHtml(message.title)}</strong>
              <span class="message-badges">
                ${stockBadge}
                ${eventBadge}
                <span class="message-tag evidence-${message.evidence}">${message.evidence}</span>
                <span class="message-tag sentiment-${message.sentiment}">${sentimentLabel(message.sentiment)}</span>
                ${unread ? "" : `<span class="message-read-icon" title="已读" aria-label="已读"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.2l2.8 2.8 6.2-6.2"/></svg></span>`}
              </span>
            </div>
            ${sourceLink}
          </div>
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
        ${renderMessageResults(filteredMacroNews())}
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
    state.editField = null;
    state.saveError = "";
    state.filters = { sentiment: "all", date: "all" };
  }

  function closeAuthModal() {
    state.authMode = null;
    state.authPassword = "";
    state.authCode = "";
    state.authBusy = false;
    state.authMessage = "";
  }

  function authErrorMessage(error, fallback) {
    const api = window.StockTrackingSharedAuth;
    return api?.cloudErrorMessage ? api.cloudErrorMessage(error, fallback) : error?.message || fallback;
  }

  async function handleSubmit(event) {
    const form = event.target.closest("[data-auth-form]");
    if (!form) return;
    event.preventDefault();
    const api = window.StockTrackingSharedAuth;
    if (!api) {
      state.authMessage = "账号服务仅在发布后的正式页面启用。";
      render();
      return;
    }

    state.authBusy = true;
    state.authMessage = form.dataset.authForm === "signup" ? "正在发送邮箱验证码…" : "正在验证账号…";
    render();
    try {
      if (form.dataset.authForm === "signup") {
        completeEmailSignUp = await api.startEmailSignUp(state.authEmail.trim(), state.authPassword);
        state.authMode = "verify";
        state.authPassword = "";
        state.authMessage = "验证码已发送，请检查邮箱。";
      } else if (form.dataset.authForm === "verify") {
        if (!completeEmailSignUp) throw new Error("验证流程已失效，请重新发送验证码。");
        await completeEmailSignUp(state.authCode.trim());
        completeEmailSignUp = null;
        closeAuthModal();
        restoreWatchlist();
      } else {
        await api.signInWithPassword(state.authEmail.trim(), state.authPassword);
        closeAuthModal();
        restoreWatchlist();
      }
    } catch (error) {
      state.authMessage = authErrorMessage(error, "账号操作失败，请稍后重试。");
    } finally {
      state.authBusy = false;
      render();
    }
  }

  async function signOutSharedAccount() {
    const api = window.StockTrackingSharedAuth;
    if (!api || state.authBusy) return;
    state.authBusy = true;
    state.refreshNotice = "正在退出共享账号…";
    render();
    try {
      await api.signOut();
      restoreWatchlist();
      state.refreshNotice = "已退出共享账号，当前切换为本浏览器访客空间";
    } catch (error) {
      state.refreshNotice = authErrorMessage(error, "退出登录失败，请稍后重试。");
    } finally {
      state.authBusy = false;
      render();
    }
  }

  function addToWatchlist(stockId) {
    const record = stockRecord(stockId);
    if (data.stocks.some(stock => stock.code === record.code)) return false;
    data.stocks.push(record);
    persistWatchlist();
    state.refreshNotice = `${record.name}已加入当前账号的自选股`;
    return true;
  }

  function removeFromWatchlist(stockId) {
    const code = String(stockId || "").padStart(6, "0");
    const index = data.stocks.findIndex(stock => stock.code === code);
    if (index < 0) return false;
    const [removed] = data.stocks.splice(index, 1);
    persistWatchlist();
    state.refreshNotice = `${removed.name}已从当前账号的自选股移除`;
    return true;
  }

  function handleClick(event) {
    if (event.target.classList?.contains("auth-modal-backdrop")) {
      closeAuthModal();
      render();
      return;
    }
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    let refreshCodeAfterRender = "";
    let refreshDailyAfterRender = false;

    if (action === "open-auth") {
      state.authMode = "login";
      state.authMessage = "";
    } else if (action === "close-auth") {
      closeAuthModal();
    } else if (action === "switch-auth") {
      state.authMode = target.dataset.authMode;
      state.authPassword = "";
      state.authCode = "";
      state.authMessage = "";
      if (state.authMode !== "verify") completeEmailSignUp = undefined;
    } else if (action === "auth-signout") {
      signOutSharedAccount();
      return;
    } else if (action === "select-view") {
      state.viewMode = target.dataset.view;
      resetForNavigation();
      refreshDailyAfterRender = state.viewMode === "daily";
    } else if (action === "select-stock") {
      state.selectedStockId = target.dataset.stockId;
      state.viewMode = state.viewMode === "technical" || target.dataset.stockView === "technical" ? "technical" : "stock";
      state.activeGroup = "all";
      technicalPage?.clearSearch();
      resetForNavigation();
      refreshCodeAfterRender = state.selectedStockId;
    } else if (action === "select-group") {
      if (target.dataset.group === "technical") {
        state.viewMode = "technical";
        resetForNavigation();
      } else {
        state.activeGroup = target.dataset.group;
      }
    } else if (action === "return-stock-view") {
      state.viewMode = "stock";
      state.activeGroup = "all";
      resetForNavigation();
    } else if (action === "add-watchlist") {
      const stockId = target.dataset.stockId || selectedStock().code;
      const added = addToWatchlist(stockId);
      refreshCodeAfterRender = added ? stockId : "";
    } else if (action === "remove-watchlist") {
      removeFromWatchlist(target.dataset.stockId || selectedStock().code);
    } else if (action === "show-all") {
      state.activeGroup = "all";
    } else if (action === "toggle-message-read") {
      const messageId = target.dataset.messageId;
      const scopeId = target.dataset.messageScope || readStorageScope();
      const overrides = readOverridesFor(scopeId);
      if (overrides.has(messageId)) overrides.delete(messageId);
      else overrides.add(messageId);
      persistReadOverrides(scopeId, overrides);
    } else if (action === "mark-read") {
      const messages = state.viewMode === "macro"
        ? filteredMacroNews()
        : state.viewMode === "daily"
          ? dailyDigestMessages()
          : filteredStockMessages(selectedStock());
      const messagesByScope = new Map();
      messages.forEach(message => {
        const scopeId = messageScopeId(message);
        if (!messagesByScope.has(scopeId)) messagesByScope.set(scopeId, []);
        messagesByScope.get(scopeId).push(message);
      });
      messagesByScope.forEach((scopedMessages, scopeId) => {
        const overrides = readOverridesFor(scopeId);
        scopedMessages.filter(message => isUnread(message, scopeId)).forEach(message => {
          if (overrides.has(message.id)) overrides.delete(message.id);
          else overrides.add(message.id);
        });
        persistReadOverrides(scopeId, overrides);
      });
    } else if (action === "edit-position") {
      const position = positionValues(selectedStock());
      state.editField = target.dataset.field;
      state.costDraft = formatNumber(position.cost);
      state.thesisDraft = position.thesis;
      state.saveError = "";
    } else if (action === "add-thesis") {
      state.editField = "add-thesis";
      state.thesisDraft = "";
      state.saveError = "";
    } else if (action === "cancel-edit") {
      state.editField = null;
      state.saveError = "";
    } else if (action === "save-cost") {
      saveCost();
    } else if (action === "save-thesis") {
      saveThesis();
    } else if (action === "append-thesis") {
      appendThesis();
    } else if (action === "clear-filters") {
      state.filters = { sentiment: "all", date: "all" };
    } else if (action === "set-filter") {
      state.filters[target.dataset.filterKey] = target.dataset.filterValue;
    } else if (action === "refresh-all") {
      const dailyCodes = state.viewMode === "daily" ? data.stocks.map(stock => stock.code) : undefined;
      refreshAllInformation({ force: true, feedCodes: dailyCodes });
      return;
    } else if (state.viewMode === "technical" && technicalPage) {
      const handled = technicalPage.handleAction(target);
      if (handled === "async") return;
      if (!handled) return;
    }
    render();
    focusEditorIfNeeded();
    if (refreshCodeAfterRender) {
      refreshAllInformation({
        silent: true,
        force: true,
        quoteCodes: [String(refreshCodeAfterRender).padStart(6, "0")],
        feedSections: ["announcements", "news", "events"]
      });
    } else if (refreshDailyAfterRender) {
      const dailyCodes = data.stocks.map(stock => stock.code);
      refreshAllInformation({
        silent: true,
        force: true,
        quoteCodes: dailyCodes,
        feedCodes: dailyCodes,
        feedSections: ["announcements", "news", "events"]
      });
    }
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
      state.saveError = "买入逻辑不能为空";
      return;
    }
    accountStorage.save(selectedStock().id, { thesis: value });
    state.editField = null;
    state.saveError = "";
  }

  function appendThesis() {
    const reason = state.thesisDraft.trim();
    if (!reason) {
      state.saveError = "请输入新的买入理由";
      return;
    }
    const currentThesis = positionValues(selectedStock()).thesis.trim();
    const isPlaceholder = currentThesis.startsWith("尚未填写买入理由");
    const nextThesis = [isPlaceholder ? "" : currentThesis, reason].filter(Boolean).join("\n");
    accountStorage.save(selectedStock().id, { thesis: nextThesis });
    state.editField = null;
    state.thesisDraft = "";
    state.saveError = "";
  }

  function focusEditorIfNeeded() {
    if (state.editField === "cost") document.getElementById("cost-editor")?.focus();
    if (state.editField === "thesis") document.getElementById("thesis-editor")?.focus();
    if (state.editField === "add-thesis") document.getElementById("thesis-add-editor")?.focus();
    if (state.authMode === "verify") document.getElementById("auth-code")?.focus();
    if (["login", "signup"].includes(state.authMode)) document.getElementById("auth-email")?.focus();
  }

  function handleCompositionStart(event) {
    if (event.target.id === "stock-search") state.searchComposing = true;
    if (event.target.matches?.("[data-technical-search]")) state.technicalSearchComposing = true;
  }

  function handleCompositionEnd(event) {
    if (event.target.id === "stock-search") {
      state.searchComposing = false;
      state.query = event.target.value;
      render();
      const input = document.getElementById("stock-search");
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
      return;
    }
    if (event.target.matches?.("[data-technical-search]")) {
      state.technicalSearchComposing = false;
      technicalPage?.handleInput(event.target);
      render();
      const input = document.querySelector("[data-technical-search]");
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }
  }

  function handleInput(event) {
    if (state.viewMode === "technical" && technicalPage?.handleInput(event.target)) {
      if (event.isComposing || state.technicalSearchComposing) return;
      const cursor = event.target.selectionStart;
      render();
      const input = document.querySelector("[data-technical-search]");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
      return;
    }
    if (event.target.id === "auth-email") {
      state.authEmail = event.target.value;
      return;
    }
    if (event.target.id === "auth-password") {
      state.authPassword = event.target.value;
      return;
    }
    if (event.target.id === "auth-code") {
      state.authCode = event.target.value;
      return;
    }
    if (event.target.id === "cost-editor") {
      state.costDraft = event.target.value;
      return;
    }
    if (event.target.id === "thesis-editor" || event.target.id === "thesis-add-editor") {
      state.thesisDraft = event.target.value;
      return;
    }
    if (event.target.id !== "stock-search") return;
    const cursor = event.target.selectionStart;
    state.query = event.target.value;
    if (event.isComposing || state.searchComposing) return;
    render();
    const input = document.getElementById("stock-search");
    input?.focus();
    input?.setSelectionRange(cursor, cursor);
  }

  document.addEventListener("DOMContentLoaded", mount);
})();
