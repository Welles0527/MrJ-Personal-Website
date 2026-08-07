import assert from "node:assert/strict";
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

console.log("Stock-tracking category contract passed.");
