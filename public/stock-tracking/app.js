"use strict";

(function initializeStandaloneStockTracking() {
  const data = window.STOCK_TRACKING_MOCK_DATA;
  const accountStorage = window.StockTrackingAccountStorage;
  const messageTaxonomy = window.StockTrackingMessageTaxonomy;
  const messageReadState = window.StockTrackingMessageReadState;
  if (!messageTaxonomy) throw new Error("消息分类模块未加载");
  if (!messageReadState) throw new Error("消息已读状态模块未加载");
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
    ? new window.StockTechnicalAnalysis.EastmoneyTechnicalAnalysisProvider()
    : null;
  const MARKET_INDEX = { id: "market-shanghai", code: "000001", name: "上证指数" };
  const marketTechnicalProvider = window.StockTechnicalAnalysis && window.StockTrackingLiveData
    ? new window.StockTechnicalAnalysis.EastmoneyTechnicalAnalysisProvider({
        liveProvider: new window.StockTrackingLiveData.EastmoneyStockLiveDataProvider({ marketId: "1", directOnly: true }),
        includeDailySeries: true,
        dailySeriesLimit: 500
      })
    : null;
  const aiSelectionProvider = window.AIStockSelectionProvider || null;
  const VIEW_MODES = ["stock", "daily", "calendar", "market", "macro", "technical", "score-matrix", "operation-advice", "ai-selection"];
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
    calendar: "<rect x='4' y='5.5' width='16' height='14.5' rx='2'/><path d='M8 3.5v4M16 3.5v4M4 10h16M8 14h3M8 17h6'/>",
    matrix: "<rect x='3.5' y='4' width='17' height='16' rx='2'/><path d='M9 4v16M15 4v16M3.5 9.5h17M3.5 15h17'/>",
    ai: "<path d='M12 3.5l1.45 4.05L17.5 9l-4.05 1.45L12 14.5l-1.45-4.05L6.5 9l4.05-1.45z'/><path d='M18.5 14.5l.78 2.22 2.22.78-2.22.78-.78 2.22-.78-2.22-2.22-.78 2.22-.78zM5.5 14l.58 1.67 1.67.58-1.67.58L5.5 18.5l-.58-1.67-1.67-.58 1.67-.58z'/>",
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
    viewMode: VIEW_MODES.includes(requestedView) ? requestedView : "stock",
    activeGroup: requestedGroup,
    query: "",
    dailyStockQuery: "",
    readStateByScope: new Map(),
    editField: null,
    costDraft: "",
    thesisDraft: "",
    saveError: "",
    filters: { sentiment: "all", date: "all", stock: "all" },
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
  let marketTechnicalPage;
  let scoreMatrixPage;
  let operationAdvicePage;
  let aiSelectionPage;
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
    if (marketTechnicalProvider && window.StockTechnicalAnalysisPage) {
      marketTechnicalPage = window.StockTechnicalAnalysisPage.create(marketTechnicalProvider, render);
    }
    if (technicalProvider && window.StockScoreMatrixPage) {
      scoreMatrixPage = window.StockScoreMatrixPage.create(technicalProvider, render);
    }
    if (technicalProvider && window.StockOperationAdvicePage) {
      operationAdvicePage = window.StockOperationAdvicePage.create(technicalProvider, accountStorage, render);
    }
    if (window.AIStockSelectionPage) {
      aiSelectionPage = window.AIStockSelectionPage.create(aiSelectionProvider, render);
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
      feedCodes: watchlistAggregateView() ? data.stocks.map(stock => stock.code) : undefined
    });
    startAutomaticRefresh();
  }

  function handleExternalStorageChange(event) {
    state.editField = null;
    state.saveError = "";
    state.readStateByScope.clear();
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
    state.readStateByScope.clear();
    const watchlistChanged = restoreWatchlist();
    render();
    refreshDailyWatchlistAfterAccountChange(watchlistChanged);
  }

  function syncAccountPreferences() {
    if (accountSyncPromise || typeof accountStorage.sync !== "function") return accountSyncPromise;
    accountSyncPromise = accountStorage.sync(seedStockCodes)
      .then(() => {
        state.readStateByScope.clear();
        const watchlistChanged = restoreWatchlist();
        render();
        refreshDailyWatchlistAfterAccountChange(watchlistChanged);
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
    if (document.visibilityState !== "visible" || !liveDataProvider || analysisWorkspaceView()) return;
    const feedSections = sections.filter(section => section !== "quote");
    const options = {
      silent: true,
      quoteCodes: sections.includes("quote") ? [selectedStock().code] : [],
      feedSections,
      feedCodes: feedSections.length
        ? watchlistAggregateView() ? data.stocks.map(stock => stock.code) : [selectedStock().code]
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
    if (document.visibilityState !== "visible" || analysisWorkspaceView()) return;
    const feedCodes = watchlistAggregateView()
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
    state.readStateByScope.clear();
    const previousCodes = data.stocks.map(stock => stock.code);
    const codes = accountStorage.loadWatchlist(seedStockCodes);
    data.stocks = codes.map(stockRecord);
    return previousCodes.length !== codes.length
      || previousCodes.some((code, index) => code !== codes[index]);
  }

  function refreshDailyWatchlistAfterAccountChange(watchlistChanged) {
    if (!watchlistChanged || !watchlistAggregateView() || !liveDataProvider) return;
    const codes = data.stocks.map(stock => stock.code);
    if (!codes.length) return;
    refreshAllInformation({
      silent: true,
      force: true,
      quoteCodes: codes,
      feedCodes: codes,
      feedSections: ["announcements", "news", "events"]
    });
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

  function watchlistAggregateView() {
    return ["daily", "calendar"].includes(state.viewMode);
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

  function readStateFor(scopeId = readStorageScope()) {
    if (!state.readStateByScope.has(scopeId)) {
      state.readStateByScope.set(scopeId, messageReadState.createState(accountStorage.load(scopeId)));
    }
    return state.readStateByScope.get(scopeId);
  }

  function persistReadState(scopeId, value) {
    accountStorage.save(scopeId, messageReadState.serialize(value));
  }

  function isUnread(message, scopeId = readStorageScope()) {
    return messageReadState.isUnread(message, readStateFor(scopeId));
  }

  function messageScopeId(message) {
    return readStorageScope(message?.trackingStockId || "");
  }

  function messageIsUnread(message) {
    return isUnread(message, messageScopeId(message));
  }

  function messageForScope(scopeId, messageId) {
    if (scopeId === "market-macro") {
      return data.market.macroNews.find(message => message.id === messageId) || null;
    }
    const stock = data.stocks.find(item => String(item.id) === String(scopeId) || String(item.code) === String(scopeId));
    return stock?.messages?.find(message => message.id === messageId) || null;
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

  function messageDayRelation(message) {
    const messageDate = shanghaiDateParts(message?.publishedAt);
    const today = shanghaiDateParts();
    if (!messageDate || !today) return "unknown";
    if (messageDate.ordinal === today.ordinal) return "today";
    return messageDate.ordinal < today.ordinal ? "past" : "future";
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

  function trackedWatchlistMessages() {
    const allDynamicsGroup = stockGroups.find(group => group.id === "all") || stockGroups[0];
    return data.stocks
      .flatMap(stock => messagesForGroup(stock, allDynamicsGroup)
        .map(message => ({
          ...message,
          trackingStockId: stock.id,
          trackingStockCode: stock.code,
          trackingStockName: stock.name
        })));
  }

  function filterWatchlistMessages(messages, applySentimentFilter = true) {
    const selectedDailyStock = String(state.filters.stock || "all");
    const dailyStockQuery = state.dailyStockQuery;
    return messages
      .filter(message => !applySentimentFilter
        || state.filters.sentiment === "all"
        || message.sentiment === state.filters.sentiment)
      .filter(message => selectedDailyStock === "all" || String(message.trackingStockId) === selectedDailyStock)
      .filter(message => {
        if (!dailyStockQuery) return true;
        const stock = data.stocks.find(item => String(item.id) === String(message.trackingStockId));
        return stockMatchesSearch(stock || {
          name: message.trackingStockName,
          code: message.trackingStockCode,
          initials: ""
        }, dailyStockQuery);
      });
  }

  function dailyDigestSections(applySentimentFilter = true) {
    const trackedMessages = trackedWatchlistMessages();
    const sections = messageTaxonomy.partitionDailyDigestMessages(trackedMessages, {
      isToday: message => message.eventKind !== "calendar" && messageDayRelation(message) === "today",
      isPast: message => messageDayRelation(message) === "past",
      isUnread: messageIsUnread,
      isReminder: message => message.eventKind === "calendar",
      isActiveReminder: () => false
    });
    const applyFilter = messages => filterWatchlistMessages(messages, applySentimentFilter).sort(sortByNewest);
    return {
      today: applyFilter(sections.today),
      catchUp: applyFilter(sections.catchUp)
    };
  }

  function dailyDigestMessages(applySentimentFilter = false) {
    const sections = dailyDigestSections(applySentimentFilter);
    return [
      ...sections.today.map(message => ({ ...message, dailyDigestKind: "today" })),
      ...sections.catchUp.map(message => ({ ...message, dailyDigestKind: "catch-up" }))
    ].sort(sortByNewest);
  }

  function calendarReminderMessages() {
    return filterWatchlistMessages(currentMonthCalendarReminders(), false).sort(sortBySoonest);
  }

  function currentMonthCalendarReminders() {
    const today = shanghaiDateParts();
    return messageTaxonomy.keepLatestDuplicateMessages(trackedWatchlistMessages()
      .filter(message => {
        const messageDate = shanghaiDateParts(message.publishedAt);
        return message.eventKind === "calendar"
          && messageDate
          && today
          && messageDate.year === today.year
          && messageDate.month === today.month
          && ["today", "future"].includes(messageDayRelation(message));
      }))
      .sort(sortBySoonest);
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

  function sortBySoonest(left, right) {
    return new Date(left.publishedAt) - new Date(right.publishedAt);
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
      ? messageTaxonomy.mergeFeedSection(
        existingAnnouncements,
        preserveReadState(information.announcements || []),
        information.errors?.announcements
      )
      : existingAnnouncements;
    const news = sections.includes("news")
      ? messageTaxonomy.mergeFeedSection(
        existingNews,
        preserveReadState(information.news || []),
        information.errors?.news
      )
      : existingNews;
    const events = sections.includes("events")
      ? messageTaxonomy.mergeFeedSection(
        existingEvents,
        preserveReadState(information.events || []),
        information.errors?.events,
        message => message.eventKind === "calendar" && messageDayRelation(message) === "future"
      )
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

    const feedCodeSet = new Set(feedStocks.map(stock => stock.code));
    const sameRefreshCodes = quoteCodes.length > 1
      && quoteCodes.length === feedStocks.length
      && quoteCodes.every(code => feedCodeSet.has(code));
    const combinedSnapshotPromise = sameRefreshCodes
      && typeof liveDataProvider.getWatchlistSnapshot === "function"
      ? liveDataProvider.getWatchlistSnapshot(feedStocks, {
        sections: ["quote", ...feedSections],
        force: options.force
      }).then(snapshots => {
        snapshots.forEach(snapshot => {
          if (snapshot.quote) applyLiveQuote(snapshot.quote);
          applyLatestInformation(snapshot.code, snapshot, feedSections);
        });
        return snapshots;
      })
      : null;
    const quoteRequests = combinedSnapshotPromise
      ? [combinedSnapshotPromise]
      : quoteCodes.length > 1 && typeof liveDataProvider.getRealtimeQuotes === "function"
      ? [liveDataProvider.getRealtimeQuotes(quoteCodes, { force: options.force }).then(quotes => {
        quotes.forEach(applyLiveQuote);
        return quotes;
      })]
      : quoteCodes.map(code =>
        liveDataProvider.getRealtimeQuote(code, { force: options.force }).then(quote => {
          applyLiveQuote(quote);
          return quote;
        })
      );
    const informationRequests = combinedSnapshotPromise
      ? [combinedSnapshotPromise]
      : !feedSections.length
      ? []
      : feedStocks.length > 1 && typeof liveDataProvider.getLatestInformationBatch === "function"
        ? [liveDataProvider.getLatestInformationBatch(feedStocks, {
          sections: feedSections,
          force: options.force
        }).then(informationItems => {
          informationItems.forEach(information => {
            applyLatestInformation(information.code, information, feedSections);
          });
          return informationItems;
        })]
        : feedStocks.map(stock => liveDataProvider
          .getLatestInformation(stock.code, {
            sections: feedSections,
            force: options.force,
            name: stock.name
          })
          .then(information => {
            applyLatestInformation(stock.code, information, feedSections);
            return information;
          }));
    const [quoteResults, informationResults] = await Promise.all([
      Promise.allSettled(quoteRequests),
      Promise.allSettled(informationRequests)
    ]);

    const fulfilledValues = results => results
      .filter(result => result.status === "fulfilled")
      .flatMap(result => Array.isArray(result.value) ? result.value : [result.value]);
    const quoteValues = fulfilledValues(quoteResults);
    const quoteSuccesses = quoteValues.length;
    const informationValues = fulfilledValues(informationResults);
    const informationSuccesses = informationValues.filter(information =>
      feedSections.every(section => !information?.errors?.[section])
    ).length;
    const informationSucceeded = !feedSections.length || informationSuccesses > 0;
    const informationErrors = informationValues
      .flatMap(information => Object.values(information?.errors || {}));
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
      const staleStockCount = new Set([
        ...quoteValues.filter(item => item?.stale).map(item => item.code),
        ...informationValues.filter(item => item?.stale).map(item => item.code)
      ]).size;
      if (staleStockCount) state.refreshNotice += ` · ${staleStockCount} 只使用上次完整数据`;
    } else {
      state.refreshNotice = `刷新失败：${errors[0] || "公开数据源暂不可用"}`;
    }
    if (!(options.silent && analysisWorkspaceView())) render();
    const pendingOptions = state.pendingRefreshOptions;
    state.pendingRefreshOptions = null;
    if (pendingOptions) refreshAllInformation(pendingOptions);
  }

  function render() {
    const stock = selectedStock();
    const fullWidthView = ["technical", "score-matrix", "market"].includes(state.viewMode);
    document.title = state.viewMode === "score-matrix"
      ? "多周期评分矩阵 - A股个股跟踪"
      : state.viewMode === "operation-advice"
      ? `${stock.name}操作建议 - A股个股跟踪`
      : state.viewMode === "technical"
      ? `${stock.name}技术分析 - A股个股跟踪`
      : state.viewMode === "daily"
        ? "今日必读 - A股个股跟踪"
          : state.viewMode === "calendar"
          ? "个股日历 - A股个股跟踪"
          : state.viewMode === "market"
            ? "大盘走势 - A股个股跟踪"
          : state.viewMode === "ai-selection"
            ? "AI选股 - A股个股跟踪"
            : "A股个股跟踪";
    root.innerHTML = `
      <div class="tracking-layout ${state.viewMode === "ai-selection" ? "ai-selection-layout" : ""} ${state.viewMode === "daily" ? "daily-noir-layout" : ""}">
        ${renderWorkspaceNav(stock)}
        ${state.viewMode === "market" ? "" : renderSidebar(stock)}
        <main class="tracking-main ${fullWidthView ? "technical-main" : ""} ${state.viewMode === "score-matrix" ? "score-matrix-main" : ""} ${state.viewMode === "operation-advice" ? "operation-advice-main" : ""}">
          ${state.viewMode === "stock" ? renderStockView(stock) : ""}
          ${state.viewMode === "daily" ? renderDailyDigestView() : ""}
          ${state.viewMode === "calendar" ? renderCalendarView() : ""}
          ${state.viewMode === "macro" ? renderMacroView() : ""}
          ${state.viewMode === "market" ? renderMarketTechnicalView() : ""}
          ${state.viewMode === "ai-selection" ? renderAISelectionView() : ""}
          ${state.viewMode === "technical" ? renderTechnicalView(stock) : ""}
          ${state.viewMode === "score-matrix" ? renderScoreMatrixView() : ""}
          ${state.viewMode === "operation-advice" ? renderOperationAdviceView(stock) : ""}
        </main>
      </div>
      ${renderAuthModal()}`;
    syncUrl();
    if (state.viewMode === "technical") technicalPage?.mount(root, stock);
    if (state.viewMode === "market") marketTechnicalPage?.mount(root, MARKET_INDEX);
    if (state.viewMode === "score-matrix") scoreMatrixPage?.mount(root, data.stocks);
    if (state.viewMode === "operation-advice") operationAdvicePage?.mount(root, stock);
    if (state.viewMode === "ai-selection") {
      aiSelectionPage?.mount(root);
    }
    keepSelectedWorkspaceTabVisible();
  }

  function analysisWorkspaceView() {
    return ["technical", "score-matrix", "operation-advice"].includes(state.viewMode);
  }

  function keepSelectedWorkspaceTabVisible() {
    const tabs = root.querySelector(".workspace-tabs");
    const selected = tabs?.querySelector(".workspace-tab.selected");
    if (!tabs || !selected) return;
    const selectedLeft = selected.offsetLeft;
    const selectedRight = selectedLeft + selected.offsetWidth;
    const visibleRight = tabs.scrollLeft + tabs.clientWidth;
    if (selectedLeft < tabs.scrollLeft) tabs.scrollLeft = selectedLeft;
    else if (selectedRight > visibleRight) tabs.scrollLeft = selectedRight - tabs.clientWidth;
  }

  function renderWorkspaceNav(stock) {
    const account = accountStorage.getAccount();
    const views = [
      ["daily", "digest", "今日必读"],
      ["stock", "all", "个股看板"],
      ["calendar", "calendar", "个股日历"],
      ["market", "pulse", "大盘走势"],
      ["macro", "news", "宏观事件"],
      ["technical", "chart", "技术分析"],
      ["score-matrix", "matrix", "评分矩阵"],
      ["operation-advice", "flag", "操作建议"],
      ["ai-selection", "ai", "AI选股"]
    ];
    return `
      <header class="workspace-nav" aria-label="个股投资主导航">
        <button class="workspace-mark" type="button" data-action="select-view" data-view="stock" aria-label="返回个股看板">
          ${icon("all")}
        </button>
        <nav class="workspace-tabs" aria-label="功能页面">
          ${views.map(([view, iconName, label]) => `
            <button class="workspace-tab ${state.viewMode === view ? "selected" : ""}" type="button"
              data-action="select-view" data-view="${view}" aria-pressed="${state.viewMode === view}">
              ${icon(iconName)}<span>${label}</span>
            </button>`).join("")}
        </nav>
        <div class="workspace-actions">
          <span class="workspace-account" title="${account.signedIn ? escapeHtml(account.label) : "尚未登录"}">
            ${icon("user")}
          </span>
          <button class="workspace-refresh ${state.refreshing ? "refreshing" : ""}" type="button" data-action="refresh-all"
            ${state.refreshing ? "disabled" : ""} aria-label="刷新行情与动态">
            ${icon("refresh")}<span>${state.refreshing ? "刷新中" : "刷新数据"}</span>
          </button>
        </div>
      </header>`;
  }

  function renderStockView(stock) {
    return `
      ${renderPositionHeader(stock)}
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
      trackedStocks: data.stocks.map(item => ({ code: item.code, name: item.name })),
      trackedCodes: new Set(data.stocks.map(item => item.code))
    });
  }

  function renderScoreMatrixView() {
    if (!scoreMatrixPage) {
      return `<section class="matrix-state matrix-state-error" role="alert"><strong>评分矩阵模块未能加载</strong><p>请刷新页面后重试。</p></section>`;
    }
    return scoreMatrixPage.render(data.stocks);
  }

  function renderOperationAdviceView(stock) {
    if (!operationAdvicePage) {
      return `<section class="oa-state-card is-error" role="alert"><strong>操作建议模块未能加载</strong><p>请刷新页面后重试。</p></section>`;
    }
    return operationAdvicePage.render(stock);
  }

  function renderAISelectionView() {
    if (!aiSelectionPage) {
      return `<section class="ai-selection-shell"><div class="ai-selection-state ai-selection-state-error" role="alert"><strong>AI选股模块未能加载</strong><p>页面脚本或数据服务暂不可用，请刷新页面后重试。</p></div></section>`;
    }
    return aiSelectionPage.render();
  }

  function renderDailyDigestView() {
    const researchContext = dailyResearchContext(selectedStock());
    const majorMessages = dailyDigestMessages(false);
    return `
      <section class="global-view daily-digest-view">
        ${renderDailyNewsSection(researchContext)}
        ${renderDailyMajorNewsSection(majorMessages)}
        ${renderDailyTrafficLightSection(researchContext)}
      </section>`;
  }

  function dailyResearchContext(stock) {
    const research = window.STOCK_DAILY_RESEARCH;
    const reports = Array.isArray(research?.stocks) ? research.stocks : [];
    const report = reports.find(item => item.code === stock.code);
    const trackedCodes = new Set(data.stocks.map(item => item.code));
    const changed = reports
      .filter(item => trackedCodes.has(item.code) && item.hasMaterialChange)
      .sort((a, b) => (Number(b.importanceScore) || 0) - (Number(a.importanceScore) || 0));
    const priorityCodes = [...new Set([
      ...(Array.isArray(research?.topChangeCodes) ? research.topChangeCodes : []),
      ...changed.map(item => item.code)
    ])].filter(code => trackedCodes.has(code)).slice(0, 5);
    const priority = priorityCodes.map(code => reports.find(item => item.code === code)).filter(Boolean);
    return { research, report, priority, stock };
  }

  function renderDailyNewsSection({ research, priority }) {
    return `
      <section class="daily-page-section daily-news-section" aria-labelledby="daily-news-title">
        <header class="daily-page-section-header">
          <div>
            <h2 id="daily-news-title">今日要闻</h2>
            <p>概括全部自选股中最值得关注的变化</p>
          </div>
          ${research?.generatedAt ? `<time datetime="${escapeHtml(research.generatedAt)}">${formatDateTime(research.generatedAt)} 更新</time>` : ""}
        </header>
        <div class="daily-radar-priority" role="list" aria-label="今日要闻股票">
          ${priority.length ? priority.map((item, index) => `
            <article class="daily-radar-item" role="listitem">
              <span>${index + 1}</span><b>${escapeHtml(item.name)}</b><strong>${escapeHtml(item.conclusion || item.headline)}</strong><small>${escapeHtml(item.currentJudgment || item.status)}</small>
            </article>`).join("") : `<p class="daily-radar-clear">今日暂无需要置顶的概括性要闻。</p>`}
        </div>
      </section>`;
  }

  function renderDailyMajorNewsSection(messages) {
    const unread = messages.filter(messageIsUnread).length;
    const stockLabel = state.filters.stock === "all" ? "全部自选股" : selectedStock().name;
    return `
      <section class="daily-page-section daily-major-news-section" aria-labelledby="daily-major-news-title">
        <header class="daily-page-section-header">
          <div>
            <h2 id="daily-major-news-title">个股重大消息</h2>
            <p>${escapeHtml(stockLabel)} · 今日新增与未读补看按时间合并展示</p>
          </div>
          <div class="daily-page-section-tools">
            <span>${messages.length} 条${unread ? ` · ${unread} 条未读` : ""}</span>
            <button class="mark-read" type="button" data-action="mark-read" ${unread ? "" : "disabled"}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16.5 9"/></svg>
              ${unread ? "全部标记已读" : "全部已读"}
            </button>
          </div>
        </header>
        ${renderTimeline(messages, {
          showDigestOrigin: true,
          showFullDate: true,
          emptyTitle: "暂无重大消息",
          emptyText: "新消息会在刷新后自动汇总到这里"
        })}
      </section>`;
  }

  const dailyTrafficDimensionConfig = [
    {
      id: "fundamentals",
      label: "基本面",
      icon: "building",
      keywords: ["基本面", "经营", "营收", "盈利", "利润", "业绩", "毛利", "订单", "产能", "现金流", "回款", "半年报", "年报", "交割"],
      noEvidence: "今日无新增经营数据，维持既有基本面判断"
    },
    {
      id: "institution",
      label: "机构",
      icon: "user",
      keywords: ["机构", "基金", "社保", "QFII", "北向", "沪深股通", "调研", "机构持仓"],
      noEvidence: "今日无新增机构持仓或调研证据"
    },
    {
      id: "chips",
      label: "筹码",
      icon: "matrix",
      keywords: ["筹码", "股东", "持股", "持仓", "增持", "减持", "解禁", "质押", "股本", "集中度"],
      noEvidence: "今日无新增股东、增减持或解禁证据"
    },
    {
      id: "capital",
      label: "资金面",
      icon: "chart",
      keywords: ["资金", "融资", "融券", "净流", "净买", "主力", "成交", "换手", "量能", "放量", "缩量", "补流", "回款", "价格", "支撑", "收盘", "上涨", "下跌", "突破", "跌破"],
      noEvidence: "今日量价未形成明确方向，等待资金信号"
    },
    {
      id: "risk",
      label: "风险事项",
      icon: "flag",
      keywords: ["风险", "诉讼", "处罚", "监管", "问询", "债务", "违约", "退市", "减值", "亏损", "质押", "跌破", "失效", "转弱", "弱势", "谨慎", "承压", "失败"],
      noEvidence: "今日无新增公司级重大风险，继续等待验证"
    }
  ];

  const dailyTrafficPositiveWords = ["偏积极", "改善", "上调", "转强", "站稳", "收复", "突破", "有效", "跑赢", "回升", "增长", "增持", "净流入", "净买入", "集中", "兑现", "修复", "完成", "上涨"];
  const dailyTrafficNegativeWords = ["偏消极", "偏弱", "弱势", "转弱", "下调", "跌破", "失效", "失败", "风险", "谨慎", "回落", "承压", "亏损", "恶化", "减持", "净流出", "未解除", "待证明", "不足", "受阻", "高波动", "下跌"];

  function dailyTrafficSegments(value) {
    return String(value || "")
      .replace(/^分析[:：]\s*/, "")
      .split(/[。；;！？\n，,]+/)
      .map(item => item.trim())
      .filter(item => item.length > 1);
  }

  function dailyTrafficIncludes(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  function dailyTrafficTone(segments) {
    const text = [...new Set(segments)].join("；");
    if (!text) return "neutral";
    const positivePhrases = ["改善确认", "防守有效", "修复成功", "突破确认", "转强"];
    const negativePhrases = ["修复失败", "防守失效", "弱势确认", "弱势延续", "转为谨慎", "冲高回落", "风险仍高"];
    const hasPositivePhrase = positivePhrases.some(phrase => text.includes(phrase));
    const hasNegativePhrase = negativePhrases.some(phrase => text.includes(phrase));
    if (hasPositivePhrase !== hasNegativePhrase) return hasPositivePhrase ? "positive" : "negative";
    const positive = dailyTrafficPositiveWords.filter(word => text.includes(word)).length;
    const negative = dailyTrafficNegativeWords.filter(word => text.includes(word)).length;
    if (positive > negative) return "positive";
    if (negative > positive) return "negative";
    return "neutral";
  }

  function dailyTrafficDirection(segments) {
    const text = segments.join("；");
    const positivePhrases = ["判断上调", "上调为", "转强", "防守有效", "改善确认", "突破确认", "修复成功"];
    const negativePhrases = ["判断下调", "下调为", "防守失效", "弱势确认", "弱势延续", "转为谨慎", "修复失败", "风险上升"];
    const hasPositivePhrase = positivePhrases.some(phrase => text.includes(phrase));
    const hasNegativePhrase = negativePhrases.some(phrase => text.includes(phrase));
    if (hasPositivePhrase !== hasNegativePhrase) return hasPositivePhrase ? "improved" : "weakened";
    const improved = ["改善", "上调", "转强", "收复", "有效", "修复", "回升", "增强"].filter(word => text.includes(word)).length;
    const weakened = ["下调", "转弱", "失效", "跌破", "失败", "弱势确认", "恶化", "谨慎"].filter(word => text.includes(word)).length;
    if (improved > weakened) return "improved";
    if (weakened > improved) return "weakened";
    return "steady";
  }

  function compactDailyTrafficEvidence(value, maxLength = 72) {
    const text = String(value || "").replace(/^分析[:：]\s*/, "").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
  }

  function dailyTrafficPriceEvidence(report) {
    const change = Number(report?.price?.changePct);
    const volume = Number(report?.price?.volumeChangeVsPreviousPct);
    if (!Number.isFinite(change)) return "";
    const direction = change > 0.05 ? "上涨" : change < -0.05 ? "下跌" : "平收";
    const changeText = `${Math.abs(change).toFixed(2)}%`;
    if (!Number.isFinite(volume)) return `收盘${direction}${changeText}`;
    const volumeDirection = volume > 0 ? "增加" : volume < 0 ? "减少" : "持平";
    return `收盘${direction}${changeText}，成交量较前一日${volumeDirection}${Math.abs(volume).toFixed(1)}%`;
  }

  function dailyTrafficCapitalTone(report, evidenceSegments, hasMarketSource) {
    if (!hasMarketSource) return "neutral";
    const change = Number(report?.price?.changePct);
    const volume = Number(report?.price?.volumeChangeVsPreviousPct);
    const close = Number(report?.price?.close);
    const high = Number(report?.price?.high);
    const low = Number(report?.price?.low);
    if (![change, volume, close, high, low].every(Number.isFinite) || high <= low || volume < 20) return "neutral";
    const judgmentTone = dailyTrafficTone(evidenceSegments);
    if (judgmentTone === "negative") return "negative";
    const closeLocation = (close - low) / (high - low);
    if (change > 0 && closeLocation >= 0.65) return "positive";
    if (change < 0 || closeLocation <= 0.35) return "negative";
    return "neutral";
  }

  function buildDailyTrafficRows(report) {
    const importantChanges = Array.isArray(report.importantChanges) ? report.importantChanges : [];
    const currentSegments = [
      report.currentJudgment,
      report.status,
      report.conclusion,
      report.whyImportant,
      report.profitValuationImpact
    ].flatMap(dailyTrafficSegments);
    const judgmentSegments = dailyTrafficSegments(report.judgmentChange);
    const factSegments = importantChanges
      .filter(item => Array.isArray(item.source_urls) && item.source_urls.length > 0)
      .flatMap(item => dailyTrafficSegments(item.fact));
    const hasReportSources = Array.isArray(report.sources) && report.sources.length > 0;
    const hasMarketSource = hasReportSources && report.sources.some(source => source.kind === "行情");

    const rows = dailyTrafficDimensionConfig.map(dimension => {
      const currentEvidence = currentSegments.filter(segment => dailyTrafficIncludes(segment, dimension.keywords));
      const factEvidence = factSegments.filter(segment => dailyTrafficIncludes(segment, dimension.keywords));
      const judgmentEvidence = judgmentSegments.filter(segment => dailyTrafficIncludes(segment, dimension.keywords));
      const priceEvidence = dimension.id === "capital" ? dailyTrafficPriceEvidence(report) : "";
      const hasPriceEvidence = dimension.id === "capital" && Boolean(priceEvidence) && hasMarketSource;
      const hasQualifiedFact = factEvidence.length > 0;
      const ratingEvidence = hasQualifiedFact || hasPriceEvidence
        ? [...factEvidence, ...currentEvidence, ...judgmentEvidence, ...(hasPriceEvidence ? [priceEvidence] : [])]
        : [];
      let tone = dailyTrafficTone(ratingEvidence);
      if (dimension.id === "capital") tone = dailyTrafficCapitalTone(report, ratingEvidence, hasMarketSource);
      if (dimension.id === "risk") {
        tone = report.hasMaterialChange && report.sentiment === "风险" && hasReportSources
          ? "negative"
          : hasQualifiedFact
            ? dailyTrafficTone(ratingEvidence)
            : "neutral";
      }

      const freshJudgment = judgmentEvidence.filter(segment => !segment.includes("不变") && !segment.includes("维持"));
      const hasFreshEvidence = Boolean(report.hasMaterialChange) && (hasQualifiedFact || (hasPriceEvidence && freshJudgment.length > 0));
      const direction = hasFreshEvidence ? dailyTrafficDirection(freshJudgment) : "steady";
      const comparison = direction === "improved" ? "边际改善" : direction === "weakened" ? "边际转弱" : hasFreshEvidence ? "出现变化" : "不变";
      const evidence = hasQualifiedFact || hasPriceEvidence
        ? currentEvidence[0] || factEvidence[0] || judgmentEvidence[0] || priceEvidence
        : currentEvidence[0]
          ? `无新增事实；既有判断：${currentEvidence[0]}`
          : dimension.noEvidence;

      return {
        ...dimension,
        tone,
        comparison,
        comparisonTone: direction,
        evidence: compactDailyTrafficEvidence(evidence)
      };
    });

    const riskTone = rows.find(row => row.id === "risk")?.tone || "neutral";
    const toneValue = { positive: 1, neutral: 0, negative: -1 };
    const dimensionTotal = rows.reduce((total, row) => total + toneValue[row.tone], 0);
    let overallTone = report.hasMaterialChange && hasReportSources
      ? report.sentiment === "机会" ? "positive" : report.sentiment === "风险" ? "negative" : dimensionTotal > 1 ? "positive" : dimensionTotal < -1 ? "negative" : "neutral"
      : "neutral";
    if (riskTone === "negative" && overallTone === "positive") overallTone = "neutral";
    const overallDirection = report.hasMaterialChange ? dailyTrafficDirection(judgmentSegments) : "steady";

    rows.push({
      id: "overall",
      label: "综合",
      icon: "pulse",
      tone: overallTone,
      comparison: overallDirection === "improved" ? "边际改善" : overallDirection === "weakened" ? "边际转弱" : "不变",
      comparisonTone: overallDirection,
      evidence: compactDailyTrafficEvidence(report.currentJudgment || report.status || report.conclusion || "维持原判断")
    });
    return rows;
  }

  function dailyTrafficRatingLabel(row, riskTone) {
    if (row.tone === "positive") return "偏积极";
    if (row.tone === "negative") return "偏消极";
    if (row.id === "overall" && riskTone === "negative") return "中性偏谨慎";
    return "中性/待验证";
  }

  function renderDailyTrafficLightSection({ research, report, stock }) {
    const rows = report ? buildDailyTrafficRows(report) : [];
    const riskTone = rows.find(row => row.id === "risk")?.tone || "neutral";
    const sourceCount = Array.isArray(report?.sources) ? report.sources.length : 0;
    return `
      <section class="daily-page-section daily-traffic-section" aria-labelledby="daily-traffic-title">
        <header class="daily-page-section-header">
          <div>
            <h2 id="daily-traffic-title">个股红绿灯</h2>
            <p>${escapeHtml(stock.name)} ${escapeHtml(stock.code)} · 六维事实信号与边际变化</p>
          </div>
          ${research?.asOfTradeDate ? `<time datetime="${escapeHtml(research.asOfTradeDate)}">${escapeHtml(research.asOfTradeDate)} 交易日</time>` : ""}
        </header>
        ${report ? `
          <article class="daily-traffic-report" data-traffic-stock="${escapeHtml(report.code)}">
            <div class="daily-traffic-table" role="table" aria-label="${escapeHtml(report.name)}个股红绿灯">
              <div class="daily-traffic-row daily-traffic-head" role="row">
                <span role="columnheader">维度</span>
                <span role="columnheader">今日评级</span>
                <span role="columnheader">较昨日</span>
                <span role="columnheader">边际变化</span>
              </div>
              ${rows.map(row => `
                <div class="daily-traffic-row daily-traffic-${row.tone} ${row.id === "overall" ? "daily-traffic-overall" : ""}" role="row" data-traffic-dimension="${row.id}">
                  <div class="daily-traffic-dimension" role="cell"><span>${icon(row.icon)}</span><strong>${row.label}</strong></div>
                  <div class="daily-traffic-rating" role="cell"><span class="daily-traffic-rating-icon">${icon("pulse")}</span><strong>${dailyTrafficRatingLabel(row, riskTone)}</strong></div>
                  <div class="daily-traffic-comparison daily-traffic-comparison-${row.comparisonTone}" role="cell"><small>较昨日</small><strong>${row.comparison}</strong></div>
                  <div class="daily-traffic-evidence" role="cell"><small>边际变化</small><span>${escapeHtml(row.evidence)}</span></div>
                </div>`).join("")}
            </div>
            <footer class="daily-traffic-footer">
              <div aria-label="红绿灯图例"><span class="positive">偏积极</span><span class="neutral">中性/待验证</span><span class="negative">偏消极</span></div>
              <small>基于当日研读、${sourceCount} 条事实来源与真实行情自动归类；无对应事实时保持中性/待验证。</small>
            </footer>
          </article>` : `
          <div class="daily-research-empty" role="status">
            <strong>${escapeHtml(stock.name)}暂无红绿灯数据</strong>
            <span>请从左侧自选股导航选择已有报告的股票；数据缺失不会被替代为中性、利好或利空。</span>
          </div>`}
      </section>`;
  }

  function renderDailyResearchStock(report) {
    const tone = ({
      "机会": "opportunity",
      "风险": "risk",
      "融资/摊薄": "financing",
      "融资或摊薄": "financing",
      "中性": "neutral"
    })[report.sentiment] || "neutral";
    const sourceLinks = (report.sources || []).map(source => ({ ...source, safeUrl: specificSourceUrl(source.url) })).filter(source => source.safeUrl);
    if (!report.hasMaterialChange) {
      return `
        <article class="daily-research-report daily-research-steady" data-research-stock="${escapeHtml(report.code)}">
          <div class="daily-research-identity"><div><h3>${escapeHtml(report.name)}</h3><span>${escapeHtml(report.code)} · ${escapeHtml(report.sector)}</span></div><span class="daily-research-change-state">判断维持</span></div>
          <div class="daily-research-no-change"><h4>今日无重大变化，原判断维持。</h4><p>${escapeHtml(report.currentJudgment || report.status)}</p><small>下一验证：${escapeHtml(report.nextValidation || "等待新的重大事实或关键条件触发")}</small></div>
        </article>`;
    }
    const importantChanges = Array.isArray(report.importantChanges) ? report.importantChanges : [];
    return `
      <article class="daily-research-report daily-research-${tone}" data-research-stock="${escapeHtml(report.code)}">
        <header class="daily-research-lead daily-radar-lead">
          <div class="daily-research-identity"><div><h3>${escapeHtml(report.name)}</h3><span>${escapeHtml(report.code)} · ${escapeHtml(report.sector)}</span></div><span class="daily-research-sentiment">${escapeHtml(report.sentiment || "中性")}</span></div>
          <div class="daily-research-headline"><h4>${escapeHtml(report.conclusion || report.headline)}</h4><p>${escapeHtml(report.currentJudgment || report.status)}</p></div>
        </header>
        <section class="daily-radar-facts"><h4>事实变化 <span>事实</span></h4><ul>${importantChanges.map(item => `<li><small>${escapeHtml(item.category)} · 事实</small><p>${escapeHtml(item.fact)}</p></li>`).join("")}</ul></section>
        <div class="daily-research-reading-grid daily-radar-analysis">
          <section><h4>为什么重要 <span>分析</span></h4><p>${escapeHtml(report.whyImportant)}</p></section>
          <section><h4>投资判断变化 <span>分析</span></h4><dl><div><dt>昨日</dt><dd>${escapeHtml(report.previousJudgment)}</dd></div><div><dt>今日</dt><dd>${escapeHtml(report.judgmentChange)}</dd></div><div><dt>当前</dt><dd>${escapeHtml(report.currentJudgment || report.status)}</dd></div></dl></section>
        </div>
        <section class="daily-radar-next"><h4>下一验证条件</h4><p>${escapeHtml(report.nextValidation)}</p></section>
        ${report.profitValuationImpact ? `<section class="daily-radar-valuation"><h4>盈利预测 / 估值影响 <span>分析</span></h4><p>${escapeHtml(report.profitValuationImpact)}</p></section>` : ""}
        ${sourceLinks.length ? `
          <details class="daily-research-sources">
            <summary>事实来源（${sourceLinks.length}）</summary>
            <ul>${sourceLinks.map(source => `<li><a href="${escapeHtml(source.safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title)}</a><span>${escapeHtml(source.kind || "")} ${escapeHtml(source.publisher || "")} ${escapeHtml(source.date || "")}</span></li>`).join("")}</ul>
          </details>` : ""}
      </article>`;
  }

  function renderCalendarView() {
    const account = accountStorage.getAccount();
    const allReminders = currentMonthCalendarReminders();
    const visibleReminders = calendarReminderMessages();
    const filteredByStock = state.filters.stock !== "all";
    const summaryReminders = filteredByStock ? visibleReminders : allReminders;
    const reminderStocks = new Set(summaryReminders.map(message => String(message.trackingStockId))).size;
    const unread = summaryReminders.filter(messageIsUnread).length;
    const today = shanghaiDateParts();
    const monthLabel = `${today.year}年${today.month}月`;
    return `
      <section class="global-view daily-digest-view calendar-view">
        <header class="global-header daily-digest-header">
          <div class="global-title-icon">${icon("calendar")}</div>
          <div>
            <p>${account.signedIn ? "登录账号自选股" : "当前浏览器自选股"} · 上海时间</p>
            <h2>个股日历</h2>
            <span>${filteredByStock ? `仅显示 ${escapeHtml(selectedStock().name)}` : `汇总 ${data.stocks.length} 只自选股`}在${monthLabel}尚未到期的公司事项</span>
          </div>
          <div class="daily-digest-summary" aria-label="个股日历汇总">
            <span class="neutral"><b>${summaryReminders.length}</b>本月提醒</span>
            <span class="neutral"><b>${reminderStocks}</b>只股票</span>
            <span class="neutral"><b>${unread}</b>未读</span>
            <small><b>${summaryReminders[0] ? `最近 ${formatDateTime(summaryReminders[0].publishedAt)}` : "本月暂无提醒"}</b><span>仅显示本月未到期事项</span></small>
          </div>
        </header>
        ${renderMessageHeader("calendar")}
        ${renderDailyDigestFilters(false, "个股日历")}
        ${renderCalendarMonth(visibleReminders)}
      </section>`;
  }

  function renderCalendarMonth(messages) {
    const today = shanghaiDateParts();
    const daysInMonth = new Date(Date.UTC(today.year, today.month, 0)).getUTCDate();
    const firstWeekday = new Date(Date.UTC(today.year, today.month - 1, 1)).getUTCDay();
    const leadingEmptyDays = (firstWeekday + 6) % 7;
    const messagesByDay = new Map();
    messages.forEach(message => {
      const date = shanghaiDateParts(message.publishedAt);
      if (!date) return;
      if (!messagesByDay.has(date.day)) messagesByDay.set(date.day, []);
      messagesByDay.get(date.day).push(message);
    });
    const cells = Array.from({ length: leadingEmptyDays }, () => '<div class="calendar-day calendar-day-outside" aria-hidden="true"></div>');
    const weekdayLabels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(Date.UTC(today.year, today.month - 1, day));
      const ordinal = Math.floor(date.getTime() / 86400000);
      const dayMessages = messagesByDay.get(day) || [];
      const dateValue = `${today.year}-${String(today.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const classNames = [
        "calendar-day",
        ordinal === today.ordinal ? "today" : "",
        ordinal < today.ordinal ? "past" : "",
        dayMessages.length ? "has-events" : ""
      ].filter(Boolean).join(" ");
      cells.push(`
        <section class="${classNames}" aria-label="${today.month}月${day}日${dayMessages.length ? `，${dayMessages.length}项提醒` : "，无提醒"}">
          <header class="calendar-day-header">
            <time datetime="${dateValue}"><b>${day}</b><span>${weekdayLabels[date.getUTCDay()]}</span></time>
            ${ordinal === today.ordinal ? '<span class="calendar-today-label">今天</span>' : ""}
          </header>
          <div class="calendar-day-events">
            ${dayMessages.length ? dayMessages.map(renderCalendarEvent).join("") : '<span class="calendar-day-empty-state">—</span>'}
          </div>
        </section>`);
    }
    while (cells.length % 7) cells.push('<div class="calendar-day calendar-day-outside" aria-hidden="true"></div>');
    return `
      <section class="calendar-month-board" aria-label="${today.year}年${today.month}月个股日历">
        <header class="calendar-month-heading">
          <div><span>本月日程</span><strong>${today.year}年${today.month}月</strong></div>
          <div class="calendar-month-legend" aria-label="状态说明">
            <span><i class="unread"></i>未读</span>
            <span><i class="read"></i>已读</span>
          </div>
        </header>
        <div class="calendar-weekdays" aria-hidden="true">
          ${["一", "二", "三", "四", "五", "六", "日"].map(day => `<span>周${day}</span>`).join("")}
        </div>
        <div class="calendar-month-grid">${cells.join("")}</div>
      </section>`;
  }

  function calendarStockTone(message) {
    const key = String(message.trackingStockCode || message.trackingStockId || "stock");
    let hash = 0;
    for (let index = 0; index < key.length; index += 1) {
      hash = ((hash * 31) + key.charCodeAt(index)) >>> 0;
    }
    return hash % 6;
  }

  function renderCalendarEvent(message) {
    const scopeId = messageScopeId(message);
    const unread = isUnread(message, scopeId);
    const stockName = message.trackingStockName || message.trackingStockCode || "自选股";
    const stockCode = message.trackingStockCode || "";
    return `
      <article class="calendar-event stock-tone-${calendarStockTone(message)} ${unread ? "unread" : "read"}">
        <div class="calendar-event-meta">
          <button class="calendar-event-stock" type="button" data-action="select-stock" data-stock-id="${escapeHtml(message.trackingStockId)}" title="查看${escapeHtml(stockName)}动态">
            <i aria-hidden="true"></i><b>${escapeHtml(stockName)}</b><span>${escapeHtml(stockCode)}</span>
          </button>
          <button class="calendar-event-read ${unread ? "" : "checked"}" type="button"
            data-action="toggle-message-read" data-message-id="${escapeHtml(message.id)}" data-message-scope="${escapeHtml(scopeId)}"
            role="checkbox" aria-label="${unread ? "标记为已读" : "取消已读"}" aria-checked="${!unread}">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.2l2.8 2.8 6.2-6.2"/></svg>
          </button>
        </div>
        <strong class="calendar-event-title">${escapeHtml(message.title)}</strong>
      </article>`;
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    if (state.viewMode !== "stock" && VIEW_MODES.includes(state.viewMode)) {
      url.searchParams.set("view", state.viewMode);
      url.searchParams.set("stock", state.selectedStockId);
      url.searchParams.delete("category");
    } else {
      url.searchParams.delete("view");
      url.searchParams.set("stock", state.selectedStockId);
    }
    if (state.viewMode === "operation-advice") url.searchParams.delete("period");
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
          <label class="stock-search">
            ${icon("search")}
            <input id="stock-search" type="search" value="${escapeHtml(state.query)}" placeholder="名称 / 代码 / 拼音首字母" autocomplete="off">
          </label>
        </div>
        <div class="watchlist-label">${query ? `搜索股票 · 全量 ${universeCount.toLocaleString("zh-CN")} 只` : `我的自选 · ${data.stocks.length} 只`}</div>
        <div class="watchlist-items">
          ${watchlistAggregateView() && !query ? renderAllStocksFilter() : ""}
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

  function renderAllStocksFilter() {
    const active = state.filters.stock === "all";
    const unread = data.stocks.reduce((total, item) => total + unreadCount(item), 0);
    return `
      <div class="watchlist-item watchlist-all-filter ${active ? "selected" : ""}">
        <button class="watchlist-select" type="button" data-action="select-all-stocks" aria-pressed="${active}">
          <span class="stock-identity"><strong>全部自选股</strong><small>显示全部重大消息</small></span>
          <span class="stock-change unavailable">${data.stocks.length} 只</span>
          <span class="stock-unread ${unread ? "" : "zero"}">${unread}</span>
        </button>
      </div>`;
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

  function renderStockItem(stock, selected) {
    const active = stock.id === selected.id && (!watchlistAggregateView() || state.filters.stock !== "all");
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
    return `
      <header class="position-header">
        <div class="quote-block">
          <div class="quote-title">
            <button class="quote-stock-identity ${state.activeGroup === "all" ? "selected" : ""}" type="button"
              data-action="show-all" aria-pressed="${state.activeGroup === "all"}" aria-label="查看${escapeHtml(stock.name)}全部动态">
              <h2>${escapeHtml(stock.name)}</h2><span>${stock.code}</span>
            </button>
            ${renderStockGroupTabs(stock)}
            <span class="quote-title-actions">
              <span class="market-badge ${stock.tracked ? "" : "static-data"}"><i></i>${stock.tracked ? "已加入自选" : "未加入自选"}</span>
              <button class="header-watchlist-action ${stock.tracked ? "remove" : "add"}" type="button"
                data-action="${stock.tracked ? "remove-watchlist" : "add-watchlist"}" data-stock-id="${stock.id}">
                ${icon(stock.tracked ? "remove" : "plus")}<span>${stock.tracked ? "移除" : "加入自选"}</span>
              </button>
            </span>
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
      </header>`;
  }

  function renderStockGroupTabs(stock) {
    return `<nav class="quote-group-tabs" aria-label="${escapeHtml(stock.name)}动态分类">
      ${stockGroups.filter(group => group.id !== "all").map(group => {
        const messages = messagesForGroup(stock, group).sort(sortByNewest);
        const unread = messages.filter(message => isUnread(message)).length;
        const selected = state.activeGroup === group.id;
        const latest = messages[0];
        const note = group.id === "health" ? "，建议仅供参考" : "";
        return `<button class="quote-group-tab ${selected ? "selected" : ""}" type="button"
          data-action="select-group" data-group="${group.id}" aria-pressed="${selected}"
          aria-label="${group.title}，${unread}条未读${note}" title="${latest ? `最新 ${formatDateTime(latest.publishedAt)}` : "暂无最新动态"}${note}">
          <span class="quote-group-icon">${icon(group.icon)}</span><span>${group.title}</span>
          <b class="quote-group-count ${unread ? "" : "zero"}">${unread}</b>
        </button>`;
      }).join("")}
    </nav>`;
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

  function renderMessageHeader(mode) {
    const group = activeGroup();
    const stock = selectedStock();
    const messages = mode === "macro"
      ? data.market.macroNews
      : mode === "daily"
        ? dailyDigestMessages()
        : mode === "calendar"
          ? calendarReminderMessages()
          : messagesForGroup(stock);
    const unread = messages.filter(messageIsUnread).length;
    const title = mode === "macro" ? "宏观大事件" : mode === "daily" ? "今日自选动态" : mode === "calendar" ? "日历提醒" : group.title;
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

  function renderDailyDigestFilters(showSentiment = true, viewLabel = "今日必读") {
    const stockOptions = data.stocks.filter(stock => stockMatchesSearch(stock, state.dailyStockQuery));
    return `
      <section class="message-filters daily-digest-filters" aria-label="${viewLabel}消息筛选">
        <div class="daily-stock-filter-row">
          <label class="daily-stock-search" for="daily-stock-search">
            ${icon("search")}
            <input id="daily-stock-search" type="search" value="${escapeHtml(state.dailyStockQuery)}" placeholder="搜索自选股名称或代码" autocomplete="off">
          </label>
          <div class="daily-stock-filter-chips" aria-label="按股票筛选">
            <button type="button" class="daily-stock-filter ${state.filters.stock === "all" ? "selected" : ""}" data-action="set-daily-stock" data-stock-id="all" aria-pressed="${state.filters.stock === "all"}">全部</button>
            ${stockOptions.map(stock => `
              <button type="button" class="daily-stock-filter ${String(state.filters.stock) === String(stock.id) ? "selected" : ""}" data-action="set-daily-stock" data-stock-id="${escapeHtml(stock.id)}" aria-pressed="${String(state.filters.stock) === String(stock.id)}">
                <b>${escapeHtml(stock.name)}</b><span>${escapeHtml(stock.code)}</span>
              </button>`).join("")}
          </div>
        </div>
        ${showSentiment ? renderFilterGroup("消息类型", "sentiment", [
          ["all", "全部"],
          ["利好", "利好"],
          ["利空", "利空"],
          ["中性", "中性"]
        ]) : ""}
        ${(showSentiment && state.filters.sentiment !== "all") || state.filters.stock !== "all" || state.dailyStockQuery ? `<button class="clear-filters" type="button" data-action="clear-filters">清除筛选</button>` : ""}
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

  function renderTimeline(messages, options = {}) {
    const emptyTitle = options.emptyTitle || "没有符合条件的信息";
    const emptyText = options.emptyText || "请调整筛选条件后再查看";
    return `
      <section class="message-timeline" aria-label="最新消息时间流" ${options.showDigestOrigin ? 'tabindex="0"' : ""}>
        ${messages.length ? messages.map(message => renderMessage(message, options)).join("") : `
          <div class="timeline-empty"><strong>${escapeHtml(emptyTitle)}</strong><span>${escapeHtml(emptyText)}</span></div>`}
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

  function renderMessage(message, options = {}) {
    const scopeId = messageScopeId(message);
    const unread = isUnread(message, scopeId);
    const sourceUrl = specificSourceUrl(message.sourceUrl);
    const stockBadge = message.trackingStockId && options.showStockBadge !== false
      ? `<button class="message-stock-link" type="button" data-action="select-stock" data-stock-id="${escapeHtml(message.trackingStockId)}" title="查看${escapeHtml(message.trackingStockName)}全部动态"><b>${escapeHtml(message.trackingStockName)}</b><span>${escapeHtml(message.trackingStockCode)}</span></button>`
      : "";
    const eventBadge = message.eventLabel
      ? `<span class="message-tag event-kind-${escapeHtml(message.eventKind || "reminder")}">${escapeHtml(message.eventLabel)}</span>`
      : "";
    const digestBadge = options.showDigestOrigin && message.dailyDigestKind
      ? `<span class="daily-message-origin daily-message-origin-${escapeHtml(message.dailyDigestKind)}">
          ${icon(message.dailyDigestKind === "today" ? "news" : "digest")}
          <span>${message.dailyDigestKind === "today" ? "今日新增" : "未读补看"}</span>
        </span>`
      : "";
    const sourceLink = sourceUrl
      ? `<a class="message-source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">查看来源
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M17 13v6H5V7h6"/></svg>
        </a>`
      : "";
    return `
      <article class="message-row ${unread ? "unread" : "read"}">
        <span class="message-time-cell">
          <time datetime="${message.publishedAt}">${options.showFullDate ? formatDateTime(message.publishedAt) : formatMessageTime(message.publishedAt)}</time>
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
              ${stockBadge}
              <strong>${escapeHtml(message.title)}</strong>
              <span class="message-badges">
                ${digestBadge}
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
    if (!marketTechnicalPage) {
      return `<section class="ta-empty-state"><div class="ta-empty-content"><h2>大盘技术分析模块未能加载</h2><p>请刷新页面后重试。</p></div></section>`;
    }
    return marketTechnicalPage.render(MARKET_INDEX, {
      variant: "market",
      allStocks: [],
      trackedStocks: [],
      trackedCodes: new Set()
    });
  }

  function resetForNavigation() {
    state.editField = null;
    state.saveError = "";
    state.filters = { sentiment: "all", date: "all", stock: "all" };
    state.dailyStockQuery = "";
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
      refreshDailyAfterRender = watchlistAggregateView();
    } else if (action === "select-stock") {
      state.selectedStockId = target.dataset.stockId;
      if (["daily", "calendar"].includes(state.viewMode)) state.filters.stock = state.selectedStockId;
      state.activeGroup = "all";
      technicalPage?.clearSearch();
      refreshCodeAfterRender = state.selectedStockId;
    } else if (action === "select-all-stocks") {
      state.filters.stock = "all";
      state.dailyStockQuery = "";
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
      const message = messageForScope(scopeId, messageId);
      if (message) {
        const value = readStateFor(scopeId);
        messageReadState.toggle(message, value);
        persistReadState(scopeId, value);
      }
    } else if (action === "mark-read") {
      const messages = state.viewMode === "macro"
        ? filteredMacroNews()
        : state.viewMode === "daily"
          ? dailyDigestMessages(false)
          : state.viewMode === "calendar"
            ? calendarReminderMessages()
            : filteredStockMessages(selectedStock());
      const messagesByScope = new Map();
      messages.forEach(message => {
        const scopeId = messageScopeId(message);
        if (!messagesByScope.has(scopeId)) messagesByScope.set(scopeId, []);
        messagesByScope.get(scopeId).push(message);
      });
      const advanceReadThrough = state.viewMode === "daily" && state.filters.sentiment === "all";
      if (advanceReadThrough && state.filters.stock === "all") {
        data.stocks.forEach(stock => {
          const scopeId = readStorageScope(stock.id);
          if (!messagesByScope.has(scopeId)) messagesByScope.set(scopeId, []);
        });
      }
      const readThroughAt = advanceReadThrough ? new Date().toISOString() : "";
      messagesByScope.forEach((scopedMessages, scopeId) => {
        const value = readStateFor(scopeId);
        messageReadState.markAll(scopedMessages, value, readThroughAt);
        persistReadState(scopeId, value);
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
      state.filters = { sentiment: "all", date: "all", stock: "all" };
      state.dailyStockQuery = "";
    } else if (action === "set-filter") {
      state.filters[target.dataset.filterKey] = target.dataset.filterValue;
    } else if (action === "set-daily-stock") {
      state.filters.stock = target.dataset.stockId || "all";
      state.dailyStockQuery = "";
    } else if (action === "refresh-all") {
      if (state.viewMode === "operation-advice" && operationAdvicePage) {
        void operationAdvicePage.refresh();
        return;
      }
      const dailyCodes = watchlistAggregateView() ? data.stocks.map(stock => stock.code) : undefined;
      refreshAllInformation({ force: true, feedCodes: dailyCodes });
      return;
    } else if (state.viewMode === "ai-selection" && aiSelectionPage) {
      const handled = aiSelectionPage.handleAction(target);
      if (handled === "async") return;
      if (!handled) return;
    } else if (state.viewMode === "score-matrix" && scoreMatrixPage) {
      const handled = scoreMatrixPage.handleAction(target);
      if (handled === "async") return;
      if (!handled) return;
    } else if (state.viewMode === "operation-advice" && operationAdvicePage) {
      const handled = operationAdvicePage.handleAction(target);
      if (handled === "async") return;
      if (!handled) return;
    } else if (state.viewMode === "market" && marketTechnicalPage) {
      const handled = marketTechnicalPage.handleAction(target);
      if (handled === "async") return;
      if (!handled) return;
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
    if (["stock-search", "daily-stock-search"].includes(event.target.id)) state.searchComposing = true;
    if (event.target.matches?.("[data-technical-search]")) state.technicalSearchComposing = true;
  }

  function handleCompositionEnd(event) {
    if (event.target.id === "daily-stock-search") {
      state.searchComposing = false;
      state.dailyStockQuery = event.target.value;
      state.filters.stock = "all";
      render();
      const input = document.getElementById("daily-stock-search");
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
      return;
    }
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
    if (state.viewMode === "score-matrix" && scoreMatrixPage?.handleInput(event.target)) return;
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
    if (event.target.id === "daily-stock-search") {
      const cursor = event.target.selectionStart;
      state.dailyStockQuery = event.target.value;
      state.filters.stock = "all";
      if (event.isComposing || state.searchComposing) return;
      render();
      const input = document.getElementById("daily-stock-search");
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
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
