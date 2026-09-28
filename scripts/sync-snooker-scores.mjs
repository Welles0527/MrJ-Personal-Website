// Reads the same public tournament feed used by the WST website.
// Run once: node scripts/sync-snooker-scores.mjs
// Keep running: node scripts/sync-snooker-scores.mjs --watch
import { readFile, writeFile, rename, unlink, open, stat } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const directory = fileURLToPath(new URL('../public/snooker-calendar/', import.meta.url));
const endpoint = 'https://tournaments.snooker.web.gc.wstservices.co.uk/v2/';
const prefix = 'window.CUE_LIVE_SCORES = ';
export const intervalMs = 5 * 60 * 1000;

export function readEvents(html) {
  return [...html.matchAll(/^add\('([^']+)','[^']+','([^']+)','(\d{2}-\d{2})','(\d{2}-\d{2})'/gm)]
    .map(([, id, name, start, end]) => ({ id, name, start: `2026-${start}`, end: `2026-${end}` }));
}

export function findTournament(event, tournaments) {
  const normalize = name => name.toLowerCase().replace(/world snooker championship/g, 'world championship')
    .replace(/^the /, '').replace(/\b20\d{2}\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const wanted = normalize(event.name);
  const candidates = tournaments.filter(item => {
    const a = item.attributes;
    return normalize(a.name).endsWith(wanted) &&
      Math.abs(Date.parse(a.customStartDate || a.startDate) - Date.parse(event.start)) <= 3 * 86400000;
  });
  return candidates.length === 1 ? candidates[0] : null;
}

export function normalizeTournament(id, tournament, fetchedAt) {
  const a = tournament?.data?.attributes;
  if (!a || !Array.isArray(a.matches)) throw new Error('WST tournament response has no matches array');
  const statusMap = { Scheduled: 'upcoming', Live: 'live', Completed: 'ended',
    Postponed: 'postponed', Suspended: 'suspended', Cancelled: 'cancelled', Abandoned: 'cancelled' };
  const playerName = (player, fallback) => player
    ? [player.customFirstName || player.firstName, player.customSurname || player.surname].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    : (fallback || 'To be decided').replace(/\s+/g, ' ').trim();
  const matches = a.matches.filter(m => m.published !== false).map(m => {
    if (!m.matchID || !m.round || !statusMap[m.status]) throw new Error(`Unknown WST match status/shape: ${m.status}`);
    const names = (m.name || '').split(' vs ');
    const scores = [m.homePlayerScore, m.awayPlayerScore];
    if (scores.some(n => n !== null && (!Number.isInteger(n) || n < 0))) throw new Error('Invalid WST score');
    if (['Live', 'Completed'].includes(m.status) && scores.some(n => n === null)) throw new Error('Missing WST score');
    const startsAt = m.startDateTime ? m.startDateTime.replace(' ', 'T') + 'Z' : null;
    if (startsAt && !Number.isFinite(Date.parse(startsAt))) throw new Error('Invalid WST start time');
    return { id: m.matchID, round: m.round, number: m.fixtureNumber,
      home: playerName(m.homePlayer, names[0]), away: playerName(m.awayPlayer, names[1]),
      homeScore: scores[0], awayScore: scores[1], startsAt,
      status: statusMap[m.status], sourceStatus: m.status, sourceDetail: m.statusMeta || null,
      source: `https://www.wst.tv/match-centre/${m.matchID}` };
  }).sort((x, y) => (x.startsAt || '9999').localeCompare(y.startsAt || '9999') || x.number - y.number);
  const final = matches.find(m => /^(the )?final$/i.test(m.round) && m.status === 'ended');
  const status = a.winner || final ? 'ended'
    : matches.some(m => ['live', 'ended', 'suspended'].includes(m.status)) ? 'live' : 'upcoming';
  return { id, name: a.name, status, fetchedAt, matches, winner: a.winner || (final
    ? final.homeScore > final.awayScore ? final.home : final.away : null),
    source: `https://www.wst.tv/matches/${tournament.data.id}` };
}

async function getJson(url) {
  const target = new URL(url);
  if (target.origin !== new URL(endpoint).origin) throw new Error('Unexpected WST pagination host');
  const response = await fetch(target, { signal: AbortSignal.timeout(25000),
    headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`WST HTTP ${response.status}`);
  return response.json();
}

async function readPrevious(destination) {
  try {
    const content = await readFile(destination, 'utf8');
    if (!content.startsWith(prefix)) throw new Error('Invalid live score file');
    return JSON.parse(content.slice(prefix.length).trim().replace(/;$/, ''));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { version: 1, intervalMs, events: {}, failures: {} };
  }
}

export async function synchronize({ now = new Date(), request = getJson, root = directory } = {}) {
  const destination = path.join(root, 'live-scores.js');
  const lockPath = path.join(root, '.live-scores.lock');
  let lock;
  try {
    // A killed run must not block all subsequent scheduled runs.
    const oldLock = await stat(lockPath).catch(() => null);
    if (oldLock && Date.now() - oldLock.mtimeMs > 10 * 60 * 1000) await unlink(lockPath);
    lock = await open(lockPath, 'wx');
  } catch (error) {
    if (error.code === 'EEXIST') return { skipped: 'sync already running' };
    throw error;
  }
  try {
    const previous = await readPrevious(destination);
    const next = { ...previous, intervalMs, checkedAt: now.toISOString(), failures: {} };
    next.events = { ...previous.events };
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(now);
    const cutoff = new Date(Date.parse(today) - 2 * 86400000).toISOString().slice(0, 10);
    const horizon = new Date(Date.parse(today) + 30 * 86400000).toISOString().slice(0, 10);
    const events = readEvents(await readFile(path.join(root, 'index.html'), 'utf8'))
      .filter(e => e.end >= cutoff && e.start <= horizon);
    const tournaments = [];
    let url = endpoint;
    try {
      for (let page = 0; url && page < 10; page++) {
        const response = await request(url);
        if (!Array.isArray(response.data)) throw new Error('Invalid WST tournament list');
        tournaments.push(...response.data);
        url = response.links?.next;
      }
      if (url) throw new Error('Incomplete WST tournament list');
      for (const event of events) {
        try {
          const tournament = findTournament(event, tournaments);
          if (!tournament) throw new Error('WST 尚无可匹配的赛事数据');
          const result = normalizeTournament(event.id, await request(endpoint + tournament.id), now.toISOString());
          if (!result.matches.length) throw new Error('WST 尚未公布场次');
          if (previous.events[event.id]?.matches.length > result.matches.length) {
            throw new Error('WST 返回场次数量减少，保留上次完整记录');
          }
          next.events[event.id] = result;
        } catch (error) {
          next.failures[event.id] = { checkedAt: now.toISOString(), message: error.message };
        }
      }
    } catch (error) {
      next.failures.source = { checkedAt: now.toISOString(), message: error.message };
    }
    // Escape HTML delimiters so the snapshot can also be safely embedded in an export.
    const json = JSON.stringify(next).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    const temporary = destination + '.tmp';
    await writeFile(temporary, prefix + json + ';\n', 'utf8');
    await rename(temporary, destination);
    const updated = Object.values(next.events).filter(e => e.fetchedAt === now.toISOString());
    return { updated: updated.map(e => ({ id: e.id, matches: e.matches.length,
      live: e.matches.filter(m => m.status === 'live').length,
      completed: e.matches.filter(m => m.status === 'ended').length })), failures: next.failures };
  } finally {
    await lock.close();
    await unlink(lockPath).catch(() => {});
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const run = async () => {
    try {
      const result = await synchronize();
      console.log(JSON.stringify({ at: new Date().toISOString(), ...result }));
      if (result.failures?.source) process.exitCode = 1;
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  };
  await run();
  if (process.argv.includes('--watch')) setInterval(run, intervalMs);
}
