import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const sourceUrl = new URL('../src/scripts/bible-reader-account-state.ts', import.meta.url);
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

const { accountStorageKey, resolveAccountSnapshot } = module.exports;
const baseState = {
  lastRead: { book: 'gen', chapter: 1, updatedAt: '2026-01-01T00:00:00.000Z' },
  bookmarks: [],
  notes: [],
  readVerses: [],
  bookStatuses: {},
  updatedAt: '2026-01-01T00:00:00.000Z'
};

assert.notEqual(
  accountStorageKey('mywebsite.bible-reader.v1', 'user-a'),
  accountStorageKey('mywebsite.bible-reader.v1', 'user-b'),
  '不同账号必须使用不同的浏览器缓存键'
);

const cloudState = {
  ...baseState,
  lastRead: { book: 'heb', chapter: 5, verse: 1, updatedAt: '2026-02-01T00:00:00.000Z' },
  readVerses: ['heb-5-1'],
  bookStatuses: { heb: 'reading' },
  updatedAt: '2026-02-01T00:00:00.000Z'
};
const foreignBrowserState = {
  ...baseState,
  lastRead: { book: 'rev', chapter: 22, updatedAt: '2026-03-01T00:00:00.000Z' },
  readVerses: ['rev-22-21'],
  bookStatuses: { rev: 'read' },
  updatedAt: '2026-03-01T00:00:00.000Z'
};

const resolvedCloud = resolveAccountSnapshot({
  uid: 'user-a',
  cloud: cloudState,
  accountCache: null,
  legacy: foreignBrowserState,
  legacyOwner: 'user-b',
  fallback: baseState
});
assert.deepEqual(resolvedCloud.snapshot.readVerses, ['heb-5-1']);
assert.deepEqual(resolvedCloud.snapshot.bookStatuses, { heb: 'reading' });
assert.equal(resolvedCloud.snapshot.lastRead.book, 'heb');
assert.equal(resolvedCloud.shouldWriteCloud, false);

const firstLogin = resolveAccountSnapshot({
  uid: 'user-a',
  cloud: null,
  accountCache: null,
  legacy: foreignBrowserState,
  legacyOwner: null,
  fallback: baseState
});
assert.equal(firstLogin.migratedLegacy, true);
assert.equal(firstLogin.shouldWriteCloud, true);
assert.equal(firstLogin.snapshot.lastRead.book, 'rev');

const otherAccount = resolveAccountSnapshot({
  uid: 'user-b',
  cloud: null,
  accountCache: null,
  legacy: foreignBrowserState,
  legacyOwner: 'user-a',
  fallback: baseState
});
assert.equal(otherAccount.migratedLegacy, false);
assert.equal(otherAccount.snapshot.lastRead.book, 'gen');

const legacyCloud = { ...cloudState, bookStatuses: undefined };
const sameOwnerMigration = resolveAccountSnapshot({
  uid: 'user-a',
  cloud: legacyCloud,
  accountCache: null,
  legacy: foreignBrowserState,
  legacyOwner: 'user-a',
  fallback: baseState
});
assert.deepEqual(sameOwnerMigration.snapshot.bookStatuses, { rev: 'read' });
assert.deepEqual(sameOwnerMigration.snapshot.readVerses, ['heb-5-1']);
assert.equal(sameOwnerMigration.shouldWriteCloud, true);

console.log('Bible reader account-sync regression test passed.');
