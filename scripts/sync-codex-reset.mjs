import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'public/super-calendar/codex-reset.json');
const response = await fetch('https://willcodexreset.com/api/reset-radar', { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
const result = await response.json();
const data = result.data;
if (result.code !== 0 || !Array.isArray(data?.events) || !Array.isArray(data.timeline) || !Number.isFinite(data.probability48h)) throw new Error('Invalid source payload; preserving last snapshot');
const day = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
const events = [...new Map(data.events.filter(e => e.kind === 'reset' && Number.isFinite(Date.parse(e.occurredAt)) && day(e.occurredAt) >= '2026-06-01').map(e => [e.id, { ...e, resetType: e.resetType || (e.title === 'Direct usage reset' ? 'usage' : 'unknown'), date: day(e.occurredAt) }])).values()].sort((a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt));
if (!events.length || events.some(e => !['usage', 'banked'].includes(e.resetType))) throw new Error('Missing or unknown reset records; preserving last snapshot');
let previous;
try { previous = JSON.parse(await readFile(target, 'utf8')); } catch {}
if (previous && (Date.parse(data.updatedAt) < Date.parse(previous.sourceUpdatedAt) || previous.events.some(e => !events.some(next => next.id === e.id)))) throw new Error('Source regressed; preserving last snapshot for review');
if (!Array.isArray(data.tiboPosts) || !Array.isArray(data.tiboRelevantPosts)) throw new Error('Missing Tibo feeds; preserving last snapshot');
const latestFactors = data.events.filter(e => e.kind !== 'tibo' && Number.isFinite(Date.parse(e.occurredAt))).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 20);
const snapshot = { latestFactors, tiboPosts: data.tiboPosts, tiboRelevantPosts: data.tiboRelevantPosts, source: 'https://willcodexreset.com/zh', syncedAt: new Date().toISOString(), sourceUpdatedAt: data.updatedAt, timeZone: 'Asia/Shanghai', startDate: '2026-06-01', probability24h: data.probability24h, probability48h: data.probability48h, events, timeline: data.timeline.filter(p => Number.isFinite(Date.parse(p.time)) && Number.isFinite(p.probability48h)), signals: data.events.filter(e => e.kind !== 'reset' && Number.isFinite(Date.parse(e.occurredAt)) && day(e.occurredAt) >= '2026-06-01') };
await mkdir(dirname(target), { recursive: true });
await writeFile(target + '.tmp', JSON.stringify(snapshot), 'utf8');
await rename(target + '.tmp', target);
console.log(`Synced ${events.length} reset records, ${snapshot.timeline.length} trend points; source ${data.updatedAt}`);
