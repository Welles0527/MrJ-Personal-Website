import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {aggregate,codesFrom,parseHotmap,handle}=require('../cloudfunctions/stock-tracking-live/dashboard.cjs');
const codes=['000001','301026','688633','603507','302132','689009','920002'];
const market=code=>code.startsWith('6')?'1':'0';
const baseRow=code=>['name','industry','sector','size',market(code),code,',hsj,market,'].join('|');
const quoteRow=(code,change=0,price=10)=>{
  const fields=Array(17).fill('');fields[0]=market(code);fields[1]=code;fields[2]=String(change);fields[12]=String(price);return fields.join('|');
};
const base={re:true,baseinfo:codes.map(baseRow)};
const quoteTime=Date.parse('2026-11-05T15:00:00+08:00')/1000;
const fullQuote={quotetime:quoteTime,data:codes.map(code=>quoteRow(code))};
const parsed=parseHotmap(base,fullQuote);
assert.equal(parsed.names.size,7);assert.equal(parsed.rows.size,7);assert.deepEqual(parsed.missing,[]);assert.equal(parsed.quoteTime,quoteTime);
assert.deepEqual(aggregate([...parsed.rows.values()],7),{up:0,flat:7,down:0,unavailable:0,total:7});

// The provider universe, not the account watchlist, determines the denominator.
const partialQuote={quotetime:quoteTime,data:[quoteRow('000001',0.000001),quoteRow('301026',-0.000001),quoteRow('688633'),quoteRow('603507','-','-'),'U2FsdGVkX1-opaque-1','U2FsdGVkX1-opaque-2',quoteRow('920002')]};
const partial=parseHotmap(base,partialQuote);
assert.deepEqual(partial.missing,['302132','689009']);
assert.equal(partial.rows.size,5);
assert.deepEqual(aggregate([...partial.rows.values()],5),{up:1,flat:2,down:1,unavailable:1,total:5});
assert.throws(()=>aggregate([...partial.rows.values()],7),/不完整/);

for(const code of ['810011','6000000','bad']){
  const invalid={...base,baseinfo:[baseRow(code),...base.baseinfo.slice(1)]};
  assert.throws(()=>parseHotmap(invalid,fullQuote),/范围异常/);
  assert.throws(()=>aggregate([{code,price:10,change:0}],1),/无效股票/);
}
assert.throws(()=>parseHotmap({...base,re:false},fullQuote));
assert.throws(()=>parseHotmap({...base,baseinfo:[base.baseinfo[1],...base.baseinfo.slice(1)]},fullQuote),/重复/);
assert.throws(()=>parseHotmap({...base,baseinfo:[base.baseinfo[0].replace(',hsj,',',fund,'),...base.baseinfo.slice(1)]},fullQuote));
assert.throws(()=>parseHotmap({...base,baseinfo:[base.baseinfo[0].replace('|0|000001|','|1|000001|'),...base.baseinfo.slice(1)]},fullQuote));
assert.throws(()=>parseHotmap(base,{...fullQuote,data:fullQuote.data.slice(1)}),/不完整/);
assert.throws(()=>parseHotmap(base,{...fullQuote,data:[fullQuote.data[1],...fullQuote.data.slice(1)]}),/不一致/);
assert.throws(()=>parseHotmap(base,{...fullQuote,data:[quoteRow('810011'),...fullQuote.data.slice(1)]}),/不一致/);
assert.throws(()=>parseHotmap(base,{...fullQuote,data:[quoteRow('000001').slice(2),...fullQuote.data.slice(1)]}));
assert.throws(()=>parseHotmap(base,{...fullQuote,data:[quoteRow('000001').replace(/^0\|/,'1|'),...fullQuote.data.slice(1)]}));
assert.throws(()=>parseHotmap(base,{...fullQuote,quotetime:0}));
assert.throws(()=>parseHotmap(base,{...fullQuote,quotetime:'20261105'}));
assert.throws(()=>aggregate([{code:'000001',price:10,change:0},{code:'000001',price:10,change:0}],2),/重复/);
for(const price of [null,undefined,'',0,-1,NaN,Infinity,'-',false]){
  assert.equal(aggregate([{code:'000001',price,change:1}],1).unavailable,1);
}
for(const change of [null,undefined,'',NaN,Infinity,'-',false]){
  assert.equal(aggregate([{code:'000001',price:10,change}],1).unavailable,1);
}
assert.deepEqual(aggregate([{code:'302132',price:'10',change:'0.000001'},{code:'689009',price:10,change:-0.000001}],2),{up:1,flat:0,down:1,unavailable:0,total:2});
assert.deepEqual(codesFrom('688633,301026,688633'),['688633','301026']);
assert.deepEqual(codesFrom('302132,689009'),['302132','689009']);
assert.deepEqual(codesFrom(''),[]);assert.throws(()=>codesFrom('bad'));assert.throws(()=>codesFrom('810011'));
assert.throws(()=>codesFrom(Array.from({length:201},(_,i)=>String(i+1).padStart(6,'0')).join(',')));

