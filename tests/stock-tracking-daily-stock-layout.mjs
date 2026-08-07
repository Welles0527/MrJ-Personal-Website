import assert from "node:assert";
import fs from "node:fs";

const appSource = fs.readFileSync(new URL("../public/stock-tracking/app.js", import.meta.url), "utf8");

assert.match(appSource, /function renderDailyDigestStockGroups\(/);
assert.match(appSource, /renderDailyDigestStockGroups\(messages\)/);
assert.match(appSource, /id="daily-stock-search"/);
assert.match(appSource, /data-action="set-daily-stock"/);
assert.match(appSource, /showStockBadge:\s*false/);

console.log("Stock tracking daily stock grouping contract passed.");
