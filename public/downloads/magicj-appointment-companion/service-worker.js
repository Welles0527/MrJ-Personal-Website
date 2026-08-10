const REMINDER_KEY = "magicjAppointmentReminders";
const NOTIFICATION_KEY = "magicjAppointmentNotifications";
const ALARM_PREFIX = "magicj-appointment:";
const APPOINTMENT_URL = "https://www.magicj.cn/officialwebsite/tools/appointment/";
const RULES = {
  "42500653900": { hospital: "华山医院", advanceDays: 14, releaseTime: "18:00", label: "预估规则" },
  "42502656400": { hospital: "瑞金医院", advanceDays: 28, releaseTime: "07:30", label: "官网旧规则" }
};

async function getReminders() {
  const state = await chrome.storage.local.get(REMINDER_KEY);
  return Array.isArray(state[REMINDER_KEY]) ? state[REMINDER_KEY] : [];
}

async function saveReminders(reminders) {
  await chrome.storage.local.set({ [REMINDER_KEY]: reminders });
  return reminders;
}

async function getNotifications() {
  const state = await chrome.storage.local.get(NOTIFICATION_KEY);
  return Array.isArray(state[NOTIFICATION_KEY]) ? state[NOTIFICATION_KEY] : [];
}

async function saveNotifications(notifications) {
  const trimmed = notifications.slice(0, 100);
  await chrome.storage.local.set({ [NOTIFICATION_KEY]: trimmed });
  return trimmed;
}

async function appendNotification(notification) {
  return saveNotifications([notification, ...(await getNotifications())]);
}

