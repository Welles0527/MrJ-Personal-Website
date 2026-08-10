const REMINDER_KEY = "magicjAppointmentReminders";
const APPOINTMENT_URL = "https://www.magicj.cn/officialwebsite/tools/appointment/";

async function getReminders() {
  const state = await chrome.storage.local.get(REMINDER_KEY);
  return Array.isArray(state[REMINDER_KEY]) ? state[REMINDER_KEY] : [];
}

async function saveReminders(reminders) {
  await chrome.storage.local.set({ [REMINDER_KEY]: reminders });
  return reminders;
}

async function addReminder(reminder) {
  if (!reminder?.id || !reminder?.remindAt) throw new Error("invalid-reminder");
  const when = new Date(reminder.remindAt).getTime();
  if (!Number.isFinite(when) || when <= Date.now()) throw new Error("reminder-must-be-in-future");
  const reminders = (await getReminders()).filter((item) => item.id !== reminder.id);
  reminders.push(reminder);
  await saveReminders(reminders);
  await chrome.alarms.create(`magicj-appointment:${reminder.id}`, { when });
  return reminders;
}

async function deleteReminder(id) {
  const reminders = (await getReminders()).filter((item) => item.id !== id);
  await saveReminders(reminders);
  await chrome.alarms.clear(`magicj-appointment:${id}`);
  return reminders;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "MAGICJ_SITE_ACTION") return false;
  (async () => {
    if (message.action === "ADD_REMINDER") return { reminders: await addReminder(message.payload?.reminder) };
    if (message.action === "DELETE_REMINDER") return { reminders: await deleteReminder(message.payload?.id) };
    return { error: "unknown-action" };
  })().then(sendResponse).catch((error) => sendResponse({ error: String(error) }));
  return true;
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("magicj-appointment:")) return;
  const id = alarm.name.slice("magicj-appointment:".length);
  const reminders = await getReminders();
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder) return;
  const hospital = reminder.hospitalCode === "42502656400" ? "瑞金医院" : "华山医院";
  const department = reminder.department === "neurology" ? "神经内科" : "消化内科";
  await chrome.notifications.create(`magicj-appointment:${id}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon.svg"),
    title: "挂号放号提醒",
    message: `${hospital} · ${department}，请打开官方平台查看最新号源。`,
    priority: 2
  });
  await saveReminders(reminders.filter((item) => item.id !== id));
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("magicj-appointment:")) void chrome.tabs.create({ url: APPOINTMENT_URL });
});
