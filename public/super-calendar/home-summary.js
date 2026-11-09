(() => {
  'use strict';
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const beijingDay = () => new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  function snookerEntries() {
    return (window.CUE_TOURNAMENTS || [])
      .filter(e => datePattern.test(e.start) && datePattern.test(e.end) && e.end >= e.start)
      .map(e => ({ id:'cue:'+e.id, name:e.name, start:e.start, end:e.end, calendar:'sports', category:'斯诺克', target:'#sports' }));
  }
  function summaryEntries() {
    const football = footballMatches.map(e => ({ id:e.id, calendar:'sports', category:'足球', start:e.start, end:e.end,
      matchup:(e.venue === 'A' ? e.opponent+' vs 巴萨' : '巴萨 vs '+e.opponent),
      name:(e.venue === 'A' ? e.opponent+' vs 巴萨' : '巴萨 vs '+e.opponent)+' · '+(Array.isArray(e.score) ? e.score.join('–') : e.time || '时间待定'), target:'#sports' }));
    const activityIcon = title => /斯诺克/.test(title) ? 'personal-snooker' : /踢球|踢足球|足球/.test(title) ? 'personal-football' : '';
    const plans = personalPlans.filter(p => p.important === true || activityIcon(p.title)).map(p => ({ id:'plan:'+p.id, planId:p.id, calendar:'life', start:p.date, end:p.date, name:(p.important ? '★ ' : '')+p.title, iconKey:activityIcon(p.title) }));
    const anniversaries = lifeAnniversaries.map((a,i) => ({ id:'anniversary:'+i, calendar:'life', start:state.year+'-'+a.date, end:state.year+'-'+a.date, name:a.label, anniversary:true, iconKey:a.icon, lifeDate:state.year+'-'+a.date }));
    const savedAnniversaries = entries.filter(e => e.calendar === 'life' && e.category === '纪念日').map(e => ({ ...e, id:'life:'+e.id, eventId:e.id, anniversary:true, iconKey:'heart' }));
    const current = beijingDay();
    const probability = codexSnapshot && Number.isFinite(codexSnapshot.probability48h)
      ? [{ id:'reset-probability', calendar:'ai', start:current, end:current, name:'重置概率 '+codexSnapshot.probability48h+'%（48h）', target:'#ai' }] : [];
    return [...snookerEntries(), ...football, ...(window.InvestmentCalendar?.summaryEntries() || []), ...plans, ...anniversaries, ...savedAnniversaries, ...probability]
      .filter(e => datePattern.test(e.start) && datePattern.test(e.end))
      .sort((a,b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name, 'zh-CN'));
  }
  const itemThemes = {
    '斯诺克': { background:'rgba(146,255,84,0.3)', text:'#173609', accent:'#65c932' },
    '足球': { background:'linear-gradient(180deg,#004d98 0%,#a50044 100%)', text:'#ffffff', accent:'#004d98' },
    investment: { background:'#efe2cb', text:'#191a18', accent:'#e8a24b' },
    ai: { background:'#fce1ed', text:'#662a46', accent:'#e9a1c1' },
    anniversary: { background:'#ff80c8', text:'#552338', accent:'#c92370' },
    life: { background:'#f0e3dd', text:'#191a18', accent:'#f1a5da' }
  };
  function summaryIcon(category, calendar) {
    if (category === 'personal-snooker') {
      const colors = ['#d6002a','#e8bf00','#d6002a','#168345','#d6002a','#8b4513','#d6002a','#d6002a','#1671cb','#d6002a','#ee89b6','#d6002a','#d6002a','#171717','#d6002a'];
      let index = 0;
      return summaryIcon('斯诺克',calendar).replace(/fill="currentColor"/g,() => 'fill="'+colors[index++]+'"');
    }
    if (category === 'personal-football') {
      const colors = ['#126dc4','#e05435','#e3b322','#249862','#855bb5','#e477b0'];
      let index = 0;
      return summaryIcon('足球',calendar).replace(/<path d="([^"]+)"[^>]*\/>/,(_,path) => path.match(/M[^M]+/g).map(part => '<path d="'+part+'" fill="none" stroke="'+colors[index++%colors.length]+'" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>').join(''));
    }
    if (calendar === 'life' && ICONS[category]) return icon(category);
    if (category === '斯诺克') return `<svg viewBox="0 0 24 24" aria-hidden="true">${[1,2,3,4,5].map((count,row) => Array.from({length:count},(_,column) => `<circle cx="${12+(column-row/2)*4.5}" cy="${3.5+row*3.897}" r="2" fill="currentColor" stroke="none"/>`).join('')).join('')}</svg>`;
    if (category === '足球') return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8.4 9.4 13.3 7.8 16.4 12 13.3 16.1 8.5 14.6ZM8.4 9.4 5.7 7.4 6.3 3.2M5.7 7.4 1.9 9.3M13.3 7.8 14.4 4 11.5 1.5M14.4 4 18.1 3.6M16.4 12H20l1.8-3.7M20 12l1.8 3.7M13.3 16.1 14.4 19.5 18.4 20.1M14.4 19.5l-2.9 3M8.5 14.6 5.7 16.8 6.6 21M5.7 16.8 2.4 15.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return icon(calendars[calendar].icon);
  }
  const annualName = e => e.matchup || e.name;
  function item(e) {
    const colors = e.anniversary ? itemThemes.anniversary : itemThemes[e.category] || itemThemes[e.calendar];
    const backgroundLayer = colors.background.startsWith('linear-gradient') ? colors.background : 'linear-gradient('+colors.background+','+colors.background+')';
    const attribute = e.lifeDate ? 'data-summary-life-date="'+esc(e.lifeDate)+'"' : e.eventId ? 'data-event="'+esc(e.eventId)+'"' : e.planId ? 'data-personal-plan="'+esc(e.planId)+'"' : 'data-summary-target="'+esc(e.target)+'"';
    return `<button class="summary-event" ${attribute} style="--event-color:${colors.accent};--summary-event-bg:${colors.background};--summary-event-layer:${backgroundLayer};--summary-event-ink:${colors.text}" title="${esc(e.name)}">${summaryIcon(e.iconKey || e.category,e.calendar)}<span>${esc(e.name)}</span></button>`;
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
    return `<section class="month-panel summary-month" aria-label="超级日历月历"><div class="calendar-title"><h2>${monthNames[state.month]} <span>${state.year}</span></h2><span class="muted">北京时间 · ${esc(weatherCity)}</span></div><div class="summary-scroll" tabindex="0" aria-label="左右滑动查看完整月历"><div class="summary-grid">${['周一','周二','周三','周四','周五','周六','周日'].map(w => '<div class="weekday">'+w+'</div>').join('')}${days(state.month).map(d => {
      const date = dateStr(state.month,d), items = d ? all.filter(e => e.start <= date && e.end >= date) : [];
      return `<div class="summary-day ${d ? '' : 'out'} ${d && date === beijingDay() ? 'today' : ''} ${items.some(e => e.anniversary) ? 'has-summary-anniversary' : ''}" data-date="${d ? date : ''}">${d ? `<div class="summary-date"><strong>${d}</strong>${weather(date)}</div>${items.map(item).join('')}` : ''}</div>`;
    }).join('')}</div></div><p class="summary-mobile-hint">左右滑动查看完整周历</p></section>`;
  }
  function annual() {
    const all = filtered();
    return `<div class="annual summary-annual">${monthNames.map((name,m) => {
      return `<section class="month-card"><div class="month-top"><button class="month-title" data-month="${m}"><b>${String(m+1).padStart(2,'0')}</b><span>${name}</span></button></div><div class="mini-grid">${['一','二','三','四','五','六','日'].map(w => '<div class="weekday">'+w+'</div>').join('')}${days(m).map(d => {
        const date = dateStr(m,d), matches = d ? all.filter(e => e.start <= date && e.end >= date) : [];
        const groups = new Map();
        matches.forEach(e => {
          const key = (e.anniversary ? 'anniversary:' : '')+(e.iconKey || (itemThemes[e.category] ? e.category : e.calendar));
          if (!groups.has(key)) groups.set(key, { colors:e.anniversary ? itemThemes.anniversary : itemThemes[e.category] || itemThemes[e.calendar], category:e.category, iconKey:e.iconKey, calendar:e.calendar, names:[] });
          groups.get(key).names.push(annualName(e));
        });
        const forecast = d ? weather(date) : '';
        const label = date+' '+matches.map(annualName).join('；');
        return `<button class="mini-day ${d ? '' : 'empty'} ${date === beijingDay() ? 'today' : ''} ${matches.some(e => e.anniversary) ? 'has-summary-anniversary' : ''}" ${d ? 'data-date="'+date+'" data-month="'+m+'"' : 'disabled'} title="${esc(label)}" aria-label="${esc(label)}"><span class="summary-day-number">${d || ''}</span><span class="summary-day-icons">${[...groups.values()].map(g => `<span class="summary-type-icon" style="color:${g.category === '足球' ? '#004d98' : g.category === '斯诺克' ? 'var(--text)' : g.colors.text}" title="${esc(g.names.join('；'))}" aria-hidden="true">${summaryIcon(g.iconKey || g.category,g.calendar)}</span>`).join('')}${forecast}</span></button>`;
      }).join('')}</div></section>`;
    }).join('')}</div>`;
  }
  const style = document.createElement('style');
  style.textContent = `.summary-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;background:var(--card);min-width:770px}.summary-day{border:1px solid var(--border);border-radius:16px}.summary-scroll{overflow-x:auto}.summary-grid>.weekday{background:var(--card);padding:12px 4px}.summary-day{min-width:0;min-height:126px;background:var(--cell);padding:8px}.summary-day.out{background:var(--card);border-radius:8px}.summary-day.today{box-shadow:inset 0 0 0 2px var(--purple)}.summary-date{display:flex;align-items:center;justify-content:space-between;min-height:34px;margin-bottom:5px}.summary-event{display:flex;align-items:flex-start;gap:5px;width:100%;min-width:0;margin:5px 0;padding:6px;text-align:left;line-height:1.5;font-size:12px;color:var(--summary-event-ink);border:0;border-left:3px solid var(--event-color);border-radius:4px;background:var(--summary-event-layer),var(--summary-event-base,var(--cell))}.summary-event svg{flex:none;width:14px;height:14px;margin-top:2px;color:var(--summary-event-ink)}.summary-event span{min-width:0;overflow-wrap:anywhere}.summary-weather{display:inline-flex}.summary-annual .mini-day{min-height:44px;height:auto;position:relative}.summary-annual .weather-icon{width:18px;height:18px}.summary-annual .mini-day .day-dot{background:var(--purple)}.summary-mobile-hint{display:none}.summary-status{font-size:12px;line-height:1.7;color:var(--muted);margin:12px 0}.summary-status a{color:var(--purple)}@media(max-width:760px){.summary-grid{gap:3px}.summary-day{border-radius:10px}}@media(max-width:680px){.summary-mobile-hint{display:block;font-size:12px;color:var(--muted);padding:0 12px}.summary-day{min-height:108px}.summary-month .calendar-title{flex-wrap:wrap;gap:8px}.summary-month .calendar-title .muted{font-size:11px}}`;
  document.head.append(style);
  style.textContent += `.summary-annual .mini-day{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;min-height:58px;padding:5px 2px;min-width:0}.summary-day-number{padding:0 3px;border-radius:3px;color:var(--text)}.summary-day-icons{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:3px;min-width:0;max-width:100%}.summary-type-icon{display:inline-flex;padding:2px;border-radius:3px}.summary-type-icon svg{width:13px;height:13px}:root[data-theme] .summary-annual .mini-day:not(.calendar-holiday){background:transparent;color:var(--text)}:root[data-theme] .summary-annual .mini-day.today{box-shadow:inset 0 0 0 2px var(--purple)}`;

  style.textContent += `:root[data-theme="cream"] .summary-grid,:root[data-theme="cream"] .summary-grid>.weekday,:root[data-theme="cream"] .summary-day{background:#ffffff;--summary-event-base:#ffffff}`;

  style.textContent += `.summary-page .calendar-topbar .period-control strong,.summary-page .calendar-topbar .mobile-menu{color:var(--text)}.summary-page .calendar-topbar select,.summary-page .calendar-topbar select option,.summary-page .calendar-topbar .period-control button{background:var(--surface-strong);color:var(--text)}:root[data-theme="cream"] .summary-page .switch button:not(.active){color:#e1ddcd}.summary-page .title-actions>.primary{display:none}.summary-grid>.weekday{height:auto;min-height:36px;line-height:1.5;padding:8px 4px}`;
  style.textContent += `
.summary-page .title-row.summary-heading-row{display:flex;flex-direction:row;align-items:flex-end;flex-wrap:nowrap;gap:20px;max-width:100%;overflow-x:auto;padding-bottom:6px;margin-bottom:18px}
.summary-heading-row>div:first-child,.summary-heading-row .topic-tabs,.summary-heading-row .title-actions,.summary-heading-row .search{flex:0 0 auto;white-space:nowrap}
.summary-heading-row .eyebrow{font-size:10px;line-height:14px;margin:0 0 8px}
.summary-heading-row h1{display:flex;align-items:center;gap:8px;height:44px;margin:0;font-size:28px;line-height:1.2;letter-spacing:0}
.summary-heading-row h1 span{font-size:28px;line-height:1.2;margin:0;letter-spacing:0}
.summary-heading-row .topic-tabs,.summary-heading-row .title-actions,.summary-heading-row .switch{display:flex;align-items:center;flex-wrap:nowrap;height:44px;box-sizing:border-box}
.summary-heading-row .topic-tabs{gap:4px}
.summary-heading-row .topic-tabs button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:44px;padding:0 10px;line-height:1;font-size:14px;box-sizing:border-box}
.summary-heading-row .summary-filter-icon{display:inline-flex;align-items:center;margin:0}
.summary-heading-row .summary-filter-icon svg{width:16px;height:16px;flex-shrink:0}
.summary-heading-row .title-actions{margin-left:auto}
.summary-heading-row .switch{padding:3px;gap:2px}
.summary-heading-row .switch button{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 12px;font-size:14px;line-height:1;box-sizing:border-box}
.summary-heading-row .switch button svg{display:block;width:16px;height:16px}
.summary-heading-row .search{display:flex;align-items:center;width:180px;height:44px;padding:3px;gap:4px;box-sizing:border-box}
.summary-heading-row .search input{width:0;flex:1;min-width:0;height:36px;padding:0 8px;font-size:14px;line-height:normal;box-sizing:border-box}
.summary-heading-row .search button{height:36px;padding:0 8px;line-height:1;font-size:14px}
.summary-heading-row .summary-category-filter{position:relative;height:44px}
.summary-category-filter>.summary-filter-icon{position:absolute;left:12px;top:14px;pointer-events:none;color:var(--purple)}
.summary-category-select{height:44px;min-width:112px;padding:0 30px 0 36px;border:1px solid var(--border);border-radius:8px;background:var(--surface-strong);color:var(--text);font:inherit;font-size:14px;cursor:pointer;box-sizing:border-box}
.summary-category-select:focus-visible{outline:2px solid var(--purple);outline-offset:2px}
@media(max-width:1600px){.summary-page .title-row.summary-heading-row{gap:14px}.summary-heading-row h1,.summary-heading-row h1 span{font-size:26px}.summary-heading-row .topic-tabs{gap:2px}.summary-heading-row .topic-tabs button{padding:0 8px;font-size:13px}.summary-heading-row .switch button{padding:0 9px;font-size:13px}.summary-heading-row .search{width:160px}.summary-heading-row .search input,.summary-heading-row .search button{font-size:13px}}
`;


  style.textContent += `:root[data-theme] .summary-page :is(.summary-day,.mini-day).has-summary-anniversary{background:#ff80c8!important;color:#552338!important;border-color:#e969b3!important}`;

  function notice() {
    return '';
  }
  window.SuperCalendarHome = { entries:summaryEntries, monthly, annual, notice, bind() {
    if (state.page === 'home') {
      const heading = document.querySelector('main > .title-row');
      const toolbar = document.querySelector('main > .hub-toolbar');
      if (heading && toolbar) {
        heading.classList.add('summary-heading-row');
        heading.setAttribute('tabindex', '0');
        heading.setAttribute('aria-label', '日历标题、分类与搜索，窄屏可左右滑动');
        const filters = toolbar.querySelector('.topic-tabs');
        const selectedIcon = filters.querySelector('button.active .summary-filter-icon')?.outerHTML || '';
        filters.classList.add('summary-category-filter');
        filters.innerHTML = selectedIcon + `<select class="summary-category-select" aria-label="日历分类">${categories().map(key => `<option value="${esc(key)}" ${state.category === key ? 'selected' : ''}>${esc(key === '全部' ? key : calendars[key].label)}</option>`).join('')}</select>`;
        filters.querySelector('select').onchange = event => {
          state.category = event.target.value;
          render();
          document.querySelector('.summary-category-select')?.focus({preventScroll:true});
        };
        heading.insertBefore(filters, heading.querySelector('.title-actions'));
        heading.append(toolbar.querySelector('.search'));
        toolbar.remove();
      }
    }
    document.querySelectorAll('[data-summary-life-date]').forEach(button => button.onclick = () => showLifeDate(button.dataset.summaryLifeDate));
    document.querySelectorAll('[data-summary-target]').forEach(button => button.onclick = () => { location.hash = button.dataset.summaryTarget; });
  } };
  // Use the same snapshot loader and source refresh as the dedicated calendars.
  const loadFootball = loadFootballSnapshot;
  loadFootballSnapshot = async function() { await loadFootball(); if (state.page === 'home') render(); };
  const refresh = () => { if (state.page === 'home') render(); };
  const tournamentScript = document.createElement('script');
  tournamentScript.src = new URL('../snooker-calendar/tournaments.js?v=20261108-all-events', document.currentScript.src).href;
  tournamentScript.onload = refresh;
  tournamentScript.onerror = refresh;
  document.head.append(tournamentScript);
  window.addEventListener('investment-calendar-update', refresh);
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  let lastDay = beijingDay();
  setInterval(() => { const current = beijingDay(); if (current !== lastDay) { lastDay = current; refresh(); loadCodexSnapshot(); } }, 30000);
  setInterval(() => { if (!document.hidden && state.page === 'home') loadCodexSnapshot(); }, 300000);
})();
