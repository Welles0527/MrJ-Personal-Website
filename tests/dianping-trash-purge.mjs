import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/templates/dianping-favorites.html', import.meta.url), 'utf8');
const purge = source.match(/^function purgeFavorites\(ids\).*$/m)?.[0];
const empty = source.match(/^function emptyTrash\(\).*$/m)?.[0];
assert.ok(purge && empty, 'trash actions must exist');

function fixture(confirmed = true) {
  const updates = [];
  const context = {
    items: [{ id: 'trashed', name: '待删除', n: 1 }, { id: 'active', name: '保留', n: 2 }],
    trash: { trashed: 123 }, deleted: {}, positions: { trashed: { lat: 1 } },
    boardNotes: { trashed: '备注' }, arranged: { trashed: true },
    categoryResearch: { trashed: { category: '美食' } }, savedEdits: { trashed: { status: '已去' } },
    shopLocations: { trashed: [1, 2] }, baiduShopLocations: { trashed: [3, 4] },
    dianpingScores: { trashed: '4.5' }, boardSelection: new Set(['trashed']),
    boardAddedFavorites: [{ id: 'trashed' }], trashKey: 'trash',
    window: { confirm: () => confirmed }, accountStorage: { setItem: (...args) => updates.push(args) },
    $: () => ({ textContent: '' }), closeDetails() {}, render() {}, notify() {}
  };
  vm.runInNewContext(`${purge}\n${empty}`, context);
  return { context, updates };
}

const single = fixture();
single.context.purgeFavorites(['trashed', 'active']);
assert.deepEqual(single.context.items.map(item => item.id), ['active'], 'active favorites must survive');
for (const key of ['trash', 'positions', 'boardNotes', 'arranged', 'categoryResearch', 'savedEdits', 'shopLocations', 'baiduShopLocations', 'dianpingScores']) {
  assert.equal(single.context[key].trashed, undefined, `${key} must drop deleted shop data`);
}
assert.equal(single.context.boardAddedFavorites.length, 0);
assert.equal(single.context.boardSelection.size, 0);
assert.equal(single.updates.length, 1, 'account snapshot must be queued once');

const cancelled = fixture(false);
cancelled.context.emptyTrash();
assert.equal(cancelled.context.items.length, 2, 'cancelling must preserve favorites');
assert.equal(cancelled.updates.length, 0, 'cancelling must not queue a save');

const all = fixture();
all.context.items.push({ id: 'deleted', name: '旧记录', n: 3 });
all.context.deleted.deleted = true;
all.context.emptyTrash();
assert.deepEqual(all.context.items.map(item => item.id), ['active'], 'emptying must remove every trash item');
assert.equal(all.updates.length, 1);

console.log('Dianping trash purge regression test passed.');
