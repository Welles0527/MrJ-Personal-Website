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

  async function session() {
    const current = await window.FundPreferenceCloud?.getSession?.();
    return current?.uid ? current : null;
  }

  async function loadDocument(current) {
    try {
      const response = await database.collection(COLLECTION).doc(current.uid).get();
      return documentFrom(response);
    } catch {
      return {};
    }
  }

  async function saveDocument(current, patch) {
    const existing = await loadDocument(current);
    const payload = {
      ownerId: current.uid,
      account: current.account,
      schemaVersion: SCHEMA_VERSION,
      preferences: existing.preferences && typeof existing.preferences === "object" ? existing.preferences : {},
      notes: existing.notes && typeof existing.notes === "object" ? existing.notes : {},
      ...patch,
      updatedAt: new Date().toISOString()
    };
    responseData(
      await database.collection(COLLECTION).doc(current.uid).set(payload),
      "保存基金经理个人数据失败。"
    );
    return payload;
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
