(() => {
  // WST-recognised career totals, with a dated snapshot cross-check.
  const fallbackRecords = [
    ['罗尼·奥沙利文', 'Ronnie O’Sullivan', 17],
    ['约翰·希金斯', 'John Higgins', 13],
    ['斯蒂芬·亨德利', 'Stephen Hendry', 11],
    ['肖恩·墨菲', 'Shaun Murphy', 10],
    ['斯图尔特·宾汉姆', 'Stuart Bingham', 9],
    ['贾德·特鲁姆普', 'Judd Trump', 9],
    ['丁俊晖', 'Ding Junhui', 7],
    ['塔猜亚·乌诺', 'Thepchaiya Un-Nooh', 7],
    ['马克·塞尔比', 'Mark Selby', 6],
    ['加里·威尔逊', 'Gary Wilson', 6]
  ];
  const translatedNames = Object.fromEntries(fallbackRecords.map(([zh, en]) => [en.replace('’', "'"), zh]));
  const portraits = {
    "Ronnie O'Sullivan": '465528d0-9f45-11ee-891e-cf1c675ba461.png',
    'John Higgins': '09ede500-9b3d-11ee-aad9-bff8f06264c6.png',
    'Stephen Hendry': './stephen-hendry-seniors.jpg',
    'Shaun Murphy': '77b40e90-9b72-11ee-b325-2f54be7c63b2.png',
    'Stuart Bingham': '1d6bc490-6fe2-11f1-99da-8bc343e463ff.png',
    'Judd Trump': 'b217a330-9b95-11ee-a374-adc81d8d39cb.png',
    'Ding Junhui': '7ba311f0-9b44-11ee-aa3d-53b946c6a0b2.png',
    'Thepchaiya Un-Nooh': '1c75cbd0-6fe2-11f1-b5ab-9f9007ededc8.png',
    'Mark Selby': '2ac033b0-9b8c-11ee-8797-bd4329db509d.png',
    'Gary Wilson': 'a56442a0-9c1d-11ee-a781-83e0e6ce5afb.png'
  };
  const portraitUrl = name => {
    const file = portraits[name.replace('’', "'")];
    return file?.startsWith('./') ? file : file ? `https://images.gc.wstservices.co.uk/600x600/${file}` : './player-placeholder.svg';
  };
  let maximums = null;
  let sourceFailed = false;
  let lastAttempt = 0;
  let loading = false;
  const style = document.createElement('style');
  style.textContent = `.record-intro{margin:0 0 24px;color:var(--muted);line-height:1.7}.record-panel{max-width:1000px}.record-podium{display:grid;grid-template-areas:"runner champion third";grid-template-columns:1fr 1.12fr 1fr;align-items:end;gap:10px;margin-bottom:12px}.record-podium-card{position:relative;min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--card)}.record-podium-card.runner-up{grid-area:runner}.record-podium-card.champion{grid-area:champion;border-color:var(--purple)}.record-podium-card.third{grid-area:third}.record-podium-image{position:relative;height:220px;overflow:hidden;background:var(--card)}.record-podium-card.champion .record-podium-image{height:270px}.record-podium-image img{display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom}.record-podium-rank{position:absolute;top:8px;left:16px;font-size:80px;font-weight:900;line-height:1;color:var(--purple);opacity:.72;pointer-events:none}.record-podium-score{position:absolute;right:12px;bottom:12px;padding:4px 9px;border-radius:6px;background:var(--purple);color:var(--bg);font-size:23px;font-weight:900;line-height:1.1}.record-podium-score small{font-size:11px;margin-left:3px}.record-podium-name{min-height:68px;padding:12px 14px;background:var(--bg);font-size:16px;font-weight:800;line-height:1.35;overflow-wrap:anywhere}.record-podium-name small{display:block;margin-top:4px;color:var(--muted);font-size:12px;font-weight:400}.record-list{display:grid;gap:4px}.record-row{display:grid;grid-template-columns:42px 52px minmax(0,1fr) 80px;align-items:center;gap:14px;min-height:72px;padding:9px 18px;background:var(--card);border:1px solid var(--line);border-radius:7px}.record-rank{color:var(--purple);font-weight:900;font-size:26px}.record-photo{width:48px;height:48px;object-fit:cover;border:1px solid var(--line);border-radius:7px;background:var(--card)}.record-name{min-width:0;font-size:16px;font-weight:700;overflow-wrap:anywhere}.record-name small{display:block;margin-top:4px;color:var(--muted);font-size:12px;font-weight:400}.record-count{text-align:right;font-size:24px;font-weight:900;color:var(--text);white-space:nowrap}.record-count small{font-size:11px;font-weight:500;color:var(--muted)}.record-source{max-width:1000px;margin:16px 0;color:var(--muted);font-size:12px;line-height:1.7}.record-source a{color:var(--purple)}@media(max-width:680px){.record-podium{grid-template-areas:"champion champion" "runner third";grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.record-podium-card.champion .record-podium-image{height:230px}.record-podium-image{height:150px}.record-podium-rank{font-size:58px;left:10px}.record-podium-score{right:8px;bottom:8px;font-size:18px}.record-podium-name{min-height:64px;padding:10px;font-size:14px}.record-podium-name small{font-size:11px}.record-row{grid-template-columns:26px 40px minmax(0,1fr) 56px;gap:8px;min-height:60px;padding:7px 9px}.record-rank{font-size:20px}.record-photo{width:40px;height:40px}.record-name{font-size:13px}.record-name small{font-size:10px}.record-count{font-size:19px}}`;
  document.head.append(style);

  function applyRecords() {
    const players = document.querySelector('[data-nav="players"]');
    if (players && !document.querySelector('[data-nav="records"]')) {
      const button = players.cloneNode(true);
      button.dataset.nav = 'records';
      button.classList.toggle('active', state.nav === 'records');
      button.innerHTML = `${icon('crown')}荣誉纪录`;
      button.onclick = () => { state.nav = 'records'; document.body.classList.remove('menu-open'); window.scrollTo(0, 0); render(); };
      players.after(button);
    }
    if (state.nav !== 'records') return;
    const main = document.querySelector('main');
    if (!main) return;
    document.querySelector('header .crumb strong').textContent = ' /  荣誉纪录';
    document.body.dataset.activeNav = 'records';
    const records = maximums
      ? maximums.players.slice(0, 10).map(({ name, count }) => [translatedNames[name] || name, name, count])
      : fallbackRecords;
    const date = maximums
      ? new Date(maximums.fetchedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + '（北京时间）'
      : '2026 年 7 月 28 日';
    const rankOf = count => records.findIndex(row => row[2] === count) + 1;
    const podiumCard = (index, place) => {
      const [zh, en, count] = records[index];
      return `<article class="record-podium-card ${place}" aria-label="第${rankOf(count)}名 ${zh} ${count}杆"><div class="record-podium-image"><img src="${portraitUrl(en)}" alt="${zh}头像" onerror="this.onerror=null;this.src='./player-placeholder.svg'"><span class="record-podium-rank">${rankOf(count)}</span><span class="record-podium-score">${count}<small>杆</small></span></div><div class="record-podium-name">${zh}<small>${en}</small></div></article>`;
    };
    const podium = `<div class="record-podium">${podiumCard(1, 'runner-up')}${podiumCard(0, 'champion')}${podiumCard(2, 'third')}</div>`;
    const list = `<div class="record-list">${records.slice(3).map(([zh, en, count]) => `<div class="record-row"><span class="record-rank">${rankOf(count)}</span><img class="record-photo" src="${portraitUrl(en)}" alt="${zh}头像" loading="lazy" onerror="this.onerror=null;this.src='./player-placeholder.svg'"><span class="record-name">${zh}<small>${en}</small></span><span class="record-count">${count}<small> 杆</small></span></div>`).join('')}</div>`;
    main.innerHTML = `<div class="title-row"><div><p class="eyebrow">WORLD SNOOKER CALENDAR</p><h1>荣誉纪录</h1><p class="subtitle">斯诺克历史纪录</p></div></div><h2>官方 147 单杆排名</h2><p class="record-intro">按球员在职业赛事中获 WST 官方认可的 147 次数排序。当前统计口径包含未转播场次，并非“有转播的 147”专属排名。</p><section class="record-panel" aria-label="官方147单杆排名">${podium}${list}</section><p class="record-source">${maximums ? `官方名录共 ${maximums.total} 杆 · 最近核对：${date}` : `备用数据快照：${date}`}。${sourceFailed ? '官方源暂不可用，保留上次有效结果。' : ''}来源：<a href="https://www.wst.tv/147s/allofficial147s/" target="_blank" rel="noopener">WST 官方 147 名录 ↗</a>。官方公布新纪录后定时同步。亨德利照片：<a href="https://seniorsnooker.com/players-profiles/stephen-hendry/" target="_blank" rel="noopener">World Seniors Snooker（摄影：Monique Limbos）</a>。</p>`;
    refreshMaximums();
  }
  async function refreshMaximums() {
    if (loading || Date.now() - lastAttempt < 5 * 60 * 1000 || !window.CUE_LOAD_CLOUD_SCORES) return;
    loading = true;
    lastAttempt = Date.now();
    try {
      const snapshot = await window.CUE_LOAD_CLOUD_SCORES();
      const next = snapshot.maximums;
      if (next?.total >= 246 && Array.isArray(next.players) && next.players.length >= 10 &&
          next.players.every(player => typeof player.name === 'string' && Number.isInteger(player.count) && player.count > 0)) {
        const changed = !maximums || next.fetchedAt !== maximums.fetchedAt || sourceFailed !== Boolean(snapshot.failures?.maximums);
        maximums = next;
        sourceFailed = Boolean(snapshot.failures?.maximums);
        if (changed && state.nav === 'records') render();
      }
    } catch {
      const changed = !sourceFailed;
      sourceFailed = true;
      if (changed && state.nav === 'records') render();
    } finally {
      loading = false;
    }
  }
  const previousRender = render;
  render = function () { previousRender(); applyRecords(); };
  applyRecords();
  setInterval(() => { if (state.nav === 'records' && !document.hidden) refreshMaximums(); }, 5 * 60 * 1000);
})();
