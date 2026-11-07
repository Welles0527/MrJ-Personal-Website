(() => {
  'use strict';
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const beijingDay = () => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  function snookerEntries() {
    const index = read('super-calendar-cue-index', {}), tournaments = read('cue-favorites', []);
    const saved = Object.entries(read('super-calendar-sports-favorites', {})).map(([id, value]) => ({ ...value, ...entries.find(e => e.id === id), id })).filter(e => e.category === '斯诺克');
    if (Array.isArray(tournaments)) tournaments.forEach(id => { if (index[id]) saved.push({ ...index[id], id:'cue:'+id }); });
    Object.entries(read('cue-match-favorites', {})).forEach(([id, match]) => {
      if (match?.eventId) saved.push({ id:'cue-match:'+id, name:match.home+' vs '+match.away, start:match.date, end:match.date, time:match.clock });
    });
    const seen = new Set();
    return saved.filter(e => datePattern.test(e.start) && !seen.has(e.id) && seen.add(e.id)).map(e => ({ ...e, calendar:'sports', category:'斯诺克', end:datePattern.test(e.end) ? e.end : e.start, name:e.name+(/^\d{2}:\d{2}$/.test(e.time) ? ' '+e.time : ''), target:'#sports' }));
  }
  function summaryEntries() {
    const football = footballMatches.map(e => ({ id:e.id, calendar:'sports', category:'足球', start:e.start, end:e.end,
      name:(e.venue === 'A' ? e.opponent+' vs 巴萨' : '巴萨 vs '+e.opponent)+' · '+(Array.isArray(e.score) ? e.score.join('–') : e.time || '时间待定'), target:'#sports' }));
    const plans = personalPlans.filter(p => p.important === true).map(p => ({ id:'plan:'+p.id, planId:p.id, calendar:'life', start:p.date, end:p.date, name:'★ '+p.title }));
    const current = beijingDay();
    const probability = codexSnapshot && Number.isFinite(codexSnapshot.probability48h)
      ? [{ id:'reset-probability', calendar:'ai', start:current, end:current, name:'重置概率 '+codexSnapshot.probability48h+'%（48h）', target:'#ai' }] : [];
    return [...snookerEntries(), ...football, ...(window.InvestmentCalendar?.summaryEntries() || []), ...plans, ...probability]
      .filter(e => datePattern.test(e.start) && datePattern.test(e.end))
      .sort((a,b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name, 'zh-CN'));
  }
  const itemThemes = {
    '斯诺克': { background:'#dce5da', text:'#35483b', accent:'#adbfa9' },
    '足球': { background:'#dce4ea', text:'#3c4a57', accent:'#acbbc8' },
    investment: { background:'#efe2cb', text:'#191a18', accent:'#e8a24b' },
    ai: { background:'#dfe9d9', text:'#191a18', accent:'#71d6b4' },
    life: { background:'#f0e3dd', text:'#191a18', accent:'#f1a5da' }
  };
  function item(e) {
    const colors = itemThemes[e.category] || itemThemes[e.calendar];
    const attribute = e.planId ? 'data-personal-plan="'+esc(e.planId)+'"' : 'data-summary-target="'+esc(e.target)+'"';
    return `<button class="summary-event" ${attribute} style="--event-color:${colors.accent};--summary-event-bg:${colors.background};--summary-event-ink:${colors.text}" title="${esc(e.name)}">${icon(calendars[e.calendar].icon)}<span>${esc(e.name)}</span></button>`;
  }
  function weather(date) {
    if (!['全部','travel'].includes(state.category)) return '';
    const key = weatherCity+'|'+date.slice(0,7), entry = weatherCache.get(key), day = entry?.days.get(date);
    if (!day) return '';
    const symbol = weatherSymbol(day.code), label = date+' · '+(entry.place || weatherCity)+' · '+weatherCodeLabels[day.code];
    return `<span class="summary-weather" title="${esc(label)}" aria-label="${esc(label)}"><span class="weather-icon" style="background-position:${weatherIconPosition(symbol)}" aria-hidden="true"></span></span>`;
  }
  function monthly() {
    const all = filtered().filter(e => isMonth(e,state.month));
    return `<section class="month-panel summary-month" aria-label="超级历日月历"><div class="calendar-title"><h2>${monthNames[state.month]} <span>${state.year}</span></h2><span class="muted">北京时间 · ${esc(weatherCity)}</span></div><div class="summary-scroll" tabindex="0" aria-label="左右滑动查看完整月历"><div class="summary-grid">${['周一','周二','周三','周四','周五','周六','周日'].map(w => '<div class="weekday">'+w+'</div>').join('')}${days(state.month).map(d => {
      const date = dateStr(state.month,d), items = d ? all.filter(e => e.start <= date && e.end >= date) : [];
      return `<div class="summary-day ${d ? '' : 'out'} ${d && date === beijingDay() ? 'today' : ''}" data-date="${d ? date : ''}">${d ? `<div class="summary-date"><strong>${d}</strong>${weather(date)}</div>${items.map(item).join('')}` : ''}</div>`;
    }).join('')}</div></div><p class="summary-mobile-hint">左右滑动查看完整周历</p></section>`;
  }
  function annual() {
    const all = filtered();
    return `<div class="annual summary-annual">${monthNames.map((name,m) => {
      return `<section class="month-card"><div class="month-top"><button class="month-title" data-month="${m}"><b>${String(m+1).padStart(2,'0')}</b><span>${name}</span></button></div><div class="mini-grid">${['一','二','三','四','五','六','日'].map(w => '<div class="weekday">'+w+'</div>').join('')}${days(m).map(d => {
        const date = dateStr(m,d), matches = d ? all.filter(e => e.start <= date && e.end >= date) : [];
        const groups = new Map();
        matches.forEach(e => {
          const key = itemThemes[e.category] ? e.category : e.calendar;
          if (!groups.has(key)) groups.set(key, { colors:itemThemes[key], calendar:e.calendar, names:[] });
          groups.get(key).names.push(e.name);
        });
        const forecast = d ? weather(date) : '', colors = [...groups.values()].map(g => g.colors.background);
        if (forecast) colors.push('#dce9ed');
        const fill = colors.length > 1 ? 'linear-gradient(135deg,'+colors.map((c,i) => c+' '+(i*100/colors.length)+'% '+((i+1)*100/colors.length)+'%').join(',')+')' : colors[0] || 'transparent';
        const label = date+' '+matches.map(e => e.name).join('；');
        return `<button class="mini-day ${d ? '' : 'empty'} ${date === beijingDay() ? 'today' : ''} ${colors.length ? 'has-summary-events' : ''}" ${d ? 'data-date="'+date+'" data-month="'+m+'"' : 'disabled'} style="--summary-day-bg:${fill}" title="${esc(label)}" aria-label="${esc(label)}"><span class="summary-day-number">${d || ''}</span><span class="summary-day-icons">${[...groups.values()].map(g => `<span class="summary-type-icon" style="color:${g.colors.text}" title="${esc(g.names.join('；'))}" aria-hidden="true">${icon(calendars[g.calendar].icon)}</span>`).join('')}${forecast}</span></button>`;
      }).join('')}</div></section>`;
    }).join('')}</div>`;
  }
  const style = document.createElement('style');
  style.textContent = `.summary-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;background:var(--card);min-width:770px}.summary-day{border:1px solid var(--border);border-radius:16px}.summary-scroll{overflow-x:auto}.summary-grid>.weekday{background:var(--card);padding:12px 4px}.summary-day{min-width:0;min-height:126px;background:var(--cell);padding:8px}.summary-day.out{background:var(--card);border-radius:8px}.summary-day.today{box-shadow:inset 0 0 0 2px var(--purple)}.summary-date{display:flex;align-items:center;justify-content:space-between;min-height:34px;margin-bottom:5px}.summary-event{display:flex;align-items:flex-start;gap:5px;width:100%;min-width:0;margin:5px 0;padding:6px;text-align:left;line-height:1.5;font-size:12px;color:var(--summary-event-ink);border:0;border-left:3px solid var(--event-color);border-radius:4px;background:var(--summary-event-bg)}.summary-event svg{width:14px;height:14px;margin-top:2px;color:var(--summary-event-ink)}.summary-event span{min-width:0;overflow-wrap:anywhere}.summary-weather{display:inline-flex}.summary-annual .mini-day{min-height:44px;height:auto;position:relative}.summary-annual .weather-icon{width:18px;height:18px}.summary-annual .mini-day .day-dot{background:var(--purple)}.summary-mobile-hint{display:none}.summary-status{font-size:12px;line-height:1.7;color:var(--muted);margin:12px 0}.summary-status a{color:var(--purple)}@media(max-width:760px){.summary-grid{gap:3px}.summary-day{border-radius:10px}}@media(max-width:680px){.summary-mobile-hint{display:block;font-size:12px;color:var(--muted);padding:0 12px}.summary-day{min-height:108px}.summary-month .calendar-title{flex-wrap:wrap;gap:8px}.summary-month .calendar-title .muted{font-size:11px}}`;
  document.head.append(style);
  style.textContent += `.summary-annual .mini-day{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;min-height:58px;padding:5px 2px;min-width:0}.summary-day-icons{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:3px;min-width:0;max-width:100%}.summary-type-icon{display:inline-flex}.summary-type-icon svg{width:13px;height:13px}:root[data-theme] .summary-annual .mini-day.has-summary-events:not(.calendar-holiday){background:var(--summary-day-bg);color:#3d2b1d}:root[data-theme] .summary-annual .mini-day.today{box-shadow:inset 0 0 0 2px var(--purple)}`;

  style.textContent += `:root[data-theme="cream"] .summary-grid,:root[data-theme="cream"] .summary-grid>.weekday,:root[data-theme="cream"] .summary-day{background:#ffffff}`;

  style.textContent += `.summary-page .calendar-topbar .period-control strong,.summary-page .calendar-topbar .mobile-menu{color:var(--text)}.summary-page .calendar-topbar select,.summary-page .calendar-topbar select option,.summary-page .calendar-topbar .period-control button{background:var(--surface-strong);color:var(--text)}:root[data-theme="cream"] .summary-page .switch button:not(.active){color:#e1ddcd}.summary-page .title-actions>.primary{display:none}.summary-grid>.weekday{height:auto;min-height:36px;line-height:1.5;padding:8px 4px}`;

  // Warm sand and apricot glass surroundings, with a white calendar surface.
  style.textContent += `
:root[data-theme="cream"] body.summary-page{--bg:#dbc3a7;--side:#f3e6d5cc;--card:#ffffff;--cell:#ffffff;--text:#3d2b1d;--muted:#74604c;--purple:#975a37;--selection:#e2b28a;--selection-ink:#422c1e;--accent-ink:#ffffff;--surface-strong:#efdbc4;--border:#d6c3ad;--line:#d6c3ad;--shadow:#70503218;background:radial-gradient(ellipse at 12% 0%,#f0dcc4 0%,transparent 55%),linear-gradient(125deg,#dbc3a7,#d8b797);background-color:var(--bg);background-attachment:fixed}
:root[data-theme="cream"] .summary-page aside,:root[data-theme="cream"] .summary-page .calendar-topbar{--text:#3d2b1d;--muted:#74604c;--border:#d6c3ad;--purple:#975a37;--surface-strong:#efdbc4;background:#f3e6d5cc;color:var(--text);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
:root[data-theme="cream"] .summary-page .brand-mark{background:#e2b28a;color:#72462c}
:root[data-theme="cream"] .summary-page .month-strip,:root[data-theme="cream"] .summary-page .switch{background:#f3e6d5b8;border-color:#f9eddf;box-shadow:0 5px 18px var(--shadow),inset 0 1px 0 #ffffff80;backdrop-filter:blur(12px)}
:root[data-theme="cream"] .summary-page .year-label{background:transparent}
:root[data-theme="cream"] .summary-page .switch button:not(.active){color:var(--muted)}
:root[data-theme="cream"] .summary-page .search{background:#f3e6d5cc}
:root[data-theme="cream"] .summary-page .topic-tabs button.active{background:#efdbc4;border-color:#bb8e6c}
:root[data-theme="cream"] .summary-page .month-card.current{background:#fff;border-color:#bb8e6c}
:root[data-theme="cream"] .summary-page .summary-month,:root[data-theme="cream"] .summary-page .summary-annual .month-card{background:#fff}
:root[data-theme="cream"] .summary-page #theme-preview i:first-child{background:#dbc3a7}
:root[data-theme="cream"] .summary-page #theme-preview i:last-child{background:#e2b28a}
`;

  function notice() {
    const plan = { loading:'重要事项读取中', error:'重要事项读取失败，请到生活日历刷新' }[personalPlanState];
    const probabilityStatus = !codexSnapshot ? '重置概率读取中' : Date.now()-Date.parse(codexSnapshot.syncedAt) > 36*3600000 ? '重置概率数据待更新' : '';
    const messages = [plan,probabilityStatus].filter(Boolean);
    if (!messages.length) return '';
    return `<p class="summary-status" role="status">${messages.map(esc).join(' · ')}</p>`;
  }
  window.SuperCalendarHome = { entries:summaryEntries, monthly, annual, notice, bind() {
    document.querySelectorAll('[data-summary-target]').forEach(button => button.onclick = () => { location.hash = button.dataset.summaryTarget; });
  } };
  // Use the same snapshot loader and source refresh as the dedicated calendars.
  const loadFootball = loadFootballSnapshot;
  loadFootballSnapshot = async function() { await loadFootball(); if (state.page === 'home') render(); };
  const refresh = () => { if (state.page === 'home') render(); };
  window.addEventListener('investment-calendar-update', refresh);
  window.addEventListener('storage', event => { if (['super-calendar-sports-favorites','super-calendar-cue-index','cue-favorites','cue-match-favorites'].includes(event.key)) refresh(); });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  let lastDay = beijingDay();
  setInterval(() => { const current = beijingDay(); if (current !== lastDay) { lastDay = current; refresh(); loadCodexSnapshot(); } }, 30000);
  setInterval(() => { if (!document.hidden && state.page === 'home') loadCodexSnapshot(); }, 300000);
})();
