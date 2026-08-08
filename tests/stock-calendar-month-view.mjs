import assert from "node:assert/strict";
import fs from "node:fs";

const appSource = fs.readFileSync(
  new URL("../public/stock-tracking/app.js", import.meta.url),
  "utf8"
);
const cssSource = fs.readFileSync(
  new URL("../public/stock-tracking/styles.css", import.meta.url),
  "utf8"
);

assert.match(appSource, /function currentMonthCalendarReminders\(\)/);
assert.match(appSource, /messageDate\.year === today\.year/);
assert.match(appSource, /messageDate\.month === today\.month/);
assert.match(appSource, /function renderCalendarMonth\(messages\)/);
assert.match(appSource, /class="calendar-month-grid"/);
assert.match(appSource, /class="calendar-event-read/);
assert.match(appSource, /renderCalendarMonth\(visibleReminders\)/);

assert.match(cssSource, /\.calendar-month-board\s*\{/);
assert.match(cssSource, /\.calendar-month-grid\s*\{/);
assert.match(cssSource, /@media \(max-width: 620px\)/);
assert.match(cssSource, /\.calendar-month-grid\s*\{[\s\S]*?display:\s*block/);

console.log("stock calendar current-month view regression passed");
