import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createHandler}=require('../cloudfunctions/referee-likes/index.js');
const data=new Map();let uid='visitor-a';
const collection={
 doc:id=>({set:async value=>{data.set(id,value);}}),
 where:filter=>({count:async()=>({total:[...data.values()].filter(row=>Object.entries(filter).every(([k,v])=>row[k]===v)).length}),limit:()=>({get:async()=>({data:[...data.values()].filter(row=>Object.entries(filter).every(([k,v])=>row[k]===v))})})}),
 aggregate:()=>({group:()=>({limit:()=>({end:async()=>{const counts={};for(const row of data.values())counts[row.refereeId]=(counts[row.refereeId]||0)+1;return {data:Object.entries(counts).map(([_id,count])=>({_id,count}))};}})})})
};
const handler=createHandler({collection:()=>collection,command:{aggregate:{sum:()=>1}}},()=>uid);
let r=await handler({action:'list'});assert.equal(Object.keys(r.counts).length,22);assert.equal(r.counts['zheng-weili'],0);
await Promise.all(Array.from({length:8},()=>handler({action:'like',refereeId:'zheng-weili'})));
r=await handler({action:'list'});assert.equal(r.counts['zheng-weili'],1);assert.deepEqual(r.liked,['zheng-weili']);
uid='visitor-b';r=await handler({action:'like',refereeId:'zheng-weili'});assert.equal(r.count,2);
r=await handler({action:'list'});assert.equal(r.counts['zheng-weili'],2);assert(r.liked.includes('zheng-weili'));
assert.equal((await handler({action:'like',refereeId:'made-up'})).error,'INVALID_REFEREE');
uid=null;assert.equal((await handler({action:'like',refereeId:'zheng-weili',uid:'spoof'})).error,'AUTH_REQUIRED');
assert.equal((await handler({action:'like',refereeId:'zheng-weili',httpMethod:'POST'})).error,'INVALID_REQUEST');
assert.equal(data.size,2);r=await handler({action:'list'});assert.equal(r.counts['zheng-weili'],2);assert.equal(r.liked.length,0);
const broken=createHandler({collection:()=>({aggregate:()=>{throw Error('database failure');}})},()=>uid);
assert.equal((await broken({action:'list'})).error,'UNAVAILABLE');
console.log('PASS 22 referees, 8 concurrent duplicate likes, 2 visitors, persisted counts, invalid referee, spoofed identity, HTTP rejection, database failure');
uid = 'visitor-a';
const click = { action: 'like', refereeId: 'zheng-weili', requestId: '11111111-1111-4111-8111-111111111111' };
await Promise.all(Array.from({ length: 8 }, () => handler(click)));
assert.equal((await handler({ action: 'list' })).counts['zheng-weili'], 3);
assert.equal((await handler({ ...click, requestId: '22222222-2222-4222-8222-222222222222' })).count, 4);
assert.equal((await handler(click)).count, 4);
uid = 'visitor-b';
assert.equal((await handler(click)).count, 5);
assert.equal((await handler({ ...click, requestId: 'invalid' })).error, 'INVALID_REQUEST');
assert.equal(data.size, 5);
console.log('PASS repeat clicks increase counts; 8 concurrent replays count once; legacy votes and caller isolation preserved');
// Regression for the real SDK's fresh-visitor null-scope error; never replace a personal session.
const fs = await import('node:fs');
const vm = await import('node:vm');
const source = fs.readFileSync(new URL('../public/snooker-calendar/referee-profiles.js', import.meta.url), 'utf8');
const requestCode = source.slice(source.indexOf('  async function requestLikes(payload)'), source.indexOf('  function updateLikeButtons()'));
for (const [personal, message, succeeds] of [[false,"Cannot read properties of null (reading 'scope')",true],[false,'credentials not found',true],[true,"Cannot read properties of null (reading 'scope')",false],[false,'Network unavailable',false]]) {
 let anonymousCalls = 0;
 const context = vm.createContext({ AbortSignal, navigator: {}, localStorage: { getItem: () => personal ? 'personal-account' : null },
  window: { cloudbase: { init: () => ({ auth: () => ({ getSession: async () => ({ error: { message } }), signInAnonymously: async () => { anonymousCalls++; return { data: { session: { access_token: 'isolated-test' } } }; } }) }) } },
  fetch: async () => ({ ok: true, json: async () => ({ data: { response_data: JSON.stringify({ ok: true, counts: {}, liked: [] }) } }) }) });
 vm.runInContext(requestCode,context);
 if (succeeds) { assert.equal((await context.requestLikes({ action: 'list' })).ok,true); assert.equal(anonymousCalls,1); }
 else { await assert.rejects(context.requestLikes({ action: 'list' })); assert.equal(anonymousCalls,0); }
}
console.log('PASS fresh anonymous SDK sessions recover; personal sessions and network failures never become anonymous');
for (const scenario of ['expired-response', 'missing-personal-session', 'expired-session', 'persistent-expiry', 'network-failure']) {
 let refreshes = 0, requests = 0, anonymousCalls = 0;
 const auth = {
  getSession: async () => scenario === 'missing-personal-session' ? { data: { session: null } }
   : scenario === 'expired-session' ? { error: { message: 'access_token_expired' } }
   : { data: { session: { access_token: 'old-token' } } },
  refreshSession: async () => { refreshes++; return { data: { session: { access_token: 'renewed-token' } } }; },
  signInAnonymously: async () => { anonymousCalls++; throw new Error('Must preserve personal identity'); }
 };
 const context = vm.createContext({ AbortSignal, navigator: {}, localStorage: { getItem: () => 'personal-account' },
  window: { cloudbase: { init: () => ({ auth: () => auth }) } },
  fetch: async (_, options) => {
   requests++;
   if (scenario === 'network-failure') throw new Error('Network unavailable');
   const token = JSON.parse(options.body).access_token;
   const body = token === 'old-token' || scenario === 'persistent-expiry' ? { code: 'ACCESS_TOKEN_EXPIRED' }
    : { data: { response_data: JSON.stringify({ ok: true, counts: {}, liked: [] }) } };
   return { ok: true, json: async () => body };
  } });
 vm.runInContext(requestCode, context);
 if (['persistent-expiry', 'network-failure'].includes(scenario)) await assert.rejects(context.requestLikes({ action: 'list' }));
 else assert.equal((await context.requestLikes({ action: 'list' })).ok, true);
 assert.equal(refreshes, scenario === 'network-failure' ? 0 : 1);
 assert.equal(requests, ['expired-response', 'persistent-expiry'].includes(scenario) ? 2 : 1);
 assert.equal(anonymousCalls, 0);
}
console.log('PASS expired token and personal-session recovery; renewal bounded once; no network retry or identity downgrade');
