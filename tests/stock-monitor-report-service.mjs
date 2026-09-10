import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { SOURCES, validateReport, createReportService, SAVE_TOOL } = require("../cloudfunctions/stock-monitor-reports/report-service.cjs");
const now = () => new Date("2026-09-10T10:00:00Z");
const make = code => ({
  code, name: SOURCES[code].name, reportDate: "2026-09-09",
  rows: SOURCES[code].dimensions.map(label => ({ label, tone: "neutral", rating: "偏积极", comparison: "不变", evidence: "原文出现🔴，不改变标题黄灯。" }))
});
// A serialized in-memory repository is a test double, not production persistence.
const history = new Map(), latest = new Map();
let queue = Promise.resolve();
const repository = {
  latest: async code => latest.get(code),
  transaction(fn) {
    const result = queue.then(async () => {
      const h = new Map(history), l = new Map(latest);
      const value = await fn({
        latest: async code => l.get(code),
        insert: async (key, row) => { assert.ok(!h.has(key)); h.set(key, row); },
        setLatest: async (code, row) => l.set(code, row)
      });
      history.clear(); h.forEach((v, k) => history.set(k, v));
      latest.clear(); l.forEach((v, k) => latest.set(k, v));
      return value;
    });
    queue = result.catch(() => {});
    return result;
  }
};
const service = createReportService({ repository, writerId: "owner", now });
const principal = { subject: "owner", scopes: ["reports:write"] };
await assert.rejects(service.save(make("301026"), null), /Forbidden/);
await assert.rejects(service.save(make("301026"), { subject: "stranger", scopes: ["reports:write"] }), /Forbidden/);
await assert.rejects(service.save(make("301026"), { subject: "owner", scopes: [] }), /Forbidden/);
assert.equal(history.size, 0);
for (const code of Object.keys(SOURCES)) {
  const results = await Promise.all([service.save(make(code), principal), service.save(make(code), principal)]);
  assert.equal(results.filter(r => r.saved).length, 1);
  assert.equal(results[0].receipt, results[1].receipt);
  const stored = await service.latest(code);
  assert.equal(stored.rows.length, code === "300871" ? 8 : 6);
  assert.ok(stored.rows.every(row => row.tone === "neutral"));
}
const input = make("301026");
const before = JSON.stringify(await service.latest(input.code));
await assert.rejects(service.save({ ...input, reportDate: "2026-09-08" }, principal), /Older/);
await assert.rejects(service.save({ ...input, rows: input.rows.slice(1) }, principal), /Incomplete/);
await assert.rejects(service.save({ ...input, rows: input.rows.map(r => ({ ...r, tone: "positive" })) }, principal), /Conflicting/);
assert.equal(JSON.stringify(await service.latest(input.code)), before);
assert.equal(history.size, 4);
for (const reportDate of ["2026-02-30", "2026-09-11", "2026-9-9"]) assert.throws(() => validateReport({ ...input, reportDate }, now()));
assert.throws(() => validateReport({ ...input, name: "其他股票" }, now()));
assert.throws(() => validateReport({ ...input, rows: input.rows.map(() => input.rows[0]) }, now()));
assert.equal(validateReport({ ...input, secret: "not stored", text: "private conversation" }, now()).text, undefined);
assert.equal(SAVE_TOOL.securitySchemes[0].type, "oauth2");
await service.save({ ...input, reportDate: "2026-09-10" }, principal);
assert.equal(history.size, 5);
assert.equal((await service.latest(input.code)).reportDate, "2026-09-10");
console.log("Report service passed: four stocks, exact ratings, authorization, concurrency, idempotency, history, stale/conflicting report protection.");
