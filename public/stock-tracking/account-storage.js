"use strict";

(function createAccountScopedPositionStorage() {
  const SESSION_KEY = "mywebsite.site-auth-session.v1";
  const STORAGE_PREFIX = "a-share-stock-tracking.position.v1";
  const WATCHLIST_PREFIX = "a-share-stock-tracking.watchlist.v1";
  let cloudWriteQueue = Promise.resolve();
  let cloudWatcher = null;
  let observedAccountKey = "";
  let accountGeneration = 0;
  let writeRevision = 0;
  const pendingWrites = new Map();
  const localWriteRevisions = new Map();
  let syncStatus = { mode: "local", updatedAt: null, error: "", requiresLogin: false };

  function readJson(key) {
    try {
      return JSON.parse(window.localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function firstValue(source, keys) {
    if (!source || typeof source !== "object") return "";
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number") return String(value);
    }
    return "";
  }

  function hash(value) {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
  }

  function getAccount() {
    const session = readJson(SESSION_KEY);
    if (typeof session?.expiresAt === "number" && session.expiresAt <= Date.now()) {
      return observeAccount({ key: "guest", label: "访客", signedIn: false });
    }
    const candidates = [
      session,
      session?.user,
      session?.account,
      session?.profile,
      session?.auth?.user
    ];
    const idKeys = ["uid", "userId", "accountId", "openid", "account", "email", "phone"];
    const labelKeys = ["displayName", "nickname", "name", "account", "email", "phone"];
    const id = candidates.map(candidate => firstValue(candidate, idKeys)).find(Boolean);
    const label = candidates.map(candidate => firstValue(candidate, labelKeys)).find(Boolean);

    if (!id) {
      return observeAccount({ key: "guest", label: "访客", signedIn: false });
    }
    return observeAccount({
      key: `account-${hash(id)}`,
      label: label || "已登录账号",
      signedIn: true
    });
  }

  function observeAccount(account) {
    if (observedAccountKey !== account.key) {
      resetCloudAccount(account.key);
    }
    return account;
  }

  function resetCloudAccount(accountKey) {
    closeCloudWatcher();
    observedAccountKey = accountKey;
    accountGeneration += 1;
    syncStatus = { mode: "local", updatedAt: null, error: "", requiresLogin: false };
  }

  function isCurrentAccount(accountKey, generation) {
    return getAccount().key === accountKey && accountGeneration === generation;
  }

  function keyFor(stockId, accountKey = getAccount().key) {
    return `${STORAGE_PREFIX}:${accountKey}:${stockId}`;
  }

  function watchlistKey(accountKey = getAccount().key) {
    return `${WATCHLIST_PREFIX}:${accountKey}`;
  }

  function cleanValue(value) {
    const { _cloudPending, ...clean } = value || {};
    return clean;
  }

  function accountWrites(accountKey) {
    if (!pendingWrites.has(accountKey)) {
      const writes = new Map();
      pendingWrites.set(accountKey, writes);
      const watchlist = readJson(watchlistKey(accountKey));
      const restore = (storageKey, scopeId, value) => {
        if (!value?._cloudPending) return;
        writes.set(storageKey, { storageKey, scopeId, value: cleanValue(value), error: "", revision: ++writeRevision });
      };
      restore(watchlistKey(accountKey), null, watchlist);
      Object.entries(localScopes(accountKey)).forEach(([scopeId, value]) => restore(keyFor(scopeId, accountKey), scopeId, value));
    }
    return pendingWrites.get(accountKey);
  }

  function cloudAdapter() {
    return getAccount().signedIn ? window.StockTrackingPreferenceCloud || null : null;
  }

  function setSyncStatus(mode, error = "") {
    syncStatus = {
      mode,
      updatedAt: mode === "cloud" ? new Date().toISOString() : syncStatus.updatedAt,
      error: String(error?.message || error || ""),
      requiresLogin: error?.code === "SITE_AUTH_REQUIRED"
    };
  }

  function dispatchCloudChange() {
    if (typeof window.dispatchEvent !== "function" || typeof window.CustomEvent !== "function") return;
    window.dispatchEvent(new window.CustomEvent("stock-preferences-cloud-change", {
      detail: { ...syncStatus }
    }));
  }

  function localScopes(accountKey = getAccount().key) {
    const prefix = `${STORAGE_PREFIX}:${accountKey}:`;
    const scopes = {};
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(prefix)) continue;
      const value = readJson(key);
      if (value && typeof value === "object") scopes[key.slice(prefix.length)] = value;
    }
    return scopes;
  }

  function applyCloudSnapshot(snapshot, accountKey, generation, readRevision = Infinity, clearMissingWatchlist = false) {
    if (!snapshot || typeof snapshot !== "object") return;
    if (!isCurrentAccount(accountKey, generation)) return;
    const writes = accountWrites(accountKey);
    const canApply = key => !writes.has(key) && !(localWriteRevisions.get(key) > readRevision);
    const listKey = watchlistKey(accountKey);
    if (canApply(listKey) && (Array.isArray(snapshot.watchlist?.codes) || clearMissingWatchlist)) {
      window.localStorage.setItem(listKey, JSON.stringify({
        codes: normalizeCodes(snapshot.watchlist?.codes),
        updatedAt: snapshot.watchlist?.updatedAt || null
      }));
    }
    const scopes = snapshot.scopes && typeof snapshot.scopes === "object" ? snapshot.scopes : {};
    Object.entries(scopes).forEach(([scopeId, value]) => {
      const storageKey = keyFor(scopeId, accountKey);
      if (!scopeId || !value || typeof value !== "object" || !canApply(storageKey)) return;
      window.localStorage.setItem(storageKey, JSON.stringify(cleanValue(value)));
    });
    updateWriteStatus(accountKey, generation);
  }

  function closeCloudWatcher() {
    if (cloudWatcher && typeof cloudWatcher.close === "function") {
      try { Promise.resolve(cloudWatcher.close()).catch(() => undefined); } catch { /* Already closed. */ }
    }
    cloudWatcher = null;
  }

  function updateWriteStatus(accountKey, generation) {
    if (!isCurrentAccount(accountKey, generation)) return;
    const writes = [...accountWrites(accountKey).values()];
    const failure = writes.find(write => write.error);
    setSyncStatus(failure ? "error" : writes.length ? "saving" : "cloud", failure?.error);
    dispatchCloudChange();
  }

  function queueCloudWrite(record, accountKey, generation, adapter) {
    if (!adapter) {
      record.error = "尚未保存到云端，请登录后重试同步";
      updateWriteStatus(accountKey, generation);
      return cloudWriteQueue;
    }
    record.error = "";
    updateWriteStatus(accountKey, generation);
    cloudWriteQueue = cloudWriteQueue
      .catch(() => undefined)
      .then(async () => {
        const writes = accountWrites(accountKey);
        if (!isCurrentAccount(accountKey, generation) || writes.get(record.storageKey) !== record) return;
        if (record.scopeId === null) {
          await adapter.saveWatchlist(record.value.codes, accountKey);
        } else {
          await adapter.saveScope(record.scopeId, record.value, accountKey);
        }
        if (!isCurrentAccount(accountKey, generation) || writes.get(record.storageKey) !== record) return;
        window.localStorage.setItem(record.storageKey, JSON.stringify(record.value));
        writes.delete(record.storageKey);
        updateWriteStatus(accountKey, generation);
      })
      .catch(error => {
        if (accountWrites(accountKey).get(record.storageKey) === record) record.error = error;
        updateWriteStatus(accountKey, generation);
      });
    return cloudWriteQueue;
  }

  function saveLocalValue(storageKey, scopeId, value, account) {
    const writes = account.signedIn ? accountWrites(account.key) : null;
    window.localStorage.setItem(storageKey, JSON.stringify(account.signedIn ? { ...value, _cloudPending: true } : value));
    if (!writes) return;
    const record = { storageKey, scopeId, value, error: "", revision: ++writeRevision };
    localWriteRevisions.set(storageKey, record.revision);
    writes.set(storageKey, record);
    queueCloudWrite(record, account.key, accountGeneration, cloudAdapter());
  }

  function normalizeCodes(codes) {
    return [...new Set((Array.isArray(codes) ? codes : [])
      .map(code => String(code).padStart(6, "0"))
      .filter(code => /^\d{6}$/.test(code)))];
  }

  function load(stockId) {
    const value = readJson(keyFor(stockId));
    return value && typeof value === "object" ? cleanValue(value) : {};
  }

  function save(stockId, patch) {
    const account = getAccount();
    const nextValue = {
      ...load(stockId),
      ...cleanValue(patch),
      updatedAt: new Date().toISOString()
    };
    saveLocalValue(keyFor(stockId, account.key), String(stockId), nextValue, account);
    return nextValue;
  }

  function loadWatchlist(defaultCodes = []) {
    const stored = readJson(watchlistKey());
    const source = Array.isArray(stored?.codes) ? stored.codes : defaultCodes;
    return normalizeCodes(source);
  }

  function saveWatchlist(codes) {
    const account = getAccount();
    const value = {
      codes: normalizeCodes(codes),
      updatedAt: new Date().toISOString()
    };
    saveLocalValue(watchlistKey(account.key), null, value, account);
    return value;
  }

  async function sync(defaultCodes = []) {
    const account = getAccount();
    const generation = accountGeneration;
    const adapter = cloudAdapter();
    if (!account.signedIn || !adapter || typeof adapter.load !== "function") {
      closeCloudWatcher();
      setSyncStatus(account.signedIn ? "error" : "local", account.signedIn ? "云端同步尚未就绪，请重新登录后重试" : "");
      return { ...syncStatus };
    }

    try {
      await cloudWriteQueue;
      if (!isCurrentAccount(account.key, generation)) return { ...syncStatus };
      for (const record of accountWrites(account.key).values()) queueCloudWrite(record, account.key, generation, adapter);
      await cloudWriteQueue;
      if (!isCurrentAccount(account.key, generation)) return { ...syncStatus };
      if (accountWrites(account.key).size) {
        updateWriteStatus(account.key, generation);
        return { ...syncStatus };
      }
      const readRevision = writeRevision;
      const snapshot = await adapter.load(account.key);
      if (!isCurrentAccount(account.key, generation)) return { ...syncStatus };
      applyCloudSnapshot(snapshot, account.key, generation, readRevision, true);
      if (!cloudWatcher && typeof adapter.watch === "function") {
        cloudWatcher = adapter.watch(
          nextSnapshot => applyCloudSnapshot(nextSnapshot, account.key, generation),
          error => {
            if (!isCurrentAccount(account.key, generation)) return;
            setSyncStatus("error", error);
            dispatchCloudChange();
          },
          account.key
        );
      }
      return { ...syncStatus };
    } catch (error) {
      if (isCurrentAccount(account.key, generation)) setSyncStatus("error", error);
      return { ...syncStatus };
    }
  }

  function flushCloudWrites() {
    const account = getAccount();
    return cloudWriteQueue.then(() => {
      if (!account.signedIn) return;
      const writes = [...accountWrites(account.key).values()];
      const failure = writes.find(write => write.error)?.error;
      if (writes.length) throw new Error(failure?.message || failure || "股票设置尚未确认保存到云端");
    });
  }

  function getSyncStatus() {
    getAccount();
    return { ...syncStatus };
  }

  const onAccountChange = () => {
    const previousKey = observedAccountKey;
    const account = getAccount();
    if (account.key === previousKey) resetCloudAccount(account.key);
  };
  window.addEventListener("site-auth-change", onAccountChange);
  window.addEventListener("storage", event => { if (!event.key || event.key === SESSION_KEY) onAccountChange(); });

  const registerAccount = () => {
    // Other pages import this storage helper for read-only investment views.
    // Only the stock editor owns its pending-write guard and account sync action.
    if (!/\/stock-tracking(?:\/(?:index\.html)?)?$/.test(location.pathname)) return;
    window.MagicJAccount?.register({
      beforeLeave: flushCloudWrites,
      sync: async () => { await cloudWriteQueue; const result = await sync(); if (result.mode !== 'cloud') throw new Error(result.error || '股票云端同步未完成'); }
    });
  };
  window.addEventListener('magicj-account-ready', registerAccount); registerAccount();
  window.StockTrackingAccountStorage = {
    getAccount,
    load,
    save,
    loadWatchlist,
    saveWatchlist,
    sync,
    flushCloudWrites,
    getSyncStatus
  };
})();
