(() => {
  "use strict";

  const allowedKeys = new Set([
    "42500653900:2047",
    "42500653900:2061",
    "42502656400:42502656400-XHNK",
    "42502656400:42502656400-SJNK"
  ]);

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data;
    if (message?.source !== "magicj-appointment-official" || message.type !== "MAGICJ_OFFICIAL_SNAPSHOT") return;
    const snapshot = message.payload;
    if (!snapshot || !allowedKeys.has(snapshot.key) || !Array.isArray(snapshot.schedules)) return;

    const { magicjAppointmentSnapshots = {} } = await chrome.storage.local.get("magicjAppointmentSnapshots");
    magicjAppointmentSnapshots[snapshot.key] = snapshot;
    await chrome.storage.local.set({ magicjAppointmentSnapshots });
  });
})();
