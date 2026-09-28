/* Live WST snapshots work over HTTP and when index.html is opened directly. */
(() => {
  let snapshot = null;
  let lastPayload = '';
  let loading = false;
  let readFailed = false;
  const labels = { upcoming: '待赛', live: '正在进行', ended: '已结束',
    postponed: '延期', suspended: '暂停', cancelled: '取消' };
  const escape = value => String(value ?? '').replace(/[&<>"']/g,
    ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const time = value => new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
  const names = { "Ronnie O'Sullivan": '罗尼·奥沙利文', 'Mark Williams': '马克·威廉姆斯',
    'Fan Zhengyi': '范争一', 'Liu Hongyu': '刘宏宇', 'Huang Jiahao': '黄佳浩',
    'Jiang Jun': '江俊', 'Scott Donaldson': '斯科特·唐纳森', 'Liam Davies': '利亚姆·戴维斯',
    'Oliver Lines': '奥利弗·莱恩斯', 'David Grace': '大卫·格雷斯', 'Liam Highfield': '利亚姆·海菲尔德',
    'Michael Holt': '迈克尔·霍尔特', 'Ricky Walden': '里奇·沃顿', 'Andrew Higginson': '安德鲁·希金森',
    'Jamie Clarke': '杰米·克拉克', 'Marco Fu': '傅家俊', 'Sam Craigie': '山姆·克雷吉',
    'Ben Mertens': '本·默滕斯', 'Chen Qien': '陈祺恩', 'Wang Xinzhong': '王信忠',
    'Dong Zihao': '董子豪', 'Su Jinxiong': '苏锦雄' };
  const player = name => names[name] || playerMeta[name]?.[0] ||
    (/^Winner of Match (\d+)$/i.test(name) ? name.replace(/^Winner of Match (\d+)$/i, '第 $1 场胜者') : name);
  const roundName = name => ({ Final: '决赛', 'Semi Finals': '半决赛', 'Semi-finals': '半决赛',
    'Quarter Finals': '1/4决赛', 'Quarter-finals': '1/4决赛' })[name] ||
    name.replace(/^Round (\d+) \(Held Over\)$/i, '延期资格赛第 $1 轮').replace(/^Round (\d+)$/i, '第 $1 轮');
  const stale = event => readFailed || (event.status !== 'ended' && Date.now() - Date.parse(event.fetchedAt) > 12 * 60 * 1000) ||
    snapshot?.failures?.[event.id] || snapshot?.failures?.source;

  const previousStatus = status;
  status = event => snapshot?.events?.[event.id]?.status || previousStatus(event);
  const previousBracket = inlineBracket;
  inlineBracket = event => {
    const data = snapshot?.events?.[event.id];
    if (!data?.matches?.length) return previousBracket(event);
    const rounds = [...new Set(data.matches.map(match => match.round))];
    const note = stale(data) ? '暂未取得最新数据，以下为上次同步记录' : '自动更新中 · 每 5 分钟采集';
    return `<section class="inline-bracket" style="--event-color:${color(event)}" aria-label="${escape(event.name)}对阵信息">
      <div class="inline-bracket-heading"><strong>赛事对阵与赛果 · ${data.matches.length} 场</strong>
      <button type="button" data-inline-close="${escape(event.id)}" aria-label="收起对阵">收起 ×</button></div>
      <div class="inline-bracket-rounds live-score-rounds">${rounds.map(round => `<section class="inline-bracket-round">
        <h4>${escape(roundName(round))}</h4>${data.matches.filter(match => match.round === round).map(match => {
          const score = match.status === 'upcoming' ? '—' :
            match.homeScore === null || match.awayScore === null ? '—' : `${match.homeScore}–${match.awayScore}`;
          return `<article class="inline-bracket-match" data-live-match="${escape(match.id)}">
            <small class="live-match-meta"><span>${match.startsAt ? escape(time(match.startsAt)) : '时间待公布'}</span>
            <span class="badge ${match.status === 'live' ? 'live' : match.status === 'ended' ? 'ended' : 'upcoming'}">${labels[match.status]}</span></small>
            <div><span>${escape(player(match.home))}</span><b>${score}</b><span>${escape(player(match.away))}</span></div>
          </article>`;
        }).join('')}</section>`).join('')}</div>
      <p class="bracket-note">${note} · 同步于 ${escape(time(data.fetchedAt))}（北京时间）
      <a href="${escape(data.source)}" target="_blank" rel="noopener">WST 官方赛果 ↗</a></p></section>`;
  };

  const previousWinner = winnerField;
  winnerField = (event, eventStatus) => {
    const winner = snapshot?.events?.[event.id]?.winner;
    if (!winner || event.champion) return previousWinner(event, eventStatus);
    const photo = playerPhotos[winner] || playerPhotos[winner.replace(/'/g, '’')];
    if (photo) return previousWinner({ ...event, champion: { name: player(winner), en: winner,
      photo, credit: 'WST 官方赛事结果' } }, eventStatus);
    return `<span class="event-row-field winner-field" style="display:block!important"><small>冠军</small><strong>${escape(player(winner))}</strong></span>`;
  };

  const previousRender = render;
  render = () => {
    previousRender();
    const records = Object.values(snapshot?.events || {});
    const latest = records.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt))[0];
    const delayed = records.some(stale);
    const badge = document.querySelector('.snapshot');
    if (badge && !['rankings', 'players'].includes(state.nav)) {
      badge.textContent = latest ? `${delayed ? '部分同步延迟' : '赛果同步'} · ${time(latest.fetchedAt)}` : '等待赛果同步';
      badge.title = latest ? 'WST 官方比分；每 5 分钟采集，页面每分钟检查更新' : '尚未取得 WST 比分数据';
    }
    if (['year', 'schedule', 'results', 'favorites'].includes(state.nav)) {
      const note = document.querySelector('.bottom-note');
      if (note) note.innerHTML = '<span>WST 比分每 5 分钟采集 · 页面每分钟检查更新 · 北京时间</span>' +
        `<span>${latest ? delayed ? '同步延迟，保留上次有效数据' : '查看赛事对阵中的各场比赛状态' : '等待首次同步'}</span>`;
    }
  };

  const style = document.createElement('style');
  style.textContent = '.live-score-rounds{max-height:520px;overflow:auto;align-items:start}.live-match-meta{display:flex!important;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.live-score-rounds .inline-bracket-match>div{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)}.live-score-rounds .inline-bracket-match>div span{overflow-wrap:anywhere}.live-score-rounds .badge{white-space:nowrap}@media(max-width:680px){.live-score-rounds{flex-direction:column}.live-score-rounds .inline-bracket-round{flex:none;min-width:0;width:100%}}';
  document.head.append(style);

  function refreshView() {
    const position = { left: scrollX, top: scrollY };
    const panel = document.querySelector('.live-score-rounds');
    const panelScroll = panel ? { top: panel.scrollTop, left: panel.scrollLeft } : null;
    render();
    if (panelScroll) document.querySelector('.live-score-rounds')?.scrollTo(panelScroll);
    window.scrollTo(position);
  }

  function poll() {
    if (loading) return;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
    const changedDay = TODAY !== today;
    if (changedDay) { TODAY = today; CURRENT_MONTH = Number(today.slice(5, 7)) - 1; }
    loading = true;
    const script = document.createElement('script');
    script.src = `./live-scores.js?checked=${Date.now()}`;
    const timer = setTimeout(() => finish(false), 15000);
    let done = false;
    function finish(ok) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      script.remove();
      loading = false;
      const oldFailure = readFailed;
      readFailed = !ok;
      const data = window.CUE_LIVE_SCORES;
      if (ok && data?.version === 1 && data.events) {
        const payload = JSON.stringify(data);
        snapshot = data;
        if (payload !== lastPayload || oldFailure || changedDay) {
          lastPayload = payload;
          refreshView();
          return;
        }
      }
      if (changedDay || oldFailure !== readFailed || snapshot) refreshView();
    }
    script.onload = () => finish(true);
    script.onerror = () => finish(false);
    document.head.append(script);
  }
  render();
  poll();
  setInterval(poll, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
})();
