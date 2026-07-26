(() => {
  "use strict";

  const ENV_ID = "magicj-web-d5g9yvowj6862f7a2";
  const COLLECTION = "officialWebsiteFundManagerPreferences";
  const SCHEMA_VERSION = "fund-manager-preferences-and-notes-v2";
  const app = window.cloudbase?.init?.({ env: ENV_ID });
  const database = app?.database?.();

  function responseData(response, fallback) {
    if (!response) throw new Error(fallback);
    if (response.error) throw new Error(response.error.message || fallback);
    return response.data;
  }

  function documentFrom(response) {
    const data = responseData(response, "读取基金经理备注失败。");
    return (Array.isArray(data) ? data[0] : data) || {};
  }

  function timestamp(value) {
    return Date.parse(value?.updatedAt || "") || 0;
  }

  function mergeLatestRecords(existing, incoming) {
    const merged = { ...(existing && typeof existing === "object" ? existing : {}) };
    Object.entries(incoming && typeof incoming === "object" ? incoming : {}).forEach(([key, value]) => {
      if (!value || typeof value !== "object") return;
      if (!merged[key] || timestamp(value) >= timestamp(merged[key])) merged[key] = value;
    });
    return merged;
  }

  function mergeFilterDefaults(existing, incoming) {
    const merged = { ...(existing && typeof existing === "object" ? existing : {}) };
    ["kpi", "score"].forEach(scope => {
      const candidate = incoming?.[scope];
      if (!candidate || typeof candidate !== "object") return;
      if (!merged[scope] || timestamp(candidate) >= timestamp(merged[scope])) merged[scope] = candidate;
    });
    return {
      ...merged,
      schemaVersion: incoming?.schemaVersion || existing?.schemaVersion || "fund-dashboard-filter-defaults-v1"
    };
  }

  function mergePreferences(existing, incoming) {
    const merged = mergeLatestRecords(existing, incoming);
    const key = "__dashboardFilterDefaults";
    if (existing?.[key] || incoming?.[key]) merged[key] = mergeFilterDefaults(existing?.[key], incoming?.[key]);
    return merged;
  }

  async function session() {
    const current = await window.FundPreferenceCloud?.getSession?.();
    return current?.uid ? current : null;
  }

  async function loadDocument(current) {
    const response = await database.collection(COLLECTION).doc(current.uid).get();
    return documentFrom(response);
  }

  async function withWriteLock(current, callback) {
    const name = `fund-dashboard-cloud-write:${current.uid}`;
    if (navigator.locks?.request) return navigator.locks.request(name, callback);
    return callback();
  }

  async function saveDocument(current, patch) {
    return withWriteLock(current, async () => {
      const existing = await loadDocument(current);
      const payload = {
        ...existing,
        ownerId: current.uid,
        account: current.account,
        schemaVersion: SCHEMA_VERSION,
        preferences: mergePreferences(existing.preferences, patch.preferences),
        notes: mergeLatestRecords(existing.notes, patch.notes),
        updatedAt: new Date().toISOString()
      };
      responseData(
        await database.collection(COLLECTION).doc(current.uid).set(payload),
        "保存基金经理个人数据失败。"
      );
      return payload;
    });
  }

  const preferenceBridge = window.FundPreferenceCloud;
  if (preferenceBridge) {
    window.FundPreferenceCloud = {
      ...preferenceBridge,
      async load() {
        const current = await session();
        if (!current || !database) return null;
        const document = await loadDocument(current);
        return {
          ownerId: current.uid,
          account: current.account,
          schemaVersion: document.schemaVersion || SCHEMA_VERSION,
          preferences: document.preferences && typeof document.preferences === "object" ? document.preferences : {},
          updatedAt: document.updatedAt || null
        };
      },
      async save(preferences) {
        const current = await session();
        if (!current) throw new Error("当前未登录，收藏已保留在本机。");
        return saveDocument(current, {
          preferences: preferences && typeof preferences === "object" ? preferences : {}
        });
      }
    };
  }

  window.FundNotesCloud = {
    async getSession() {
      return session();
    },
    async load() {
      const current = await session();
      if (!current || !database) return null;
      const document = await loadDocument(current);
      return {
        ownerId: current.uid,
        account: current.account,
        schemaVersion: document.schemaVersion || SCHEMA_VERSION,
        notes: document.notes && typeof document.notes === "object" ? document.notes : {},
        updatedAt: document.updatedAt || null
      };
    },
    async save(notes) {
      const current = await session();
      if (!current) throw new Error("当前未登录网站账号，备注仅保存在本机。");
      if (!database) throw new Error("CloudBase 数据库尚未加载。");
      return saveDocument(current, {
        notes: notes && typeof notes === "object" ? notes : {}
      });
    }
  };
  window.dispatchEvent(new CustomEvent("fund-notes-cloud-ready"));
})();
