import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(testDir, '..', 'public', 'stock-tracking', 'account-storage.js'), 'utf8');
const sessionKey = 'mywebsite.site-auth-session.v1';

function createLocalStorage(session) {
  const values = new Map([[sessionKey, JSON.stringify(session)]]);
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] || null; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); }
  };
}

function createCloud() {
  const documents = new Map();
  const listeners = new Map();
  const publish = uid => {
    const snapshot = structuredClone(documents.get(uid) || { watchlist: null, scopes: {} });
    for (const listener of listeners.get(uid) || []) listener(snapshot);
  };
  return {
    adapter(uid) {
      return {
        async load() {
          return structuredClone(documents.get(uid) || { watchlist: null, scopes: {} });
        },
        async saveWatchlist(codes) {
          const current = documents.get(uid) || { watchlist: null, scopes: {} };
          current.watchlist = { codes: [...codes], updatedAt: new Date().toISOString() };
          documents.set(uid, current);
          publish(uid);
        },
        async saveScope(scopeId, value) {
          const current = documents.get(uid) || { watchlist: null, scopes: {} };
          current.scopes[scopeId] = structuredClone(value);
          documents.set(uid, current);
          publish(uid);
        },
        watch(onChange) {
          const accountListeners = listeners.get(uid) || new Set();
          accountListeners.add(onChange);
          listeners.set(uid, accountListeners);
          return { close: () => accountListeners.delete(onChange) };
        }
      };
    }
  };
}

function createBrowser(uid, cloud, localStorage = null) {
  const session = { uid, account: `${uid}@example.com`, expiresAt: Date.now() + 60_000 };
  const events = [];
  const listeners = new Map();
  let accountHooks;
  const location = { pathname: "/officialwebsite/stock-tracking/" };
  const window = {
    location,
    MagicJAccount: { register(hooks) { accountHooks = hooks; } },
    localStorage: localStorage || createLocalStorage(session),
    StockTrackingPreferenceCloud: cloud.adapter(uid),
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
    addEventListener(type, listener) { const list = listeners.get(type) || []; list.push(listener); listeners.set(type, list); },
    dispatchEvent(event) { events.push(event); for (const listener of listeners.get(event.type) || []) listener(event); }
  };
  window.window = window;
  vm.runInContext(source, vm.createContext({ window, location, globalThis: window, console, Date, Map, Set, JSON, String, Number, Array, Object, Boolean, RegExp, Promise, structuredClone }), { filename: 'account-storage.js' });
  return {
    storage: window.StockTrackingAccountStorage,
    window,
    beforeLeave: () => accountHooks.beforeLeave(),
    events,
    switchAccount(nextUid) {
      window.localStorage.setItem(sessionKey, JSON.stringify({ uid: nextUid, account: `${nextUid}@example.com`, expiresAt: Date.now() + 60_000 }));
      window.StockTrackingPreferenceCloud = cloud.adapter(nextUid);
      window.dispatchEvent(new window.CustomEvent("site-auth-change"));
    }
  };
}

const cloud = createCloud();
const firstBrowser = createBrowser('same-user', cloud);
const secondBrowser = createBrowser('same-user', cloud);
const otherAccount = createBrowser('other-user', cloud);

await firstBrowser.storage.sync(['301026']);
firstBrowser.storage.saveWatchlist(['301026', '688633']);
firstBrowser.storage.save('301026', {
  cost: 18.5,
  readStateVersion: 2,
  readThroughAt: '2026-08-08T10:00:00+08:00',
  readIds: ['announcement-1'],
  unreadIds: []
});
await firstBrowser.storage.flushCloudWrites();

await secondBrowser.storage.sync(['300750']);
assert.deepEqual(Array.from(secondBrowser.storage.loadWatchlist([])), ['301026', '688633']);
assert.equal(secondBrowser.storage.load('301026').cost, 18.5);
assert.equal(secondBrowser.storage.load('301026').readStateVersion, 2);
assert.equal(secondBrowser.storage.load('301026').readThroughAt, '2026-08-08T10:00:00+08:00');
assert.deepEqual(Array.from(secondBrowser.storage.load('301026').readIds), ['announcement-1']);

