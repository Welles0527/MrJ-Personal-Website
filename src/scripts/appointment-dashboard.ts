type Dictionary = Record<string, unknown>;
type DepartmentKey = "digestive" | "neurology";
type SessionKey = "any" | "morning" | "afternoon";
type SlotStatus = "available" | "waitlist" | "full";

type Doctor = {
  code: string;
  name: string;
  title: string;
  info: string;
  status: string | number | null;
  remaining: number | null;
  timeRange: string | number | null;
  waitable: boolean;
};

type Schedule = {
  date: string;
  weekday: string;
  doctors: Doctor[];
};

type Snapshot = {
  key: string;
  capturedAt: string;
  hospitalCode: string;
  departmentCode: string;
  hospitalName: string;
  departmentName: string;
  doctors: Doctor[];
  schedules: Schedule[];
};

type Reminder = {
  id: string;
  hospitalCode: "42500653900" | "42502656400";
  department: DepartmentKey;
  doctorName: string;
  dateStart: string;
  dateEnd: string;
  session: SessionKey;
  leadMinutes: number;
  createdAt: string;
  enabled: boolean;
  remindAt?: string;
};

type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  kind: "test" | "release";
  createdAt: string;
  read: boolean;
};

type ReleaseEvent = {
  targetDate: string;
  releaseAt: string;
  alertAt: string;
};

const HOSPITALS = {
  "42500653900": {
    name: "华山医院",
    officialUrl: "https://www.huashan.org.cn/phone/cms/1187.html",
    rule: {
      advanceDays: 14,
      releaseTime: "18:00",
      label: "预估规则",
      caveat: "医院官网说明专家号源通常提供两周范围并于 18:00 更新；实际以申康平台为准。",
    },
    departments: {
      digestive: { code: "2047", officialName: "消化科", label: "消化内科" },
      neurology: { code: "2061", officialName: "神经内科", label: "神经内科" },
    },
  },
  "42502656400": {
    name: "瑞金医院",
    officialUrl: "https://rjvpn2.rjh.com.cn/2018RJPortal/main/jzzn/dyrx/index.shtml",
    rule: {
      advanceDays: 28,
      releaseTime: "07:30",
      label: "官网旧规则",
      caveat: "按医院官网仍可访问的 2019 版须知估算；使用前请在瑞金医院或申康官方入口复核。",
    },
    departments: {
      digestive: { code: "42502656400-XHNK", officialName: "消化内科", label: "消化内科" },
      neurology: { code: "42502656400-SJNK", officialName: "神经内科", label: "神经内科" },
    },
  },
} as const;

type HospitalCode = keyof typeof HOSPITALS;

const MIN_EXTENSION_VERSION = "1.1.0";
const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector) as T;
const extensionStatus = $<HTMLElement>("[data-extension-status]");
const extensionLabel = $<HTMLElement>("[data-extension-label]");
const sourceBanner = $<HTMLElement>("[data-source-banner]");
const sourceBadge = $<HTMLElement>("[data-source-badge]");
const sourceMessage = $<HTMLElement>("[data-source-message]");
const sourceTime = $<HTMLTimeElement>("[data-source-time]");
const extensionDownload = $<HTMLAnchorElement>("[data-extension-download]");
const officialEntry = $<HTMLAnchorElement>("[data-official-entry]");
const boardHospital = $<HTMLSelectElement>("[data-board-hospital]");
const boardDepartment = $<HTMLSelectElement>("[data-board-department]");
const dateRange = $<HTMLElement>("[data-date-range]");
const previousDates = $<HTMLButtonElement>("[data-previous-dates]");
const nextDates = $<HTMLButtonElement>("[data-next-dates]");
const onlyAvailable = $<HTMLInputElement>("[data-only-available]");
const matrix = $<HTMLTableElement>("[data-availability-matrix]");
const matrixEmpty = $<HTMLElement>("[data-matrix-empty]");
const doctorCount = $<HTMLElement>("[data-doctor-count]");
const dateCount = $<HTMLElement>("[data-date-count]");
const availableCount = $<HTMLElement>("[data-available-count]");
const waitlistCount = $<HTMLElement>("[data-waitlist-count]");
const fullCount = $<HTMLElement>("[data-full-count]");
const reminderList = $<HTMLElement>("[data-reminder-list]");
const reminderDialog = $<HTMLDialogElement>("[data-reminder-dialog]");
const reminderForm = $<HTMLFormElement>("[data-reminder-form]");
const reminderHospital = $<HTMLSelectElement>("[data-reminder-hospital]");
const reminderDepartment = $<HTMLSelectElement>("[data-reminder-department]");
const doctorNameInput = $<HTMLInputElement>("[data-doctor-name]");
const dateStartInput = $<HTMLInputElement>("[data-date-start]");
const dateEndInput = $<HTMLInputElement>("[data-date-end]");
const sessionSelect = $<HTMLSelectElement>("[data-session]");
const rulePreview = $<HTMLElement>("[data-rule-preview]");
const notificationDrawer = $<HTMLDialogElement>("[data-notification-drawer]");
const notificationList = $<HTMLElement>("[data-notification-list]");
const notificationCount = $<HTMLElement>("[data-notification-count]");
const toast = $<HTMLElement>("[data-toast]");

