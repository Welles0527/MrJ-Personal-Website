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
const codePattern=/^(?:00[0-3]|30[012]|60[0135]|68[89]|920|43\d|83\d|87\d)\d{3}$/;
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
function numeric(value){return (typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))?Number(value):null;}
function parseHotmap(base,quote){
  if(base?.re!==true||!Array.isArray(base.baseinfo)||!base.baseinfo.length||!Array.isArray(quote?.data)||quote.data.length!==base.baseinfo.length||!Number.isFinite(quote.quotetime)||quote.quotetime<=0)throw Error('东财全市场快照不完整');
  const names=new Map(),rows=new Map();
  for(const line of base.baseinfo){
    if(typeof line!=='string')throw Error('东财股票名单格式无效');
    const f=line.split('|'),code=f[5];
    if(!codePattern.test(code)||f[4]!== (code?.startsWith('6')?'1':'0')||!f[6]?.includes(',hsj,')||names.has(code))throw Error('东财股票名单重复或范围异常');
    names.set(code,{code,market:f[4]});
  }
  for(const line of quote.data){
    if(typeof line!=='string')throw Error('东财报价格式无效');
    // Some public heatmap entries are opaque; fetch these codes from the public Tencent quote service.
    if(line.startsWith('U2FsdGVkX1'))continue;
    const f=line.split('|'),code=f[1];
    if(f.length!==17||!names.has(code)||names.get(code).market!==f[0]||rows.has(code))throw Error('东财报价与名单不一致');
    rows.set(code,{code,price:numeric(f[12]),change:numeric(f[2])});
  }
  return {names,rows,missing:[...names.keys()].filter(code=>!rows.has(code)),quoteTime:quote.quotetime};
}
function aggregate(rows,expected){
  if(!Number.isInteger(expected)||expected<=0||rows.length!==expected||new Set(rows.map(row=>row.code)).size!==expected)throw Error('全市场报价不完整或重复');
  const result={up:0,flat:0,down:0,unavailable:0,total:expected};
  for(const row of rows){
    if(!codePattern.test(row.code))throw Error('无效股票代码');
    const price=numeric(row.price),change=numeric(row.change);
    result[price===null||price<=0||change===null?'unavailable':change>0?'up':change<0?'down':'flat']++;
  }
  return result;
}
async function breadth(){
  const startedAt=new Date().toISOString(),controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),16000);
  try{
    const [base,quote]=await Promise.all(['getquotebasedata?hash=','getquotedata?quotedata_hash='].map(path=>request('https://quote.eastmoney.com/stockhotmap/api/'+path,undefined,controller.signal)));
    const {names,rows,missing,quoteTime}=parseHotmap(base,quote);
    let next=0;const quoteTimes=[];
    await Promise.all(Array.from({length:Math.min(6,Math.ceil(missing.length/60))},async()=>{
      while(next<missing.length){
        const batch=missing.slice(next,next+=60),wanted=new Set(batch.map(symbol));
        const raw=await request('https://qt.gtimg.cn/q='+[...wanted].join(','),'gb18030',controller.signal);
        for(const m of raw.matchAll(/v_(\w+)="([^"]+)"/g)){
          if(!wanted.has(m[1]))continue;
          const f=m[2].split('~'),code=f[2];
          if(f.length<35||symbol(code)!==m[1]||!names.has(code)||rows.has(code))throw Error('腾讯补齐报价格式无效');
          rows.set(code,{code,price:numeric(f[3]),change:numeric(f[31])});
          if(/^\d{14}$/.test(f[30]))quoteTimes.push(f[30]);
          else if(numeric(f[3])>0)throw Error('腾讯补齐报价时间缺失');
          wanted.delete(m[1]);
        }
        if(wanted.size)throw Error('腾讯补齐报价不完整');
      }
    }));
    const result=aggregate([...rows.values()],names.size);
    quoteTimes.sort();
    return {...result,startedAt,fetchedAt:new Date().toISOString(),quoteTime,source:'东方财富大盘星图 + 腾讯行情补齐',supplemented:missing.length,supplementQuoteTimeFrom:quoteTimes[0]||null,supplementQuoteTimeTo:quoteTimes.at(-1)||null,scope:'东财沪深京A股口径（含CDR）'};
  }finally{clearTimeout(deadline);controller.abort();}
}
const sectorGroups = {
  'bank-oil': {name:'银行 + 石油石化',boards:[{id:'BK0475',name:'银行Ⅱ'},{id:'BK0464',name:'石油石化'}]},
  securities: {name:'证券',boards:[{id:'BK0473',name:'证券Ⅱ'}]},
  semiconductors: {name:'半导体',boards:[{id:'BK1036',name:'半导体'}]}
};
function quoteTime(value){
  const seconds=numeric(value);
  if(!Number.isInteger(seconds)||seconds<=0)return '';
  const date=new Date(seconds*1000+8*60*60*1000);
  return Number.isFinite(date.getTime())?date.toISOString().slice(0,19).replace(/\D/g,''):'';
}
async function sectorBoard(board,signal){
  const stocks=new Map(),pageSize=100;
  let total;
  for(let page=1;page===1||page<=Math.ceil(total/pageSize);page++){
    const query=new URLSearchParams({pn:page,pz:pageSize,po:0,np:1,fltt:2,invt:2,fid:'f12',fs:'b:'+board.id,fields:'f12,f14,f13,f2,f3,f18,f20,f124'});
    const payload=await request('https://push2.eastmoney.com/api/qt/clist/get?'+query,undefined,signal);
    const data=payload?.data;
    if(payload?.rc!==0||!Number.isInteger(data?.total)||data.total<=0||data.total>10000||!Array.isArray(data.diff))throw Error(board.name+'板块名单无效');
    if(page===1)total=data.total;
    if(data.total!==total||data.diff.length!==Math.min(pageSize,total-(page-1)*pageSize))throw Error(board.name+'板块分页不完整');
    for(const row of data.diff){
      const id=String(row?.f12||''),market=numeric(row?.f13);
      if(!codePattern.test(id)||market!==(id.startsWith('6')?1:0)||typeof row.f14!=='string'||!row.f14.trim()||stocks.has(id))throw Error(board.name+'板块股票无效或重复');
      const rawPrice=numeric(row.f2),rawPrevious=numeric(row.f18),rawCap=numeric(row.f20);
      const price=rawPrice!==null&&rawPrice>0?rawPrice:null;
      stocks.set(id,{id,name:row.f14.trim(),price,previous:rawPrevious!==null&&rawPrevious>0?rawPrevious:null,change:price===null?null:numeric(row.f3),marketCap:rawCap!==null&&rawCap>0?rawCap:null,time:quoteTime(row.f124)});
    }
  }
  if(stocks.size!==total)throw Error(board.name+'板块成分不完整');
  return {id:board.id,name:board.name,total,stocks:[...stocks.values()]};
}
// The cloud runtime can lose access to push2 while the public hotmap remains available.
// Preserve Eastmoney membership; use complete Tencent quotes rather than partial snapshots.
async function hotmapSector(config){
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),10000);
  try{
    const base=await request('https://quote.eastmoney.com/stockhotmap/api/getquotebasedata?hash=',undefined,controller.signal);
    if(base?.re!==true||!Array.isArray(base.baseinfo)||!base.baseinfo.length)throw Error('东财行业名单不完整');
    const names=new Map();
    for(const line of base.baseinfo){
      if(typeof line!=='string')throw Error('东财行业名单格式无效');
      const f=line.split('|'),id=f[5];
      if(!codePattern.test(id)||f[4]!== (id.startsWith('6')?'1':'0')||!f[6]?.includes(',hsj,')||!f[3]?.trim()||names.has(id))throw Error('东财行业名单重复或范围异常');
      names.set(id,{id,name:f[3].trim(),groups:f.slice(0,3)});
    }
    const members=new Map(),boards=config.boards.map(board=>{
      let selected;
      for(let column=0;column<3;column++){
        const groups=base['bk'+(column+1)];if(!Array.isArray(groups))throw Error('东财行业分类缺失');
        const matches=groups.map((label,index)=>({label,index})).filter(item=>typeof item.label==='string'&&item.label.endsWith('|'+board.id));
        if(matches.length>1)throw Error('东财行业分类重复');
        if(matches.length){selected=[...names.values()].filter(stock=>stock.groups[column]===String(matches[0].index));break;}
      }
      if(!selected?.length)throw Error(board.name+'板块名单缺失');
      for(const stock of selected)members.set(stock.id,stock);
      return {id:board.id,name:board.name,total:selected.length};
    });
    const all=[...members.values()],stocks=new Map();
    await Promise.all(Array.from({length:Math.ceil(all.length/60)},async(_,i)=>{
      const batch=all.slice(i*60,(i+1)*60),wanted=new Set(batch.map(stock=>symbol(stock.id)));
      const raw=await request('https://qt.gtimg.cn/q='+[...wanted].join(','),'gb18030',controller.signal);
      for(const m of raw.matchAll(/v_(\w+)="([^"]+)"/g)){
        const f=m[2].split('~'),id=f[2];
        if(!wanted.has(m[1])||f.length<46||!members.has(id)||symbol(id)!==m[1]||stocks.has(id))throw Error('行业补齐报价无效或重复');
        const p=numeric(f[3]),prev=numeric(f[4]),cap=numeric(f[45]),price=p!==null&&p>0?p:null;
        if(price!==null&&!/^\d{14}$/.test(f[30]))throw Error('行业补齐报价时间缺失');
        stocks.set(id,{id,name:members.get(id).name,price,previous:prev!==null&&prev>0?prev:null,change:price===null?null:numeric(f[32]),marketCap:cap!==null&&cap>0?cap*100000000:null,time:/^\d{14}$/.test(f[30])?f[30]:''});
        wanted.delete(m[1]);
      }
      if(wanted.size)throw Error('行业补齐报价不完整');
    }));
    if(stocks.size!==members.size)throw Error('行业补齐成分不完整');
    return {boards,stocks:[...stocks.values()],source:'东方财富大盘星图成分 + 腾讯行情'};
  }finally{clearTimeout(deadline);controller.abort();}
}
async function sector(group){
  const config=sectorGroups[group];
  const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),5000);
  let boards;
  try{boards=await Promise.all(config.boards.map(board=>sectorBoard(board,controller.signal)));}
  catch(error){
    if(!(error instanceof TypeError)&&!['AbortError','TimeoutError'].includes(error.name)&&!/^行情源返回 (429|5\d\d)$/.test(error.message))throw error;
    clearTimeout(deadline);controller.abort();
    const fallback=await hotmapSector(config);
    return {id:group,name:config.name,stocks:fallback.stocks.sort((a,b)=>a.id.localeCompare(b.id)),total:fallback.stocks.length,source:fallback.source,fetchedAt:new Date().toISOString(),boards:fallback.boards};
  }finally{clearTimeout(deadline);controller.abort();}
  const stocks=new Map();
  for(const board of boards)for(const stock of board.stocks)if(!stocks.has(stock.id))stocks.set(stock.id,stock);
  return {id:group,name:config.name,stocks:[...stocks.values()].sort((a,b)=>a.id.localeCompare(b.id)),total:stocks.size,source:'东方财富行业板块行情',fetchedAt:new Date().toISOString(),boards:boards.map(({id,name,total})=>({id,name,total}))};
}
async function chart(code,period,index){
  if(!codePattern.test(code)||!['minute','day','week'].includes(period)||(index&&code!=='000001'))throw Error('无效股票或周期');
  const ticker=index?'sh000001':symbol(code);
  const minute=period==='minute';
  const query=new URLSearchParams(minute?{code:ticker}:{param:`${ticker},${period},,,60,qfq`});
  const payload=await request('https://web.ifzq.gtimg.cn/appstock/app/'+(minute?'minute/query':'fqkline/get')+'?'+query);
  if(payload?.code!==0)throw Error('走势行情源返回错误');
  const data=payload.data?.[ticker];
  const adjusted=!minute&&Array.isArray(data?.['qfq'+period])&&data['qfq'+period].length>0;
  const lines=minute?data?.data?.data:data?.[adjusted?'qfq'+period:period];
  if(!Array.isArray(lines)||!lines.length)throw Error('暂无该周期行情');
  const validPrice=value=>(typeof value==='number'||(typeof value==='string'&&value.trim()!==''))&&Number.isFinite(Number(value))&&Number(value)>0;
  let labels,series,bars=null;
  if(minute){
    const date=data.data.date;
    if(typeof date!=='string'||!/^\d{8}$/.test(date))throw Error('走势行情日期缺失');
    const rows=lines.map(line=>typeof line==='string'?line.trim().split(/\s+/):[]);
    if(rows.some(row=>!/^\d{4}$/.test(row[0])||Number(row[0].slice(0,2))>23||Number(row[0].slice(2))>59||!validPrice(row[1])))throw Error('分时行情数据不完整');
    const day=`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
    labels=rows.map(row=>`${day} ${row[0].slice(0,2)}:${row[0].slice(2)}`);
    series=rows.map(row=>Number(row[1]));
  }else{
    const rows=lines.slice(-60);
    if(rows.some(row=>!Array.isArray(row)||!/^\d{4}-\d{2}-\d{2}$/.test(row[0])||row.length<5||!row.slice(1,5).every(validPrice)))throw Error('K线行情数据不完整');
    labels=rows.map(row=>row[0]);series=rows.map(row=>Number(row[2]));
    bars=rows.map(row=>({open:Number(row[1]),close:Number(row[2]),high:Number(row[3]),low:Number(row[4])}));
    if(bars.some(bar=>bar.high<Math.max(bar.open,bar.close,bar.low)||bar.low>Math.min(bar.open,bar.close,bar.high)))throw Error('K线行情价格无效');
  }
  if(labels.some((label,i)=>i>0&&label<=labels[i-1]))throw Error('走势行情时间顺序无效');
  return {labels,series,bars,source:'腾讯行情',adjustment:adjusted?'qfq':'none'};
}
async function handle(url){
 const route=url.searchParams.get('dashboard');
 if(route==='quotes'){const codes=codesFrom(url.searchParams.get('codes'));return memo('q:'+codes.join(','),15000,()=>quotes(codes));}
 if(route==='breadth')return memo('breadth',120000,breadth);
 if(route==='sector'){const group=url.searchParams.get('group');if(!Object.prototype.hasOwnProperty.call(sectorGroups,group))throw Error('无效行业分组');return memo('s:'+group,60000,()=>sector(group));}
 if(route==='chart'){const code=url.searchParams.get('code'),period=url.searchParams.get('period')||'minute',index=url.searchParams.get('index')==='1'&&code==='000001';return memo(`c:${code}:${period}:${index}`,period==='minute'?30000:300000,()=>chart(code,period,index));}
 throw Error('未知看板请求');
}
module.exports={handle,aggregate,codesFrom,chart,parseHotmap};
