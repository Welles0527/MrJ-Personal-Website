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
    .results-upcoming{grid-column:1/-1}.results-upcoming>summary{cursor:pointer;color:var(--purple);padding:14px 0}.results-upcoming>.event-row-card{margin-top:14px}.redesign-list-top{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:12px}.redesign-list-title h3{margin:0 0 5px;font-size:21px;line-height:1.3}.redesign-list-title p{font-size:12px;color:var(--muted);margin:0}
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
  stylesheet.textContent += `
    .calendar-back-link{display:inline-block;margin-left:14px;font-size:12px;line-height:1.5;font-weight:500;white-space:nowrap;color:var(--selection)}
    @media(max-width:680px){header:has(.calendar-back-link){position:relative;height:92px!important;padding-top:26px!important}header .calendar-back-link{position:absolute;top:8px;left:17px;margin:0;font-size:11px}}
    .redesign-panel [data-redesign-match]{grid-template-columns:180px minmax(0,1fr)!important;min-height:116px!important;padding:12px 30px 12px 18px!important}
    .redesign-panel .match-when,.redesign-panel .knockout-match-meta,.redesign-panel .redesign-round-label,.redesign-panel .redesign-chevron,.redesign-panel .match-flag{display:none!important}
    .redesign-panel .match-pair,.redesign-panel .knockout-match-players{grid-column:2;width:min(100%,440px);margin-inline:auto;grid-template-columns:minmax(0,1fr) 80px minmax(0,1fr)!important;align-items:center;gap:12px!important}
    .redesign-panel .match-entrant,.redesign-panel .match-entrant-away{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center;gap:5px!important;text-align:center}
    .redesign-panel .match-name,.redesign-panel .match-entrant-away .match-name{align-items:center!important;text-align:center!important;width:100%}
    .redesign-panel .match-name>[data-bracket-player]{font-size:13px!important;line-height:1.35;overflow-wrap:normal}
    .redesign-panel .match-portrait-wrap{display:block!important;width:56px!important;min-width:0!important;left:auto!important;right:auto!important;align-self:center!important}
    .redesign-panel .match-portrait{width:56px!important;height:62px!important}
    .redesign-panel .match-portrait img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;transform:none!important}
    .redesign-panel .match-score,.redesign-panel .knockout-score{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px!important;overflow:visible}
    .redesign-panel .match-score>div:not(.match-points){display:flex;align-items:center;justify-content:center;gap:7px}
    .redesign-panel .match-score>.compact-match-clock,.redesign-panel .knockout-score>.compact-match-clock{display:block!important;font-size:11px!important;line-height:1.4;color:var(--muted);font-weight:500}
    .redesign-panel .compact-score-values{display:flex;align-items:center;justify-content:center;gap:7px}
    .redesign-panel .match-points{display:none!important}
    .compact-match-date{display:none!important}
    .compact-fixture-time{grid-column:1;grid-row:1;display:flex;flex-direction:column;justify-content:center;align-self:center;gap:4px;font-size:16px;line-height:1.4;color:var(--muted);white-space:nowrap}
    .compact-fixture-time strong{font-size:24px;line-height:1.2;color:var(--text)}
    .compact-fixture-time small{font-size:11px;line-height:1.3;color:var(--muted)}
    .redesign-dialog-pair .match-flag{display:none!important}
    .inline-bracket .match-fixture,.inline-bracket .knockout-match,.inline-bracket .bracket-match{position:relative}
    .match-favorite{position:absolute;top:5px;right:8px;z-index:2;padding:3px 6px;border:0;border-radius:5px;background:transparent;color:var(--muted);font-size:10px;line-height:1.5;white-space:nowrap;cursor:pointer}
    .match-favorite[aria-pressed="true"]{color:var(--selection)}
    .redesign-panel .match-controls-row{justify-content:flex-end}
    .redesign-panel .match-status-filters{flex:0 1 auto!important;margin-left:auto;justify-content:flex-end;min-width:0}
    .match-view-switch{display:flex;gap:4px;margin-right:auto;padding:3px;border:1px solid var(--line);border-radius:8px}
    .match-view-switch button{padding:7px 10px;border:0;border-radius:5px;background:transparent;color:var(--muted);font:inherit;font-size:12px;white-space:nowrap;cursor:pointer}
    .match-view-switch button[aria-pressed="true"]{background:var(--selection);color:var(--selection-ink)}
    .roster-gallery[hidden],.redesign-panel [data-match-list][hidden]{display:none!important}
    .roster-gallery{padding:18px 0}
    .roster-gallery>p{margin:0 0 18px;color:var(--muted);font-size:12px}
    .roster-layout-switch{display:flex;gap:5px;margin:0 0 14px}
    .roster-layout-switch button{padding:8px 12px;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--muted);font:inherit;font-size:12px;cursor:pointer}
    .roster-layout-switch button[aria-pressed="true"]{border-color:var(--selection);background:var(--selection);color:var(--selection-ink)}
    .roster-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .roster-column{min-width:0;padding:15px;border:1px solid var(--line);border-radius:11px;background:var(--card)}
    .roster-column h3{margin:0 0 15px;font-size:14px}.roster-column h3 small{margin-left:7px;color:var(--muted);font-size:11px;font-weight:400}
    .roster-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:16px 10px}
    .roster-player{margin:0;min-width:0;text-align:center}
    .roster-player img{display:block;width:66px;height:66px;object-fit:contain;object-position:center;margin:0 auto 8px;border:1px solid var(--line);border-radius:9px;background:var(--card)}
    .roster-player figcaption{font-size:12px;line-height:1.5;overflow-wrap:anywhere}
    .roster-player figcaption small{display:block;font-size:10px;color:var(--muted)}
    .roster-player.is-eliminated{opacity:.2}
    .redesign-panel[data-roster-view="players"] .match-date-calendar,.redesign-panel[data-roster-view="players"] .match-status-filters,.redesign-panel[data-roster-view="players"] .match-player-filters,.redesign-panel[data-roster-view="players"] .earlier-matches,.redesign-panel[data-roster-view="players"] .match-filter-empty{display:none!important}
    @media(max-width:680px){.match-view-switch{flex:1 0 100%;box-sizing:border-box;margin-bottom:4px}.redesign-panel .match-status-filters{flex:1 1 0!important;flex-wrap:nowrap!important;overflow-x:auto!important;justify-content:flex-start}.redesign-panel .match-status-filters button{flex-shrink:0}.redesign-panel .match-player-filters{flex:0 0 120px}.roster-columns{gap:8px}.roster-column{padding:9px 6px}.roster-column h3{font-size:12px}.roster-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 4px}.roster-player img{width:48px;height:48px}.roster-player figcaption{font-size:10px}.roster-layout-switch button{flex:1;min-width:0;padding:8px 5px;font-size:11px}}
    .match-favorites-list{display:grid;gap:0;margin:20px 0}
    .saved-match{display:grid;grid-template-columns:220px minmax(0,1fr) auto;align-items:center;gap:16px;padding:19px 0;border-bottom:1px solid var(--line)}
    .saved-match small{display:block;color:var(--muted);margin-top:6px}.saved-match>b{font-size:16px}.saved-match>b span{font-size:12px;color:var(--muted);font-weight:400;margin:0 10px}.saved-match .match-favorite{position:static;font-size:12px}
    @media(max-width:680px){.saved-match{grid-template-columns:minmax(0,1fr) auto;gap:12px}.saved-match>b{grid-column:1/-1;grid-row:2;font-size:14px}.saved-match>.match-favorite{grid-column:2;grid-row:1}}
    @media(max-width:680px){.redesign-panel [data-redesign-match]{grid-template-columns:96px minmax(0,1fr)!important;padding:22px 8px 10px!important;min-height:120px!important;gap:5px!important}.redesign-panel .match-pair,.redesign-panel .knockout-match-players{grid-template-columns:minmax(0,1fr) 42px minmax(0,1fr)!important;gap:4px!important}.redesign-panel .match-name>[data-bracket-player]{font-size:11px!important}.redesign-panel .match-portrait-wrap,.redesign-panel .match-portrait{width:43px!important}.redesign-panel .match-portrait{height:48px!important}.compact-fixture-time{font-size:11px;gap:5px}.compact-fixture-time strong{font-size:20px}}
  `;
  document.head.append(stylesheet);

  const groupStatus = row => ['live', 'suspended'].includes(row.dataset.matchStatus) ? 'live' :
    row.dataset.matchStatus === 'ended' ? 'ended' : 'upcoming';
  const playerName = entrant => entrant?.querySelector('[data-bracket-player]')?.childNodes[0]?.textContent.trim() || '';
  const clock = row => row.dataset.matchClock || row.querySelector('.match-clock,.match-when strong')?.textContent.trim() || '';
  const favoriteKey = 'cue-match-favorites';
  let matchFavorites = {};
  try {
    const saved = JSON.parse(localStorage.getItem(favoriteKey) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) matchFavorites = saved;
  } catch {}
  const favoriteRecords = new Map();
  state.matchViewByEvent ||= {};
  state.rosterLayoutByEvent ||= {};
  function setMatchView(panel, view) {
    const players = view === 'players';
    panel.dataset.rosterView = view;
    panel.querySelector('[data-match-list]').hidden = players;
    panel.querySelector('.roster-gallery').hidden = !players;
    panel.querySelectorAll('[data-match-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.matchView === view)));
  }
  function arrangeRoster(roster, layout) {
    const columns = [...roster.querySelectorAll('.roster-column')];
    const groups = [[], []];
    roster.querySelectorAll('.roster-player').forEach(player => {
      const left = layout === 'ranking' ? player.dataset.rosterRank !== '' : player.dataset.rosterChina === 'true';
      groups[left ? 0 : 1].push(player);
    });
    groups.forEach((players, index) => {
      players.sort((a, b) => layout === 'ranking' && index === 0 ?
        Number(a.dataset.rosterRank) - Number(b.dataset.rosterRank) :
        Number(a.dataset.rosterOrder) - Number(b.dataset.rosterOrder));
      columns[index].querySelector('.roster-grid').append(...players);
      columns[index].querySelector('h3').innerHTML = `${layout === 'ranking' ? (index ? '其他球员' : '世界前 16') : (index ? '国外球员' : '中国球员')} <small>${players.length} 位</small>`;
    });
    roster.dataset.layout = layout;
    roster.querySelectorAll('[data-roster-layout]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.rosterLayout === layout)));
  }
  const favoriteButton = key => `<button type="button" class="match-favorite" data-match-favorite="${escape(key)}" aria-pressed="${Boolean(matchFavorites[key])}" aria-label="${matchFavorites[key] ? '取消收藏比赛' : '收藏比赛'}">${matchFavorites[key] ? '★ 已收藏' : '☆ 收藏'}</button>`;
  const persistFavorites = () => {
    try { localStorage.setItem(favoriteKey, JSON.stringify(matchFavorites)); } catch {}
  };
  function decorateFavorite(row, tournament, index) {
    if (!tournament || row.querySelector('[data-match-favorite]') || row.matches('.bracket-missing')) return;
    const number = row.querySelector('.knockout-match-meta,.match-when,:scope>small')?.textContent.match(/第\s*(\d+)\s*场/)?.[1];
    const sourceMatch = window.CUE_LIVE_SCORES?.events?.[tournament.id]?.matches?.find(match => String(match.number) === number);
    const names = [...row.querySelectorAll('[data-bracket-player],.bracket-player>span')].map(node => node.childNodes[0]?.textContent.trim());
    const key = `${tournament.id}:${sourceMatch?.id || number || `${names.join('|')}:${index}`}`;
    const startsAt = sourceMatch?.startsAt;
    const date = startsAt ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date(startsAt)) : row.dataset.matchDate;
    const time = startsAt ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(startsAt)) : clock(row);
    favoriteRecords.set(key, { eventId: tournament.id, eventName: tournament.name,
      matchId: sourceMatch?.id || row.dataset.liveMatch || '', date,
      clock: /^\d{2}:\d{2}$/.test(time) ? time : '', home: names[0] || '球员待定', away: names[1] || '球员待定' });
    if (matchFavorites[key]) matchFavorites[key] = favoriteRecords.get(key);
    row.insertAdjacentHTML('beforeend', favoriteButton(key));
  }
  function renderMatchFavorites() {
    const main = document.querySelector('main');
    const oldList = main.querySelector('.details-list');
    const records = Object.entries(matchFavorites).filter(([, record]) => record && record.eventId)
      .map(([key, record]) => {
        const latest = window.CUE_LIVE_SCORES?.events?.[record.eventId]?.matches?.find(match => match.id === record.matchId);
        if (latest?.startsAt) {
          const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(latest.startsAt)).map(part => [part.type, part.value]));
          record.date = `${parts.year}-${parts.month}-${parts.day}`;
          record.clock = `${parts.hour}:${parts.minute}`;
        }
        return [key, record];
      }).sort(([, a], [, b]) => `${b.date} ${b.clock}`.localeCompare(`${a.date} ${a.clock}`));
    main.innerHTML = `<div class="title-row"><div><div class="eyebrow">WORLD SNOOKER CALENDAR</div><h1>我的收藏</h1><p>已收藏 ${records.length} 场比赛 · 北京时间</p></div></div><section class="match-favorites-list" aria-label="收藏的比赛">${records.length ? records.map(([key, record]) => `<article class="saved-match"><div><strong>${escape(record.date ? dateLabel(record.date) : '日期待定')} ${escape(record.clock || '时间待定')}</strong><small>${escape(record.eventName)}</small></div><b>${escape(record.home)} <span>对阵</span> ${escape(record.away)}</b>${favoriteButton(key)}</article>`).join('') : '<p>暂无收藏比赛，点击对阵旁的“☆ 收藏”即可添加。</p>'}</section>`;
    if (oldList && state.favorites.size) {
      const legacy = document.createElement('details');
      legacy.innerHTML = '<summary>已收藏的赛事</summary>';
      legacy.append(oldList);
      main.append(legacy);
    }
  }

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
    panel.querySelectorAll('[data-match-filter]').forEach(button => {
      if (button.dataset.matchFilter === 'all') button.childNodes[0].textContent = '全部';
    });
    panel.querySelectorAll('.redesign-status-group').forEach(group => {
      const visibleRows = [...group.querySelectorAll('.knockout-match,.match-fixture')].filter(row => !row.classList.contains('match-filter-hidden'));
      group.classList.toggle('match-filter-hidden', !visibleRows.length);
      group.querySelector('.redesign-status-heading small').textContent = `${visibleRows.length} 场`;
    });
    const shownDates = new Set();
    panel.querySelectorAll('.compact-match-date').forEach(heading => {
      const row = heading.nextElementSibling;
      const date = row?.dataset.matchDate || '';
      const visible = row && !row.classList.contains('match-filter-hidden') && !shownDates.has(date);
      heading.classList.toggle('match-filter-hidden', !visible);
      if (visible) shownDates.add(date);
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
      row.dataset.matchClock = clock(row);
      decorateFavorite(row, events.find(item => item.id === panel.dataset.inlineEventId), index);
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
      const score = row.querySelector('.match-score,.knockout-score');
      if (score) {
        if (score.classList.contains('knockout-score')) {
          const values = document.createElement('div');
          values.className = 'compact-score-values';
          values.append(...score.childNodes);
          score.append(values);
        }
      }
      const date = row.dataset.matchDate;
      const time = document.createElement('time');
      time.className = 'compact-fixture-time';
      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '');
      const weekday = validDate ? new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'long' }).format(new Date(`${date}T12:00:00+08:00`)) : '';
      const fullDate = validDate ? `${date.slice(0, 4)}年${Number(date.slice(5, 7))}月${Number(date.slice(8))}日` : '日期待定';
      if (validDate && /^\d{2}:\d{2}$/.test(clock(row))) time.dateTime = `${date}T${clock(row)}:00+08:00`;
      const matchClock = clock(row) || '时间待定';
      const inProgress = ['live', 'suspended'].includes(row.dataset.matchStatus);
      const statusText = row.dataset.matchStatus === 'suspended' ? '暂停中' : '进行中';
      time.innerHTML = `<span>${escape(fullDate)}</span><span>${escape(weekday)}</span><strong>${inProgress ? statusText : escape(matchClock)}</strong>${inProgress ? `<small>${matchClock === '时间待定' ? '开赛时间待定' : `原定 ${escape(matchClock)}`}</small>` : ''}`;
      row.prepend(time);
    });
    content.replaceChildren();
    ['live', 'upcoming', 'ended'].forEach(status => {
      const selected = currentRows.filter(row => groupStatus(row) === status).sort((a, b) => {
        const order = a.dataset.matchDate.localeCompare(b.dataset.matchDate) || clock(a).localeCompare(clock(b));
        return state.nav === 'results' ? -order : order;
      });
      if (!selected.length) return;
      const group = document.createElement('section');
      group.className = 'knockout-round redesign-status-group';
      group.dataset.groupStatus = status;
      group.innerHTML = `<h4 class="redesign-status-heading">${labels[status]} <small></small><span>${state.nav === 'results' ? '按开赛时间倒序' : status === 'ended' ? '已完成场次' : '按开赛时间排列'}</span></h4>`;
      selected.forEach(row => {
        const heading = document.createElement('div');
        heading.className = 'compact-match-date';
        heading.textContent = dateLabel(row.dataset.matchDate);
        group.append(heading, row);
      });
      content.append(group);
    });
    panel.querySelectorAll('.later-matches').forEach(section => section.remove());
    const grid = document.createElement('div'); grid.className = 'redesign-content-grid';
    const main = document.createElement('div'); main.className = 'redesign-match-main';
    const drawButton = panel.querySelector('[data-match-bracket]');
    const controls = panel.querySelector('.match-controls-row');
    const viewSwitch = document.createElement('div');
    viewSwitch.className = 'match-view-switch';
    viewSwitch.setAttribute('role', 'group');
    viewSwitch.setAttribute('aria-label', '赛事视图');
    viewSwitch.innerHTML = '<button type="button" data-match-view="matches">比赛对阵</button><button type="button" data-match-view="players">参赛球员</button>';
    if (drawButton) {
      const heading = drawButton.parentElement;
      viewSwitch.prepend(drawButton);
      if (!heading.children.length) heading.remove();
    }
    controls.prepend(viewSwitch);
    content.dataset.matchList = '';
    const roster = document.createElement('section');
    roster.className = 'roster-gallery';
    roster.setAttribute('aria-label', '本赛事参赛球员');
    const entrants = window.CUE_GET_EVENT_PLAYERS?.(panel.dataset.inlineEventId) || [];
    const eliminated = entrants.filter(player => player.eliminated).length;
    const rosterKey = name => name.replace(/[’‘]/g, "'").replace(/^Mark J Williams$/, 'Mark Williams').toLowerCase();
    const top16 = new Map(rankingYears[2026].players.map((name, index) => [rosterKey(name), index + 1]));
    roster.innerHTML = entrants.length ? `<p>已录入 ${entrants.length} 位球员 · 未淘汰 ${entrants.length - eliminated} 位 · 已淘汰 ${eliminated} 位</p><div class="roster-layout-switch" role="group" aria-label="参赛球员布局"><button type="button" data-roster-layout="country">中国 vs 国外</button><button type="button" data-roster-layout="ranking">世界排名</button></div><div class="roster-columns"><section class="roster-column" aria-label="左侧球员"><h3></h3><div class="roster-grid"></div></section><section class="roster-column" aria-label="右侧球员"><h3></h3><div class="roster-grid"></div></section></div>${entrants.map((player, index) => `<figure class="roster-player${player.eliminated ? ' is-eliminated' : ''}" data-roster-order="${index}" data-roster-china="${['CN', 'HK'].includes(player.countryCode)}" data-roster-rank="${top16.get(rosterKey(player.en)) || ''}"><img src="${escape(player.photo)}" alt="${escape(player.name)}" loading="lazy" referrerpolicy="no-referrer"><figcaption>${escape(player.name)}<small>${player.eliminated ? '已淘汰' : '未淘汰'}</small></figcaption></figure>`).join('')}` : '<p>官方暂未公布可同步的参赛名单。</p>';
    if (entrants.length) arrangeRoster(roster, state.rosterLayoutByEvent[panel.dataset.inlineEventId] || 'country');
    roster.addEventListener('error', event => {
      const image = event.target;
      if (image instanceof HTMLImageElement && !image.src.endsWith('/player-placeholder.svg')) image.src = './player-placeholder.svg';
    }, true);
    main.append(controls, content, roster);
    const history = panel.querySelector('.earlier-matches'); if (history) main.append(history);
    const empty = panel.querySelector('.match-filter-empty'); if (empty) main.append(empty);
    const note = panel.querySelector('.bracket-note'); if (note) main.append(note);
    grid.append(main); panel.append(grid); updatePanel(panel);
    setMatchView(panel, state.matchViewByEvent[panel.dataset.inlineEventId] || 'matches');
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
    if (state.nav === 'results') {
      const list = document.querySelector('.details-list');
      if (list) {
        const cards = Array.from(list.querySelectorAll(':scope > .event-row-card')).map(card => ({
          card,
          bracket: card.nextElementSibling?.matches('.inline-bracket') ? card.nextElementSibling : null,
        }));
        const eventFor = card => events.find(event => event.id === card.querySelector('[data-inline-event]')?.dataset.inlineEvent);
        cards.sort((a,b) => (eventFor(b.card)?.start || '').localeCompare(eventFor(a.card)?.start || ''));
        const appendPair = (parent, pair) => {
          parent.append(pair.card);
          if (pair.bracket) parent.append(pair.bracket);
        };
        const upcoming = cards.filter(pair => pair.card.dataset.eventStatus === 'upcoming');
        cards.filter(pair => pair.card.dataset.eventStatus !== 'upcoming').forEach(pair => appendPair(list, pair));
        if (upcoming.length) {
          const folded = document.createElement('details'); folded.className = 'results-upcoming';
          const summary = document.createElement('summary'); summary.textContent = '未开始的赛事 · '+upcoming.length+' 场';
          folded.append(summary); upcoming.forEach(pair => appendPair(folded, pair)); list.append(folded);
        }
      }
    }
    document.querySelectorAll('.inline-bracket').forEach(adaptPanel);
    if (state.nav !== 'schedule') return;
    document.querySelector('main > .pending-events')?.remove();
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
  }

  const previousRender = render;
  let inAnnualView = false;
  render = () => {
    const annualView = state.nav === 'year' && state.view === 'year';
    const scrollToCurrentMonth = annualView && !inAnnualView && window.matchMedia('(max-width:680px)').matches;
    inAnnualView = annualView;
    document.querySelector('.redesign-match-dialog')?.remove(); previousRender(); adaptPage();
    document.querySelectorAll('.inline-bracket').forEach(panel => {
      const id = panel.dataset.inlineEventId || panel.querySelector('[data-inline-close]')?.dataset.inlineClose;
      const tournament = events.find(item => item.id === id);
      panel.querySelectorAll('.match-fixture,.knockout-match,.bracket-match').forEach((row, index) => decorateFavorite(row, tournament, index));
    });
    const count = document.querySelector('[data-nav="favorites"]>span');
    if (count) count.textContent = Object.keys(matchFavorites).length + state.favorites.size;
    if (state.nav === 'favorites') renderMatchFavorites();
    const breadcrumb = document.querySelector('header .crumb');
    if (breadcrumb) {
      const back = document.createElement('a');
      back.href = '../super-calendar/index.html#overview';
      back.textContent = '返回超级日历 ↗';
      back.className = 'calendar-back-link';
      breadcrumb.append(back);
    }
    if (scrollToCurrentMonth) requestAnimationFrame(() => {
      if (state.nav === 'year' && state.view === 'year' && window.matchMedia('(max-width:680px)').matches) {
        document.querySelector('.annual > .month-card.current')?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    });
  };
  document.addEventListener('click', event => {
    const rosterLayout = event.target.closest?.('[data-roster-layout]');
    if (rosterLayout) {
      const panel = rosterLayout.closest('.redesign-panel');
      state.rosterLayoutByEvent[panel.dataset.inlineEventId] = rosterLayout.dataset.rosterLayout;
      arrangeRoster(panel.querySelector('.roster-gallery'), rosterLayout.dataset.rosterLayout);
      return;
    }
    const view = event.target.closest?.('[data-match-view]');
    if (view) {
      const panel = view.closest('.redesign-panel');
      state.matchViewByEvent[panel.dataset.inlineEventId] = view.dataset.matchView;
      setMatchView(panel, view.dataset.matchView);
      return;
    }
    const favorite = event.target.closest?.('[data-match-favorite]');
    if (favorite) {
      event.preventDefault();
      const key = favorite.dataset.matchFavorite;
      if (matchFavorites[key]) delete matchFavorites[key];
      else if (favoriteRecords.has(key)) matchFavorites[key] = favoriteRecords.get(key);
      persistFavorites();
      if (state.nav === 'favorites') render();
      else {
        favorite.outerHTML = favoriteButton(key);
        const count = document.querySelector('[data-nav="favorites"]>span');
        if (count) count.textContent = Object.keys(matchFavorites).length + state.favorites.size;
      }
      return;
    }
    const row = event.target.closest?.('[data-redesign-match]');
    if (row) { showMatch(row); return; }
  });
  document.addEventListener('keydown', event => {
    if (event.target.closest?.('[data-match-favorite]')) return;
    const row = event.target.closest?.('[data-redesign-match]');
    if (row && ['Enter', ' '].includes(event.key)) { event.preventDefault(); showMatch(row); }
  });
  document.addEventListener('input', event => {
    setTimeout(() => document.querySelectorAll('.redesign-panel').forEach(updatePanel), 0);
  }, true);
  render();
})();
