import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
const source=fs.readFileSync(new URL('../src/scripts/calendar-favorites-cloud.ts',import.meta.url),'utf8');
const code=stripTypeScriptTypes(source.replace(/^import .*?;\s*/,'')).replaceAll('export function ','function ');
const context=vm.createContext({console,queueMicrotask,Date,JSON,Promise,Set,Math,Error,Number,Object,Array,String,encodeURIComponent});
vm.runInContext(code+';globalThis.factory=createCalendarFavoriteSync;globalThis.reduce=reduceFavoriteOperations;',context);
const records=new Map();let readError=false,writeError=false,sequence=0,pausedRead=null;
const clone=x=>JSON.parse(JSON.stringify(x));
const db = {
  collection() {
    return {
      async add(v) { if(writeError==='code')return {code:'PERMISSION_DENIED',message:'write failed'};if(writeError)throw Error('write failed');if(records.has(v._id))throw Error('duplicate operation');records.set(v._id,clone(v));return {data:{}}; },
      where(query) {
        return {
          orderBy() { return this; },
          skip(n) { this.offset=n; return this; },
          limit(n) { this.size=n; return this; },
          async get() {
            if(readError) throw Error('read failed');
            if(pausedRead) await pausedRead;
            return {data:[...records.values()].filter(r=>Object.entries(query).every(([k,v])=>r[k]===v)).sort((a,b)=>a._id.localeCompare(b._id)).slice(this.offset||0,(this.offset||0)+(this.size||100)).map(value=>JSON.parse(JSON.stringify(value),(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).reverse()):item))};
          }
        };
      },
      doc(id) {
        return {
          async set(v) { if(writeError)throw Error('write failed');records.set(id,clone({...v,_id:id}));return {data:{}}; },
          async get() { return {data:records.has(id)?[clone(records.get(id))]:[]}; }
        };
      }
    };
  }
};

function device(initial={},uid=null){const map=new Map(Object.entries(initial));const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v))};let account=uid;const statuses=[];const api=context.factory({storage,db,session:async()=>account?{uid:account}:null,remembered:()=>account?{uid:account}:null,emit(){},status:s=>statuses.push(clone(s)),uuid:()=>String(++sequence).padStart(10,'0')});return {api,storage,map,statuses,setAccount(uid){account=uid;api.accountChanged()},records(){return JSON.parse(storage.getItem('cue-match-favorites')||'{}')},async settle(){for(let i=0;i<4;i++){await api.sync();await new Promise(r=>setTimeout(r,0));}},edit(id,value){const all=this.records();if(value)all[id]=value;else delete all[id];storage.setItem('cue-match-favorites',JSON.stringify(all));api.capture()}}}
const match={eventId:'international',eventName:'国际锦标赛',matchId:'m1',date:'2026-11-08',clock:'10:00',home:'A',away:'B'};
const legacy={'cue-favorites':'["international"]','super-calendar-cue-index':JSON.stringify({international:{name:'国际锦标赛',start:'2026-10-31',end:'2026-11-07'}}),'cue-match-favorites':JSON.stringify({m1:match})};
const phone=device(legacy,'A');await phone.settle();assert.equal(phone.records().m1.home,'A');assert(records.size>=2);
const pc=device({},'A');await pc.settle();assert.equal(pc.records().m1.date,'2026-11-08');assert.equal(pc.storage.getItem('cue-favorites'),'["international"]');
pc.edit('m1',null);await pc.settle();await phone.settle();assert(!phone.records().m1);
const stale=device(legacy,'A');await stale.settle();assert(!stale.records().m1,'a stale device migration must respect an explicit deletion');
pc.edit('m2',{...match,matchId:'m2',date:''});await pc.settle();await phone.settle();assert(phone.records().m2,'undated favorite must still synchronize');
phone.setAccount('B');await phone.settle();assert.deepEqual(phone.records(),{});phone.edit('privateB',{...match,matchId:'privateB'});await phone.settle();await pc.settle();assert(!pc.records().privateB);phone.setAccount('A');await phone.settle();assert(phone.records().m2);assert(!phone.records().privateB);
writeError='code';pc.edit('offline',{...match,matchId:'offline'});await pc.settle();assert(pc.records().offline);assert(pc.api.getState().pending.length>0);assert(pc.statuses.at(-1).mode==='error','SDK code responses must never be treated as success');writeError=false;await pc.api.retry();await pc.settle();await phone.settle();assert(phone.records().offline);
readError=true;const failed=device(legacy,'C');await failed.settle();assert(![...records.values()].some(x=>x.ownerId==='C'),'failed initial load must not write an empty/legacy replacement');readError=false;await failed.api.retry();await failed.settle();assert(failed.records().m1);
let release;pausedRead=new Promise(r=>release=r);const racing=device({},'A');const old=racing.api.sync();racing.setAccount('B');release();pausedRead=null;await old;await racing.settle();assert.equal(racing.api.getState().owner,'B');assert(racing.records().privateB);assert(!racing.records().offline);
phone.setAccount(null);await phone.settle();assert(phone.records().m1,'sign-out restores original guest favorites');assert(!phone.records().privateB && !phone.records().offline,'sign-out must not leak an account projection');
const active=[...records.values()].filter(x=>x.ownerId==='A');assert(!context.reduce(active)['match:m1']);
console.log('PASS: migration, two devices, cancellations/tombstones, undated favorites, account isolation, offline retry, load-before-write, delayed old-account reads, sign-out');
