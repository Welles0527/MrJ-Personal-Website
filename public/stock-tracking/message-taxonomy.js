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

  function partitionDailyDigestMessages(messages, predicates = {}) {
    const source = Array.isArray(messages) ? messages : [];
    const isToday = typeof predicates.isToday === "function" ? predicates.isToday : () => false;
    const isPast = typeof predicates.isPast === "function" ? predicates.isPast : () => false;
    const isUnread = typeof predicates.isUnread === "function" ? predicates.isUnread : () => false;
    const isReminder = typeof predicates.isReminder === "function" ? predicates.isReminder : () => false;
    const isActiveReminder = typeof predicates.isActiveReminder === "function" ? predicates.isActiveReminder : () => false;
    return source.reduce((groups, message) => {
      if (isToday(message) || isActiveReminder(message)) groups.today.push(message);
      else if (!isReminder(message) && isPast(message) && isUnread(message)) groups.catchUp.push(message);
      return groups;
    }, { today: [], catchUp: [] });
  }

  function mergeFeedSection(existingMessages, incomingMessages, error, retainExisting = () => false) {
    const existing = Array.isArray(existingMessages) ? existingMessages : [];
    if (error) return [...existing];
    const incoming = Array.isArray(incomingMessages) ? incomingMessages : [];
    const incomingIds = new Set(incoming.map(message => String(message?.id || "")));
    const retained = existing.filter(message => (
      retainExisting(message) && !incomingIds.has(String(message?.id || ""))
    ));
    return [...incoming, ...retained];
  }

  return Object.freeze({
    categories,
    feedCategories,
    normalizeCategory,
    isKnownCategory,
    groupIncludes,
    partitionDailyDigestMessages,
    mergeFeedSection
  });
});
