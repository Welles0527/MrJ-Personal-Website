import assert from "node:assert";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../public/stock-tracking/app.js", import.meta.url), "utf8");

assert.match(appSource, /function renderDailyDigestStockGroups\(/);
assert.match(appSource, /renderDailyDigestStockGroups\(messages, options\)/);
assert.match(appSource, /id="daily-stock-search"/);
assert.match(appSource, /data-action="set-daily-stock"/);
assert.match(appSource, /showStockBadge:\s*false/);
assert.match(appSource, /function renderDailyResearchSection\(/);
assert.doesNotMatch(appSource, /重点变化雷达/);
assert.match(appSource, /今日要闻/);
assert.match(appSource, /无重大变化/);
assert.match(appSource, /事实与分析分开呈现/);
assert.match(appSource, /importantChanges/);
assert.match(appSource, /whyImportant/);
assert.match(appSource, /previousJudgment/);
assert.match(appSource, /nextValidation/);
assert.match(appSource, /data-action="set-research-stock"/);
assert.match(appSource, /function renderDailyResearchStock\(/);
assert.match(appSource, /renderDailyResearchSection\(selectedStock\(\)\)/);
const dailyViewSource = appSource.match(/function renderDailyDigestView\([\s\S]*?\n  function renderDailyResearchSection/)?.[0] || "";
assert.match(dailyViewSource, /renderMessageHeader\("daily"\)/);
assert.match(dailyViewSource, /renderDailyDigestFilters\(\)/);
assert.match(dailyViewSource, /renderDailyDigestSection\("今日新增"/);
assert.match(dailyViewSource, /renderDailyDigestSection\("未读补看"/);
assert.ok(
  dailyViewSource.indexOf('renderMessageHeader("daily")') < dailyViewSource.indexOf("renderDailyResearchSection(selectedStock())"),
  "daily dynamics must render above today's stock research"
);

console.log("Stock tracking daily stock grouping contract passed.");
