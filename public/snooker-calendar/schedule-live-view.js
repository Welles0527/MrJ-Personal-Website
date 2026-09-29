/* Schedule-page presentation enhancements: live-first list, bracket markers, and seed badges. */
(() => {
  const baseFiltered = filtered;
  const baseCard = card;
  const baseInlineBracket = inlineBracket;
  state.matchFilterByEvent ||= Object.create(null);
  state.matchSearchByEvent ||= Object.create(null);
  state.matchDateByEvent ||= Object.create(null);
  const todayInBeijing = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const matchFilters = date => {
    const dayLabel = date === todayInBeijing() ? '今日' : '当日';
    return [
      { id: 'all', label: `${dayLabel}赛事` },
      { id: 'ended', label: `${dayLabel}已结束` },
      { id: 'live', label: `${dayLabel}正在进行` },
    ];
  };
  const matchDateRange = (start, end) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '')) return [];
    const first = Date.parse(`${start}T00:00:00Z`);
    const last = Date.parse(`${end}T00:00:00Z`);
    if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return [];
    const days = [];
    for (let day = first; day <= last; day += 24 * 60 * 60 * 1000) days.push(new Date(day).toISOString().slice(0, 10));
    return days;
  };
  const dateLabel = value => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const date = new Date(`${value}T12:00:00+08:00`);
    const weekday = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', weekday: 'short' }).format(date);
    return `${Number(match[2])}月${Number(match[3])}日 ${weekday}`;
  };

  const normalizeQuery = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").trim().toLocaleLowerCase();

  const applyMatchFilter = (panel, selected, query = '', date = '') => {
    const matches = [...panel.querySelectorAll('.knockout-match,.match-fixture')];
    const revealFilteredDay = Boolean(query || (date && date !== todayInBeijing()));
    matches.forEach(match => {
      const earlier = match.closest('.earlier-matches');
      if (earlier && date === todayInBeijing() && selected === 'all' && !query) {
        match.classList.remove('match-filter-hidden');
        return;
      }
      const rawStatus = match.dataset.matchStatus;
      const statusMatches = selected === 'all' || (selected === 'ended' && rawStatus === 'ended') ||
        (selected === 'live' && ['live', 'suspended'].includes(rawStatus));
      const nameMatches = !query || normalizeQuery(match.dataset.matchSearch).includes(normalizeQuery(query));
      const dateMatches = !date || match.dataset.matchDate === date;
      match.classList.toggle('match-filter-hidden', !(statusMatches && nameMatches && dateMatches));
    });
    panel.querySelectorAll('.knockout-round,.inline-bracket-round').forEach(round => {
      const roundMatches = [...round.querySelectorAll('.knockout-match,.match-fixture')];
      round.classList.toggle('match-filter-hidden', roundMatches.length > 0 &&
        roundMatches.every(match => match.classList.contains('match-filter-hidden')));
    });
    panel.querySelectorAll('.later-matches').forEach(section => {
      const rows = [...section.querySelectorAll('.knockout-match,.match-fixture')];
      const found = rows.some(match => !match.classList.contains('match-filter-hidden'));
      section.classList.toggle('match-filter-hidden', selected !== 'all' || (date && !found));
      if (revealFilteredDay) {
        section.open = found;
        if (found) section.dataset.matchFilterAutoOpened = 'true';
      } else if (section.dataset.matchFilterAutoOpened === 'true') {
        section.open = false;
        delete section.dataset.matchFilterAutoOpened;
      }
      if (date && section.querySelector('summary')) {
        section.querySelector('summary').textContent = `${dateLabel(date)}待赛对阵 · ${rows.filter(match => !match.classList.contains('match-filter-hidden')).length} 场`;
      }
    });
    panel.querySelectorAll('.earlier-matches').forEach(section => {
      const rows = [...section.querySelectorAll('.knockout-match,.match-fixture')];
      const found = rows.some(match => !match.classList.contains('match-filter-hidden'));
      if (revealFilteredDay) {
        section.open = found;
        if (found) section.dataset.matchFilterAutoOpened = 'true';
      } else if (section.dataset.matchFilterAutoOpened === 'true') {
        section.open = false;
        delete section.dataset.matchFilterAutoOpened;
      }
      if (date && section.querySelector('summary')) {
        section.querySelector('summary').textContent = revealFilteredDay && found ? `${dateLabel(date)}已结束的比赛 · ${rows.filter(match => !match.classList.contains('match-filter-hidden')).length} 场` :
          `展开当天以前已结束的比赛 · ${rows.length} 场`;
      }
      const preserveHistory = date === todayInBeijing() && selected === 'all' && !query;
      section.classList.toggle('match-filter-hidden', !found && !preserveHistory);
      if (preserveHistory) {
        rows.forEach(match => match.classList.remove('match-filter-hidden'));
      }
    });
    const visible = matches.some(match => !match.classList.contains('match-filter-hidden') &&
      !match.closest('.later-matches.match-filter-hidden,.earlier-matches.match-filter-hidden') &&
      (!match.closest('details') || match.closest('details').open));
    panel.querySelector('.match-filter-empty')?.classList.toggle('match-filter-hidden', visible);
  };
  const updateMatchFilterButtons = (panel, selectedDate) => {
    const filters = matchFilters(selectedDate);
    const dateMatches = [...panel.querySelectorAll('.knockout-match,.match-fixture')]
      .filter(match => match.dataset.matchDate === selectedDate);
    const counts = {
      all: dateMatches.length,
      ended: dateMatches.filter(match => match.dataset.matchStatus === 'ended').length,
      live: dateMatches.filter(match => ['live', 'suspended'].includes(match.dataset.matchStatus)).length,
    };
    panel.querySelectorAll('[data-match-filter]').forEach(button => {
      const filter = filters.find(item => item.id === button.dataset.matchFilter);
      if (filter) button.childNodes[0].textContent = filter.label;
      const count = button.querySelector('b');
      if (count) count.textContent = counts[button.dataset.matchFilter] ?? 0;
    });
  };
  const normalizeName = value => String(value || '')
    .replace(/[’‘]/g, "'")
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const seedRanks = new Map();
  (rankingYears[2026]?.players || []).slice(0, 16).forEach((name, index) => {
    seedRanks.set(normalizeName(name), index + 1);
    const meta = playerMeta[name];
    if (meta?.[0]) seedRanks.set(normalizeName(meta[0]), index + 1);
  });

  const seedRank = name => {
    const normalized = normalizeName(name);
    if (!normalized || /待赛|待定|to be decided|winner of match|qualifier/i.test(normalized)) return null;
    if (seedRanks.has(normalized)) return seedRanks.get(normalized);
    const compact = normalized.replace(/\b[a-z]\b/g, '').replace(/\s+/g, ' ').trim();
    for (const [candidate, rank] of seedRanks) {
      if (candidate.replace(/\b[a-z]\b/g, '').replace(/\s+/g, ' ').trim() === compact) return rank;
    }
    return null;
  };

  state.scheduleShowUpcoming = Boolean(state.scheduleShowUpcoming);
  state.scheduleCollapsedEvents ||= new Set();

  filtered = () => baseFiltered().filter(event => {
    if (state.nav !== 'schedule') return true;
    return status(event) === 'live' || (state.scheduleShowUpcoming && status(event) === 'upcoming');
  });

  const bracketWinnerIndex = score => {
    const text = String(score || '').trim();
    if (/^胜$/.test(text)) return 0;
    if (/^负$/.test(text)) return 1;
    const match = text.match(/^(\d+)\s*[–-]\s*(\d+)$/);
    if (!match || match[1] === match[2]) return null;
    return Number(match[1]) > Number(match[2]) ? 0 : 1;
  };

  const decorateBracket = (html, event) => {
    const eventId = event.id;
    const template = document.createElement('template');
    template.innerHTML = html;
    const heading = template.content.querySelector('.inline-bracket-heading');
    if (heading && !heading.querySelector('.bracket-key')) {
      const key = document.createElement('span');
      key.className = 'bracket-key';
      key.setAttribute('aria-label', '对阵图标识');
      key.innerHTML = '<span class="winner-key"><i aria-hidden="true">胜</i>胜者</span><span class="seed-key"><i aria-hidden="true">✦</i>种子</span>';
      heading.insertBefore(key, heading.querySelector('button'));
    }
    template.content.querySelectorAll('.inline-bracket-match,.knockout-match').forEach(match => {
      const row = match.querySelector(':scope > div');
      const players = [...match.querySelectorAll('[data-bracket-player]')].length ?
        [...match.querySelectorAll('[data-bracket-player]')] : [...(row?.querySelectorAll(':scope > span') || [])];
      if (players.length !== 2) return;
      const winner = match.dataset.matchStatus && match.dataset.matchStatus !== 'ended' ? null :
        bracketWinnerIndex(match.dataset.score || row?.querySelector(':scope > b')?.textContent);
      players.forEach((playerNode, index) => {
        const name = playerNode.textContent.trim();
        const rank = seedRank(name);
        playerNode.classList.add('bracket-player');
        if (winner === index) {
          playerNode.classList.add('bracket-winner');
          const mark = document.createElement('i');
          mark.className = 'winner-mark';
          mark.setAttribute('aria-label', '胜者');
          mark.textContent = '胜';
          playerNode.prepend(mark);
          match.classList.add('has-winner');
        } else if (winner !== null) {
          playerNode.classList.add('bracket-loser');
        }
        if (rank) {
          const mark = document.createElement('i');
          mark.className = 'seed-mark';
          mark.title = `种子选手 · 当前世界排名第 ${rank} 位`;
          mark.setAttribute('aria-label', `种子选手，当前世界排名第 ${rank} 位`);
          mark.textContent = '✦';
          playerNode.append(mark);
        }
      });
    });
    const content = template.content.querySelector('.knockout-chart,.inline-bracket-rounds');
    const panel = template.content.querySelector('.inline-bracket');
    const allMatches = panel ? [...panel.querySelectorAll('.knockout-match,.match-fixture')] : [];
    const matches = allMatches.filter(match => !match.closest('.earlier-matches'));
    if (content && matches.some(match => match.dataset.matchFilterStatus)) {
      const selected = state.matchFilterByEvent[eventId] || 'all';
      const query = state.matchSearchByEvent[eventId] || '';
      const matchDates = [...new Set(allMatches.map(match => match.dataset.matchDate).filter(Boolean))].sort();
      const calendarDates = event.type === 'qualifier' ? [] : matchDateRange(event.start, event.end);
      const availableDates = calendarDates.length ? calendarDates : matchDates;
      const today = todayInBeijing();
      const selectedDate = availableDates.includes(state.matchDateByEvent[eventId]) ? state.matchDateByEvent[eventId] :
        availableDates.includes(today) ? today : availableDates[0] || today;
      state.matchDateByEvent[eventId] = selectedDate;
      const datedMatches = allMatches.filter(match => match.dataset.matchDate === selectedDate);
      const counts = {
        all: datedMatches.length,
        ended: datedMatches.filter(match => match.dataset.matchStatus === 'ended').length,
        live: datedMatches.filter(match => ['live', 'suspended'].includes(match.dataset.matchStatus)).length,
      };
      const filters = matchFilters(selectedDate);
      const calendar = document.createElement('div');
      calendar.className = 'match-date-calendar';
      calendar.setAttribute('role', 'group');
      calendar.setAttribute('aria-label', '正赛比赛日期');
      const dateList = document.createElement('div');
      dateList.className = 'match-date-list';
      availableDates.forEach(date => {
        const [, , month, day] = date.match(/^(\d{4})-(\d{2})-(\d{2})$/) || [];
        const option = document.createElement('button');
        option.type = 'button';
        option.className = `match-date-option${date === today ? ' is-today' : ''}${date === selectedDate ? ' is-selected' : ''}`;
        option.dataset.matchDay = date;
        option.setAttribute('aria-pressed', String(date === selectedDate));
        if (date === today) option.setAttribute('aria-current', 'date');
        option.setAttribute('aria-label', `${dateLabel(date)}${date === today ? '，今天' : ''}`);
        option.innerHTML = `<small>${Number(month)}月</small><strong>${Number(day)}</strong><span>${date === today ? '今天' : dateLabel(date).split(' ')[1]}</span>`;
        dateList.append(option);
      });
      const calendarHeading = document.createElement('span');
      calendarHeading.className = 'match-date-calendar-label';
      calendarHeading.textContent = '正赛日期';
      if (event.type !== 'qualifier') calendar.append(calendarHeading, dateList);
      const searchFilters = document.createElement('div');
      searchFilters.className = 'match-query-filters';
      const search = document.createElement('input');
      search.type = 'search';
      search.dataset.matchSearch = '';
      search.value = query;
      search.placeholder = '输入球员中文名或英文名';
      search.setAttribute('aria-label', '搜索球员比赛安排');
      searchFilters.append(search);
      const bar = document.createElement('div');
      bar.className = 'match-status-filters';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', '比赛状态筛选');
      bar.innerHTML = `<span>筛选</span>${filters.map(filter =>
        `<button type="button" data-match-filter="${filter.id}" aria-pressed="${selected === filter.id}">${filter.label}<b>${counts[filter.id]}</b></button>`).join('')}`;
      const empty = document.createElement('p');
      empty.className = 'match-filter-empty match-filter-hidden';
      empty.textContent = '当前筛选条件下暂无比赛';
      content.before(calendar);
      content.before(searchFilters);
      content.before(bar);
      content.after(empty);
      applyMatchFilter(panel, selected, query, selectedDate);
    }
    return template.innerHTML;
  };

  inlineBracket = event => decorateBracket(baseInlineBracket(event), event);

  card = event => {
    if (state.nav !== 'schedule' || status(event) !== 'live') return baseCard(event);
    const previousExpanded = state.expandedEvent;
    state.expandedEvent = state.scheduleCollapsedEvents.has(event.id) ? null : event.id;
    const html = baseCard(event);
    state.expandedEvent = previousExpanded;
    return html;
  };

  const scheduleControl = () => {
    const available = event => state.types.has(event.type) && state.regions.has(event.region);
    const liveCount = events.filter(event => available(event) && status(event) === 'live').length;
    const upcomingCount = events.filter(event => available(event) && status(event) === 'upcoming').length;
    return `<div class="schedule-control" role="region" aria-label="赛程显示范围">
      <div><strong>正在进行的赛事</strong><span>${liveCount} 场赛事详情已默认展开${state.scheduleShowUpcoming ? ` · 已显示 ${upcomingCount} 场未开始赛事` : ''}</span></div>
      <button type="button" data-schedule-upcoming aria-expanded="${state.scheduleShowUpcoming}" ${upcomingCount ? '' : 'disabled'}>
        ${state.scheduleShowUpcoming ? '收起未开始赛事' : '展开未开始赛事'}${upcomingCount ? ` · ${upcomingCount}` : ''}
      </button>
    </div>`;
  };

  const baseRender = render;
  render = () => {
    baseRender();
    if (state.nav === 'schedule') {
      const list = document.querySelector('.details-list');
      if (list) list.insertAdjacentHTML('beforebegin', scheduleControl());
    }
  };

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const navigation = target?.closest('[data-nav="schedule"]');
    if (navigation) {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.nav = 'schedule';
      state.view = 'year';
      state.statuses = new Set(['live']);
      state.scheduleShowUpcoming = false;
      state.scheduleCollapsedEvents.clear();
      state.expandedEvent = null;
      document.body.classList.remove('menu-open');
      render();
      return;
    }

    const filter = target?.closest('[data-match-filter]');
    if (filter) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const panel = filter.closest('.inline-bracket');
      const eventId = panel?.querySelector('[data-inline-close]')?.dataset.inlineClose;
      if (panel && eventId) {
        const selected = filter.dataset.matchFilter;
        state.matchFilterByEvent[eventId] = selected;
        const selectedDate = state.matchDateByEvent[eventId] || todayInBeijing();
        applyMatchFilter(panel, selected, state.matchSearchByEvent[eventId] || '', selectedDate);
        panel.querySelectorAll('[data-match-filter]').forEach(button =>
          button.setAttribute('aria-pressed', String(button.dataset.matchFilter === selected)));
      }
      return;
    }

    const dateButton = target?.closest('[data-match-day]');
    if (dateButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const panel = dateButton.closest('.inline-bracket');
      const eventId = panel?.querySelector('[data-inline-close]')?.dataset.inlineClose;
      if (panel && eventId) {
        const selectedDate = dateButton.dataset.matchDay;
        state.matchDateByEvent[eventId] = selectedDate;
        state.matchFilterByEvent[eventId] = 'all';
        panel.querySelectorAll('[data-match-day]').forEach(button => {
          const selected = button.dataset.matchDay === selectedDate;
          button.setAttribute('aria-pressed', String(selected));
          button.classList.toggle('is-selected', selected);
        });
        panel.querySelectorAll('[data-match-filter]').forEach(button =>
          button.setAttribute('aria-pressed', String(button.dataset.matchFilter === 'all')));
        updateMatchFilterButtons(panel, selectedDate);
        applyMatchFilter(panel, 'all', state.matchSearchByEvent[eventId] || '', selectedDate);
      }
      return;
    }

    if (state.nav === 'schedule') {
      const toggle = target?.closest('[data-schedule-upcoming]');
      if (toggle) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.scheduleShowUpcoming = !state.scheduleShowUpcoming;
        state.statuses = state.scheduleShowUpcoming ? new Set(['live', 'upcoming']) : new Set(['live']);
        state.expandedEvent = null;
        render();
        return;
      }

      const reset = target?.closest('[data-reset]');
      if (reset) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.types = new Set(Object.keys(types).filter(key => key !== 'qualifier'));
        state.regions = new Set(Object.keys(regions));
        state.statuses = state.scheduleShowUpcoming ? new Set(['live', 'upcoming']) : new Set(['live']);
        render();
        return;
      }

      const close = target?.closest('[data-inline-close]');
      const open = target?.closest('[data-inline-event]');
      if (close || open) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const id = close?.dataset.inlineClose || open?.dataset.inlineEvent;
        const selected = events.find(item => item.id === id);
        if (selected && status(selected) === 'live') {
          if (state.scheduleCollapsedEvents.has(id)) state.scheduleCollapsedEvents.delete(id);
          else state.scheduleCollapsedEvents.add(id);
          state.expandedEvent = null;
        } else {
          state.expandedEvent = state.expandedEvent === id ? null : id;
        }
        render();
      }
    }
  }, true);

  document.addEventListener('input', event => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input?.matches('[data-match-search]')) return;
    const panel = input.closest('.inline-bracket');
    const eventId = panel?.querySelector('[data-inline-close]')?.dataset.inlineClose;
    if (!panel || !eventId) return;
    state.matchSearchByEvent[eventId] = input.value;
    applyMatchFilter(panel, state.matchFilterByEvent[eventId] || 'all', input.value,
      state.matchDateByEvent[eventId] || '');
  }, true);

  const style = document.createElement('style');
  style.textContent = `
    .schedule-control{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 15px;padding:0;border:0;border-radius:0;background:transparent}
    .schedule-control strong,.schedule-control span{display:block}.schedule-control strong{font-size:13px}.schedule-control span{margin-top:4px;color:var(--muted);font-size:11px}
    .schedule-control button{padding:7px 0;border:0;border-radius:0;background:transparent;color:var(--selection);font-size:12px;white-space:nowrap}.schedule-control button:hover{text-decoration:underline}.schedule-control button:disabled{opacity:.45;cursor:not-allowed}
    .inline-bracket-heading{flex-wrap:wrap}.bracket-key{display:flex;align-items:center;gap:12px;margin-left:auto;color:var(--muted);font-size:10px}.bracket-key span{display:inline-flex;align-items:center;gap:4px}.bracket-key i{font-style:normal}.winner-key i,.winner-mark{color:var(--selection)}.seed-key i,.seed-mark{color:var(--gold)}
    .inline-bracket-match .bracket-player{display:inline!important;height:auto;padding:0;background:transparent;border:0;min-width:0;line-height:1.6}.bracket-winner{color:var(--selection);font-weight:700}.bracket-loser{opacity:.72}.winner-mark,.seed-mark{display:inline;font-style:normal;line-height:1;white-space:nowrap}.winner-mark{margin-right:5px;font-size:13px;font-weight:700}.seed-mark{margin-left:3px;font-size:13px}.inline-bracket-match.has-winner{border-color:color-mix(in srgb,var(--selection) 42%,var(--line))}
    .inline-bracket-rounds{display:flex;flex-direction:column;max-height:none!important;overflow:visible!important;gap:20px}.inline-bracket-round{flex:none;min-width:0;width:100%;padding:0;border:0;background:transparent}.inline-bracket-round h4{font-size:15px}.inline-bracket-match:not(.match-fixture){grid-template-columns:minmax(190px,230px) minmax(0,1fr);gap:20px;padding:13px 15px;margin-top:8px}.inline-bracket-match:not(.match-fixture)>div{font-size:17px;gap:12px}.inline-bracket-match:not(.match-fixture) b{font-size:18px;min-width:58px;text-align:center}.inline-bracket-match:not(.match-fixture) small{font-size:11px}.later-matches{margin-top:18px}.later-matches summary{cursor:pointer;color:var(--muted);font-size:12px;line-height:1.7}
    .match-fixture.inline-bracket-match{display:grid;grid-template-columns:145px minmax(0,1fr) 128px;align-items:center;gap:16px;min-height:126px;margin:0;padding:13px 18px;border:0;border-bottom:1px solid color-mix(in srgb,var(--text) 22%,transparent);border-radius:0;background:color-mix(in srgb,var(--card) 72%,var(--bg))}
    .match-fixture.inline-bracket-match.has-winner{border-color:color-mix(in srgb,var(--text) 22%,transparent)}.match-fixture.match-live{background:color-mix(in srgb,var(--bg) 88%,var(--selection) 12%)}
    .match-fixture .match-when{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0}.match-when strong{font:700 24px/1.1 Manrope,sans-serif}.match-when>span{color:var(--muted);font-size:13px}.match-when>small{font-size:12px!important;color:var(--text)!important}.match-when .match-live-indicator{margin-top:8px;padding:0;background:transparent;color:var(--selection);font-size:11px;white-space:nowrap}
    .match-fixture .match-pair{display:grid;grid-template-columns:minmax(0,1fr) 74px minmax(0,1fr);align-items:center;gap:10px;min-width:0}
    .match-fixture .match-entrant{display:grid;grid-template-columns:minmax(0,1fr) 82px;align-items:center;gap:9px;min-width:0}.match-fixture .match-entrant-away{grid-template-columns:82px minmax(0,1fr)}.match-entrant-away .match-portrait{grid-column:1;grid-row:1}.match-entrant-away .match-name{grid-column:2;grid-row:1}
    .match-fixture .match-name{display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:0;text-align:right}.match-fixture .match-entrant-away .match-name{align-items:flex-start;text-align:left}.match-name>small{font-size:10px!important;color:var(--muted)!important}.match-name>[data-bracket-player]{font-size:16px;line-height:1.25;overflow-wrap:anywhere;text-align:inherit!important}.match-name .match-flag{display:block;width:27px;height:18px;text-align:inherit!important}.match-flag .rank-flag,.match-flag svg{display:block;width:27px;height:18px}
    .match-fixture .match-portrait{position:relative;display:grid;place-items:center;width:82px;height:88px;overflow:hidden;border:1px solid color-mix(in srgb,var(--text) 40%,transparent);border-radius:10px;background:color-mix(in srgb,var(--card) 65%,var(--bg));color:var(--muted);font-size:28px;text-align:center!important}.match-portrait img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top}
    .match-fixture .match-score{display:flex;flex-direction:column;gap:5px;align-items:center;min-width:0}.match-score>span{font-size:10px;color:var(--muted);text-align:center!important}.match-score>div{display:grid;grid-template-columns:1fr 1px 1fr;align-items:center;gap:0;width:100%;min-height:48px;border:1px solid color-mix(in srgb,var(--text) 35%,transparent);border-radius:9px;background:color-mix(in srgb,var(--bg) 80%,var(--card))}.match-score b{padding:0!important;min-width:0!important;background:transparent!important;font:700 25px/1 Manrope,sans-serif!important;text-align:center}.match-score i{height:28px;width:1px;background:var(--line)}.match-score>div.match-points{grid-template-columns:1fr auto 1fr;min-height:36px;border:0;background:color-mix(in srgb,var(--bg) 92%,var(--card))}.match-points span{font-size:9px;color:var(--muted);white-space:nowrap}.match-score .match-points b{font-size:14px!important;color:var(--muted)}
    .match-fixture .match-actions{display:flex;flex-direction:column;gap:7px}.match-actions a{display:grid;place-items:center;min-height:36px;padding:7px 6px;border-radius:6px;background:var(--selection);color:#111!important;font-size:12px;font-weight:700;text-align:center;white-space:nowrap}.match-actions a:hover{filter:brightness(1.12)}
    .match-round-divider{display:flex;flex-direction:column;align-items:center;gap:1px;padding:12px 10px;border-block:1px solid var(--line);background:color-mix(in srgb,var(--bg) 90%,var(--selection) 10%);text-align:center}.match-round-divider small{color:var(--muted);font-size:11px}.match-round-divider strong{color:var(--selection);font-size:18px}.match-round-divider strong:before,.match-round-divider strong:after{content:'▲';margin:0 9px;font-size:9px;vertical-align:middle}
    .inline-bracket-round:has(.match-fixture) h4{margin:0;padding:7px 0 12px;font-size:14px}.inline-bracket-round:has(.match-fixture) h4 span{color:var(--muted);font-weight:400}
    .knockout-chart{display:flex;align-items:flex-start;gap:22px;overflow-x:auto;padding:8px 2px 14px;scrollbar-color:var(--line) transparent}.knockout-round{flex:1 0 310px;min-width:0}.knockout-round h4{margin:0 0 12px;padding:7px 10px;border-bottom:1px solid var(--selection);color:var(--selection);font-size:14px}.knockout-round h4 span{color:var(--muted);font-size:11px;font-weight:400}.knockout-round-matches{display:grid;gap:12px}.knockout-match{padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--card)}.knockout-match.has-winner{border-color:color-mix(in srgb,var(--selection) 45%,var(--line))}.knockout-match-meta{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:10px}.knockout-match-meta strong{color:var(--selection);white-space:nowrap}.knockout-match-players{display:grid;grid-template-columns:minmax(0,1fr) 48px minmax(0,1fr);align-items:center;gap:4px;margin-top:10px}.knockout-match .match-entrant,.knockout-match .match-entrant-away{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0}.knockout-match .match-portrait{order:0;position:relative;display:block;width:66px;height:66px;overflow:hidden;border:1px solid var(--line);border-radius:7px;background:var(--bg)}.knockout-match .match-portrait img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}.knockout-match .match-name{order:1;display:flex;align-items:center;flex-direction:column;gap:3px;width:100%;text-align:center}.knockout-match .match-name [data-bracket-player]{font-size:12px;line-height:1.25;overflow-wrap:anywhere}.knockout-match .match-flag,.knockout-match .match-flag .rank-flag,.knockout-match .match-flag svg{display:block;width:22px;height:14px}.knockout-score{display:flex;align-items:center;justify-content:center;gap:3px;font-size:14px}.knockout-score b{font-size:17px}.knockout-score span{color:var(--muted)}.knockout-match-link{display:block;margin-top:8px;color:var(--selection);font-size:11px;text-align:right}.earlier-matches{margin-top:16px}.earlier-matches summary{cursor:pointer;padding:9px 0;color:var(--selection);font-size:12px}.earlier-matches .knockout-match{display:inline-block;vertical-align:top;width:310px;max-width:100%;margin:0 10px 10px 0}.earlier-matches .match-fixture{width:100%}
    @media(max-width:1100px) and (min-width:681px){.match-fixture.inline-bracket-match{grid-template-columns:100px minmax(0,1fr) 106px;gap:8px;padding-inline:10px}.match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 62px minmax(0,1fr);gap:5px}.match-fixture .match-entrant{grid-template-columns:minmax(0,1fr) 62px;gap:5px}.match-fixture .match-entrant-away{grid-template-columns:62px minmax(0,1fr)}.match-fixture .match-portrait{width:62px;height:72px}.match-name>[data-bracket-player]{font-size:13px}.match-when strong{font-size:20px}.match-score b{font-size:20px!important}}
    @media(max-width:680px){.schedule-control{align-items:flex-start;flex-direction:column;gap:9px}.schedule-control button{width:100%}.bracket-key{order:3;width:100%;margin-left:0}.inline-bracket-heading button{margin-left:auto}}
    @media(max-width:680px){.inline-bracket{padding:12px 0}.knockout-round{flex-basis:100%;scroll-snap-align:start}.knockout-chart{scroll-snap-type:x mandatory}.inline-bracket-match:not(.match-fixture){grid-template-columns:minmax(0,1fr);gap:8px;padding:12px 10px}.inline-bracket-match:not(.match-fixture)>div{font-size:15px;gap:6px}.inline-bracket-match:not(.match-fixture) b{min-width:44px;font-size:16px;padding:3px}.inline-bracket-match .bracket-player{overflow-wrap:anywhere}.schedule-control button{text-align:left}.match-fixture.inline-bracket-match{grid-template-columns:minmax(0,1fr);gap:10px;padding:14px 8px;min-height:0}.match-fixture .match-when{display:flex;flex-direction:row;align-items:baseline;gap:7px}.match-when strong{font-size:18px}.match-when>span,.match-when>small{font-size:10px!important}.match-when .match-live-indicator{margin:0 0 0 auto;font-size:10px}.match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr);gap:5px}.match-fixture .match-entrant,.match-fixture .match-entrant-away{display:flex;flex-direction:column;align-items:center;gap:5px}.match-fixture .match-portrait{order:0;width:58px;height:62px}.match-fixture .match-name,.match-fixture .match-entrant-away .match-name{order:1;align-items:center;text-align:center}.match-name>[data-bracket-player]{font-size:12px}.match-name>small{font-size:9px!important}.match-name .match-flag{height:14px}.match-flag .rank-flag,.match-flag svg{width:22px;height:14px;margin:auto}.match-score>div{min-height:40px}.match-score b{font-size:17px!important}.match-score>small{font-size:8px!important;white-space:normal;text-align:center}.match-fixture .match-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.match-actions a{min-height:32px;font-size:11px}}
  `;
  document.head.append(style);
  const filterStyle = document.createElement('style');
  filterStyle.textContent = '.match-date-calendar{margin:12px 0 10px}.match-date-calendar-label{display:block;margin-bottom:7px;color:var(--muted);font-size:11px}.match-date-list{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.match-date-option{display:flex;min-width:0;min-height:65px;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 4px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text);cursor:pointer}.match-date-option small,.match-date-option span{font-size:10px;color:var(--muted);line-height:1.1}.match-date-option strong{font-size:19px;line-height:1.1}.match-date-option.is-today{border-color:color-mix(in srgb,var(--gold) 55%,var(--line));background:color-mix(in srgb,var(--gold) 17%,var(--card))}.match-date-option.is-selected{border-color:var(--selection);background:color-mix(in srgb,var(--selection) 16%,var(--card));color:var(--selection)}.match-date-option.is-selected small,.match-date-option.is-selected span{color:inherit}.match-query-filters{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:9px 0 8px}.match-query-filters input{flex:1 1 250px;min-width:0;height:36px;padding:0 11px;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--text);font:inherit;font-size:12px}.match-query-filters input::placeholder{color:var(--muted)}.match-status-filters{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:8px 0 14px}.match-status-filters>span{margin-right:2px;color:var(--muted);font-size:11px}.match-status-filters button{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--text);font-size:11px;line-height:1.2;white-space:nowrap;cursor:pointer}.match-status-filters button[aria-pressed="true"]{border-color:var(--selection);background:color-mix(in srgb,var(--selection) 16%,var(--card));color:var(--selection)}.match-status-filters button b{font-size:10px;opacity:.76}.match-filter-hidden{display:none!important}.match-filter-empty{padding:18px 10px;color:var(--muted);font-size:12px;text-align:center}@media(max-width:680px){.match-date-calendar{margin:9px 0}.match-date-list{gap:4px}.match-date-option{min-height:59px;padding:5px 2px;border-radius:6px}.match-date-option small,.match-date-option span{font-size:9px}.match-date-option strong{font-size:17px}.match-query-filters{align-items:stretch;flex-direction:column}.match-query-filters input{flex:0 0 auto;width:100%;height:40px}.match-status-filters{gap:6px;margin:8px 0 12px}.match-status-filters>span{flex-basis:100%}.match-status-filters button{padding:6px 8px;font-size:10px}}';
  document.head.append(filterStyle);
  render();
})();
