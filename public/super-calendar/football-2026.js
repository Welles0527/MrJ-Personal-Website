// Fallback snapshot; refreshed from the cloud official-source cache.
let footballUpdatedAt='2026-10-11';
const footballCompetitions={
  liga:{label:'西甲',symbol:'●',color:'#ff946c'},
  copa:{label:'国王杯',symbol:'♛',color:'#f1ca68'},
  ucl:{label:'欧冠',symbol:'★',color:'#83bfff'},
  super:{label:'西班牙超级杯',symbol:'◆',color:'#d5a2ff'}
};
const footballScheduleSource='https://www.fcbarcelona.com/en/football/first-team/schedule';
const footballResultsSource='https://www.fcbarcelona.es/es/futbol/primer-equipo/resultados';
const footballSuperSource='https://rfef.es/es/noticias/definida-la-hoja-de-ruta-de-la-supercopa-2027-que-se-celebrara-en-estambul';
// Date-only fixtures retain the published Spanish calendar date: never invent a kickoff.
// Columns: Spanish date, opponent, venue (H/A/N), round, Spanish kickoff, score (home-away).
const footballLigaRows=[
  ['2026-08-27','毕尔巴鄂竞技','H',1,null,[2,0]],
  ['2026-08-23','埃尔切','A',2,null,[0,5]],
  ['2026-08-31','巴列卡诺','H',3,'21:30',[5,2]],
  ['2026-09-06','瓦伦西亚','A',4,null,[0,5]],
  ['2026-09-13','莱万特','A',5,null,[2,4]],
  ['2026-09-16','桑坦德竞技','H',6,null,[7,2]],
  ['2026-09-19','塞维利亚','A',7,null,[1,3]],
  ['2026-10-10','赫塔费','H',8,'18:30',[3,0]],
  ['2026-10-17','皇家贝蒂斯','A',9,'18:30'],
  ['2026-10-25','皇家马德里','H',10,'21:00'],
  ['2026-10-31','阿拉维斯','H',11,'21:00'],
  ['2026-11-08','马德里竞技','A',12],['2026-11-22','比利亚雷亚尔','H',13],
  ['2026-11-29','拉科鲁尼亚','A',14],['2026-12-06','塞尔塔','H',15],
  ['2026-12-13','马拉加','A',16],['2026-12-20','皇家社会','H',17],
  ['2027-01-03','西班牙人','A',18],['2027-01-10','奥萨苏纳','A',19],
  ['2027-01-17','埃尔切','H',20],['2027-01-24','阿拉维斯','A',21],
  ['2027-01-31','瓦伦西亚','H',22],['2027-02-07','马德里竞技','H',23],
  ['2027-02-14','比利亚雷亚尔','A',24],['2027-02-21','莱万特','H',25],
  ['2027-02-28','毕尔巴鄂竞技','A',26],['2027-03-07','皇家贝蒂斯','H',27],
  ['2027-03-14','拉科鲁尼亚','H',28],['2027-03-21','巴列卡诺','A',29],
  ['2027-04-04','塞维利亚','H',30],['2027-04-11','桑坦德竞技','A',31],
  ['2027-04-18','西班牙人','H',32],['2027-04-21','塞尔塔','A',33],
  ['2027-05-02','奥萨苏纳','H',34],['2027-05-09','皇家马德里','A',35],
  ['2027-05-16','皇家社会','A',36],['2027-05-23','马拉加','H',37],
  ['2027-05-30','赫塔费','A',38]
];
const footballUclRows=[
  ['2026-09-09','费耶诺德','H',1,null,[5,1]],
  ['2026-10-13','加拉塔萨雷','A',2,'21:00'],
  ['2026-10-20','巴黎圣日耳曼','A',3,'21:00'],
  ['2026-11-03','阿斯顿维拉','H',4,'21:00'],
  ['2026-11-25','萨巴赫','A',5,'18:45'],
  ['2026-12-08','曼彻斯特城','H',6,'21:00'],
  ['2027-01-20','葡萄牙体育','A',7,'21:00'],
  ['2027-01-27','科莫','H',8,'21:00']
];
function footballBeijing(date,time){
  if(!time)return {date,time:null};
  const wall=Date.parse(date+'T'+time+':00Z');
  const spanishHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',hourCycle:'h23'}).format(new Date(wall)));
  const offset=(spanishHour-Number(time.slice(0,2))+24)%24;
  const beijing=new Date(wall+(8-offset)*3600000).toISOString();
  return {date:beijing.slice(0,10),time:beijing.slice(11,16)};
}
function footballMatch(row,competition){
  const [sourceDate,opponent,venue,round,kickoff,score]=row,bj=footballBeijing(sourceDate,kickoff);
  return {id:'football:'+competition+':'+round,calendar:'sports',category:'足球',competition,
    name:venue==='A'?opponent+' vs 巴塞罗那':'巴塞罗那 vs '+opponent,
    start:bj.date,end:bj.date,sourceDate,time:bj.time,venue,opponent,round,score:score||null,
    location:venue==='H'?'Spotify Camp Nou':venue==='N'?'伊斯坦布尔':'客场',
    source:score?footballResultsSource:footballScheduleSource,scorers:null,
    dateTentative:!kickoff&&!score};
}
const footballMatches=[...footballLigaRows.map(r=>footballMatch(r,'liga')),...footballUclRows.map(r=>footballMatch(r,'ucl')),
  {...footballMatch(['2027-02-02','马德里竞技','N','半决赛','20:00'],'super'),source:footballSuperSource}
].sort((a,b)=>a.start.localeCompare(b.start));
Object.assign(footballMatches.find(m=>m.id==='football:liga:8'),{
  halftime:[2,0],scorers:[{team:'巴塞罗那',player:'戈登',minutes:['2']},{team:'巴塞罗那',player:'加布里埃尔·热苏斯',minutes:['30']},{team:'巴塞罗那',player:'孔德',minutes:['73']}],
  source:'https://www.fcbarcelona.es/es/partidos/138352/fc-barcelona-getafe-la-liga-2026-2027'
});
Object.assign(footballMatches.find(m=>m.id==='football:liga:3'),{
  halftime:[2,1],scorers:[{team:'巴塞罗那',player:'拉菲尼亚',minutes:['19','71']},{team:'巴塞罗那',player:'亚马尔',minutes:['21','90']},{team:'巴塞罗那',player:'勒热纳',minutes:['51'],ownGoal:true},{team:'巴列卡诺',player:'卡梅略',minutes:['12','59']}],
  source:'https://www.fcbarcelona.es/es/partidos/138302/fc-barcelona-rayo-vallecano-la-liga-2026-2027'
});
// Team denotes the side credited with the goal; own goals are not personal goals.
const footballVerifiedGoals={
  'football:liga:1':{source:'https://www.laliga.com/es-NG/partido/temporada-2026-2027-laliga-ea-sports-fc-barcelona-athletic-club-1',scorers:[
    {team:'巴塞罗那',player:'拉菲尼亚',minutes:['37']},{team:'巴塞罗那',player:'费尔明·洛佩斯',minutes:['82']}
  ]},
  'football:liga:2':{source:'https://www.laliga.com/partido/temporada-2026-2027-laliga-ea-sports-elche-cf-fc-barcelona-2',scorers:[
    {team:'巴塞罗那',player:'拉菲尼亚',minutes:['14','67']},{team:'巴塞罗那',player:'阿德耶米',minutes:['45+3']},{team:'巴塞罗那',player:'费尔明·洛佩斯',minutes:['71','79']}
  ]},
  'football:liga:4':{source:'https://www.eurosport.es/futbol/la-liga/2026-2027/live-valencia-barcelona_mtc21891403/live.shtml',scorers:[
    {team:'巴塞罗那',player:'亚马尔',minutes:['6','84']},{team:'巴塞罗那',player:'费尔明·洛佩斯',minutes:['22']},{team:'巴塞罗那',player:'拉菲尼亚',minutes:['50']},{team:'巴塞罗那',player:'佩德里',minutes:['79']}
  ]},
  'football:liga:5':{source:'https://www.laliga.com/en-NL/match/temporada-2026-2027-laliga-ea-sports-levante-ud-fc-barcelona-5',scorers:[
    {team:'巴塞罗那',player:'哈维·埃斯帕特',minutes:['5']},{team:'巴塞罗那',player:'亚马尔',minutes:['19','48']},{team:'巴塞罗那',player:'阿德耶米',minutes:['90+3']},{team:'莱万特',player:'伊万·罗梅罗',minutes:['79']},{team:'莱万特',player:'罗赫尔·布鲁格',minutes:['88']}
  ]},
  'football:liga:6':{source:'https://www.laliga.com/en-US/match/temporada-2026-2027-laliga-ea-sports-fc-barcelona-r-racing-club-6',scorers:[
    {team:'巴塞罗那',player:'坎塞洛',minutes:['8']},{team:'巴塞罗那',player:'拉菲尼亚',minutes:['25','42','67']},{team:'巴塞罗那',player:'比利亚利夫雷',minutes:['36'],ownGoal:true},{team:'巴塞罗那',player:'加布里埃尔·热苏斯',minutes:['79']},{team:'巴塞罗那',player:'亚马尔',minutes:['89']},{team:'桑坦德竞技',player:'马盖特·盖耶',minutes:['30']},{team:'桑坦德竞技',player:'亚西尔·扎比里',minutes:['65']}
  ]},
  'football:liga:7':{source:'https://www.laliga.com/en-US/match/temporada-2026-2027-laliga-ea-sports-sevilla-fc-fc-barcelona-7',scorers:[
    {team:'巴塞罗那',player:'拉菲尼亚',minutes:['22','52','69']},{team:'塞维利亚',player:'戴维·福法纳',minutes:['19']}
  ]},
  'football:ucl:1':{source:'https://www.worldfootball.net/match-report/co19/uefa-champions-league/ma12517716/fc-barcelona_feyenoord/live-commentary/',scorers:[
    {team:'巴塞罗那',player:'拉菲尼亚',minutes:['3','57']},{team:'巴塞罗那',player:'阿德耶米',minutes:['22']},{team:'巴塞罗那',player:'亚马尔',minutes:['77']},{team:'巴塞罗那',player:'加布里埃尔·热苏斯',minutes:['85']},{team:'费耶诺德',player:'塞姆·斯泰恩',minutes:['82']}
  ]}
};
for(const match of footballMatches)if(footballVerifiedGoals[match.id])Object.assign(match,footballVerifiedGoals[match.id]);
function footballScore(m){return m.score?m.score.join(' : '):'VS'}
function footballTime(m){return m.time?m.time+' 北京时间':m.dateTentative?'日期暂定 · 时间待定':'西班牙比赛日 · 时间待核实'}
function footballGoals(m){return m.scorers?m.scorers.map(s=>s.player+' '+s.minutes.map(v=>v+'′').join('、')+(s.ownGoal?'（乌龙）':'')).join(' · '):m.score?'进球球员待核实':'赛后更新进球球员'}
function footballStar(m){return m.opponent==='皇家马德里'?'<span class="football-clasico-star" title="国家德比" aria-label="国家德比星标">✦</span>':'';}
function footballCard(m,compact=false){
  const c=footballCompetitions[m.competition];
  if(state.view==='year'){
    const result=m.score?Math.sign(m.score[m.venue==='A'?1:0]-m.score[m.venue==='A'?0:1]):null;
    const face=result===null?'':`<svg class="football-result" viewBox="0 0 24 24" role="img" aria-label="${result>0?'巴萨胜利':result===0?'平局':'巴萨失利'}" style="color:${result>0?'#58d68d':result===0?'#f4ca55':'#ff7070'}"><circle cx="12" cy="12" r="10" fill="currentColor"/><g stroke="#17202a" stroke-width="1.7" fill="none" stroke-linecap="round"><path d="M8 8.5v1m8-1v1"/><path d="${result>0?'M7 13q5 7 10 0':result===0?'M8 15h8':'M7 17q5-7 10 0'}"/>${result<0?'<path d="M7 11v2m10-2v2"/>':''}</g></svg>`;
    const teams=m.venue==='A'?m.opponent+' vs 巴萨':'巴萨 vs '+m.opponent;
    if(m.score)return `<button class="football-match football-year football-finished" data-event="${esc(m.id)}" style="--match-color:${c.color}" aria-label="${esc(m.name+' '+footballScore(m))}"><span class="football-year-symbol" title="${c.label}" aria-label="${c.label}">${c.symbol}</span><span class="football-finished-teams">${esc(teams)}${footballStar(m)}</span><span class="football-finished-score">${footballScore(m)}</span>${face}</button>`;
    return `<button class="football-match football-year football-upcoming" data-event="${esc(m.id)}" style="--match-color:${c.color}" aria-label="${esc(m.name+' '+m.start+' '+footballScore(m))}"><span class="football-year-date">${m.start.slice(5).replace('-','/')} ${m.time||'时间待定'}</span><span class="football-year-symbol" title="${c.label}" aria-label="${c.label}">${c.symbol}</span><span class="football-finished-teams">${esc(teams)}${footballStar(m)}</span></button>`;
  }
  return `<button class="football-match ${compact?'football-compact':''}" data-event="${esc(m.id)}" style="--match-color:${c.color}" aria-label="${esc(m.name+' '+footballScore(m)+' '+footballTime(m))}"><span class="football-tag">${c.symbol} ${c.label}${compact?'':' · '+m.start}</span><span class="football-opponent">${m.venue==='A'?'客':m.venue==='N'?'中立':'主'} · ${esc(m.opponent)}${footballStar(m)}</span><strong class="football-score">${footballScore(m)}</strong><span class="football-time">${footballTime(m)}</span>${m.score?`<span class="football-goals">${esc(footballGoals(m))}</span>`:''}</button>`;
}
// Club badge codes from the FC Barcelona official schedule and results pages.
const footballBadgeCodes={'巴萨':'BCN','加拉塔萨雷':'GAL','皇家贝蒂斯':'BET','巴黎圣日耳曼':'PSG','皇家马德里':'RMD','阿拉维斯':'CDA','阿斯顿维拉':'AVL','马德里竞技':'ATM','比利亚雷亚尔':'VIL','萨巴赫':'SAB','拉科鲁尼亚':'DEP','塞尔塔':'CLV','曼彻斯特城':'MCI','马拉加':'MAL','皇家社会':'RSO','西班牙人':'ESP','奥萨苏纳':'OSA','埃尔切':'ELC','葡萄牙体育':'SCP','科莫':'COM','瓦伦西亚':'VAL','莱万特':'LEV','毕尔巴鄂竞技':'ATH','巴列卡诺':'RAY','塞维利亚':'SEV','桑坦德竞技':'RAC','赫塔费':'GET','费耶诺德':'FEY'};
function footballBadge(team){return `<img class="football-team-badge" src="./club-badges/${footballBadgeCodes[team]}.png" alt="${esc(team)}队徽" width="48" height="48" loading="lazy" decoding="async">`;}
function footballAgendaMatch(m){
  const c=footballCompetitions[m.competition],home=m.venue==='A'?m.opponent:'巴萨',away=m.venue==='A'?'巴萨':m.opponent,weekday=['周日','周一','周二','周三','周四','周五','周六'][new Date(m.start+'T12:00:00+08:00').getUTCDay()];
  return `<button class="football-match football-agenda-match" data-event="${esc(m.id)}" style="--match-color:${c.color}" aria-label="${esc(home+' '+footballScore(m)+' '+away)}">${m.score?'<span class="football-finished-stamp">已结束</span>':''}<span class="football-fixture-date">${m.start.slice(5).replace('-','/')} ${weekday}${m.score?'':`<small>${m.time?m.time+' 北京时间':'时间待定'}</small>`}</span><span class="football-duel"><span class="football-team football-home"><span>${esc(home)}</span>${footballBadge(home)}</span><strong class="football-duel-score">${footballScore(m)}</strong><span class="football-team football-away">${footballBadge(away)}<span>${esc(away)}${footballStar(m)}</span></span></span>${m.score?`<span class="football-fixture-goals">${esc(footballGoals(m))}</span>`:''}</button>`;
}
function footballAgenda(events){
  return `<div class="football-agenda">${footballStats()}${Object.entries(footballCompetitions).map(([key,c])=>{
    const matches=events.filter(e=>e.competition===key).sort((a,b)=>a.start.localeCompare(b.start));
    if(!matches.length)return '';
    return `<section class="football-competition" style="--match-color:${c.color}" aria-label="本月${c.label}"><div class="football-competition-heading"><h3><span aria-hidden="true">${c.symbol}</span> ${c.label}</h3><span>${matches.length} 场</span></div><div class="football-competition-matches">${matches.length?matches.map(footballAgendaMatch).join(''):'<p class="football-competition-empty">本月暂无已确认比赛</p>'}</div></section>`;
  }).join('')}${events.some(e=>!e.competition)?`<section class="football-competition"><div class="football-competition-heading"><h3>自建日程</h3></div>${events.filter(e=>!e.competition).map(miniEvent).join('')}</section>`:''}</div>`;
}
function footballStats(){
  const played=footballMatches.filter(m=>m.start.startsWith(String(state.year))&&m.score);
  const gf=played.reduce((n,m)=>n+m.score[m.venue==='A'?1:0],0),ga=played.reduce((n,m)=>n+m.score[m.venue==='A'?0:1],0);
  return `<p class="football-agenda-stats">${state.year} 年已收录完赛 ${played.length} 场 · 巴萨进球 ${gf} · 失球 ${ga}（含对方乌龙）</p>`;
}
function footballLegend(){return `<div class="football-legend">${Object.values(footballCompetitions).map(c=>`<span><i style="color:${c.color}">${c.symbol}</i> ${c.label}</span>`).join('')}</div>`;}

