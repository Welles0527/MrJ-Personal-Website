"use strict";

(function createAccountScopedPositionStorage() {
  const SESSION_KEY = "mywebsite.site-auth-session.v1";
  const STORAGE_PREFIX = "a-share-stock-tracking.position.v1";
  const WATCHLIST_PREFIX = "a-share-stock-tracking.watchlist.v1";

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
    return nextValue;
  }

  function loadWatchlist(defaultCodes = []) {
    const stored = readJson(watchlistKey());
    const source = Array.isArray(stored?.codes) ? stored.codes : defaultCodes;
    return [...new Set(source.map(code => String(code).padStart(6, "0")).filter(code => /^\d{6}$/.test(code)))];
  }

  function saveWatchlist(codes) {
    const value = {
      codes: [...new Set(codes.map(code => String(code).padStart(6, "0")).filter(code => /^\d{6}$/.test(code)))],
      updatedAt: new Date().toISOString()
    };
    window.localStorage.setItem(watchlistKey(), JSON.stringify(value));
    return value;
  }

  window.StockTrackingAccountStorage = {
    getAccount,
    load,
    save,
    loadWatchlist,
    saveWatchlist
  };
})();