function tencentRow(code,change,time,price=10){
  const fields=Array(35).fill('');fields[1]='test';fields[2]=code;fields[3]=String(price);fields[30]=time;fields[31]=String(change);fields[32]='0.00';
  return `v_${code.startsWith('6')?'sh':'sz'}${code}="${fields.join('~')}";`;
}
const originalFetch=globalThis.fetch;
let omitOne=true,badTime=false,zeroPrice=false,calls=0;
try{
  globalThis.fetch=async input=>{
    const url=new URL(input);calls++;
    if(url.pathname==='/stockhotmap/api/getquotebasedata')return new Response(JSON.stringify(base));
    if(url.pathname==='/stockhotmap/api/getquotedata')return new Response(JSON.stringify(partialQuote));
    assert.equal(url.hostname,'qt.gtimg.cn','Tests must never call an unmocked provider');
    assert.deepEqual(new Set(url.pathname.replace(/^\/q=/,'').split(',')),new Set(['sz302132','sh689009']));
    const raw=tencentRow('302132',0.000001,badTime?'':'20261105145958',zeroPrice?0:10)+(omitOne?'':tencentRow('689009',-0.000001,'20261105145950'));
    return new Response(raw);
  };
  const url=new URL('http://localhost/api/stock-tracking-live?dashboard=breadth');
  await assert.rejects(handle(url),/补齐报价不完整/);
  omitOne=false;
  badTime=true;await assert.rejects(handle(url));badTime=false;
  const result=await handle(url);
  assert.deepEqual([result.total,result.up,result.down,result.flat,result.unavailable],[7,2,2,2,1]);
  assert.equal(result.up+result.down+result.flat+result.unavailable,result.total);
  assert.equal(result.supplemented,2);
  assert.equal(result.quoteTime,quoteTime,'Preserve source report time, never replace with the fetch time');
  assert.equal(result.supplementQuoteTimeFrom,'20261105145950');
  assert.equal(result.supplementQuoteTimeTo,'20261105145958');
  assert.ok(Number.isFinite(Date.parse(result.startedAt))&&Date.parse(result.fetchedAt)>=Date.parse(result.startedAt));
  const cachedCalls=calls;assert.deepEqual(await handle(url),result);assert.equal(calls,cachedCalls,'Successful snapshots are cached; failed partial snapshots are not');
  // A suspended/unavailable quote remains in the universe without inventing a timestamp.
  delete require.cache[require.resolve('../cloudfunctions/stock-tracking-live/dashboard.cjs')];
  zeroPrice=true;badTime=true;
  const unavailable=await require('../cloudfunctions/stock-tracking-live/dashboard.cjs').handle(url);
  assert.deepEqual([unavailable.total,unavailable.up,unavailable.down,unavailable.flat,unavailable.unavailable],[7,1,2,2,2]);
  assert.equal(unavailable.supplementQuoteTimeFrom,'20261105145950');
  assert.equal(unavailable.supplementQuoteTimeTo,'20261105145950');
}finally{globalThis.fetch=originalFetch;}
console.log('PASS full A-share universe, malformed snapshots, unavailable/tiny changes, complete Tencent supplementation, timestamps and cache');
