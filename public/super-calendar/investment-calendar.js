(function(){
'use strict';
const cacheKey='a-share-stock-tracking.live-batch.v1',readKey='super-calendar-investment-read';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
const day=v=>{const d=new Date(v);return Number.isFinite(+d)?dayFormat.format(d):''};
let stocks=json(cacheKey,{stocks:{}}).stocks||{},selected='all',notice='正在读取股票动态…',busy=false,last={},read=new Set(json(readKey,[]));
let names={},namesRequest;
function stockName(code,fallback='名称加载中'){
 const name=stocks[code]?.quote?.name||names[code];
 if(!name)loadNames();
 return name||fallback;
}
function stockColor(code){const i=codes().indexOf(code),hues=[34,172,210,277,345,88];return 'hsl('+hues[(i<0?0:i)%hues.length]+' 46% 30%)'}
function loadNames(){
 if(namesRequest)return;
 namesRequest=fetch('../stock-tracking/stock-universe.json').then(r=>{if(!r.ok)throw Error('股票库读取失败');return r.json()})
  .then(d=>{names=Object.fromEntries((d.stocks||[]).map(s=>[s.code,s.name]));draw();notifySummary()}).catch(()=>{});
}
if(!window.DailyBoard)loadNames();
function codes(){return window.StockTrackingAccountStorage?.loadWatchlist(['301026','300750','300308'])||['301026','300750','300308']}
function reminders(period,stockFilter=selected){const now=day(Date.now()),seen=new Set();return codes().flatMap(code=>['announcements','news','events'].flatMap(k=>(stocks[code]?.[k]||[]).map(e=>({...e,code})))).filter(e=>{const d=day(e.publishedAt),key=e.code+'|'+d+'|'+e.title;if(e.eventKind!=='calendar'||(period===now.slice(0,7)&&d<now)||d.slice(0,7)!==period||seen.has(key))return false;seen.add(key);return stockFilter==='all'||stockFilter===e.code}).sort((a,b)=>String(a.publishedAt).localeCompare(String(b.publishedAt)))}
function updateStatus(){return `<p class="codex-note investment-update-status" role="status">${esc(notice)} · 上海时间</p>`}
function drawAnnual(){const el=document.querySelector('#investment-annual');if(!el)return;const year=Number(el.dataset.year),seen=new Set();const es=codes().flatMap(code=>['announcements','news','events'].flatMap(k=>(stocks[code]?.[k]||[]).map(e=>({...e,code})))).filter(e=>{const key=e.code+'|'+day(e.publishedAt)+'|'+e.title;if(e.eventKind!=='calendar'||!day(e.publishedAt).startsWith(year+'-')||seen.has(key))return false;seen.add(key);return true});el.innerHTML='<div class="investment-tools"></div><div class="annual investment-year">'+Array.from({length:12},(_,m)=>{const prefix=year+'-'+String(m+1).padStart(2,'0')+'-',count=new Date(year,m+1,0).getDate(),offset=(new Date(year,m,1).getDay()+6)%7;return `<section class="month-card"><div class="month-top"><button class="month-title" data-invest-month="${m}"><b>${String(m+1).padStart(2,'0')}</b><span>${m+1}月</span></button></div><div class="mini-grid">${['一','二','三','四','五','六','日'].map(d=>'<span class="weekday">'+d+'</span>').join('')}${Array.from({length:offset},()=>'<span></span>').join('')}${Array.from({length:count},(_,i)=>{const d=prefix+String(i+1).padStart(2,'0'),items=es.filter(e=>day(e.publishedAt)===d),summary=items.map(e=>stockName(e.code)+'：'+e.title).join('\n');return `<button class="mini-day" aria-label="${d}${items.length?'，有事项':''}">${i+1}${items.length?`<span class="investment-star">★<span class="investment-tooltip" role="tooltip">${esc(summary)}</span></span>`:''}</button>`}).join('')}</div></section>`}).join('')+'</div>'+updateStatus();el.querySelectorAll('[data-invest-month]').forEach(b=>b.onclick=()=>{state.month=Number(b.dataset.investMonth);state.view='month';render()})}
function draw(){drawAnnual();const el=document.querySelector('#investment-native');if(!el)return;const now=day(Date.now()),year=state.year,month=state.month+1,period=year+'-'+String(month).padStart(2,'0'),es=reminders(period),count=new Date(year,month,0).getDate(),offset=(new Date(year,month-1,1).getDay()+6)%7;el.innerHTML=`<div class="investment-tools"><label><select id="investment-stock" aria-label="选择自选股"><option value="all">全部自选股</option>${codes().map(c=>`<option value="${c}" ${selected===c?'selected':''}>${esc(stockName(c))}</option>`).join('')}</select></label><button id="investment-refresh" ${busy?'disabled':''}>${busy?'刷新中…':'刷新'}</button></div><section class="month-panel investment-month"><div class="calendar-title"><h2>${year}年${month}月</h2><span>${es.length} 项提醒 · ${es.filter(e=>!read.has(e.code+'|'+e.id)).length} 未读</span></div><p class="investment-mobile-hint">左右滑动查看完整周历</p><div class="investment-grid">${['周一','周二','周三','周四','周五','周六','周日'].map(w=>`<div class="weekday">${w}</div>`).join('')}${Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{const n=i-offset+1,d=period+'-'+String(n).padStart(2,'0');return n<1||n>count?'<div class="big-day out"></div>':`<section class="big-day ${d===now?'today':''}"><strong>${n}${d===now?' · 今天':''}</strong>${es.filter(e=>day(e.publishedAt)===d).map(e=>`<button class="investment-event ${read.has(e.code+'|'+e.id)?'is-read':''}" style="--stock-color:${stockColor(e.code)}" data-invest-id="${esc(e.code+'|'+e.id)}"><small>${esc(stockName(e.code))}</small>${esc(e.title)}</button>`).join('')}</section>`}).join('')}</div></section>${!es.length?'<p class="codex-note">当前自选股在所选月份暂无可显示的公司事项。</p>':''}${updateStatus()}`;el.querySelector('#investment-stock').onchange=e=>{selected=e.target.value;draw()};el.querySelector('#investment-refresh').onclick=()=>refresh(true);const heading=document.querySelector('.title-actions'),tools=el.querySelector('.investment-tools');if(heading&&tools){heading.querySelector('.investment-tools')?.remove();heading.prepend(tools)}el.querySelectorAll('[data-invest-id]').forEach(b=>b.onclick=()=>{const e=es.find(e=>e.code+'|'+e.id===b.dataset.investId);if(!e)return;read.add(b.dataset.investId);try{localStorage.setItem(readKey,JSON.stringify([...read]))}catch{}draw();const dialog=document.createElement('dialog');dialog.className='investment-detail';dialog.innerHTML=`<h2>${esc(e.title)}</h2><p>${esc(stockName(e.code))} · ${esc(day(e.publishedAt))}</p><p>${esc(e.summary||e.content||e.detail||'请查看来源公告了解详情。')}</p>${/^https?:\/\//.test(e.url||e.sourceUrl||'')?`<a href="${esc(e.url||e.sourceUrl)}" target="_blank" rel="noopener noreferrer">查看原文 ↗</a>`:''}<button>关闭</button>`;dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();document.body.append(dialog);dialog.showModal()})}
async function fetchBatch(batch,sections,force,now){
 const local=['localhost','127.0.0.1'].includes(location.hostname);
 const url=new URL('/api/stock-tracking-live',local?'https://www.magicj.cn':location.origin);
 url.searchParams.set('codes',batch.join(','));
 url.searchParams.set('include',sections.join(','));
 url.searchParams.set('_',now);
 if(force)url.searchParams.set('force','1');
 const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error('HTTP '+res.status);
 const payload=await res.json();
 if(!Array.isArray(payload.stocks))throw Error('数据格式异常');
 const cache=json(cacheKey,{stocks:{}});cache.stocks||={};
 let complete=true;
 const received=new Set();
 for(const item of payload.stocks){
  const code=String(item.code);
  if(!batch.includes(code))continue;
  const fields={};
  for(const k of sections){
   if(item.errors?.[k]||(k==='quote'?!item.quote:!Array.isArray(item[k]))){complete=false;continue}
   fields[k]=item[k];
  }
  if(!Object.keys(fields).length)continue;
  received.add(code);
  stocks[code]={...stocks[code],...cache.stocks[code],...fields,checkedAt:payload.checkedAt||new Date().toISOString()};
  cache.stocks[code]=stocks[code];
 }
 if(received.size){try{localStorage.setItem(cacheKey,JSON.stringify(cache))}catch{}}
 return complete&&received.size===batch.length;
}
async function refresh(force=false){
 const board=Boolean(window.DailyBoard?.active());
 if(busy||(!board&&!document.querySelector('#investment-native,#investment-annual')&&state.page!=='home'))return;
 const list=codes(),scope=list.join(','),now=Date.now();
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const weekday=new Date(now+8*3600000).getUTCDay(),trading=weekday>0&&weekday<6&&((clock>='09:30'&&clock<='11:30')||(clock>='13:00'&&clock<='15:00'));
 // Only the company events feed publishes calendar dates. The board has its own quote batch.
 const feeds=board?['events']:['quote','announcements','news','events'];
 const sections=feeds.filter(k=>force||!last[k]||(k==='quote'?trading&&now-last[k]>=15000:now-last[k]>=(k==='announcements'?120000:300000)));
 if(!list.length||!sections.length)return;
 busy=true;draw();
 let complete=true,reason='';
 try{
  // The stock feed accepts at most 30 symbols per request.
  for(let i=0;i<list.length&&scope===codes().join(',');i+=30){
   try{
    if(!await fetchBatch(list.slice(i,i+30),sections,force,now))complete=false;
   }catch(e){complete=false;reason=e.message}
   if(i+30<list.length)notifySummary();
  }
  notice=(complete?'已更新':'部分数据未更新，保留缓存')+' · '+new Date().toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai'});
  if(reason)notice+='（'+reason+'）';
 }finally{
  busy=false;
  const changed=scope!==codes().join(',');
  if(!changed)sections.forEach(k=>last[k]=now);
  draw();notifySummary();
  if(changed)refresh();
 }
}
function summaryEntries(){
 const seen=new Set();
 return codes().flatMap(code=>['announcements','news','events'].flatMap(kind=>(stocks[code]?.[kind]||[]).map(event=>({...event,code})))).filter(event=>{
  const date=day(event.publishedAt),key=event.code+'|'+date+'|'+event.title;
  if(event.eventKind!=='calendar'||!date||seen.has(key))return false;
  seen.add(key);return true;
 }).map(event=>{
  const date=day(event.publishedAt),title=String(event.title||'');
  const short=title.includes('股东')&&/大会|会议/.test(title)?'股东大会':/分红|派息|权益分派|除权|除息/.test(title)?'分红派息':/业绩|年报|季报|半年报/.test(title)?'业绩披露':title.replace(/关于|的公告/g,'').trim();
  return {id:'investment:'+event.code+':'+(event.id||date+title),calendar:'investment',start:date,end:date,name:stockName(event.code)+' · '+short,target:'#investment'};
 });
}
function notifySummary(){window.dispatchEvent(new Event('investment-calendar-update'))}
function refreshSummaryWatchlist(){selected='all';last={};notifySummary();refresh(true)}
window.addEventListener('stock-preferences-cloud-change',refreshSummaryWatchlist);
window.addEventListener('site-auth-change',refreshSummaryWatchlist);
window.InvestmentCalendar={
 summaryEntries,stockName,
 eventsOn(date){return reminders(date.slice(0,7),'all').filter(e=>day(e.publishedAt)===date)},
 mount(){draw();refresh()},refresh
};
if(window.DailyBoard)notifySummary();
setInterval(()=>{if(!document.hidden)refresh()},15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
window.addEventListener('storage',e=>{
 if(e.key===cacheKey){stocks=json(cacheKey,{stocks:{}}).stocks||{};draw();notifySummary();return}
 if(e.key===null||e.key?.includes('watchlist')||e.key==='mywebsite.site-auth-session.v1'){
  stocks=json(cacheKey,{stocks:{}}).stocks||{};refreshSummaryWatchlist();draw();
 }
});
})();
window.InvestmentCalendar.mount();
