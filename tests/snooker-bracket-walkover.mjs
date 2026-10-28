import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/snooker-calendar/live-updates.js', import.meta.url), 'utf8');
const drawCode = source.slice(source.indexOf('  const draw = '), source.indexOf('  inlineBracket = '));
const context = vm.createContext({
  knockoutRound: name => /^Round [3-9]|Quarter|Semi|Final/.test(name),
  bracketCenter: (round, slot) => (slot + .5) * 76 * 2 ** round,
  escape: value => String(value ?? ''), player: name => name, roundName: name => name,
  color: () => '#99ff44', status: () => 'ended', time: value => value,
});
vm.runInContext(`${drawCode}\nglobalThis.renderDraw = draw;`, context);
const match = (number, round, home, away, homeScore = 5, awayScore = 2) => ({
  number, round, home, away, homeScore, awayScore, status: 'ended',
});
const tournament = () => ({ source: 'https://www.wst.tv/matches/07497d0d-1558-408c-82d8-2c42f2876007', matches: [
  match(30, 'Round 3', 'Si Jiahui', 'Gary Wilson'),
  match(41, 'Round 4', 'Judd Trump', 'Si Jiahui'),
] });
const data = tournament();
const before = JSON.stringify(data);
const html = context.renderDraw({ id: 'shenzhen' }, data);
assert.match(html, /Anthony McGill/);
assert.match(html, /退赛/);
assert.match(html, /晋级/);
assert.match(html, /anthony-mcgill-withdraws-from-shenzhen-open/);
assert.doesNotMatch(html, /data-missing-result/);
assert.match(html, /bracket-player won[^>]*><span>Judd Trump/);
assert.equal(JSON.stringify(data), before, 'rendering must preserve synchronized data');

const published = tournament();
published.matches.push(match(29, 'Round 3', 'Judd Trump', 'Anthony McGill', 5, 1));
const official = context.renderDraw({ id: 'shenzhen' }, published);
assert.doesNotMatch(official, /退赛|anthony-mcgill-withdraws/);
assert.match(official, /Anthony McGill<\/span><b>1/);
assert.match(context.renderDraw({ id: 'another-event' }, tournament()), /data-missing-result/);
const anotherYear = tournament();
anotherYear.source = 'https://www.wst.tv/matches/another-tournament';
assert.match(context.renderDraw({ id: 'shenzhen' }, anotherYear), /data-missing-result/);
const differentDraw = tournament();
differentDraw.matches[1].home = 'Other Player';
assert.doesNotMatch(context.renderDraw({ id: 'shenzhen' }, differentDraw), /Anthony McGill/);
console.log('PASS confirmed walkover, correct advancement, no fabricated score, official result precedence, tournament isolation and immutable snapshot');
