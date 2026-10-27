import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync(new URL('../src/scripts/site-auth.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const valid = () => ({ data: { session: { sub: 'owner', user: { id: 'owner', email: 'owner@example.test' }, expires_at: Date.now() / 1000 + 3600 } } });
function setup(overrides = {}, remembered = true) {
  const cache = new Map(remembered ? [['mywebsite.site-auth-session.v1', JSON.stringify({ uid: 'owner', account: 'owner@example.test', expiresAt: Date.now() + 3600000 })]] : []);
  const events = [], calls = { read: 0, refresh: 0 };
  const auth = {
    getSession: async () => { calls.read++; return overrides.read ? overrides.read(calls.read) : { data: { session: null } }; },
    refreshSession: async () => { calls.refresh++; return overrides.refresh ? overrides.refresh() : Promise.reject(new TypeError("Cannot read properties of null (reading 'refresh_token')")); },
    signInWithPassword: async () => valid(),
    signOut: async () => ({ error: null })
  };
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: () => ({ default: { init: () => ({ auth: () => auth, database: () => ({}) }) } }),
    Date, Promise, setTimeout, clearTimeout, setInterval: () => 0, navigator: {},
    document: { addEventListener() {}, visibilityState: 'visible' },
    window: { localStorage: { getItem: k => cache.get(k) ?? null, setItem: (k, v) => cache.set(k, v), removeItem: k => cache.delete(k) }, addEventListener() {}, dispatchEvent: e => events.push(e) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } }
  });
  return { api: module.exports, calls, cache, events, auth };
}
{
  const t = setup();
  await assert.rejects(t.api.getCloudSession(), e => e.code === 'SITE_AUTH_REQUIRED');
  assert.equal(t.calls.refresh, 0, 'never refresh a missing session');
  assert.equal(t.calls.read, 3, 'allow delayed restoration before requesting login');
  assert.equal(t.cache.size, 1, 'do not clear cached account or drafts');
  assert.equal(t.events.length, 0, 'do not broadcast automatic logout');
}
{
  const t = setup({ read: n => n < 3 ? { data: { session: null } } : valid() });
  assert.equal((await t.api.getCloudSession()).uid, 'owner');
  assert.equal(t.calls.refresh, 0);
}
for (const path of ['read', 'refresh']) {
  const t = setup({ read: () => { if (path === 'read') throw new TypeError("Cannot read properties of null (reading 'refresh_token')"); throw Object.assign(new Error('expired'), { code: 'access_token_expired' }); } });
  await assert.rejects(t.api.getCloudSession(), e => e.code === 'SITE_AUTH_REQUIRED' && !e.message.includes('refresh_token'));
  assert.equal(t.events.length, 0);
}
{
  const t = setup({ read: () => { throw new Error('network timeout'); } });
  await assert.rejects(t.api.getCloudSession(), e => e.message === 'network timeout' && !e.code);
  assert.equal(t.calls.refresh, 0); assert.equal(t.events.length, 0);
}
{
  const t = setup({ read: () => { const r = valid(); r.data.session.expires_at = 1; return r; }, refresh: valid });
  assert.equal((await t.api.getCloudSession()).uid, 'owner'); assert.equal(t.calls.refresh, 1);
}
{
  const t = setup({ read: () => { throw Object.assign(new Error('expired'), { code: 'access_token_expired' }); }, refresh: () => ({ data: null }) });
  await assert.rejects(t.api.getCloudSession(), e => e.code === 'SITE_AUTH_REQUIRED');
}
{
  const t = setup({}, false); assert.equal(await t.api.getCloudSession(), null); assert.equal(t.calls.refresh, 0);
}
{
  const t = setup(); await assert.rejects(t.api.getCloudSession());
  await t.api.signInWithPassword('owner@example.test', 'fixture'); t.auth.getSession = async () => valid();
  assert.equal((await t.api.getCloudSession()).uid, 'owner', 'same-account re-login recovers without signout');
}
console.log('PASS site-auth empty-session guard, delayed restoration, null refresh classification, network retry, renewal, empty refresh result, guest and same-account re-login');
{
  const t = setup({read:valid});
  await t.api.signInWithPassword('owner@example.test','fixture');
  const deadline = Number(t.cache.get('mywebsite.site-auth-deadline.v1'));
  assert.ok(Math.abs(deadline-Date.now()-30*86400000)<1000);
  await t.api.getCloudSession();
  assert.equal(Number(t.cache.get('mywebsite.site-auth-deadline.v1')),deadline,'refresh must not extend the absolute login period');
  t.cache.set('mywebsite.site-auth-deadline.v1',String(Date.now()-1));
  await assert.rejects(t.api.getCloudSession(), e=>e.code==='SITE_AUTH_REQUIRED');
  assert.equal(await t.api.getCloudSession(),null);
  console.log('PASS 30-day absolute deadline and expiry');
}
