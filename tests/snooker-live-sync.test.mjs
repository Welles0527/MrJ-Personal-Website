import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readEvents, findTournament, normalizeTournament, synchronize } from '../scripts/sync-snooker-scores.mjs';

const now = new Date('2026-09-28T09:00:00Z');
const event = { id: 'shenzhen', name: 'Shenzhen Open', start: '2026-09-28', end: '2026-10-04' };
const entry = { id: 'official-id', attributes: { name: 'Shenzhen Open 2026', startDate: event.start } };
const match = (id, status, overrides = {}) => ({ matchID: id, name: 'One vs Two', round: 'Round 2 (Held Over)',
  status, homePlayerScore: 0, awayPlayerScore: 0, fixtureNumber: 1,
  startDateTime: '2026-09-28 01:30:00', ...overrides });
const payload = matches => ({ data: { id: entry.id, attributes: { ...entry.attributes, matches } } });

test('uses official status; an elapsed scheduled time does not imply the match started', () => {
  const data = normalizeTournament(event.id, payload([
    match('scheduled', 'Scheduled'), match('live', 'Live', { homePlayerScore: 2, awayPlayerScore: 2 }),
    match('complete', 'Completed', { homePlayerScore: 5, awayPlayerScore: 2 })
  ]), now.toISOString());
  assert.deepEqual(data.matches.map(m => m.status), ['upcoming', 'live', 'ended']);
  assert.equal(data.matches[0].startsAt, '2026-09-28T01:30:00Z');
  assert.equal(data.status, 'live');
  assert.equal(normalizeTournament(event.id, payload([match('early-round', 'Completed')]), now.toISOString()).status, 'live');
});

test('final completion ends the tournament and records the winner', () => {
  const data = normalizeTournament(event.id, payload([match('final', 'Completed', {
    round: 'Final', homePlayerScore: 10, awayPlayerScore: 8
  })]), now.toISOString());
  assert.equal(data.status, 'ended');
  assert.equal(data.winner, 'One');
  assert.throws(() => normalizeTournament(event.id, payload([match('bad', 'Unexpected')]), now.toISOString()));
});

test('matches event names and dates without mixing qualifiers or different years', () => {
  assert.equal(findTournament(event, [entry])?.id, entry.id);
  assert.equal(findTournament(event, [{ ...entry, attributes: { ...entry.attributes, name: 'Shenzhen Open 2026 Qualifiers' } }]), null);
  assert.equal(findTournament(event, [{ ...entry, attributes: { ...entry.attributes, startDate: '2025-09-28' } }]), null);
  assert.equal(findTournament(event, [entry, entry]), null);
  assert.deepEqual(readEvents("add('shenzhen','深圳公开赛','Shenzhen Open','09-28','10-04','ranking');"), [event]);
});

test('follows list pagination and preserves last valid scores and timestamp after upstream failure', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'cue-sync-test-'));
  try {
    await writeFile(path.join(root, 'index.html'), "add('shenzhen','深圳公开赛','Shenzhen Open','09-28','10-04','ranking');");
    const request = async url => url.endsWith('official-id') ? payload([match('m1', 'Live')])
      : url.endsWith('page=2') ? { data: [entry] } : { data: [], links: { next: 'https://example.test/page=2' } };
    assert.equal((await synchronize({ now, root, request })).updated[0].matches, 1);
    const read = async () => JSON.parse((await readFile(path.join(root, 'live-scores.js'), 'utf8'))
      .replace('window.CUE_LIVE_SCORES = ', '').trim().replace(/;$/, ''));
    const valid = await read();
    await synchronize({ now: new Date(now.getTime() + 300000), root, request: async () => { throw new Error('HTTP 503'); } });
    const failed = await read();
    assert.deepEqual(failed.events, valid.events);
    assert.equal(failed.failures.source.message, 'HTTP 503');
    await synchronize({ now: new Date(now.getTime() + 600000), root,
      request: async url => url.endsWith('official-id') ? payload([]) : { data: [entry] } });
    assert.deepEqual((await read()).events, valid.events);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
