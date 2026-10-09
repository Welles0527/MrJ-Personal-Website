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

function createAuth(getLoginState, loginResult) {
  const store = new Map([[key, JSON.stringify({ ...session, expiresAt: Date.now() + 60000 })]]);
  const changes = [];
  const exports = {};
  const context = vm.createContext({
    exports, Date, Promise, Error,
    setTimeout: callback => setTimeout(callback, 0),
    cloudbase: { init: () => ({ auth: () => ({ getSession: async () => {
      const state = await getLoginState();
      return { data: { session: state ? { user: state.user } : null } };
    }, signInWithPassword: async () => loginResult, currentUser: { uid: 'stale-anonymous-id' }, signOut: async () => undefined }), database: () => ({}) }) },
    window: {
      localStorage: { getItem: name => store.get(name) ?? null, setItem: (name, value) => store.set(name, value), removeItem: name => store.delete(name) },
      dispatchEvent: event => changes.push(event)
    },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  });
  vm.runInContext(compiled, context);
  return { api: exports, store, changes };
}

let checks = 0;
const delayed = createAuth(async () => ++checks < 3 ? null : { user: { ...session, email: session.account } });
assert.equal((await delayed.api.getCloudSession())?.uid, session.uid, 'a remembered session must survive delayed SDK restoration');
assert.ok(delayed.store.has(key), 'startup must not clear the remembered account before restoration completes');
assert.equal(delayed.changes.length, 0, 'transient null states must not broadcast a logout');

const expired = createAuth(async () => null);
assert.equal(await expired.api.getCloudSession(), null);
assert.equal(expired.store.has(key), false, 'a session that cannot be restored must still be cleared');

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
assert.equal(await anonymous.api.getCloudSession(), null, 'anonymous sessions must not be accepted as personal accounts');
const unsigned = createAuth(async () => { throw new Error('credentials not found'); });
assert.equal(await unsigned.api.getCloudSession(), null, 'missing credentials means signed out, not sync failure');
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
