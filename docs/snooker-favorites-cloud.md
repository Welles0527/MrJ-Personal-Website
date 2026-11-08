# Snooker favorites cloud sync

The shared account entry mounts synchronization only on the snooker and super-calendar pages. Both tournament and individual-match favorites use the existing site account. Dates and match descriptions travel with the favorite so the summary can render on a second device without opening the snooker page first.

## CloudBase collection

Environment: `magicj-web-d5g9yvowj6862f7a2`.
Collection: `officialWebsiteSnookerFavorites`.

```json
{
  "read": "auth != null && doc.ownerId == auth.uid",
  "create": "auth != null && auth.loginType != 'ANONYMOUS' && request.data.ownerId == auth.uid",
  "update": false,
  "delete": false
}
```

Use `collection.add` for immutable operations with a client-generated UUID `_id`. All reads, including readback verification, include `ownerId`. Treat SDK `code` and `error` responses as failures. App cancellation appends a `remove` operation; it does not delete database records. No existing collection's permissions are changed.

## Behavior

- Read the account's cloud records before migrating existing browser favorites. A second device with an empty list cannot erase cloud favorites.
- Migrate unscoped browser favorites into the first account used on that browser. Preserve the guest copy; do not automatically import it into another account.
- Cache projections and pending operations per account. Confirm the authenticated account before and after asynchronous work. Switching accounts replaces the visible favorites with that account's cache/cloud data.
- Merge immutable set/remove/metadata/migrate operations in logical clock and operation ID order. An explicit set/remove always takes precedence over stale initial migration for the same key.
- Preserve an offline outbox. Refresh on login, focus, visibility, online, and every 30 seconds while visible. After three failed refreshes require a manual retry or a new online/account event.
- Favorites without a confirmed date remain saved; calendar placement needs a confirmed date. Schedule changes can update metadata without recreating a cancelled favorite.
- Read all operation pages in batches of 100. No compaction job is introduced; operation history grows with edits.

## Verification

`node tests/snooker-favorites-cloud.mjs` covers migration, isolated devices, cancellations, reordered cloud fields, account switching, offline retry, failed initial reads, delayed old-account responses, and sign-out.

`node tests/snooker-favorites-cloud-live.mjs` accepts a credential JSON through stdin only. It uses isolated 1440×900 and 390×844 browser contexts, real CloudBase authentication/storage, synthetic match IDs, summary assertions and cancellation propagation. Cleanup deletes only the current synthetic key for the authenticated owner through the administrator CLI. Never persist credentials, tokens, or browser storage snapshots.

The generated `public/account-entry.js` is rebuilt with `node scripts/build-account-entry.mjs`. A static production release remains a separate explicitly authorized operation.
