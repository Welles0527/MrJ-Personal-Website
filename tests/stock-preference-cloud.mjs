import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(testDir, '..', 'public', 'stock-tracking', 'stock-preference-cloud.js');
assert.equal(fs.existsSync(sourcePath), true, 'stock-preference-cloud.js should exist');
const source = fs.readFileSync(sourcePath, 'utf8');

function createDatabase() {
  const records = new Map();
  const watchers = new Set();
  const collectionNames = [];
  const publish = () => {
    const docs = [...records.values()].map(record => structuredClone(record));
    for (const watcher of watchers) watcher({ docs });
  };
  return {
    collectionNames,
    collection(name) {
      collectionNames.push(name);
      return {
        where(query) {
          return {
            limit() {
              return {
                async get() {
                  return { data: [...records.values()].filter(record => record.ownerId === query.ownerId).map(record => structuredClone(record)) };
                },
                watch({ onChange }) {
                  const listener = snapshot => onChange({ docs: snapshot.docs.filter(record => record.ownerId === query.ownerId) });
                  watchers.add(listener);
                  listener({ docs: [...records.values()] });
                  return { close: () => watchers.delete(listener) };
                }
              };
            }
          };
        },
        doc(id) {
          return {
            async get() { return { data: records.has(id) ? [structuredClone(records.get(id))] : [] }; },
            async set(payload) {
              records.set(id, { _id: id, ...structuredClone(payload) });
              publish();
              return { updated: 1, requestId: `request-${id}` };
            }
          };
        }
      };
    }
  };
}

function createClient(uid, database, getSession = async () => ({ uid, account: `${uid}@example.com` })) {
  const window = {
    StockTrackingSharedAuth: {
      getRememberedSession: () => ({ uid, account: `${uid}@example.com` }),
      getCloudSession: getSession,
      getCloudDb: () => database
    },
    dispatchEvent() {},
    CustomEvent: class CustomEvent {}
  };
  window.window = window;
  vm.runInContext(source, vm.createContext({ window, globalThis: window, console, Date, Map, Set, JSON, String, Number, Array, Object, Boolean, RegExp, Promise, structuredClone, Math }), { filename: 'stock-preference-cloud.js' });
  return window.StockTrackingPreferenceCloud;
}

const database = createDatabase();
const firstClient = createClient('same-user', database);
const secondClient = createClient('same-user', database);
const otherAccount = createClient('other-user', database);
let watchedSnapshot = null;
const watcher = secondClient.watch(snapshot => { watchedSnapshot = snapshot; });

await firstClient.saveWatchlist(['301026', '688633']);
await firstClient.saveScope('301026', {
  cost: 18.5,
  readStateVersion: 2,
  readThroughAt: '2026-08-08T10:00:00+08:00',
  readIds: ['message-1'],
  unreadIds: ['message-2'],
  readOverrides: []
});
const sameAccountSnapshot = await secondClient.load();
assert.deepEqual(Array.from(sameAccountSnapshot.watchlist.codes), ['301026', '688633']);
assert.equal(sameAccountSnapshot.scopes['301026'].cost, 18.5);
assert.equal(sameAccountSnapshot.scopes['301026'].readStateVersion, 2);
assert.equal(sameAccountSnapshot.scopes['301026'].readThroughAt, '2026-08-08T10:00:00+08:00');
assert.deepEqual(Array.from(sameAccountSnapshot.scopes['301026'].readIds), ['message-1']);
assert.deepEqual(Array.from(sameAccountSnapshot.scopes['301026'].unreadIds), ['message-2']);
assert.equal(watchedSnapshot.scopes['301026'].cost, 18.5);

const isolatedSnapshot = await otherAccount.load();
assert.equal(isolatedSnapshot.watchlist, null);
assert.equal(Object.keys(isolatedSnapshot.scopes).length, 0);
assert.ok(database.collectionNames.every(name => name === 'officialWebsiteStockTrackingPreferences'));
watcher.close();

// A remembered identity is a display hint, never an authenticated empty account.
const expired = createClient('same-user', database, async () => null);
await assert.rejects(expired.load(), error => error.code === 'SITE_AUTH_REQUIRED');
await assert.rejects(expired.saveWatchlist(['603507']), error => error.code === 'SITE_AUTH_REQUIRED');
await new Promise((resolve, reject) => {
  const failedWatch = expired.watch(() => reject(new Error('expired session published a snapshot')), error => {
    try { assert.equal(error.code, 'SITE_AUTH_REQUIRED'); failedWatch.close(); resolve(); } catch (failure) { reject(failure); }
  });
});
function accountKey(uid) {
  let hash = 2166136261;
  for (const character of uid) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `account-${(hash >>> 0).toString(36)}`;
}
let releaseSession;
const switched = createClient('same-user', database, () => new Promise(resolve => { releaseSession = resolve; }));
const oldAccountWrite = switched.saveWatchlist(['603507'], accountKey('same-user'));
releaseSession({ uid: 'other-user', account: 'other@example.test' });
await assert.rejects(oldAccountWrite, error => error.code === 'STOCK_ACCOUNT_CHANGED');
assert.equal((await otherAccount.load()).watchlist, null, 'an old account write must never reach the new account');
await assert.rejects(otherAccount.load(accountKey('same-user')), error => error.code === 'STOCK_ACCOUNT_CHANGED');
console.log('Stock preference CloudBase adapter regression passed.');
