"use strict";

(function exposeMessageTaxonomy(root, factory) {
  const taxonomy = factory();
  if (typeof module === "object" && module.exports) module.exports = taxonomy;
  if (root) root.StockTrackingMessageTaxonomy = taxonomy;
})(typeof window === "object" ? window : globalThis, function createMessageTaxonomy() {
  const categories = Object.freeze({
    INDUSTRY: "industry",
    COMPANY: "company",
    TECHNICAL: "technical",
    HEALTH: "health"
  });
  const aliases = Object.freeze({
    macro: categories.INDUSTRY,
    risk: categories.COMPANY,
    valuation: categories.COMPANY,
    capital: categories.COMPANY,
    other: categories.COMPANY
  });
  const knownCategories = new Set(Object.values(categories));
  const feedCategories = Object.freeze([
    categories.INDUSTRY,
    categories.COMPANY
  ]);

  function normalizeCategory(value) {
    const category = String(value || "").trim();
    if (knownCategories.has(category)) return category;
    if (Object.hasOwn(aliases, category)) return aliases[category];
    return categories.COMPANY;
  }

  function isKnownCategory(value) {
    const category = String(value || "").trim();
    return knownCategories.has(category) || Object.hasOwn(aliases, category);
  }

  function groupIncludes(groupCategories, messageCategory) {
    const acceptedCategories = Array.isArray(groupCategories) ? groupCategories : [];
    return acceptedCategories.includes(normalizeCategory(messageCategory));
  }

  return Object.freeze({
    categories,
    feedCategories,
    normalizeCategory,
    isKnownCategory,
    groupIncludes
  });
});
