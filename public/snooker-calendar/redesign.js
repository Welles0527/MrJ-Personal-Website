/* Visual layout from the supplied demo; the existing data and filters remain authoritative. */
(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const labels = { live: '正在进行', upcoming: '即将开始', ended: '已结束' };
  const dateLabel = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '日期待定';
    const date = new Date(`${value}T12:00:00+08:00`);
    const weekday = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'short' }).format(date);
    return `${Number(value.slice(5, 7))}月${Number(value.slice(8))}日 ${weekday}`;
  };
  const stylesheet = document.createElement('style');
  stylesheet.textContent = `
    body[data-active-nav="schedule"]{font-size:14px;line-height:1.55}
    body[data-active-nav="schedule"] .title-row,body[data-active-nav="schedule"] .legend-row,body[data-active-nav="schedule"] .status-filter,body[data-active-nav="schedule"] main>.theme-picker{display:none}
    body[data-active-nav="schedule"] main>div[style="height:26px"]{display:none}
    body[data-active-nav="schedule"] .schedule-control{margin:0 0 8px;min-height:0;justify-content:flex-end}body[data-active-nav="schedule"] .schedule-control>div{display:none}
    body[data-active-nav="schedule"] .details-list{gap:12px}
    body[data-active-nav="results"] .event-row-card[data-event-status="ended"]{background:transparent!important;border:0;border-bottom:1px solid var(--line);border-radius:0;box-shadow:none!important}
    .redesign-hero.event-card{position:relative;display:flex;align-items:center;gap:24px;min-height:145px;padding:22px 30px;border:1px solid var(--line);border-radius:17px;overflow:hidden;background:linear-gradient(112deg,var(--card),color-mix(in srgb,var(--selection) 8%,var(--bg)));box-shadow:0 15px 36px #00000015;isolation:isolate}
    .redesign-hero .event-row-main{display:flex;flex:1;min-width:0;padding:0;gap:20px;text-align:left;align-items:center;background:transparent}
    .redesign-hero .event-big-icon{width:62px;height:62px;flex:0 0 62px;border:1px solid color-mix(in srgb,var(--selection) 35%,var(--line));border-radius:17px;color:var(--selection);background:color-mix(in srgb,var(--selection) 7%,var(--card))}
    .redesign-hero .event-big-icon svg{width:29px;height:29px}.redesign-hero-copy{min-width:0}
    .redesign-hero-eyebrow{display:flex;gap:10px;align-items:center;font-size:10px;letter-spacing:2px;font-weight:700;color:var(--selection);margin-bottom:8px}
    .redesign-hero-eyebrow .badge{letter-spacing:0;font-size:10px;white-space:nowrap}
    .redesign-hero h2{font-size:30px;line-height:1.2;margin:0;letter-spacing:.5px}.redesign-hero h2 small{margin-left:10px;font-size:13px;font-weight:400;color:var(--muted);letter-spacing:0}
    .redesign-hero-meta{display:flex;align-items:center;flex-wrap:wrap;gap:16px;margin-top:12px;font-size:12px;color:var(--muted)}
    .redesign-hero-meta span{display:inline-flex;align-items:center;gap:6px}.redesign-hero-meta svg{width:15px;height:15px;color:var(--selection)}
    .redesign-hero-right{display:flex;align-items:center;gap:22px;z-index:1;flex-shrink:0}.redesign-prize{padding-left:24px;border-left:1px solid var(--line)}
    .redesign-prize small,.redesign-prize span{display:block;font-size:10px;color:var(--muted)}.redesign-prize strong{display:block;font-size:29px;font-weight:750;letter-spacing:-1px;color:var(--selection)}
    .redesign-detail-button{padding:10px 13px;border:1px solid var(--selection);border-radius:9px;background:var(--selection);color:var(--selection-ink);font-size:12px;font-weight:700;white-space:nowrap}
    .redesign-hero .save{top:6px;right:8px;width:25px;height:25px;padding:4px}
    .redesign-table-art{position:absolute;right:120px;top:-30px;width:370px;height:290px;z-index:-1;pointer-events:none;opacity:.35;transform:rotate(-7deg);border:2px solid color-mix(in srgb,var(--selection) 25%,transparent);border-radius:50%}
    .redesign-table-art i{position:absolute;top:60px;left:140px;width:76px;height:76px;border-radius:50%;background:radial-gradient(circle at 31% 23%,#f9deda,#a8091d 28%,#690613 65%,#16070b);box-shadow:8px 16px 16px #0005}
    .redesign-table-art i:nth-child(2){top:100px;left:212px;width:62px;height:62px}.redesign-table-art i:nth-child(3){top:27px;left:236px;width:50px;height:50px}.redesign-table-art i:nth-child(4){top:176px;left:90px;width:57px;height:57px;background:radial-gradient(circle at 28% 18%,white,#dfdfd4 48%,#767d6f)}
    .redesign-panel.inline-bracket{padding:0;margin:0;background:transparent;border-radius:0}
    .redesign-panel .match-date-calendar{display:flex;align-items:stretch;padding:5px 7px;gap:4px;border:1px solid var(--line);background:var(--card);border-radius:13px;min-height:84px;margin:0 0 18px;scroll-margin-top:90px}
    .redesign-panel .match-date-list{display:flex;order:1;flex:1;min-width:0;overflow:auto;scrollbar-width:none;gap:4px;background:transparent;border:0;border-radius:0}
    .redesign-panel .match-date-option{flex:1;min-width:90px;min-height:72px;align-items:flex-start;padding:6px 11px;border:0!important;border-radius:9px;gap:2px;text-align:left;background:transparent}
    .redesign-panel .match-date-option strong{font-size:24px}.redesign-panel .match-date-option small,.redesign-panel .match-date-option span{font-size:10px}
    .redesign-panel .match-date-option.is-selected{background:var(--selection);color:var(--selection-ink)}.redesign-panel .match-date-option.is-selected small,.redesign-panel .match-date-option.is-selected span{color:inherit}
    .redesign-panel .match-date-option.is-today:not(.is-selected){background:color-mix(in srgb,var(--selection) 12%,var(--card))}
    .redesign-panel .match-date-count{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:24px;height:24px;background:color-mix(in srgb,var(--text) 8%,transparent);font-size:10px}
    .redesign-panel .match-date-all{order:2;flex:0 0 100px;border:0;border-left:1px solid var(--line);border-radius:0;background:transparent;font-size:11px;margin-left:3px;color:var(--muted);height:auto}
    .redesign-panel .match-date-all.is-selected{color:var(--selection);background:color-mix(in srgb,var(--selection) 7%,transparent)}
    .redesign-content-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:22px;align-items:start}.redesign-match-main{min-width:0}
    .redesign-list-top{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:12px}.redesign-list-title h3{margin:0 0 5px;font-size:21px;line-height:1.3}.redesign-list-title p{font-size:12px;color:var(--muted);margin:0}
    .redesign-panel .match-controls-row{margin:0 0 10px;gap:8px;align-items:center;flex-direction:row;flex-wrap:wrap}
    .redesign-panel .match-status-filters{border:0;background:transparent;gap:7px;overflow:visible;flex:1 1 auto;flex-wrap:wrap}
    .redesign-panel .match-status-filters button{display:flex;gap:7px;min-height:38px;padding:0 12px;border:1px solid var(--line);border-radius:8px;font-size:12px;background:var(--card);color:var(--muted)}
    .redesign-panel .match-status-filters button:before{content:'';width:7px;height:7px;border-radius:50%;background:var(--muted)}
    .redesign-panel .match-status-filters button[data-match-filter="live"]:before{background:var(--live,var(--selection))}.redesign-panel .match-status-filters button[data-match-filter="upcoming"]:before{background:var(--upcoming,var(--muted))}
    .redesign-panel .match-status-filters button[aria-pressed="true"]{background:var(--selection);color:var(--selection-ink);border-color:var(--selection)}
    .redesign-panel .match-status-filters button b{padding:2px 6px;border-radius:8px;background:color-mix(in srgb,var(--text) 8%,transparent);font-size:10px}
    .redesign-panel .match-player-filters{flex:0 1 155px;margin:0}.redesign-panel .match-player-filters summary{min-height:38px;font-size:12px}
    .redesign-panel .knockout-chart,.redesign-panel .inline-bracket-rounds{padding:0;display:block}
    .redesign-status-group{margin-top:9px;border:1px solid var(--line);border-radius:13px;overflow:hidden;background:var(--card)}
    .redesign-status-group[data-group-status="ended"],.redesign-status-group[data-group-status="ended"] .redesign-status-heading{background:transparent}
    .redesign-status-group[data-group-status="ended"]{border:0;border-radius:0;box-shadow:none}
    .has-winner,.has-winner .bracket-player,.has-winner [data-bracket-player],.has-winner .match-name{background:transparent!important;box-shadow:none!important}
    .live-results-list .inline-bracket-round{background:transparent!important}
    .redesign-status-heading{height:45px;display:flex;gap:9px;align-items:center;padding:0 17px;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--selection) 4%,var(--card));font-size:12px;margin:0!important;color:var(--text)!important}
    .redesign-status-heading:before{content:'';width:8px;height:8px;border-radius:50%;background:var(--muted)}.redesign-status-group[data-group-status="live"] .redesign-status-heading:before{background:var(--live,var(--selection))}.redesign-status-group[data-group-status="upcoming"] .redesign-status-heading:before{background:var(--upcoming,var(--muted))}
    .redesign-status-heading small{font-size:11px;color:var(--muted);font-weight:400}.redesign-status-heading>span{margin-left:auto;font-size:10px;color:var(--muted);font-weight:400}
    .redesign-panel .knockout-match,.redesign-panel .knockout-match.has-winner,.redesign-panel .match-fixture.inline-bracket-match,.redesign-panel .earlier-matches .knockout-match{display:grid;grid-template-columns:85px minmax(0,1fr) 65px 14px;align-items:center;gap:8px;min-height:83px;padding:11px 14px;margin:0;border:0;border-bottom:1px solid var(--line);border-radius:0;background:transparent!important;box-shadow:none}
    .redesign-panel .knockout-match:last-child,.redesign-panel .match-fixture:last-child{border-bottom:0}.redesign-panel [data-redesign-match]{cursor:pointer}.redesign-panel [data-redesign-match]:focus-visible{outline:2px solid var(--selection);outline-offset:-3px}
    .redesign-panel .knockout-match-meta{display:flex;flex-direction:column;align-items:flex-start;gap:5px;font-size:10px}.redesign-panel .match-clock,.redesign-panel .match-when strong{font-size:17px;line-height:1.1}
    .redesign-panel .knockout-match-meta strong{font-size:10px;font-weight:400}.redesign-panel .match-when{display:flex;flex-direction:column;align-items:flex-start;gap:5px}
    .redesign-panel .knockout-match-players,.redesign-panel .match-pair{display:grid;grid-template-columns:minmax(0,1fr) 74px minmax(0,1fr);gap:8px;margin:0;padding:0}
    .redesign-panel .match-entrant,.redesign-panel .match-entrant-away{display:flex;flex-direction:row;align-items:center;gap:9px;min-width:0}.redesign-panel .match-entrant-away{flex-direction:row-reverse}
    .redesign-panel .match-name,.redesign-panel .match-entrant-away .match-name{width:auto;min-width:0;align-items:flex-start;text-align:left;gap:4px}.redesign-panel .match-entrant-away .match-name{align-items:flex-end;text-align:right}
    .match-flag svg{stroke:none!important;stroke-width:0!important}
    .redesign-panel .match-portrait{width:49px;height:53px;flex-shrink:0;border-radius:9px}.redesign-panel .match-name>[data-bracket-player]{font-size:13px;font-weight:600;line-height:1.5;white-space:normal;overflow-wrap:anywhere;background:transparent;height:auto}
    .redesign-panel .match-name>.bracket-winner{color:var(--selection)!important;font-weight:750}.redesign-panel .knockout-score{gap:6px;font-size:24px}.redesign-panel .knockout-score b{font-size:24px}.redesign-panel .knockout-score span{font-size:13px;color:var(--muted)}
    .redesign-panel .match-score>span,.redesign-panel .match-score>small{display:none}.redesign-panel .match-score>div{background:transparent;border:0;padding:0;min-height:0}.redesign-panel .match-score b{font-size:24px!important}
    .redesign-round-label{text-align:right;font-size:11px;color:var(--muted)}.redesign-round-label small{display:block;font-size:10px;margin-top:4px}.redesign-chevron{color:var(--muted);font-size:21px}
    .redesign-panel .match-eliminated{top:-12px;right:-28px;width:23px;height:17px;font-size:7px}.redesign-panel .earlier-matches{margin-top:12px}.redesign-panel .earlier-matches summary{padding:10px 0;font-size:12px}
    .redesign-match-dialog{width:min(600px,calc(100vw - 30px));padding:25px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--text)}.redesign-match-dialog::backdrop{background:#0009}.redesign-match-dialog h2{margin:0 30px 8px 0;font-size:24px}.redesign-match-dialog>p{font-size:12px;color:var(--muted)}.redesign-match-dialog .dialog-close{position:absolute;right:12px;top:10px}.redesign-dialog-pair{display:grid;grid-template-columns:1fr 60px 1fr;align-items:center;gap:10px;margin-top:25px;text-align:center}.redesign-dialog-pair .match-entrant{display:flex;align-items:center;flex-direction:column-reverse;gap:10px}.redesign-dialog-pair .match-portrait{position:relative;display:block;width:75px;height:85px;overflow:hidden;border-radius:9px;border:1px solid var(--line)}.redesign-dialog-pair .match-name{display:flex;align-items:center;flex-direction:column;gap:5px}.redesign-dialog-pair .match-name>[data-bracket-player]{font-size:14px;line-height:1.4}.redesign-dialog-pair .match-eliminated{display:none}.redesign-dialog-pair .match-score>span,.redesign-dialog-pair .match-score>small{display:none}
    .bottom-note{margin-top:38px;padding-top:23px;border-top:1px solid var(--line);font-size:11px}
    @media(max-width:1200px){.redesign-topbar-inner{gap:15px}.redesign-topbar .nav button{padding:0 7px;font-size:11px}.redesign-top-actions .snapshot{display:none}.redesign-content-grid{grid-template-columns:minmax(0,1fr);gap:15px}.redesign-hero-right{gap:12px}.redesign-hero h2 small{display:block;margin:5px 0 0}.redesign-prize{padding-left:15px}.redesign-panel .knockout-match,.redesign-panel .knockout-match.has-winner,.redesign-panel .match-fixture.inline-bracket-match{grid-template-columns:72px minmax(0,1fr) 55px 10px;gap:5px;padding:11px 10px}.redesign-panel .knockout-match-players,.redesign-panel .match-pair{grid-template-columns:minmax(0,1fr) 55px minmax(0,1fr);gap:5px}.redesign-panel .match-portrait{width:43px;height:50px}.redesign-panel .match-entrant,.redesign-panel .match-entrant-away{gap:6px}.redesign-panel .match-name>[data-bracket-player]{font-size:12px}}
    @media(max-width:950px){.redesign-content-grid{grid-template-columns:minmax(0,1fr)}.redesign-prize{display:none}.redesign-panel .match-date-option{flex:0 0 102px}}
    @media(max-width:680px){
      .redesign-hero.event-card{min-height:188px;padding:21px 18px 65px;gap:12px;align-items:flex-start;border-radius:12px}.redesign-hero .event-row-main{gap:11px;align-items:flex-start}.redesign-hero .event-big-icon{width:39px;height:39px;flex-basis:39px;border-radius:10px}.redesign-hero .event-big-icon svg{width:22px;height:22px}.redesign-hero h2{font-size:24px}.redesign-hero h2 small{display:block;font-size:11px;margin:7px 0 0}.redesign-hero-eyebrow{font-size:9px;letter-spacing:1px;gap:6px}.redesign-hero-eyebrow .badge{font-size:9px}.redesign-hero-meta{font-size:10px;gap:8px 12px;margin-top:13px}.redesign-hero-meta span:last-child{display:none}.redesign-hero-right{position:absolute;left:18px;right:18px;bottom:17px;justify-content:space-between}.redesign-prize{display:block;border:0;padding:0}.redesign-prize strong{font-size:18px}.redesign-prize span{display:none}.redesign-detail-button{font-size:10px;padding:8px 12px}.redesign-table-art{right:-160px;opacity:.15}
      .redesign-panel .match-date-calendar{min-height:75px;margin-bottom:21px;padding:5px;gap:0}.redesign-panel .match-date-option{flex:0 0 76px;min-width:76px;min-height:65px;padding:5px 7px}.redesign-panel .match-date-count{top:15px;right:4px;width:17px;height:17px;font-size:9px}.redesign-panel .match-date-option strong{font-size:23px}.redesign-panel .match-date-option small,.redesign-panel .match-date-option span{font-size:9px}.redesign-panel .match-date-all{flex-basis:67px;padding:7px 5px;font-size:10px}
      .redesign-list-top{display:block}.redesign-list-title h3{font-size:20px}.redesign-list-title p{font-size:11px}.redesign-panel .match-controls-row{gap:8px;margin:12px 0}.redesign-panel .match-status-filters{flex-wrap:nowrap;overflow:auto;scrollbar-width:none;gap:5px}.redesign-panel .match-status-filters button{flex:0 0 auto;padding:0 10px;min-height:35px;font-size:11px}.redesign-panel .match-player-filters{flex:0 0 160px;margin-left:auto}
      .redesign-panel .knockout-match,.redesign-panel .knockout-match.has-winner,.redesign-panel .match-fixture.inline-bracket-match,.redesign-panel .earlier-matches .knockout-match{grid-template-columns:minmax(0,1fr);gap:6px;min-height:118px;padding:11px 12px 9px}.redesign-panel .knockout-match-meta,.redesign-panel .match-when{flex-direction:row;align-items:center;gap:9px;padding-bottom:5px;border-bottom:1px solid var(--line);font-size:10px}.redesign-panel .knockout-match-meta strong{margin-left:auto}.redesign-panel .match-clock,.redesign-panel .match-when strong{font-size:12px}.redesign-panel .knockout-match-players,.redesign-panel .match-pair{grid-template-columns:minmax(0,1fr) 57px minmax(0,1fr);gap:6px;padding-top:5px}.redesign-panel .match-entrant,.redesign-panel .match-entrant-away{flex-direction:column;align-items:center;gap:3px}.redesign-panel .match-name,.redesign-panel .match-entrant-away .match-name{align-items:center;text-align:center}.redesign-panel .match-portrait{width:41px;height:41px;border-radius:8px}.redesign-panel .match-name>[data-bracket-player]{font-size:12px;line-height:1.4}.redesign-panel .knockout-score b{font-size:22px}.redesign-panel .knockout-score .redesign-vs{font-size:13px}.redesign-round-label,.redesign-chevron{display:none}.redesign-status-heading{height:39px;padding:0 11px}.redesign-status-heading>span{display:none}.redesign-panel .match-eliminated{right:-27px;top:-7px}
      body[data-active-nav="schedule"] .bottom-note{display:block;line-height:2.2}.redesign-match-dialog{padding:19px}.redesign-match-dialog h2{font-size:21px}
    }
  `;
  document.head.append(stylesheet);

  const groupStatus = row => ['live', 'suspended'].includes(row.dataset.matchStatus) ? 'live' :
    row.dataset.matchStatus === 'ended' ? 'ended' : 'upcoming';
  const playerName = entrant => entrant?.querySelector('[data-bracket-player]')?.childNodes[0]?.textContent.trim() || '';
  const clock = row => row.querySelector('.match-clock,.match-when strong')?.textContent.trim() || '';

  function updatePanel(panel) {
    const id = panel.dataset.inlineEventId;
    const date = state.matchDateByEvent[id] || '';
    const query = (state.matchSearchByEvent[id] || '').toLowerCase();
    const selectedPlayer = state.matchPlayerByEvent[id];
    const aliases = [selectedPlayer, playerMeta[selectedPlayer]?.[0]].filter(Boolean).map(name => name.replace(/[’‘]/g, "'").toLowerCase());
    const rows = [...panel.querySelectorAll('.knockout-match,.match-fixture')];
    const eligible = rows.filter(row => {
      const names = (row.dataset.matchSearch || '').replace(/[’‘]/g, "'").toLowerCase();
      return (!date || row.dataset.matchDate === date) && (!query || names.includes(query.replace(/[’‘]/g, "'"))) &&
        (!selectedPlayer || aliases.some(name => names.includes(name)));
    });
    panel.querySelector('[data-redesign-date-title]').textContent = date ? dateLabel(date).replace(' ', ' / ') : '全部日期 / 比赛安排';
    panel.querySelector('[data-redesign-total-caption]').textContent = `共 ${eligible.length} 场比赛 · 北京时间 UTC+8`;
    panel.querySelectorAll('[data-match-filter]').forEach(button => {
      if (button.dataset.matchFilter === 'all') button.childNodes[0].textContent = '全部';
    });
    panel.querySelectorAll('.redesign-status-group').forEach(group => {
      const visibleRows = [...group.querySelectorAll('.knockout-match,.match-fixture')].filter(row => !row.classList.contains('match-filter-hidden'));
      group.classList.toggle('match-filter-hidden', !visibleRows.length);
      group.querySelector('.redesign-status-heading small').textContent = `${visibleRows.length} 场`;
    });
  }

  function showMatch(row) {
    const panel = row.closest('.inline-bracket');
    const event = events.find(item => item.id === panel.dataset.inlineEventId);
    const dialog = document.createElement('dialog');
    dialog.className = 'redesign-match-dialog';
    dialog.setAttribute('aria-label', '比赛详情');
    dialog.innerHTML = `<button type="button" class="dialog-close" aria-label="关闭比赛详情">×</button>
      <h2>${escape(eventTitle(event))} · ${escape(row.dataset.redesignRound)}</h2>
      <p>${escape(dateLabel(row.dataset.matchDate))} ${escape(clock(row))} · 北京时间</p>
      <div class="redesign-dialog-pair">${row.querySelector('.knockout-match-players,.match-pair')?.innerHTML || ''}</div>`;
    document.body.append(dialog);
    dialog.querySelector('.dialog-close').onclick = () => dialog.close();
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => { dialog.remove(); row.focus(); });
    dialog.showModal();
  }

  function adaptPanel(panel) {
    if (panel.dataset.redesignReady) return;
    const content = panel.querySelector('.knockout-chart,.inline-bracket-rounds');
    if (!content || !panel.querySelector('.match-controls-row')) return;
    panel.dataset.redesignReady = 'true';
    panel.classList.add('redesign-panel');
    const rows = [...panel.querySelectorAll('.knockout-match,.match-fixture')];
    const currentRows = rows.filter(row => !row.closest('.earlier-matches'));
    rows.forEach((row, index) => {
      const round = row.closest('.knockout-round,.inline-bracket-round')?.querySelector('h4')?.childNodes[0]?.textContent.trim() || row.querySelector('.match-when span')?.textContent.trim() || '比赛安排';
      row.dataset.redesignRound = round;
      row.dataset.redesignMatch = String(index);
      row.setAttribute('role', 'button');
      row.tabIndex = 0;
      row.setAttribute('aria-label', `${[...row.querySelectorAll('.match-entrant')].map(playerName).join(' 对阵 ')}，查看比赛详情`);
      const meta = row.querySelector('.knockout-match-meta>span');
      if (meta) meta.textContent = meta.textContent.match(/第\s*\d+\s*场/)?.[0] || meta.textContent;
      const label = document.createElement('div');
      label.className = 'redesign-round-label';
      label.innerHTML = `${escape(round)}<small>查看详情</small>`;
      const arrow = document.createElement('span');
      arrow.className = 'redesign-chevron'; arrow.textContent = '›'; arrow.setAttribute('aria-hidden', 'true');
      row.append(label, arrow);
      if (row.dataset.matchStatus === 'upcoming') {
        const score = row.querySelector('.knockout-score');
        if (score) score.innerHTML = '<span class="redesign-vs">VS</span>';
      }
    });
    content.replaceChildren();
    ['live', 'upcoming', 'ended'].forEach(status => {
      const selected = currentRows.filter(row => groupStatus(row) === status).sort((a, b) =>
        a.dataset.matchDate.localeCompare(b.dataset.matchDate) || clock(a).localeCompare(clock(b)));
      if (!selected.length) return;
      const group = document.createElement('section');
      group.className = 'knockout-round redesign-status-group';
      group.dataset.groupStatus = status;
      group.innerHTML = `<h4 class="redesign-status-heading">${labels[status]} <small></small><span>${status === 'ended' ? '已完成场次' : '按开赛时间排列'}</span></h4>`;
      group.append(...selected);
      content.append(group);
    });
    panel.querySelectorAll('.later-matches').forEach(section => section.remove());
    const grid = document.createElement('div'); grid.className = 'redesign-content-grid';
    const main = document.createElement('div'); main.className = 'redesign-match-main';
    const top = document.createElement('div'); top.className = 'redesign-list-top';
    top.innerHTML = `<div class="redesign-list-title"><h3 data-redesign-date-title></h3><p data-redesign-total-caption></p></div>`;
    main.append(top, panel.querySelector('.match-controls-row'), content);
    const history = panel.querySelector('.earlier-matches'); if (history) main.append(history);
    const empty = panel.querySelector('.match-filter-empty'); if (empty) main.append(empty);
    const note = panel.querySelector('.bracket-note'); if (note) main.append(note);
    grid.append(main); panel.append(grid); updatePanel(panel);
    new MutationObserver(() => updatePanel(panel)).observe(panel, {
      subtree: true, attributes: true, attributeFilter: ['aria-pressed'],
    });
  }

  function adaptPage() {
    document.body.dataset.activeNav = state.nav;
    if (state.nav === 'results') {
      document.querySelectorAll('.details-list>.event-row-card').forEach(card => {
        const event = events.find(event => event.id === card.querySelector('[data-inline-event]')?.dataset.inlineEvent);
        if (event) card.dataset.eventStatus = status(event);
      });
    }
    if (state.nav !== 'schedule') return;
    document.querySelectorAll('.details-list>.event-row-card').forEach(card => {
      const event = events.find(event => event.id === card.querySelector('[data-inline-event]')?.dataset.inlineEvent);
      if (!event || status(event) !== 'live') return;
      card.classList.add('redesign-hero');
      const button = card.querySelector('.event-row-main');
      button.innerHTML = `<span class="event-big-icon">${icon('trophy')}</span><div class="redesign-hero-copy"><div class="redesign-hero-eyebrow">2026 ${escape(types[event.type].label)} <span class="badge live">正在举办</span></div><h2>${escape(event.name)} <small>${escape(event.en)} 2026</small></h2><div class="redesign-hero-meta"><span>${icon('calendar')} ${escape(fullDate(event))}</span><span>${icon('pin')} ${escape(event.city)}</span><span>${icon('trophy')} ${escape(types[event.type].label)}</span></div></div>`;
      const right = document.createElement('div'); right.className = 'redesign-hero-right';
      right.innerHTML = `<div class="redesign-prize"><small>冠军奖金</small><strong>${escape(money(event.prize))}</strong><span>${escape(event.venue)}</span></div><button type="button" class="redesign-detail-button">赛事详情 ›</button>`;
      right.querySelector('button').onclick = () => showDetail(event.id); card.append(right);
      const art = document.createElement('div'); art.className = 'redesign-table-art'; art.setAttribute('aria-hidden', 'true'); art.innerHTML = '<i></i><i></i><i></i><i></i>'; card.append(art);
    });
    document.querySelectorAll('.inline-bracket').forEach(adaptPanel);
  }

  const previousRender = render;
  render = () => { document.querySelector('.redesign-match-dialog')?.remove(); previousRender(); adaptPage(); };
  document.addEventListener('click', event => {
    const row = event.target.closest?.('[data-redesign-match]');
    if (row) { showMatch(row); return; }
  });
  document.addEventListener('keydown', event => {
    const row = event.target.closest?.('[data-redesign-match]');
    if (row && ['Enter', ' '].includes(event.key)) { event.preventDefault(); showMatch(row); }
  });
  document.addEventListener('input', event => {
    setTimeout(() => document.querySelectorAll('.redesign-panel').forEach(updatePanel), 0);
  }, true);
  render();
})();
