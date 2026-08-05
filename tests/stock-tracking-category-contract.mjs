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

console.log("Stock-tracking category contract passed.");
