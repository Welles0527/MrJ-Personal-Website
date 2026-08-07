"use strict";

(function exposeMessageReadState(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.StockTrackingMessageReadState = api;
})(typeof window === "object" ? window : globalThis, function createMessageReadStateApi() {
  const VERSION = 2;
  const MIGRATION_READ_THROUGH_AT = "2026-08-08T00:00:00+08:00";

  function validTimestamp(value, fallback = "") {
    const text = typeof value === "string" ? value : "";
    return text && Number.isFinite(Date.parse(text)) ? text : fallback;
  }

  function idSet(values) {
    return new Set((Array.isArray(values) ? values : [])
      .map(value => String(value || ""))
      .filter(Boolean));
  }

  function createState(raw = {}) {
    const source = raw && typeof raw === "object" ? raw : {};
    const currentVersion = Number(source.readStateVersion) >= VERSION;
    return {
      readStateVersion: VERSION,
      readThroughAt: validTimestamp(source.readThroughAt, MIGRATION_READ_THROUGH_AT),
      readIds: idSet(currentVersion ? source.readIds : source.readOverrides),
      unreadIds: idSet(currentVersion ? source.unreadIds : [])
    };
  }

  function defaultUnread(message, state) {
    if (!Boolean(message?.unread)) return false;
    const publishedAt = Date.parse(String(message?.publishedAt || ""));
    const readThroughAt = Date.parse(String(state?.readThroughAt || ""));
    if (Number.isFinite(publishedAt) && Number.isFinite(readThroughAt) && publishedAt <= readThroughAt) return false;
    return true;
  }

  function isUnread(message, state) {
    const id = String(message?.id || "");
    if (id && state?.unreadIds?.has(id)) return true;
    if (id && state?.readIds?.has(id)) return false;
    return defaultUnread(message, state);
  }

  function setUnread(message, state, unread) {
    const id = String(message?.id || "");
    if (!id || !state) return;
    state.readIds.delete(id);
    state.unreadIds.delete(id);
    if (Boolean(unread) === defaultUnread(message, state)) return;
    (unread ? state.unreadIds : state.readIds).add(id);
  }

  function toggle(message, state) {
    setUnread(message, state, !isUnread(message, state));
  }

  function markAll(messages, state, readThroughAt = "") {
    if (!state) return;
    const nextReadThroughAt = validTimestamp(readThroughAt);
    if (nextReadThroughAt && Date.parse(nextReadThroughAt) > Date.parse(state.readThroughAt)) {
      state.readThroughAt = nextReadThroughAt;
    }
    (Array.isArray(messages) ? messages : []).forEach(message => setUnread(message, state, false));
  }

  function serialize(state) {
    return {
      readStateVersion: VERSION,
      readThroughAt: validTimestamp(state?.readThroughAt, MIGRATION_READ_THROUGH_AT),
      readIds: [...(state?.readIds || [])].slice(-1000),
      unreadIds: [...(state?.unreadIds || [])].slice(-1000),
      readOverrides: []
    };
  }

  return Object.freeze({
    VERSION,
    MIGRATION_READ_THROUGH_AT,
    createState,
    isUnread,
    toggle,
    markAll,
    serialize
  });
});
