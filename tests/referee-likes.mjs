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
