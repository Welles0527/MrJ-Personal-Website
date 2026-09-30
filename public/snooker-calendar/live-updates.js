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
    'Jimmy Robertson': '吉米·罗伯逊', 'Zak Surety': '扎克·舒尔蒂', 'Pang Junxu': '庞俊旭',
    'Jamie Clarke': '杰米·克拉克', 'Marco Fu': '傅家俊', 'Sam Craigie': '山姆·克雷吉',
    'Ben Mertens': '本·默滕斯', 'Chen Qien': '陈祺恩', 'Wang Xinzhong': '王信忠',
    'Dong Zihao': '董子豪', 'Su Jinxiong': '苏锦雄', 'Ali Carter': '阿里·卡特',
    'David Gilbert': '大卫·吉尔伯特', 'Elliot Slessor': '埃利奥特·斯莱瑟',
    'Gary Wilson': '加里·威尔逊', 'Hossein Vafaei': '侯赛因·瓦菲',
    'Jackson Page': '杰克逊·佩奇', 'Stephen Maguire': '斯蒂芬·马奎尔',
    'Stuart Bingham': '斯图尔特·宾汉姆', 'Thepchaiya Un-Nooh': '塔猜亚·乌诺',
    'Xu Si': '徐思', 'Yuan Sijun': '袁思俊' };
  const player = name => names[name] || playerMeta[name]?.[0] ||
    (/^Winner of Match (\d+)$/i.test(name) ? name.replace(/^Winner of Match (\d+)$/i, '第 $1 场胜者') : name);
  const roundName = name => ({ Final: '决赛', 'Semi Finals': '半决赛', 'Semi-finals': '半决赛',
    'Quarter Finals': '1/4决赛', 'Quarter-finals': '1/4决赛' })[name] ||
    name.replace(/^Round (\d+) \(Held Over\)$/i, '延期资格赛第 $1 轮').replace(/^Round (\d+)$/i, '第 $1 轮');
  // WST tournament player media and country codes for the published Shenzhen draw.
  const assets = {
    'Andrew Higginson': ['GB', '39d5b7a0-9b3a-11ee-aad9-bff8f06264c6.png'],
    'Ali Carter': ['GB', 'e812e740-9a9d-11ee-a948-97d7b3f53272.png'],
    'Barry Hawkins': ['GB', 'b45d1ca0-a5da-11f0-84ad-b918c09a48da.png'],
    'Ben Mertens': ['BE', '1d661f40-6fe2-11f1-937a-95ea892c01ea.png'],
    'Chen Qien': ['CN', 'fadb6fb0-ba24-11f1-8a34-e369e0c6d066.png'],
    'Chris Wakelin': ['GB', '52e4a3f0-9c1b-11ee-9064-899b871b5275.png'],
    'David Grace': ['GB', '39a264e0-9b35-11ee-a7e3-d184d37794b5.png'],
    'David Gilbert': ['GB', 'bfe589c0-9b34-11ee-a7e3-d184d37794b5.png'],
    'Ding Junhui': ['CN', '7ba311f0-9b44-11ee-aa3d-53b946c6a0b2.png'],
    'Dong Zihao': ['CN', '20257cc0-ba25-11f1-8a34-e369e0c6d066.png'],
    'Fan Zhengyi': ['CN', '2e2f2a60-9c4a-11ee-8ffb-11cca5635d5c.png'],
    'Elliot Slessor': ['GB', 'a1dde640-5279-11f0-8f00-991a3abcf914.png'],
    'Gary Wilson': ['GB', 'a56442a0-9c1d-11ee-a781-83e0e6ce5afb.png'],
    'Hossein Vafaei': ['IR', '1d5ecc40-6fe2-11f1-8c35-a19c890e22a2.png'],
    'Huang Jiahao': ['CN', '7d5bc780-588b-11ef-8896-f9bd1bf1a8a7.png'],
    'Jamie Clarke': ['WA', '1ce9ea60-6fe2-11f1-a36a-c5a991b02cb1.png'],
    'Jackson Page': ['WA', '1d6a8c10-6fe2-11f1-a724-8b5354163df3.png'],
    'Jiang Jun': ['CN', '1cda8110-6fe2-11f1-bda4-db6a5ab2eb1b.png'],
    'Jimmy Robertson': ['GB', '3d0e5c80-9b7e-11ee-b817-916de7e0a6fb.png'],
    'John Higgins': ['SC', '09ede500-9b3d-11ee-aad9-bff8f06264c6.png'],
    'Judd Trump': ['GB', 'b217a330-9b95-11ee-a374-adc81d8d39cb.png'],
    'Kyren Wilson': ['GB', '50d628c0-9c3b-11ee-98cf-47093ad7aceb.png'],
    'Lei Peifan': ['CN', '1ca16fb0-6fe2-11f1-a724-8b5354163df3.png'],
    'Liam Davies': ['WA', '1c727070-6fe2-11f1-99da-8bc343e463ff.png'],
    'Liam Highfield': ['GB', '4c83ec80-5279-11f0-8f00-991a3abcf914.png'],
    'Liu Hongyu': ['CN', 'db751da0-9b3d-11ee-aad9-bff8f06264c6.png'],
    'Marco Fu': ['HK', '1cce4c10-6fe2-11f1-bfb3-8dd882dacc28.png'],
    'Mark Allen': ['NI', '159b2430-9a89-11ee-8ed5-578a471e1018.png'],
    'Mark Selby': ['GB', '2ac033b0-9b8c-11ee-8797-bd4329db509d.png'],
    'Mark Williams': ['WA', '7d81c610-588b-11ef-83f7-ad4e8d8af51e.png'],
    'Michael Holt': ['GB', '7d7bf9b0-588b-11ef-a176-bf24d2006d98.png'],
    'Neil Robertson': ['AU', 'bc92b5a0-9b7e-11ee-b817-916de7e0a6fb.png'],
    'Oliver Lines': ['GB', '1c6fb150-6fe2-11f1-9a07-21b596e7208f.png'],
    'Pang Junxu': ['CN', 'f393b130-9b47-11ee-a4af-d7e956654f38.png'],
    'Ricky Walden': ['GB', '2cf4e890-9c3d-11ee-9a03-49b3ea556755.png'],
    "Ronnie O'Sullivan": ['GB', '465528d0-9f45-11ee-891e-cf1c675ba461.png'],
    'Sam Craigie': ['GB', '1cf227c0-6fe2-11f1-9a07-21b596e7208f.png'],
    'Scott Donaldson': ['SC', 'd08ffd00-9acb-11ee-9da0-dde814e11c3f.png'],
    'Shaun Murphy': ['GB', '77b40e90-9b72-11ee-b325-2f54be7c63b2.png'],
    'Stephen Maguire': ['SC', '55c0b120-9b73-11ee-b325-2f54be7c63b2.png'],
    'Stuart Bingham': ['GB', '1d6bc490-6fe2-11f1-99da-8bc343e463ff.png'],
    'Si Jiahui': ['CN', '62367230-9b48-11ee-a4af-d7e956654f38.png'],
    'Su Jinxiong': ['HK', '031027b0-ba26-11f1-831d-c92aa215b839.png'],
    'Thepchaiya Un-Nooh': ['TH', '1c75cbd0-6fe2-11f1-b5ab-9f9007ededc8.png'],
    'Wang Xinzhong': ['CN', 'd8c98330-ba24-11f1-8a34-e369e0c6d066.png'],
    'Wu Yize': ['CN', '45f6a1e0-97a3-11f0-9ee5-ebebddd14d97.png'],
    'Xiao Guodong': ['CN', '039372a0-9b39-11ee-aad9-bff8f06264c6.png'],
    'Xu Si': ['CN', 'c0471610-5279-11f0-8f00-991a3abcf914.png'],
    'Yuan Sijun': ['CN', 'a55adcf0-9b92-11ee-b954-634314c3497d.png'],
    'Zak Surety': ['GB', '824996f0-9b94-11ee-a374-adc81d8d39cb.png'],
    'Zhao Xintong': ['CN', 'fc783740-a782-11f1-a13e-1feadb360b9d.png'],
  };
  const countries = { CN: '中国', GB: '英格兰', NI: '北爱尔兰', SC: '苏格兰',
    WA: '威尔士', AU: '澳大利亚', BE: '比利时', HK: '中国香港', IR: '伊朗', TH: '泰国' };
  const dateParts = value => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai',
      month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(new Date(value)).map(part => [part.type, part.value]));
    return { clock: `${parts.hour}:${parts.minute}`, date: `${parts.month}月${parts.day}日 ${parts.weekday}` };
  };
  const portrait = name => {
    const photo = assets[name]?.[1] ? `https://images.gc.wstservices.co.uk/600x600/${assets[name][1]}` :
      playerPhotos[name] || playerPhotos[name?.replace(/'/g, '’')];
    return `<span class="match-portrait">${photo ?
      `<img src="${escape(photo)}" alt="${escape(player(name))}的官方照片" loading="lazy" referrerpolicy="no-referrer">` : ''}</span>`;
  };
  const entrant = (name, side, eliminated = false) => {
    const code = assets[name]?.[0] || playerMeta[name]?.[3];
    const country = countries[code];
    const flag = code === 'GB' ? '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><path d="M13 0h4v20h-4zM0 8h30v4H0z" fill="#ce1124"/></svg>' :
      code === 'IR' ? '<svg viewBox="0 0 30 20" role="img" aria-label="伊朗国旗"><rect width="30" height="6.67" fill="#239f40"/><rect y="6.67" width="30" height="6.66" fill="#fff"/><rect y="13.33" width="30" height="6.67" fill="#da0000"/><path d="M13 8l2 1 2-1-1 2 1 2-2-1-2 1 1-2z" fill="#da0000"/></svg>' :
      code === 'TH' ? '<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="#ed1c24"/><rect y="3.3" width="30" height="13.4" fill="#fff"/><rect y="6.7" width="30" height="6.6" fill="#241d4f"/></svg>' : country ?
        flagIcon(code, country).replace(/^<span[^>]*>|<\/span>$/g, '').replace('<svg ', '<svg aria-hidden="true" ') : '';
    return `<div class="match-entrant match-entrant-${side}"><div class="match-name">
      <span data-bracket-player>${escape(player(name))}</span><span class="match-flag" role="img" aria-label="${escape(country || '')}国旗">${flag}</span></div>
      <div class="match-portrait-wrap">${portrait(name)}${eliminated ? '<span class="match-eliminated">淘汰</span>' : ''}</div></div>`;
  };
  const stale = event => readFailed || (event.status !== 'ended' && Date.now() - Date.parse(event.fetchedAt) >
    Math.max(12 * 60 * 1000, (snapshot?.intervalMs || 5 * 60 * 1000) * 2.5)) ||
    snapshot?.failures?.[event.id] || snapshot?.failures?.source;

  const previousFiltered = filtered;
  filtered = () => {
    const eventsToShow = previousFiltered();
    if (state.nav !== 'results') return eventsToShow;
    const latestPlayedAt = event => {
      const played = (snapshot?.events?.[event.id]?.matches || [])
        .filter(match => ['ended', 'live', 'suspended'].includes(match.status))
        .map(match => Date.parse(match.startsAt)).filter(Number.isFinite);
      if (played.length) return Math.max(...played);
      const eventEnd = Date.parse(`${event.end}T23:59:59+08:00`);
      return Number.isFinite(eventEnd) ? Math.min(eventEnd, Date.now()) : 0;
    };
    return eventsToShow.sort((a, b) => latestPlayedAt(b) - latestPlayedAt(a));
  };

  const previousStatus = status;
  status = event => snapshot?.events?.[event.id]?.status || previousStatus(event);
  const previousBracket = inlineBracket;
  inlineBracket = event => {
    const data = snapshot?.events?.[event.id];
    const resultsPage = state.nav === 'results';
    if (!data?.matches?.length) {
      if (!resultsPage) return previousBracket(event);
      const rows = (event.result?.length ? event.result : event.matches || []).map((row, index) => ({ row, index })).filter(({ row }) =>
        /^\d+\s*[–—:-]\s*\d+$/.test(String(row[2])) || row[2] === '胜');
      const timestamp = label => {
        const date = String(label).match(/(\d{1,2})月(\d{1,2})日/);
        return date ? Date.parse(`${event.start.slice(0, 4)}-${String(date[1]).padStart(2, '0')}-${String(date[2]).padStart(2, '0')}T23:59:00+08:00`) : 0;
      };
      rows.sort((a, b) => timestamp(b.row[0]) - timestamp(a.row[0]) ||
        (Number(b.row[0].match(/第\s*(\d+)\s*场/)?.[1]) || b.index) -
        (Number(a.row[0].match(/第\s*(\d+)\s*场/)?.[1]) || a.index));
      const content = rows.length ? rows.map(({ row }) => {
        const score = String(row[2]).match(/^(\d+)\s*[–—:-]\s*(\d+)$/);
        const winner = score ? Number(score[1]) > Number(score[2]) ? row[1] : Number(score[2]) > Number(score[1]) ? row[3] : '' : row[2] === '胜' ? row[1] : '';
        const date = String(row[0]).match(/(\d{1,2})月(\d{1,2})日/);
        const dateValue = date ? `${event.start.slice(0, 4)}-${String(date[1]).padStart(2, '0')}-${String(date[2]).padStart(2, '0')}` : '';
        const round = String(row[0]).split('·').pop().trim();
        const number = String(row[0]).match(/第\s*(\d+)\s*场/)?.[1];
        const home = entrant(row[1], 'home').replace('data-bracket-player>', winner === row[1] ? 'data-bracket-player class="bracket-winner">' : 'data-bracket-player>');
        const away = entrant(row[3], 'away').replace('data-bracket-player>', winner === row[3] ? 'data-bracket-player class="bracket-winner">' : 'data-bracket-player>');
        return `<article class="inline-bracket-match match-fixture" data-match-status="ended" data-match-date="${dateValue}" data-match-search="${escape(`${row[1]} ${player(row[1])} ${row[3]} ${player(row[3])}`)}" data-score="${escape(row[2])}"><div class="match-when"><strong>${date ? `${date[1]}月${date[2]}日` : '已结束'}</strong><span>${escape(round)}</span><small>${number ? `第 ${number} 场` : ''}</small></div><div class="match-pair">${home}<div class="match-score"><span>比分</span><div><b>${score?.[1] || escape(row[2])}</b><i aria-hidden="true"></i><b>${score?.[2] || '—'}</b></div></div>${away}</div></article>`;
      }).join('') :
        '<p class="inline-bracket-empty">暂无已确认的已赛场次。</p>';
      return `<section class="inline-bracket live-results-list" style="--event-color:${color(event)}" aria-label="${escape(event.name)}赛果"><div class="inline-bracket-heading"><strong>最新赛果 · 时间倒序</strong><button type="button" data-inline-close="${escape(event.id)}" aria-label="收起赛果">收起 ×</button></div><div class="inline-bracket-rounds live-score-rounds"><section class="inline-bracket-round"><h4>比赛结果 <span>· ${rows.length} 场</span></h4>${content}</section></div></section>`;
    }
    const now = Date.now();
    const localDay = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai',
      year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
    const today = localDay(now);
    const earlier = resultsPage ? [] : data.matches.filter(match => match.status === 'ended' && match.startsAt && localDay(match.startsAt) < today);
    const current = resultsPage ? data.matches.filter(match => ['ended', 'live', 'suspended'].includes(match.status))
      .sort((a, b) => (Date.parse(b.startsAt) || 0) - (Date.parse(a.startsAt) || 0)) :
      data.matches.filter(match => !earlier.includes(match));
    const knockoutEvent = data.matches.some(match => /^Round ([3-9]|[1-9]\d+)(?:\b|$)|Quarter|Semi|Final/i.test(match.round || ''));
    const knockout = !resultsPage && knockoutEvent;
    const eliminatedPlayers = new Set();
    if (knockoutEvent) {
      const playerKey = name => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[’‘]/g, "'").trim().toLocaleLowerCase();
      const activePlayers = new Set(data.matches.filter(match => !['ended', 'cancelled', 'abandoned'].includes(match.status))
        .flatMap(match => [match.home, match.away]).filter(Boolean).map(playerKey));
      data.matches.forEach(match => {
        if (match.status !== 'ended' || /group|round robin|league stage/i.test(match.round || '') ||
            match.homeScore == null || match.awayScore == null) return;
        const homeScore = Number(match.homeScore);
        const awayScore = Number(match.awayScore);
        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) return;
        const loser = homeScore < awayScore ? match.home : match.away;
        if (loser && !activePlayers.has(playerKey(loser))) eliminatedPlayers.add(loser);
      });
    }
    const soon = match => match.status === 'upcoming' && Date.parse(match.startsAt) >= now &&
      Date.parse(match.startsAt) <= now + 48 * 60 * 60 * 1000;
    const matchFilterStatus = match => match.status === 'ended' ? 'ended' :
      ['live', 'suspended'].includes(match.status) ? 'live' : soon(match) ? 'upcoming' : 'later';
    const finished = current.filter(match => match.status === 'ended');
    const active = current.filter(match => !['ended', 'upcoming'].includes(match.status));
    const groups = resultsPage ? [
      { title: '最新比赛 · 按时间倒序', matches: current },
    ] : [
      { title: '今日已结束与进行中', matches: [...finished, ...active] },
      { title: '即将开始（未来48小时）', matches: current.filter(soon) },
    ];
    const later = resultsPage ? [] : current.filter(match => match.status === 'upcoming' && !soon(match));
    const matchRow = match => {
      const when = match.startsAt ? dateParts(match.startsAt) : null;
      const live = match.status === 'live';
      const inProgress = ['live', 'suspended'].includes(match.status);
      const scored = ['ended', 'live', 'suspended'].includes(match.status);
      const homeScore = !scored || match.homeScore == null ? '–' : match.homeScore;
      const awayScore = !scored || match.awayScore == null ? '–' : match.awayScore;
      const searchNames = `${match.home} ${player(match.home)} ${match.away} ${player(match.away)}`;
      return `<article class="inline-bracket-match match-fixture ${inProgress ? 'match-live' : ''}" data-live-match="${escape(match.id)}"
        data-match-status="${escape(match.status)}" data-match-filter-status="${matchFilterStatus(match)}"
        data-match-date="${match.startsAt ? localDay(match.startsAt) : ''}" data-match-search="${escape(searchNames)}" data-score="${homeScore}–${awayScore}">
        <div class="match-when"><strong>${when ? escape(when.clock) : '待定'}</strong>
          <span>${when ? escape(when.date) : '时间待公布'}</span><small>第 ${escape(match.number || '—')} 场</small>
          ${live ? '<b class="match-live-indicator">● 正在直播</b>' : !['ended', 'upcoming'].includes(match.status) ?
            `<b class="match-live-indicator">◉ ${escape(labels[match.status] || '状态待确认')}</b>` : ''}</div>
        <div class="match-pair">${entrant(match.home, 'home', eliminatedPlayers.has(match.home))}
          <div class="match-score"><span>${inProgress ? '局数' : '比分'}</span><div><b>${homeScore}</b><i aria-hidden="true"></i><b>${awayScore}</b></div>
          ${inProgress ? '<div class="match-points" title="官方比分源暂未提供单局分数"><b>—</b><span>单局得分</span><b>—</b></div>' : ''}</div>${entrant(match.away, 'away', eliminatedPlayers.has(match.away))}</div>
      </article>`;
    };
    const renderGroup = group => {
      const ended = group.matches.filter(match => match.status === 'ended');
      const other = group.matches.filter(match => match.status !== 'ended');
      const rows = group.title === '今日已结束与进行中' && ended.length && other.length ?
        `${ended.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).map(matchRow).join('')}
         <div class="match-round-divider"><small>实时赛况</small><strong>${escape(roundName(other[0].round))}</strong></div>
         ${other.map(matchRow).join('')}` : group.matches.map(matchRow).join('');
      return `<section class="inline-bracket-round"><h4>${group.title} <span>· ${group.matches.length} 场</span></h4>${rows ||
        '<p class="inline-bracket-empty">暂无对应场次</p>'}</section>`;
    };
    const bracketCard = match => {
      const when = match.startsAt ? dateParts(match.startsAt) : null;
      const scored = ['ended', 'live', 'suspended'].includes(match.status);
      const homeScore = scored && match.homeScore != null ? match.homeScore : '–';
      const awayScore = scored && match.awayScore != null ? match.awayScore : '–';
      const searchNames = `${match.home} ${player(match.home)} ${match.away} ${player(match.away)}`;
      return `<article class="knockout-match" data-match-status="${escape(match.status)}" data-match-filter-status="${matchFilterStatus(match)}"
        data-match-date="${match.startsAt ? localDay(match.startsAt) : ''}" data-match-search="${escape(searchNames)}" data-score="${homeScore}–${awayScore}">
        <div class="knockout-match-meta"><span>第 ${escape(match.number || '—')} 场 · ${when ? escape(`${when.date} ${when.clock}`) : '时间待公布'}</span>
        ${match.status === 'ended' ? '' : `<strong>${escape(labels[match.status] || '待确认')}</strong>`}</div>
        <div class="knockout-match-players">${entrant(match.home, 'home', eliminatedPlayers.has(match.home))}
          <div class="knockout-score"><b>${homeScore}</b><span>:</span><b>${awayScore}</b></div>${entrant(match.away, 'away', eliminatedPlayers.has(match.away))}</div></article>`;
    };
    const bracket = () => {
      const rounds = [...new Set(current.map(match => match.round || '待确认轮次'))];
      return `<div class="knockout-chart" aria-label="淘汰赛对阵图">${rounds.map(round => {
        const matches = current.filter(match => (match.round || '待确认轮次') === round)
          .sort((a, b) => (a.number || 0) - (b.number || 0));
        return `<section class="knockout-round"><h4>${escape(roundName(round))}<span> · ${matches.length} 场</span></h4>
          <div class="knockout-round-matches">${matches.map(bracketCard).join('')}</div></section>`;
      }).join('')}</div>`;
    };
    const note = stale(data) ? '暂未取得最新数据，以下为上次同步记录' : '自动更新中 · 每 20 分钟采集';
    return `<section class="inline-bracket" data-inline-event-id="${escape(event.id)}" style="--event-color:${color(event)}" aria-label="${escape(event.name)}对阵信息">
      ${knockout ? bracket() : `<div class="inline-bracket-rounds live-score-rounds">${groups.map(renderGroup).join('')}</div>
      ${later.length ? `<details class="later-matches"><summary>其他待赛对阵 · ${later.length} 场（不在未来48小时内或时间待确认）</summary>${later.map(matchRow).join('')}</details>` : ''}`}
      ${earlier.length ? `<details class="earlier-matches"><summary>展开当天以前已结束的比赛 · ${earlier.length} 场</summary>
        ${earlier.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).map(knockout ? bracketCard : matchRow).join('')}</details>` : ''}
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
      badge.title = latest ? 'WST 官方比分；云函数每 20 分钟采集，页面每分钟检查更新' : '尚未取得 WST 比分数据';
    }
    if (['year', 'schedule', 'results', 'favorites'].includes(state.nav)) {
      const note = document.querySelector('.bottom-note');
      if (note) note.innerHTML = '<span>WST 比分由云函数每 20 分钟采集 · 页面每分钟检查更新 · 北京时间</span>' +
        `<span>${latest ? delayed ? '同步延迟，保留上次有效数据' : '查看赛事对阵中的各场比赛状态' : '等待首次同步'}</span>`;
    }
  };

  const style = document.createElement('style');
  style.textContent = '.live-score-rounds{max-height:none;overflow:visible;align-items:start}.match-entrant .match-name>small{display:none!important}.match-flag{filter:none!important;opacity:1!important;mix-blend-mode:normal!important;isolation:isolate}.match-flag svg,.match-flag svg *{filter:none!important;opacity:1!important;forced-color-adjust:none}@media(max-width:680px){.live-score-rounds{flex-direction:column}.live-score-rounds .inline-bracket-round{flex:none;min-width:0;width:100%}}';
  document.head.append(style);
  document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement && event.target.closest('.match-portrait')) event.target.remove();
  }, true);

  function refreshView() {
    const position = { left: scrollX, top: scrollY };
    const panel = document.querySelector('.live-score-rounds');
    const panelScroll = panel ? { top: panel.scrollTop, left: panel.scrollLeft } : null;
    const earlierOpen = Boolean(document.querySelector('.earlier-matches[open]'));
    render();
    if (earlierOpen) document.querySelector('.earlier-matches')?.setAttribute('open', '');
    if (panelScroll) document.querySelector('.live-score-rounds')?.scrollTo(panelScroll);
    window.scrollTo(position);
  }

  async function poll() {
    if (loading) return;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
    const changedDay = TODAY !== today;
    if (changedDay) { TODAY = today; CURRENT_MONTH = Number(today.slice(5, 7)) - 1; }
    loading = true;
    try {
      const cloudData = await window.CUE_LOAD_CLOUD_SCORES?.();
      if (cloudData?.version === 1 && cloudData.events) {
        const payload = JSON.stringify(cloudData);
        const oldFailure = readFailed;
        readFailed = false;
        snapshot = cloudData;
        loading = false;
        if (payload !== lastPayload || oldFailure || changedDay) {
          lastPayload = payload;
          refreshView();
        }
        return;
      }
    } catch (error) {
      console.debug('[snooker] cloud snapshot unavailable, using static fallback', error);
    }
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
