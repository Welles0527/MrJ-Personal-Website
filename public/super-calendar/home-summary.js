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
      return `<div class="summary-day ${d ? '' : 'out'} ${d && date === beijingDay() ? 'today' : ''}">${d ? `<div class="summary-date"><strong>${d}</strong>${weather(date)}</div>${items.map(item).join('')}` : ''}</div>`;
    }).join('')}</div></div><p class="summary-mobile-hint">左右滑动查看完整周历</p></section>`;
  }
  function annual() {
    const all = filtered();
    return `<div class="annual summary-annual">${monthNames.map((name,m) => {
      const items = all.filter(e => isMonth(e,m));
      return `<section class="month-card"><div class="month-top"><button class="month-title" data-month="${m}"><b>${String(m+1).padStart(2,'0')}</b><span>${name}</span></button><span class="count">${items.length} 项</span></div><div class="mini-grid">${['一','二','三','四','五','六','日'].map(w => '<div class="weekday">'+w+'</div>').join('')}${days(m).map(d => {
        const date = dateStr(m,d), matches = d ? all.filter(e => e.start <= date && e.end >= date) : [];
        return `<button class="mini-day ${d ? '' : 'empty'} ${date === beijingDay() ? 'today' : ''}" ${d ? 'data-month="'+m+'"' : 'disabled'} title="${esc(date+' '+matches.map(e => e.name).join('；'))}">${d || ''}${d ? weather(date) : ''}${matches.length ? '<i class="day-dot"></i>' : ''}</button>`;
      }).join('')}</div><div class="month-events">${items.slice(0,3).map(item).join('')}${items.length > 3 ? `<button class="more-events" data-month="${m}">查看全部 ${items.length} 项</button>` : ''}</div></section>`;
    }).join('')}</div>`;
  }
  const style = document.createElement('style');
  style.textContent = `.summary-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:0;border-top:1px solid var(--border);border-left:1px solid var(--border);background:var(--card);min-width:770px}.summary-grid>.weekday,.summary-day{border-right:1px solid var(--border);border-bottom:1px solid var(--border)}.summary-scroll{overflow-x:auto}.summary-grid>.weekday{background:var(--card);padding:12px 4px}.summary-day{min-width:0;min-height:126px;background:var(--cell);padding:8px}.summary-day.out{background:var(--card)}.summary-day.today{box-shadow:inset 0 0 0 2px var(--purple)}.summary-date{display:flex;align-items:center;justify-content:space-between;min-height:34px;margin-bottom:5px}.summary-event{display:flex;align-items:flex-start;gap:5px;width:100%;min-width:0;margin:5px 0;padding:6px;text-align:left;line-height:1.5;font-size:12px;color:var(--summary-event-ink);border:0;border-left:3px solid var(--event-color);border-radius:4px;background:var(--summary-event-bg)}.summary-event svg{width:14px;height:14px;margin-top:2px;color:var(--summary-event-ink)}.summary-event span{min-width:0;overflow-wrap:anywhere}.summary-weather{display:inline-flex}.summary-annual .mini-day{min-height:44px;height:auto;position:relative}.summary-annual .weather-icon{width:18px;height:18px}.summary-annual .mini-day .day-dot{background:var(--purple)}.summary-mobile-hint{display:none}.summary-status{font-size:12px;line-height:1.7;color:var(--muted);margin:12px 0}.summary-status a{color:var(--purple)}@media(max-width:680px){.summary-mobile-hint{display:block;font-size:12px;color:var(--muted);padding:0 12px}.summary-day{min-height:108px}.summary-month .calendar-title{flex-wrap:wrap;gap:8px}.summary-month .calendar-title .muted{font-size:11px}}`;
  document.head.append(style);

  style.textContent += `.summary-page .calendar-topbar .period-control strong,.summary-page .calendar-topbar .mobile-menu{color:var(--text)}.summary-page .calendar-topbar select,.summary-page .calendar-topbar select option,.summary-page .calendar-topbar .period-control button{background:var(--surface-strong);color:var(--text)}:root[data-theme="cream"] .summary-page .switch button:not(.active){color:#e1ddcd}.summary-page .title-actions>.primary{display:none}.summary-grid>.weekday{height:auto;min-height:36px;line-height:1.5;padding:8px 4px}`;
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
