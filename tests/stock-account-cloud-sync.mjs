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

function createBrowser(uid, cloud) {
  const session = { uid, account: `${uid}@example.com`, expiresAt: Date.now() + 60_000 };
  const events = [];
  const window = {
    localStorage: createLocalStorage(session),
    StockTrackingPreferenceCloud: cloud.adapter(uid),
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
    dispatchEvent(event) { events.push(event); }
  };
  window.window = window;
  vm.runInContext(source, vm.createContext({ window, globalThis: window, console, Date, Map, Set, JSON, String, Number, Array, Object, Boolean, RegExp, Promise, structuredClone }), { filename: 'account-storage.js' });
  return {
    storage: window.StockTrackingAccountStorage,
    events,
    switchAccount(nextUid) {
      window.localStorage.setItem(sessionKey, JSON.stringify({ uid: nextUid, account: `${nextUid}@example.com`, expiresAt: Date.now() + 60_000 }));
      window.StockTrackingPreferenceCloud = cloud.adapter(nextUid);
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
assert.deepEqual(Array.from(otherAccount.storage.loadWatchlist([])), ['300750']);
assert.equal(Object.keys(otherAccount.storage.load('301026')).length, 0);

secondBrowser.storage.save('301026', { readIds: [] });
await secondBrowser.storage.flushCloudWrites();
await firstBrowser.storage.sync([]);
assert.deepEqual(Array.from(firstBrowser.storage.load('301026').readIds), []);

firstBrowser.switchAccount('other-user');
await firstBrowser.storage.sync(['300750']);
assert.deepEqual(Array.from(firstBrowser.storage.loadWatchlist([])), ['300750']);
assert.equal(Object.keys(firstBrowser.storage.load('301026')).length, 0);
assert.equal(firstBrowser.storage.getSyncStatus().mode, 'cloud');
assert.ok(firstBrowser.events.some(event => event.type === 'stock-preferences-cloud-change'));
console.log('Stock tracking account cloud sync regression passed.');