let selectedHospital: HospitalCode = "42500653900";
let selectedDepartment: DepartmentKey = "digestive";
let dateOffset = 0;
let extensionConnected = false;
let extensionVersion = "";
let snapshots: Record<string, Snapshot> = {};
let reminders: Reminder[] = [];
let notifications: NotificationRecord[] = [];
let visibleDates: string[] = [];
let requestCounter = 0;
let toastTimer = 0;
const pendingRequests = new Map<string, (payload: Dictionary) => void>();

function currentHospital() {
  return HOSPITALS[selectedHospital];
}

function currentDepartment() {
  return currentHospital().departments[selectedDepartment];
}

function currentSnapshotKey() {
  return `${selectedHospital}:${currentDepartment().code}`;
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function versionAtLeast(version: string, minimum: string) {
  const left = version.split(".").map((item) => Number(item) || 0);
  const right = minimum.split(".").map((item) => Number(item) || 0);
  return [0, 1, 2].every((index) => left[index] === right[index])
    || (left[0] > right[0])
    || (left[0] === right[0] && left[1] > right[1])
    || (left[0] === right[0] && left[1] === right[1] && left[2] >= right[2]);
}

function extensionIsCurrent() {
  return extensionConnected && versionAtLeast(extensionVersion, MIN_EXTENSION_VERSION);
}

function sendExtensionRequest(action: string, payload: Dictionary = {}, timeout = 2000) {
  const requestId = `magicj-${Date.now()}-${++requestCounter}`;
  return new Promise<Dictionary>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("extension-timeout"));
    }, timeout);
    pendingRequests.set(requestId, (response) => {
      window.clearTimeout(timer);
      resolve(response);
    });
    window.postMessage({
      source: "magicj-appointment-site",
      type: "MAGICJ_EXTENSION_REQUEST",
      requestId,
      action,
      payload,
    }, window.location.origin);
  });
}

function parseState(payload: Dictionary) {
  extensionConnected = true;
  extensionVersion = String(payload.version || "");
  snapshots = (payload.snapshots as Record<string, Snapshot>) || {};
  reminders = Array.isArray(payload.reminders) ? payload.reminders as Reminder[] : [];
  notifications = Array.isArray(payload.notifications) ? payload.notifications as NotificationRecord[] : [];
  renderAll();
}

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const message = event.data as Dictionary;
  if (message?.source !== "magicj-appointment-extension") return;
  if (message.type === "MAGICJ_EXTENSION_READY") {
    void refreshExtensionState();
    return;
  }
  if (message.type === "MAGICJ_EXTENSION_RESPONSE") {
    const requestId = String(message.requestId || "");
    const resolve = pendingRequests.get(requestId);
    if (!resolve) return;
    pendingRequests.delete(requestId);
    resolve((message.payload as Dictionary) || {});
    return;
  }
  if (message.type === "MAGICJ_EXTENSION_STATE") parseState((message.payload as Dictionary) || {});
});

async function refreshExtensionState() {
  try {
    parseState(await sendExtensionRequest("GET_STATE"));
  } catch {
    extensionConnected = false;
    extensionVersion = "";
    renderAll();
  }
}

function normalizePeriod(value: Doctor["timeRange"]) {
  const period = String(value ?? "").trim();
  if (period === "1" || period.includes("上午") || /morning|\bam\b/i.test(period)) return "morning";
  if (period === "2" || period.includes("下午") || /afternoon|\bpm\b/i.test(period)) return "afternoon";
  return "unknown";
}

