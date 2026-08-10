(() => {
  "use strict";

  const post = (type, payload = {}, requestId = "") => {
    window.postMessage({
      source: "magicj-appointment-extension",
      type,
      requestId,
      payload
    }, window.location.origin);
  };

  const getState = async () => {
    const state = await chrome.storage.local.get(["magicjAppointmentSnapshots", "magicjAppointmentReminders", "magicjAppointmentNotifications"]);
    return {
      version: chrome.runtime.getManifest().version,
      snapshots: state.magicjAppointmentSnapshots || {},
      reminders: state.magicjAppointmentReminders || [],
      notifications: state.magicjAppointmentNotifications || []
    };
  };

  const publishState = async () => post("MAGICJ_EXTENSION_STATE", await getState());

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (message?.source !== "magicj-appointment-site" || message.type !== "MAGICJ_EXTENSION_REQUEST") return;

    try {
      let payload;
      if (message.action === "GET_STATE") {
        payload = await getState();
      } else {
        payload = await chrome.runtime.sendMessage({
          type: "MAGICJ_SITE_ACTION",
          action: message.action,
          payload: message.payload || {}
        });
      }
      post("MAGICJ_EXTENSION_RESPONSE", payload || {}, message.requestId);
    } catch (error) {
      post("MAGICJ_EXTENSION_RESPONSE", { error: String(error) }, message.requestId);
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes.magicjAppointmentSnapshots || changes.magicjAppointmentReminders || changes.magicjAppointmentNotifications) void publishState();
  });

  post("MAGICJ_EXTENSION_READY");
})();
