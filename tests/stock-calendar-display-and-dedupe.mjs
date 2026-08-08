import assert from "node:assert/strict";
import fs from "node:fs";

await import("../public/stock-tracking/message-taxonomy.js");

const taxonomy = globalThis.StockTrackingMessageTaxonomy;
const appSource = fs.readFileSync(new URL("../public/stock-tracking/app.js", import.meta.url), "utf8");

const messages = [
  {
    id: "old",
    trackingStockId: "301026",
    eventKind: "calendar",
    title: "2026年半年报预约披露",
    publishedAt: "2026-08-20T00:00:00+08:00"
  },
  {
    id: "new",
    trackingStockId: "301026",
    eventKind: "calendar",
    title: "2026年半年报预约披露",
    publishedAt: "2026-08-21T00:00:00+08:00"
  },
  {
    id: "other-stock",
    trackingStockId: "688633",
    eventKind: "calendar",
    title: "2026年半年报预约披露",
    publishedAt: "2026-08-29T00:00:00+08:00"
  }
];

assert.deepEqual(
  taxonomy.keepLatestDuplicateMessages(messages).map(message => message.id),
  ["new", "other-stock"]
);
assert.match(appSource, /visibleReminders, "calendar", \{ groupOrder: "message", showFullDate: true \}\)/);
assert.match(appSource, /options\.showFullDate \? formatDateTime\(message\.publishedAt\) : formatMessageTime\(message\.publishedAt\)/);

console.log("stock calendar full-date and deduplication regression passed");
