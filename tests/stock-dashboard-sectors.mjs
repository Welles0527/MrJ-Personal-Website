import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const modulePath=require.resolve('../cloudfunctions/stock-tracking-live/dashboard.cjs');
const freshHandle=()=>{delete require.cache[modulePath];return require(modulePath).handle;};
const url=group=>new URL('http://localhost/api/stock-tracking-live?dashboard=sector'+(group===undefined?'':'&group='+encodeURIComponent(group)));
const quoteTime=Date.parse('2026-11-06T15:00:00+08:00')/1000;
const row=(id,overrides={})=>({f12:id,f14:'股票'+id,f13:id.startsWith('6')?1:0,f2:10,f3:0,f18:10,f20:100000000,f124:quoteTime,...overrides});
const semiconductors=Array.from({length:123},(_,i)=>row(String(688100+i)));
const records={BK1036:semiconductors,BK0475:[row('000001'),row('600000')],BK0464:[row('600000'),row('600028')],BK0473:[row('600030')]};
const calls=[];
let fault='';
const originalFetch=globalThis.fetch;
try{
  globalThis.fetch=async input=>{
    const request=new URL(input);
    assert.equal(request.hostname,'push2.eastmoney.com','Never contact an unmocked provider');
    assert.equal(request.pathname,'/api/qt/clist/get');
    assert.equal(request.searchParams.get('pz'),'100');
    assert.equal(request.searchParams.get('fid'),'f12','Stable code order prevents price changes shifting pages');
    assert.equal(request.searchParams.get('po'),'0');
    assert.equal(request.searchParams.get('np'),'1');
    assert.equal(request.searchParams.get('fltt'),'2');
    assert.ok(request.searchParams.get('fields').split(',').includes('f20'));
    const board=request.searchParams.get('fs').slice(2),page=Number(request.searchParams.get('pn'));
    assert.ok(records[board]);calls.push({board,page});
    const source=records[board],data={total:source.length,diff:structuredClone(source.slice((page-1)*100,page*100))};
    if(fault==='missing-page'&&page===2)data.diff.pop();
    if(fault==='changed-total'&&page===2)data.total++;
    if(fault==='duplicate'&&page===2)data.diff[0]=structuredClone(source[0]);
    if(fault==='bad-code')data.diff[0].f12='810011';
    if(fault==='bad-market')data.diff[0].f13=1-data.diff[0].f13;
    if(fault==='empty')data.diff=[];
    return new Response(JSON.stringify({rc:fault==='source-error'?1:0,data}));
  };
  let handle=freshHandle();
  for(const group of [undefined,'','unknown','__proto__','constructor'])await assert.rejects(handle(url(group)),/无效行业分组/);
  assert.equal(calls.length,0,'Invalid groups must not access the provider');

  const full=await handle(url('semiconductors'));
  assert.equal(full.total,123);assert.equal(full.stocks.length,123);
  assert.deepEqual(calls,[{board:'BK1036',page:1},{board:'BK1036',page:2}]);
  assert.deepEqual(full.boards,[{id:'BK1036',name:'半导体',total:123}]);
  assert.equal(full.stocks[0].time,'20261106150000');
  assert.equal(full.stocks[0].marketCap,100000000);
  assert.equal(full.stocks[0].previous,10);
  assert.equal(full.stocks[0].change,0,'Real flat quotes remain zero');
  assert.ok(Number.isFinite(Date.parse(full.fetchedAt)));
  const cachedCalls=calls.length;assert.deepEqual(await handle(url('semiconductors')),full);
  assert.equal(calls.length,cachedCalls,'Complete snapshots are cached');

  const merged=await handle(url('bank-oil'));
  assert.deepEqual(merged.stocks.map(stock=>stock.id),['000001','600000','600028']);
  assert.equal(merged.total,3,'Overlapping constituents are counted once in the combined group');
  assert.deepEqual(merged.boards.map(board=>board.total),[2,2]);
  assert.equal((await handle(url('securities'))).total,1);

  for(const mode of ['missing-page','changed-total','duplicate','bad-code','bad-market','empty','source-error']){
    fault=mode;handle=freshHandle();
    await assert.rejects(handle(url('semiconductors')),/无效|不完整|重复/);
    const beforeRecovery=calls.length;
    fault='';assert.equal((await handle(url('semiconductors'))).total,123);
    assert.equal(calls.length,beforeRecovery+2,'A rejected partial snapshot must never be cached');
  }

  records.BK0473=[row('600030',{f2:'-',f3:'-',f18:'-',f20:'-',f124:'-'}),row('601688',{f2:'12.50',f3:'-1.23',f18:'12.66',f20:'200000000',f124:String(quoteTime)})];
  const suspended=await freshHandle()(url('securities'));
  assert.equal(suspended.total,2,'Unavailable quotes remain in the full constituent list');
  assert.deepEqual(suspended.stocks[0],{id:'600030',name:'股票600030',price:null,previous:null,change:null,marketCap:null,time:''});
  assert.deepEqual(suspended.stocks[1],{id:'601688',name:'股票601688',price:12.5,previous:12.66,change:-1.23,marketCap:200000000,time:'20261106150000'});
  console.log('PASS sector allowlist, complete pagination, failed-page rejection, per-board uniqueness, combined deduplication, cache and unavailable quotes');
}finally{globalThis.fetch=originalFetch;}

