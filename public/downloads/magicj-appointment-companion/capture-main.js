(() => {
  "use strict";

  const allowedDepartments = new Map([
    ["42500653900:2047", { hospitalName: "华山医院", departmentName: "消化内科" }],
    ["42500653900:2061", { hospitalName: "华山医院", departmentName: "神经内科" }],
    ["42502656400:42502656400-XHNK", { hospitalName: "瑞金医院", departmentName: "消化内科" }],
    ["42502656400:42502656400-SJNK", { hospitalName: "瑞金医院", departmentName: "神经内科" }]
  ]);

  const asText = (value) => value === undefined || value === null ? "" : String(value);
  const asNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const isWaitable = (doctor) => {
    const values = [
      doctor.canWait,
      doctor.isWait,
      doctor.waitable,
      doctor.waitStatus,
      doctor.waitingStatus,
      doctor.reserveWaitStatus,
      doctor.standbyStatus,
      doctor.waitOrderStatus
    ];
    return values.some((value) => value === true || value === 1 || /候补|wait|standby/i.test(asText(value)));
  };
  const normalizeDoctor = (doctor = {}) => ({
    code: asText(doctor.hosDoctCode || doctor.doctorCode),
    name: asText(doctor.doctName || doctor.doctorName),
    title: asText(doctor.doctTile || doctor.doctorTitle),
    info: asText(doctor.doctInfo || doctor.doctorInfo),
    status: doctor.status ?? null,
    remaining: asNumber(doctor.reserveOrderNum),
    timeRange: doctor.timeRange ?? null,
    waitable: isWaitable(doctor)
  });

  const emitSnapshot = (data) => {
    if (!data || !Array.isArray(data.doctorEntities) || !Array.isArray(data.schedules)) return;
    const params = new URLSearchParams(window.location.search);
    const hospitalCode = params.get("hosOrgCode") || "";
    const departmentCode = params.get("hosDeptCode") || "";
    const key = `${hospitalCode}:${departmentCode}`;
    const target = allowedDepartments.get(key);
    if (!target) return;

    const payload = {
      key,
      capturedAt: new Date().toISOString(),
      hospitalCode,
      departmentCode,
      hospitalName: target.hospitalName,
      departmentName: target.departmentName,
      doctors: data.doctorEntities.map(normalizeDoctor),
      schedules: data.schedules.map((schedule) => ({
        date: asText(schedule.date),
        weekday: asText(schedule.weekDays),
        doctors: Array.isArray(schedule.doctors) ? schedule.doctors.map(normalizeDoctor) : []
      }))
    };

    window.postMessage({
      source: "magicj-appointment-official",
      type: "MAGICJ_OFFICIAL_SNAPSHOT",
      payload
    }, window.location.origin);
  };

  let wrappedApi = null;
  const timer = window.setInterval(() => {
    const api = window.hcSm2Jky;
    if (!api || typeof api.decrypt !== "function" || api === wrappedApi || api.decrypt.__magicjWrapped) return;
    const originalDecrypt = api.decrypt.bind(api);
    const wrappedDecrypt = (...args) => {
      const plain = originalDecrypt(...args);
      try {
        emitSnapshot(typeof plain === "string" ? JSON.parse(plain) : plain);
      } catch {}
      return plain;
    };
    Object.defineProperty(wrappedDecrypt, "__magicjWrapped", { value: true });
    try {
      api.decrypt = wrappedDecrypt;
      if (api.decrypt === wrappedDecrypt) wrappedApi = api;
    } catch {}
  }, 25);

  window.addEventListener("pagehide", () => window.clearInterval(timer), { once: true });
})();
