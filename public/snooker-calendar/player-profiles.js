/* Official WST top 16 profile snapshot, checked 2026-10-20. */
(() => {
  const profiles = [
  {
    "rank": 1,
    "id": "895d376f-9f42-4e67-8a63-bc78676d0726",
    "name": "Zhao Xintong",
    "nickname": "The Cyclone",
    "dob": "1997-04-03",
    "turnedPro": 2016,
    "country": "CHN",
    "photo": "./assets/champions/zhao-xintong.jpg?v=solo-20261020",
    "photoEvent": "2025 世界锦标赛",
    "photoSource": "https://www.wpbsa.com/jubilant-zhao-makes-history-as-first-world-champion-from-china/"
  },
  {
    "rank": 2,
    "id": "d935d534-e696-4292-b773-e9b8efee1ea7",
    "name": "Wu Yize",
    "nickname": "The Lanzhou Lion",
    "dob": "2003-10-14",
    "turnedPro": 2021,
    "country": "CHN",
    "photo": "./assets/champions/wu-yize.jpg?v=solo-20261020",
    "photoEvent": "2026 世界锦标赛",
    "photoSource": "https://www.wpbsa.com/wu-rules-the-world-after-classic-crucible-final/"
  },
  {
    "rank": 3,
    "id": "e2f3cfe7-6138-4ce6-b1dc-77dcc1d0a65f",
    "name": "Judd Trump",
    "nickname": "The Ace in the Pack",
    "dob": "1989-08-20",
    "turnedPro": 2005,
    "country": "ENG",
    "photo": "./assets/champions/judd-trump.jpg",
    "photoEvent": "2024 英国锦标赛",
    "photoSource": "https://www.wst.tv/news/2024/december/01/top-trump-crowned-uk-champion/"
  },
  {
    "rank": 4,
    "id": "8b83133a-4c15-4275-811e-bdf2cb02702f",
    "name": "Neil Robertson",
    "nickname": "The Thunder From Down Under",
    "dob": "1982-02-11",
    "turnedPro": 1998,
    "country": "AUS",
    "photo": "./assets/champions/neil-robertson.jpg?v=front-20261020",
    "photoEvent": "2025 沙特阿拉伯大师赛",
    "photoSource": "https://www.wpbsa.com/robertson-beats-osullivan-in-immense-saudi-final/"
  },
  {
    "rank": 5,
    "id": "ba7831b4-ab75-4435-946a-c6f02e4e2d4b",
    "name": "Mark Selby",
    "nickname": "The Jester",
    "dob": "1983-06-19",
    "turnedPro": 1999,
    "country": "ENG",
    "photo": "./assets/champions/mark-selby.jpg",
    "photoEvent": "2025 威尔士公开赛",
    "photoSource": "https://www.wst.tv/news/2025/february/16/Selby-Wins-24th-Ranking-Title/"
  },
  {
    "rank": 6,
    "id": "a5eecca1-8302-4739-84fc-6721627baa43",
    "name": "John Higgins",
    "nickname": "Wizard of Wishaw",
    "dob": "1975-05-18",
    "turnedPro": 1992,
    "country": "SCT",
    "photo": "./assets/champions/john-higgins.jpg",
    "photoEvent": "2025 世界公开赛",
    "photoSource": "https://www.wst.tv/news/2025/march/01/Higgins-Ends-Long-Title-Drought-With-World-Open-Triumph/"
  },
  {
    "rank": 7,
    "id": "03fe92d3-ad85-434c-bc17-5fe02a496187",
    "name": "Shaun Murphy",
    "nickname": "The Magician",
    "dob": "1982-08-10",
    "turnedPro": 1998,
    "country": "ENG",
    "photo": "./assets/champions/shaun-murphy.jpg",
    "photoEvent": "2025 英国公开赛",
    "photoSource": "https://www.wst.tv/news/2025/september/28/Murphy-Is-Best-Of-British/"
  },
  {
    "rank": 8,
    "id": "6aaddcbb-345c-474a-9069-e7757e155729",
    "name": "Mark Williams",
    "nickname": "The Welsh Potting Machine",
    "dob": "1975-03-21",
    "turnedPro": 1992,
    "country": "WAL",
    "photo": "./assets/champions/mark-williams.jpg?v=solo-20261020",
    "photoEvent": "2023 英国公开赛",
    "photoSource": "https://www.wpbsa.com/wonderful-williams-claims-gold-in-cheltenham/"
  },
  {
    "rank": 9,
    "id": "a8c0d3a6-706b-4bf0-8dce-9cde97fe88c4",
    "name": "Kyren Wilson",
    "nickname": "The Warrior",
    "dob": "1991-12-23",
    "turnedPro": 2010,
    "country": "ENG",
    "photo": "./assets/champions/kyren-wilson.jpg?v=solo-20261020",
    "photoEvent": "2024 世界锦标赛",
    "photoSource": "https://www.wpbsa.com/king-kyren-wilson-is-new-crucible-champion/"
  },
  {
    "rank": 10,
    "id": "ec561f17-e982-43b3-8807-82fc76adbe75",
    "name": "Barry Hawkins",
    "nickname": "The Hawk",
    "dob": "1979-04-23",
    "turnedPro": 1996,
    "country": "ENG",
    "photo": "./assets/champions/barry-hawkins.jpg?v=front-20261020",
    "photoEvent": "2017 世界大奖赛",
    "photoSource": "https://www.wpbsa.com/hawkins-claims-guild-hall-glory/"
  },
  {
    "rank": 11,
    "id": "a1beeb4b-2493-476c-9682-1900eb83c2d5",
    "name": "Chris Wakelin",
    "nickname": "The Monster",
    "dob": "1992-03-16",
    "turnedPro": 2013,
    "country": "ENG",
    "photo": "./assets/champions/chris-wakelin.jpg",
    "photoEvent": "2025 苏格兰公开赛",
    "photoSource": "https://www.wst.tv/news/2025/december/21/wakelin-crowned-in-edinburgh/"
  },
  {
    "rank": 12,
    "id": "c37aba27-5b12-4fae-8a8b-9e749c7a25f3",
    "name": "Mark Allen",
    "nickname": "The Pistol",
    "dob": "1986-02-22",
    "turnedPro": 2005,
    "country": "NIR",
    "photo": "./assets/champions/mark-allen.jpg",
    "photoEvent": "2024 球员锦标赛",
    "photoSource": "https://www.wpbsa.com/pistol-fires-to-11th-ranking-crown/"
  },
  {
    "rank": 13,
    "id": "226c7294-655e-4925-bcde-17330ddfc438",
    "name": "Ronnie O'Sullivan",
    "nickname": "The Rocket",
    "dob": "1975-12-05",
    "turnedPro": 1992,
    "country": "ENG",
    "photo": "./assets/ronnie/championship.jpg"
  },
  {
    "rank": 14,
    "id": "c3d39c08-92fd-471b-8901-903a4bd22027",
    "name": "Xiao Guodong",
    "nickname": "The Chongqing Cyberman",
    "dob": "1989-02-10",
    "turnedPro": 2007,
    "country": "CHN",
    "photo": "./assets/champions/xiao-guodong.jpg",
    "photoEvent": "2024 武汉公开赛",
    "photoSource": "https://www.wst.tv/news/2024/october/12/xiao-claims-maiden-title-glory/"
  },
  {
    "rank": 15,
    "id": "3ff06750-8c3c-456c-8fac-58209b6f679e",
    "name": "Ding Junhui",
    "nickname": "The Dragon",
    "dob": "1987-04-01",
    "turnedPro": 2003,
    "country": "CHN",
    "photo": "./assets/champions/ding-junhui.jpg",
    "photoEvent": "2024 国际锦标赛",
    "photoSource": "https://www.wst.tv/news/2024/november/10/ding-claims-nanjing-glory/"
  },
  {
    "rank": 16,
    "id": "c796b82d-1040-422d-b27d-9249310b99a3",
    "name": "Ali Carter",
    "nickname": "The Captain",
    "dob": "1979-07-25",
    "turnedPro": 1996,
    "country": "ENG",
    "photo": "./assets/champions/ali-carter.jpg?v=front-20261020",
    "photoEvent": "2026 英格兰公开赛",
    "photoSource": "https://www.wpbsa.com/captain-soars-to-english-open-crown/"
  }
];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
  const canonical = name => String(name).replace(/’/g, "'").replace('Mark J Williams', 'Mark Williams');
  const meta = player => playerMeta[player.name] || playerMeta[player.name.replace(/'/g, '’')] || [player.name, '', player.country, 'INT'];
  const ui = { name: "Ronnie O'Sullivan", tab: '球员概览', lightbox: false };
  const tabs = ['球员概览', '生涯荣誉', '比赛记录', '技术特点'];
  const original = playerInfoView;
  const photo = player => player.photo;
  const source = player => `https://www.wst.tv/players/${player.id}`;
  const styles = document.createElement('style');
  styles.textContent = `
    .profile-picker{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin:0 0 18px}
    .profile-choice{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;padding:8px 4px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text);font-size:11px;text-align:center}
    .profile-choice[aria-pressed=true]{border-color:var(--selection);box-shadow:inset 0 0 0 1px var(--selection)}
    .profile-choice img{width:64px;height:48px;object-fit:contain;object-position:center}
    .profile-choice span{max-width:100%;overflow-wrap:anywhere;line-height:1.5}
    .profile-choice small{color:var(--muted);font-size:10px}
    .ronnie-main-photo img{object-fit:contain!important;object-position:center!important}.profile-photo-credit{margin:10px 0 0;font-size:11px;line-height:1.6;color:var(--muted)}
    .profile-source{font-size:11px;color:var(--muted);line-height:1.7;margin:0 0 12px}
    @media(max-width:1000px){.profile-picker{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @media(max-width:480px){.profile-picker{gap:5px}.profile-choice{font-size:10px;padding:6px 2px}.profile-choice img{width:60px;height:42px}}
  `;
  document.head.append(styles);

  function orderedProfiles() {
    return [...profiles].sort((a, b) => a.rank - b.rank);
  }
  function records(player) {
    return events.flatMap(event => ((status(event) === 'ended' ? event.result : event.matches) || [])
      .filter(row => canonical(row[1]) === player.name || canonical(row[3]) === player.name || row[1] === meta(player)[0] || row[3] === meta(player)[0])
      .map(row => ({ event, row }))).sort((a, b) => b.event.start.localeCompare(a.event.start));
  }
  function content(player) {
    const [cn, , country, code] = meta(player);
    if (ui.tab === '生涯荣誉') {
      const wins = events.filter(event => canonical(event.champion?.en || '') === player.name || event.champion?.name === cn)
        .sort((a, b) => b.start.localeCompare(a.start));
      return '<h3>本站收录的冠军记录</h3>' + (wins.length ? wins.map(event => `<div class="ronnie-match"><small>${escape(fullDate(event))}</small><div><span>${escape(event.name)}</span><b>冠军</b></div></div>`).join('') : '<p class="ronnie-bio">本站暂未收录该球员的冠军记录。</p>') + '<p class="ronnie-bio">此处仅展示本站收录赛事，完整生涯荣誉请查看 WST 官方球员资料。</p>';
    }
    if (ui.tab === '比赛记录') {
      const rows = records(player);
      return '<h3>本站收录的比赛记录</h3>' + (rows.length ? rows.map(({ event, row }) => `<div class="ronnie-match"><small>${escape(event.name)} · ${escape(row[0])}</small><div><span>${escape(row[1])}</span><b>${escape(row[2])}</b><span>${escape(row[3])}</span></div></div>`).join('') : '<p class="ronnie-bio">本站暂未收录该球员的逐场比赛记录。</p>');
    }
    if (ui.tab === '技术特点') return `<h3>${escape(player.nickname || cn)}</h3><p class="ronnie-bio">WST 官方昵称：${escape(player.nickname || '暂无')}。</p><p class="ronnie-bio">官方排名资料未提供技术能力评分，详细生涯介绍与球风资料可在下方 WST 官方档案中查看。</p>`;
    return `<dl class="ronnie-facts"><div><dt>国籍 / 地区</dt><dd>${escape(country)} ${flagIcon(code, country)}</dd></div><div><dt>出生日期</dt><dd>${escape(player.dob.replaceAll('-', '.'))}</dd></div><div><dt>转职业</dt><dd>${player.turnedPro}</dd></div><div><dt>官方昵称</dt><dd>${escape(player.nickname || '暂无')}</dd></div></dl><p class="ronnie-bio">${escape(cn)}的基础资料来自 WST 官方球员档案。可切换查看本站收录的冠军及比赛记录。</p>`;
  }
  playerInfoView = function () {
    // Keep the original Ronnie profile, including its established styles and interactions.
    const ronnie = original();
    const player = profiles.find(item => item.name === ui.name) || profiles[0];
    const [cn, , country, code] = meta(player);
    const picker = `<div class="profile-picker" role="group" aria-label="世界前16球员档案">${orderedProfiles().map(item => `<button type="button" class="profile-choice" data-player-profile="${escape(item.name)}" aria-pressed="${ui.name === item.name}"><img src="${escape(photo(item))}" alt="" loading="lazy" referrerpolicy="no-referrer"><span>${escape(meta(item)[0])}</span><small>世界第 ${item.rank} 位</small></button>`).join('')}</div><p class="profile-source">按世界排名排列 · 档案资料核对于 2026.10.20 · <a href="https://www.wst.tv/rankings/" target="_blank" rel="noopener">WST 官方排名 ↗</a></p>`;
    queueMicrotask(() => {
      const note = document.querySelector('main .bottom-note');
      if (!note || state.nav !== 'players') return;
      const label = note.querySelector('span');
      if (label) label.textContent = cn + '球员档案';
      const link = note.querySelector('a');
      if (link) { link.href = source(player); link.textContent = 'WST 球员资料 ↗'; }
    });
    if (player.name === "Ronnie O'Sullivan") return picker + ronnie;
    const navigation = `<nav class="ronnie-profile-tabs" role="tablist" aria-label="球员档案内容">${tabs.map(tab => `<button type="button" class="ronnie-tab" role="tab" data-player-info-tab="${tab}" aria-selected="${ui.tab === tab}">${tab}</button>`).join('')}</nav>`;
    return picker + navigation + `<section class="ronnie-profile"><div class="ronnie-detail-column"><section class="ronnie-detail-panel" role="tabpanel"><p class="ronnie-profile-eyebrow">PLAYER PROFILE · ${ui.tab}</p><h2>${escape(player.name)}</h2><p class="ronnie-name-cn">${escape(cn)} · ${flagIcon(code, country)} ${escape(country)}</p><div class="ronnie-nickname">${escape(player.nickname)}</div><div class="ronnie-section-content">${content(player)}</div><div class="ronnie-actions"><a class="ronnie-action" href="${source(player)}" target="_blank" rel="noopener">WST 官方球员档案 ↗</a></div></section></div><div class="ronnie-photo-column"><div class="ronnie-photo-panel"><span class="ronnie-photo-tag">夺冠时刻</span><button type="button" class="ronnie-main-photo player-profile-photo" data-player-photo-open aria-label="放大${escape(cn)}夺冠照片"><img src="${escape(photo(player))}" alt="${escape(cn)} · ${escape(player.photoEvent)}夺冠照片" referrerpolicy="no-referrer"></button><p class="profile-photo-credit">${escape(player.photoEvent)} · <a href="${escape(player.photoSource)}" target="_blank" rel="noopener">照片来源：${player.photoSource.includes("wpbsa.com") ? "WPBSA" : "WST"} ↗</a></p></div></div>${ui.lightbox ? `<div class="ronnie-lightbox" data-player-photo-close role="dialog" aria-modal="true" aria-label="${escape(cn)}夺冠照片"><div class="ronnie-lightbox-inner"><button type="button" data-player-photo-close aria-label="关闭照片">关闭 ×</button><img src="${escape(photo(player))}" alt="${escape(cn)}夺冠照片"></div></div>` : ''}</section>`;
  };
  document.addEventListener('click', event => {
    const choice = event.target.closest('[data-player-profile]');
    const tab = event.target.closest('[data-player-info-tab]');
    if (choice) { ui.name = choice.dataset.playerProfile; ui.tab = '球员概览'; ui.lightbox = false; render(); }
    else if (tab) { ui.tab = tab.dataset.playerInfoTab; render(); }
    else if (event.target.closest('[data-player-photo-open]')) { ui.lightbox = true; render(); }
    else if (event.target.closest('[data-player-photo-close]')) { ui.lightbox = false; render(); }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && ui.lightbox) { ui.lightbox = false; render(); }
  });
  render();
})();
