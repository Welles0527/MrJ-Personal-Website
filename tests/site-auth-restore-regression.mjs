import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const key = 'mywebsite.site-auth-session.v1';
const session = { uid: 'calendar-test-user', account: 'calendar-test@example.com' };
const source = await readFile(new URL('../src/scripts/site-auth.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source.replace("import cloudbase from '@cloudbase/js-sdk';", ''), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

function createAuth(getLoginState, loginResult, options = {}) {
  const store = new Map([[key, JSON.stringify({ ...session, expiresAt: Date.now() + 60000 })]]);
  if (options.remembered === false) store.clear();
  const listeners = new Map();
  const timers = [];
  let refreshes = 0;
  let signOuts = 0;
  const changes = [];
  const exports = {};
  const context = vm.createContext({
    exports, Date, Promise, Error,
    setTimeout: callback => setTimeout(callback, 0),
    cloudbase: { init: () => ({ auth: () => ({ getSession: async () => {
      const state = await getLoginState();
      return { data: { session: state ? { ...state, user: state.user } : null } };
    }, refreshSession: async () => { refreshes++; return options.refresh ? options.refresh() : { data: { session: null } }; },
    signInWithPassword: async () => typeof loginResult === 'function' ? loginResult() : loginResult, currentUser: { uid: 'stale-anonymous-id' },
    signOut: async () => { signOuts++; } }), database: () => ({}) }) },
    document: { visibilityState: 'visible', addEventListener: (type, callback) => listeners.set(type, callback) },
    navigator: { onLine: true },
    setInterval: callback => { timers.push(callback); return timers.length; },
    window: {
      localStorage: { getItem: name => store.get(name) ?? null, setItem: (name, value) => store.set(name, value), removeItem: name => store.delete(name) },
      dispatchEvent: event => changes.push(event),
      addEventListener: (type, callback) => listeners.set(type, callback)
    },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  });
  vm.runInContext(compiled, context);
  return { api: exports, store, changes, listeners, timers, get refreshes() { return refreshes; }, get signOuts() { return signOuts; } };
}

let checks = 0;
const delayed = createAuth(async () => ++checks < 3 ? null : { user: { ...session, email: session.account } });
assert.equal((await delayed.api.getCloudSession())?.uid, session.uid, 'a remembered session must survive delayed SDK restoration');
assert.ok(delayed.store.has(key), 'startup must not clear the remembered account before restoration completes');
assert.equal(delayed.changes.length, 0, 'transient null states must not broadcast a logout');

const expired = createAuth(async () => null);
await assert.rejects(expired.api.getCloudSession(), /登录会话已失效/);
assert.equal(expired.store.has(key), true, 'unavailable session must preserve account cache');
assert.equal(expired.changes.length, 0, 'unavailable session must not broadcast logout');

let resolveState;
const stale = createAuth(() => new Promise(resolve => { resolveState = resolve; }));
const request = stale.api.getCloudSession();
await stale.api.signOut();
resolveState({ user: { ...session, email: session.account } });
assert.equal(await request, null, 'late startup responses must not restore a session after logout');
assert.equal(stale.store.has(key), false);

console.log('PASS delayed restoration, invalid session, logout during restoration');

const modern = createAuth(async () => ({ user: { id: '2064712423935315968', uid: 'stale-anonymous-id', email: '49001422@qq.com' } }));
assert.equal((await modern.api.getCloudSession()).uid, '2064712423935315968', 'real v3 session ID must win over legacy UID');
assert.equal((await modern.api.getCloudSession()).account, '49001422@qq.com');
const anonymous = createAuth(async () => ({ user: { id: 'visitor', is_anonymous: true } }));
await assert.rejects(anonymous.api.getCloudSession(), /暂时无法核实登录会话/, 'anonymous sessions must not authorize personal account writes');
const unsigned = createAuth(async () => { throw new Error('credentials not found'); });
await assert.rejects(unsigned.api.getCloudSession(), /登录会话已失效/, 'missing credentials must not log out a remembered account');
assert.equal(unsigned.changes.length, 0);
unsigned.store.delete(key);
assert.equal(await unsigned.api.getCloudSession(), null, 'a guest without remembered credentials remains signed out');
let refreshing = true;
const refresh = createAuth(async () => refreshing ? null : { user: { ...session, email: session.account } });
await assert.rejects(refresh.api.getCloudSession(), /登录会话已失效/);
refreshing = false;
assert.equal((await refresh.api.getCloudSession()).uid, session.uid, 'refresh recovery must restore verified access without signing in again');
assert.equal(refresh.changes.length, 0, 'refresh recovery must not broadcast a false logout');
const networkFailure = createAuth(async () => { throw new Error('network unavailable'); });
await assert.rejects(networkFailure.api.getCloudSession(), /network unavailable/, 'network errors must remain visible');
console.log('PASS real account ID, account label, anonymous rejection, stale currentUser rejection');

const authenticatedUser = { id: '2064712423935315968', email: '49001422@qq.com' };
const responseLogin = createAuth(async () => { throw new Error('credentials not found'); }, {
  data: { session: { user: authenticatedUser }, user: authenticatedUser }
});
assert.equal((await responseLogin.api.signInWithPassword('49001422@qq.com', 'test-password')).uid, authenticatedUser.id,
  'successful authentication response must survive delayed session storage');
assert.equal(responseLogin.api.getRememberedSession().account, authenticatedUser.email);

const valid = () => ({ user: { id: session.uid, email: session.account }, expires_at: Math.floor(Date.now() / 1000) + 3600 });
let concurrentChecks = 0;
const concurrent = createAuth(async () => { concurrentChecks++; await Promise.resolve(); return valid(); }, undefined, { remembered: false });
const results = await Promise.all(Array.from({ length: 12 }, () => concurrent.api.getCloudSession()));
assert.ok(results.every(result => result?.uid === session.uid), 'parallel consumers must not invalidate each other');
assert.equal(concurrentChecks, 1, 'one SDK check must serve all concurrent consumers');
assert.equal(concurrent.changes.length, 1, 'a verified identity change is broadcast only once');

const renewed = createAuth(async () => valid());
renewed.store.set(key, JSON.stringify({ ...session, expiresAt: Date.now() - 1 }));
assert.equal((await renewed.api.getCloudSession())?.uid, session.uid, 'display-cache expiry must not sign out a valid SDK session');
assert.equal(renewed.signOuts, 0);
assert.equal(renewed.changes.length, 0, 'renewing the same identity must not reset page state');
assert.ok(JSON.parse(renewed.store.get(key)).expiresAt > Date.now());

let tokenRefreshed = false;
const tokenExpiry = createAuth(async () => ({ ...valid(), expires_at: Math.floor(Date.now() / 1000) + (tokenRefreshed ? 3600 : -1) }), undefined, {
  refresh: async () => { tokenRefreshed = true; return { data: { session: valid() } }; }
});
assert.equal((await tokenExpiry.api.getCloudSession())?.uid, session.uid);
assert.equal(tokenExpiry.refreshes, 1, 'expired access tokens must be renewed through the SDK');
assert.equal(tokenExpiry.changes.length, 0, 'token renewal is not an account change');

let networkOnline = false;
const retryRenewal = createAuth(async () => ({ ...valid(), expires_at: Math.floor(Date.now() / 1000) - 1 }), undefined, {
  refresh: async () => {
    if (!networkOnline) throw new Error('network unavailable');
    return { data: { session: valid() } };
  }
});
await assert.rejects(retryRenewal.api.getCloudSession(), /network unavailable/);
assert.equal(retryRenewal.changes.length, 0);
networkOnline = true;
assert.equal((await retryRenewal.api.getCloudSession())?.uid, session.uid, 'a failed refresh must not poison future retries');

let resolveOtherTab;
const crossTab = createAuth(() => new Promise(resolve => { resolveOtherTab = resolve; }));
const oldTabCheck = crossTab.api.getCloudSession();
crossTab.store.delete(key);
crossTab.listeners.get('storage')?.({ key, newValue: null });
resolveOtherTab(valid());
assert.equal(await oldTabCheck, null, 'an in-flight check must not undo logout in another tab');
assert.equal(crossTab.store.has(key), false);

console.log('PASS concurrent checks, cache expiry, SDK renewal, network recovery, cross-tab logout');

let resolveLogin;
const cancelledLogin = createAuth(async () => null, () => new Promise(resolve => { resolveLogin = resolve; }));
const loginRequest = cancelledLogin.api.signInWithPassword('test@example.com', 'fixture-password');
await Promise.resolve();
await cancelledLogin.api.signOut();
resolveLogin({ data: { session: valid() } });
await assert.rejects(loginRequest, /登录操作已取消/, 'late password responses must not undo an explicit logout');
assert.equal(cancelledLogin.store.has(key), false);
console.log('PASS logout during password authentication');

for (const missing of [false, true]) {
  const recoverable = createAuth(async () => {
    if (missing) throw new Error('credentials not found');
    return null;
  }, undefined, { refresh: async () => ({ data: { session: valid() } }) });
  assert.equal((await recoverable.api.getCloudSession())?.uid, session.uid, 'empty or missing access credentials must attempt SDK renewal');
  assert.equal(recoverable.refreshes, 1);
  assert.equal(recoverable.changes.length, 0, 'recovery must not broadcast logout or reset reading');
}
const revoked = createAuth(async () => null, undefined, { refresh: async () => { throw new Error('credentials not found'); } });
await assert.rejects(revoked.api.getCloudSession(), error => error.code === 'SITE_AUTH_REQUIRED' && /重新登录/.test(error.message));
assert.ok(revoked.store.has(key), 'reauthentication must preserve account data');
assert.equal(revoked.signOuts, 0);
assert.equal(revoked.changes.length, 0);
const offlineRestore = createAuth(async () => null, undefined, { refresh: async () => { throw new Error('network unavailable'); } });
await assert.rejects(offlineRestore.api.getCloudSession(), error => error.code !== 'SITE_AUTH_REQUIRED' && /network unavailable/.test(error.message));
console.log('PASS missing-session renewal, reauthentication classification, offline preservation');
