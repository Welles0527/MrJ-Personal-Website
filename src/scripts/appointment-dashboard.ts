type Dictionary = Record<string, unknown>;

type Doctor = {
  code: string;
  name: string;
  title: string;
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
  hospitalCode: string;
  department: string;
  remindAt: string;
};

const HOSPITALS = {
  "42500653900": {
    name: "华山医院",
    departments: {
      digestive: { code: "2047", officialName: "消化科", label: "消化内科" },
      neurology: { code: "2061", officialName: "神经内科", label: "神经内科" },
    },
  },
  "42502656400": {
    name: "瑞金医院",
    departments: {
      digestive: { code: "42502656400-XHNK", officialName: "消化内科", label: "消化内科" },
      neurology: { code: "42502656400-SJNK", officialName: "神经内科", label: "神经内科" },
    },
  },
} as const;

type HospitalCode = keyof typeof HOSPITALS;
type DepartmentKey = keyof (typeof HOSPITALS)[HospitalCode]["departments"];

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector);
const connection = $("[data-extension-status]") as HTMLElement;
const connectionLabel = $("[data-extension-label]") as HTMLElement;
const setupTitle = $("#setup-title") as HTMLElement;
const boardTitle = $("[data-board-title]") as HTMLElement;
const snapshotTime = $("[data-snapshot-time]") as HTMLElement;
const emptyState = $("[data-empty-state]") as HTMLElement;
const matrixWrap = $("[data-matrix-wrap]") as HTMLElement;
const matrixHead = $("[data-matrix-head]") as HTMLElement;
const matrixBody = $("[data-matrix-body]") as HTMLElement;
const reminderList = $("[data-reminder-list]") as HTMLElement;
const reminderDialog = $("[data-reminder-dialog]") as HTMLDialogElement;
const reminderForm = $("[data-reminder-form]") as HTMLFormElement;
const onlyAvailable = $("[data-only-available]") as HTMLInputElement;

let selectedHospital: HospitalCode = "42500653900";
let selectedDepartment: DepartmentKey = "digestive";
let extensionConnected = false;
let snapshots: Record<string, Snapshot> = {};
let reminders: Reminder[] = [];
let requestCounter = 0;
const pendingRequests = new Map<string, (payload: Dictionary) => void>();
const localReminderKey = "magicj-appointment-reminders-v1";
const localTimers = new Map<string, number>();

function currentDepartment() {
  return HOSPITALS[selectedHospital].departments[selectedDepartment];
}

function currentSnapshotKey() {
  return `${selectedHospital}:${currentDepartment().code}`;
}

function sendExtensionRequest(action: string, payload: Dictionary = {}, timeout = 1500) {
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

function setConnection(connected: boolean) {
  extensionConnected = connected;
  connection.classList.toggle("is-connected", connected);
  connectionLabel.textContent = connected ? "真实号源扩展已连接" : "扩展未连接";
  setupTitle.textContent = connected ? "扩展已连接，可以同步真实号源" : "真实号源由官方页面安全同步";
}

function parseState(payload: Dictionary) {
  setConnection(true);
  snapshots = (payload.snapshots as Record<string, Snapshot>) || {};
  reminders = Array.isArray(payload.reminders) ? payload.reminders as Reminder[] : [];
  renderBoard();
  renderReminders();
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

  if (message.type === "MAGICJ_EXTENSION_STATE") {
    parseState((message.payload as Dictionary) || {});
  }
});

