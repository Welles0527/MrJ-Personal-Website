import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = { window: {}, AbortSignal };
vm.runInNewContext(fs.readFileSync(new URL('../public/stock-tracking/daily-monitor-ratings.js', import.meta.url), 'utf8'), context);
const original = structuredClone(context.window.STOCK_MONITOR_RATINGS.stocks['301026']);
const report = { ...original, receipt: 'a'.repeat(64), syncedAt: new Date().toISOString() };
let response = { report };
let requests = 0;
context.fetch = async (url, options) => {
  requests++;
  assert.equal(options.cache, 'no-store');
  assert.equal(options.credentials, 'omit');
  if (response instanceof Error) throw response;
  return { ok: true, json: async () => url.endsWith('301026') ? response : { report: null } };
};
vm.runInNewContext(fs.readFileSync(new URL('../public/stock-tracking/monitor-report-provider.js', import.meta.url), 'utf8'), context);
const provider = context.window.StockMonitorReports;
await Promise.all([provider.refresh(), provider.refresh()]);
assert.equal(requests, 4, 'Concurrent refreshes share requests');
assert.equal(context.window.STOCK_MONITOR_RATINGS.stocks['301026'].receipt, report.receipt);
assert.match(provider.status['301026'], /已从网站后台/);
assert.match(provider.status['300871'], /尚未收到/);
const accepted = JSON.stringify(context.window.STOCK_MONITOR_RATINGS.stocks['301026']);
for (const bad of [
  new Error('offline'),
  { report: null },
  { report: { ...report, reportDate: '2026-02-30' } },
  { report: { ...report, reportDate: '2099-01-01' } },
  { report: { ...report, reportDate: '2020-01-01' } },
  { report: { ...report, rows: report.rows.slice(1) } },
  { report: { ...report, rows: report.rows.map(row => ({ ...row, tone: 'invalid' })) } }
]) {
  response = bad;
  await provider.refresh();
  assert.equal(JSON.stringify(context.window.STOCK_MONITOR_RATINGS.stocks['301026']), accepted, 'Bad or missing data preserves the last report');
}
response = { report: { ...report, rows: report.rows.map(row => ({ ...row, rating: '原样评级', tone: 'neutral' })) } };
await provider.refresh();
assert.equal(context.window.STOCK_MONITOR_RATINGS.stocks['301026'].rows[0].rating, '原样评级');
assert.equal(context.window.STOCK_MONITOR_RATINGS.stocks['301026'].rows[0].tone, 'neutral');
console.log('Stock monitor provider: refresh, validation, original colors and fallback passed.');
