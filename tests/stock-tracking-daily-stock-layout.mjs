import assert from "node:assert";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../public/stock-tracking/app.js", import.meta.url), "utf8");

assert.match(appSource, /function dailyResearchContext\(/);
assert.match(appSource, /trackedCodes\.has\(item\.code\) && item\.hasMaterialChange/);
assert.match(appSource, /function renderDailyNewsSection\(/);
assert.match(appSource, /function renderDailyMajorNewsSection\(/);
assert.match(appSource, /function renderDailyTrafficLightSection\(/);
assert.doesNotMatch(appSource, /重点变化雷达/);
assert.match(appSource, /今日要闻/);
assert.match(appSource, /个股重大消息/);
assert.match(appSource, /个股红绿灯/);
assert.match(appSource, /function buildDailyTrafficRows\(/);
assert.match(appSource, /function dailyTrafficCapitalTone\(/);
assert.match(appSource, /基本面/);
assert.match(appSource, /机构/);
assert.match(appSource, /筹码/);
assert.match(appSource, /资金面/);
assert.match(appSource, /风险事项/);
assert.match(appSource, /data-traffic-dimension="\$\{row\.id\}"/);
assert.match(appSource, /report\?\.price\?\.changePct/);
assert.match(appSource, /closeLocation >= 0\.65/);
assert.match(appSource, /riskTone === "negative" && overallTone === "positive"/);
assert.match(appSource, /importantChanges/);
assert.match(appSource, /whyImportant/);
assert.match(appSource, /previousJudgment/);
assert.match(appSource, /nextValidation/);
assert.match(appSource, /function renderDailyResearchStock\(/);
assert.match(appSource, /dailyDigestKind:\s*"today"/);
assert.match(appSource, /dailyDigestKind:\s*"catch-up"/);
assert.match(appSource, /showDigestOrigin:\s*true/);
assert.match(appSource, /daily-message-origin-/);
assert.match(appSource, /今日新增/);
assert.match(appSource, /未读补看/);
assert.match(appSource, /if \(\["daily", "calendar"\]\.includes\(state\.viewMode\)\) state\.filters\.stock = state\.selectedStockId/);
assert.match(appSource, /data-action="select-all-stocks"/);
assert.match(appSource, /action === "select-all-stocks"/);
assert.match(appSource, /advanceReadThrough && state\.filters\.stock === "all"/);

const engineStart = appSource.indexOf("  const dailyTrafficDimensionConfig");
const engineEnd = appSource.indexOf("  function renderDailyTrafficLightSection", engineStart);
assert.ok(engineStart > -1 && engineEnd > engineStart, "traffic-light engine source must be discoverable");
const trafficEngineSource = appSource.slice(engineStart, engineEnd);
const { buildDailyTrafficRows } = new Function(`${trafficEngineSource}\nreturn { buildDailyTrafficRows };`)();
const sourcedRiskReport = {
  code: "000000",
  hasMaterialChange: true,
  sentiment: "风险",
  currentJudgment: "基本面偏积极，但价格放量冲高回落，短线转为谨慎",
  status: "基本面偏积极，但价格放量冲高回落，短线转为谨慎",
  conclusion: "价格放量冲高回落，修复仍待确认",
  whyImportant: "量能放大但修复失败",
  judgmentChange: "基本面判断不变；价格由等待修复转为放量修复失败。",
  importantChanges: [{ category: "价格成交", fact: "收盘上涨1.49%，成交量较前一日增加59.0%", source_urls: ["https://example.com/quote"] }],
  price: { tradeDate: "2026-08-24", changePct: 1.49, volumeChangeVsPreviousPct: 59, close: 21.8, high: 22.56, low: 21.01 },
  sources: [{ kind: "行情", url: "https://example.com/quote" }]
};
const sourcedRiskRows = buildDailyTrafficRows(sourcedRiskReport);
assert.deepEqual(sourcedRiskRows.map(row => row.id), ["fundamentals", "institution", "chips", "capital", "risk", "overall"]);
assert.equal(sourcedRiskRows.find(row => row.id === "fundamentals").tone, "neutral", "analysis text without a matching sourced fact must not turn fundamentals green");
assert.equal(sourcedRiskRows.find(row => row.id === "institution").tone, "neutral", "missing institution evidence must stay neutral/awaiting");
assert.equal(sourcedRiskRows.find(row => row.id === "chips").tone, "neutral", "price evidence must not substitute for chip evidence");
assert.equal(sourcedRiskRows.find(row => row.id === "capital").tone, "negative", "a sourced high-volume failed repair must be negative");
assert.equal(sourcedRiskRows.find(row => row.id === "capital").comparison, "边际转弱");
assert.equal(sourcedRiskRows.find(row => row.id === "risk").tone, "negative");
assert.equal(sourcedRiskRows.find(row => row.id === "overall").tone, "negative", "material risk must override positive sub-signals");

const unchangedRows = buildDailyTrafficRows({
  hasMaterialChange: false,
  sentiment: "中性",
  currentJudgment: "机构持仓仍待披露，基本面仍待验证",
  status: "判断维持",
  judgmentChange: "原判断维持。",
  importantChanges: [],
  price: { tradeDate: "2026-08-24", changePct: 0, volumeChangeVsPreviousPct: 0, close: 10, high: 10.2, low: 9.8 },
  sources: [{ kind: "行情", url: "https://example.com/quote" }]
});
assert.equal(unchangedRows.length, 6);
assert.equal(unchangedRows.find(row => row.id === "institution").tone, "neutral");
assert.equal(unchangedRows.find(row => row.id === "overall").tone, "neutral");
assert.ok(unchangedRows.every(row => row.comparison === "不变"));
assert.doesNotMatch(trafficEngineSource, /301026|300750|603507|002829/, "traffic-light rules must not branch on stock codes");

const dailyViewSource = appSource.match(/function renderDailyDigestView\([\s\S]*?\n  function dailyResearchContext/)?.[0] || "";
assert.doesNotMatch(dailyViewSource, /renderMessageHeader\("daily"\)/);
assert.doesNotMatch(dailyViewSource, /renderDailyDigestFilters\(\)/);
assert.doesNotMatch(dailyViewSource, /renderDailyDigestSection\(/);
assert.match(dailyViewSource, /renderDailyNewsSection\(researchContext\)/);
assert.match(dailyViewSource, /renderDailyMajorNewsSection\(majorMessages\)/);
assert.match(dailyViewSource, /renderDailyTrafficLightSection\(researchContext\)/);
assert.ok(
  dailyViewSource.indexOf("renderDailyNewsSection(researchContext)") < dailyViewSource.indexOf("renderDailyMajorNewsSection(majorMessages)")
    && dailyViewSource.indexOf("renderDailyMajorNewsSection(majorMessages)") < dailyViewSource.indexOf("renderDailyTrafficLightSection(researchContext)"),
  "daily view must render news, major messages, and the stock traffic light in that order"
);

console.log("Stock tracking daily three-section contract passed.");
