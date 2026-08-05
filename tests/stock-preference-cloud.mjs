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

function createClient(uid, database) {
  const window = {
    StockTrackingSharedAuth: {
      getRememberedSession: () => ({ uid, account: `${uid}@example.com` }),
      getCloudSession: async () => ({ uid, account: `${uid}@example.com` }),
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
await firstClient.saveScope('301026', { cost: 18.5, readOverrides: ['message-1'] });
const sameAccountSnapshot = await secondClient.load();
assert.deepEqual(Array.from(sameAccountSnapshot.watchlist.codes), ['301026', '688633']);
assert.equal(sameAccountSnapshot.scopes['301026'].cost, 18.5);
assert.deepEqual(Array.from(sameAccountSnapshot.scopes['301026'].readOverrides), ['message-1']);
assert.equal(watchedSnapshot.scopes['301026'].cost, 18.5);

const isolatedSnapshot = await otherAccount.load();
assert.equal(isolatedSnapshot.watchlist, null);
assert.equal(Object.keys(isolatedSnapshot.scopes).length, 0);
assert.ok(database.collectionNames.every(name => name === 'officialWebsiteStockTrackingPreferences'));
watcher.close();
console.log('Stock preference CloudBase adapter regression passed.');
