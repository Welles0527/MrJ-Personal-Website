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