await otherAccount.storage.sync(['300750']);
assert.deepEqual(Array.from(otherAccount.storage.loadWatchlist([])), [], 'A new account must not upload or present sample defaults as cloud data');
assert.equal(Object.keys(otherAccount.storage.load('301026')).length, 0);

secondBrowser.storage.save('301026', { readIds: [] });
await secondBrowser.storage.flushCloudWrites();
await firstBrowser.storage.sync([]);
assert.deepEqual(Array.from(firstBrowser.storage.load('301026').readIds), []);

firstBrowser.switchAccount('other-user');
await firstBrowser.storage.sync(['300750']);
assert.deepEqual(Array.from(firstBrowser.storage.loadWatchlist([])), []);
assert.equal(Object.keys(firstBrowser.storage.load('301026')).length, 0);
assert.equal(firstBrowser.storage.getSyncStatus().mode, 'cloud');
assert.ok(firstBrowser.events.some(event => event.type === 'stock-preferences-cloud-change'));

// A read failure is not an unsaved edit and must not prevent reauthentication.
const readFailure = createBrowser('read-failure', cloud);
readFailure.window.StockTrackingPreferenceCloud = { load: async () => { throw new Error('read offline'); } };
assert.equal((await readFailure.storage.sync()).mode, 'error');
await assert.doesNotReject(readFailure.beforeLeave());
const visitor = createBrowser('visitor', cloud);
visitor.window.localStorage.removeItem(sessionKey);
await assert.doesNotReject(visitor.beforeLeave());

// One successful write must not hide another failed scope; explicit sync retries it.
const dirty = createBrowser('dirty-user', cloud);
const realDirty = cloud.adapter('dirty-user');
let rejectCost = true;
dirty.window.StockTrackingPreferenceCloud = {
  ...realDirty,
  saveScope: async (id, value, owner) => {
    if (id === '301026' && rejectCost) throw new Error('cost offline');
    return realDirty.saveScope(id, value, owner);
  }
};
await dirty.storage.sync();
dirty.storage.save('301026', { cost: 19.8 });
dirty.storage.saveWatchlist(['688633']);
await assert.rejects(dirty.beforeLeave(), /cost offline/);
assert.equal(dirty.storage.load('301026').cost, 19.8);
rejectCost = false;
assert.equal((await dirty.storage.sync()).mode, 'cloud');
await assert.doesNotReject(dirty.beforeLeave());
const dirtyReader = createBrowser('dirty-user', cloud);
await dirtyReader.storage.sync();
assert.equal(dirtyReader.storage.load('301026').cost, 19.8);
assert.deepEqual(Array.from(dirtyReader.storage.loadWatchlist()), ['688633']);

const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
// A delayed A snapshot must never be written under B's local keys.
const staleLoad = createBrowser('load-a', cloud);
const loading = deferred();
const loadStarted = deferred();
staleLoad.window.StockTrackingPreferenceCloud = { load: () => { loadStarted.resolve(); return loading.promise; } };
const oldSync = staleLoad.storage.sync();
await loadStarted.promise;
staleLoad.switchAccount('load-b');
await staleLoad.storage.sync();
loading.resolve({ watchlist: { codes: ['301026'] }, scopes: { '301026': { cost: 99 } } });
await oldSync;
assert.deepEqual(Array.from(staleLoad.storage.loadWatchlist()), []);
assert.equal(staleLoad.storage.load('301026').cost, undefined);
assert.equal(staleLoad.storage.getSyncStatus().mode, 'cloud');

// A closed watcher's already queued callbacks must not affect the next account.
const staleWatch = createBrowser('watch-a', cloud);
let oldChange, oldError;
staleWatch.window.StockTrackingPreferenceCloud = {
  load: async () => ({ watchlist: { codes: ['301026'] }, scopes: {} }),
  watch: (onChange, onError) => { oldChange = onChange; oldError = onError; return { close() {} }; }
};
await staleWatch.storage.sync();
staleWatch.switchAccount('watch-b');
await staleWatch.storage.sync();
oldChange({ watchlist: { codes: ['688633'] }, scopes: {} });
oldError(new Error('stale watcher failure'));
assert.deepEqual(Array.from(staleWatch.storage.loadWatchlist()), []);
assert.equal(staleWatch.storage.getSyncStatus().mode, 'cloud');

