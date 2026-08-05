"use strict";

(function createAccountScopedPositionStorage() {
  const SESSION_KEY = "mywebsite.site-auth-session.v1";
  const STORAGE_PREFIX = "a-share-stock-tracking.position.v1";
  const WATCHLIST_PREFIX = "a-share-stock-tracking.watchlist.v1";
  let cloudWriteQueue = Promise.resolve();
  let cloudWatcher = null;
  let activeCloudAccountKey = "";
  let syncStatus = { mode: "local", updatedAt: null, error: "" };

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
      return { key: "guest", label: "访客", signedIn: false };
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
      return { key: "guest", label: "访客", signedIn: false };
    }
    return {
      key: `account-${hash(id)}`,
      label: label || "已登录账号",
      signedIn: true
    };
  }

  function keyFor(stockId) {
    return `${STORAGE_PREFIX}:${getAccount().key}:${stockId}`;
  }

  function watchlistKey() {
    return `${WATCHLIST_PREFIX}:${getAccount().key}`;
  }

  function cloudAdapter() {
    return getAccount().signedIn ? window.StockTrackingPreferenceCloud || null : null;
  }

  function setSyncStatus(mode, error = "") {
    syncStatus = {
      mode,
      updatedAt: mode === "cloud" ? new Date().toISOString() : syncStatus.updatedAt,
      error: String(error || "")
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

  function applyCloudSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return;
    const account = getAccount();
    if (!account.signedIn || account.key !== activeCloudAccountKey) return;
    if (Array.isArray(snapshot.watchlist?.codes)) {
      window.localStorage.setItem(watchlistKey(), JSON.stringify({
        codes: normalizeCodes(snapshot.watchlist.codes),
        updatedAt: snapshot.watchlist.updatedAt || new Date().toISOString()
      }));
    }
    const scopes = snapshot.scopes && typeof snapshot.scopes === "object" ? snapshot.scopes : {};
    Object.entries(scopes).forEach(([scopeId, value]) => {
      if (!scopeId || !value || typeof value !== "object") return;
      window.localStorage.setItem(keyFor(scopeId), JSON.stringify(value));
    });
    setSyncStatus("cloud");
    dispatchCloudChange();
  }

  function closeCloudWatcher() {
    if (cloudWatcher && typeof cloudWatcher.close === "function") {
      Promise.resolve(cloudWatcher.close()).catch(() => undefined);
    }
    cloudWatcher = null;
  }

  function queueCloudWrite(write) {
    const accountKey = getAccount().key;
    const adapter = cloudAdapter();
    if (!adapter) return;
    cloudWriteQueue = cloudWriteQueue
      .catch(() => undefined)
      .then(async () => {
        if (getAccount().key !== accountKey) return;
        await write(adapter);
        setSyncStatus("cloud");
      })
      .catch(error => {
        setSyncStatus("error", error?.message || error);
      });
  }

  function normalizeCodes(codes) {
    return [...new Set((Array.isArray(codes) ? codes : [])
      .map(code => String(code).padStart(6, "0"))
      .filter(code => /^\d{6}$/.test(code)))];
  }

  function load(stockId) {
    const value = readJson(keyFor(stockId));
    return value && typeof value === "object" ? value : {};
  }

  function save(stockId, patch) {
    const nextValue = {
      ...load(stockId),
      ...patch,
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(keyFor(stockId), JSON.stringify(nextValue));
    queueCloudWrite(adapter => adapter.saveScope(String(stockId), nextValue));
    return nextValue;
  }

  function loadWatchlist(defaultCodes = []) {
    const stored = readJson(watchlistKey());
    const source = Array.isArray(stored?.codes) ? stored.codes : defaultCodes;
    return normalizeCodes(source);
  }

  function saveWatchlist(codes) {
    const value = {
      codes: normalizeCodes(codes),
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(watchlistKey(), JSON.stringify(value));
    queueCloudWrite(adapter => adapter.saveWatchlist(value.codes));
    return value;
  }

  async function sync(defaultCodes = []) {
    const account = getAccount();
    const adapter = cloudAdapter();
    if (!account.signedIn || !adapter || typeof adapter.load !== "function") {
      closeCloudWatcher();
      activeCloudAccountKey = "";
      setSyncStatus("local");
      return { ...syncStatus };
    }

    if (activeCloudAccountKey !== account.key) {
      closeCloudWatcher();
      activeCloudAccountKey = account.key;
    }

    try {
      const localWatchlist = loadWatchlist(defaultCodes);
      const scopes = localScopes(account.key);
      const snapshot = await adapter.load();
      if (Array.isArray(snapshot?.watchlist?.codes)) {
        window.localStorage.setItem(watchlistKey(), JSON.stringify(snapshot.watchlist));
      } else if (typeof adapter.saveWatchlist === "function") {
        await adapter.saveWatchlist(localWatchlist);
      }

      const remoteScopes = snapshot?.scopes && typeof snapshot.scopes === "object" ? snapshot.scopes : {};
      Object.entries(remoteScopes).forEach(([scopeId, value]) => {
        if (scopeId && value && typeof value === "object") {
          window.localStorage.setItem(keyFor(scopeId), JSON.stringify(value));
        }
      });
      for (const [scopeId, value] of Object.entries(scopes)) {
        if (!Object.hasOwn(remoteScopes, scopeId) && typeof adapter.saveScope === "function") {
          await adapter.saveScope(scopeId, value);
        }
      }

      const currentSnapshot = typeof adapter.load === "function" ? await adapter.load() : snapshot;
      applyCloudSnapshot(currentSnapshot);
      if (!cloudWatcher && typeof adapter.watch === "function") {
        cloudWatcher = adapter.watch(
          nextSnapshot => applyCloudSnapshot(nextSnapshot),
          error => {
            setSyncStatus("error", error?.message || error);
            dispatchCloudChange();
          }
        );
      }
      setSyncStatus("cloud");
      return { ...syncStatus };
    } catch (error) {
      setSyncStatus("error", error?.message || error);
      return { ...syncStatus };
    }
  }

  function flushCloudWrites() {
    return cloudWriteQueue;
  }

  function getSyncStatus() {
    return { ...syncStatus };
  }

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
