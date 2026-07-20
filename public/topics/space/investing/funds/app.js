"use strict";

const DATA_ROOT = "./data";
const STORAGE = {
  theme: "fund-dashboard-theme-v1",
  kpiColumns: "fund-dashboard-kpi-columns-v1",
  managerPreferences: "fund-dashboard-manager-preferences-v2",
  sharedAuth: "mywebsite.site-auth-session.v1"
};

const state = {
  activeView: "funds",
  manifest: null,
  funds: null,
  managers: null,
  managerDetails: null,
  managerDetailsById: new Map(),
  managerProfiles: null,
  holdings: null,
  holdingFundIndex: null,
  guide: null,
  loads: new Map(),
  preferences: new Map(),
  preferenceEditorId: null,
  preferenceSync: "local",
  fund: { type: "all", query: "", sort: ["return1y", "desc"], page: 1, pageSize: 50, custom: null },
  kpi: { query: "", sort: ["manager", "asc"], page: 1, pageSize: 25, filters: new Map(), columns: [] },
  score: { query: "", sort: ["trialRank", "asc"], page: 1, pageSize: 25, filters: new Map(), draftWeights: [40, 30, 30], appliedWeights: [40, 30, 30], weightsDirty: false },
  profile: { primaryId: null, compareId: null, period: "1y", page: 1, pageSize: 25, sort: ["relation", "asc"] },
  preview: { fundTrigger: null, managerTrigger: null, managerId: null, radarPeriod: "3y" },
  holdingsView: { selectedIds: [], query: "", reportPeriod: "all", stockQuery: "", minOverlap: "2", minWeight: 0, rows: [], selectedStock: null },
  guideView: { tab: "data_notes" }
};

const aliases = {
  annualReturn: ["annualized_return", "annual_return", "年化收益率"],
  annualExcess: ["annualized_excess_return", "annualized_excess", "年化超额收益"],
  upsideCapture: ["upside_capture", "up_capture", "上行捕获率"],
  peerRank: ["peer_rank_percentile", "peer_percentile", "同类排名分位"],
  heavyContribution: ["heavy_holding_contribution_return", "top_holding_contribution", "重仓股贡献收益"],
  maxDrawdown: ["max_drawdown", "maximum_drawdown", "最大回撤"],
  downsideCapture: ["downside_capture", "down_capture", "下行捕获率"],
  holdingConcentration: ["holding_concentration", "holdings_concentration", "持仓集中度"],
  industryConcentration: ["industry_concentration", "industry_hhi", "行业集中度"],
  maxStockWeight: ["max_stock_weight", "largest_stock_weight", "个股最大权重"],
  alphaPeer: ["alpha_peer", "alpha_peer_median", "alpha", "阿尔法 Alpha（同类中位基准）", "阿尔法 Alpha"],
  alpha300: ["alpha_h00300", "alpha_hs300", "alpha_csi300_total_return", "hs300_alpha", "阿尔法 Alpha（沪深300全收益）"],
  sharpe: ["sharpe_ratio", "sharpe", "夏普比率"],
  calmar: ["calmar_ratio", "calmar", "卡玛比率"],
  rollingExcessWinRate: ["rolling_excess_win_rate", "rolling_win_rate", "滚动超额胜率"],
  turnover: ["turnover_rate", "turnover", "基金换手率"],
  poolScale: ["current_pool_scale_yi", "pool_scale_yi", "current_scale_yi", "universe_scale_100m", "当前池内规模合计（亿元，重复归因）"],
  currentCount: ["current_pool_fund_count", "universe_fund_count", "当前池内基金数量"],
  currentSoloCount: ["current_solo_fund_count", "当前单人管理基金数"],
  currentJointCount: ["current_joint_fund_count", "当前共同管理基金数"],
  currentAllCount: ["current_all_fund_count", "all_current_fund_count", "current_fund_count", "当前全部管理基金数"],
  historicalCount: ["historical_fund_count", "historical_managed_fund_count", "历史管理基金数"],
  soloHistoricalCount: ["historical_solo_fund_count", "historical_funds_with_solo_period", "存在单人管理期的历史基金数"],
  jointHistoricalCount: ["historical_joint_only_fund_count", "historical_funds_joint_only", "全程共同管理历史基金数"],
  includedMetricCount: ["included_metric_product_count", "纳入经理指标产品数"],
  soloDays: ["solo_sample_days", "single_manager_sample_days", "单人样本天数"],
  top10Dispersion: ["top10_holding_dispersion", "前十大持仓离散度"],
  independentPortfolios: ["effective_independent_portfolios", "effective_portfolio_count", "有效独立组合数"],
  comparableFunds: ["comparable_fund_count", "可比较基金数"],
  comparablePairs: ["comparable_pair_count", "可比较基金对数"],
  stockContribution: ["top_holding_contribution_return", "重仓股贡献收益"],
  academic: ["academic_background", "academic_text", "学术背景（能力圈）"],
  conduct: ["personal_conduct", "个人品行"]
};

const KPI_FIELDS = [
  { key: "manager", label: "基金经理", group: "基础信息", kind: "manager", fixed: true },
  { key: "managerId", label: "经理ID", group: "基础信息", kind: "text" },
  { key: "company", label: "基金公司", group: "基础信息", kind: "text" },
  { key: "fundType", label: "基金类型", group: "基础信息", kind: "text" },
  { key: "currentFunds", label: "当前池内基金名称", group: "基础信息", kind: "list" },
  { key: "experience", label: "从业经验（年）", group: "基础信息", kind: "number", decimals: 1 },
  { key: "poolScale", label: "基金规模（亿元）", group: "基础信息", kind: "number", decimals: 1 },
  { key: "annualReturn", label: "年化收益率", group: "进攻型", kind: "percent" },
  { key: "annualExcess", label: "年化超额收益", group: "进攻型", kind: "percent" },
  { key: "upsideCapture", label: "上行捕获率", group: "进攻型", kind: "percent" },
  { key: "peerRank", label: "同类排名分位", group: "进攻型", kind: "percent" },
  { key: "heavyContribution", label: "重仓股贡献收益", group: "进攻型", kind: "percent" },
  { key: "maxDrawdown", label: "最大回撤", group: "防御型", kind: "percent", risk: true },
  { key: "downsideCapture", label: "下行捕获率", group: "防御型", kind: "percent" },
  { key: "holdingConcentration", label: "持仓集中度", group: "防御型", kind: "percent" },
  { key: "industryConcentration", label: "行业集中度", group: "防御型", kind: "percent" },
  { key: "maxStockWeight", label: "个股最大权重", group: "防御型", kind: "percent" },
  { key: "alphaPeer", label: "α（同类中位）", group: "综合指标", kind: "percent" },
  { key: "alpha300", label: "α（沪深300）", group: "综合指标", kind: "percent" },
  { key: "sharpe", label: "夏普比率", group: "综合指标", kind: "number", decimals: 2 },
  { key: "calmar", label: "卡玛比率", group: "综合指标", kind: "number", decimals: 2 },
  { key: "turnover", label: "基金换手率", group: "综合指标", kind: "percent" },
  { key: "currentAllCount", label: "管理基金数量", group: "非收益指标", kind: "integer" },
  { key: "currentCount", label: "当前池内基金数", group: "非收益指标", kind: "integer" },
  { key: "currentSoloCount", label: "当前单人管理基金数", group: "非收益指标", kind: "integer" },
  { key: "currentJointCount", label: "当前共同管理基金数", group: "非收益指标", kind: "integer" },
  { key: "top10Dispersion", label: "前十大持仓离散度", group: "持仓与复杂度", kind: "percent" },
  { key: "independentPortfolios", label: "有效独立组合数", group: "持仓与复杂度", kind: "number", decimals: 1 },
  { key: "comparableFunds", label: "可比较基金数", group: "持仓与复杂度", kind: "integer" },
  { key: "comparablePairs", label: "可比较基金对数", group: "持仓与复杂度", kind: "integer" },
  { key: "historicalCount", label: "历史管理基金数", group: "履历与样本", kind: "integer" },
  { key: "soloHistoricalCount", label: "存在单人管理期的历史基金数", group: "履历与样本", kind: "integer" },
  { key: "jointHistoricalCount", label: "全程共同管理历史基金数", group: "履历与样本", kind: "integer" },
  { key: "includedMetricCount", label: "纳入经理指标产品数", group: "履历与样本", kind: "integer" },
  { key: "soloDays", label: "单人样本天数", group: "履历与样本", kind: "integer" },
  { key: "sampleYears", label: "单人样本年数", group: "履历与样本", kind: "number", decimals: 1 },
  { key: "academic", label: "学术背景（能力圈）", group: "非收益指标", kind: "text" },
  { key: "conduct", label: "个人品行", group: "非收益指标", kind: "text" },
  { key: "biography", label: "个人简介", group: "非收益指标", kind: "text" },
  { key: "currentReportDate", label: "持仓报告期", group: "持仓与复杂度", kind: "text" },
  { key: "topHoldings", label: "当前单人产品前五大持仓", group: "持仓与复杂度", kind: "list" }
];

const DEFAULT_KPI_COLUMNS = ["manager", "fundType", "currentFunds", "experience", "annualReturn", "annualExcess", "peerRank", "maxDrawdown", "alpha300", "sharpe", "calmar", "currentAllCount"];

const FUND_COLUMNS = [
  { key: "sequence", label: "序号", kind: "integer", sortable: false },
  { key: "code", label: "基金代码", kind: "text" },
  { key: "name", label: "基金名称", kind: "text" },
  { key: "type", label: "基金类型", kind: "text" },
  { key: "managers", label: "基金经理", kind: "list" },
  { key: "company", label: "基金公司", kind: "text" },
  { key: "scale", label: "规模（亿元）", kind: "number", decimals: 1 },
  { key: "returnYtd", label: "今年以来", kind: "percent" },
  { key: "return1y", label: "近1年", kind: "percent" },
  { key: "return2y", label: "近2年", kind: "percent" },
  { key: "return3y", label: "近3年", kind: "percent" },
  { key: "customReturn", label: "自定义", kind: "percent" }
];

const SCORE_COLUMNS = [
  { key: "trialRank", label: "试算排名", kind: "integer" },
  { key: "formalRank", label: "正式排名", kind: "integer" },
  { key: "rankDelta", label: "排名变化", kind: "signedInteger" },
  { key: "trialRating", label: "试算评级", kind: "text" },
  { key: "formalRating", label: "正式评级", kind: "text" },
  { key: "manager", label: "基金经理", kind: "manager" },
  { key: "company", label: "基金公司", kind: "text" },
  { key: "trialTotal", label: "试算总分", kind: "score" },
  { key: "formalTotal", label: "正式总分", kind: "score" },
  { key: "offense", label: "进攻分", kind: "score" },
  { key: "defense", label: "防守分", kind: "score" },
  { key: "composite", label: "综合分", kind: "score" },
  { key: "annualExcess", label: "年化超额收益", kind: "percent" },
  { key: "maxDrawdown", label: "最大回撤", kind: "percent", risk: true },
  { key: "alpha300", label: "α（沪深300）", kind: "percent" },
  { key: "sampleYears", label: "单人样本年数", kind: "number", decimals: 1 },
  { key: "eligibility", label: "资格 / 门槛", kind: "status" }
];

const PROFILE_FUND_COLUMNS = [
  { key: "relation", label: "关系", kind: "relation" },
  { key: "code", label: "基金代码", kind: "text" },
  { key: "name", label: "基金名称", kind: "text" },
  { key: "type", label: "类型", kind: "text" },
  { key: "tenure", label: "任职区间", kind: "text" },
  { key: "tenureDays", label: "单人样本天数", kind: "integer" },
  { key: "tenureReturn", label: "任职回报", kind: "percent" },
  { key: "annualReturn", label: "年化收益率", kind: "percent" },
  { key: "peerRank", label: "同类排名分位", kind: "percent" },
  { key: "holdingConcentration", label: "持仓集中度", kind: "percent" },
  { key: "industryConcentration", label: "行业集中度", kind: "percent" },
  { key: "maxStockWeight", label: "个股最大权重", kind: "percent" }
];

const FILTER_DEFS = [
  { key: "favorite", label: "收藏状态", category: "base", icon: "star", options: [["favorite", "只看收藏"]] },
  { key: "ability", label: "能力属性", category: "base", icon: "composite", options: [["offense", "进攻"], ["defense", "防守"], ["composite", "综合"]] },
  { key: "fundType", label: "基金类型", category: "base", icon: "base", options: [["stock", "股票型"], ["mixed", "偏股型"]] },
  { key: "poolScale", label: "基金规模", category: "base", icon: "base", options: [["lt2", "<2亿"], ["2to10", "2-10亿"], ["10to50", "10-50亿"], ["50to100", "50-100亿"], ["gte100", "≥100亿"], ["missing", "不可计算 / 数据不足"]] },
  { key: "experience", label: "从业经验", category: "base", icon: "base", options: [["lt2", "<2年"], ["2to5", "2-5年"], ["5to10", "5-10年"], ["gte10", "≥10年"], ["missing", "不可计算 / 数据不足"]] },
  { key: "annualReturn", label: "年化收益率", category: "offense", icon: "offense", options: returnBins() },
  { key: "annualExcess", label: "年化超额收益", category: "offense", icon: "offense", options: returnBins() },
  { key: "maxDrawdown", label: "最大回撤", category: "defense", icon: "defense", options: [["ltNeg50", "<-50%"], ["neg50to40", "-50%至-40%"], ["neg40to30", "-40%至-30%"], ["neg30to20", "-30%至-20%"], ["gteNeg20", "≥-20%"], ["missing", "不可计算 / 数据不足"]] }
];

const SCORE_FILTER_DEFS = [
  ...FILTER_DEFS,
  { key: "trialTotal", label: "试算总分", category: "score", icon: "score", options: [["gte80", "≥80分"], ["70to80", "70-80分"], ["60to70", "60-70分"], ["lt60", "<60分"], ["missing", "不可计算 / 数据不足"]] },
  { key: "trialRating", label: "试算评级", category: "score", icon: "score", options: [["A", "A"], ["B", "B"], ["C", "C"], ["D", "D"], ["missing", "未评级"]] },
  { key: "eligibility", label: "正式评分资格", category: "score", icon: "score", options: [["eligible", "具备正式评分资格"], ["ineligible", "不具备评分资格"]] },
  { key: "defenseGate", label: "防守固定门槛", category: "defense", icon: "defense", options: [["pass", "通过"], ["fail", "未通过"], ["pending", "指标不足，无法判断"]] },
  { key: "completeness", label: "10项指标完整性", category: "score", icon: "score", options: [["complete", "10项完整"], ["incomplete", "存在缺失"]] }
];

const RADAR_AXES = [
  { key: "alpha300", source: ["alpha_h00300", "alpha_hs300", "alpha300"], label: "α（沪深300）" },
  { key: "upsideCapture", source: ["upside_capture", "upsideCapture"], label: "上行捕获率" },
  { key: "maxDrawdown", source: ["max_drawdown", "maxDrawdown"], label: "最大回撤" },
  { key: "downsideCapture", source: ["downside_capture", "downsideCapture"], label: "下行捕获率" },
  { key: "sharpe", source: ["sharpe", "sharpe_ratio"], label: "夏普比率" },
  { key: "rollingExcessWinRate", source: ["rolling_excess_win_rate", "rollingWinRate"], label: "滚动超额胜率" }
];

const PERCENT_MANAGER_FIELDS = new Set([
  "annualReturn", "annualExcess", "upsideCapture", "peerRank", "heavyContribution",
  "maxDrawdown", "downsideCapture", "holdingConcentration", "industryConcentration",
  "maxStockWeight", "alphaPeer", "alpha300", "turnover", "top10Dispersion"
]);

document.addEventListener("DOMContentLoaded", init);

async function init() {
  restorePreferences();
  bindStaticEvents();
  if (location.protocol === "file:") {
    showDirectFileWarning();
    return;
  }
  renderColumnPicker();
  renderFilters("kpi", FILTER_DEFS);
  renderFilters("score", SCORE_FILTER_DEFS);
  await loadManifest();
  await initializePreferenceSync();
  await activateView(viewFromHash());
}

function showDirectFileWarning() {
  document.getElementById("protocol-warning").hidden = false;
  document.getElementById("data-freshness").textContent = "本地服务未启动";
  document.querySelector("main").hidden = true;
}

