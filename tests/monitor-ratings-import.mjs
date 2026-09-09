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
fs.unlinkSync(target);
fs.rmdirSync(path.dirname(target));
console.log("Monitor import: exact ratings, source/date validation, idempotency, and preservation checks passed.");
