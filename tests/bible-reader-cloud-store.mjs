import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const sourceUrl = new URL('../src/scripts/bible-reader-cloud-store.ts', import.meta.url);
const source = fs.readFileSync(sourceUrl, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    strict: true
  }
}).outputText;
const module = { exports: {} };
const evaluate = new Function('module', 'exports', compiled);
evaluate(module, module.exports);

const { createBibleReaderCloudStore } = module.exports;
const ownerId = 'same-account-uid';
const snapshot = {
  lastRead: { book: 'heb', chapter: 5, verse: 1, updatedAt: '2026-10-07T00:00:00.000Z' },
  bookmarks: [],
  notes: [],
  readVerses: ['heb-5-1'],
  bookStatuses: { heb: 'reading' },
  updatedAt: '2026-10-07T00:00:00.000Z'
};

const calls = [];
let cloudDocument = { ...snapshot, ownerId, account: 'reader@example.com' };
const store = createBibleReaderCloudStore({
  getDocumentRef(uid) {
    calls.push(['doc', uid]);
    return {
      async get() {
        calls.push(['get', uid]);
        return { data: cloudDocument };
      },
      async set(payload) {
        calls.push(['set', uid]);
        cloudDocument = payload;
        return { data: { updated: 1 } };
      }
    };
  }
});

const loaded = await store.load(ownerId);
assert.equal(loaded.lastRead.book, 'heb');
assert.deepEqual(calls.slice(0, 2), [['doc', ownerId], ['get', ownerId]], '读取必须直接访问当前账号文档');

const nextSnapshot = {
  ...snapshot,
  lastRead: { book: 'rev', chapter: 22, verse: 21, updatedAt: '2026-10-07T00:01:00.000Z' },
  updatedAt: '2026-10-07T00:01:00.000Z'
};
await store.save(ownerId, 'reader@example.com', nextSnapshot);
assert.equal(cloudDocument.ownerId, ownerId);
assert.equal(cloudDocument.account, 'reader@example.com');
assert.equal(cloudDocument.lastRead.book, 'rev');
assert.deepEqual(calls.slice(-3), [['doc', ownerId], ['set', ownerId], ['get', ownerId]], '保存后必须从同一账号文档回读验证');

const foreignStore = createBibleReaderCloudStore({
  getDocumentRef() {
    return {
      async get() {
        return { data: { ...snapshot, ownerId: 'another-account' } };
      },
      async set() {
        return { data: {} };
      }
    };
  }
});
await assert.rejects(() => foreignStore.load(ownerId), /账号不一致/);

const readerSource = fs.readFileSync(new URL('../src/scripts/bible-reader.ts', import.meta.url), 'utf8');
assert.match(
  readerSource,
  /syncTimer = window\.setTimeout\(\(\) => \{\s*syncTimer = undefined;/,
  '防抖保存完成后必须释放计时器，后续云端刷新才能继续执行'
);
assert.match(readerSource, /window\.addEventListener\('focus', refreshActiveCloudSession\)/, '重新聚焦页面时必须拉取云端进度');
assert.match(readerSource, /window\.setInterval\(refreshActiveCloudSession, 15_000\)/, '打开页面期间必须定期拉取云端进度');
assert.match(readerSource, /cloudWritesInFlight > 0/, '本地云端写入期间不得用回读结果覆盖当前进度');

console.log('Bible reader cloud-store regression test passed.');

const canonical = { ...snapshot, _id: ownerId, _openid: ownerId, ownerId, bookmarks: [{ id: 'saved-bookmark', updatedAt: snapshot.updatedAt }], extraField: 'keep' };
const historical = { ...snapshot, _id: 'legacy-id', _openid: ownerId, ownerId: 'legacy-id', lastRead: { ...snapshot.lastRead, chapter: 15, updatedAt: '2026-10-09T00:00:00.000Z' }, notes: [{ id: 'legacy-note', text: 'retain', updatedAt: snapshot.updatedAt }], readVerses: ['gen-15-1'], updatedAt: '2026-10-09T00:00:00.000Z' };
const historicalBefore = structuredClone(historical);
const migrationStore = createBibleReaderCloudStore({
  getDocumentRef() {
    return {
      get: async () => ({ data: canonical }),
      set: async () => { throw new Error('E11000 duplicate key'); },
      update: async payload => {
        assert.equal('_id' in payload, false);
        assert.equal('_openid' in payload, false);
        Object.assign(canonical, payload);
        return { updated: 1 };
      }
    };
  },
  getOwnedDocuments: async () => ({ data: [canonical, historical] })
});
const merged = await migrationStore.load(ownerId);
assert.equal(merged.lastRead.chapter, 15);
assert.equal(merged.notes[0].text, 'retain');
assert.equal(merged.bookmarks[0].id, 'saved-bookmark');
assert.deepEqual([...merged.readVerses].sort(), ['gen-15-1', 'heb-5-1']);
await migrationStore.save(ownerId, '49001422@qq.com', merged);
await migrationStore.save(ownerId, '49001422@qq.com', merged);
assert.equal(canonical.extraField, 'keep');
assert.deepEqual(historical, historicalBefore, '历史记录必须完整保留');
await migrationStore.save(ownerId, '49001422@qq.com', { ...merged, notes: [] });
assert.equal((await migrationStore.load(ownerId)).notes.length, 0, '已合并历史记录不能反复恢复用户后续主动删除的内容');
console.log('PASS same-account legacy merge, repeat update, metadata protection, historical document retention');