function restorePreferences() {
  const savedTheme = localStorage.getItem(STORAGE.theme);
  const theme = savedTheme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  updateThemeButton();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.kpiColumns) || "null");
    state.kpi.columns = Array.isArray(saved) ? sanitizeColumns(saved) : [...DEFAULT_KPI_COLUMNS];
  } catch {
    state.kpi.columns = [...DEFAULT_KPI_COLUMNS];
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE.managerPreferences) || "{}");
    Object.entries(saved && typeof saved === "object" ? saved : {}).forEach(([managerId, preference]) => {
      if (managerId && preference && typeof preference === "object") state.preferences.set(managerId, normalizePreference(managerId, preference));
    });
  } catch {
    state.preferences = new Map();
  }
}

function bindStaticEvents() {
  document.querySelectorAll(".dashboard-tab").forEach(button => button.addEventListener("click", () => {
    location.hash = button.dataset.view;
  }));
  window.addEventListener("hashchange", () => activateView(viewFromHash()));
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.querySelectorAll("[data-clear]").forEach(button => button.addEventListener("click", () => {
    const input = document.getElementById(button.dataset.clear);
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }));
  bindSearch("fund-search", value => { state.fund.query = value; state.fund.page = 1; renderFunds(); });
  bindSearch("manager-search", value => { state.kpi.query = value; state.kpi.page = 1; renderKpi(); });
  bindSearch("score-search", value => { state.score.query = value; state.score.page = 1; renderScore(); });
  bindSearch("holdings-manager-search", value => { state.holdingsView.query = value; renderHoldingsManagerOptions(); });
  bindSearch("holdings-stock-search", value => { state.holdingsView.stockQuery = value; renderHoldingsAnalysis(); });
  document.getElementById("fund-type-tabs").addEventListener("click", event => {
    const button = event.target.closest("button[data-fund-type]");
    if (!button) return;
    state.fund.type = button.dataset.fundType;
    state.fund.page = 1;
    document.querySelectorAll("#fund-type-tabs button").forEach(item => item.classList.toggle("active", item === button));
    renderFunds();
  });
  document.querySelectorAll("[data-open-rail]").forEach(button => button.addEventListener("click", () => document.getElementById(`${button.dataset.openRail}-filter-rail`).classList.add("is-open")));
  document.querySelectorAll("[data-close-rail]").forEach(button => button.addEventListener("click", () => document.getElementById(`${button.dataset.closeRail}-filter-rail`).classList.remove("is-open")));
  document.querySelectorAll("[data-reset-filters]").forEach(button => button.addEventListener("click", () => resetFilters(button.dataset.resetFilters)));
  document.getElementById("column-picker-open").addEventListener("click", () => document.getElementById("column-dialog").showModal());
  document.getElementById("column-defaults").addEventListener("click", restoreDefaultColumns);
  document.getElementById("column-search").addEventListener("input", filterColumnPicker);
  document.getElementById("custom-return-apply").addEventListener("click", loadCustomReturns);
  document.querySelectorAll("[data-export]").forEach(button => button.addEventListener("click", () => exportCurrent(button.dataset.export)));
  bindWeightControls();
  bindCombobox("primary");
  bindCombobox("compare");
  document.getElementById("compare-manager-open").addEventListener("click", () => {
    document.getElementById("compare-manager-search").value = "";
    document.getElementById("compare-dialog").showModal();
    document.getElementById("compare-manager-search").focus();
  });
  document.getElementById("radar-periods").addEventListener("click", event => {
    const button = event.target.closest("button[data-period]");
    if (!button) return;
    state.profile.period = button.dataset.period;
    syncPeriodTabs("radar-periods", state.profile.period);
    renderProfileRadar();
  });
  ["report-period", "min-overlap", "min-weight"].forEach(key => {
    document.getElementById(`holdings-${key}`).addEventListener("change", event => {
      const stateKey = key === "report-period" ? "reportPeriod" : key === "min-overlap" ? "minOverlap" : key === "min-weight" ? "minWeight" : key;
      state.holdingsView[stateKey] = key === "min-weight" ? Math.max(0, Number(event.target.value) || 0) : event.target.value;
      renderHoldingsAnalysis();
    });
  });
  const holdingsManagerDialog = document.getElementById("holdings-manager-dialog");
  document.getElementById("holdings-manager-open").addEventListener("click", () => {
    state.holdingsView.query = "";
    document.getElementById("holdings-manager-search").value = "";
    renderHoldingsFavorites();
    renderHoldingsManagerOptions();
    holdingsManagerDialog.showModal();
    document.getElementById("holdings-manager-search").focus();
  });
  document.getElementById("holdings-manager-close").addEventListener("click", () => holdingsManagerDialog.close());
  holdingsManagerDialog.addEventListener("click", event => { if (event.target === holdingsManagerDialog) holdingsManagerDialog.close(); });
  document.getElementById("holdings-manager-clear").addEventListener("click", clearHoldingsManagers);
  window.addEventListener("site-auth-change", event => renderSharedAuthStatus(event.detail));
  window.addEventListener("storage", event => { if (event.key === STORAGE.sharedAuth) initializePreferenceSync(); });
  document.getElementById("holding-drilldown-close").addEventListener("click", () => { state.holdingsView.selectedStock = null; document.getElementById("holding-drilldown").hidden = true; });
  document.getElementById("guide-tabs").addEventListener("click", event => {
    const button = event.target.closest("button[data-guide-tab]");
    if (!button) return;
    state.guideView.tab = button.dataset.guideTab;
    document.querySelectorAll("#guide-tabs button").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    renderGuide();
  });
  document.getElementById("preference-save").addEventListener("click", savePreferenceEditor);
  document.getElementById("preference-reset").addEventListener("click", resetPreferenceSuggestion);
  bindPreviewDialog("fund-preview-dialog", "fund-preview-close", "fundTrigger");
  bindPreviewDialog("manager-preview-dialog", "manager-preview-close", "managerTrigger");
  document.getElementById("manager-preview-periods").addEventListener("click", event => {
    const button = event.target.closest("button[data-period]");
    if (!button) return;
    state.preview.radarPeriod = button.dataset.period;
    syncPeriodTabs("manager-preview-periods", state.preview.radarPeriod);
    renderManagerPreviewRadar();
  });
  document.getElementById("manager-preview-detail").addEventListener("click", openManagerDetailFromPreview);
}

function bindSearch(id, callback) {
  let timer;
  document.getElementById(id).addEventListener("input", event => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(event.target.value.trim()), 120);
  });
}

