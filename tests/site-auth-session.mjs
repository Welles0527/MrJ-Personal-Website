import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/scripts/site-auth.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;

let realSession;
const auth = {
  currentUser: { uid: 'stale-user', email: 'stale@example.com' },
  async getLoginState() { return { user: this.currentUser }; },
  async getSession() { return { data: realSession ? { session: realSession, user: realSession.user } : { session: undefined } }; }
};
const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  },
  dispatchEvent() {}
};
globalThis.CustomEvent = class { constructor(type, options) { this.type = type; this.detail = options.detail; } };
const module = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  () => ({ default: { init: () => ({ auth: () => auth, database: () => ({}) }) } }),
  module,
  module.exports
);

assert.equal(await module.exports.getCloudSession(), null, '旧登录状态不能冒充可用于云端读写的会话');
realSession = { user: { id: 'real-user', email: 'reader@example.com' } };
assert.deepEqual(await module.exports.getCloudSession(), { uid: 'real-user', account: 'reader@example.com' });
console.log('Site auth session regression test passed.');