// Failed writes remain local during a server read and can be retried after A -> B -> A.
const switchingWrite = createBrowser('write-a', cloud);
const blockedWrite = deferred();
const writeStarted = deferred();
const aAdapter = cloud.adapter('write-a');
switchingWrite.window.StockTrackingPreferenceCloud = { ...aAdapter, saveScope: async () => { writeStarted.resolve(); return blockedWrite.promise; } };
await switchingWrite.storage.sync();
switchingWrite.storage.save('301026', { cost: 23.5 });
await writeStarted.promise;
switchingWrite.switchAccount('write-b');
blockedWrite.resolve();
await switchingWrite.storage.sync();
assert.equal(switchingWrite.storage.load('301026').cost, undefined);
assert.equal(switchingWrite.storage.getSyncStatus().mode, 'cloud');
switchingWrite.switchAccount('write-a');
await switchingWrite.storage.sync();
assert.equal(switchingWrite.storage.load('301026').cost, 23.5);
await assert.doesNotReject(switchingWrite.beforeLeave());

// A browser reload retains unsaved local edits; only confirmed values reach the cloud.
const offline = createBrowser('reload-user', cloud);
offline.window.StockTrackingPreferenceCloud = null;
offline.storage.save('301026', { cost: 21.6 });
offline.storage.saveWatchlist(['301026']);
await assert.rejects(offline.beforeLeave(), /尚未保存到云端/);
const reloaded = createBrowser('reload-user', cloud, offline.window.localStorage);
assert.equal((await reloaded.storage.sync()).mode, 'cloud');
await assert.doesNotReject(reloaded.beforeLeave());
const uploaded = await cloud.adapter('reload-user').load();
assert.equal(uploaded.scopes['301026'].cost, 21.6);
assert.equal(uploaded.scopes['301026']._cloudPending, undefined, 'Pending metadata must stay local');
assert.deepEqual(uploaded.watchlist.codes, ['301026']);

// Losing the real cloud session must not clear cached preferences or prevent login.
const authMissing = createBrowser('reload-user', cloud, reloaded.window.localStorage);
authMissing.window.StockTrackingPreferenceCloud = {
  load: async () => { throw Object.assign(new Error('SITE_AUTH_REQUIRED'), { code: 'SITE_AUTH_REQUIRED' }); }
};
assert.equal((await authMissing.storage.sync()).mode, 'error');
assert.equal(authMissing.storage.getSyncStatus().requiresLogin, true);
assert.equal(authMissing.storage.load('301026').cost, 21.6);
assert.deepEqual(Array.from(authMissing.storage.loadWatchlist()), ['301026']);
await assert.doesNotReject(authMissing.beforeLeave());

// A slow read cannot overwrite a newer local edit even if that edit is already saved.
const concurrent = createBrowser('concurrent-user', cloud);
const concurrentRead = deferred();
const concurrentStarted = deferred();
const concurrentAdapter = cloud.adapter('concurrent-user');
const owners = [];
concurrent.window.StockTrackingPreferenceCloud = {
  ...concurrentAdapter,
  load: owner => { owners.push(owner); concurrentStarted.resolve(); return concurrentRead.promise; },
  saveWatchlist: (codes, owner) => { owners.push(owner); return concurrentAdapter.saveWatchlist(codes); },
  saveScope: (scopeId, value, owner) => { owners.push(owner); return concurrentAdapter.saveScope(scopeId, value); },
  watch: (onChange, onError, owner) => { owners.push(owner); return concurrentAdapter.watch(onChange, onError); }
};
const concurrentSync = concurrent.storage.sync();
await concurrentStarted.promise;
concurrent.storage.saveWatchlist(['688633']);
concurrent.storage.save('688633', { cost: 32 });
await concurrent.storage.flushCloudWrites();
concurrentRead.resolve({ watchlist: { codes: ['301026'] }, scopes: { '688633': { cost: 1 } } });
await concurrentSync;
assert.deepEqual(Array.from(concurrent.storage.loadWatchlist()), ['688633']);
assert.equal(concurrent.storage.load('688633').cost, 32);
assert.equal(owners.length, 4);
assert.ok(owners.every(owner => owner === concurrent.storage.getAccount().key), 'Every provider request must capture the expected account');
console.log('Stock tracking sync regression passed: reads do not block logout, failed writes retry, account generations and stale callbacks stay isolated.');
