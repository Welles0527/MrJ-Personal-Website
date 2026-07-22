const STATUS_SUMMARY_URL = "https://status.openai.com/api/v2/summary.json";
const STATUS_INCIDENTS_URL = "https://status.openai.com/api/v2/incidents.json";
const STORAGE_KEY = "codex-reset-radar-signals-v1";

const DEFAULT_SIGNALS = Object.freeze({
  tiboSignal: "none",
  tiboUrl: "https://x.com/thsottiaux/status/2078320950488297917",
  currentUsers: 9,
  milestoneUrl: "https://x.com/thsottiaux/status/2077607697487188198",
  launchSignal: "none",
  launchUrl: "https://help.openai.com/en/articles/6825453-chatgpt-release-notes",
  note: "",
  updatedAt: "2026-07-17T00:00:00+08:00",
});

const state = {
  manual: loadManualSignals(),
  status: {
    loaded: false,
    failed: false,
    codexComponents: [],
    activeIncident: null,
    recentResolvedIncident: null,
    overallIndicator: "none",
    checkedAt: null,
  },
};

const elements = {
  refresh: document.querySelector("#refreshSignals"),
  lastChecked: document.querySelector("#lastChecked"),
  codexStatus: document.querySelector("#codexStatus"),
  confidence: document.querySelector("#confidenceText"),
  statusState: document.querySelector("#statusState"),
  statusDetail: document.querySelector("#statusDetail"),
  statusPoints: document.querySelector("#statusPoints"),
  statusCard: document.querySelector("#statusCard"),
  scoreOrbit: document.querySelector("#scoreOrbit"),
  scoreNumber: document.querySelector("#scoreNumber"),
  signalLevel: document.querySelector("#signalLevel"),
  forecastHeading: document.querySelector("#forecastHeading"),
  forecastReason: document.querySelector("#forecastReason"),
  watchWindow: document.querySelector("#watchWindow"),
  tiboState: document.querySelector("#tiboState"),
  tiboDetail: document.querySelector("#tiboDetail"),
  tiboPoints: document.querySelector("#tiboPoints"),
  tiboLink: document.querySelector("#tiboLink"),
  currentUsers: document.querySelector("#currentUsers"),
  targetUsers: document.querySelector("#targetUsers"),
  nextMilestone: document.querySelector("#nextMilestone"),
  milestoneDetail: document.querySelector("#milestoneDetail"),
  milestonePoints: document.querySelector("#milestonePoints"),
  milestoneFill: document.querySelector("#milestoneFill"),
  milestoneLink: document.querySelector("#milestoneLink"),
  launchState: document.querySelector("#launchState"),
  launchDetail: document.querySelector("#launchDetail"),
  launchPoints: document.querySelector("#launchPoints"),
  launchLink: document.querySelector("#launchLink"),
  dialog: document.querySelector("#signalDialog"),
  form: document.querySelector("#signalForm"),
  openSignals: document.querySelector("#openSignals"),
  openSignalsMobile: document.querySelector("#openSignalsMobile"),
  closeSignals: document.querySelector("#closeSignals"),
  cancelSignals: document.querySelector("#cancelSignals"),
  resetManual: document.querySelector("#resetManual"),
  copySummary: document.querySelector("#copySummary"),
  copyFeedback: document.querySelector("#copyFeedback"),
};

function loadManualSignals() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return { ...DEFAULT_SIGNALS, ...saved };
  } catch {
    return { ...DEFAULT_SIGNALS };
  }
}

function isCodexComponent(component) {
  return /codex/i.test(component?.name || "");
}

function isCodexIncident(incident) {
  return /codex/i.test(incident?.name || "") || (incident?.components || []).some(isCodexComponent);
}

function hoursSince(dateValue) {
  const time = new Date(dateValue).getTime();
  return Number.isFinite(time) ? (Date.now() - time) / 3_600_000 : Number.POSITIVE_INFINITY;
}

function formatDateTime(dateValue) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateValue));
}

function statusLabel(status) {
  const labels = {
    operational: "运行正常",
    degraded_performance: "性能下降",
    partial_outage: "部分中断",
    major_outage: "严重中断",
    under_maintenance: "维护中",
  };
  return labels[status] || status || "状态未知";
}

