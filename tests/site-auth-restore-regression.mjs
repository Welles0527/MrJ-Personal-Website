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

function createAuth(getLoginState) {
  const store = new Map([[key, JSON.stringify({ ...session, expiresAt: Date.now() + 60000 })]]);
  const changes = [];
  const exports = {};
  const context = vm.createContext({
    exports, Date, Promise, Error,
    setTimeout: callback => setTimeout(callback, 0),
    cloudbase: { init: () => ({ auth: () => ({ getSession: async () => { const state = await getLoginState(); return { data: { session: state ? { sub: state.user.uid, user: state.user } : null, user: state?.user } }; }, signOut: async () => undefined }), database: () => ({}) }) },
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