// Standings snapshot supplied in the user's reference image; not a live feed.
const footballStandings=[
  {team:'巴萨',name:'巴塞罗那',played:8,w:8,d:0,l:0,gf:34,ga:7,points:24,form:'WWWWW'},
  {team:'马德里竞技',name:'马德里竞技',played:8,w:6,d:1,l:1,gf:18,ga:8,points:19,form:'LWWWW'},
  {team:'皇家马德里',name:'皇家马德里',played:8,w:6,d:0,l:2,gf:19,ga:8,points:18,form:'LWWLW'},
  {team:'皇家贝蒂斯',name:'皇家贝蒂斯',played:7,w:5,d:1,l:1,gf:9,ga:7,points:16,form:'LWWWD'},
  {team:'塞维利亚',name:'塞维利亚',played:7,w:4,d:1,l:2,gf:10,ga:9,points:13,form:'LDWWL'}
];
function footballStandingsTable(){return `<div class="football-standings"><div class="football-standings-title"><h3>西甲积分榜 · 前五</h3></div><div class="football-standings-scroll"><table><thead><tr><th scope="col">俱乐部</th>${['场次','胜','平','负','进球','失球','净胜','积分','最近 5 场比赛'].map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${footballStandings.map((r,i)=>`<tr class="${i===0?'football-standings-barca':''}"><th scope="row"><span class="football-standing-club"><span class="football-standing-rank">${i+1}</span>${footballBadge(r.team)}<span>${r.name}${r.team==='巴萨'?footballPointsGap():''}</span></span></th>${[r.played,r.w,r.d,r.l,r.gf,r.ga,r.gf-r.ga].map(v=>`<td>${v}</td>`).join('')}<td class="football-standing-points">${r.points}</td><td><span class="football-standing-form">${[...r.form].map((v,j)=>`<span class="football-form football-form-${v}${j===4?' football-form-latest':''}" aria-label="${v==='W'?'胜':v==='D'?'平':'负'}" title="${v==='W'?'胜':v==='D'?'平':'负'}">${v==='W'?'✓':v==='D'?'−':'×'}</span>`).join('')}</span></td></tr>`).join('')}</tbody></table></div></div>`;}
// League-wide leaders from LALIGA official scorers table, checked 2026-10-12.
const footballLeagueScorers=[{name:'拉菲尼亚',team:'巴萨',goals:12,slug:'raphinha'},{name:'塞尔希奥·卡梅略',team:'巴列卡诺',goals:7,slug:'camello'},{name:'姆巴佩',team:'皇家马德里',goals:7,slug:'kylian-mbappe-lottin'},{name:'亚马尔',team:'巴萨',goals:7,slug:'lamine-yamal'},{name:'罗伯托·费尔南德斯',team:'西班牙人',goals:6,slug:'roberto-fernandez-2'}];
function footballPointsGap(){const gap=footballStandings.find(r=>r.team==='巴萨').points-footballStandings.find(r=>r.team==='皇家马德里').points;return `<span class="football-points-gap">（${gap>0?'+':''}${gap} vs 皇马）</span>`;}
function footballScorerSummary(){return `<div class="football-scorer-summary"><div class="football-scorer-title"><h3><span aria-hidden="true">⚽</span> 射手榜</h3><span>数据更新日期：${esc(footballUpdatedAt)}</span></div><ol>${footballLeagueScorers.map((r,i)=>`<li><span class="football-scorer-rank">${i+1}</span><img class="football-player-portrait" src="${esc(r.portrait||'./player-portraits/'+r.slug+'.png')}" alt="${r.name}头像" width="32" height="32"><span class="football-scorer-name">${r.name}</span>${r.badge?`<img class="football-team-badge" src="${esc(r.badge)}" alt="${esc(r.team)}队徽" width="18" height="18">`:footballBadge(r.team)}<strong>${r.goals} 球</strong></li>`).join('')}</ol></div>`;}
function footballIntro(){
  return `<section class="football-intro" aria-label="赛季榜单">${footballStandingsTable()}${footballScorerSummary()}</section><div class="football-season-heading football-intro-heading"><h2 class="football-club-heading">${footballBadge('巴萨')}<span>巴塞罗那 <small>2026–2027 赛季</small></span></h2></div>`;
}
function footballDetail(id){
  const m=footballMatches.find(m=>m.id===id);if(!m)return;
  const c=footballCompetitions[m.competition],d=$('#detail');delete d.dataset.planDetailId;
  const home=m.venue==='A'?m.opponent:'巴塞罗那',away=m.venue==='A'?'巴塞罗那':m.opponent;
  d.innerHTML=`<button class="dialog-close" aria-label="关闭">×</button><p style="color:${c.color}">${c.symbol} ${c.label} · ${m.competition==='super'?esc(m.round):'第 '+m.round+' 轮'} · 2026–2027</p><h2>${esc(home)}<br>${footballScore(m)}<br>${esc(away)}</h2><p>${m.start} · ${footballTime(m)}</p><p>${m.score?'已结束':m.start<today?'赛果待更新':'未开始'}${m.halftime?' · 半场 '+m.halftime.join(' : '):''}</p>${m.scorers?`<h3>进球球员</h3><ul class="football-scorers">${m.scorers.map(s=>`<li><strong>${esc(s.player)}</strong> · ${s.minutes.length} 球${s.ownGoal?'（乌龙，不计个人进球）':''}<br><small>${esc(s.team)}计分 · ${s.minutes.map(v=>esc(v)+'′').join('、')}</small></li>`).join('')}</ul>`:`<p>${footballGoals(m)}</p>`}<p>${esc(m.location)}</p><p>核对日期：2026-10-11 · 非实时数据</p><a href="${esc(m.source)}" target="_blank" rel="noopener noreferrer">查看比赛来源 ↗</a><div class="form-actions"><button class="primary" data-close>完成</button></div>`;
  $('.dialog-close',d).onclick=$('[data-close]',d).onclick=()=>d.close();d.showModal();
}