// Cloud transport failure must retain all members and reject incomplete fallback quotes.
try{
  const base={re:true,bk1:['银行|90|BK1283','石油石化|90|BK0464','非银金融|90|BK1203','电子|90|BK1201'],bk2:['银行Ⅱ|90|BK0475','证券Ⅱ|90|BK0473','半导体|90|BK1036'],bk3:[],baseinfo:['0|0|0|平安银行|0|000001|,hsj,','1|-1|0|中国石化|1|600028|,hsj,','2|1|0|中信证券|1|600030|,hsj,','3|2|0|半导体测试|1|688001|,hsj,']};
  let mode='',baseCalls=0;
  globalThis.fetch=async input=>{
    const request=new URL(input);
    if(request.hostname==='push2.eastmoney.com')throw new TypeError('fetch failed');
    if(request.hostname==='quote.eastmoney.com'){
      baseCalls++;const value=structuredClone(base);
      if(mode==='missing-board')value.bk2[1]='其他|90|BK9999';
      if(mode==='duplicate-member')value.baseinfo.push(value.baseinfo[0]);
      return new Response(JSON.stringify(value));
    }
    assert.equal(request.hostname,'qt.gtimg.cn');
    const symbols=request.pathname.slice(3).split(',');
    const lines=symbols.map(symbol=>{
      const id=symbol.slice(2),fields=Array(46).fill('');
      fields[1]='Stock';fields[2]=id;fields[3]=mode==='suspended'?'0':'12.50';fields[4]='12.66';fields[30]=mode==='missing-time'?'':'20261106150000';fields[31]='-0.16';fields[32]='-1.26';fields[45]='123.45';
      return 'v_'+symbol+'="'+fields.join('~')+'";';
    });
    if(mode==='missing-quote')lines.pop();
    if(mode==='duplicate-quote')lines.push(lines[0]);
    return new Response(lines.join('\n'));
  };
  let handle=freshHandle();
  const bank=await handle(url('bank-oil'));
  assert.deepEqual(bank.stocks.map(s=>s.id),['000001','600028']);assert.deepEqual(bank.boards.map(b=>b.total),[1,1]);
  assert.equal(bank.stocks[0].marketCap,12345000000,'Tencent market cap in 100 million yuan must become yuan');
  assert.equal(bank.stocks[0].change,-1.26,'Use percent change, not absolute price change');
  assert.equal(bank.stocks[0].time,'20261106150000');assert.match(bank.source,/东方财富.*腾讯/);
  assert.equal((await handle(url('securities'))).total,1);assert.equal((await handle(url('semiconductors'))).total,1);assert.equal(baseCalls,3,'Every group validates its membership snapshot before caching the result');
  for(const failure of ['missing-board','duplicate-member','missing-quote','duplicate-quote','missing-time']){
    mode=failure;handle=freshHandle();await assert.rejects(handle(url('securities')),/缺失|重复|不完整/);
    mode='';assert.equal((await handle(url('securities'))).total,1,'No partial fallback is cached');
  }
  mode='suspended';const suspended=await freshHandle()(url('securities'));assert.equal(suspended.total,1);assert.equal(suspended.stocks[0].price,null);assert.equal(suspended.stocks[0].change,null);
  console.log('PASS cloud transport fallback, complete Eastmoney membership, Tencent percentages and market-cap units, source, timestamps and missing-quote rejection');
}finally{globalThis.fetch=originalFetch;}

// Every constituent must stay inside the same viewport, including dense mobile maps.
const {readFileSync}=await import('node:fs');
const {runInNewContext}=await import('node:vm');
const dashboardHtml=readFileSync(new URL('../public/stock-dashboard.html',import.meta.url),'utf8');
const layoutStart=dashboardHtml.indexOf('function y1('),layoutEnd=dashboardHtml.indexOf('const v1=',layoutStart);
assert.ok(layoutStart>=0&&layoutEnd>layoutStart);
const layout=runInNewContext(dashboardHtml.slice(layoutStart,layoutEnd)+'; y1');
for(const count of [0,3,91,188,300])for(const [width,height] of [[700,360],[550,350],[323,260]])for(const byMarketCap of [false,true]){
  const stocks=Array.from({length:count},(_,i)=>({id:String(i).padStart(6,'0'),change:i%9===0?null:(i%31-15)/10,marketCap:i%11===0?null:100000000*(1+(count-i)**2)}));
  const cells=layout(stocks,width,height,byMarketCap);
  assert.equal(cells.length,count);assert.equal(new Set(cells.map(cell=>cell.id)).size,count);
  for(const cell of cells)assert.ok(cell.w>0&&cell.h>0&&cell.x>=0&&cell.y>=0&&cell.x+cell.w<=width+1e-7&&cell.y+cell.h<=height+1e-7);
  if(count)assert.ok(Math.abs(cells.reduce((sum,cell)=>sum+cell.w*cell.h,0)-width*height)<1e-6);
  for(let i=0;i<cells.length;i++)for(let j=i+1;j<cells.length;j++){
    const a=cells[i],b=cells[j];
    const overlapWidth=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
    const overlapHeight=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
    assert.ok(overlapWidth<=1e-7||overlapHeight<=1e-7,'Treemap cells must not overlap');
  }
}
console.log('PASS full treemap coverage, nonoverlap, positive cells and viewport bounds for 0–300 stocks on desktop/mobile');
