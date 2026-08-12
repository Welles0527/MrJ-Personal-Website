import assert from "node:assert";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../public/stock-tracking/app.js", import.meta.url), "utf8");

assert.match(appSource, /function renderDailyDigestStockGroups\(/);
assert.match(appSource, /renderDailyDigestStockGroups\(messages, options\)/);
assert.match(appSource, /id="daily-stock-search"/);
assert.match(appSource, /data-action="set-daily-stock"/);
assert.match(appSource, /showStockBadge:\s*false/);
assert.match(appSource, /function renderDailyResearchSection\(/);
assert.match(appSource, /重点变化雷达/);
assert.match(appSource, /今日最值得看/);
assert.match(appSource, /无重大变化/);
assert.match(appSource, /事实与分析分开呈现/);
assert.match(appSource, /importantChanges/);
assert.match(appSource, /whyImportant/);
assert.match(appSource, /previousJudgment/);
assert.match(appSource, /nextValidation/);
assert.match(appSource, /data-action="set-research-stock"/);
assert.match(appSource, /function renderDailyResearchStock\(/);
assert.match(appSource, /renderDailyResearchSection\(selectedStock\(\)\)/);
assert.doesNotMatch(
  appSource.match(/function renderDailyDigestView\([\s\S]*?\n  function renderDailyResearchSection/)?.[0] || "",
  /renderMessageHeader\("daily"\)/,
  "the paused daily dynamics must not render above the stock research report"
);

console.log("Stock tracking daily stock grouping contract passed.");