async function refreshExtensionState() {
  try {
    const payload = await sendExtensionRequest("GET_STATE");
    parseState(payload);
  } catch {
    setConnection(false);
    renderBoard();
    loadLocalReminders();
  }
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function normalizePeriod(value: Doctor["timeRange"]) {
  const period = String(value ?? "").trim();
  if (period === "1" || period.includes("上午") || /morning|\bam\b/i.test(period)) return "morning";
  if (period === "2" || period.includes("下午") || /afternoon|\bpm\b/i.test(period)) return "afternoon";
  return "unknown";
}

function statusOf(doctor: Doctor) {
  if (doctor.waitable) return { key: "waiting", label: "候补" };
  const status = String(doctor.status ?? "");
  if (status === "2" || doctor.remaining === 0 || status === "0") return { key: "full", label: "约满" };
  if (doctor.remaining !== null && doctor.remaining > 0) {
    return { key: "available", label: doctor.remaining <= 3 ? `余 ${doctor.remaining}` : "可约" };
  }
  if (status === "1") return { key: "available", label: "可约" };
  return { key: "full", label: "约满" };
}

function statusRank(doctor: Doctor) {
  const key = statusOf(doctor).key;
  return key === "available" ? 3 : key === "waiting" ? 2 : 1;
}

function chooseSlot(items: Doctor[]) {
  return [...items].sort((a, b) => statusRank(b) - statusRank(a))[0] || null;
}

function renderSlot(doctor: Doctor | null, periodLabel: string) {
  const slot = make("div", `slot slot--${doctor ? statusOf(doctor).key : "none"}`);
  slot.append(make("small", "", periodLabel), make("strong", "", doctor ? statusOf(doctor).label : "—"));
  if (doctor) slot.title = `${doctor.name} · ${periodLabel} · ${statusOf(doctor).label}`;
  return slot;
}

function renderBoard() {
  const hospital = HOSPITALS[selectedHospital];
  const department = currentDepartment();
  boardTitle.textContent = `${hospital.name} · ${department.label}`;
  const snapshot = snapshots[currentSnapshotKey()];

  if (!snapshot || !Array.isArray(snapshot.schedules) || snapshot.schedules.length === 0) {
    emptyState.hidden = false;
    matrixWrap.hidden = true;
    snapshotTime.textContent = extensionConnected ? "等待首次同步" : "安装扩展后显示真实号源";
    return;
  }

  const dateMap = new Map(snapshot.schedules.map((schedule) => [schedule.date, schedule]));
  const dates = [...dateMap.keys()].filter(Boolean).sort().slice(0, 14);
  const doctorMap = new Map<string, Doctor>();
  for (const doctor of snapshot.doctors || []) doctorMap.set(doctor.code || doctor.name, doctor);
  for (const schedule of snapshot.schedules) {
    for (const doctor of schedule.doctors || []) doctorMap.set(doctor.code || doctor.name, { ...doctorMap.get(doctor.code || doctor.name), ...doctor });
  }

  const doctors = [...doctorMap.values()].filter((doctor) => doctor.name).sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  matrixHead.replaceChildren();
  matrixBody.replaceChildren();

  const headRow = make("tr");
  headRow.append(make("th", "", `专家 · ${doctors.length} 位`));
  for (const date of dates) {
    const schedule = dateMap.get(date);
    const th = make("th", "", schedule?.weekday || weekdayOf(date));
    const shortDate = date.length >= 10 ? date.slice(5) : date;
    th.append(make("span", "matrix-date", shortDate));
    headRow.append(th);
  }
  matrixHead.append(headRow);

  let visibleRows = 0;
  for (const doctor of doctors) {
    const doctorKey = doctor.code || doctor.name;
    const slotsByDate = dates.map((date) => {
      const matching = (dateMap.get(date)?.doctors || []).filter((item) => (item.code || item.name) === doctorKey);
      return {
        morning: chooseSlot(matching.filter((item) => normalizePeriod(item.timeRange) === "morning")),
        afternoon: chooseSlot(matching.filter((item) => normalizePeriod(item.timeRange) === "afternoon")),
        unknown: chooseSlot(matching.filter((item) => normalizePeriod(item.timeRange) === "unknown")),
      };
    });

    const hasWantedStatus = slotsByDate.some((slots) => [slots.morning, slots.afternoon, slots.unknown]
      .some((item) => item && ["available", "waiting"].includes(statusOf(item).key)));
    if (onlyAvailable.checked && !hasWantedStatus) continue;

    visibleRows++;
    const row = make("tr");
    const doctorCell = make("th", "doctor-cell");
    doctorCell.scope = "row";
    doctorCell.append(make("strong", "doctor-name", doctor.name), make("span", "doctor-title", doctor.title || "专家门诊"));
    row.append(doctorCell);

    for (const slots of slotsByDate) {
      const cell = make("td", "slot-cell");
      const stack = make("div", "slot-stack");
      if (slots.unknown && !slots.morning && !slots.afternoon) {
        stack.append(renderSlot(slots.unknown, "全天"));
      } else {
        stack.append(renderSlot(slots.morning, "上午"), renderSlot(slots.afternoon, "下午"));
      }
      cell.append(stack);
      row.append(cell);
    }
    matrixBody.append(row);
  }

  if (visibleRows === 0) {
    const row = make("tr");
    const cell = make("td", "slot-cell", "当前筛选下没有可约或候补号源");
    cell.colSpan = dates.length + 1;
    cell.style.padding = "28px";
    cell.style.textAlign = "center";
    cell.style.color = "#7d8086";
    row.append(cell);
    matrixBody.append(row);
  }

  const captured = new Date(snapshot.capturedAt);
  snapshotTime.textContent = Number.isNaN(captured.getTime())
    ? "来自申康官方预约平台"
    : `申康官方数据 · ${captured.toLocaleString("zh-CN", { hour12: false })} 同步`;
  emptyState.hidden = true;
  matrixWrap.hidden = false;
}

function weekdayOf(date: string) {
  const parsed = new Date(`${date}T12:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(parsed);
}

function officialDepartmentUrl() {
  const department = currentDepartment();
  const query = new URLSearchParams({
    hosOrgCode: selectedHospital,
    parentId: "03",
    hosDeptCode: department.code,
    deptType: "1",
    clinicName: department.officialName,
    platformHosNo: selectedHospital,
  });
  return `https://internethospital.shdc.org.cn/yilian-cloud-v2.0-web/src/appointment/appointmentType.html?${query}`;
}

function openOfficialDepartment() {
  window.open(officialDepartmentUrl(), "_blank", "noopener,noreferrer");
}

function chooseFilter(kind: "hospital" | "department", value: string) {
  if (kind === "hospital" && value in HOSPITALS) selectedHospital = value as HospitalCode;
  if (kind === "department" && ["digestive", "neurology"].includes(value)) selectedDepartment = value as DepartmentKey;
  document.querySelectorAll<HTMLButtonElement>(`[data-${kind}-filter] button`).forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset[kind] === value));
  });
  renderBoard();
}

