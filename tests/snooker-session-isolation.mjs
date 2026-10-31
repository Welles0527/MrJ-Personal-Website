import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/snooker-calendar/cloud-live-scores.js', import.meta.url), 'utf8');
const key = 'mywebsite.site-auth-session.v1';
const remembered = JSON.stringify({ uid: 'personal-fixture', account: 'personal@example.test', expiresAt: Date.now() + 60000 });

function fixture({ account = remembered, session = { access_token: 'fixture-personal-token' }, sessionError, lock = false } = {}) {
  const storage = new Map(account ? [[key, account]] : []);
  const counts = { session: 0, anonymous: 0, requests: 0, locks: 0 };
  const window = {
    localStorage: { getItem: name => storage.get(name) ?? null },
    cloudbase: { init: () => ({ auth: () => ({
      async getSession() {
        counts.session++;
        if (sessionError) throw new Error(sessionError);
        return { data: { session } };
      },
      async signInAnonymously() {
        counts.anonymous++;
        return { data: { session: { access_token: 'fixture-guest-token' } } };
      }
    }) }) }
  };
  vm.runInNewContext(source, {
    window, navigator: { locks: lock ? { async request(name, callback) { assert.equal(name, 'mywebsite.auth:magicj-web-d5g9yvowj6862f7a2'); counts.locks++; return callback(); } } : undefined },
    setTimeout: () => 0,
    fetch: async (_url, options) => {
      counts.requests++;
      const { access_token } = JSON.parse(options.body);
      assert.equal(access_token, counts.anonymous ? 'fixture-guest-token' : 'fixture-personal-token');
      return { ok: true, json: async () => ({ data: { response_data: JSON.stringify({ snapshot: { version: 1, events: [] } }) } }) };
    }
  });
  return { load: window.CUE_LOAD_CLOUD_SCORES, counts, storage };
}

const personal = fixture({ lock: true });
await personal.load();
assert.equal(personal.counts.session, 1, 'score reads must check the existing session first');
assert.equal(personal.counts.anonymous, 0, 'score reads must never replace an existing personal session with an anonymous login');
assert.equal(personal.counts.locks, 1, 'anonymous/public auth must coordinate with shared account renewal');
assert.equal(personal.storage.get(key), remembered);

for (const sessionError of [undefined, 'credentials not found', "Cannot read properties of null (reading 'scope')", "null is not an object (evaluating 'e.scope')", 'network unavailable']) {
  const unavailable = fixture({ session: null, sessionError });
  await assert.rejects(unavailable.load());
  assert.equal(unavailable.counts.anonymous, 0, 'a remembered personal account must be preserved when SDK restoration is unavailable');
  assert.equal(unavailable.counts.requests, 0);
  assert.equal(unavailable.storage.get(key), remembered);
}

const guest = fixture({ account: null, session: null });
await guest.load();
assert.equal(guest.counts.anonymous, 1, 'actual guests may still read public live scores');
const guestStartup = fixture({ account: null, session: null, sessionError: 'credentials not found' });
await guestStartup.load();
assert.equal(guestStartup.counts.anonymous, 1);
for (const sessionError of ["Cannot read properties of null (reading 'scope')", "null is not an object (evaluating 'e.scope')"]) {
  const freshVisitor = fixture({ account: null, session: null, sessionError, lock: true });
  await freshVisitor.load();
  assert.equal(freshVisitor.counts.anonymous, 1, 'fresh browsers with the SDK null-scope error must initialize a guest session');
  assert.equal(freshVisitor.counts.requests, 1, 'fresh visitors must reach the live snapshot API instead of the static fallback');
  assert.equal(freshVisitor.counts.locks, 1);
}
const guestNetworkFailure = fixture({ account: null, session: null, sessionError: 'network unavailable' });
await assert.rejects(guestNetworkFailure.load());
assert.equal(guestNetworkFailure.counts.anonymous, 0, 'network errors must not trigger an identity change');
console.log('PASS personal-session reuse, fresh guest null-scope recovery, network protection and shared auth lock');