function statusOf(doctor: Doctor): { key: SlotStatus; label: string } {
  if (doctor.waitable) return { key: "waitlist", label: "候补" };
  const status = String(doctor.status ?? "");
  if (status === "2" || doctor.remaining === 0 || status === "0") return { key: "full", label: "约满" };
  if (doctor.remaining !== null && doctor.remaining > 0) return { key: "available", label: "可约" };
  if (status === "1") return { key: "available", label: "可约" };
  return { key: "full", label: "约满" };
}

function statusRank(doctor: Doctor) {
  const key = statusOf(doctor).key;
  return key === "available" ? 3 : key === "waitlist" ? 2 : 1;
}

function chooseSlot(items: Doctor[]) {
  return [...items].sort((a, b) => statusRank(b) - statusRank(a))[0] || null;
}

function formatShortDate(date: string) {
  const parts = date.split("-");
  return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : date;
}

function weekdayOf(date: string) {
  const parsed = new Date(`${date}T12:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat("zh-CN", { weekday: "short", timeZone: "Asia/Shanghai" }).format(parsed);
}

function todayInShanghai() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function buildDoctorMap(snapshot: Snapshot) {
  const doctorMap = new Map<string, Doctor>();
  for (const doctor of snapshot.doctors || []) doctorMap.set(doctor.code || doctor.name, doctor);
  for (const schedule of snapshot.schedules || []) {
    for (const doctor of schedule.doctors || []) {
      const key = doctor.code || doctor.name;
      const existing = doctorMap.get(key);
      doctorMap.set(key, {
        ...existing,
        ...doctor,
        info: doctor.info || existing?.info || "",
        title: doctor.title || existing?.title || "",
      });
    }
  }
  return [...doctorMap.values()].filter((doctor) => doctor.name).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

function slotsForDoctor(doctor: Doctor, dates: string[], dateMap: Map<string, Schedule>) {
  const doctorKey = doctor.code || doctor.name;
  return dates.map((date) => {
    const matching = (dateMap.get(date)?.doctors || []).filter((item) => (item.code || item.name) === doctorKey);
    const morning = chooseSlot(matching.filter((item) => normalizePeriod(item.timeRange) === "morning"));
    const afternoon = chooseSlot(matching.filter((item) => normalizePeriod(item.timeRange) === "afternoon"));
    const unknown = chooseSlot(matching.filter((item) => normalizePeriod(item.timeRange) === "unknown"));
    return { morning, afternoon, unknown: unknown && !morning && !afternoon ? unknown : null };
  });
}

function renderSlotButton(doctor: Doctor | null, doctorName: string, date: string, session: SessionKey, periodLabel: string) {
  const row = make("div", "slot-row");
  row.append(make("small", "", periodLabel));
  if (!doctor) {
    row.append(make("span", "slot-none", "—"));
    return row;
  }
  const status = statusOf(doctor);
  const button = make("button", `slot-button ${status.key}`);
  button.type = "button";
  button.title = `${doctorName} · ${date} · ${periodLabel} · ${status.label}`;
  button.append(make("strong", "", status.label));
  const detail = status.key === "available" && doctor.remaining !== null && doctor.remaining > 0
    ? `余 ${doctor.remaining}`
    : "设提醒";
  button.append(make("small", "", detail));
  button.addEventListener("click", () => openReminderDialog({ doctorName, date, session }));
  row.append(button);
  return row;
}

function renderBoard() {
  const snapshot = snapshots[currentSnapshotKey()];
  officialEntry.href = officialDepartmentUrl();
  if (!snapshot || !Array.isArray(snapshot.schedules) || snapshot.schedules.length === 0) {
    matrix.replaceChildren();
    matrix.hidden = true;
    matrixEmpty.hidden = false;
    visibleDates = [];
    dateRange.textContent = "等待同步";
    previousDates.disabled = true;
    nextDates.disabled = true;
    updateSummary(0, 0, 0, 0, 0);
    renderSource(snapshot);
    return;
  }

  const dateMap = new Map(snapshot.schedules.filter((item) => item.date).map((schedule) => [schedule.date, schedule]));
  const allDates = [...dateMap.keys()].sort();
  const windowSize = Math.min(14, allDates.length);
  const maxOffset = Math.max(0, allDates.length - windowSize);
  dateOffset = Math.max(0, Math.min(dateOffset, maxOffset));
  visibleDates = allDates.slice(dateOffset, dateOffset + windowSize);
  previousDates.disabled = dateOffset === 0;
  nextDates.disabled = dateOffset >= maxOffset;
  dateRange.textContent = visibleDates.length
    ? `${formatShortDate(visibleDates[0])} — ${formatShortDate(visibleDates[visibleDates.length - 1])}`
    : "暂无日期";

  const doctors = buildDoctorMap(snapshot);
  const rows = doctors.map((doctor) => ({ doctor, slots: slotsForDoctor(doctor, visibleDates, dateMap) }));
  const visibleRows = rows.filter(({ slots }) => !onlyAvailable.checked || slots.some((slot) => [slot.morning, slot.afternoon, slot.unknown]
    .some((item) => item && statusOf(item).key === "available")));

  let available = 0;
  let waitlist = 0;
  let full = 0;
  for (const row of visibleRows) {
    for (const slot of row.slots) {
      for (const doctor of [slot.morning, slot.afternoon, slot.unknown]) {
        if (!doctor) continue;
        const key = statusOf(doctor).key;
        if (key === "available") available++;
        else if (key === "waitlist") waitlist++;
        else full++;
      }
    }
  }
  updateSummary(visibleRows.length, visibleDates.length, available, waitlist, full);

  matrix.replaceChildren();
  const thead = make("thead");
  const headerRow = make("tr");
  const doctorHeader = make("th", "doctor-column");
  doctorHeader.append(make("span", "column-label", "DOCTOR / SPECIALTY"), make("span", "column-title", "专家与擅长"));
  headerRow.append(doctorHeader);
  for (const date of visibleDates) {
    const header = make("th", `date-header${date === todayInShanghai() ? " today" : ""}`);
    header.append(make("strong", "", dateMap.get(date)?.weekday || weekdayOf(date)), make("span", "", formatShortDate(date)));
    headerRow.append(header);
  }
  thead.append(headerRow);
  matrix.append(thead);

  const tbody = make("tbody");
  if (visibleRows.length === 0) {
    const row = make("tr");
    const cell = make("td", "slot-cell", "当前筛选下没有可约专家");
    cell.colSpan = visibleDates.length + 1;
    cell.style.padding = "32px";
    cell.style.textAlign = "center";
    row.append(cell);
    tbody.append(row);
  }
  for (const { doctor, slots } of visibleRows) {
    const row = make("tr");
    const doctorCell = make("td", "doctor-column");
    const card = make("div", "doctor-card");
    card.append(make("span", "doctor-avatar", doctor.name.slice(0, 1)));
    const info = make("div", "doctor-info");
    const heading = make("h3", "", doctor.name);
    heading.append(make("span", "", doctor.title || "专家门诊"));
    info.append(heading, make("p", "", doctor.info || "官方页面暂无医生简介"));
    const reminderButton = make("button", "doctor-reminder", "◷");
    reminderButton.type = "button";
    reminderButton.setAttribute("aria-label", `为${doctor.name}设置放号提醒`);
    reminderButton.addEventListener("click", () => openReminderDialog({ doctorName: doctor.name }));
    card.append(info, reminderButton);
    doctorCell.append(card);
    row.append(doctorCell);
    slots.forEach((slot, index) => {
      const cell = make("td", "slot-cell");
      const stack = make("div", "slot-stack");
      if (slot.unknown) stack.append(renderSlotButton(slot.unknown, doctor.name, visibleDates[index], "any", "全"));
      else stack.append(
        renderSlotButton(slot.morning, doctor.name, visibleDates[index], "morning", "上"),
        renderSlotButton(slot.afternoon, doctor.name, visibleDates[index], "afternoon", "下"),
      );
      cell.append(stack);
      row.append(cell);
    });
    tbody.append(row);
  }
  matrix.append(tbody);
  matrix.hidden = false;
  matrixEmpty.hidden = true;
  renderSource(snapshot);
}

function updateSummary(doctors: number, dates: number, available: number, waitlist: number, full: number) {
  doctorCount.textContent = String(doctors);
  dateCount.textContent = `位专家 · ${dates ? `${dates} 天` : "等待同步"}`;
  availableCount.textContent = String(available);
  waitlistCount.textContent = String(waitlist);
  fullCount.textContent = String(full);
}

function renderConnection() {
  extensionStatus.classList.toggle("is-connected", extensionConnected);
  if (!extensionConnected) extensionLabel.textContent = "扩展未连接 · 仅显示已加载页面";
  else if (!extensionIsCurrent()) extensionLabel.textContent = `扩展需升级${extensionVersion ? ` · v${extensionVersion}` : ""}`;
  else extensionLabel.textContent = `真实号源已连接 · v${extensionVersion}`;
  extensionDownload.hidden = extensionIsCurrent();
}

function renderSource(snapshot?: Snapshot) {
  sourceBanner.classList.remove("live", "update");
  sourceTime.textContent = "";
  if (extensionConnected && !extensionIsCurrent()) {
    sourceBanner.classList.add("update");
    sourceBadge.textContent = "需要更新";
    sourceMessage.textContent = "真实号源可继续查看；完整区间提醒和提醒记录需要重新下载 v1.1 扩展并在扩展页点击“重新加载”。";
    return;
  }
  if (snapshot) {
    sourceBanner.classList.add("live");
    sourceBadge.textContent = "真实号源";
    sourceMessage.textContent = "医生、日期、时段和余号状态来自当前浏览器中的申康官方科室页。";
    const captured = new Date(snapshot.capturedAt);
    if (!Number.isNaN(captured.getTime())) sourceTime.textContent = `载入 ${captured.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    return;
  }
  sourceBadge.textContent = extensionConnected ? "等待同步" : "扩展未连接";
  sourceMessage.textContent = extensionConnected
    ? "点击“同步官方号源”，打开申康当前科室页后数据会自动回到这里。"
    : "请下载并加载扩展；扩展只保存医生和排班字段，不保存患者信息或登录凭据。";
}

function officialDepartmentUrl() {
  const department = currentDepartment();
  const query = new URLSearchParams({
    hosOrgCode: selectedHospital,
    parentId: "03",
    hosDeptCode: department.code,
    deptType: "1",
    type: "1",
    clinicName: department.officialName,
    platformHosNo: selectedHospital,
  });
  return `https://internethospital.shdc.org.cn/yilian-cloud-v2.0-web/src/appointment/appointmentType.html?${query}`;
}

function openOfficialDepartment() {
  window.open(officialDepartmentUrl(), "_blank", "noopener,noreferrer");
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00+08:00`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function releaseEvent(reminder: Reminder, targetDate: string): ReleaseEvent {
  const rule = HOSPITALS[reminder.hospitalCode]?.rule || HOSPITALS["42500653900"].rule;
  const releaseDate = addDays(targetDate, -rule.advanceDays);
  const releaseAt = new Date(`${releaseDate}T${rule.releaseTime}:00+08:00`);
  return {
    targetDate,
    releaseAt: releaseAt.toISOString(),
    alertAt: new Date(releaseAt.getTime() - reminder.leadMinutes * 60_000).toISOString(),
  };
}

function reminderEvents(reminder: Reminder) {
  if (reminder.remindAt) {
    const event = new Date(reminder.remindAt);
    return Number.isNaN(event.getTime()) ? [] : [{ targetDate: reminder.dateStart || "", releaseAt: event.toISOString(), alertAt: event.toISOString() }];
  }
  const events: ReleaseEvent[] = [];
  if (!reminder.dateStart || !reminder.dateEnd || reminder.dateStart > reminder.dateEnd) return events;
  let date = reminder.dateStart;
  for (let index = 0; index < 120 && date <= reminder.dateEnd; index++) {
    events.push(releaseEvent(reminder, date));
    date = addDays(date, 1);
  }
  return events;
}

function nextReminderEvent(reminder: Reminder) {
  return reminderEvents(reminder).find((event) => new Date(event.alertAt).getTime() > Date.now()) || null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "时间无效" : date.toLocaleString("zh-CN", {
    month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function hospitalName(code: string) {
  return HOSPITALS[code as HospitalCode]?.name || "目标医院";
}

function departmentName(key: string) {
  return key === "neurology" ? "神经内科" : "消化内科";
}

function sessionName(session: SessionKey) {
  return session === "morning" ? "上午" : session === "afternoon" ? "下午" : "上午 / 下午";
}

function renderReminders() {
  reminderList.replaceChildren();
  if (reminders.length === 0) {
    const empty = make("div", "empty-reminders");
    empty.append(make("strong", "", "还没有放号提醒"), make("p", "", "按希望就诊日期范围生成后台提醒，关闭网页后 Chrome 仍会通知。"));
    const button = make("button", "secondary-button", "＋ 添加第一条提醒");
    button.type = "button";
    button.addEventListener("click", () => openReminderDialog());
    empty.append(button);
    reminderList.append(empty);
    return;
  }
  const sorted = [...reminders].sort((a, b) => (nextReminderEvent(a)?.alertAt || "z").localeCompare(nextReminderEvent(b)?.alertAt || "z"));
  for (const reminder of sorted) {
    const card = make("article", "reminder-card");
    const target = make("div", "reminder-target");
    target.append(
      make("h3", "", reminder.doctorName || `${departmentName(reminder.department)}任一专家`),
      make("p", "", reminder.remindAt
        ? `${hospitalName(reminder.hospitalCode)} · 单次旧版提醒`
        : `${hospitalName(reminder.hospitalCode)} · 专家门诊 · ${reminder.dateStart}${reminder.dateEnd !== reminder.dateStart ? ` — ${reminder.dateEnd}` : ""}`),
    );
    const next = nextReminderEvent(reminder);
    const nextBlock = make("div", "reminder-next");
    nextBlock.append(make("small", "", "下一次提醒"), make("strong", "", next ? formatDateTime(next.alertAt) : "当前日期范围已过"), make("p", "", sessionName(reminder.session || "any")));
    const actions = make("div", "reminder-actions");
    const rule = HOSPITALS[reminder.hospitalCode]?.rule;
    actions.append(make("span", "rule-tag", reminder.remindAt ? "旧版单次" : rule?.label || "预估规则"));
    const remove = make("button", "delete-button", "删除");
    remove.type = "button";
    remove.addEventListener("click", () => void deleteReminder(reminder.id));
    actions.append(remove);
    card.append(target, nextBlock, actions);
    reminderList.append(card);
  }
}

function updateRulePreview() {
  const hospital = HOSPITALS[reminderHospital.value as HospitalCode] || currentHospital();
  rulePreview.replaceChildren(make("span", "", hospital.rule.label), make("p", "", `目标就诊日前 ${hospital.rule.advanceDays} 天，${hospital.rule.releaseTime} 预计开放；${hospital.rule.caveat}`));
}

function defaultReminderDates(prefillDate?: string) {
  if (prefillDate) return { start: prefillDate, end: prefillDate };
  if (visibleDates.length) return { start: visibleDates[0], end: visibleDates[visibleDates.length - 1] };
  const today = todayInShanghai();
  const start = addDays(today, currentHospital().rule.advanceDays);
  return { start, end: addDays(start, 7) };
}

function openReminderDialog(prefill: { doctorName?: string; date?: string; session?: SessionKey } = {}) {
  if (!extensionIsCurrent()) {
    showToast(extensionConnected ? "请先下载 v1.1 扩展并在 chrome://extensions 点击“重新加载”。" : "请先安装并连接 Chrome 扩展。", true);
    return;
  }
  reminderForm.reset();
  reminderHospital.value = selectedHospital;
  reminderDepartment.value = selectedDepartment;
  doctorNameInput.value = prefill.doctorName || "";
  const dates = defaultReminderDates(prefill.date);
  dateStartInput.value = dates.start;
  dateEndInput.value = dates.end;
  sessionSelect.value = prefill.session || "any";
  updateRulePreview();
  reminderDialog.showModal();
}

reminderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(reminderForm);
  const dateStart = String(form.get("dateStart") || "");
  const dateEnd = String(form.get("dateEnd") || "");
  if (!dateStart || !dateEnd || dateStart > dateEnd) {
    showToast("希望就诊结束日不能早于起始日。", true);
    return;
  }
  if (addDays(dateStart, 119) < dateEnd) {
    showToast("单条提醒最多覆盖 120 天，请缩短日期范围。", true);
    return;
  }
  const reminder: Reminder = {
    id: crypto.randomUUID(),
    hospitalCode: String(form.get("hospitalCode")) as HospitalCode,
    department: String(form.get("department")) as DepartmentKey,
    doctorName: String(form.get("doctorName") || "").trim(),
    dateStart,
    dateEnd,
    session: String(form.get("session") || "any") as SessionKey,
    leadMinutes: Number(form.get("leadMinutes")) || 10,
    createdAt: new Date().toISOString(),
    enabled: true,
  };
  try {
    const payload = await sendExtensionRequest("ADD_REMINDER", { reminder }, 4000);
    if (payload.error) throw new Error(String(payload.error));
    reminders = Array.isArray(payload.reminders) ? payload.reminders as Reminder[] : reminders;
    reminderDialog.close();
    renderReminders();
    showToast("提醒已保存，关闭网页后 Chrome 仍会按时通知。");
  } catch {
    showToast("提醒保存失败，请确认 v1.1 扩展已重新加载。", true);
  }
});

async function deleteReminder(id: string) {
  try {
    const payload = await sendExtensionRequest("DELETE_REMINDER", { id }, 4000);
    if (payload.error) throw new Error(String(payload.error));
    reminders = Array.isArray(payload.reminders) ? payload.reminders as Reminder[] : reminders.filter((item) => item.id !== id);
    renderReminders();
    showToast("提醒已删除。");
  } catch {
    showToast("删除失败，请重新加载扩展后重试。", true);
  }
}

async function testNotification() {
  if (!extensionIsCurrent()) {
    showToast("测试通知需要 v1.1 扩展。", true);
    return;
  }
  try {
    const payload = await sendExtensionRequest("TEST_NOTIFICATION", {}, 4000);
    if (payload.error) throw new Error(String(payload.error));
    notifications = Array.isArray(payload.notifications) ? payload.notifications as NotificationRecord[] : notifications;
    renderNotifications();
    showToast("测试通知已发送；如果没有看到，请检查 Chrome 的 Windows 通知权限。");
  } catch {
    showToast("测试通知失败，请检查扩展是否已重新加载。", true);
  }
}

function renderNotifications() {
  const unread = notifications.filter((item) => !item.read).length;
  notificationCount.hidden = unread === 0;
  notificationCount.textContent = String(unread);
  notificationList.replaceChildren();
  if (notifications.length === 0) {
    notificationList.append(make("p", "notification-empty", "提醒记录还是空的。创建提醒或点击“先测试”后，记录会保存在本机扩展中。"));
    return;
  }
  for (const item of notifications) {
    const article = make("article", `notification-item${item.read ? "" : " unread"}`);
    article.append(make("strong", "", item.title), make("p", "", item.message), make("time", "", formatDateTime(item.createdAt)));
    notificationList.append(article);
  }
}

async function markNotificationsRead() {
  if (!extensionIsCurrent()) return;
  try {
    const payload = await sendExtensionRequest("MARK_NOTIFICATIONS_READ", {}, 4000);
    notifications = Array.isArray(payload.notifications) ? payload.notifications as NotificationRecord[] : notifications.map((item) => ({ ...item, read: true }));
    renderNotifications();
  } catch {
    showToast("暂时无法更新提醒记录。", true);
  }
}

function showToast(message: string, error = false) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3600);
}

function renderAll() {
  renderConnection();
  renderBoard();
  renderReminders();
  renderNotifications();
}

boardHospital.addEventListener("change", () => {
  selectedHospital = boardHospital.value as HospitalCode;
  dateOffset = 0;
  renderBoard();
});
boardDepartment.addEventListener("change", () => {
  selectedDepartment = boardDepartment.value as DepartmentKey;
  dateOffset = 0;
  renderBoard();
});
previousDates.addEventListener("click", () => { dateOffset = Math.max(0, dateOffset - 7); renderBoard(); });
nextDates.addEventListener("click", () => { dateOffset += 7; renderBoard(); });
onlyAvailable.addEventListener("change", renderBoard);
document.querySelectorAll<HTMLElement>("[data-sync-department], [data-sync-empty]").forEach((button) => button.addEventListener("click", openOfficialDepartment));
document.querySelectorAll<HTMLElement>("[data-create-reminder]").forEach((button) => button.addEventListener("click", () => openReminderDialog()));
$<HTMLElement>("[data-dialog-close]").addEventListener("click", () => reminderDialog.close());
$<HTMLElement>("[data-dialog-cancel]").addEventListener("click", () => reminderDialog.close());
reminderHospital.addEventListener("change", updateRulePreview);
$<HTMLElement>("[data-test-notification]").addEventListener("click", () => void testNotification());
$<HTMLElement>("[data-notification-button]").addEventListener("click", () => notificationDrawer.showModal());
$<HTMLElement>("[data-notification-close]").addEventListener("click", () => notificationDrawer.close());
$<HTMLElement>("[data-read-all]").addEventListener("click", () => void markNotificationsRead());

renderAll();
void refreshExtensionState();
window.setInterval(() => { if (extensionConnected) void refreshExtensionState(); }, 5000);
