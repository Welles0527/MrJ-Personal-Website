'use strict';
let catalogWorks, catalogInfo;
async function publicCatalog(url, signal, body) {
  const {pathname,searchParams:p}=new URL(url,location.origin);
  if(pathname==='/api/status') {
    catalogInfo ??= fetch('./catalog-status.json').then(r=>r.json());
    return catalogInfo;
  }
  catalogWorks ??= fetch('./catalog-works.json').then(r=>{
    if(!r.ok)throw Error('片库加载失败');
    return r.json();
  });
  const works=await catalogWorks;
  signal?.throwIfAborted();
  const ids=body?.ids ?? (p.get('ids') ?? '').split(',').filter(Boolean);
  const wanted=new Set(ids);
  if(pathname==='/api/missing') {
    const local=new Set(works.map(w=>w.id));
    return {ids:ids.filter(id=>!local.has(id))};
  }
  if(pathname==='/api/works')return {items:works.filter(w=>wanted.has(w.id))};
  const archive=p.get('archive'), source=p.get('source'), ranking=p.get('tab')==='ranking';
  const filteredSource=source && source!=='all';
  const rating=w=>archive?w.historicalRatings[archive]:filteredSource?w.ratings[source]:undefined;
  const value=w=>archive||filteredSource?rating(w)?.value:w.sampleMax;
  const votes=w=>rating(w)?.votes ?? (filteredSource||archive?0:w.votes??0);
  const words=(p.get('q')||'').normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean);
  const genres=['region','genres','ages'];
  const items=works.filter(w=>{
    if(p.get('seed') && !w.seedPlatforms.includes(p.get('seed')))return false;
    if((ids.length||p.get('tab')==='saved')&&!wanted.has(w.id))return false;
    if((archive||filteredSource||ranking)&&value(w)==null)return false;
    if(p.get('linked')&&!w.links[p.get('linked')])return false;
    if(['type','area'].some(k=>p.has(k)&&!p.get(k).split(',').includes(w[k])))return false;
    if(genres.some(k=>p.has(k)&&!p.get(k).split(',').some(t=>(w[k==='region'?'regions':k]||[]).includes(t))))return false;
    if(p.has('country')&&(p.get('country')==='unknown'?w.countryCodes.length:!w.countryCodes.includes(p.get('country'))))return false;
    if(p.get('classic')==='1'&&!w.classic)return false;
    const count=new Set([...Object.keys(w.ratings),...Object.keys(w.historicalRatings)].map(k=>['rtavg','rtaud'].includes(k)?'rt':k)).size;
    if(count<Number(p.get('minSources')||0))return false;
    if((p.has('from')||p.has('to'))&&(!w.year||w.year<Number(p.get('from')||0)||w.year>Number(p.get('to')||9999)))return false;
    if(votes(w)<Number(p.get('minVotes') ?? (ranking?100:0)))return false;
    const upper=Number(p.get('max')), limit=rating(w)?.unit||10;
    if(p.has('min')&&(value(w)==null||value(w)<Number(p.get('min'))))return false;
    if(p.has('max')&&(value(w)==null||value(w)>upper||(value(w)===upper&&upper!==limit)))return false;
    const haystack=[w.title,w.originalTitle,...(w.aliases||[]),...(w.genres||[]),...(w.ages||[]),...(w.countries||[]),w.type,w.area,w.region,w.year].join(' ').normalize('NFKC').toLowerCase();
    return words.every(x=>haystack.includes(x));
  });
  const sort=p.get('sort');
  const weighted=w=>value(w)==null?-1:(value(w)*votes(w)+(rating(w)?.unit||10)*75)/(votes(w)+100);
  items.sort((a,b)=>(sort==='old'?(a.year||9999)-(b.year||9999):sort==='new'?(b.year||0)-(a.year||0):sort==='recommended'?weighted(b)-weighted(a):(value(b)??-1)-(value(a)??-1))||votes(b)-votes(a)||a.id.localeCompare(b.id));
  const pageSize=24,page=Math.min(Math.max(1,Math.ceil(items.length/pageSize)),Math.max(1,Number(p.get('page'))||1));
  return {total:items.length,page,pageSize,items:items.slice((page-1)*pageSize,page*pageSize)};
}


