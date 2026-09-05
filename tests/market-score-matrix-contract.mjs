import assert from "node:assert/strict";
import fs from "node:fs";

const provider = fs.readFileSync("public/stock-tracking/technical-analysis-provider.js", "utf8");
const page = fs.readFileSync("public/stock-tracking/technical-analysis-page.js", "utf8");
const chart = fs.readFileSync("public/stock-tracking/technical-analysis-chart.js", "utf8");
const css = fs.readFileSync("public/stock-tracking/technical-analysis.css", "utf8");

assert.match(provider, /getTechnicalTimeframeMatrix\(stockCode/);
assert.match(provider, /Object\.values\(timeframes\.PROFILES\)/);
for (const dimension of ["total", "trend", "volumePrice", "momentum", "structure", "volatility"]) {
  assert.match(provider, new RegExp(`${dimension}: result\\.scores`));
}

for (const heading of [
  "上证指数技术共振监测",
  "指数真实走势与关键结构",
  "今日决策状态",
  "多周期决策矩阵",
  "真正的共振链"
]) {
  assert.match(page, new RegExp(heading));
}

assert.match(page, /方向[\s\S]{0,180}宽度[\s\S]{0,180}触发[\s\S]{0,180}确认[\s\S]{0,180}风险[\s\S]{0,180}覆盖率[\s\S]{0,180}当前阶段/);
assert.match(page, /buildMarketDecision\(result, matrix, state\.marketScenario\)/);
assert.match(page, /\["current", "confirmed", "risk"\]/);
assert.match(page, /当前行情源未提供成分股宽度/);
assert.match(page, /风险覆盖规则优先/);
assert.match(page, /marketScenario: "current"/);
assert.match(page, /data-action="set-market-scenario"/);

assert.match(chart, /Array\.isArray\(result\?\.candles\)/);
assert.match(chart, /profile\.maPeriods/);
assert.match(chart, /结构支撑/);
assert.match(chart, /确认位/);

assert.match(css, /\.market-v2-grid-top \{ grid-template-columns: minmax\(0, 1\.62fr\) minmax\(350px, \.88fr\); \}/);
assert.match(css, /\.market-v2-matrix-scroll table \{ width: 100%; min-width: 840px;/);
assert.match(css, /@media \(max-width: 1320px\)[\s\S]+\.market-v2-grid-top,[\s\S]+\.market-v2-grid-bottom \{ grid-template-columns: minmax\(0, 1fr\); \}/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]+\.market-v2-rings \{ grid-template-columns: 1fr; \}/);

console.log("上证指数 V2 共振监测契约检查通过");