document.querySelectorAll<HTMLButtonElement>("[data-hospital-filter] button").forEach((button) => {
  button.addEventListener("click", () => chooseFilter("hospital", button.dataset.hospital || ""));
});
document.querySelectorAll<HTMLButtonElement>("[data-department-filter] button").forEach((button) => {
  button.addEventListener("click", () => chooseFilter("department", button.dataset.department || ""));
});
document.querySelectorAll<HTMLElement>("[data-sync-department], [data-sync-empty]").forEach((button) => button.addEventListener("click", openOfficialDepartment));
onlyAvailable.addEventListener("change", renderBoard);

function hospitalName(code: string) {
  return HOSPITALS[code as HospitalCode]?.name || "目标医院";
}

function departmentName(key: string) {
  return key === "neurology" ? "神经内科" : "消化内科";
}

function renderReminders() {
  reminderList.replaceChildren();
  if (reminders.length === 0) {
    reminderList.append(make("div", "reminder-empty", "暂无提醒。建议设置在医院公布的放号时间前 5 分钟。"));
    return;
  }

  for (const reminder of [...reminders].sort((a, b) => a.remindAt.localeCompare(b.remindAt))) {
    const card = make("div", "reminder-card");
    const copy = make("div");
    copy.append(
      make("strong", "", `${hospitalName(reminder.hospitalCode)} · ${departmentName(reminder.department)}`),
      make("span", "", new Date(reminder.remindAt).toLocaleString("zh-CN", { hour12: false })),
    );
    const remove = make("button", "", "删除");
    remove.type = "button";
    remove.addEventListener("click", () => void deleteReminder(reminder.id));
    card.append(copy, remove);
    reminderList.append(card);
  }
}

