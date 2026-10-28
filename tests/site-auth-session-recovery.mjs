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
  const events = [], listeners = {}, calls = { read: 0, refresh: 0 };
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
    window: { localStorage: { getItem: k => cache.get(k) ?? null, setItem: (k, v) => cache.set(k, v), removeItem: k => cache.delete(k) }, addEventListener: (name, fn) => (listeners[name] ||= []).push(fn), dispatchEvent: e => { events.push(e); for (const fn of listeners[e.type] || []) fn(e); } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } }
  });
  return { api: module.exports, calls, cache, events, auth, listeners };
}
{
  const t = setup();
  await assert.rejects(t.api.getCloudSession(), e => e.code === 'SITE_AUTH_REQUIRED');
  assert.equal(t.calls.refresh, 1, 'one guarded SDK renewal before requesting login');
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
for (const format of ['seconds', 'milliseconds', 'date', 'iso']) {
  const t = setup({ read: () => {
    const r = valid(); const expiry = Date.now() + 30000;
    r.data.session.expires_at = format === 'seconds' ? expiry / 1000 : format === 'milliseconds' ? expiry : format === 'date' ? new Date(expiry) : new Date(expiry).toISOString();
    return r;
  }, refresh: valid });
  assert.equal((await t.api.getCloudSession()).uid, 'owner');
  assert.equal(t.calls.refresh, 1, `${format} expiry must renew before expiry`);
}
{
  const t = setup({ refresh: valid });
  assert.equal((await t.api.getCloudSession()).uid, 'owner', 'recoverable empty session renews without logout');
  assert.equal(t.calls.refresh, 1);
}
{
  let offline = true;
  const t = setup({ refresh: () => { if (offline) throw new Error('network timeout'); return valid(); } });
  await assert.rejects(t.api.getCloudSession(), e => e.message === 'network timeout' && e.code !== 'SITE_AUTH_REQUIRED');
  assert.equal(t.events.length, 0);
  offline = false;
  assert.equal((await t.api.getCloudSession()).uid, 'owner', 'network recovery needs no login or logout');
}
console.log('PASS SDK Date/ISO/second/millisecond expiry and recoverable empty-session/network recovery');
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

{
  const t = setup({ read: valid });
  await t.api.getCloudSession();
  const before = t.events.length;
  await t.api.signInWithPassword('owner@example.test', 'fixture');
  assert.ok(t.events.slice(before).some(e => e.type === 'site-auth-change' && e.detail?.uid === 'owner'), 'same-account reauthentication must notify existing page components without prior logout');
  assert.ok(t.cache.has('mywebsite.site-auth-credentials-version.v1'), 'successful reauthentication must notify other same-origin frames');
}
{
  const t = setup({ read: () => { throw Object.assign(new Error('stale SDK session'), { code: 'invalid_grant' }); }, refresh: valid });
  assert.equal((await t.api.getCloudSession()).uid, 'owner', 'one SDK renewal must be attempted before treating a read failure as terminal');
  assert.equal(t.calls.refresh, 1);
}

{
  const t = setup({ read: valid });
  await t.api.getCloudSession();
  t.listeners.storage[0]({key:'mywebsite.site-auth-credentials-version.v1',oldValue:'before',newValue:'after'});
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(t.events.some(e => e.detail?.reauthenticated), 'another frame must verify SDK credentials and notify same-account recovery');
}
{
  const t = setup({ read: () => { throw Object.assign(new Error('revoked'), { code:'invalid_grant' }); }, refresh: () => { throw Object.assign(new Error('revoked'), { code:'invalid_grant' }); } });
  await assert.rejects(t.api.getCloudSession(), e => e.code==='SITE_AUTH_REQUIRED');
  assert.equal(t.calls.refresh,1,'genuinely revoked credentials stop after one renewal');
  assert.equal(t.events.length,0,'remembered identity must not authorize a revoked session');
}
console.log('PASS same-account notification, cross-frame credential verification, guarded renewal and genuine revocation');
