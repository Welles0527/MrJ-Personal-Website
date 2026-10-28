import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { webcrypto } from 'node:crypto';
const source=fs.readFileSync(new URL('../src/scripts/cloud-backup.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
let uid='a',reads=0,records=Array.from({length:205},(_,i)=>({_id:String(i),ownerId:'a',title:'cloud '+i})),fail=false,change=false;
const db={collection:()=>{let skip=0,limit=100,id=null;const q={where:()=>(id=null,q),orderBy:()=>q,skip:n=>(skip=n,q),limit:n=>(limit=n,q),doc:n=>(id=n,q),get:async()=>{reads++;if(change)uid='b';if(fail)return {error:{message:'offline'}};return {data:id===null?records.slice(skip,skip+limit):records.filter(r=>r._id===id)};}};return q;}};
const mod={exports:{}};
vm.runInNewContext(code,{module:mod,exports:mod.exports,require:()=>({getCloudDb:()=>db,getCloudSession:async()=>uid?{uid,account:uid}:null}),crypto:webcrypto,TextEncoder,Date,console});
const backup=await mod.exports.readCloudBackup('todo');
assert.equal(reads,3);assert.equal(backup.records.length,205);assert.equal(backup.source,'cloud');assert.equal(backup.sha256.length,64);
records=[{_id:'foreign',ownerId:'b'}];await assert.rejects(mod.exports.readCloudBackup('todo'),/账号不匹配/);
records=[{_id:'own',ownerId:'a'}];fail=true;await assert.rejects(mod.exports.readCloudBackup('todo'),/offline/);fail=false;
change=true;await assert.rejects(mod.exports.readCloudBackup('todo'),/账号改变/);change=false;
uid=null;await assert.rejects(mod.exports.readCloudBackup('todo'),/登录/);
console.log('PASS fresh cloud records, pagination, checksum, foreign account, offline and account-switch guards');

uid='a';
const canonical={_id:'a',ownerId:'a',_openid:'a',mergedLegacyRecords:{old:'2026-10-09T11:16:52.594Z'}};
const legacy={_id:'old',ownerId:'old',_openid:'a',updatedAt:'2026-10-09T11:16:52.594Z',notes:['preserved']};
records=[canonical,legacy];
const historical=await mod.exports.readCloudBackup('bible');
assert.equal(JSON.stringify(historical.records),JSON.stringify(records));
for(const invalid of [{...legacy,_openid:'foreign'},{...legacy,ownerId:'other'},{...legacy,updatedAt:'stale'},{...legacy,updatedAt:undefined}]){
 records=[canonical,invalid];await assert.rejects(mod.exports.readCloudBackup('bible'),/账号不匹配/);
}
for(const invalid of [{...canonical,mergedLegacyRecords:{}},{...canonical,ownerId:'foreign'}]){
 records=[invalid,legacy];await assert.rejects(mod.exports.readCloudBackup('bible'),/账号不匹配/);
}
records=[legacy];await assert.rejects(mod.exports.readCloudBackup('bible'),/账号不匹配/);
console.log('PASS verified legacy Bible archive preserved; foreign, stale, missing proof and missing canonical rejected');
