import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chart}=require('../cloudfunctions/stock-tracking-live/dashboard.cjs');
const originalFetch=globalThis.fetch;
let calls=[];
function reply(payload){
  calls=[];
  globalThis.fetch=async url=>{calls.push(new URL(url));return new Response(JSON.stringify(payload));};
}
const minute={data:{date:'20261105',data:['0930 16.22 2064','0931 16.47 6293']}};
const candle=['2026-11-05','10','11','12','9','1000'];
try{
  reply({code:0,data:{sh000001:minute,sz000001:minute}});
  const index=await chart('000001','minute',true);
  await chart('000001','minute',false);
  assert.deepEqual(calls.map(url=>url.searchParams.get('code')),['sh000001','sz000001']);
  assert.equal(calls[0].pathname,'/appstock/app/minute/query');
  assert.deepEqual(index.labels,['2026-11-05 09:30','2026-11-05 09:31']);
  assert.deepEqual(index.series,[16.22,16.47]);
  assert.equal(index.bars,null);
  assert.equal(index.source,'腾讯行情');
  assert.equal(index.adjustment,'none');

  const candles=Array.from({length:61},(_,i)=>[new Date(Date.UTC(2026,7,1+i)).toISOString().slice(0,10),...candle.slice(1)]);
  reply({code:0,data:{sh688633:{qfqday:candles}}});
  const day=await chart('688633','day',false);
  assert.equal(calls[0].searchParams.get('param'),'sh688633,day,,,60,qfq');
  assert.equal(day.labels.length,60);
  assert.equal(day.labels[0],'2026-08-02');
  assert.deepEqual(day.bars[0],{open:10,close:11,high:12,low:9});
  assert.equal(day.adjustment,'qfq');

  reply({code:0,data:{sz301026:{qfqweek:[candle]}}});
  assert.equal((await chart('301026','week',false)).adjustment,'qfq');
  assert.equal(calls[0].searchParams.get('param'),'sz301026,week,,,60,qfq');
  reply({code:0,data:{bj920002:{day:[candle],week:[candle]}}});
  const beijing=await chart('920002','day',false);
  assert.equal(calls[0].searchParams.get('param'),'bj920002,day,,,60,qfq');
  assert.equal(beijing.labels.length,1,'Do not invent missing Beijing history');
  assert.equal(beijing.adjustment,'none','Do not label raw fallback as adjusted');
  assert.equal((await chart('920002','week',false)).adjustment,'none');
  reply({code:0,data:{bj920002:minute}});
  assert.equal((await chart('920002','minute',false)).series[0],16.22);
  assert.equal(calls[0].searchParams.get('code'),'bj920002');

  for(const payload of [{code:1,data:{}},{code:0,data:{}},{code:0,data:{sz301026:{qfqday:[]}}}]){
    reply(payload);await assert.rejects(chart('301026','day',false));
  }
  for(const line of ['0930 NaN 1','0930 Infinity 1','0930 0 1','2460 10 1']){
    reply({code:0,data:{sz301026:{data:{date:'20261105',data:[line]}}}});
    await assert.rejects(chart('301026','minute',false));
  }
  reply({code:0,data:{sz301026:{data:{data:['0930 10 1']}}}});
  await assert.rejects(chart('301026','minute',false),/日期/);
  for(const rows of [[['2026-11-05','10','11','9','8']],[[...candle.slice(0,2),'',...candle.slice(3)]],[candle,candle]]){
    reply({code:0,data:{sz301026:{qfqday:rows}}});await assert.rejects(chart('301026','day',false));
  }
  reply({code:0,data:{}});
  await assert.rejects(chart('301026','minute',true));
  await assert.rejects(chart('invalid','day',false));
  await assert.rejects(chart('301026','month',false));
  assert.equal(calls.length,0,'Reject invalid input before requesting the provider');
  console.log('PASS Tencent chart mapping, market/index identity, dates, adjustments, limited history and malformed responses');
}finally{globalThis.fetch=originalFetch;}
