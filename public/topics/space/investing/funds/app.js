"use strict";

const DATA_ROOT = "./data";
const STORAGE = {
  theme: "fund-dashboard-theme-v1",
  kpiColumns: "fund-dashboard-kpi-columns-v1"
};

const state = {
  activeView: "funds",
  manifest: null,
  funds: null,
  managers: null,
  managerDetails: null,
  managerDetailsById: new Map(),
  managerProfiles: null,
  loads: new Map(),
  fund: { type: "all", query: "", sort: ["return1y", "desc"], page: 1, pageSize: 50, custom: null },
  kpi: { query: "", sort: ["manager", "asc"], page: 1, pageSize: 25, filters: new Map(), columns: [] },
  score: { query: "", sort: ["trialRank", "asc"], page: 1, pageSize: 25, filters: new Map(), draftWeights: [40, 30, 30], appliedWeights: [40, 30, 30], weightsDirty: false },
  profile: { primaryId: null, compareId: null, period: "1y", page: 1, pageSize: 25, sort: ["relation", "asc"] }
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
    document.querySelectorAll("#radar-periods button").forEach(item => item.classList.toggle("active", item === button));
    renderProfileRadar();
  });
}

function bindSearch(id, callback) {
  let timer;
  document.getElementById(id).addEventListener("input", event => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(event.target.value.trim()), 120);
  });
}

async function activateView(name) {
  const view = ["funds", "kpi", "score", "profile"].includes(name) ? name : "funds";
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
    cell.append(el("span", { class: "manager-name", text: manager.name || "未提供" }), el("span", { class: "manager-id", text: manager.id || "ID未提供" }));
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
    const button = el("button", { type: "button", class: "combobox-option", role: "option" });
    const left = el("span");
    left.append(el("strong", { text: manager.name || "姓名未提供" }), el("small", { class: "option-id", text: manager.id ? `ID ${manager.id}` : "ID未提供" }));
    const right = el("span");
    right.append(el("strong", { text: manager.company || "公司未提供" }), el("small", { text: manager.currentFunds.slice(0, 2).join("；") || "当前基金未提供" }));
    button.append(left, right);
    button.addEventListener("click", async () => {
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
    optionsRoot.append(button);
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
  setText("profile-summary-title", manager.name || "姓名未提供");
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
  renderProfileRadar();
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

function drawRadar(primary, primaryRadar, compare, compareRadar) {
  const svg = document.getElementById("manager-radar");
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
  const status = document.getElementById("radar-status");
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
  renderRadarLegend(primary, primaryRadar, compare, compareRadar);
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

function renderRadarLegend(primary, primaryRadar, compare, compareRadar) {
  const root = document.getElementById("radar-legend");
  root.replaceChildren();
  [
    { manager: primary, radar: primaryRadar, compare: false },
    ...(compare ? [{ manager: compare, radar: compareRadar, compare: true }] : [])
  ].forEach(item => {
    const heading = el("div", { class: `legend-manager${item.compare ? " compare" : ""}` });
    heading.append(el("span", { class: "legend-swatch" }), el("div", {}, el("strong", { text: item.manager.name }), el("small", { text: `ID ${item.manager.id} · ${item.manager.company || "公司未提供"}` })));
    root.append(heading);
    if (item.radar?.values) {
      const list = el("ul", { class: "radar-metrics" });
      item.radar.values.forEach((value, index) => list.append(el("li", {}, el("span", { text: RADAR_AXES[index].label }), el("b", { text: value.score.toFixed(1) }))));
      root.append(list);
    } else root.append(el("p", { class: "missing", text: item.radar?.reason || "暂无可比数据" }));
  });
  if (compare) {
    const remove = el("button", { type: "button", class: "secondary-button", text: "移除对比经理" });
    remove.addEventListener("click", () => { state.profile.compareId = null; document.getElementById("compare-manager-search").value = ""; renderProfileRadar(); });
    root.append(remove);
  }
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
    const allowed = new Set(filterManagers(state.managers, state.score.query, state.score.filters).map(item => item.id));
    records = built.filter(item => allowed.has(item.manager.id));
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
  else {
    document.getElementById("profile-empty").hidden = false;
    document.getElementById("profile-empty").querySelector("h2").textContent = "基金经理数据加载失败";
    document.getElementById("profile-empty").querySelector("p").textContent = error.message;
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

function icon(id) { const svg = el("svg", { "aria-hidden": "true" }); svg.append(svgEl("use", { href: `#${id}` })); return svg; }
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
