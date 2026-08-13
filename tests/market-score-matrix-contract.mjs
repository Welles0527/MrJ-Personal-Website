import assert from "node:assert/strict";
import fs from "node:fs";

const provider = fs.readFileSync("public/stock-tracking/technical-analysis-provider.js", "utf8");
const page = fs.readFileSync("public/stock-tracking/technical-analysis-page.js", "utf8");
const css = fs.readFileSync("public/stock-tracking/technical-analysis.css", "utf8");

assert.match(provider, /getTechnicalTimeframeMatrix\(stockCode/);
assert.match(provider, /Object\.values\(timeframes\.PROFILES\)/);
for (const dimension of ["total", "trend", "volumePrice", "momentum", "structure", "volatility"]) {
  assert.match(provider, new RegExp(`${dimension}: result\\.scores`));
}
assert.match(page, /大盘评分矩阵/);
assert.match(page, /周期[\s\S]{0,120}总分[\s\S]{0,120}趋势[\s\S]{0,120}量价[\s\S]{0,120}动量[\s\S]{0,120}结构[\s\S]{0,120}波动/);
assert.match(page, /MarketOverview\(this\.state\.result, this\.state\.marketMatrix/);
assert.match(page, /评分日期 \$\{escapeHtml\(scoreDate\)\}/);
assert.doesNotMatch(page, /<th scope="row"><strong>\$\{escapeHtml\(row\.label\)\}<\/strong><small>/);
assert.match(css, /\.ta-market-score-matrix tbody th \{ width: 62px; text-align: center; \}/);
assert.match(css, /\.ta-market-matrix-score\.total \{ min-width: 38px; font-size: 18px; \}/);
assert.match(css, /\.ta-market-overview-grid[^\n]+grid-template-columns: minmax\(0, 1\.18fr\) minmax\(440px, \.92fr\)/);
assert.match(css, /@media \(max-width: 1040px\)[\s\S]+\.ta-market-overview-grid \{ grid-template-columns: minmax\(0, 1fr\); \}/);

console.log("大盘五周期评分矩阵契约检查通过");
