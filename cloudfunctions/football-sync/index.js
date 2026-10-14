'use strict';
const seed=require('./seed.json');
const API='https://api-fcb.pulselive.com/football';
const SCHEDULE='https://www.fcbarcelona.com/en/football/first-team/schedule';
const RESULTS='https://www.fcbarcelona.com/en/football/first-team/results';
const RANKING='https://www.laliga.com/estadisticas/laliga-easports/goleadores';
const COMP={ES_PL:'liga',EU_CL:'ucl',ES_CUP:'copa',ES_SC:'super'};
const names=Object.fromEntries(Object.entries(seed.badges).map(([n,c])=>[c,n]));
const players={'João Cancelo':'坎塞洛','Fermín López':'费尔明·洛佩斯','Anthony Gordon':'戈登','Karim Adeyemi':'阿德耶米','Aleksey Batrakov':'巴特拉科夫','Raphinha':'拉菲尼亚','Lamine Yamal':'亚马尔','Kylian Mbappé':'姆巴佩','Camello':'塞尔希奥·卡梅略','Zabiri':'扎比里','Ferran Torres':'费兰·托雷斯','Jules Koundé':'孔德','Pedri':'佩德里','Robert Lewandowski':'莱万多夫斯基'};
async function text(url){const r=await fetch(url,{headers:{Origin:'https://www.fcbarcelona.com','User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error('Source HTTP '+r.status);const s=await r.text();if(s.length>8000000)throw Error('Source too large');return s;}
async function json(url){return JSON.parse(await text(url));}
const team=t=>names[t.club?.abbr]||t.name;
function convert(f){
 const season=f.gameweek?.compSeason,competition=COMP[season?.competition?.abbreviation];
 if(!competition||!season.label.includes('2026/2027')||!f.teams?.some(t=>t.team.id===49))return null;
 const ts=f.kickoff?.millis||f.provisionalKickoff?.millis;if(!Number.isFinite(ts))return null;
 const confirmed=f.kickoff?.completeness===3;
 const d=new Date(ts+(confirmed?8:1)*3600000).toISOString(),home=f.teams[0].team.id===49;
 const opponent=team(f.teams[home?1:0].team),round=f.gameweek.gameweek;
 const old=seed.matches.find(m=>m.competition===competition&&(m.round===round||competition==='super')&&m.opponent===opponent);
 const score=f.status==='C'?f.teams.map(t=>t.score):null;
 if(score&&!score.every(v=>Number.isInteger(v)&&v>=0&&v<30))throw Error('Invalid score');
 const roster=new Map((f.teamLists||[]).filter(Boolean).flatMap(t=>[...(t.lineup||[]),...(t.substitutes||[])].map(p=>[p.id,p.name?.display])));
 const scorers=[];
 for(const e of f.events||[]){if(!['G','P','OG'].includes(e.type))continue;const ownGoal=e.type==='OG';const name=roster.get(e.personId);if(!name)continue;const credited=f.teams.find(t=>ownGoal?t.team.id!==e.teamId:t.team.id===e.teamId);if(!credited)continue;let s=scorers.find(x=>x.player===(players[name]||name)&&x.ownGoal===ownGoal);if(!s){s={team:credited.team.id===49?'巴塞罗那':team(credited.team),player:players[name]||name,minutes:[],ownGoal};scorers.push(s);}s.minutes.push((e.clock?.label||'').split("'")[0]);}
 const complete=score&&scorers.reduce((n,s)=>n+s.minutes.length,0)===score[0]+score[1];
 return {...old,id:old?.id||'football:official:'+f.id,calendar:'sports',category:'足球',competition,opponent,round,venue:f.neutralGround?'N':home?'H':'A',name:home?'巴塞罗那 vs '+opponent:opponent+' vs 巴塞罗那',start:d.slice(0,10),end:d.slice(0,10),time:confirmed?d.slice(11,16):null,sourceDate:new Date(ts).toISOString().slice(0,10),dateTentative:!confirmed&&!score,score,scorers:complete?scorers:old?.scorers||null,location:f.ground?.name||'',source:'https://www.fcbarcelona.com/en/matches/'+f.id};
}
async function collect(){
 const pages=await Promise.all([text(SCHEDULE),text(RESULTS)]);const ids=[...new Set(pages.flatMap(s=>[...s.matchAll(/href="\/en\/matches\/(\d+)\/[^" ]*2026-2027/g)].map(m=>m[1])))];if(ids.length<10||ids.length>100)throw Error('Schedule parsing failed');
 const matches=structuredClone(seed.matches);
 for(let i=0;i<ids.length;i+=4){const batch=await Promise.all(ids.slice(i,i+4).map(id=>json(API+'/fixtures/'+id+'?altIds=true&detail=2').then(convert)));for(const m of batch.filter(Boolean)){const index=matches.findIndex(x=>x.id===m.id);if(index<0)matches.push(m);else matches[index]=m;}}
 const table=await json(API+'/standings?compSeasons=879&altIds=true');if(!table.compSeason?.label.includes('2026/2027'))throw Error('Standings season mismatch');
 const standings=table.tables?.[0]?.entries?.slice(0,5).map(r=>({team:team(r.team),name:r.team.id===49?'巴塞罗那':team(r.team),played:r.overall.played,w:r.overall.won,d:r.overall.drawn,l:r.overall.lost,gf:r.overall.goalsFor,ga:r.overall.goalsAgainst,points:r.overall.points,form:''}));if(standings?.length!==5)throw Error('Invalid standings');
 const fixtures=await json(API+'/fixtures?compSeasons=879&pageSize=400&sort=desc&detail=1');for(const r of standings){const finished=fixtures.content.filter(f=>f.status==='C'&&f.kickoff?.millis<=Date.now()&&f.teams.some(t=>team(t.team)===r.team)).sort((a,b)=>a.kickoff.millis-b.kickoff.millis).slice(-5);r.form=finished.map(f=>{const idx=f.teams.findIndex(t=>team(t.team)===r.team),a=f.teams[idx].score,b=f.teams[1-idx].score;return a>b?'W':a<b?'L':'D';}).join('');}
 const html=await text(RANKING),data=JSON.parse(html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1]||'{}').props?.pageProps;if(data?.season!=='2026')throw Error('Ranking season mismatch');
 const scorers=data.statsData.player_rankings.slice(0,5).map(r=>({name:players[r.nickname]||r.nickname,team:names[r.team.shortname==='BAR'?'BCN':r.team.shortname==='RMA'?'RMD':r.team.shortname]||r.team.nickname,goals:r.stats.find(s=>s.name==='total_goals')?.stat,slug:r.slug,portrait:r.photos?.['001']?.['128x139'],badge:r.team.shield?.resizes?.small}));if(scorers.length!==5||scorers.some(r=>!Number.isInteger(r.goals)))throw Error('Invalid ranking');
 return {version:1,season:'2026-2027',updatedAt:new Date().toISOString(),matches:matches.sort((a,b)=>a.start.localeCompare(b.start)),standings,scorers};
}
exports.main=async event=>{
 const app=require('@cloudbase/node-sdk').init({env:process.env.SCF_NAMESPACE});
 if(event?.httpMethod){if(event.httpMethod==='OPTIONS')return {statusCode:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS'},body:''};if(event.httpMethod!=='GET')return {statusCode:405,body:''};try{const r=await app.downloadFile({fileID:process.env.SNAPSHOT_FILE_ID});return {statusCode:200,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=60'},body:r.fileContent.toString('utf8')};}catch{return {statusCode:503,body:'{"error":"Snapshot unavailable"}'};}}
 const snapshot=await collect();const result=await app.uploadFile({cloudPath:'football/latest-2026.json',fileContent:Buffer.from(JSON.stringify(snapshot))});return {ok:true,updatedAt:snapshot.updatedAt,matches:snapshot.matches.length,fileID:result.fileID};
};
exports.collect=collect;exports.convert=convert;