async function fetchWithTimeout(url, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshStatus({ announce = true } = {}) {
  elements.refresh.classList.add("is-loading");
  elements.refresh.disabled = true;
  elements.statusState.textContent = "正在获取官方数据";

  try {
    const [summary, incidents] = await Promise.all([
      fetchWithTimeout(STATUS_SUMMARY_URL),
      fetchWithTimeout(STATUS_INCIDENTS_URL),
    ]);

    const codexComponents = (summary.components || []).filter(isCodexComponent);
    const codexIncidents = (incidents.incidents || []).filter(isCodexIncident);
    const activeIncident = codexIncidents.find((incident) => incident.status !== "resolved") || null;
    const recentResolvedIncident = codexIncidents
      .filter((incident) => incident.status === "resolved")
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null;

    state.status = {
      loaded: true,
      failed: false,
      codexComponents,
      activeIncident,
      recentResolvedIncident,
      overallIndicator: summary.status?.indicator || "none",
      checkedAt: new Date().toISOString(),
    };

    localStorage.setItem("codex-reset-radar-last-check", state.status.checkedAt);
    render();

    if (announce) {
      elements.refresh.innerHTML = '<span class="refresh-icon" aria-hidden="true">✓</span>已刷新';
      setTimeout(() => {
        elements.refresh.innerHTML = '<span class="refresh-icon" aria-hidden="true">↻</span>刷新今日信号';
      }, 1800);
    }
  } catch (error) {
    state.status.failed = true;
    state.status.loaded = false;
    state.status.checkedAt = new Date().toISOString();
    render();
    elements.statusState.textContent = "实时数据获取失败";
    elements.statusDetail.textContent = "请检查网络，或直接打开 OpenAI Status 页面核验。";
    elements.statusPoints.textContent = "未计分";
    elements.confidence.textContent = "状态离线 · 人工信号可用";
  } finally {
    elements.refresh.classList.remove("is-loading");
    elements.refresh.disabled = false;
  }
}

function getSignalModel() {
  let tiboPoints = 0;
  let statusPoints = 0;
  let milestonePoints = 0;
  let launchPoints = 0;

  if (state.manual.tiboSignal === "hint") tiboPoints = 22;
  if (state.manual.tiboSignal === "tomorrow") tiboPoints = 46;
  if (state.manual.tiboSignal === "immediate") tiboPoints = 54;

  if (state.status.activeIncident) {
    statusPoints = 22;
  } else if (state.status.recentResolvedIncident) {
    const incidentAge = hoursSince(state.status.recentResolvedIncident.updated_at);
    if (incidentAge <= 24) statusPoints = 14;
    else if (incidentAge <= 48) statusPoints = 6;
  }

  const currentUsers = Math.max(1, Number(state.manual.currentUsers) || 9);
  const targetUsers = currentUsers >= 10 ? 10 : Math.floor(currentUsers) + 1;
  milestonePoints = currentUsers >= 10 ? 20 : 8;

  if (state.manual.launchSignal === "announced") launchPoints = 10;
  if (state.manual.launchSignal === "launched") launchPoints = 16;

  const activeSignals = [tiboPoints, statusPoints, launchPoints].filter((points) => points > 0).length;
  const confirmationBonus = activeSignals >= 2 ? 8 : 0;
  const total = Math.min(100, tiboPoints + statusPoints + milestonePoints + launchPoints + confirmationBonus);

  return {
    tiboPoints,
    statusPoints,
    milestonePoints,
    launchPoints,
    confirmationBonus,
    total,
    currentUsers,
    targetUsers,
  };
}

function getForecast(model) {
  if (state.manual.tiboSignal === "immediate") {
    return {
      level: "imminent",
      label: "已触发 / 待到账",
      heading: "现在至未来 2 小时",
      reason: "Tibo 已明确表示正在或已经执行重置；不同账户到账可能存在延迟。",
      window: "立即检查 Codex Usage 页面",
    };
  }

  if (state.manual.tiboSignal === "tomorrow") {
    return {
      level: "imminent",
      label: "明确预告",
      heading: "公告后的 18–30 小时",
      reason: "已录入 Tibo 的明确“明天重置”预告；具体时区仍以原帖为准。",
      window: "原帖时间 + 1 天附近",
    };
  }

  if (state.status.activeIncident && state.manual.launchSignal !== "none") {
    return {
      level: "high",
      label: "高信号",
      heading: "恢复后 0–24 小时重点观察",
      reason: "Codex 正在发生事件，同时存在新品信号；历史上此组合曾伴随补偿性重置。",
      window: "故障恢复公告之后",
    };
  }

  if (state.status.activeIncident) {
    return {
      level: "medium",
      label: "增强观察",
      heading: "故障恢复后 0–24 小时",
      reason: "Codex 自身存在未解决事件，但故障与重置只有历史相关性，没有官方保证。",
      window: "等待 incident 变为 Resolved",
    };
  }

  if (model.currentUsers >= 10) {
    return {
      level: "high",
      label: "里程碑触发",
      heading: "10M 确认后 0–24 小时",
      reason: "已录入 10M 公开里程碑；这是此前观察规律的最后一个明确边界，仍需等待 Tibo 确认。",
      window: "Tibo 的 10M 后续公告",
    };
  }

  if (state.manual.tiboSignal === "hint" || state.manual.launchSignal !== "none") {
    return {
      level: "medium",
      label: "观察信号",
      heading: "未来 24–48 小时重点观察",
      reason: "存在官方暗示或产品发布信号，但尚没有明确的额度重置时间。",
      window: "Tibo 后续确认 / 发布时点",
    };
  }

  if (model.statusPoints > 0) {
    return {
      level: "medium",
      label: "弱相关信号",
      heading: "未来 24 小时继续观察",
      reason: "近期 Codex 事件刚刚恢复，但目前组件正常，也没有 Tibo 的新预告。",
      window: "补偿公告 / 新里程碑",
    };
  }

  return {
    level: "low",
    label: "低信号",
    heading: "暂无可验证重置窗口",
    reason: "未发现 Tibo 的新预告，Codex 当前正常，下一整数里程碑尚未确认。",
    window: "新公告 / 新里程碑 / Codex 故障恢复",
  };
}

function renderStatus(model) {
  elements.codexStatus.className = "";
  elements.statusCard.dataset.state = "neutral";

  if (state.status.failed) {
    elements.codexStatus.textContent = "连接失败";
    elements.codexStatus.classList.add("status-warn");
    return;
  }

  if (!state.status.loaded) {
    elements.codexStatus.textContent = "正在连接…";
    return;
  }

  const worstComponent = state.status.codexComponents.find((component) => component.status !== "operational");
  if (state.status.activeIncident || worstComponent) {
    const componentStatus = worstComponent?.status || "partial_outage";
    elements.codexStatus.textContent = statusLabel(componentStatus);
    elements.codexStatus.classList.add("status-bad");
    elements.statusState.textContent = state.status.activeIncident?.name || statusLabel(componentStatus);
    elements.statusDetail.textContent = "Codex 自身存在活动事件；恢复后的 24 小时进入重点观察。";
  } else {
    elements.codexStatus.textContent = "组件运行正常";
    elements.codexStatus.classList.add("status-good");
    elements.statusState.textContent = "Codex 组件正常";

    const recent = state.status.recentResolvedIncident;
    if (recent && hoursSince(recent.updated_at) <= 48) {
      elements.statusDetail.textContent = `近期事件“${recent.name}”已恢复；仍处于 48 小时观察尾窗。`;
    } else if (state.status.overallIndicator !== "none") {
      elements.statusDetail.textContent = "OpenAI 全站有其他异常，但 Codex 组件正常，因此不计为 Codex 重置信号。";
    } else {
      elements.statusDetail.textContent = "只计算 Codex 组件；GPT 等其他产品的异常不会加分。";
    }
  }

  elements.statusPoints.textContent = `+${model.statusPoints} 分`;
}

function renderManualSignals(model) {
  const tiboText = {
    none: ["暂无新预告", "最近记录：7 月 17 日已执行周末重置。"],
    hint: ["出现重置暗示", "已记录官方暗示，但尚无确定时间。"],
    tomorrow: ["明确预告明天重置", "按原帖发布时间推算，重点观察之后的 18–30 小时。"],
    immediate: ["已表示执行重置", "不同套餐或账户可能存在到账延迟，请直接检查 Usage。"],
  };
  const launchText = {
    none: ["暂无新信号", "最近一次模型发布期重置已经发生，不重复计入今日信号。"],
    announced: ["新发布已预告", "发布前后进入观察窗，但不能单独证明会重置。"],
    launched: ["过去 48 小时有新发布", "发布信号有效；等待 Tibo 或额度页面确认。"],
  };

  [elements.tiboState.textContent, elements.tiboDetail.textContent] = tiboText[state.manual.tiboSignal] || tiboText.none;
  elements.tiboPoints.textContent = `+${model.tiboPoints} 分`;
  elements.tiboLink.href = state.manual.tiboUrl || "https://x.com/thsottiaux";

  [elements.launchState.textContent, elements.launchDetail.textContent] = launchText[state.manual.launchSignal] || launchText.none;
  elements.launchPoints.textContent = `+${model.launchPoints} 分`;
  elements.launchLink.href = state.manual.launchUrl || DEFAULT_SIGNALS.launchUrl;

  elements.currentUsers.textContent = model.currentUsers;
  elements.targetUsers.textContent = model.targetUsers;
  elements.nextMilestone.textContent = model.currentUsers >= 10 ? "10M 后规则待续" : `${model.targetUsers}M`;
  elements.milestoneFill.style.width = `${Math.min(100, (model.currentUsers / model.targetUsers) * 100)}%`;
  elements.milestonePoints.textContent = `+${model.milestonePoints} 分`;
  elements.milestoneDetail.textContent = model.currentUsers >= 10
    ? "已达到此前观察规律的 10M 上限；不要自动外推到 11M，等待新规则。"
    : `${model.currentUsers}M 为手动核验的最新公开里程碑；没有连续用户数数据源。`;
  elements.milestoneLink.href = state.manual.milestoneUrl || DEFAULT_SIGNALS.milestoneUrl;
}

function renderScore(model) {
  const forecast = getForecast(model);
  elements.scoreOrbit.style.setProperty("--score", model.total);
  elements.scoreNumber.textContent = model.total;
  elements.signalLevel.className = `signal-level ${forecast.level}`;
  elements.signalLevel.textContent = forecast.label;
  elements.forecastHeading.textContent = forecast.heading;
  elements.forecastReason.textContent = forecast.reason;
  elements.watchWindow.textContent = forecast.window;

  const scoreColor = model.total >= 75 ? "var(--danger)" : model.total >= 45 ? "var(--amber)" : model.total >= 25 ? "var(--acid)" : "var(--mint)";
  elements.scoreOrbit.style.setProperty("--score-color", scoreColor);
  elements.scoreOrbit.querySelector(".orbit-value").style.stroke = scoreColor;
}

function render() {
  const model = getSignalModel();
  renderStatus(model);
  renderManualSignals(model);
  renderScore(model);

  const lastCheck = state.status.checkedAt || localStorage.getItem("codex-reset-radar-last-check");
  elements.lastChecked.textContent = lastCheck ? formatDateTime(lastCheck) : "尚未检查";
  elements.confidence.textContent = state.status.loaded ? "状态实时 · 其余人工核验" : "状态待刷新 · 其余人工核验";
}

function populateForm() {
  document.querySelector("#tiboSignal").value = state.manual.tiboSignal;
  document.querySelector("#tiboUrl").value = state.manual.tiboUrl || "";
  document.querySelector("#manualUsers").value = state.manual.currentUsers;
  document.querySelector("#milestoneUrl").value = state.manual.milestoneUrl || "";
  document.querySelector("#launchSignal").value = state.manual.launchSignal;
  document.querySelector("#manualLaunchUrl").value = state.manual.launchUrl || "";
  document.querySelector("#manualNote").value = state.manual.note || "";
}

function saveForm() {
  const formData = new FormData(elements.form);
  state.manual = {
    ...state.manual,
    tiboSignal: formData.get("tiboSignal"),
    tiboUrl: formData.get("tiboUrl").trim(),
    currentUsers: Math.max(1, Number(formData.get("manualUsers")) || 9),
    milestoneUrl: formData.get("milestoneUrl").trim(),
    launchSignal: formData.get("launchSignal"),
    launchUrl: formData.get("manualLaunchUrl").trim(),
    note: formData.get("manualNote").trim(),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.manual));
  render();
}