function addDays(date, days) {
  const parsed = new Date(`${date}T12:00:00+08:00`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function releaseEvent(reminder, targetDate) {
  const rule = RULES[reminder.hospitalCode] || RULES["42500653900"];
  const releaseDate = addDays(targetDate, -rule.advanceDays);
  const releaseAt = new Date(`${releaseDate}T${rule.releaseTime}:00+08:00`);
  return {
    targetDate,
    releaseAt: releaseAt.toISOString(),
    alertAt: new Date(releaseAt.getTime() - Number(reminder.leadMinutes || 10) * 60_000).toISOString()
  };
}

function reminderEvents(reminder) {
  if (reminder.remindAt) {
    const when = new Date(reminder.remindAt);
    return Number.isFinite(when.getTime()) ? [{ targetDate: "legacy", releaseAt: when.toISOString(), alertAt: when.toISOString() }] : [];
  }
  if (!reminder.dateStart || !reminder.dateEnd || reminder.dateStart > reminder.dateEnd) return [];
  const events = [];
  let date = reminder.dateStart;
  for (let index = 0; index < 120 && date <= reminder.dateEnd; index++) {
    events.push(releaseEvent(reminder, date));
    date = addDays(date, 1);
  }
  return events;
}

async function clearReminderAlarms(id) {
  const alarms = await chrome.alarms.getAll();
  await Promise.all(alarms
    .filter((alarm) => alarm.name.startsWith(`${ALARM_PREFIX}${id}:`))
    .map((alarm) => chrome.alarms.clear(alarm.name)));
}

async function scheduleReminder(reminder) {
  await clearReminderAlarms(reminder.id);
  const futureEvents = reminderEvents(reminder).filter((event) => new Date(event.alertAt).getTime() > Date.now());
  for (const event of futureEvents) {
    await chrome.alarms.create(`${ALARM_PREFIX}${reminder.id}:${event.targetDate}`, { when: new Date(event.alertAt).getTime() });
  }
  return futureEvents.length;
}

function validateReminder(reminder) {
  if (!reminder?.id || !reminder?.hospitalCode || !reminder?.department) throw new Error("invalid-reminder");
  if (reminder.remindAt) {
    if (new Date(reminder.remindAt).getTime() <= Date.now()) throw new Error("reminder-must-be-in-future");
    return;
  }
  if (!reminder.dateStart || !reminder.dateEnd || reminder.dateStart > reminder.dateEnd) throw new Error("invalid-date-range");
  if (addDays(reminder.dateStart, 119) < reminder.dateEnd) throw new Error("date-range-too-long");
  if (!["any", "morning", "afternoon"].includes(reminder.session)) throw new Error("invalid-session");
  if (![5, 10, 30, 60].includes(Number(reminder.leadMinutes))) throw new Error("invalid-lead-minutes");
}

async function addReminder(reminder) {
  validateReminder(reminder);
  const reminders = (await getReminders()).filter((item) => item.id !== reminder.id);
  reminders.push(reminder);
  await saveReminders(reminders);
  await scheduleReminder(reminder);
  return reminders;
}

async function deleteReminder(id) {
  const reminders = (await getReminders()).filter((item) => item.id !== id);
  await saveReminders(reminders);
  await clearReminderAlarms(id);
  return reminders;
}

async function sendTestNotification() {
  const record = {
    id: crypto.randomUUID(),
    title: "号候提醒链路测试",
    message: "测试成功：Chrome 扩展已能发送 Windows 桌面通知。",
    kind: "test",
    sourceEventId: null,
    createdAt: new Date().toISOString(),
    read: false
  };
  const notifications = await appendNotification(record);
  await chrome.notifications.create(`${ALARM_PREFIX}test:${record.id}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon.svg"),
    title: record.title,
    message: record.message,
    priority: 2
  });
  return notifications;
}

async function markNotificationsRead() {
  return saveNotifications((await getNotifications()).map((item) => ({ ...item, read: true })));
}

async function rescheduleAll() {
  for (const reminder of await getReminders()) {
    try { await scheduleReminder(reminder); } catch {}
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "MAGICJ_SITE_ACTION") return false;
  (async () => {
    if (message.action === "ADD_REMINDER") return { reminders: await addReminder(message.payload?.reminder) };
    if (message.action === "DELETE_REMINDER") return { reminders: await deleteReminder(message.payload?.id) };
    if (message.action === "TEST_NOTIFICATION") return { notifications: await sendTestNotification() };
    if (message.action === "MARK_NOTIFICATIONS_READ") return { notifications: await markNotificationsRead() };
    return { error: "unknown-action" };
  })().then(sendResponse).catch((error) => sendResponse({ error: String(error) }));
  return true;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(ALARM_PREFIX) || alarm.name.startsWith(`${ALARM_PREFIX}test:`)) return;
  const parts = alarm.name.slice(ALARM_PREFIX.length).split(":");
  const id = parts[0];
  const targetDate = parts[1] || "legacy";
  const reminder = (await getReminders()).find((item) => item.id === id);
  if (!reminder) return;
  const rule = RULES[reminder.hospitalCode] || RULES["42500653900"];
  const department = reminder.department === "neurology" ? "神经内科" : "消化内科";
  const doctor = reminder.doctorName || "任一专家";
  const session = reminder.session === "morning" ? "上午" : reminder.session === "afternoon" ? "下午" : "上午/下午";
  const target = targetDate === "legacy" ? "你设置的时间" : `${targetDate} ${session}`;
  const record = {
    id: crypto.randomUUID(),
    title: "挂号放号提醒",
    message: `${rule.hospital} · ${department} · ${doctor}：${target} 预计即将放号，请打开官方平台复核。`,
    kind: "release",
    sourceEventId: alarm.name,
    createdAt: new Date().toISOString(),
    read: false
  };
  await appendNotification(record);
  await chrome.notifications.create(`${ALARM_PREFIX}release:${record.id}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon.svg"),
    title: record.title,
    message: record.message,
    priority: 2
  });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith(ALARM_PREFIX)) void chrome.tabs.create({ url: APPOINTMENT_URL });
});

chrome.runtime.onInstalled.addListener(() => void rescheduleAll());
chrome.runtime.onStartup.addListener(() => void rescheduleAll());