async function loadFootballSnapshot(){
  const urls=['https://magicj-web-d5g9yvowj6862f7a2-1439083941.ap-shanghai.app.tcloudbase.com/api/football-snapshot','./football-latest.json'];
  for(const url of urls){try{
    const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)continue;
    const data=await response.json();if(data.version!==1||data.season!=='2026-2027'||!Number.isFinite(Date.parse(data.updatedAt))||!Array.isArray(data.matches)||data.matches.length<10||data.matches.some(m=>!footballCompetitions[m.competition]||!/^\d{4}-\d{2}-\d{2}$/.test(m.start)||typeof m.opponent!=='string'||(m.score!==null&&(!Array.isArray(m.score)||m.score.length!==2||m.score.some(v=>!Number.isInteger(v)||v<0)))))continue;
    if(!Array.isArray(data.standings)||data.standings.length!==5||!data.standings.some(r=>r.team==='巴萨')||!data.standings.some(r=>r.team==='皇家马德里')||!Array.isArray(data.scorers)||data.scorers.length!==5)continue;
    footballMatches.splice(0,footballMatches.length,...data.matches);footballStandings.splice(0,footballStandings.length,...data.standings);footballLeagueScorers.splice(0,footballLeagueScorers.length,...data.scorers);
    footballUpdatedAt=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(data.updatedAt));
    if(state.page==='sports')render();return;
  }catch{}}
}
