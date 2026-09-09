import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseMonitor, importMonitor } from "../scripts/import-monitor-ratings.mjs";

const input = {
  threadId: "6a9294d2-ca1c-83ec-a637-b1b8388a418a", messageId: "test-message", sourceTitle: "星球石墨监控",
  text: "## 星球石墨｜2026年9月9日增量重点简报\n\n## 6. 今日综合评级\n\n" + [
    ["基本面", "🟢偏积极"], ["机构", "🔴偏消极"], ["筹码", "🟡中性偏积极"],
    ["资金面", "🟡中性"], ["风险事项", "🟡中性"], ["综合", "🟡"]
  ].map(([label, rating]) => `**${label}：${rating}｜较昨日：不变**\n理由保留，正文中的🔴不改变标题评级。citeexample`).join("\n\n") + "\n\n### 7. 今日结论\n其他正文不参与评级。"
};
const now = new Date("2026-09-10T10:00:00Z");
const report = parseMonitor(input, now);
assert.deepEqual(report.rows.map(row => row.tone), ["positive", "negative", "neutral", "neutral", "neutral", "neutral"]);
assert.equal(report.rows[2].rating, "中性偏积极");
assert.equal(report.reportDate, "2026-09-09");
assert.ok(report.rows.every(row => row.evidence.includes("正文中的🔴") && !row.evidence.includes("cite")));
assert.throws(() => parseMonitor({ ...input, text: input.text.replace("**机构：", "**其他：") }, now));
assert.throws(() => parseMonitor({ ...input, threadId: "wrong" }, now));
assert.throws(() => parseMonitor({ ...input, text: input.text.replace("2026年9月9日", "2026年9月31日") }, now));
assert.throws(() => parseMonitor({ ...input, text: input.text.replace("2026年9月9日", "2026年9月11日") }, now));
const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "monitor-test-")), "ratings.js");
assert.equal(importMonitor(input, target, now), true);
const previous = fs.readFileSync(target, "utf8");
assert.equal(importMonitor(input, target, now), false);
assert.throws(() => importMonitor({ ...input, text: input.text.replace("2026年9月9日", "2026年9月8日") }, target, now));
assert.throws(() => importMonitor({ ...input, text: "incomplete" }, target, now));
assert.equal(fs.readFileSync(target, "utf8"), previous);
const appSource = fs.readFileSync(new URL("../public/stock-tracking/app.js", import.meta.url), "utf8");
const renderer = appSource.slice(appSource.indexOf("  function renderDailyTrafficLightSection"), appSource.indexOf("  function renderDailyResearchStock"));
const render = new Function("window", "dailyTrafficDimensionConfig", "escapeHtml", "formatDateTime", "icon", "buildDailyTrafficRows", "dailyTrafficRatingLabel", `${renderer}; return renderDailyTrafficLightSection;`);
const args = [[], String, String, () => "", () => { throw new Error("Monitor stock must not use legacy scoring"); }, () => "legacy"];
const context = { stock: { code: "688633", name: "星球石墨" }, report: { code: "688633", name: "星球石墨" } };
const html = render({ STOCK_MONITOR_RATINGS: { stocks: { "688633": report } } }, ...args)(context);
assert.equal((html.match(/data-traffic-dimension=/g) || []).length, 6);
assert.match(html, /中性偏积极/);
assert.match(html, /2026-09-09 报告/);
const missingHtml = render({}, ...args)(context);
assert.match(missingHtml, /暂无红绿灯数据/);
assert.doesNotMatch(missingHtml, /data-traffic-dimension=/);
const fixtures = JSON.parse(fs.readFileSync(new URL("./fixtures/monitor-ratings.json", import.meta.url), "utf8"));
for (const [code, fixture] of Object.entries(fixtures)) {
  const parsed = parseMonitor(fixture, now);
  assert.equal(parsed.code, code);
  assert.equal(parsed.rows.length, code === "300871" ? 8 : 6);
  assert.equal(importMonitor(fixture, target, now), true);
  assert.equal(importMonitor(fixture, target, now), false);
  const stockContext = { stock: { code, name: parsed.name }, report: {} };
  assert.match(render({}, ...args)(stockContext), /暂无红绿灯数据/);
  const markup = render({ STOCK_MONITOR_RATINGS: { stocks: { [code]: parsed } } }, ...args)(stockContext);
  assert.equal((markup.match(/data-traffic-dimension=/g) || []).length, parsed.rows.length);
  assert.throws(() => parseMonitor({ ...fixture, text: fixture.text.replace("基本面：", "缺失：") }, now));
}
const hao = parseMonitor(fixtures["301026"], now);
assert.ok(hao.rows.every(row => row.tone === "neutral"));
assert.equal(hao.rows[3].comparison, "上调");
assert.equal(hao.rows[3].rating, "偏积极");
assert.match(hao.rows[3].evidence, /成交额环比放大约43%/);
const zhen = parseMonitor(fixtures["603507"], now);
assert.equal(zhen.rows[4].tone, "negative");
assert.equal(zhen.rows[5].tone, "positive");
assert.equal(zhen.rows[5].evidence, "原文未单列理由");
const hui = parseMonitor(fixtures["300871"], now);
assert.deepEqual(hui.rows.map(row => row.label), ["基本面", "机构", "筹码", "财务质量", "行业景气", "风险事项", "量价资金", "综合"]);
assert.equal(hui.rows[4].tone, "negative");
const saved = JSON.parse(fs.readFileSync(target, "utf8").replace(/^window.STOCK_MONITOR_RATINGS = /, "").replace(/;\s*$/, ""));
assert.equal(Object.keys(saved.stocks).length, 4);
assert.deepEqual(saved.stocks["688633"], report);
fs.unlinkSync(target);
fs.rmdirSync(path.dirname(target));
console.log("Monitor import: exact ratings, source/date validation, idempotency, and preservation checks passed.");