async function copyDailySummary() {
  const model = getSignalModel();
  const forecast = getForecast(model);
  const statusText = state.status.loaded ? elements.codexStatus.textContent : "状态未连接";
  const summary = [
    `Codex 重置雷达｜${new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date())}`,
    `结论：${forecast.label}，${forecast.heading}`,
    `评分：${model.total}/100（启发式强度，不是概率）`,
    `Tibo：${elements.tiboState.textContent}`,
    `Codex Status：${statusText}`,
    `用户里程碑：${model.currentUsers}M，${model.currentUsers >= 10 ? "10M 后规则待续" : `下一观察点 ${model.targetUsers}M`}`,
    `新品信号：${elements.launchState.textContent}`,
    `重点观察：${forecast.window}`,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(summary);
    elements.copyFeedback.textContent = "今日简报已复制。";
  } catch {
    elements.copyFeedback.textContent = "复制失败，请在安全上下文或 localhost 下重试。";
  }

  setTimeout(() => { elements.copyFeedback.textContent = ""; }, 2600);
}

elements.refresh.addEventListener("click", () => refreshStatus());
function openSignalDialog() {
  populateForm();
  elements.dialog.showModal();
}

elements.openSignals.addEventListener("click", openSignalDialog);
elements.openSignalsMobile.addEventListener("click", openSignalDialog);
elements.closeSignals.addEventListener("click", () => elements.dialog.close());
elements.cancelSignals.addEventListener("click", () => elements.dialog.close());
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveForm();
  elements.dialog.close();
});
elements.resetManual.addEventListener("click", () => {
  state.manual = { ...DEFAULT_SIGNALS };
  localStorage.removeItem(STORAGE_KEY);
  populateForm();
  render();
});
elements.copySummary.addEventListener("click", copyDailySummary);

elements.dialog.addEventListener("click", (event) => {
  const rect = elements.dialog.getBoundingClientRect();
  const isBackdrop = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (isBackdrop) elements.dialog.close();
});

render();
refreshStatus({ announce: false });
