import assert from "node:assert/strict";
import fs from "node:fs";
await import("../public/stock-tracking/message-taxonomy.js");

const taxonomy = globalThis.StockTrackingMessageTaxonomy;

assert.equal(taxonomy.normalizeCategory("industry"), "industry");
assert.equal(taxonomy.normalizeCategory("macro"), "industry");
assert.equal(taxonomy.normalizeCategory("company"), "company");
assert.equal(taxonomy.normalizeCategory("risk"), "company");
assert.equal(taxonomy.normalizeCategory("valuation"), "company");
assert.equal(taxonomy.normalizeCategory("capital"), "company");
assert.equal(taxonomy.normalizeCategory("other"), "company");
assert.equal(taxonomy.normalizeCategory("technical"), "technical");
assert.equal(taxonomy.normalizeCategory("health"), "health");
assert.equal(taxonomy.normalizeCategory("unexpected-category"), "company");
assert.equal(taxonomy.isKnownCategory("unexpected-category"), false);

const allDynamicCategories = [taxonomy.categories.INDUSTRY, taxonomy.categories.COMPANY];
for (const category of taxonomy.feedCategories) {
  assert.equal(taxonomy.groupIncludes(allDynamicCategories, category), true);
}
assert.equal(taxonomy.groupIncludes([taxonomy.categories.INDUSTRY], "macro"), true);
assert.equal(taxonomy.groupIncludes([taxonomy.categories.INDUSTRY], "company"), false);

const messages = [
  { id: "today", day: "today", unread: true },
  { id: "past-unread", day: "past", unread: true },
  { id: "future-normal", day: "future", unread: true },
  { id: "future-calendar", day: "future", unread: false, calendar: true },
  { id: "past-calendar", day: "past", unread: true, calendar: true }
];
const digest = taxonomy.partitionDailyDigestMessages(messages, {
  isToday: message => message.day === "today",
  isPast: message => message.day === "past",
  isUnread: message => message.unread,
  isReminder: message => Boolean(message.calendar),
  isActiveReminder: message => message.calendar && message.day === "future"
});
assert.deepEqual(digest.today.map(message => message.id), ["today", "future-calendar"]);
assert.deepEqual(digest.catchUp.map(message => message.id), ["past-unread"]);

const retainedEvent = { id: "live-event-existing" };
assert.deepEqual(
  taxonomy.mergeFeedSection([retainedEvent], [], "事件接口被限流"),
  [retainedEvent],
  "a failed feed section must retain its last valid messages"
);
assert.deepEqual(
  taxonomy.mergeFeedSection([retainedEvent], [], ""),
  [],
  "a successful empty response may clear a feed section"
);
assert.deepEqual(
  taxonomy.mergeFeedSection(
    [retainedEvent, { id: "expired-event" }],
    [],
    "",
    message => message.id === retainedEvent.id
  ),
  [retainedEvent],
  "an active calendar reminder must survive a successful response that temporarily omits it"
);

const appSource = fs.readFileSync(new URL("../public/stock-tracking/app.js", import.meta.url), "utf8");
assert.match(
  appSource,
  /mergeFeedSection\([\s\S]{0,220}information\.errors\?\.events[\s\S]{0,180}message\.eventKind === "calendar" && messageDayRelation\(message\) === "future"/,
  "the daily digest must retain unexpired calendar reminders on partial refreshes"
);

console.log("Stock-tracking category contract passed.");
