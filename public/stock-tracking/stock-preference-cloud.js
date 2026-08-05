"use strict";

(function createStockPreferenceCloudAdapter() {
  const COLLECTION = "officialWebsiteStockTrackingPreferences";
  const SCHEMA_VERSION = "stock-tracking-preferences-v1";

  function bridge() {
    const value = window.StockTrackingSharedAuth;
    if (!value?.getCloudDb || !value?.getCloudSession) throw new Error("云端账号服务尚未就绪");
    return value;
  }

  async function currentSession() {
    const auth = bridge();
    return auth.getRememberedSession?.() || await auth.getCloudSession();
  }

  function hash(value) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
  }

  function recordId(ownerId, kind, scopeId) {
    return `stock_${hash(`${ownerId}|${kind}|${scopeId}`)}`;
  }

  function normalizeCodes(codes) {
    return [...new Set((Array.isArray(codes) ? codes : [])
      .map(code => String(code).padStart(6, "0"))
      .filter(code => /^\d{6}$/.test(code)))];
  }

  function normalizeScope(value) {
    const source = value && typeof value === "object" ? value : {};
    const result = {};
    const cost = Number(source.cost);
    if (Number.isFinite(cost) && cost > 0) result.cost = Number(cost.toFixed(2));
    if (typeof source.thesis === "string") result.thesis = source.thesis.slice(0, 5000);
    if (Array.isArray(source.readOverrides)) {
      result.readOverrides = [...new Set(source.readOverrides.map(item => String(item || "")).filter(Boolean))].slice(-1000);
    }
    result.updatedAt = typeof source.updatedAt === "string" ? source.updatedAt : new Date().toISOString();
    return result;
  }

  function resultData(result, fallback) {
    if (!result) throw new Error(fallback);
    if (result.error) throw new Error(result.error.message || fallback);
    return result.data;
  }

  function newerRecord(current, candidate) {
    if (!current) return candidate;
    return String(candidate.updatedAt || "").localeCompare(String(current.updatedAt || "")) >= 0 ? candidate : current;
  }

  function snapshotFromRecords(records, ownerId) {
    let watchlistRecord = null;
    const scopeRecords = new Map();
    (Array.isArray(records) ? records : []).forEach(record => {
      if (!record || record.ownerId !== ownerId || record.schemaVersion !== SCHEMA_VERSION) return;
      if (record.kind === "watchlist") {
        watchlistRecord = newerRecord(watchlistRecord, record);
      } else if (record.kind === "scope" && typeof record.scopeId === "string" && record.scopeId) {
        scopeRecords.set(record.scopeId, newerRecord(scopeRecords.get(record.scopeId), record));
      }
    });
    return {
      watchlist: watchlistRecord ? {
        codes: normalizeCodes(watchlistRecord.codes),
        updatedAt: watchlistRecord.updatedAt || null
      } : null,
      scopes: Object.fromEntries([...scopeRecords.entries()].map(([scopeId, record]) => [scopeId, normalizeScope(record.value)]))
    };
  }

  async function loadForSession(session) {
    if (!session?.uid) return { watchlist: null, scopes: {} };
    const result = await bridge().getCloudDb()
      .collection(COLLECTION)
      .where({ ownerId: session.uid })
      .limit(1000)
      .get();
    return snapshotFromRecords(resultData(result, "读取个股跟踪云端设置失败"), session.uid);
  }

  async function saveRecord(session, kind, scopeId, payload) {
    if (!session?.uid) throw new Error("当前未登录，设置仅保留在本机");
    const updatedAt = new Date().toISOString();
    const record = {
      ownerId: session.uid,
      account: session.account || "",
      schemaVersion: SCHEMA_VERSION,
      kind,
      scopeId,
      updatedAt,
      ...payload
    };
    const result = await bridge().getCloudDb()
      .collection(COLLECTION)
      .doc(recordId(session.uid, kind, scopeId))
      .set(record);
    resultData(result, "保存个股跟踪云端设置失败");
    return record;
  }

  function startWatch(session, onChange, onError) {
    return bridge().getCloudDb()
      .collection(COLLECTION)
      .where({ ownerId: session.uid })
      .limit(1000)
      .watch({
        onChange: snapshot => onChange(snapshotFromRecords(snapshot?.docs, session.uid)),
        onError: error => onError?.(error instanceof Error ? error : new Error(String(error || "云端同步已中断")))
      });
  }

  const api = {
    async load() {
      return loadForSession(await currentSession());
    },
    async saveWatchlist(codes) {
      const session = await currentSession();
      return saveRecord(session, "watchlist", "watchlist", { codes: normalizeCodes(codes) });
    },
    async saveScope(scopeId, value) {
      const session = await currentSession();
      return saveRecord(session, "scope", String(scopeId), { value: normalizeScope(value) });
    },
    watch(onChange, onError) {
      let innerWatcher = null;
      let closed = false;
      const remembered = window.StockTrackingSharedAuth?.getRememberedSession?.();
      if (remembered?.uid) {
        innerWatcher = startWatch(remembered, onChange, onError);
      } else {
        void currentSession()
          .then(session => {
            if (!closed && session?.uid) innerWatcher = startWatch(session, onChange, onError);
          })
          .catch(error => onError?.(error));
      }
      return {
        close() {
          closed = true;
          return innerWatcher?.close?.();
        }
      };
    }
  };

  window.StockTrackingPreferenceCloud = api;
  if (typeof window.dispatchEvent === "function" && typeof window.CustomEvent === "function") {
    window.dispatchEvent(new window.CustomEvent("stock-preference-cloud-ready"));
  }
})();
