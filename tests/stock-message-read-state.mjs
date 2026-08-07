import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { globalThis: {}, module: { exports: {} } };
context.globalThis = context;
vm.runInNewContext(fs.readFileSync('public/stock-tracking/message-read-state.js', 'utf8'), context);
const readState = context.module.exports;

const legacy = readState.createState({ readOverrides: ['legacy-read'] });
assert.equal(readState.isUnread({ id: 'legacy-read', unread: true, publishedAt: '2026-08-08T08:00:00+08:00' }, legacy), false);
assert.equal(readState.isUnread({ id: 'backfilled-old', unread: true, publishedAt: '2026-07-01T08:00:00+08:00' }, legacy), false);
assert.equal(readState.isUnread({ id: 'today-new', unread: true, publishedAt: '2026-08-08T08:00:00+08:00' }, legacy), true);

const current = readState.createState({ readStateVersion: 2, readThroughAt: '2026-08-08T00:00:00+08:00' });
const todayMessage = { id: 'today-toggle', unread: true, publishedAt: '2026-08-08T09:00:00+08:00' };
readState.toggle(todayMessage, current);
assert.equal(readState.isUnread(todayMessage, current), false);
readState.toggle(todayMessage, current);
assert.equal(readState.isUnread(todayMessage, current), true);
readState.markAll([todayMessage], current, '2026-08-08T10:00:00+08:00');
assert.equal(readState.isUnread(todayMessage, current), false);
assert.equal(readState.isUnread({ id: 'late-backfill', unread: true, publishedAt: '2026-08-07T12:00:00+08:00' }, current), false);

const serialized = readState.serialize(current);
assert.equal(serialized.readStateVersion, 2);
assert.equal(serialized.readThroughAt, '2026-08-08T10:00:00+08:00');
assert.deepEqual(Array.from(serialized.readIds), []);
assert.deepEqual(Array.from(serialized.unreadIds), []);

console.log('Stock message read-state migration regression passed.');
