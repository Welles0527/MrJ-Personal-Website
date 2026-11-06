'use strict';
const cache = new Map();
const pending = new Map();
async function request(url, encoding, signal) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://quote.eastmoney.com/' }, signal: signal || AbortSignal.timeout(16000) });
  if (!response.ok) throw Error('行情源返回 ' + response.status);
  const text = new TextDecoder(encoding || 'utf-8').decode(await response.arrayBuffer());
  return encoding ? text : JSON.parse(text);
}
async function memo(key,ttl,loader){
  const hit=cache.get(key);if(hit&&Date.now()-hit.at<ttl)return hit.value;
  if(pending.has(key))return pending.get(key);
  const work=loader().then(value=>{if(cache.size>300)cache.delete(cache.keys().next().value);cache.set(key,{at:Date.now(),value});return value}).finally(()=>pending.delete(key));pending.set(key,work);return work;
}
const codePattern=/^(?:00[0-3]|30[01]|60[0135]|68[89]|920|43\d|83\d|87\d)\d{3}$/;
function codesFrom(raw){const values=[...new Set(String(raw||'').split(',').filter(Boolean))];if(values.length>200||values.some(c=>!codePattern.test(c)))throw Error('自选股票代码无效或超过200只');return values;}
function symbol(code){return (code.startsWith('6')?'sh':/^(4|8|9)/.test(code)?'bj':'sz')+code}
async function quotes(codes){
  const symbols=['sh000001',...codes.map(symbol)], rows={};
  // Bound query size for large account watchlists.
  for(let i=0;i<symbols.length;i+=60){const raw=await request('https://qt.gtimg.cn/q='+symbols.slice(i,i+60).join(','),'gb18030');
    for(const m of raw.matchAll(/v_(\w+)="([^"]+)"/g)){const f=m[2].split('~');if(f.length<35)continue;rows[m[1]]={id:f[2],name:f[1],price:Number(f[3])||null,previous:Number(f[4])||null,change:f[32]===''?null:Number(f[32]),time:f[30]};}}
  if(!rows.sh000001||!rows.sh000001.price)throw Error('指数报价缺失');
  return {index:rows.sh000001,stocks:codes.map(code=>rows[symbol(code)]||{id:code,name:code,price:null,previous:null,change:null,time:''}),source:'腾讯行情'};
}
function aggregate(records,expected,today){
  const unique=new Map(records.map(r=>[r.f13+':'+r.f12,r]));if(unique.size!==expected)throw Error('全市场分页不完整');
  const eligible=[...unique.values()].filter(r=>codePattern.test(r.f12)&&Number.isInteger(r.f26)&&r.f26>0&&r.f26<=today);
  if(!eligible.length)throw Error('上市A股名单缺失');
  const result={up:0,flat:0,down:0,unavailable:0,total:eligible.length,rawTotal:expected,excluded:expected-eligible.length};
  for(const r of eligible){const valid=typeof r.f3==='number'&&Number.isFinite(r.f3)&&typeof r.f2==='number'&&r.f2>0;result[!valid?'unavailable':r.f3>0?'up':r.f3<0?'down':'flat']++;}
  return {...result,quoteTime:Math.max(...eligible.map(r=>Number(r.f124)||0))};
}
async function breadth(){
  const startedAt=new Date().toISOString();
  // Leave time for a structured response before the existing 20-second cloud timeout.
  const controller=new AbortController(), deadline=setTimeout(()=>controller.abort(),16000);
  try {
  async function page(n){const q=new URLSearchParams({pn:n,pz:100,po:1,np:1,fltt:2,invt:2,fid:'f12',fs:'m:0+t:6+f:!2,m:0+t:80+f:!2,m:1+t:2+f:!2,m:1+t:23+f:!2,m:0+t:81+s:2048+f:!2',fields:'f12,f13,f14,f2,f3,f124,f26'});const r=await request('https://push2.eastmoney.com/api/qt/clist/get?'+q,undefined,controller.signal);if(!r.data||!Array.isArray(r.data.diff))throw Error('全市场行情缺失');return r.data;}
  const first=await page(1), records=[...first.diff];let next=2,failed=false,retries=0;const pages=Math.ceil(first.total/100);
  await Promise.all(Array.from({length:8},async()=>{while(!failed&&next<=pages){
    const n=next++;let part;
    try { part=await page(n); }
    catch(error) {
      if(failed||controller.signal.aborted||retries>=3){failed=true;throw error;}
      retries++;
      await new Promise(resolve=>setTimeout(resolve,500));
      try { part=await page(n); } catch(retryError){failed=true;throw retryError;}
    }
    if(part.total!==first.total){failed=true;throw Error('股票名单发生变化');}records.push(...part.diff);
  }}));
  const today=Number(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-',''));
  return {...aggregate(records,first.total,today),startedAt,fetchedAt:new Date().toISOString(),source:'东方财富 · 沪深北A股'};
  } finally { clearTimeout(deadline);controller.abort(); }
}
async function chart(code,period,index){
  if(!codePattern.test(code)||!['minute','day','week'].includes(period))throw Error('无效股票或周期');
  const secid=(index||code.startsWith('6')?'1.':'0.')+code;
  const q=new URLSearchParams({secid,fields1:'f1,f2,f3,f4,f5,f6,f7,f8',fields2:'f51,f52,f53,f54,f55,f56,f57,f58',ndays:1,iscr:0});
  if(period!=='minute'){q.set('klt',period==='day'?'101':'102');q.set('fqt','1');q.set('lmt','60');q.set('end','20500101');}
  const data=(await request('https://push2his.eastmoney.com/api/qt/stock/'+(period==='minute'?'trends2':'kline')+'/get?'+q)).data;
  const lines=data?.[period==='minute'?'trends':'klines'];if(!lines?.length)throw Error('暂无该周期行情');const v=lines.map(s=>s.split(','));
  return {labels:v.map(s=>s[0]),series:v.map(s=>Number(s[2])),bars:period==='minute'?null:v.map(s=>({open:Number(s[1]),close:Number(s[2]),high:Number(s[3]),low:Number(s[4])}))};
}
async function handle(url){
 const route=url.searchParams.get('dashboard');
 if(route==='quotes'){const codes=codesFrom(url.searchParams.get('codes'));return memo('q:'+codes.join(','),15000,()=>quotes(codes));}
 if(route==='breadth')return memo('breadth',120000,breadth);
 if(route==='chart'){const code=url.searchParams.get('code'),period=url.searchParams.get('period')||'minute',index=url.searchParams.get('index')==='1'&&code==='000001';return memo(`c:${code}:${period}:${index}`,period==='minute'?30000:300000,()=>chart(code,period,index));}
 throw Error('未知看板请求');
}
module.exports={handle,aggregate,codesFrom,chart};
