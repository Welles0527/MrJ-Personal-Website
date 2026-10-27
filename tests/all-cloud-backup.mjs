import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
const load = (name, imports = {}, globals = {}) => {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL(`../src/scripts/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: mod.exports, module: mod, require: key => imports[key], TextEncoder, Uint8Array, DataView, Date, Blob, Map, crypto: webcrypto, atob, console, ...globals });
  return mod.exports;
};
const workbook = load('backup-workbook');
const reminder = load('weekly-backup-reminder');
assert.equal(reminder.mondayBackupKey(new Date('2026-10-25T16:00:00Z')), '2026-10-26');
assert.equal(reminder.mondayBackupKey(new Date('2026-10-26T15:59:59Z')), '2026-10-26');
assert.equal(reminder.mondayBackupKey(new Date('2026-10-26T16:00:00Z')), null);
const original = { text: '中😀'.repeat(16000), literal: '=HYPERLINK("bad")', value: '<>&' };
assert.equal(workbook.jsonRows(original).slice(1).map(row => row[1]).join(''), JSON.stringify(original));
let uid = 'owner', fail = '', changed = false, clicks = 0, output, reads = [];
const attachment = Buffer.from('真实附件测试\n'), data = attachment.toString('base64');
const checksum = Buffer.from(await webcrypto.subtle.digest('SHA-256', attachment)).toString('hex');
const session = async () => ({ uid, account: 'test' });
const backup = load('all-cloud-backup', {
  './site-auth': { getCloudSession: session, callCloudFunction: async (_, request) => {
    if (fail === 'health') throw new Error('offline');
    if (request.action === 'chunk-get') return { result: { ok: true, uid, data: fail === 'attachment' ? 'YQ==' : data } };
    return { result: { ok: true, uid, revision: 1, snapshot: { state: { members: [{ name: '云端成员' }], reports: [{fileId:'file1'}] }, files: [{ id: 'file1', name: '原件.txt', type: 'text/plain', size: attachment.length, chunks: [checksum] }] } } };
  } },
  './cloud-backup': { readCloudBackup: async kind => {
    reads.push(kind); if (kind === fail) throw new Error('cloud unavailable');
    if (changed) uid = 'other';
    return { source: 'cloud', kind, accountUid: uid, records: [{ _id: 'owner', title: `cloud-${kind}`, groupStudy: { plans: [{ title: '查经' }] } }] };
  } },
  './backup-workbook': workbook
}, { URL: { createObjectURL: blob => { output = blob; return 'blob:test'; }, revokeObjectURL: () => {} }, setTimeout: () => {}, document: { createElement: () => ({ click: () => clicks++, remove: () => {} }), body: { append: () => {} } } });
await backup.exportAllCloudBackup(() => {});
assert.equal(clicks, 1); assert.equal(reads.length, 6); assert.equal(output.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
const file = path.join(os.tmpdir(), 'magicj-all-cloud-backup-test.xlsx'); fs.writeFileSync(file, Buffer.from(await output.arrayBuffer()));
for (const failure of ['todo', 'funds', 'health', 'attachment']) {
  fail = failure; await assert.rejects(backup.exportAllCloudBackup(() => {})); assert.equal(clicks, 1);
}
fail = ''; changed = true; await assert.rejects(backup.exportAllCloudBackup(() => {}), /账号/); assert.equal(clicks, 1);
console.log('PASS Monday Beijing boundaries, lossless JSON chunks, all cloud sources, attachments, failed-source abort, account-switch abort. XLSX:', file);
