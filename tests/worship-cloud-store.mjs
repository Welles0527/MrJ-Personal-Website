import assert from 'node:assert/strict';
import { createWorshipCloudStore } from '../src/scripts/worship-cloud-store.js';

class MemoryStorage {
  constructor(entries = {}) {
    this.entries = new Map(Object.entries(entries));
  }

  getItem(key) {
    return this.entries.has(key) ? this.entries.get(key) : null;
  }

  setItem(key, value) {
    this.entries.set(key, String(value));
  }
}

function createCloud(initial = {}) {
  let document = structuredClone(initial);
  let failSet = false;
  let readError = null;
  const queuedSetFailures = [];

  return {
    ref: {
      async get() {
        if (readError) return { error: readError, data: [structuredClone(document)] };
        return { data: [structuredClone(document)] };
      },
      async set(value) {
        const queuedFailure = queuedSetFailures.shift();
        if (queuedFailure) throw queuedFailure;
        if (failSet) throw new Error('cloud unavailable');
        document = structuredClone(value);
        return { error: null };
      },
    },
    get document() {
      return structuredClone(document);
    },
    setFailSet(value) {
      failSet = value;
    },
    setReadError(value) {
      readError = value;
    },
    queueSetFailure(value) {
      queuedSetFailures.push(value);
    },
  };
}

function createStore({ cloud, storage, now }) {
  const identity = { uid: 'user-1', account: 'owner@example.com' };
  return createWorshipCloudStore({
    getIdentity: async () => identity,
    getIdentitySnapshot: () => identity,
    getDocumentRef: () => cloud.ref,
    storage,
    now,
  });
}

async function testOfflineWriteReplaysBeforeStaleCloud() {
  const cloud = createCloud({
    ownerId: 'user-1',
    favorites: ['cloud-old'],
    fieldUpdatedAt: { favorites: '2026-08-09T08:00:00.000Z' },
  });
  const storage = new MemoryStorage();
  const store = createStore({ cloud, storage, now: () => '2026-08-10T01:00:00.000Z' });

  cloud.setFailSet(true);
  await store.save('favorites', ['local-new']);
  assert.deepEqual(JSON.parse(storage.getItem('worship:favorites')), ['local-new']);
  assert.equal(JSON.parse(storage.getItem('worship-meta:favorites')).dirty, true);

  cloud.setFailSet(false);
  assert.deepEqual(await store.load('favorites', []), ['local-new']);
  assert.deepEqual(cloud.document.favorites, ['local-new']);
  assert.equal(JSON.parse(storage.getItem('worship-meta:favorites')).dirty, false);
}

async function testLegacyObjectMigratesInsteadOfBeingIgnored() {
  const localSettings = { categories: { songA: 'new-category' }, lyrics: {}, deleted: [] };
  const cloud = createCloud({
    ownerId: 'user-1',
    librarySettings: { categories: { songA: 'old-category' }, deleted: [] },
  });
  const storage = new MemoryStorage({
    'worship:librarySettings': JSON.stringify(localSettings),
  });
  const store = createStore({ cloud, storage, now: () => '2026-08-10T01:05:00.000Z' });

  assert.deepEqual(await store.load('librarySettings', {}), localSettings);
  assert.deepEqual(cloud.document.librarySettings, localSettings);
  assert.equal(JSON.parse(storage.getItem('worship-meta:librarySettings')).dirty, false);
}

async function testCloudReadErrorsDoNotReplaceLocalData() {
  const cloud = createCloud({ favorites: ['cloud-old'] });
  cloud.setReadError(new Error('permission denied'));
  const storage = new MemoryStorage({
    'worship:favorites': JSON.stringify(['local-safe']),
    'worship-meta:favorites': JSON.stringify({ updatedAt: '2026-08-10T00:00:00.000Z', dirty: true }),
  });
  const store = createStore({ cloud, storage, now: () => '2026-08-10T01:10:00.000Z' });

  assert.deepEqual(await store.load('favorites', []), ['local-safe']);
  assert.equal(JSON.parse(storage.getItem('worship-meta:favorites')).dirty, true);
}

async function testLaterFailedSaveCannotBeClearedByEarlierSuccess() {
  let tick = 0;
  const cloud = createCloud({ favorites: ['cloud-old'] });
  const storage = new MemoryStorage();
  const store = createStore({
    cloud,
    storage,
    now: () => `2026-08-10T01:20:0${tick++}.000Z`,
  });
  cloud.queueSetFailure(null);
  cloud.queueSetFailure(new Error('second save failed'));

  await Promise.all([
    store.save('favorites', ['first-save']),
    store.save('favorites', ['second-save']),
  ]);

  assert.deepEqual(JSON.parse(storage.getItem('worship:favorites')), ['second-save']);
  assert.equal(JSON.parse(storage.getItem('worship-meta:favorites')).dirty, true);
  assert.deepEqual(cloud.document.favorites, ['first-save']);

  assert.deepEqual(await store.load('favorites', []), ['second-save']);
  assert.deepEqual(cloud.document.favorites, ['second-save']);
  assert.equal(JSON.parse(storage.getItem('worship-meta:favorites')).dirty, false);
}

await testOfflineWriteReplaysBeforeStaleCloud();
await testLegacyObjectMigratesInsteadOfBeingIgnored();
await testCloudReadErrorsDoNotReplaceLocalData();
await testLaterFailedSaveCannotBeClearedByEarlierSuccess();
console.log('worship cloud-store regression tests passed');
