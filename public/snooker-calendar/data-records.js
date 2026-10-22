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
  let maximums = null;
  let sourceFailed = false;
  let lastAttempt = 0;
  let loading = false;
  const style = document.createElement('style');
  style.textContent = `.record-intro{margin:0 0 24px;color:var(--muted);line-height:1.7}.record-panel{max-width:1000px;border:1px solid var(--line);border-radius:14px;background:var(--card);overflow:hidden}.record-head,.record-row{display:grid;grid-template-columns:64px minmax(0,1fr) 90px;align-items:center;gap:18px;padding:14px 22px}.record-head{color:var(--muted);font-size:12px;border-bottom:1px solid var(--line)}.record-row{min-height:70px;border-bottom:1px solid var(--line)}.record-row:last-child{border-bottom:0}.record-rank{color:var(--purple);font-weight:800;font-size:20px}.record-name{min-width:0;font-size:16px;font-weight:700}.record-name small{display:block;margin-top:4px;color:var(--muted);font-size:12px;font-weight:400}.record-count{text-align:right;font-size:24px;font-weight:800;color:var(--text)}.record-source{max-width:1000px;margin:16px 0;color:var(--muted);font-size:12px;line-height:1.7}.record-source a{color:var(--purple)}@media(max-width:680px){.record-head,.record-row{grid-template-columns:42px minmax(0,1fr) 54px;gap:8px;padding:12px}.record-name{font-size:14px}.record-name small{font-size:11px}.record-count{font-size:20px}}`;
  document.head.append(style);

  function applyRecords() {
    const players = document.querySelector('[data-nav="players"]');
    if (players && !document.querySelector('[data-nav="records"]')) {
      const button = players.cloneNode(true);
      button.dataset.nav = 'records';
      button.classList.toggle('active', state.nav === 'records');
      button.innerHTML = `${icon('trophy')}数据纪录`;
      button.onclick = () => { state.nav = 'records'; document.body.classList.remove('menu-open'); window.scrollTo(0, 0); render(); };
      players.after(button);
    }
    if (state.nav !== 'records') return;
    const main = document.querySelector('main');
    if (!main) return;
    document.querySelector('header .crumb strong').textContent = ' /  数据纪录';
    document.body.dataset.activeNav = 'records';
    const records = maximums
      ? maximums.players.slice(0, 10).map(({ name, count }) => [translatedNames[name] || name, name, count])
      : fallbackRecords;
    const date = maximums
      ? new Date(maximums.fetchedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + '（北京时间）'
      : '2026 年 7 月 28 日';
    main.innerHTML = `<div class="title-row"><div><p class="eyebrow">WORLD SNOOKER CALENDAR</p><h1>数据纪录</h1><p class="subtitle">斯诺克历史纪录</p></div></div><h2>官方 147 单杆排名</h2><p class="record-intro">按球员在职业赛事中获 WST 官方认可的 147 次数排序。当前统计口径包含未转播场次，并非“有转播的 147”专属排名。</p><section class="record-panel" aria-label="官方147单杆排名"><div class="record-head"><span>排名</span><span>球员</span><span style="text-align:right">次数</span></div>${records.map(([zh,en,count]) => `<div class="record-row"><span class="record-rank">${records.findIndex(row => row[2] === count) + 1}</span><span class="record-name">${zh}<small>${en}</small></span><span class="record-count">${count}</span></div>`).join('')}</section><p class="record-source">${maximums ? `官方名录共 ${maximums.total} 杆 · 最近核对：${date}` : `备用数据快照：${date}`}。${sourceFailed ? '官方源暂不可用，保留上次有效结果。' : ''}来源：<a href="https://www.wst.tv/147s/allofficial147s/" target="_blank" rel="noopener">WST 官方 147 名录 ↗</a>。官方公布新纪录后定时同步。</p>`;
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