async function activateView(name) {
  const view = ["funds", "kpi", "score", "profile", "holdings", "guide"].includes(name) ? name : "funds";
  state.activeView = view;
  document.querySelectorAll("[data-view-panel]").forEach(panel => {
    const active = panel.dataset.viewPanel === view;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  document.querySelectorAll(".dashboard-tab").forEach(button => {
    const active = button.dataset.view === view;
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  if (location.hash.slice(1) !== view) history.replaceState(null, "", `#${view}`);
  try {
    if (view === "funds") { if (!state.funds) renderTableMessage("fund-table-body", 12, "正在载入3,227只基金…", "首次载入需要读取完整基金清单。"); await loadFunds(); renderFunds(); }
    if (view === "kpi") { if (!state.managers) renderTableMessage("kpi-table-body", state.kpi.columns.length, "正在载入基金经理KPI…", "按东方财富经理ID读取完整经理清单。"); await loadManagers(); renderKpi(); }
    if (view === "score") { if (!state.managers) renderTableMessage("score-table-body", SCORE_COLUMNS.length, "正在检查评分资格…", "缺失正式指标的经理不会生成分数。"); await loadManagers(); renderScore(); }
    if (view === "profile") { await loadManagers(); prepareProfileSearch(); if (state.profile.primaryId) await renderProfile(); }
    if (view === "holdings") { await Promise.all([loadManagers(), loadHoldings()]); renderHoldings(); }
    if (view === "guide") { await loadGuide(); renderGuide(); }
  } catch (error) {
    showViewError(view, error);
  }
}

function viewFromHash() { return location.hash.replace(/^#/, "") || "funds"; }

async function loadManifest() {
  try {
    state.manifest = await fetchJson(`${DATA_ROOT}/manifest.json`);
    const stamp = state.manifest.generated_at || state.manifest.generatedAt || "";
    document.getElementById("data-freshness").textContent = stamp ? `数据更新 ${formatDateTime(stamp)}` : "数据时间未提供";
    configureCustomReturn();
  } catch (error) {
    state.manifest = null;
    document.getElementById("data-freshness").textContent = "清单信息未载入";
    configureCustomReturn();
  }
}

function configureCustomReturn() {
  const button = document.getElementById("custom-return-apply");
  const capability = state.manifest?.capabilities?.custom_returns === true || Boolean(state.manifest?.custom_return_endpoint);
  button.disabled = !capability;
  if (!capability) document.getElementById("custom-return-status").textContent = "自定义区间待接入按需计算服务；静态版不估算、不填入假值。";
}

async function loadFunds() {
  if (state.funds) return state.funds;
  const payload = await loadOnce("funds", () => fetchJson(filePath("funds.json")));
  const records = payloadArray(payload, ["rows", "funds", "records", "data"]);
  state.funds = records.map(normalizeFund);
  return state.funds;
}

async function loadManagers() {
  if (state.managers) return state.managers;
  const payload = await loadOnce("managers", () => fetchJson(filePath("managers.json")));
  const records = payloadArray(payload, ["rows", "managers", "records", "data"]);
  state.managers = records.map(normalizeManager);
  return state.managers;
}

async function loadManagerDetails(managerId) {
  if (state.managerDetailsById.has(managerId)) return state.managerDetailsById.get(managerId);
  const shardConfig = state.manifest?.manager_detail_shards || state.manifest?.manager_details_shards || state.manifest?.detail_shards || state.manifest?.manager_details?.shards;
  if (shardConfig) {
    const count = Number(shardConfig.count || shardConfig.shard_count || 16);
    const index = Number(BigInt(managerId) % BigInt(count));
    const files = shardConfig.files || shardConfig.shards || [];
    const entry = files.find(item => Number(item.index ?? item.shard ?? item.shard_id ?? item.id) === index);
    const name = entry?.name || entry?.file || entry?.path || `manager_details_${String(index).padStart(2, "0")}.json`;
    const payload = await loadOnce(`managerDetailsShard${index}`, () => fetchJson(`${DATA_ROOT}/${name}`));
    const rows = payloadArray(payload, ["rows", "manager_details", "details", "records", "data"]);
    const selected = rows.filter(item => stringValue(item.manager_id ?? item.managerId) === managerId);
    state.managerDetailsById.set(managerId, selected);
    return selected;
  }
  if (!state.managerDetails) {
    const payload = await loadOnce("managerDetails", () => fetchJson(filePath("manager_details.json")));
    state.managerDetails = payloadArray(payload, ["rows", "manager_details", "details", "records", "data"]);
  }
  const selected = state.managerDetails.filter(item => stringValue(item.manager_id ?? item.managerId) === managerId);
  state.managerDetailsById.set(managerId, selected);
  return selected;
}

async function loadManagerProfiles() {
  if (state.managerProfiles) return state.managerProfiles;
  try {
    const payload = await loadOnce("managerProfiles", () => fetchJson(filePath("manager_profiles.json")));
    state.managerProfiles = payloadArray(payload, ["rows", "manager_profiles", "profiles", "records", "data"]);
  } catch {
    state.managerProfiles = [];
  }
  return state.managerProfiles;
}

async function loadHoldings() {
  if (state.holdings) return state.holdings;
  state.holdings = await loadOnce("holdings", () => fetchJson(filePath("holdings.json")));
  state.holdingFundIndex = new Map();
  holdingsFundRows().forEach(fund => {
    const id = stringValue(fund.fund_id);
    const code = stringValue(fund.fund_code);
    if (id) state.holdingFundIndex.set(`id:${id}`, fund);
    if (code) state.holdingFundIndex.set(`code:${code}`, fund);
  });
  return state.holdings;
}

async function loadGuide() {
  if (state.guide) return state.guide;
  state.guide = await loadOnce("guide", () => fetchJson(filePath("guide.json")));
  return state.guide;
}

function bindPreviewDialog(dialogId, closeId, triggerKey) {
  const dialog = document.getElementById(dialogId);
  document.getElementById(closeId).addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => {
    const trigger = state.preview[triggerKey];
    state.preview[triggerKey] = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  });
}

async function openFundPreview(reference, trigger) {
  const dialog = document.getElementById("fund-preview-dialog");
  state.preview.fundTrigger = trigger;
  setText("fund-preview-title", reference.name || "基金持仓");
  setText("fund-preview-meta", [reference.code, reference.type].filter(Boolean).join(" · ") || "正在匹配基金策略ID");
  document.getElementById("fund-preview-content").replaceChildren(el("div", { class: "preview-loading" }, el("strong", { text: "正在载入前十大持仓" }), el("span", { text: "首次打开需要读取持仓数据。" })));
  if (!dialog.open) dialog.showModal();
  try {
    await loadHoldings();
    renderFundPreview(reference);
  } catch (error) {
    document.getElementById("fund-preview-content").replaceChildren(previewEmptyState("持仓数据加载失败", error.message));
  }
}

function findHoldingFund(reference) {
  if (!state.holdingFundIndex) return null;
  const id = stringValue(reference.id);
  const code = stringValue(reference.code);
  return (id && state.holdingFundIndex.get(`id:${id}`)) || (code && state.holdingFundIndex.get(`code:${code}`)) || null;
}

function renderFundPreview(reference) {
  const root = document.getElementById("fund-preview-content");
  root.replaceChildren();
  const fund = findHoldingFund(reference);
  const name = stringValue(fund?.fund_name) || reference.name || "基金名称未提供";
  const code = stringValue(fund?.fund_code) || reference.code || reference.id || "代码未提供";
  const type = normalizeFundType(fund?.fund_type || reference.type) || "类型未提供";
  setText("fund-preview-title", name);
  setText("fund-preview-meta", `${code} · ${type}`);

  const reportDate = stringValue(fund?.report_date);
  const status = !fund ? "不在当前持仓数据范围" : fund.status === "available" && arrayValue(fund.holdings).length ? "已取得最新披露持仓" : "暂无有效持仓";
  const summary = el("dl", { class: "fund-preview-summary" });
  [["基金代码", code], ["基金类型", type], ["持仓报告期", reportDate || "未提供"], ["数据状态", status]].forEach(([label, value]) => summary.append(el("div", {}, el("dt", { text: label }), el("dd", { text: value }))));
  root.append(summary);

  const managerIds = arrayValue(fund?.manager_ids || reference.managerIds);
  const managerNames = arrayValue(fund?.manager_names || reference.managerNames);
  const managerRow = el("div", { class: "fund-preview-managers" }, el("span", { text: "基金经理" }));
  if (managerNames.length) managerRow.append(entityList(managerNames.map((managerName, index) => managerNameButton({ id: managerIds[index], name: managerName }))));
  else managerRow.append(el("span", { class: "missing", text: "经理信息未提供" }));
  root.append(managerRow);

  if (!fund) return root.append(previewEmptyState("不在当前持仓数据范围", "该基金可能属于历史基金或当前基金池外产品。本次不按名称猜测，也不临时补采。"));
  const holdings = arrayValue(fund.holdings);
  if (fund.status !== "available" || !holdings.length) return root.append(previewEmptyState("暂无有效持仓", "现有结构化数据中没有可展示的前十大持仓。"));

  const section = el("section", { class: "fund-preview-holdings" }, el("div", { class: "preview-section-heading" }, el("h3", { text: "前十大持仓" }), el("span", { text: reportDate ? `报告期 ${reportDate}` : "报告期未提供" })));
  const table = el("table");
  table.append(el("thead", {}, el("tr", {}, el("th", { text: "序号" }), el("th", { text: "股票" }), el("th", { text: "持仓权重" }))));
  const body = el("tbody");
  holdings.slice(0, 10).forEach((holding, index) => {
    const weight = finite(holding.weight);
    body.append(el("tr", {}, el("td", { class: "numeric", text: String(index + 1) }), el("td", {}, el("strong", { text: stringValue(holding.security_name) || "名称未提供" }), el("small", { text: stringValue(holding.security_code) || "代码未提供" })), el("td", { class: `numeric${Number.isFinite(weight) ? "" : " missing"}`, text: Number.isFinite(weight) ? formatPercent(weight * 100) : "未提供" })));
  });
  table.append(body);
  section.append(el("div", { class: "table-scroll" }, table));
  root.append(section);
}

function previewEmptyState(title, detail) {
  return el("div", { class: "preview-empty" }, icon("i-info"), el("strong", { text: title }), el("span", { text: detail }));
}

async function openManagerPreview(managerId, trigger) {
  const dialog = document.getElementById("manager-preview-dialog");
  state.preview.managerTrigger = trigger;
  state.preview.managerId = String(managerId);
  state.preview.radarPeriod = "3y";
  syncPeriodTabs("manager-preview-periods", state.preview.radarPeriod);
  setText("manager-preview-title", "正在载入基金经理");
  setText("manager-preview-meta", `经理ID ${managerId}`);
  setText("manager-preview-status", "正在载入雷达图数据");
  document.getElementById("manager-preview-radar").replaceChildren();
  document.getElementById("manager-preview-legend").replaceChildren();
  document.getElementById("manager-preview-detail").disabled = true;
  if (!dialog.open) dialog.showModal();
  try {
    await loadManagers();
    const manager = state.managers.find(item => item.id === String(managerId));
    if (!manager) throw new Error("未找到对应东方财富经理ID");
    setText("manager-preview-title", manager.name || "姓名未提供");
    setText("manager-preview-meta", `ID ${manager.id} · ${manager.company || "公司未提供"}`);
    document.getElementById("manager-preview-detail").disabled = false;
    renderManagerPreviewRadar();
  } catch (error) {
    setText("manager-preview-status", `基金经理数据加载失败：${error.message}`);
    document.getElementById("manager-preview-status").classList.add("error");
  }
}

function renderManagerPreviewRadar() {
  const manager = state.managers?.find(item => item.id === state.preview.managerId);
  if (!manager) return;
  const radar = radarWindow(manager, state.preview.radarPeriod);
  drawRadar(manager, radar, null, null, { svgId: "manager-preview-radar", statusId: "manager-preview-status", legendId: "manager-preview-legend", allowRemoveCompare: false });
}

async function openManagerDetailFromPreview() {
  const manager = state.managers?.find(item => item.id === state.preview.managerId);
  if (!manager) return;
  document.getElementById("manager-preview-dialog").close();
  const fundDialog = document.getElementById("fund-preview-dialog");
  if (fundDialog.open) fundDialog.close();
  state.profile.primaryId = manager.id;
  state.profile.compareId = null;
  state.profile.period = state.preview.radarPeriod;
  syncPeriodTabs("radar-periods", state.profile.period);
  const input = document.getElementById("profile-manager-search");
  input.value = `${manager.name} · ${manager.id} · ${manager.company || "公司未提供"}`;
  document.getElementById("compare-manager-search").value = "";
  document.getElementById("compare-manager-open").disabled = false;
  if (state.activeView === "profile") await renderProfile();
  else location.hash = "profile";
}

function syncPeriodTabs(rootId, period) {
  document.querySelectorAll(`#${rootId} button[data-period]`).forEach(button => button.classList.toggle("active", button.dataset.period === period));
}

function normalizePreference(managerId, raw = {}) {
  return {
    managerId: String(managerId),
    favorite: raw.favorite === true,
    attributeOverride: Array.isArray(raw.attributeOverride) ? [...new Set(raw.attributeOverride.filter(tag => ["offense", "defense", "composite"].includes(tag)))] : null,
    updatedAt: stringValue(raw.updatedAt) || new Date(0).toISOString(),
    schemaVersion: "fund-manager-preferences-v1"
  };
}

function preferenceFor(managerId) {
  return state.preferences.get(String(managerId)) || normalizePreference(String(managerId));
}

function systemSuggestedTags(manager) {
  if (!manager || !Number.isFinite(manager.soloDays) || manager.soloDays < 1095) return [];
  const score = manager.score || {};
  const values = {
    offense: finite(score.offense ?? score.offense_score ?? score.offense_trial),
    defense: finite(score.defense ?? score.defense_score ?? score.defense_trial),
    composite: finite(score.risk_adjusted ?? score.composite ?? score.risk_adjusted_score ?? score.risk_adjusted_trial)
  };
  return Object.entries(values).filter(([, value]) => Number.isFinite(value) && value >= 70).map(([key]) => key);
}

function effectiveTags(manager) {
  const preference = preferenceFor(manager.id);
  return preference.attributeOverride === null ? systemSuggestedTags(manager) : preference.attributeOverride;
}

function savePreferencesLocal() {
  localStorage.setItem(STORAGE.managerPreferences, JSON.stringify(Object.fromEntries(state.preferences)));
}

async function initializePreferenceSync() {
  updatePreferenceSyncState("local");
  const bridge = window.FundPreferenceCloud;
  if (!bridge?.getSession) {
    renderSharedAuthStatus(null);
    return;
  }
  let session = null;
  try {
    session = await bridge.getSession();
    renderSharedAuthStatus(session);
    if (!session?.uid) return updatePreferenceSyncState("signed-out");
    updatePreferenceSyncState("syncing");
    const remote = await bridge.load();
    const remotePreferences = remote?.preferences && typeof remote.preferences === "object" ? remote.preferences : {};
    const ids = new Set([...state.preferences.keys(), ...Object.keys(remotePreferences)]);
    ids.forEach(managerId => {
      const local = state.preferences.get(managerId);
      const cloud = remotePreferences[managerId] ? normalizePreference(managerId, remotePreferences[managerId]) : null;
      if (!local && cloud) state.preferences.set(managerId, cloud);
      else if (local && cloud && Date.parse(cloud.updatedAt) > Date.parse(local.updatedAt)) state.preferences.set(managerId, cloud);
    });
    savePreferencesLocal();
    await bridge.save(Object.fromEntries(state.preferences));
    updatePreferenceSyncState("synced");
  } catch (error) {
    if (!session?.uid) renderSharedAuthStatus(null, "暂时无法确认登录状态");
    updatePreferenceSyncState("pending", error?.message);
  }
}

function renderSharedAuthStatus(session, detail = "") {
  const link = document.getElementById("fund-auth-link");
  if (!link) return;
  const signedIn = Boolean(session?.uid);
  setText("fund-auth-status", signedIn ? session.account || "已登录" : "登录主站账号");
  setText("fund-auth-detail", detail || (signedIn ? "已共享主站登录" : "共享登录，无需注册"));
  link.dataset.status = signedIn ? "signed-in" : "signed-out";
  link.setAttribute("aria-label", signedIn ? `主站账号${session.account || "已登录"}` : "使用主站共享账号登录");
}

function updatePreferenceSyncState(status, detail = "") {
  state.preferenceSync = status;
  const labels = { local: "收藏保存在本机", "signed-out": "未登录，收藏保存在本机", syncing: "正在同步收藏", synced: "收藏已与账号同步", pending: "收藏待同步" };
  const node = document.getElementById("preference-sync-state");
  if (node) { node.textContent = detail && status === "pending" ? `${labels[status]}：${detail}` : labels[status] || status; node.dataset.status = status; }
}

async function persistPreference(managerId, patch) {
  const preference = normalizePreference(managerId, { ...preferenceFor(managerId), ...patch, updatedAt: new Date().toISOString() });
  state.preferences.set(String(managerId), preference);
  savePreferencesLocal();
  rerenderPreferenceConsumers();
  const bridge = window.FundPreferenceCloud;
  if (!bridge?.getSession) return updatePreferenceSyncState("local");
  try {
    const session = await bridge.getSession();
    if (!session?.uid) return updatePreferenceSyncState("signed-out");
    updatePreferenceSyncState("syncing");
    await bridge.save(Object.fromEntries(state.preferences));
    updatePreferenceSyncState("synced");
  } catch (error) {
    updatePreferenceSyncState("pending", error?.message);
  }
}

function rerenderPreferenceConsumers() {
  if (state.managers) {
    if (state.activeView === "kpi") renderKpi();
    if (state.activeView === "score") renderScore();
    if (state.activeView === "profile" && state.profile.primaryId) renderProfilePreferenceActions();
    if (state.activeView === "holdings") renderHoldings();
  }
}

function renderManagerPreferenceControls(manager, compact = false) {
  const root = el("span", { class: `manager-preferences${compact ? " compact" : ""}` });
  const preference = preferenceFor(manager.id);
  const star = el("button", { type: "button", class: `favorite-button${preference.favorite ? " active" : ""}`, "aria-label": preference.favorite ? `取消收藏${manager.name}` : `收藏${manager.name}`, title: preference.favorite ? "取消收藏" : "星标收藏" });
  star.append(el("span", { class: "favorite-glyph", "aria-hidden": "true", text: preference.favorite ? "⭐" : "☆" }));
  star.addEventListener("click", event => { event.stopPropagation(); persistPreference(manager.id, { favorite: !preference.favorite }); });
  root.append(star);
  const tags = effectiveTags(manager);
  const tagRoot = el("button", { type: "button", class: "ability-tags", "aria-label": `编辑${manager.name}的能力属性`, title: "编辑能力属性" });
  const labels = { offense: "进攻", defense: "防守", composite: "综合" };
  if (!tags.length) tagRoot.append(el("span", { class: "ability-empty", text: "+ 属性" }));
  tags.forEach(tag => { const chip = el("span", { class: `ability-chip ${tag}`, title: labels[tag] }); chip.append(icon(`i-${tag}`)); if (!compact) chip.append(document.createTextNode(labels[tag])); tagRoot.append(chip); });
  tagRoot.addEventListener("click", event => { event.stopPropagation(); openPreferenceEditor(manager.id); });
  root.append(tagRoot);
  return root;
}

function openPreferenceEditor(managerId) {
  const manager = state.managers?.find(item => item.id === String(managerId));
  if (!manager) return;
  state.preferenceEditorId = manager.id;
  const preference = preferenceFor(manager.id);
  setText("preference-dialog-title", `${manager.name} · ${manager.id}`);
  document.getElementById("preference-favorite").checked = preference.favorite;
  const tags = effectiveTags(manager);
  document.querySelectorAll("#preference-dialog .preference-tags input").forEach(input => { input.checked = tags.includes(input.value); });
  const suggested = systemSuggestedTags(manager).map(tag => ({ offense: "进攻", defense: "防守", composite: "综合" })[tag]);
  setText("preference-suggestion", `系统建议：${suggested.join("、") || "暂无"}。条件为单人样本不少于1095天且对应分项不低于70分。`);
  document.getElementById("preference-dialog").showModal();
}

function savePreferenceEditor(event) {
  event.preventDefault();
  const managerId = state.preferenceEditorId;
  if (!managerId) return;
  const attributeOverride = [...document.querySelectorAll("#preference-dialog .preference-tags input:checked")].map(input => input.value);
  persistPreference(managerId, { favorite: document.getElementById("preference-favorite").checked, attributeOverride });
  document.getElementById("preference-dialog").close();
}

function resetPreferenceSuggestion() {
  const managerId = state.preferenceEditorId;
  const manager = state.managers?.find(item => item.id === managerId);
  if (!manager) return;
  persistPreference(managerId, { favorite: document.getElementById("preference-favorite").checked, attributeOverride: null });
  const tags = systemSuggestedTags(manager);
  document.querySelectorAll("#preference-dialog .preference-tags input").forEach(input => { input.checked = tags.includes(input.value); });
  showToast("已恢复系统建议");
}

function loadOnce(key, loader) {
  if (!state.loads.has(key)) state.loads.set(key, loader().catch(error => { state.loads.delete(key); throw error; }));
  return state.loads.get(key);
}

function filePath(defaultName) {
  const files = state.manifest?.files;
  if (Array.isArray(files)) {
    const match = files.find(item => (item.name || item.path || "").endsWith(defaultName));
    if (match) return `${DATA_ROOT}/${match.path || match.name}`;
  }
  return `${DATA_ROOT}/${defaultName}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url} 返回 ${response.status}`);
  return response.json();
}

function payloadArray(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  return [];
}

function normalizeFund(raw) {
  const returns = raw.returns || {};
  return {
    raw,
    id: stringValue(raw.fund_id ?? raw.strategy_key ?? raw.representative_code),
    code: stringValue(raw.representative_code ?? raw.fund_code ?? raw.code),
    name: stringValue(raw.name ?? raw.fund_name),
    type: normalizeFundType(raw.type ?? raw.fund_type),
    company: stringValue(raw.company ?? raw.fund_company),
    managerIds: arrayValue(raw.manager_ids ?? raw.managerIds),
    managers: arrayValue(raw.manager_names ?? raw.managerNames),
    inception: raw.inception_date ?? raw.establishment_date ?? raw.issue_date ?? null,
    scale: finite(raw.scale_yi ?? raw.fund_scale_yi ?? raw.fund_scale_100m ?? raw.scale),
    returnYtd: percentValue(returns.ytd ?? raw.return_ytd ?? raw.ytd_return),
    return1y: percentValue(returns["1y"] ?? raw.return_1y ?? raw.one_year_return),
    return2y: percentValue(returns["2y"] ?? raw.return_2y ?? raw.two_year_return),
    return3y: percentValue(returns["3y"] ?? raw.return_3y ?? raw.three_year_return),
    customReturn: null
  };
}

function normalizeManager(raw) {
  const metrics = raw.metrics || {};
  const profile = raw.profile || {};
  return {
    raw,
    metrics,
    score: raw.score || {},
    id: stringValue(raw.manager_id ?? raw.id),
    name: stringValue(raw.name ?? raw.manager_name),
    company: stringValue(raw.company ?? raw.fund_company),
    currentFundIds: arrayValue(raw.current_fund_ids ?? raw.currentFundIds),
    currentFunds: arrayValue(raw.current_fund_names ?? raw.currentFundNames),
    fundTypes: arrayValue(raw.current_type_set ?? raw.current_fund_types).map(normalizeFundType),
    experience: finite(raw.experience_years ?? profile.experience_years ?? metricValue(metrics, "experience")),
    biography: stringValue(raw.biography ?? profile.biography),
    academic: stringValue(raw.academic_background ?? raw.academic_text ?? profile.academic_background),
    radar: raw.radar_windows || raw.radarWindows || {},
    poolScale: finite(metricValue(metrics, "poolScale") ?? raw.current_pool_scale_yi ?? raw.universe_scale_100m),
    soloDays: finite(metricValue(metrics, "soloDays") ?? raw.solo_sample_days)
  };
}

function renderFunds() {
  if (!state.funds) return renderTableMessage("fund-table-body", 12, "正在载入基金数据…");
  const counts = countFundTypes(state.funds);
  setText("fund-kpi-total", formatInteger(counts.all));
  setText("fund-kpi-stock", formatInteger(counts.stock));
  setText("fund-kpi-mixed", formatInteger(counts.mixed));
  setText("fund-tab-all", formatInteger(counts.all));
  setText("fund-tab-stock", formatInteger(counts.stock));
  setText("fund-tab-mixed", formatInteger(counts.mixed));
  const query = normalizeSearch(state.fund.query);
  const filtered = state.funds.filter(fund => {
    if (state.fund.type !== "all" && fund.type !== state.fund.type) return false;
    if (!query) return true;
    return normalizeSearch([fund.code, fund.name, fund.company, ...fund.managers].join(" ")).includes(query);
  });
  setText("fund-kpi-filtered", formatInteger(filtered.length));
  const sorted = sortRecords(filtered, state.fund.sort, fundValue);
  renderDataTable({ table: "fund", columns: FUND_COLUMNS, records: sorted, stateKey: "fund", headId: "fund-table-head", bodyId: "fund-table-body", footerId: "fund-table-footer", value: fundValue });
}

function countFundTypes(funds) {
  return {
    all: funds.length,
    stock: funds.filter(fund => fund.type === "股票型").length,
    mixed: funds.filter(fund => fund.type === "偏股混合型").length
  };
}

function fundValue(fund, key, context = {}) {
  if (key === "sequence") return context.sequence;
  if (key === "managers") return fund.managers;
  return fund[key];
}

function renderKpi() {
  if (!state.managers) return renderTableMessage("kpi-table-body", state.kpi.columns.length, "正在载入基金经理数据…");
  const records = filterManagers(state.managers, state.kpi.query, state.kpi.filters);
  setText("manager-kpi-total", formatInteger(state.managers.length));
  setText("manager-kpi-filtered", formatInteger(records.length));
  setText("manager-kpi-return", formatPercent(median(records.map(item => managerValue(item, "annualReturn")))));
  setText("manager-kpi-drawdown", formatPercent(median(records.map(item => managerValue(item, "maxDrawdown")))));
  const fields = state.kpi.columns.map(key => KPI_FIELDS.find(field => field.key === key)).filter(Boolean);
  setText("column-picker-label", `字段 ${fields.length}/${KPI_FIELDS.length}`);
  const sorted = sortRecords(records, state.kpi.sort, managerValue);
  renderDataTable({ table: "kpi", columns: fields, records: sorted, stateKey: "kpi", headId: "kpi-table-head", bodyId: "kpi-table-body", footerId: "kpi-table-footer", value: managerValue, groups: true });
  renderActiveFilters("kpi");
}

function managerValue(manager, key) {
  if (key === "manager") return manager.name;
  if (key === "managerId") return manager.id;
  if (key === "company") return manager.company;
  if (key === "fundType") return displayFundTypes(manager.fundTypes);
  if (key === "currentFunds") return manager.currentFunds;
  if (key === "experience") return manager.experience;
  if (key === "biography") return manager.biography;
  if (key === "academic") return manager.academic || metricValue(manager.metrics, "academic");
  if (key === "sampleYears") return Number.isFinite(manager.soloDays) ? manager.soloDays / 365.25 : null;
  if (key === "poolScale") return manager.poolScale;
  if (key === "currentReportDate") return manager.raw.holdings_report_dates ?? manager.raw.complexity_report_date ?? manager.raw.holdings_report_date ?? manager.metrics.holdings_report_date ?? null;
  if (key === "topHoldings") return arrayValue(manager.raw.current_solo_top5_holdings ?? manager.metrics.current_solo_top5_holdings);
  const rawValue = metricValue(manager.metrics, key) ?? metricValue(manager.raw, key) ?? finite(manager.raw[key]);
  return PERCENT_MANAGER_FIELDS.has(key) ? percentValue(rawValue) : rawValue;
}

function metricValue(metrics, aliasKey) {
  const keys = aliases[aliasKey] || [aliasKey];
  for (const key of keys) {
    const value = metrics?.[key];
    if (value !== undefined && value !== null && value !== "") return typeof value === "number" ? finite(value) : value;
  }
  return null;
}

function filterManagers(managers, query, filters) {
  const needle = normalizeSearch(query);
  return managers.filter(manager => {
    if (needle && !normalizeSearch([manager.name, manager.id, manager.company, ...manager.currentFunds].join(" ")).includes(needle)) return false;
    return [...filters.entries()].every(([key, selected]) => selected.size === 0 || [...selected].some(option => managerMatchesFilter(manager, key, option)));
  });
}

function managerMatchesFilter(manager, key, option) {
  if (key === "favorite") return option === "favorite" && preferenceFor(manager.id).favorite;
  if (key === "ability") return effectiveTags(manager).includes(option);
  if (key === "fundType") {
    if (option === "stock") return manager.fundTypes.includes("股票型");
    if (option === "mixed") return manager.fundTypes.includes("偏股混合型");
  }
  if (key === "eligibility") return option === "eligible" ? Boolean(manager.score?.eligible) : !manager.score?.eligible;
  if (key === "rating") {
    const rating = stringValue(manager.score?.rating);
    return option === "missing" ? !rating : rating === option;
  }
  const value = managerValue(manager, key);
  if (!Number.isFinite(value)) return option === "missing";
  if (key === "poolScale") return matchesPositiveBins(value, option, [2, 10, 50, 100]);
  if (key === "experience") return matchesPositiveBins(value, option, [2, 5, 10], true);
  if (key === "annualReturn" || key === "annualExcess") return matchesReturnBin(value, option);
  if (key === "maxDrawdown") return matchesDrawdownBin(value, option);
  return true;
}

function filterScoreRecords(records, query, filters) {
  const needle = normalizeSearch(query);
  return records.filter(record => {
    const manager = record.manager;
    if (needle && !normalizeSearch([manager.name, manager.id, manager.company, ...manager.currentFunds].join(" ")).includes(needle)) return false;
    return [...filters.entries()].every(([key, selected]) => selected.size === 0 || [...selected].some(option => scoreRecordMatchesFilter(record, key, option)));
  });
}

function scoreRecordMatchesFilter(record, key, option) {
  if (key === "trialTotal") {
    const value = record.trialTotal;
    if (!Number.isFinite(value)) return option === "missing";
    if (option === "gte80") return value >= 80;
    if (option === "70to80") return value >= 70 && value < 80;
    if (option === "60to70") return value >= 60 && value < 70;
    if (option === "lt60") return value < 60;
  }
  if (key === "trialRating") return option === "missing" ? record.trialRating === "未评级" : record.trialRating === option;
  if (key === "eligibility") return option === "eligible" ? record.eligible : !record.eligible;
  if (key === "defenseGate") return record.defenseGate === option;
  if (key === "completeness") return option === "complete" ? record.metricsComplete : !record.metricsComplete;
  return managerMatchesFilter(record.manager, key, option);
}

function renderFilters(scope, defs) {
  const root = document.getElementById(`${scope}-filters`);
  root.replaceChildren();
  defs.forEach((def, index) => {
    const details = el("details", { class: `filter-group ${def.category}`, open: index < 3 });
    const summary = el("summary");
    summary.append(icon(`i-${def.icon === "score" ? "score" : def.icon}`), el("span", { text: def.label }));
    details.append(summary);
    const options = el("div", { class: "filter-options" });
    def.options.forEach(([value, label]) => {
      const input = el("input", { type: "checkbox", value, id: `${scope}-${def.key}-${value}` });
      input.addEventListener("change", () => updateFilter(scope, def.key, value, input.checked));
      const row = el("label", { class: "filter-option", for: input.id });
      row.append(input, el("span", { text: label }));
      options.append(row);
    });
    details.append(options);
    root.append(details);
  });
}

function updateFilter(scope, key, value, checked) {
  const filterState = state[scope].filters;
  if (!filterState.has(key)) filterState.set(key, new Set());
  const set = filterState.get(key);
  checked ? set.add(value) : set.delete(value);
  state[scope].page = 1;
  scope === "kpi" ? renderKpi() : renderScore();
}

function resetFilters(scope) {
  state[scope].filters.clear();
  document.querySelectorAll(`#${scope}-filters input[type="checkbox"]`).forEach(input => { input.checked = false; });
  state[scope].page = 1;
  scope === "kpi" ? renderKpi() : renderScore();
}

function renderActiveFilters(scope) {
  const root = document.getElementById(`${scope}-active-filters`);
  if (!root) return;
  root.replaceChildren();
  const defs = scope === "kpi" ? FILTER_DEFS : SCORE_FILTER_DEFS;
  let count = 0;
  state[scope].filters.forEach((values, key) => values.forEach(value => {
    const def = defs.find(item => item.key === key);
    const label = def?.options.find(item => item[0] === value)?.[1] || value;
    const chip = el("span", { class: "filter-chip" }, `${def?.label || key}：${label}`);
    const remove = el("button", { type: "button", text: "×", "aria-label": `删除${label}` });
    remove.addEventListener("click", () => {
      state[scope].filters.get(key)?.delete(value);
      const checkbox = document.getElementById(`${scope}-${key}-${value}`);
      if (checkbox) checkbox.checked = false;
      scope === "kpi" ? renderKpi() : renderScore();
    });
    chip.append(remove);
    root.append(chip);
    count += 1;
  }));
  if (!count) root.append(el("span", { class: "missing", text: "未应用分组筛选" }));
}

function renderScore() {
  if (!state.managers) return renderTableMessage("score-table-body", SCORE_COLUMNS.length, "正在载入评分数据…");
  const scored = buildScoreRecords(state.managers);
  const eligible = scored.filter(item => item.eligible && Number.isFinite(item.formalTotal));
  setText("score-eligible-count", formatInteger(eligible.length));
  const filtered = filterScoreRecords(scored, state.score.query, state.score.filters);
  setText("score-filtered-count", formatInteger(filtered.length));
  const notice = document.getElementById("score-data-notice");
  notice.classList.toggle("warning", eligible.length === 0);
  const noticeText = notice.querySelector("span");
  if (eligible.length === 0) {
    noticeText.textContent = "当前数据没有满足正式评分资格的经理。缺失沪深300全收益Alpha或其他必需指标时不生成分数，不以0替代。";
  } else {
    noticeText.textContent = `正式评分仅包含资格完整且通过固定门槛的 ${eligible.length} 位经理；共同管理期不参与个人归因。`;
  }
  const sorted = sortRecords(filtered, state.score.sort, scoreValue);
  renderDataTable({ table: "score", columns: SCORE_COLUMNS, records: sorted, stateKey: "score", headId: "score-table-head", bodyId: "score-table-body", footerId: "score-table-footer", value: scoreValue });
}

function buildScoreRecords(managers) {
  const rows = managers.map(manager => {
    const score = manager.score || {};
    const offense = finite(score.offense ?? score.offense_score ?? score.offense_trial);
    const defense = finite(score.defense ?? score.defense_score ?? score.defense_trial);
    const composite = finite(score.risk_adjusted ?? score.composite ?? score.risk_adjusted_score ?? score.risk_adjusted_trial);
    const eligible = score.eligible === true && [offense, defense, composite].every(Number.isFinite);
    const formalTotal = eligible ? finite(score.total) ?? weightedTotal(offense, defense, composite, [40, 30, 30]) : null;
    const trialTotal = eligible ? weightedTotal(offense, defense, composite, state.score.appliedWeights) : null;
    const reasons = arrayValue(score.reasons ?? score.eligibility_reasons ?? score.reason);
    const metricsComplete = !reasons.includes("incomplete_metrics");
    const defenseFailures = ["max_drawdown_gate", "downside_capture_gate", "defense_score_gate"];
    const defenseGate = metricsComplete ? (reasons.some(reason => defenseFailures.includes(reason)) ? "fail" : "pass") : "pending";
    return {
      manager, eligible, offense, defense, composite, formalTotal, trialTotal,
      formalRating: stringValue(score.rating), trialRating: null,
      reasons, metricsComplete, defenseGate,
      formalRank: null, trialRank: null, rankDelta: null
    };
  });
  assignRanks(rows, "formalTotal", "formalRank");
  assignRanks(rows, "trialTotal", "trialRank");
  assignTrialRatings(rows);
  rows.forEach(row => {
    if (!row.formalRating && Number.isFinite(row.formalRank)) row.formalRating = ratingForRank(row.formalRank, rows.filter(item => Number.isFinite(item.formalRank)).length);
    if (Number.isFinite(row.formalRank) && Number.isFinite(row.trialRank)) row.rankDelta = row.formalRank - row.trialRank;
  });
  return rows;
}

function ratingForRank(rank, count) {
  if (!Number.isFinite(rank) || !count) return "未评级";
  const percentile = (rank - 1) / count;
  if (percentile < 0.10) return "A";
  if (percentile < 0.30) return "B";
  if (percentile < 0.60) return "C";
  return "D";
}

function assignTrialRatings(rows) {
  const count = rows.filter(row => Number.isFinite(row.trialRank)).length;
  rows.forEach(row => { row.trialRating = ratingForRank(row.trialRank, count); });
}

function assignRanks(rows, valueKey, rankKey) {
  rows.filter(row => row.eligible && Number.isFinite(row[valueKey]))
    .sort((a, b) => b[valueKey] - a[valueKey] || (b.defense ?? -Infinity) - (a.defense ?? -Infinity) || (b.composite ?? -Infinity) - (a.composite ?? -Infinity) || a.manager.id.localeCompare(b.manager.id))
    .forEach((row, index) => { row[rankKey] = index + 1; });
}

function weightedTotal(offense, defense, composite, weights) {
  return (offense * weights[0] + defense * weights[1] + composite * weights[2]) / 100;
}

function eligibilityText(reasons) {
  if (!reasons.length) return "不具备评分资格";
  const labels = {
    missing_h00300_alpha: "缺少沪深300全收益Alpha",
    insufficient_solo_sample: "单人管理样本不足3年",
    incomplete_metrics: "正式指标不完整",
    max_drawdown_gate: "最大回撤未通过固定门槛",
    downside_capture_gate: "下行捕获率未通过固定门槛",
    defense_score_gate: "防守分未通过固定门槛"
  };
  return reasons.map(reason => labels[reason] || String(reason)).join("；");
}

function scoreValue(row, key) {
  if (key === "manager") return row.manager.name;
  if (key === "company") return row.manager.company;
  if (key === "annualExcess") return managerValue(row.manager, "annualExcess");
  if (key === "maxDrawdown") return managerValue(row.manager, "maxDrawdown");
  if (key === "alpha300") return managerValue(row.manager, "alpha300");
  if (key === "sampleYears") return managerValue(row.manager, "sampleYears");
  if (key === "trialRating") return row.trialRating || "未评级";
  if (key === "formalRating") return row.formalRating || "未评级";
  if (key === "eligibility") return row.eligible ? "具备正式评分资格" : eligibilityText(row.reasons);
  return row[key];
}

function bindWeightControls() {
  const keys = ["offense", "defense", "composite"];
  keys.forEach((key, index) => {
    const range = document.getElementById(`weight-${key}`);
    const number = document.getElementById(`weight-${key}-number`);
    const sync = (source, target) => {
      const value = clamp(Number(source.value), 0, 100);
      source.value = String(value);
      target.value = String(value);
      state.score.draftWeights[index] = value;
      state.score.weightsDirty = state.score.draftWeights.some((item, position) => item !== state.score.appliedWeights[position]);
      validateWeights();
    };
    range.addEventListener("input", () => sync(range, number));
    number.addEventListener("input", () => sync(number, range));
  });
  document.getElementById("weight-reset").addEventListener("click", () => {
    [40, 30, 30].forEach((value, index) => {
      const key = keys[index];
      document.getElementById(`weight-${key}`).value = String(value);
      document.getElementById(`weight-${key}-number`).value = String(value);
    });
    state.score.draftWeights = [40, 30, 30];
    state.score.weightsDirty = state.score.draftWeights.some((item, position) => item !== state.score.appliedWeights[position]);
    validateWeights();
  });
  document.getElementById("weight-apply").addEventListener("click", applyWeights);
  validateWeights();
}

function validateWeights() {
  const total = state.score.draftWeights.reduce((sum, value) => sum + value, 0);
  const valid = total === 100;
  const root = document.getElementById("weight-total");
  const apply = document.getElementById("weight-apply");
  root.classList.toggle("valid", valid);
  root.classList.toggle("invalid", !valid);
  root.querySelector("strong").textContent = `${total}%`;
  root.querySelector("small").textContent = !valid ? (total < 100 ? `还差${100 - total}%` : `超出${total - 100}%`) : state.score.weightsDirty ? "待应用" : "已应用";
  apply.disabled = !valid || !state.score.weightsDirty;
  if (!valid) setText("trial-model-status", "权重合计不是100%，保留上一次有效结果");
  else if (state.score.weightsDirty) setText("trial-model-status", "权重尚未应用，当前排名保持不变");
}

function applyWeights() {
  const total = state.score.draftWeights.reduce((sum, value) => sum + value, 0);
  if (total !== 100) return;
  state.score.appliedWeights = [...state.score.draftWeights];
  state.score.weightsDirty = false;
  setText("trial-weight-summary", state.score.appliedWeights.join(" / "));
  const same = state.score.appliedWeights.every((value, index) => value === [40, 30, 30][index]);
  const badge = document.getElementById("trial-model-badge");
  badge.classList.toggle("trial", !same);
  setText("trial-model-status", same ? "与正式权重一致" : "已应用自定义风险偏好");
  state.score.page = 1;
  validateWeights();
  if (state.managers) renderScore();
}

function renderColumnPicker() {
  const root = document.getElementById("column-groups");
  root.replaceChildren();
  const groups = [...new Set(KPI_FIELDS.map(field => field.group))];
  groups.forEach(group => {
    const section = el("section", { class: "column-group", dataset: { group } });
    section.append(el("h3", { text: group }));
    const options = el("div", { class: "column-options" });
    KPI_FIELDS.filter(field => field.group === group).forEach(field => {
      const input = el("input", { type: "checkbox", id: `column-${field.key}`, value: field.key, checked: state.kpi.columns.includes(field.key), disabled: field.fixed });
      input.addEventListener("change", () => toggleColumn(field.key, input.checked));
      options.append(el("label", { class: "column-option", for: input.id }, input, el("span", { text: field.label })));
    });
    section.append(options);
    root.append(section);
  });
}

function toggleColumn(key, checked) {
  if (checked && !state.kpi.columns.includes(key)) state.kpi.columns.push(key);
  if (!checked && key !== "manager") state.kpi.columns = state.kpi.columns.filter(item => item !== key);
  state.kpi.columns = sanitizeColumns(state.kpi.columns);
  localStorage.setItem(STORAGE.kpiColumns, JSON.stringify(state.kpi.columns));
  state.kpi.page = 1;
  renderKpi();
}

function sanitizeColumns(columns) {
  const valid = new Set(KPI_FIELDS.map(field => field.key));
  const result = [...new Set(columns.filter(key => valid.has(key)))];
  if (!result.includes("manager")) result.unshift("manager");
  return result;
}

function restoreDefaultColumns() {
  state.kpi.columns = [...DEFAULT_KPI_COLUMNS];
  localStorage.setItem(STORAGE.kpiColumns, JSON.stringify(state.kpi.columns));
  renderColumnPicker();
  renderKpi();
}

function filterColumnPicker(event) {
  const query = normalizeSearch(event.target.value);
  document.querySelectorAll(".column-option").forEach(label => { label.hidden = query && !normalizeSearch(label.textContent).includes(query); });
}

function renderDataTable(config) {
  const viewState = state[config.stateKey];
  const pageCount = Math.max(1, Math.ceil(config.records.length / viewState.pageSize));
  viewState.page = clamp(viewState.page, 1, pageCount);
  const start = (viewState.page - 1) * viewState.pageSize;
  const pageRecords = config.records.slice(start, start + viewState.pageSize);
  renderTableHead(config);
  const body = document.getElementById(config.bodyId);
  body.replaceChildren();
  if (!pageRecords.length) {
    const row = el("tr", { class: "table-message" });
    row.append(el("td", { colSpan: config.columns.length }, el("strong", { text: "没有符合条件的记录" }), el("span", { text: "请调整搜索或筛选条件；缺失值不会被当作0。" })));
    body.append(row);
  } else {
    pageRecords.forEach((record, index) => {
      const row = el("tr");
      config.columns.forEach(column => {
        const value = config.value(record, column.key, { sequence: start + index + 1 });
        row.append(renderCell(record, column, value, config.table));
      });
      body.append(row);
    });
  }
  renderPagination(config, pageCount, start, pageRecords.length);
}

function renderTableHead(config) {
  const head = document.getElementById(config.headId);
  head.replaceChildren();
  if (config.groups) {
    const groupRow = el("tr", { class: "group-row" });
    contiguousGroups(config.columns).forEach(group => groupRow.append(el("th", { colSpan: group.count, text: group.label })));
    head.append(groupRow);
  }
  const row = el("tr");
  config.columns.forEach(column => {
    const th = el("th", { scope: "col", class: column.sortable === false ? "" : "sortable" });
    if (column.sortable === false) th.textContent = column.label;
    else {
      const button = el("button", { type: "button", text: column.label, title: `按${column.label}排序` });
      const [sortKey, direction] = state[config.stateKey].sort;
      if (sortKey === column.key) {
        button.dataset.direction = direction;
        button.append(document.createTextNode(direction === "asc" ? " ↑" : " ↓"));
      }
      button.addEventListener("click", () => changeSort(config.stateKey, column.key, config));
      th.append(button);
    }
    row.append(th);
  });
  head.append(row);
}

function contiguousGroups(columns) {
  const result = [];
  columns.forEach(column => {
    const label = column.group || "";
    const last = result[result.length - 1];
    if (last?.label === label) last.count += 1; else result.push({ label, count: 1 });
  });
  return result;
}

function changeSort(stateKey, key, config) {
  const current = state[stateKey].sort;
  state[stateKey].sort = current[0] === key ? [key, current[1] === "asc" ? "desc" : "asc"] : [key, defaultDirection(config.columns.find(column => column.key === key))];
  state[stateKey].page = 1;
  if (stateKey === "fund") renderFunds();
  if (stateKey === "kpi") renderKpi();
  if (stateKey === "score") renderScore();
  if (stateKey === "profile") renderProfileFunds();
}

function defaultDirection(column) { return ["percent", "number", "integer", "score", "signedInteger"].includes(column?.kind) ? "desc" : "asc"; }

function renderCell(record, column, value, table) {
  const cell = el("td");
  if (["percent", "number", "integer", "score", "signedInteger"].includes(column.kind)) cell.classList.add("numeric"); else cell.classList.add("textual");
  if (column.kind === "manager") {
    const manager = table === "score" ? record.manager : record;
    cell.classList.add("manager-cell");
    const identity = el("span", { class: "manager-identity" }, managerNameButton(manager), el("span", { class: "manager-id", text: manager.id || "ID未提供" }));
    cell.append(el("div", { class: "manager-cell-content" }, identity, renderManagerPreferenceControls(manager, true)));
    return cell;
  }
  if (column.kind === "relation") {
    cell.append(el("span", { class: `status-tag ${value === "当前管理" ? "current" : "historical"}`, text: value || "关系未提供" }));
    return cell;
  }
  if (column.kind === "status") {
    const eligible = table === "score" && record.eligible;
    cell.append(el("span", { class: `status-tag ${eligible ? "qualified" : "unqualified"}`, text: value || "未说明" }));
    return cell;
  }
  if (table === "fund" && column.key === "name") {
    cell.append(fundNameButton(record));
    return cell;
  }
  if (table === "fund" && column.key === "managers") {
    cell.append(entityList(value.map((name, index) => managerNameButton({ id: record.managerIds[index], name }))));
    if (!value.length) cell.classList.add("missing");
    return cell;
  }
  if (table === "kpi" && column.key === "currentFunds") {
    const links = value.map((name, index) => fundNameButton({ id: record.currentFundIds[index], code: record.currentFundIds[index], name }));
    cell.append(entityList(links));
    if (!value.length) cell.classList.add("missing");
    return cell;
  }
  if (table === "profile" && column.key === "name") {
    cell.append(fundNameButton({ id: record.strategyKey, code: record.code, name: record.name, type: record.type }));
    return cell;
  }
  if (Array.isArray(value)) {
    cell.textContent = value.length ? value.join("；") : "待补采";
    if (!value.length) cell.classList.add("missing");
    return cell;
  }
  if (column.kind === "percent") {
    if (!Number.isFinite(value) && table === "profile") {
      const holdingField = ["holdingConcentration", "industryConcentration", "maxStockWeight"].includes(column.key);
      cell.textContent = holdingField ? (record.relation === "历史管理" ? "无同期持仓归因" : record.holdingsStatus || "持仓数据不足") : record.hasSolo === false ? "无单人归因" : "数据不足";
    } else if (!Number.isFinite(value) && table === "fund") {
      cell.textContent = column.key === "customReturn" ? "暂未启用" : ["return1y", "return2y", "return3y"].includes(column.key) ? "成立时间不足" : "数据不足";
    } else cell.textContent = formatPercent(value);
    if (Number.isFinite(value)) {
      if (column.risk && value <= -40) cell.classList.add("risk");
      else if (value > 0) cell.classList.add("gain");
      else if (value < 0) cell.classList.add("loss");
    } else cell.classList.add("missing");
    return cell;
  }
  if (column.kind === "score") {
    cell.textContent = Number.isFinite(value) ? value.toFixed(1) : "未评分";
    if (!Number.isFinite(value)) cell.classList.add("missing");
    return cell;
  }
  if (column.kind === "signedInteger") {
    cell.textContent = Number.isFinite(value) ? `${value > 0 ? "+" : ""}${value}` : "未评分";
    if (value > 0) cell.classList.add("gain"); else if (value < 0) cell.classList.add("loss"); else if (!Number.isFinite(value)) cell.classList.add("missing");
    return cell;
  }
  if (column.kind === "integer") {
    cell.textContent = Number.isFinite(value) ? formatInteger(value) : table === "score" ? "未评分" : "待补采";
    if (!Number.isFinite(value)) cell.classList.add("missing");
    return cell;
  }
  if (column.kind === "number") {
    cell.textContent = Number.isFinite(value) ? value.toFixed(column.decimals ?? 1) : "待补采";
    if (!Number.isFinite(value)) cell.classList.add("missing");
    return cell;
  }
  cell.textContent = value === null || value === undefined || value === "" ? "待补采" : String(value);
  if (value === null || value === undefined || value === "") cell.classList.add("missing");
  return cell;
}

function entityList(items) {
  const root = el("span", { class: "entity-list" });
  items.filter(Boolean).forEach(item => root.append(item));
  if (!root.childElementCount) root.append(el("span", { class: "missing", text: "待补采" }));
  return root;
}

function managerNameButton(manager, options = {}) {
  const id = stringValue(manager?.id ?? manager?.manager_id);
  const name = stringValue(manager?.name ?? manager?.manager_name) || "姓名未提供";
  if (!id) return el("span", { class: `manager-name${options.className ? ` ${options.className}` : ""}`, text: name, title: "经理ID未提供，无法打开雷达图" });
  const button = el("button", {
    type: "button",
    class: `entity-link manager-link manager-name${options.className ? ` ${options.className}` : ""}`,
    text: name,
    title: `查看${name}的六维能力雷达图`,
    "aria-label": `查看基金经理${name}，ID ${id}的六维能力雷达图`
  });
  button.addEventListener("click", event => {
    event.stopPropagation();
    openManagerPreview(id, button);
  });
  return button;
}

function fundNameButton(fund, options = {}) {
  const reference = {
    id: stringValue(fund?.id ?? fund?.fund_id ?? fund?.strategyKey ?? fund?.strategy_key),
    code: stringValue(fund?.code ?? fund?.fund_code ?? fund?.representative_code),
    name: stringValue(fund?.name ?? fund?.fund_name) || "基金名称未提供",
    type: stringValue(fund?.type ?? fund?.fund_type),
    managerIds: arrayValue(fund?.managerIds ?? fund?.manager_ids),
    managerNames: arrayValue(fund?.managers ?? fund?.manager_names)
  };
  if (!reference.id && !reference.code) return el("span", { class: "fund-name", text: reference.name, title: "基金ID和代码未提供，无法打开持仓" });
  const button = el("button", {
    type: "button",
    class: `entity-link fund-link${options.className ? ` ${options.className}` : ""}`,
    text: reference.name,
    title: `查看${reference.name}前十大持仓`,
    "aria-label": `查看基金${reference.name}前十大持仓`
  });
  button.addEventListener("click", event => {
    event.stopPropagation();
    openFundPreview(reference, button);
  });
  return button;
}

function renderPagination(config, pageCount, start, shown) {
  const footer = document.getElementById(config.footerId);
  footer.replaceChildren();
  const total = config.records.length;
  footer.append(el("span", { text: total ? `第${start + 1}-${start + shown}条，共${formatInteger(total)}条` : "共0条" }));
  const controls = el("div", { class: "pagination" });
  controls.append(el("span", { text: "每页" }));
  const select = el("select", { "aria-label": "每页记录数" });
  [10, 25, 50, 100].forEach(size => select.append(el("option", { value: size, text: String(size), selected: size === state[config.stateKey].pageSize })));
  select.addEventListener("change", () => { state[config.stateKey].pageSize = Number(select.value); state[config.stateKey].page = 1; rerender(config.stateKey); });
  const previous = el("button", { type: "button", text: "←", disabled: state[config.stateKey].page <= 1, "aria-label": "上一页" });
  const next = el("button", { type: "button", text: "→", disabled: state[config.stateKey].page >= pageCount, "aria-label": "下一页" });
  previous.addEventListener("click", () => { state[config.stateKey].page -= 1; rerender(config.stateKey); });
  next.addEventListener("click", () => { state[config.stateKey].page += 1; rerender(config.stateKey); });
  controls.append(select, previous, el("span", { text: `${state[config.stateKey].page}/${pageCount}` }), next);
  footer.append(controls);
}

function rerender(key) { if (key === "fund") renderFunds(); if (key === "kpi") renderKpi(); if (key === "score") renderScore(); if (key === "profile") renderProfileFunds(); }

function bindCombobox(kind) {
  const input = document.getElementById(kind === "primary" ? "profile-manager-search" : "compare-manager-search");
  const options = document.getElementById(kind === "primary" ? "profile-manager-options" : "compare-manager-options");
  let timer;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => renderManagerOptions(kind, input.value), 80);
  });
  input.addEventListener("focus", () => renderManagerOptions(kind, input.value));
  input.addEventListener("keydown", event => { if (event.key === "Escape") { options.hidden = true; input.setAttribute("aria-expanded", "false"); } });
  document.addEventListener("click", event => {
    if (!input.closest(".manager-combobox")?.contains(event.target)) { options.hidden = true; input.setAttribute("aria-expanded", "false"); }
  });
}

function prepareProfileSearch() {
  document.getElementById("profile-manager-search").disabled = !state.managers?.length;
}

function renderManagerOptions(kind, query) {
  const optionsRoot = document.getElementById(kind === "primary" ? "profile-manager-options" : "compare-manager-options");
  const input = document.getElementById(kind === "primary" ? "profile-manager-search" : "compare-manager-search");
  optionsRoot.replaceChildren();
  const needle = normalizeSearch(query);
  let matches = (state.managers || []).filter(manager => {
    if (kind === "compare" && manager.id === state.profile.primaryId) return false;
    return !needle || normalizeSearch([manager.name, manager.id, manager.company, ...manager.currentFunds].join(" ")).includes(needle);
  }).slice(0, 40);
  if (!matches.length) optionsRoot.append(el("div", { class: "table-message" }, el("span", { text: "没有匹配的基金经理" })));
  matches.forEach(manager => {
    const option = el("div", { class: "combobox-option", role: "option" });
    const left = el("span");
    left.append(managerNameButton(manager), el("small", { class: "option-id", text: manager.id ? `ID ${manager.id}` : "ID未提供" }));
    const right = el("span");
    right.append(el("strong", { text: manager.company || "公司未提供" }));
    const currentFunds = manager.currentFunds.slice(0, 2).map((name, index) => fundNameButton({ id: manager.currentFundIds[index], code: manager.currentFundIds[index], name }, { className: "compact-fund-link" }));
    right.append(currentFunds.length ? entityList(currentFunds) : el("small", { text: "当前基金未提供" }));
    const choose = el("button", { type: "button", class: "secondary-button option-select", text: kind === "primary" ? "选中" : "对比" });
    choose.addEventListener("click", async () => {
      optionsRoot.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.value = `${manager.name} · ${manager.id} · ${manager.company}`;
      if (kind === "primary") {
        state.profile.primaryId = manager.id;
        if (state.profile.compareId === manager.id) state.profile.compareId = null;
        document.getElementById("compare-manager-open").disabled = false;
        await renderProfile();
      } else {
        state.profile.compareId = manager.id;
        document.getElementById("compare-dialog").close();
        await renderProfileRadar();
      }
    });
    option.append(left, right, choose);
    optionsRoot.append(option);
  });
  optionsRoot.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

async function renderProfile() {
  const manager = state.managers?.find(item => item.id === state.profile.primaryId);
  if (!manager) return;
  document.getElementById("profile-empty").hidden = true;
  document.getElementById("profile-content").hidden = false;
  setText("profile-monogram", manager.name.slice(0, 1) || "经");
  document.getElementById("profile-summary-title").replaceChildren(managerNameButton(manager, { className: "profile-manager-name" }));
  renderProfilePreferenceActions();
  const meta = document.getElementById("profile-identity-meta");
  meta.replaceChildren(el("span", { text: `ID ${manager.id || "未提供"}` }), el("span", { text: manager.company || "公司未提供" }), el("span", { text: displayFundTypes(manager.fundTypes) || "类型未提供" }));
  await Promise.all([loadManagerProfiles(), loadManagerDetails(manager.id)]).catch(error => showToast(`经理详情加载失败：${error.message}`));
  const profile = state.managerProfiles?.find(item => stringValue(item.manager_id ?? item.id) === manager.id) || {};
  const biography = manager.biography || stringValue(profile.biography);
  const academic = manager.academic || stringValue(profile.academic_background);
  setText("profile-biography", biography || "个人简介待补采；不使用推测内容。 ");
  setText("profile-academic", academic || "学术背景待补采；不使用推测内容。 ");
  renderProfileStats(manager, profile);
  renderProfileFunds();
  syncPeriodTabs("radar-periods", state.profile.period);
  renderProfileRadar();
}

function renderProfilePreferenceActions() {
  const root = document.getElementById("profile-preference-actions");
  if (!root) return;
  root.replaceChildren();
  const manager = state.managers?.find(item => item.id === state.profile.primaryId);
  if (manager) root.append(renderManagerPreferenceControls(manager));
}

function renderProfileStats(manager, profile) {
  const root = document.getElementById("profile-stats");
  root.replaceChildren();
  const career = profile.career_dates || {};
  const values = [
    ["从业起始", profile.start_date ?? career.start ?? manager.raw.career_start_date],
    ["从业经验", Number.isFinite(manager.experience) ? `${manager.experience.toFixed(1)}年` : null],
    ["当前管理基金", finite(profile.current_all_fund_count) ?? managerValue(manager, "currentAllCount")],
    ["单人样本", Number.isFinite(manager.soloDays) ? `${(manager.soloDays / 365.25).toFixed(1)}年` : null]
  ];
  values.forEach(([label, value]) => {
    const wrap = el("div");
    wrap.append(el("dt", { text: label }), el("dd", { text: value === null || value === undefined || value === "" ? "待补采" : String(value) }));
    root.append(wrap);
  });
}

function profileManagerDetails(managerId) {
  return state.managerDetailsById.get(managerId) || [];
}

function renderProfileFunds() {
  if (!state.profile.primaryId) return;
  const rows = dedupeProfileFunds(profileManagerDetails(state.profile.primaryId).map(normalizeProfileFund));
  if (!state.profile.sort) state.profile.sort = ["relation", "asc"];
  const sorted = sortRecords(rows, state.profile.sort, profileFundValue);
  renderDataTable({ table: "profile", columns: PROFILE_FUND_COLUMNS, records: sorted, stateKey: "profile", headId: "profile-fund-table-head", bodyId: "profile-fund-table-body", footerId: "profile-fund-table-footer", value: profileFundValue });
}

function normalizeProfileFund(raw) {
  const metrics = raw.solo_metrics || raw.metrics || {};
  const intervals = arrayValue(raw.tenure_intervals);
  const relationText = stringValue(raw.current_relation ?? raw.relationship_status);
  const current = raw.current_relation === true || Number(raw.is_current) === 1 || ["current", "当前", "当前管理"].includes(relationText);
  return {
    raw,
    strategyKey: stringValue(raw.strategy_key ?? raw.fund_id ?? raw.representative_code),
    relation: current ? "当前管理" : "历史管理",
    code: stringValue(raw.representative_code ?? raw.fund_code),
    name: stringValue(raw.fund_name ?? raw.name),
    type: normalizeFundType(raw.type ?? raw.fund_type),
    tenure: intervals.length ? formatIntervals(intervals) : stringValue(raw.tenure_intervals_text) || "任职区间待补采",
    tenureDays: finite(raw.solo_days),
    tenureReturn: finite(raw.tenure_return),
    annualReturn: percentValue(metricValue(metrics, "annualReturn")),
    peerRank: percentValue(metricValue(metrics, "peerRank")),
    holdingConcentration: percentValue(metricValue(metrics, "holdingConcentration")),
    industryConcentration: percentValue(metricValue(metrics, "industryConcentration")),
    maxStockWeight: percentValue(metricValue(metrics, "maxStockWeight")),
    hasSolo: raw.has_solo_period !== false && Number(raw.solo_days || 0) > 0,
    holdingsStatus: stringValue(raw.holdings_status ?? raw.holdings_status_reason)
  };
}

function dedupeProfileFunds(rows) {
  const seen = new Map();
  rows.forEach(row => {
    const key = row.strategyKey || row.code;
    if (!seen.has(key) || (row.relation === "当前管理" && seen.get(key).relation !== "当前管理")) seen.set(key, row);
  });
  return [...seen.values()];
}

function profileFundValue(row, key) { return row[key]; }

async function renderProfileRadar() {
  if (!state.profile.primaryId || !state.managers) return;
  const primary = state.managers.find(item => item.id === state.profile.primaryId);
  const compare = state.profile.compareId ? state.managers.find(item => item.id === state.profile.compareId) : null;
  const primaryRadar = radarWindow(primary, state.profile.period);
  const compareRadar = compare ? radarWindow(compare, state.profile.period) : null;
  drawRadar(primary, primaryRadar, compare, compareRadar);
}

function radarWindow(manager, period) {
  const windowData = manager?.radar?.[period] || manager?.radar?.[period.replace("y", "年")] || null;
  if (!windowData) return { values: null, reason: "该时间窗口尚未计算" };
  const axes = windowData.axes || windowData.scores || windowData;
  const result = RADAR_AXES.map(axis => {
    let entry = null;
    for (const key of axis.source) if (axes?.[key] !== undefined) { entry = axes[key]; break; }
    if (entry && typeof entry === "object") {
      return { score: finite(entry.score ?? entry.percentile), raw: entry.raw ?? entry.value ?? null, status: entry.status ?? null };
    }
    return { score: finite(entry), raw: null, status: null };
  });
  if (result.some(item => !Number.isFinite(item.score))) return { values: null, reason: windowData.reason || "该窗口存在缺失指标，未绘制不完整雷达图" };
  return { values: result, reason: null };
}

function drawRadar(primary, primaryRadar, compare, compareRadar, targets = {}) {
  const svg = document.getElementById(targets.svgId || "manager-radar");
  svg.replaceChildren();
  const center = { x: 320, y: 215 }, radius = 155;
  for (let level = 1; level <= 5; level += 1) {
    svg.append(svgEl("polygon", { points: polygonPoints(RADAR_AXES.length, center, radius * level / 5), class: "radar-grid" }));
  }
  RADAR_AXES.forEach((axis, index) => {
    const point = polarPoint(index, RADAR_AXES.length, center, radius);
    svg.append(svgEl("line", { x1: center.x, y1: center.y, x2: point.x, y2: point.y, class: "radar-axis" }));
    const labelPoint = polarPoint(index, RADAR_AXES.length, center, radius + 34);
    const label = svgEl("text", { x: labelPoint.x, y: labelPoint.y, class: "radar-label", "text-anchor": labelPoint.x < center.x - 10 ? "end" : labelPoint.x > center.x + 10 ? "start" : "middle", "dominant-baseline": "middle" });
    label.textContent = axis.label;
    svg.append(label);
  });
  const status = document.getElementById(targets.statusId || "radar-status");
  status.classList.remove("error");
  if (primaryRadar.values) appendRadarShape(svg, primaryRadar.values, center, radius, "primary", primary.name);
  if (compare && compareRadar?.values) appendRadarShape(svg, compareRadar.values, center, radius, "compare", compare.name);
  if (!primaryRadar.values) {
    status.textContent = primaryRadar.reason;
    status.classList.add("error");
  } else if (compare && !compareRadar?.values) {
    status.textContent = `${compare.name}：${compareRadar?.reason || "该窗口不可比"}`;
    status.classList.add("error");
  } else status.textContent = "分位分数越接近100，代表在当前可比样本中相对表现越强。";
  renderRadarLegend(primary, primaryRadar, compare, compareRadar, targets.legendId || "radar-legend", targets.allowRemoveCompare !== false);
}

function appendRadarShape(svg, values, center, radius, kind, name) {
  const points = values.map((item, index) => polarPoint(index, values.length, center, radius * clamp(item.score, 0, 100) / 100));
  const polygon = svgEl("polygon", { points: points.map(point => `${point.x},${point.y}`).join(" "), class: `radar-shape-${kind}` });
  polygon.append(svgEl("title", { text: `${name} 六维能力` }));
  svg.append(polygon);
  points.forEach((point, index) => {
    const circle = svgEl("circle", { cx: point.x, cy: point.y, r: 4.5, class: `radar-point-${kind}` });
    circle.append(svgEl("title", { text: `${RADAR_AXES[index].label}：${values[index].score.toFixed(1)}分位${values[index].raw !== null ? `；原始值 ${values[index].raw}` : ""}` }));
    svg.append(circle);
  });
}

function renderRadarLegend(primary, primaryRadar, compare, compareRadar, rootId = "radar-legend", allowRemoveCompare = true) {
  const root = document.getElementById(rootId);
  root.replaceChildren();
  [
    { manager: primary, radar: primaryRadar, compare: false },
    ...(compare ? [{ manager: compare, radar: compareRadar, compare: true }] : [])
  ].forEach(item => {
    const heading = el("div", { class: `legend-manager${item.compare ? " compare" : ""}` });
    const managerLabel = rootId === "manager-preview-legend" ? el("strong", { text: item.manager.name }) : managerNameButton(item.manager);
    heading.append(el("span", { class: "legend-swatch" }), el("div", {}, managerLabel, el("small", { text: `ID ${item.manager.id} · ${item.manager.company || "公司未提供"}` })));
    root.append(heading);
    if (item.radar?.values) {
      const list = el("ul", { class: "radar-metrics" });
      item.radar.values.forEach((value, index) => list.append(el("li", {}, el("span", { text: RADAR_AXES[index].label }), el("b", { text: value.score.toFixed(1) }))));
      root.append(list);
    } else root.append(el("p", { class: "missing", text: item.radar?.reason || "暂无可比数据" }));
  });
  if (compare && allowRemoveCompare) {
    const remove = el("button", { type: "button", class: "secondary-button", text: "移除对比经理" });
    remove.addEventListener("click", () => { state.profile.compareId = null; document.getElementById("compare-manager-search").value = ""; renderProfileRadar(); });
    root.append(remove);
  }
}

function renderHoldings() {
  renderHoldingsReportPeriods();
  renderHoldingsFavorites();
  renderHoldingsManagerOptions();
  renderSelectedManagers();
  renderHoldingsAnalysis();
}

function holdingsFundRows() {
  return Array.isArray(state.holdings?.funds) ? state.holdings.funds : [];
}

function formatReportPeriodLabel(reportDate) {
  const match = String(reportDate || "").match(/^(\d{4})-(\d{2})/);
  if (!match) return reportDate || "报告期未提供";
  return `${match[1]} Q${Math.ceil(Number(match[2]) / 3)}`;
}

function renderHoldingsReportPeriods() {
  const select = document.getElementById("holdings-report-period");
  if (!select || !state.holdings) return;
  const configured = Array.isArray(state.holdings.meta?.report_dates) ? state.holdings.meta.report_dates : [];
  const dates = [...new Set([...configured, ...holdingsFundRows().map(fund => fund.report_date).filter(Boolean)])].sort();
  if (state.holdingsView.reportPeriod !== "all" && !dates.includes(state.holdingsView.reportPeriod)) state.holdingsView.reportPeriod = "all";
  select.replaceChildren(el("option", { value: "all", text: "全部报告期" }), ...dates.map(date => el("option", { value: date, text: formatReportPeriodLabel(date) })));
  select.value = state.holdingsView.reportPeriod;
}

function renderHoldingsFavorites() {
  const root = document.getElementById("holdings-favorites");
  if (!root) return;
  root.replaceChildren(el("span", { class: "mini-label", text: "收藏经理" }));
  const favorites = (state.managers || []).filter(manager => preferenceFor(manager.id).favorite);
  if (!favorites.length) return root.append(el("span", { class: "missing", text: "暂无收藏，可在经理姓名旁点击星标" }));
  favorites.slice(0, 12).forEach(manager => {
    const shortcut = el("span", { class: "favorite-shortcut", title: `${manager.name} · ${manager.id}` });
    const add = el("button", { type: "button", class: "favorite-add", text: "+", "aria-label": `添加${manager.name}到持仓分析` });
    add.addEventListener("click", () => addHoldingsManager(manager.id));
    shortcut.append(el("span", { class: "favorite-glyph", "aria-hidden": "true", text: "⭐" }), managerNameButton(manager), add);
    root.append(shortcut);
  });
}

function renderHoldingsManagerOptions() {
  const root = document.getElementById("holdings-manager-options");
  if (!root || !state.managers) return;
  root.replaceChildren();
  const needle = normalizeSearch(state.holdingsView.query);
  if (!needle) {
    root.append(el("p", { class: "missing holdings-search-prompt", text: "输入基金经理姓名、ID或公司开始搜索。" }));
    return;
  }
  const selected = new Set(state.holdingsView.selectedIds);
  const managers = state.managers.filter(manager => normalizeSearch([manager.name, manager.id, manager.company].join(" ")).includes(needle)).slice(0, 50);
  managers.forEach(manager => {
    const row = el("div", { class: "holdings-manager-option" });
    const identity = el("div", {}, managerNameButton(manager), el("small", { text: `${manager.id} · ${manager.company || "公司未提供"}` }));
    const add = el("button", { type: "button", class: "secondary-button", text: selected.has(manager.id) ? "已添加" : "添加", disabled: selected.has(manager.id) });
    add.addEventListener("click", () => addHoldingsManager(manager.id));
    row.append(identity, renderManagerPreferenceControls(manager, true), add);
    root.append(row);
  });
  if (!managers.length) root.append(el("p", { class: "missing", text: "没有匹配的基金经理" }));
}

function addHoldingsManager(managerId) {
  if (!state.holdingsView.selectedIds.includes(managerId)) state.holdingsView.selectedIds.push(managerId);
  if (state.holdingsView.selectedIds.length > 10) showToast("已选择超过10位经理，矩阵仍可计算，但横向阅读会变得困难。");
  renderHoldings();
}

function removeHoldingsManager(managerId) {
  state.holdingsView.selectedIds = state.holdingsView.selectedIds.filter(id => id !== managerId);
  state.holdingsView.selectedStock = null;
  renderHoldings();
}

function clearHoldingsManagers() {
  state.holdingsView.selectedIds = [];
  state.holdingsView.selectedStock = null;
  renderHoldings();
  showToast("已清除全部基金经理。");
}

function renderSelectedManagers() {
  const root = document.getElementById("holdings-selected-managers");
  root.replaceChildren();
  const selected = selectedHoldingManagers();
  document.getElementById("holdings-manager-clear").disabled = !selected.length;
  if (!selected.length) return root.append(el("span", { class: "missing", text: "尚未选择基金经理" }));
  selected.forEach(manager => {
    const chip = el("span", { class: "selected-manager-chip" });
    chip.append(managerNameButton(manager), el("small", { text: manager.id }), renderManagerPreferenceControls(manager, true));
    const remove = el("button", { type: "button", class: "chip-remove", text: "×", "aria-label": `移除${manager.name}` });
    remove.addEventListener("click", () => removeHoldingsManager(manager.id));
    chip.append(remove);
    root.append(chip);
  });
}

function selectedHoldingManagers() {
  const map = new Map((state.managers || []).map(manager => [manager.id, manager]));
  return state.holdingsView.selectedIds.map(id => map.get(id)).filter(Boolean);
}

function includedHoldingFunds() {
  const selected = new Set(state.holdingsView.selectedIds);
  return holdingsFundRows().filter(fund => {
    if (!arrayValue(fund.manager_ids).some(id => selected.has(String(id)))) return false;
    if (state.holdingsView.reportPeriod !== "all" && fund.report_date !== state.holdingsView.reportPeriod) return false;
    return true;
  });
}

function buildHoldingsAnalysis() {
  const managers = selectedHoldingManagers();
  const includedFunds = includedHoldingFunds();
  const byManager = new Map();
  managers.forEach(manager => byManager.set(manager.id, { manager, funds: [], validFunds: [], missingFunds: [], stocks: new Map() }));
  includedFunds.forEach(fund => {
    arrayValue(fund.manager_ids).filter(id => byManager.has(String(id))).forEach(managerId => {
      const bucket = byManager.get(String(managerId));
      bucket.funds.push(fund);
      const holdings = Array.isArray(fund.holdings) ? fund.holdings : [];
      if (fund.status === "available" && holdings.length) bucket.validFunds.push(fund); else bucket.missingFunds.push(fund);
    });
  });
  byManager.forEach(bucket => {
    bucket.validFunds.forEach(fund => {
      fund.holdings.forEach(holding => {
        const code = stringValue(holding.security_code);
        if (!code) return;
        if (!bucket.stocks.has(code)) bucket.stocks.set(code, { code, name: stringValue(holding.security_name), weightSum: 0, fundCount: 0, details: [] });
        const stock = bucket.stocks.get(code);
        const weight = finite(holding.weight) || 0;
        stock.weightSum += weight;
        stock.fundCount += 1;
        stock.details.push({ managerId: bucket.manager.id, managerName: bucket.manager.name, fundId: fund.fund_id, fundName: fund.fund_name, relationship: fund.relationship, reportDate: fund.report_date, weight });
      });
    });
    bucket.stocks.forEach(stock => { stock.averageWeight = bucket.validFunds.length ? stock.weightSum / bucket.validFunds.length : 0; });
  });
  const aggregate = new Map();
  byManager.forEach(bucket => bucket.stocks.forEach(stock => {
    if (!aggregate.has(stock.code)) aggregate.set(stock.code, { code: stock.code, name: stock.name, managers: new Map(), details: [], averageWeightSum: 0 });
    const target = aggregate.get(stock.code);
    target.managers.set(bucket.manager.id, stock);
    target.details.push(...stock.details);
    target.averageWeightSum += stock.averageWeight;
  }));
  const managerCount = managers.length;
  const minimum = managerCount <= 1 ? 1 : state.holdingsView.minOverlap === "all" ? managerCount : Math.max(2, Number(state.holdingsView.minOverlap) || 2);
  const stockNeedle = normalizeSearch(state.holdingsView.stockQuery);
  const minWeight = Math.max(0, Number(state.holdingsView.minWeight) || 0) / 100;
  const stocks = [...aggregate.values()].map(stock => ({ ...stock, holderCount: stock.managers.size, coverage: managerCount ? stock.managers.size / managerCount : 0 }))
    .filter(stock => stock.holderCount >= minimum)
    .filter(stock => !stockNeedle || normalizeSearch(`${stock.code}${stock.name}`).includes(stockNeedle))
    .filter(stock => stock.averageWeightSum >= minWeight)
    .sort((a, b) => b.holderCount - a.holderCount || b.averageWeightSum - a.averageWeightSum || a.code.localeCompare(b.code));
  return { managers, includedFunds, byManager, stocks, minimum };
}

function renderHoldingsAnalysis() {
  if (!state.holdings) return;
  const analysis = buildHoldingsAnalysis();
  state.holdingsView.rows = analysis.stocks;
  const uniqueCovered = new Set();
  const uniqueMissing = new Set();
  analysis.byManager.forEach(bucket => { bucket.validFunds.forEach(fund => uniqueCovered.add(fund.fund_id)); bucket.missingFunds.forEach(fund => uniqueMissing.add(fund.fund_id)); });
  setText("holdings-kpi-intersections", formatInteger(analysis.stocks.length));
  setText("holdings-kpi-max-overlap", formatInteger(analysis.stocks.reduce((max, stock) => Math.max(max, stock.holderCount), 0)));
  setText("holdings-kpi-covered", formatInteger(uniqueCovered.size));
  setText("holdings-kpi-missing", formatInteger(uniqueMissing.size));
  renderHoldingsWarnings(analysis);
  renderHoldingFundGroups(analysis);
  renderHoldingsMatrix(analysis);
  if (state.holdingsView.selectedStock) renderHoldingDrilldown(state.holdingsView.selectedStock, analysis);
}

function renderHoldingsWarnings(analysis) {
  const root = document.getElementById("holdings-alert");
  const reportDates = new Set(analysis.includedFunds.filter(fund => fund.status === "available").map(fund => fund.report_date).filter(Boolean));
  const messages = [];
  if (!analysis.managers.length) messages.push("请先添加至少一位基金经理。");
  if (analysis.managers.length > 10) messages.push("已选择超过10位经理，矩阵可能需要较多横向滚动。");
  if (reportDates.size > 1) messages.push(`混合报告期：${[...reportDates].sort().join("、")}。比较时请注意披露时点不同。`);
  root.hidden = !messages.length;
  root.textContent = messages.join(" ");
}

function renderHoldingFundGroups(analysis) {
  const root = document.getElementById("holdings-fund-groups");
  root.replaceChildren();
  if (!analysis.managers.length) return root.append(el("p", { class: "missing", text: "选择经理后显示当前管理基金。" }));
  analysis.byManager.forEach(bucket => {
    const group = el("section", { class: "manager-fund-group" });
    group.append(el("h3", {}, managerNameButton(bucket.manager), el("small", { text: `${bucket.validFunds.length}只有效，${bucket.missingFunds.length}只缺失` })));
    const list = el("div", { class: "fund-pill-list" });
    bucket.funds.forEach(fund => {
      const status = fund.status === "available" ? `${fund.report_date}` : "暂无有效持仓";
      const pill = el("span", { class: `fund-pill ${fund.relationship}` }, fundNameButton(fund), el("small", { text: `${fund.fund_code} · ${fund.relationship === "solo" ? "单人" : "共同"} · ${status}` }));
      list.append(pill);
    });
    if (!bucket.funds.length) list.append(el("span", { class: "missing", text: "当前筛选下没有纳入基金" }));
    group.append(list);
    root.append(group);
  });
}

function renderHoldingsMatrix(analysis) {
  const table = document.getElementById("holdings-matrix");
  table.replaceChildren();
  const head = el("thead");
  const headRow = el("tr");
  headRow.append(el("th", { text: "股票" }), el("th", { text: "共同持仓" }));
  analysis.managers.forEach(manager => headRow.append(el("th", {}, managerNameButton(manager), el("small", { class: "manager-id", text: manager.id }))));
  head.append(headRow);
  const body = el("tbody");
  if (!analysis.stocks.length) {
    body.append(el("tr", { class: "table-message" }, el("td", { colSpan: analysis.managers.length + 2 }, el("strong", { text: analysis.managers.length ? "没有符合条件的股票" : "尚未选择基金经理" }), el("span", { text: analysis.managers.length === 1 ? "一位经理时会显示其全部前十大持仓。" : "至少两位经理持有即可进入共同持股结果；可降低门槛或调整筛选。" }))));
  }
  analysis.stocks.forEach(stock => {
    const row = el("tr", { class: "holding-stock-row" });
    const stockButton = el("button", { type: "button", class: "stock-link" }, el("strong", { text: stock.name }), el("small", { text: stock.code }));
    stockButton.addEventListener("click", () => { state.holdingsView.selectedStock = stock.code; renderHoldingDrilldown(stock.code, analysis); });
    row.append(el("td", {}, stockButton));
    row.append(el("td", { class: "overlap-cell" }, el("strong", { text: `${stock.holderCount}/${analysis.managers.length}位` }), el("small", { text: `覆盖${(stock.coverage * 100).toFixed(0)}%` })));
    analysis.managers.forEach(manager => {
      const value = stock.managers.get(manager.id);
      const cell = el("td", { class: value ? "holding-value" : "holding-empty" });
      if (value) cell.append(el("strong", { text: formatPercent(value.averageWeight * 100) }), el("small", { text: `${value.fundCount}只基金持有` }));
      row.append(cell);
    });
    body.append(row);
  });
  table.append(head, body);
  setText("holdings-result-note", analysis.managers.length === 1 ? "单经理模式：显示全部前十大持仓，不标记跨经理交集。" : `当前门槛：至少${analysis.minimum}位经理持有；按共同经理数和平均权重合计排序。`);
}

function renderHoldingDrilldown(stockCode, analysis) {
  const stock = analysis.stocks.find(item => item.code === stockCode);
  const section = document.getElementById("holding-drilldown");
  if (!stock) { section.hidden = true; return; }
  section.hidden = false;
  setText("holding-drilldown-title", `${stock.name} · ${stock.code}`);
  setText("holding-drilldown-summary", `${stock.holderCount}/${analysis.managers.length}位经理持有，覆盖${(stock.coverage * 100).toFixed(0)}%。以下为披露基金、报告期和实际权重。`);
  const head = document.getElementById("holding-detail-head");
  head.replaceChildren(el("tr", {}, ...["基金经理", "基金", "管理关系", "报告期", "实际权重"].map(label => el("th", { text: label }))));
  const body = document.getElementById("holding-detail-body");
  body.replaceChildren();
  stock.details.sort((a, b) => b.weight - a.weight).forEach(detail => body.append(el("tr", {}, el("td", {}, managerNameButton({ id: detail.managerId, name: detail.managerName }), el("small", { class: "manager-id", text: detail.managerId })), el("td", {}, fundNameButton({ id: detail.fundId, code: detail.fundId, name: detail.fundName })), el("td", { text: detail.relationship === "solo" ? "当前单人" : "当前共同" }), el("td", { text: detail.reportDate || "未提供" }), el("td", { class: "numeric", text: formatPercent(detail.weight * 100) }))));
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderGuide() {
  const root = document.getElementById("guide-content");
  if (!root || !state.guide) return;
  root.replaceChildren();
  const tab = state.guideView.tab;
  if (tab === "indicators") return renderGuideIndicators(root, state.guide.indicators || []);
  if (tab === "data_notes") return renderGuideNotes(root, state.guide.data_notes || []);
  if (tab === "formulas") return renderGuideFormulaTable(root, state.guide.formulas || []);
  renderGuideScoring(root, state.guide.scoring || {});
}

function guideCategoryClass(category) {
  if (category.includes("进攻")) return "offense";
  if (category.includes("防御")) return "defense";
  if (category.includes("综合")) return "composite";
  if (category.includes("复杂")) return "complexity";
  return "context";
}

function normalizeGuideIndicatorCategory(category) {
  return category === "当前管理复杂度" ? "综合指标" : category;
}

function renderGuideIndicators(root, rows) {
  const formulas = new Map((state.guide.formulas || []).map(item => [item.name, item]));
  const categories = [...new Set(rows.map(row => normalizeGuideIndicatorCategory(row.category || "其他")))];
  let selectedCategory = "全部";

  const heading = el("header", { class: "guide-page-heading" },
    el("div", {}, el("h1", { text: "指标定义与计算逻辑" }), el("p", { text: "按指标类型筛选，并查看每项指标的作用、判断方向和现行计算口径。" })),
    el("span", { class: "guide-count", text: `${rows.length} 项指标` })
  );
  const search = el("label", { class: "search-box guide-search" }, icon("i-search"), el("input", { type: "search", placeholder: "搜索指标名称、作用或公式", "aria-label": "搜索指标定义与计算逻辑" }));
  const filters = el("div", { class: "indicator-filters", role: "group", "aria-label": "指标类型筛选" });
  ["全部", ...categories].forEach(category => {
    const button = el("button", { type: "button", class: `${category === "全部" ? "active " : ""}${category === "全部" ? "all" : guideCategoryClass(category)}`, text: category });
    button.addEventListener("click", () => {
      selectedCategory = category;
      filters.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
      draw();
    });
    filters.append(button);
  });
  const controls = el("div", { class: "indicator-controls" }, filters, search);
  const shell = el("div", { class: "table-shell indicator-table-shell" });
  const scroll = el("div", { class: "table-scroll" });
  const table = el("table", { class: "indicator-table" });
  const head = el("thead", {}, el("tr", {}, ...["指标类型", "指标名称", "指标作用", "如何看指标", "计算公式"].map(label => el("th", { text: label }))));
  const body = el("tbody");

  const draw = () => {
    body.replaceChildren();
    const needle = normalizeSearch(search.querySelector("input").value);
    const filtered = rows.filter(row => {
      const formula = formulas.get(row.name);
      const category = normalizeGuideIndicatorCategory(row.category || "其他");
      const matchesCategory = selectedCategory === "全部" || category === selectedCategory;
      const haystack = normalizeSearch([category, row.name, row.plain_language, row.direction, formula?.logic].filter(Boolean).join(" "));
      return matchesCategory && (!needle || haystack.includes(needle));
    });
    filtered.forEach(row => {
      const category = normalizeGuideIndicatorCategory(row.category || "其他");
      const tone = guideCategoryClass(category);
      const formula = formulas.get(row.name);
      body.append(el("tr", { class: `indicator-row ${tone}` },
        el("td", {}, el("span", { class: `indicator-type ${tone}`, text: category })),
        el("td", { class: "indicator-name", text: row.name }),
        el("td", { class: "indicator-purpose", text: row.plain_language || "说明待补充" }),
        el("td", { class: "indicator-direction", text: row.direction || "中性" }),
        el("td", { class: "indicator-formula", text: formula?.logic || "当前配置未提供计算公式" })
      ));
    });
    if (!filtered.length) body.append(el("tr", { class: "table-message" }, el("td", { colSpan: 5, text: "没有符合条件的指标" })));
    heading.querySelector(".guide-count").textContent = `${filtered.length} / ${rows.length} 项指标`;
  };

  search.querySelector("input").addEventListener("input", draw);
  draw();
  table.append(head, body); scroll.append(table); shell.append(scroll); root.append(heading, controls, shell);
}

function renderGuideNotes(root, rows) {
  const sourceCutoff = state.manifest?.source_metadata?.source_fetched_through;
  const generatedAt = state.manifest?.generated_at;
  const holdingDates = Array.isArray(state.manifest?.holdings?.report_dates) ? state.manifest.holdings.report_dates : [];
  const reportLabels = holdingDates.map(date => `${formatReportPeriodLabel(date)}（${date}）`).join("、");
  const displayRows = rows.map(item => {
    if (item.topic === "数据采集顺序") return {
      topic: "数据截止日期",
      summary: `源数据抓取截至${formatDateOnly(sourceCutoff)}（北京时间），页面构建于${formatDateOnly(generatedAt)}；仍按天天基金Skill和东方财富、AKShare、网页补充的顺序采集。`
    };
    if (item.topic === "持仓时点") return {
      ...item,
      summary: `基金持仓为${reportLabels || "最新可获得报告期"}的定期报告前十大持仓披露，不是实时交易仓位；可按报告期筛选，缺失有效持仓的基金不进入权重分母。`
    };
    return item;
  });
  const kpiSpecs = [
    { noteIndex: 0, label: "基金", unit: "只", icon: "i-pie" },
    { noteIndex: 1, label: "经理", unit: "位", icon: "i-profile" },
    { noteIndex: 2, label: "关系", unit: "条", icon: "i-network" },
    { noteIndex: 4, label: "持仓覆盖", unit: "只", icon: "i-defense" }
  ];
  const extractCount = index => (displayRows[index]?.summary || "").match(/[\d,]+/)?.[0] || "—";
  const heading = el("header", { class: "guide-page-heading" }, el("div", {}, el("h1", { text: "数据说明" }), el("p", { text: "当前数据范围、覆盖情况与采集规则。" })));
  const overview = el("section", { class: "data-overview", "aria-label": "数据覆盖概览" });
  kpiSpecs.forEach(spec => overview.append(el("div", { class: "data-overview-item" },
    el("span", { class: "data-overview-icon" }, icon(spec.icon)),
    el("div", {}, el("strong", { text: spec.label }), el("p", {}, el("b", { text: extractCount(spec.noteIndex) }), el("span", { text: spec.unit })))
  )));
  const grid = el("div", { class: "data-note-grid" });
  displayRows.forEach((item, index) => {
    grid.append(el("article", { class: "data-note" },
      el("header", {}, el("span", { text: String(index + 1).padStart(2, "0") }), el("h2", { text: item.topic })),
      el("p", { text: item.summary })
    ));
  });
  root.append(heading, overview, grid);
}

function renderGuideFormulaTable(root, rows) {
  const heading = el("header", { class: "guide-page-heading" }, el("div", {}, el("h1", { text: "指标口径与来源" }), el("p", { text: "核对指标性质、适用维度、现行计算口径与数据来源。" })), el("span", { class: "guide-count", text: `${rows.length} 条口径` }));
  const search = el("label", { class: "search-box guide-search" }, icon("i-search"), el("input", { type: "search", placeholder: "搜索指标名称、口径或来源", "aria-label": "搜索指标口径与来源" }));
  const shell = el("div", { class: "table-shell formula-table-shell" });
  const scroll = el("div", { class: "table-scroll" });
  const table = el("table", { class: "formula-table" });
  const head = el("thead", {}, el("tr", {}, ...["分类", "指标名称", "性质", "适用维度", "公式或逻辑", "数据来源"].map(label => el("th", { text: label }))));
  const body = el("tbody");
  const draw = query => {
    body.replaceChildren();
    const needle = normalizeSearch(query);
    rows.filter(row => !needle || normalizeSearch(Object.values(row).join(" ")).includes(needle)).forEach(row => body.append(el("tr", {}, el("td", { text: simplifyGuideFormulaCategory(row.category) }), el("td", { text: row.name }), el("td", {}, el("span", { class: `source-badge ${row.nature === "计算生成" ? "computed" : "direct"}`, text: row.nature })), el("td", { text: row.dimension }), el("td", { text: row.logic }), el("td", { text: row.source }))));
  };
  search.querySelector("input").addEventListener("input", event => draw(event.target.value));
  draw(""); table.append(head, body); scroll.append(table); shell.append(scroll); root.append(heading, search, shell);
}

function simplifyGuideFormulaCategory(category) {
  return ({
    "基金基础字段": "基础字段",
    "基金池判定": "基金池",
    "区间收益快照": "收益快照",
    "进攻型指标": "进攻型",
    "防御指标": "防御型",
    "综合指标": "综合型",
    "非收益指标": "非收益",
    "当前管理复杂度": "综合型"
  })[category] || category || "其他";
}

function renderGuideScoring(root, scoring) {
  const sampleScores = {
    "年化收益率": 80,
    "年化超额收益": 70,
    "上行捕获率": 60,
    "同类排名分位": 60,
    "最大回撤反向分位": 50,
    "下行捕获率反向分位": 80,
    "同类中位基准Alpha": 65,
    "沪深300全收益Alpha": 60,
    "夏普比率": 70,
    "卡玛比率": 80
  };
  const flowLabels = [
    ["确定维度", "选择7个评分维度", "i-composite"],
    ["设定权重", "为各维度分配权重", "i-calculator"],
    ["数据归一化", "将数据标准化处理", "i-kpi"],
    ["计算进攻分", "评估进攻相关维度得分", "i-offense"],
    ["计算防守分", "评估防守相关维度得分", "i-defense"],
    ["计算综合分", "综合进攻分与防守分", "i-composite"],
    ["输出结果", "生成评分与建议", "i-list"]
  ];
  const heading = el("header", { class: "scoring-heading" },
    el("div", {}, el("span", { class: "scoring-heading-icon" }, icon("i-score")), el("div", {}, el("h1", { text: "评分维度权重分布" }), el("p", { text: "根据7条评分维度计算进攻分、防守分和综合分；权重可用于试算，但不会绕过固定资格与防守门槛。" }))),
    el("span", { class: "score-scheme", text: "当前方案：默认方案" })
  );
  const workspace = el("div", { class: "scoring-workspace" });
  const flow = el("aside", { class: "score-flow-panel" }, el("h2", { text: "打分演绎流程" }));
  const flowList = el("ol");
  flowLabels.forEach(([name, description, iconId], index) => flowList.append(el("li", { class: iconId === "i-offense" ? "offense" : "" },
    el("span", { class: "score-flow-index", text: String(index + 1) }),
    el("span", { class: "score-flow-icon" }, icon(iconId)),
    el("div", {}, el("strong", { text: name }), el("small", { text: description }))
  )));
  flow.append(flowList);

  const canvas = el("div", { class: "scoring-canvas" });
  const overview = el("section", { class: "score-overview" });
  overview.append(el("header", {}, el("h2", {}, icon("i-composite"), "评分总览"), el("span", { text: "权重总计：100%" })));
  const weightBar = el("div", { class: "score-weight-bar", role: "img", "aria-label": "进攻分40%，防守分30%，综合分30%" });
  (scoring.components || []).forEach(component => {
    const segment = el("div", { class: `score-weight-segment ${component.key}` }, el("strong", { text: `${(component.weight * 100).toFixed(0)}%` }), el("span", { text: component.name }));
    segment.style.width = `${component.weight * 100}%`;
    weightBar.append(segment);
  });
  overview.append(weightBar, el("div", { class: "score-weight-scale" }, ...["0%", "25%", "50%", "75%", "100%"].map(value => el("span", { text: value }))));
  canvas.append(overview);

  const components = el("div", { class: "score-component-grid" });
  const componentScores = new Map();
  (scoring.components || []).forEach(component => {
    const score = component.metrics.reduce((total, metric) => total + (sampleScores[metric.name] ?? 0) * metric.weight, 0);
    componentScores.set(component.key, score);
    const description = component.key === "offense" ? "衡量进攻效率与得分能力" : component.key === "defense" ? "衡量防守强度与失分控制" : "衡量整体表现与稳定性";
    const card = el("article", { class: `score-component ${component.key}` },
      el("header", {},
        el("div", { class: "score-component-title" }, icon(`i-${component.key === "composite" ? "composite" : component.key}`), el("div", {}, el("h2", {}, component.name, el("span", { text: `（${(component.weight * 100).toFixed(0)}%）` })), el("p", { text: description }))),
        el("div", { class: "score-current" }, el("small", { text: "算例得分" }), el("strong", { text: score.toFixed(1) }))
      )
    );
    const list = el("ul");
    component.metrics.forEach(metric => list.append(el("li", {}, el("span", { text: metric.name }), el("b", { text: `${(metric.weight * 100).toFixed(0)}%` }))));
    const meter = el("div", { class: "score-component-meter" }, el("span", { text: "0%" }), el("i"), el("span", { text: "100%" }));
    meter.querySelector("i").style.setProperty("--score-position", `${score}%`);
    card.append(list, meter); components.append(card);
  });
  canvas.append(components);

  const lower = el("div", { class: "scoring-lower" });
  const gates = el("section", { class: "score-gates" }, el("h2", {}, icon("i-defense"), "固定资格与防守门槛"));
  const gateColumns = el("div", { class: "gate-columns" });
  [["固定资格", (scoring.eligibility || []).slice(0, 2)], ["防守门槛", (scoring.eligibility || []).slice(2)]].forEach(([title, items]) => {
    const column = el("div", {}, el("h3", { text: title }), el("ul"));
    items.forEach(item => column.querySelector("ul").append(el("li", {}, el("span", { text: "✓" }), `${item.name} ${item.rule}`)));
    gateColumns.append(column);
  });
  gates.append(gateColumns);

  const metrics = (scoring.components || []).flatMap(component => component.metrics);
  const example = el("section", { class: "score-example" }, el("h2", {}, icon("i-calculator"), "算例说明"), el("p", { text: "根据示例给出的各项指标得分如下（均已归一化为百分制）：" }));
  const exampleScroll = el("div", { class: "score-example-scroll" });
  const exampleTable = el("table");
  exampleTable.append(
    el("thead", {}, el("tr", {}, el("th", { text: "维度" }), ...metrics.map(metric => el("th", { text: metric.name })))),
    el("tbody", {},
      el("tr", {}, el("th", { text: "得分" }), ...metrics.map(metric => el("td", { text: sampleScores[metric.name] ?? "—" }))),
      el("tr", {}, el("th", { text: "权重" }), ...metrics.map(metric => el("td", { text: `${(metric.weight * 100).toFixed(0)}%` })))
    )
  );
  exampleScroll.append(exampleTable);
  const calculations = el("div", { class: "score-calculations" });
  (scoring.components || []).forEach(component => {
    const expression = component.metrics.map(metric => `${sampleScores[metric.name] ?? 0}×${(metric.weight * 100).toFixed(0)}%`).join(" + ");
    calculations.append(el("p", { class: component.key }, el("strong", { text: `${component.name} = ` }), `${expression} = ${componentScores.get(component.key).toFixed(1)}分`));
  });
  const interpretation = el("ul", { class: "score-interpretation" },
    el("li", { text: "进攻分反映进攻能力" }),
    el("li", { text: "防守分反映风险控制能力" }),
    el("li", { text: "综合分反映整体表现" })
  );
  example.append(exampleScroll, el("div", { class: "score-example-bottom" }, calculations, interpretation));
  lower.append(gates, example); canvas.append(lower);
  workspace.append(flow, canvas); root.append(heading, workspace, el("p", { class: "score-disclaimer", text: "评分结果仅供参考，不构成任何投资建议；请结合实际情况审慎决策。" }));
}

async function loadCustomReturns() {
  const start = document.getElementById("custom-start").value;
  const end = document.getElementById("custom-end").value;
  const status = document.getElementById("custom-return-status");
  if (!start || !end || start >= end) {
    status.textContent = "请选择有效的开始和结束日期。";
    status.className = "inline-status error";
    return;
  }
  const endpoint = state.manifest?.custom_return_endpoint;
  if (!endpoint) {
    status.textContent = "自定义区间待接入按需计算服务；静态版不估算、不填入假值。";
    status.className = "inline-status error";
    return;
  }
  const path = endpoint.replace("{start}", encodeURIComponent(start)).replace("{end}", encodeURIComponent(end));
  try {
    const payload = await fetchJson(path.startsWith("http") || path.startsWith(".") || path.startsWith("/") ? path : `${DATA_ROOT}/${path}`);
    const records = payloadArray(payload, ["rows", "returns", "records", "data"]);
    const map = new Map(records.map(item => [stringValue(item.fund_id ?? item.strategy_key ?? item.code), percentValue(item.return ?? item.custom_return)]));
    state.funds.forEach(fund => { fund.customReturn = map.get(fund.id) ?? map.get(fund.code) ?? null; });
    state.fund.custom = { start, end };
    status.textContent = `已载入 ${start} 至 ${end} 的可审计预计算结果；无记录的基金保持缺失。`;
    status.className = "inline-status success";
    renderFunds();
  } catch (error) {
    status.textContent = `自定义区间数据不可用：${error.message}`;
    status.className = "inline-status error";
  }
}

function exportCurrent(scope) {
  let columns, records, value, filename;
  if (scope === "funds") {
    columns = FUND_COLUMNS.filter(column => column.key !== "sequence");
    const query = normalizeSearch(state.fund.query);
    records = state.funds.filter(fund => (state.fund.type === "all" || fund.type === state.fund.type) && (!query || normalizeSearch([fund.code, fund.name, fund.company, ...fund.managers].join(" ")).includes(query)));
    value = fundValue; filename = "基金看板_当前结果.csv";
  } else if (scope === "kpi") {
    columns = state.kpi.columns.map(key => KPI_FIELDS.find(field => field.key === key)).filter(Boolean);
    records = filterManagers(state.managers, state.kpi.query, state.kpi.filters);
    value = managerValue; filename = "基金经理KPI_当前结果.csv";
  } else {
    columns = SCORE_COLUMNS;
    const built = buildScoreRecords(state.managers);
    records = filterScoreRecords(built, state.score.query, state.score.filters);
    value = scoreValue; filename = "基金经理评分_试算结果.csv";
  }
  const lines = [columns.map(column => csvCell(column.label)).join(",")];
  records.forEach(record => lines.push(columns.map(column => {
    const raw = value(record, column.key);
    const formatted = Array.isArray(raw) ? raw.join("；") : column.kind === "percent" ? formatPercent(raw) : raw ?? "";
    return csvCell(formatted);
  }).join(",")));
  const blob = new Blob(["\ufeff", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function showViewError(view, error) {
  const map = { funds: ["fund-table-body", 12], kpi: ["kpi-table-body", state.kpi.columns.length], score: ["score-table-body", SCORE_COLUMNS.length] };
  if (map[view]) renderTableMessage(map[view][0], map[view][1], "数据加载失败", error.message);
  else if (view === "profile") {
    document.getElementById("profile-empty").hidden = false;
    document.getElementById("profile-empty").querySelector("h2").textContent = "基金经理数据加载失败";
    document.getElementById("profile-empty").querySelector("p").textContent = error.message;
  } else {
    const target = document.getElementById(view === "holdings" ? "holdings-alert" : "guide-content");
    if (target) { target.hidden = false; target.replaceChildren(el("p", { class: "error", text: `数据加载失败：${error.message}` })); }
  }
}

function renderTableMessage(bodyId, colspan, title, detail = "请检查数据文件是否已生成并通过HTTP服务访问。") {
  const body = document.getElementById(bodyId);
  if (!body) return;
  body.replaceChildren(el("tr", { class: "table-message" }, el("td", { colSpan: colspan }, el("strong", { text: title }), el("span", { text: detail }))));
}

function sortRecords(records, [key, direction], getter) {
  const factor = direction === "asc" ? 1 : -1;
  return [...records].sort((a, b) => {
    const aValue = getter(a, key);
    const bValue = getter(b, key);
    const aMissing = missingValue(aValue);
    const bMissing = missingValue(bValue);
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    return compareValues(aValue, bValue) * factor;
  });
}

function compareValues(a, b) {
  if (Array.isArray(a)) a = a.join(" ");
  if (Array.isArray(b)) b = b.join(" ");
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "zh-CN", { numeric: true, sensitivity: "base" });
}
function missingValue(value) { return value === null || value === undefined || value === "" || (typeof value === "number" && !Number.isFinite(value)); }

function returnBins() { return [["ltNeg10", "<-10%"], ["neg10to0", "-10%-0%"], ["0to10", "0%-10%"], ["10to20", "10%-20%"], ["gte20", "≥20%"], ["missing", "不可计算 / 数据不足"]]; }
function matchesReturnBin(value, option) { return ({ ltNeg10: value < -10, neg10to0: value >= -10 && value < 0, "0to10": value >= 0 && value < 10, "10to20": value >= 10 && value < 20, gte20: value >= 20 })[option] || false; }
function matchesDrawdownBin(value, option) { return ({ ltNeg50: value < -50, neg50to40: value >= -50 && value < -40, neg40to30: value >= -40 && value < -30, neg30to20: value >= -30 && value < -20, gteNeg20: value >= -20 })[option] || false; }
function matchesPositiveBins(value, option, cuts, experience = false) {
  if (experience) return ({ lt2: value < cuts[0], "2to5": value >= cuts[0] && value < cuts[1], "5to10": value >= cuts[1] && value < cuts[2], gte10: value >= cuts[2] })[option] || false;
  return ({ lt2: value < cuts[0], "2to10": value >= cuts[0] && value < cuts[1], "10to50": value >= cuts[1] && value < cuts[2], "50to100": value >= cuts[2] && value < cuts[3], gte100: value >= cuts[3] })[option] || false;
}

function displayFundTypes(types) {
  const unique = [...new Set(types.filter(Boolean))];
  if (unique.includes("股票型") && unique.includes("偏股混合型")) return "股票 + 偏股";
  if (unique.includes("股票型")) return "股票";
  if (unique.includes("偏股混合型")) return "偏股";
  return unique.join(" + ");
}

function normalizeFundType(value) {
  const text = stringValue(value);
  if (text.includes("股票")) return "股票型";
  if (text.includes("偏股")) return "偏股混合型";
  return text;
}

function formatIntervals(intervals) {
  if (!intervals.length) return "任职区间待补采";
  return intervals.map(item => {
    if (typeof item === "string") return item;
    const start = item.start_date ?? item.start ?? "?";
    const end = item.end_date ?? item.end ?? "至今";
    const relation = item.is_solo === true || item.management_type === "solo" ? "单人" : item.is_joint === true || item.management_type === "joint" ? "共同" : "";
    return `${start}${String(end) === "至今" ? " 至今" : ` 至 ${end}`}${relation ? `（${relation}）` : ""}`;
  }).join("；");
}

function formatPercent(value) { return Number.isFinite(value) ? `${value.toFixed(1)}%` : "待补采"; }
function formatInteger(value) { return Number.isFinite(Number(value)) ? new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(Number(value)) : "待补采"; }
function formatDateTime(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function formatDateOnly(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value || "未提供") : new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric" }).format(date); }
function median(values) { const clean = values.filter(Number.isFinite).sort((a, b) => a - b); if (!clean.length) return null; const mid = Math.floor(clean.length / 2); return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2; }
function finite(value) { if (value === null || value === undefined || value === "") return null; const number = Number(value); return Number.isFinite(number) ? number : null; }
function percentValue(value) { const number = finite(value); return Number.isFinite(number) ? number * 100 : null; }
function stringValue(value) { return value === null || value === undefined ? "" : String(value).trim(); }
function arrayValue(value) { if (Array.isArray(value)) return value.filter(item => item !== null && item !== undefined && item !== ""); if (value === null || value === undefined || value === "") return []; return String(value).split(/[；;,|]/).map(item => item.trim()).filter(Boolean); }
function normalizeSearch(value) { return String(value || "").normalize("NFKC").toLocaleLowerCase("zh-CN").replace(/\s+/g, ""); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function setText(id, value) { const node = document.getElementById(id); if (node) node.textContent = value; }

function toggleTheme() {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(STORAGE.theme, document.documentElement.dataset.theme);
  updateThemeButton();
}
function updateThemeButton() { const theme = document.documentElement.dataset.theme; const node = document.querySelector("#theme-toggle span"); if (node) node.textContent = theme === "dark" ? "切换浅色" : "切换深色"; }

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3600);
}

function icon(id) { const svg = svgEl("svg", { "aria-hidden": "true" }); svg.append(svgEl("use", { href: `#${id}` })); return svg; }
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "dataset") Object.entries(value).forEach(([dataKey, dataValue]) => { node.dataset[dataKey] = dataValue; });
    else if (key in node && !key.includes("-")) node[key] = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  });
  children.flat().forEach(child => { if (child instanceof Node) node.append(child); else if (child !== null && child !== undefined) node.append(document.createTextNode(String(child))); });
  return node;
}
function svgEl(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "text") node.textContent = value; else node.setAttribute(key, String(value));
  });
  return node;
}
function polarPoint(index, count, center, radius) { const angle = -Math.PI / 2 + index * Math.PI * 2 / count; return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }; }
function polygonPoints(count, center, radius) { return Array.from({ length: count }, (_, index) => { const point = polarPoint(index, count, center, radius); return `${point.x},${point.y}`; }).join(" "); }
