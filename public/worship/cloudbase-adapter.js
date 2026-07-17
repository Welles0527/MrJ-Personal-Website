/*
 * Reuses magicj.cn's existing CloudBase auth module when the worship page is
 * served on that site (or when the module URL is configured explicitly).
 * Local storage remains the safe fallback for standalone previews.
 */
(() => {
  const moduleUrl = window.WORSHIP_AUTH_MODULE_URL || "https://www.magicj.cn/officialwebsite/_astro/site-auth.DM62T0Sy.js";
  const collectionName = "officialWebsiteWorshipMusic";
  let authModulePromise;
  let identity = null;
  const local = {
    async load(key, fallback) { try { return JSON.parse(localStorage.getItem(`worship:${key}`)) ?? fallback; } catch { return fallback; } },
    async save(key, value) { localStorage.setItem(`worship:${key}`, JSON.stringify(value)); }
  };
  const authModule = () => authModulePromise ||= import(moduleUrl);
  async function getIdentity() {
    try {
      const auth = await authModule();
      identity = await auth.g() || auth.d() || null;
      return identity;
    } catch { return null; }
  }
  window.worshipCloudStore = {
    get userId() { return identity?.uid || null; },
    async load(key, fallback) {
      const account = await getIdentity();
      if (!account?.uid) return local.load(key, fallback);
      try {
        const db = (await authModule()).b();
        const result = await db.collection(collectionName).doc(account.uid).get();
        const data = result?.data?.[0] || result?.data || {};
        return data[key] ?? fallback;
      } catch { return local.load(key, fallback); }
    },
    async save(key, value) {
      const account = await getIdentity();
      if (!account?.uid) return local.save(key, value);
      try {
        const db = (await authModule()).b();
        const existing = await db.collection(collectionName).doc(account.uid).get();
        const current = existing?.data?.[0] || existing?.data || {};
        await db.collection(collectionName).doc(account.uid).set({ ...current, ownerId: account.uid, account: account.account, [key]: value, updatedAt: new Date().toISOString() });
      } catch { await local.save(key, value); }
    }
  };
})();
