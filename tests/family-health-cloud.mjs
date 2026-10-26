import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import '../public/family-health-cloud.js';
const require = createRequire(import.meta.url);
const { createHandler } = require('../cloudfunctions/family-health/index.js');

export function memoryDatabase() {
  let rows = new Map(), queue = Promise.resolve();
  const store = map => ({ collection: () => ({ doc: id => ({
    get: async () => ({ data: map.has(id) ? [structuredClone(map.get(id))] : [] }),
    set: async value => { assert.ok(id.length <= 128); map.set(id, structuredClone(value)); return {}; }
  }) }) });
  return {
    collection: (...args) => store(rows).collection(...args),
    runTransaction: fn => {
      const result = queue.then(async () => { const next = structuredClone(rows); const value = await fn(store(next)); rows = next; return value; });
      queue = result.catch(() => {}); return result;
    },
    snapshot: () => structuredClone(rows)
  };
}
export const emptyState = () => ({ schema: 1, profiles: [], conditions: [], events: [], meds: [], reports: [], notes: [], logs: [], settings: { demo: false } });
export function adapter(db, uid) {
  return { getSession: async () => ({ uid, account: uid }), callCloudFunction: async (_name, event) => ({ result: await createHandler(db, () => ({ uid }))(event) }) };
}
async function test() {
  const db = memoryDatabase(), auth = adapter(db, 'real-account-a'), a = new FamilyHealthCloud(auth, 'real-account-a');
  assert.equal(await a.load(), null);
  const state = emptyState(); state.notes.push({ id: 'n1', title: '真实输入', pid: 'dad' });
  const bytes = new Uint8Array(400000).map((_, i) => i % 251), blob = new Blob([bytes], { type: 'image/png' });
  state.reports.push({ id: 'r1', fileId: 'original', pid: 'dad' });
  await a.save(state, [{ id: 'original', name: '原图.png', blob }]);
  assert.equal(a.revision, 1);
  const b = new FamilyHealthCloud(adapter(db, 'real-account-b'), 'real-account-b');
  assert.equal(await b.load(), null);
  assert.equal(await b.file('original'), undefined);
  const digest = createHash('sha256').update(bytes.slice(0, 192 * 1024)).digest('hex');
  assert.equal((await createHandler(db, () => ({ uid: 'real-account-b' }))({ action: 'chunk-get', hash: digest, uid: 'real-account-a' })).error, 'MISSING_FILE');
  for (const identity of [{}, { uid: 'anonymous', anonymous: true }]) assert.equal((await createHandler(db, () => identity)({ action: 'load' })).error, 'AUTH_REQUIRED');
  const otherDevice = new FamilyHealthCloud(auth, 'real-account-a');
  assert.equal((await otherDevice.load()).notes[0].title, '真实输入');
  const exported = await otherDevice.exportArchive();
  assert.equal(exported.source, 'cloud'); assert.equal(exported.accountUid, 'real-account-a');
  assert.deepEqual(Buffer.from(exported.attachments[0].data, 'base64'), Buffer.from(bytes));
  state.notes[0].title = '第二次真实输入'; await a.save(state);
  assert.equal((await otherDevice.exportArchive()).data.notes[0].title, '第二次真实输入');
  await assert.rejects(otherDevice.save(emptyState()), /其他页面/);
  await assert.rejects(otherDevice.exportArchive(), /未确认保存/);
  assert.equal((await a.exportArchive()).data.notes[0].title, '第二次真实输入');
  assert.equal([...db.snapshot().keys()].filter(k => /_v[12]$/.test(k)).length, 2);
  const rpc = createHandler(db, () => ({ uid: 'idempotent' }));
  const event = { action: 'save', expectedRevision: 0, operationId: randomUUID(), snapshot: { state: emptyState(), files: [] } };
  assert.equal((await rpc(event)).revision, 1); assert.equal((await rpc(event)).revision, 1);
  const missing = emptyState(); missing.meds.push({ photoFileId: 'lost' });
  assert.equal((await rpc({ ...event, operationId: randomUUID(), expectedRevision: 1, snapshot: { state: missing, files: [] } })).error, 'MISSING_FILE');
  const offline = new FamilyHealthCloud({ getSession: auth.getSession, callCloudFunction: async () => { throw Error('offline'); } }, 'real-account-a');
  await assert.rejects(offline.load(), /offline/); await assert.rejects(offline.exportArchive(), /offline/);
  const switched = new FamilyHealthCloud({ ...auth, getSession: async () => ({ uid: 'other' }) }, 'real-account-a');
  await assert.rejects(switched.load(), /账号已改变/);
  const savedThenDisconnected = new FamilyHealthCloud({ ...auth, callCloudFunction: async (name, data) => { const result = await auth.callCloudFunction(name, data); if (data.action === 'save') throw Error('reply lost'); return result; } }, 'real-account-a');
  await savedThenDisconnected.load(); state.notes[0].title = '响应丢失但保存成功';
  await assert.rejects(savedThenDisconnected.save(state), /reply lost/);
  await assert.rejects(savedThenDisconnected.exportArchive(), /未确认保存/);
  assert.equal((await a.exportArchive()).data.notes[0].title, '响应丢失但保存成功');
  console.log('PASS account isolation, anonymous rejection, immutable history, CAS, idempotency, attachment integrity, fresh export, offline and lost acknowledgement');
}
if (process.argv[1]?.endsWith('family-health-cloud.mjs')) await test();