function defaultReminderTime() {
  const now = new Date();
  const candidate = new Date(now);
  if (selectedHospital === "42500653900") {
    candidate.setHours(17, 55, 0, 0);
    if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  } else {
    candidate.setMinutes(0, 0, 0);
    candidate.setHours(candidate.getHours() + 1);
  }
  const local = new Date(candidate.getTime() - candidate.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function openReminderDialog() {
  (reminderForm.elements.namedItem("hospital") as HTMLSelectElement).value = selectedHospital;
  (reminderForm.elements.namedItem("department") as HTMLSelectElement).value = selectedDepartment;
  (reminderForm.elements.namedItem("remindAt") as HTMLInputElement).value = defaultReminderTime();
  reminderDialog.showModal();
}

document.querySelector("[data-add-reminder]")?.addEventListener("click", openReminderDialog);
document.querySelector("[data-dialog-close]")?.addEventListener("click", () => reminderDialog.close());
document.querySelector("[data-dialog-cancel]")?.addEventListener("click", () => reminderDialog.close());

reminderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(reminderForm);
  const remindAt = new Date(String(formData.get("remindAt") || ""));
  if (Number.isNaN(remindAt.getTime()) || remindAt <= new Date()) {
    window.alert("请选择一个未来时间。用时区按当前设备设置计算。");
    return;
  }
  const reminder: Reminder = {
    id: crypto.randomUUID(),
    hospitalCode: String(formData.get("hospital") || selectedHospital),
    department: String(formData.get("department") || selectedDepartment),
    remindAt: remindAt.toISOString(),
  };

  if (extensionConnected) {
    try {
      const payload = await sendExtensionRequest("ADD_REMINDER", { reminder });
      reminders = Array.isArray(payload.reminders) ? payload.reminders as Reminder[] : reminders;
    } catch {
      saveLocalReminder(reminder);
    }
  } else {
    saveLocalReminder(reminder);
  }
  reminderDialog.close();
  renderReminders();
});

async function deleteReminder(id: string) {
  if (extensionConnected) {
    try {
      const payload = await sendExtensionRequest("DELETE_REMINDER", { id });
      reminders = Array.isArray(payload.reminders) ? payload.reminders as Reminder[] : reminders.filter((item) => item.id !== id);
    } catch {
      deleteLocalReminder(id);
    }
  } else {
    deleteLocalReminder(id);
  }
  renderReminders();
}

function loadLocalReminders() {
  try {
    reminders = JSON.parse(window.localStorage.getItem(localReminderKey) || "[]") as Reminder[];
  } catch {
    reminders = [];
  }
  for (const reminder of reminders) scheduleLocalReminder(reminder);
  renderReminders();
}

function saveLocalReminder(reminder: Reminder) {
  reminders = [...reminders.filter((item) => item.id !== reminder.id), reminder];
  window.localStorage.setItem(localReminderKey, JSON.stringify(reminders));
  scheduleLocalReminder(reminder);
}

function deleteLocalReminder(id: string) {
  reminders = reminders.filter((item) => item.id !== id);
  window.localStorage.setItem(localReminderKey, JSON.stringify(reminders));
  const timer = localTimers.get(id);
  if (timer) window.clearTimeout(timer);
  localTimers.delete(id);
}

function scheduleLocalReminder(reminder: Reminder) {
  const delay = new Date(reminder.remindAt).getTime() - Date.now();
  if (delay <= 0 || delay > 2_147_483_647) return;
  const existing = localTimers.get(reminder.id);
  if (existing) window.clearTimeout(existing);
  localTimers.set(reminder.id, window.setTimeout(async () => {
    if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("挂号放号提醒", { body: `${hospitalName(reminder.hospitalCode)} · ${departmentName(reminder.department)}，请打开官方平台查看号源。` });
    }
  }, delay));
}

void refreshExtensionState();
window.setInterval(() => { if (extensionConnected) void refreshExtensionState(); }, 5000);
