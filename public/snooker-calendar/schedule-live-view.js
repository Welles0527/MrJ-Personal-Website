/* Schedule-page presentation enhancements: live-first list, bracket markers, and seed badges. */
(() => {
  const baseFiltered = filtered;
  const baseCard = card;
  const baseInlineBracket = inlineBracket;
  state.matchFilterByEvent ||= Object.create(null);
  state.matchSearchByEvent ||= Object.create(null);
  state.matchDateByEvent ||= Object.create(null);
  state.matchPlayerByEvent ||= Object.create(null);
  const todayInBeijing = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const matchFilters = date => {
    const dayLabel = !date ? '全部日期' : date === todayInBeijing() ? '今日' : '当日';
    return [
      { id: 'all', label: `${dayLabel}赛事` },
      { id: 'live', label: '进行中' },
      { id: 'upcoming', label: '即将开始' },
      { id: 'ended', label: '已结束' },
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

  const applyMatchFilter = (panel, selected, query = '', date = '', playerName = '') => {
    const matches = [...panel.querySelectorAll('.knockout-match,.match-fixture')];
    const revealFilteredDay = Boolean(selected === 'upcoming' || query || playerName || (date && date !== todayInBeijing()));
    matches.forEach(match => {
      const earlier = match.closest('.earlier-matches');
      if (earlier && date === todayInBeijing() && selected === 'all' && !query && !playerName) {
        match.classList.remove('match-filter-hidden');
        return;
      }
      const rawStatus = match.dataset.matchStatus;
      const statusMatches = selected === 'all' || (selected === 'ended' && rawStatus === 'ended') ||
        (selected === 'live' && ['live', 'suspended'].includes(rawStatus)) ||
        (selected === 'upcoming' && rawStatus === 'upcoming');
      const matchNames = normalizeQuery(match.dataset.matchSearch);
      const nameMatches = !query || matchNames.includes(normalizeQuery(query));
      const playerAliases = [playerName, playerMeta[playerName]?.[0]].filter(Boolean);
      const playerMatches = !playerName || playerAliases.some(name => matchNames.includes(normalizeQuery(name)));
      const dateMatches = !date || match.dataset.matchDate === date;
      match.classList.toggle('match-filter-hidden', !(statusMatches && nameMatches && playerMatches && dateMatches));
    });
    panel.querySelectorAll('.knockout-round,.inline-bracket-round').forEach(round => {
      const roundMatches = [...round.querySelectorAll('.knockout-match,.match-fixture')];
      round.classList.toggle('match-filter-hidden', roundMatches.length > 0 &&
        roundMatches.every(match => match.classList.contains('match-filter-hidden')));
    });
    panel.querySelectorAll('.later-matches').forEach(section => {
      const rows = [...section.querySelectorAll('.knockout-match,.match-fixture')];
      const found = rows.some(match => !match.classList.contains('match-filter-hidden'));
      section.classList.toggle('match-filter-hidden', !['all', 'upcoming'].includes(selected) || (date && !found));
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
      const preserveHistory = date === todayInBeijing() && selected === 'all' && !query && !playerName;
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
      .filter(match => !selectedDate || match.dataset.matchDate === selectedDate);
    const counts = {
      all: dateMatches.length,
      ended: dateMatches.filter(match => match.dataset.matchStatus === 'ended').length,
      live: dateMatches.filter(match => ['live', 'suspended'].includes(match.dataset.matchStatus)).length,
      upcoming: dateMatches.filter(match => match.dataset.matchStatus === 'upcoming').length,
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

  const rankedPlayers = (rankingYears[2026]?.players || []).slice(0, 16).map((name, index) => ({
    name,
    rank: index + 1,
    chineseName: playerMeta[name]?.[0] || name,
    country: playerMeta[name]?.[2] || '',
  }));
  const playerFilters = selectedPlayer => {
    const picker = document.createElement('details');
    picker.className = 'match-player-filters';
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', '球员筛选');
    const summary = document.createElement('summary');
    summary.textContent = selectedPlayer ? playerMeta[selectedPlayer]?.[0] || selectedPlayer : '选择球员';
    const menu = document.createElement('div');
    menu.className = 'match-player-menu';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'match-player-option';
    clear.dataset.matchPlayer = '';
    clear.textContent = '全部球员';
    menu.append(clear);
    picker.append(summary, menu);

    for (const [label, players] of [
      ['国内球员', rankedPlayers.filter(player => player.country === '中国')],
      ['国外球员', rankedPlayers.filter(player => player.country !== '中国')],
    ]) {
      if (!players.length) continue;
      const group = document.createElement('div');
      group.className = 'match-player-group';
      const groupLabel = document.createElement('span');
      groupLabel.className = 'match-player-group-label';
      groupLabel.textContent = label;
      const list = document.createElement('div');
      list.className = 'match-player-options';
      players.forEach(player => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'match-player-option';
        button.dataset.matchPlayer = player.name;
        button.setAttribute('aria-label', `世界排名第 ${player.rank} 位，${player.chineseName}`);
        button.setAttribute('aria-pressed', String(selectedPlayer === player.name));
        const rank = document.createElement('span');
        rank.className = 'match-player-rank';
        rank.textContent = player.rank;
        const name = document.createElement('span');
        name.textContent = player.chineseName;
        button.append(rank, name);
        list.append(button);
      });
      group.append(groupLabel, list);
      menu.append(group);
    }
    return picker;
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
    template.content.querySelectorAll('.inline-bracket-match,.knockout-match').forEach(match => {
      if (match.classList.contains('knockout-match')) {
        const meta = match.querySelector('.knockout-match-meta');
        const label = meta?.querySelector('span');
        const clock = label?.textContent.match(/\d{2}:\d{2}$/);
        if (clock) {
          const time = document.createElement('b');
          time.className = 'match-clock';
          time.textContent = clock[0];
          label.textContent = label.textContent.replace(/\s*\d{2}:\d{2}$/, '');
          meta.prepend(time);
        }
      }
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
          match.classList.add('has-winner');
        } else if (winner !== null) {
          playerNode.classList.add('bracket-loser');
        }
        if (rank && !(match.dataset.matchStatus === 'ended' && winner !== null)) {
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
      const selectedPlayer = state.matchPlayerByEvent[eventId] || '';
      const matchDates = [...new Set(allMatches.map(match => match.dataset.matchDate).filter(Boolean))].sort();
      const calendarDates = event.type === 'qualifier' ? [] : matchDateRange(event.start, event.end);
      const availableDates = calendarDates.length ? calendarDates : matchDates;
      const today = todayInBeijing();
      const savedDate = state.matchDateByEvent[eventId];
      const selectedDate = selectedPlayer && !savedDate ? '' : availableDates.includes(savedDate) ? savedDate :
        availableDates.includes(today) ? today : availableDates[0] || today;
      state.matchDateByEvent[eventId] = selectedDate;
      const datedMatches = allMatches.filter(match => !selectedDate || match.dataset.matchDate === selectedDate);
      const counts = {
        all: datedMatches.length,
        ended: datedMatches.filter(match => match.dataset.matchStatus === 'ended').length,
        live: datedMatches.filter(match => ['live', 'suspended'].includes(match.dataset.matchStatus)).length,
        upcoming: datedMatches.filter(match => match.dataset.matchStatus === 'upcoming').length,
      };
      const filters = matchFilters(selectedDate);
      const calendar = document.createElement('div');
      calendar.className = 'match-date-calendar';
      calendar.setAttribute('role', 'group');
      calendar.setAttribute('aria-label', '正赛比赛日期');
      const calendarTop = document.createElement('div');
      calendarTop.className = 'match-date-calendar-top';
      const calendarHeading = document.createElement('span');
      calendarHeading.className = 'match-date-calendar-label';
      calendarHeading.textContent = '正赛日期';
      const allDates = document.createElement('button');
      allDates.type = 'button';
      allDates.className = `match-date-all${selectedDate ? '' : ' is-selected'}`;
      allDates.dataset.matchDay = '';
      allDates.setAttribute('aria-pressed', String(!selectedDate));
      allDates.textContent = '全部日期';
      calendarTop.append(calendarHeading, allDates);
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
        const dayCount = allMatches.filter(match => match.dataset.matchDate === date).length;
        const count = document.createElement('b');
        count.className = 'match-date-count';
        count.textContent = dayCount;
        option.append(count);
        dateList.append(option);
      });
      if (event.type !== 'qualifier' || selectedPlayer) calendar.append(calendarTop, dateList);
      const searchFilters = document.createElement('div');
      searchFilters.className = 'match-query-filters';
      const search = document.createElement('input');
      search.type = 'search';
      search.dataset.matchSearch = '';
      search.value = query;
      search.placeholder = '输入球员中文名或英文名';
      search.setAttribute('aria-label', '搜索球员比赛安排');
      searchFilters.append(search);
      const rankedPlayerFilters = playerFilters(selectedPlayer);
      const controls = document.createElement('div');
      controls.className = 'match-controls-row';
      const bar = document.createElement('div');
      bar.className = 'match-status-filters';
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', '比赛状态筛选');
      bar.innerHTML = `<span>筛选</span>${filters.map(filter =>
        `<button type="button" data-match-filter="${filter.id}" aria-pressed="${selected === filter.id}">${filter.label}<b>${counts[filter.id]}</b></button>`).join('')}`;
      rankedPlayerFilters.querySelector('.match-player-menu').prepend(searchFilters);
      controls.append(bar, rankedPlayerFilters);
      const empty = document.createElement('p');
      empty.className = 'match-filter-empty match-filter-hidden';
      empty.textContent = '当前筛选条件下暂无比赛';
      content.before(calendar);
      content.before(controls);
      content.after(empty);
      applyMatchFilter(panel, selected, query, selectedDate, selectedPlayer);
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
    document.querySelectorAll('.match-player-filters[open]').forEach(picker => {
      if (!picker.contains(target)) picker.open = false;
    });
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
      const eventId = panel?.dataset.inlineEventId;
      if (panel && eventId) {
        const selected = filter.dataset.matchFilter;
        state.matchFilterByEvent[eventId] = selected;
        const selectedDate = state.matchDateByEvent[eventId] ?? todayInBeijing();
        applyMatchFilter(panel, selected, state.matchSearchByEvent[eventId] || '', selectedDate,
          state.matchPlayerByEvent[eventId] || '');
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
      const eventId = panel?.dataset.inlineEventId;
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
        applyMatchFilter(panel, 'all', state.matchSearchByEvent[eventId] || '', selectedDate,
          state.matchPlayerByEvent[eventId] || '');
      }
      return;
    }

    const playerButton = target?.closest('[data-match-player]');
    if (playerButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const panel = playerButton.closest('.inline-bracket');
      const eventId = panel?.dataset.inlineEventId;
      if (panel && eventId) {
        const selectedPlayer = state.matchPlayerByEvent[eventId] === playerButton.dataset.matchPlayer ? '' : playerButton.dataset.matchPlayer;
        state.matchPlayerByEvent[eventId] = selectedPlayer;
        state.matchDateByEvent[eventId] = '';
        state.matchFilterByEvent[eventId] = 'all';
        state.matchSearchByEvent[eventId] = '';
        const picker = playerButton.closest('.match-player-filters');
        if (picker) {
          picker.open = false;
          picker.querySelector('summary').textContent = selectedPlayer ? playerMeta[selectedPlayer]?.[0] || selectedPlayer : '选择球员';
          picker.querySelectorAll('.match-player-option,.match-player-group').forEach(item => item.hidden = false);
        }
        const search = panel.querySelector('[data-match-search]');
        if (search) search.value = '';
        panel.querySelectorAll('[data-match-player]').forEach(button =>
          button.setAttribute('aria-pressed', String(button.dataset.matchPlayer === selectedPlayer)));
        panel.querySelectorAll('[data-match-day]').forEach(button => {
          const selected = button.dataset.matchDay === '';
          button.setAttribute('aria-pressed', String(selected));
          button.classList.toggle('is-selected', selected);
        });
        panel.querySelectorAll('[data-match-filter]').forEach(button =>
          button.setAttribute('aria-pressed', String(button.dataset.matchFilter === 'all')));
        updateMatchFilterButtons(panel, '');
        applyMatchFilter(panel, 'all', '', '', selectedPlayer);
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

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.match-player-filters[open]').forEach(picker => {
      picker.open = false;
      picker.querySelector('summary').focus();
    });
  });

  document.addEventListener('input', event => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (!input?.matches('[data-match-search]')) return;
    const panel = input.closest('.inline-bracket');
    const eventId = panel?.dataset.inlineEventId;
    if (!panel || !eventId) return;
    state.matchSearchByEvent[eventId] = input.value;
    const picker = input.closest('.match-player-filters');
    if (picker) {
      state.matchPlayerByEvent[eventId] = '';
      picker.querySelector('summary').textContent = input.value ? '搜索球员' : '选择球员';
      picker.querySelectorAll('[data-match-player]').forEach(button => {
        const name = button.dataset.matchPlayer;
        button.setAttribute('aria-pressed', 'false');
        button.hidden = Boolean(name && input.value && !normalizeQuery(`${name} ${playerMeta[name]?.[0] || ''}`).includes(normalizeQuery(input.value)));
      });
      picker.querySelectorAll('.match-player-group').forEach(group => {
        group.hidden = ![...group.querySelectorAll('[data-match-player]')].some(button => !button.hidden);
      });
    }
    applyMatchFilter(panel, state.matchFilterByEvent[eventId] || 'all', input.value,
      state.matchDateByEvent[eventId] || '', state.matchPlayerByEvent[eventId] || '');
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
    .match-fixture .match-entrant{display:grid;grid-template-columns:minmax(0,1fr) max-content;align-items:center;gap:9px;min-width:0}.match-fixture .match-entrant-away{grid-template-columns:max-content minmax(0,1fr)}.match-entrant-away .match-portrait-wrap{grid-column:1;grid-row:1}.match-entrant-away .match-name{grid-column:2;grid-row:1}.match-portrait-wrap{position:relative;display:inline-block;flex:0 0 auto;min-width:0;line-height:0;vertical-align:top}.match-eliminated{position:absolute;z-index:3;top:-29px;right:-48px;display:grid;place-items:center;box-sizing:border-box;width:40px;height:25px;transform:rotate(28deg);padding:0;border:1px solid rgba(255,255,255,.78);border-radius:50%;outline:1px solid rgba(255,255,255,.42);outline-offset:-4px;background:transparent;box-shadow:none;color:rgba(255,255,255,.84);font-size:9px;line-height:1;font-weight:800;letter-spacing:1px;white-space:nowrap;opacity:.82;pointer-events:none}
    .match-fixture .match-name{display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:0;text-align:right}.match-fixture .match-entrant-away .match-name{align-items:flex-start;text-align:left}.match-name>small{font-size:10px!important;color:var(--muted)!important}.match-name>[data-bracket-player]{font-size:16px;line-height:1.25;overflow-wrap:anywhere;text-align:inherit!important}.match-name .match-flag{display:block;width:27px;height:18px;text-align:inherit!important}.match-flag .rank-flag,.match-flag svg{display:block;width:27px;height:18px}
    .match-fixture .match-portrait{position:relative;display:grid;place-items:center;width:82px;height:88px;overflow:hidden;border:1px solid color-mix(in srgb,var(--text) 40%,transparent);border-radius:10px;background:color-mix(in srgb,var(--card) 65%,var(--bg));color:var(--muted);font-size:28px;text-align:center!important}.match-portrait img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top}
    .match-fixture .match-score{display:flex;flex-direction:column;gap:5px;align-items:center;min-width:0}.match-score>span{font-size:10px;color:var(--muted);text-align:center!important}.match-score>div{display:grid;grid-template-columns:1fr 1px 1fr;align-items:center;gap:0;width:100%;min-height:48px;border:1px solid color-mix(in srgb,var(--text) 35%,transparent);border-radius:9px;background:color-mix(in srgb,var(--bg) 80%,var(--card))}.match-score b{padding:0!important;min-width:0!important;background:transparent!important;font:700 25px/1 Manrope,sans-serif!important;text-align:center}.match-score i{height:28px;width:1px;background:var(--line)}.match-score>div.match-points{grid-template-columns:1fr auto 1fr;min-height:36px;border:0;background:color-mix(in srgb,var(--bg) 92%,var(--card))}.match-points span{font-size:9px;color:var(--muted);white-space:nowrap}.match-score .match-points b{font-size:14px!important;color:var(--muted)}
    .match-fixture .match-actions{display:flex;flex-direction:column;gap:7px}.match-actions a{display:grid;place-items:center;min-height:36px;padding:7px 6px;border-radius:6px;background:var(--selection);color:#111!important;font-size:12px;font-weight:700;text-align:center;white-space:nowrap}.match-actions a:hover{filter:brightness(1.12)}
    .match-round-divider{display:flex;flex-direction:column;align-items:center;gap:1px;padding:12px 10px;border-block:1px solid var(--line);background:color-mix(in srgb,var(--bg) 90%,var(--selection) 10%);text-align:center}.match-round-divider small{color:var(--muted);font-size:11px}.match-round-divider strong{color:var(--selection);font-size:18px}.match-round-divider strong:before,.match-round-divider strong:after{content:'▲';margin:0 9px;font-size:9px;vertical-align:middle}
    .inline-bracket-round:has(.match-fixture) h4{margin:0;padding:7px 0 12px;font-size:14px}.inline-bracket-round:has(.match-fixture) h4 span{color:var(--muted);font-weight:400}
    .knockout-chart{display:flex;align-items:flex-start;gap:22px;overflow-x:auto;padding:8px 2px 14px;scrollbar-color:var(--line) transparent}.knockout-round{flex:1 0 310px;min-width:0}.knockout-round h4{margin:0 0 12px;padding:7px 10px;border-bottom:1px solid var(--selection);color:var(--selection);font-size:14px}.knockout-round h4 span{color:var(--muted);font-size:11px;font-weight:400}.knockout-round-matches{display:grid;gap:12px}.knockout-match{padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--card)}.knockout-match.has-winner{border-color:color-mix(in srgb,var(--selection) 45%,var(--line))}.knockout-match-meta{display:flex;justify-content:space-between;gap:8px;color:var(--muted);font-size:10px}.knockout-match-meta strong{color:var(--selection);white-space:nowrap}.knockout-match-players{display:grid;grid-template-columns:minmax(0,1fr) 48px minmax(0,1fr);align-items:center;gap:4px;margin-top:10px}.knockout-match .match-entrant,.knockout-match .match-entrant-away{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0}.knockout-match .match-portrait{order:0;position:relative;display:block;width:66px;height:66px;overflow:hidden;border:1px solid var(--line);border-radius:7px;background:var(--bg)}.knockout-match .match-portrait img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}.knockout-match .match-name{order:1;display:flex;align-items:center;flex-direction:column;gap:3px;width:100%;text-align:center}.knockout-match .match-name [data-bracket-player]{font-size:12px;line-height:1.25;overflow-wrap:anywhere}.knockout-match .match-flag,.knockout-match .match-flag .rank-flag,.knockout-match .match-flag svg{display:block;width:22px;height:14px}.knockout-score{display:flex;align-items:center;justify-content:center;gap:3px;font-size:14px}.knockout-score b{font-size:17px}.knockout-score span{color:var(--muted)}.knockout-match-link{display:block;margin-top:8px;color:var(--selection);font-size:11px;text-align:right}.earlier-matches{margin-top:16px}.earlier-matches summary{cursor:pointer;padding:9px 0;color:var(--selection);font-size:12px}.earlier-matches .knockout-match{display:inline-block;vertical-align:top;width:310px;max-width:100%;margin:0 10px 10px 0}.earlier-matches .match-fixture{width:100%}
    @media(max-width:1100px) and (min-width:681px){.match-fixture.inline-bracket-match{grid-template-columns:100px minmax(0,1fr) 106px;gap:8px;padding-inline:10px}.match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 62px minmax(0,1fr);gap:5px}.match-fixture .match-entrant{grid-template-columns:minmax(0,1fr) max-content;gap:5px}.match-fixture .match-entrant-away{grid-template-columns:max-content minmax(0,1fr)}.match-fixture .match-portrait{width:62px;height:72px}.match-name>[data-bracket-player]{font-size:13px}.match-when strong{font-size:20px}.match-score b{font-size:20px!important}}
    @media(max-width:680px){.schedule-control{align-items:flex-start;flex-direction:column;gap:9px}.schedule-control button{width:100%}.bracket-key{order:3;width:100%;margin-left:0}.inline-bracket-heading button{margin-left:auto}}
    @media(max-width:680px){.inline-bracket{padding:12px 0}.knockout-round{flex-basis:100%;scroll-snap-align:start}.knockout-chart{scroll-snap-type:x mandatory}.inline-bracket-match:not(.match-fixture){grid-template-columns:minmax(0,1fr);gap:8px;padding:12px 10px}.inline-bracket-match:not(.match-fixture)>div{font-size:15px;gap:6px}.inline-bracket-match:not(.match-fixture) b{min-width:44px;font-size:16px;padding:3px}.inline-bracket-match .bracket-player{overflow-wrap:anywhere}.schedule-control button{text-align:left}.match-fixture.inline-bracket-match{grid-template-columns:minmax(0,1fr);gap:10px;padding:14px 8px;min-height:0}.match-fixture .match-when{display:flex;flex-direction:row;align-items:baseline;gap:7px}.match-when strong{font-size:18px}.match-when>span,.match-when>small{font-size:10px!important}.match-when .match-live-indicator{margin:0 0 0 auto;font-size:10px}.match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr);gap:5px}.match-fixture .match-entrant,.match-fixture .match-entrant-away{display:flex;flex-direction:column;align-items:center;gap:5px}.match-fixture .match-portrait{order:0;width:58px;height:62px}.match-fixture .match-name,.match-fixture .match-entrant-away .match-name{order:1;align-items:center;text-align:center}.match-name>[data-bracket-player]{font-size:12px}.match-name>small{font-size:9px!important}.match-name .match-flag{height:14px}.match-flag .rank-flag,.match-flag svg{width:22px;height:14px;margin:auto}.match-score>div{min-height:40px}.match-score b{font-size:17px!important}.match-score>small{font-size:8px!important;white-space:normal;text-align:center}.match-fixture .match-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.match-actions a{min-height:32px;font-size:11px}}
  `;
  document.head.append(style);
  const filterStyle = document.createElement('style');
  filterStyle.textContent = '.match-date-calendar{margin:12px 0 10px}.match-date-calendar-label{display:block;margin-bottom:7px;color:var(--muted);font-size:11px}.match-date-list{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.match-date-option{display:flex;min-width:0;min-height:65px;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 4px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text);cursor:pointer}.match-date-option small,.match-date-option span{font-size:10px;color:var(--muted);line-height:1.1}.match-date-option strong{font-size:19px;line-height:1.1}.match-date-option.is-today{border-color:color-mix(in srgb,var(--gold) 55%,var(--line));background:color-mix(in srgb,var(--gold) 17%,var(--card))}.match-date-option.is-selected{border-color:var(--selection);background:color-mix(in srgb,var(--selection) 16%,var(--card));color:var(--selection)}.match-date-option.is-selected small,.match-date-option.is-selected span{color:inherit}.match-query-filters{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:9px 0 8px}.match-query-filters input{flex:1 1 250px;min-width:0;height:36px;padding:0 11px;border:1px solid var(--line);border-radius:7px;background:var(--card);color:var(--text);font:inherit;font-size:12px}.match-query-filters input::placeholder{color:var(--muted)}.match-status-filters{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:8px 0 14px}.match-status-filters>span{margin-right:2px;color:var(--muted);font-size:11px}.match-status-filters button{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:transparent;color:var(--text);font-size:11px;line-height:1.2;white-space:nowrap;cursor:pointer}.match-status-filters button[aria-pressed="true"]{border-color:var(--selection);background:color-mix(in srgb,var(--selection) 16%,var(--card));color:var(--selection)}.match-status-filters button b{font-size:10px;opacity:.76}.match-filter-hidden{display:none!important}.match-filter-empty{padding:18px 10px;color:var(--muted);font-size:12px;text-align:center}@media(max-width:680px){.match-date-calendar{margin:9px 0}.match-date-list{gap:4px}.match-date-option{min-height:59px;padding:5px 2px;border-radius:6px}.match-date-option small,.match-date-option span{font-size:9px}.match-date-option strong{font-size:17px}.match-query-filters{align-items:stretch;flex-direction:column}.match-query-filters input{flex:0 0 auto;width:100%;height:40px}.match-status-filters{gap:6px;margin:8px 0 12px}.match-status-filters>span{flex-basis:100%}.match-status-filters button{padding:6px 8px;font-size:10px}}';
  filterStyle.textContent += `
    .seed-mark{color:var(--selection)}
    .inline-bracket-match:not(.match-fixture){margin-top:0;border:0;border-bottom:1px solid color-mix(in srgb,var(--line) 58%,transparent);border-radius:0;background:transparent}
    .inline-bracket-match:not(.match-fixture).has-winner{border-bottom-color:color-mix(in srgb,var(--line) 58%,transparent)}
    .match-date-calendar{margin:12px 0 10px}.match-date-calendar-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}.match-date-calendar-label{font-size:13px;margin:0}.match-date-all{min-height:30px;padding:5px 10px;border:1px solid color-mix(in srgb,var(--line) 78%,transparent);border-radius:7px;background:color-mix(in srgb,var(--card) 65%,transparent);color:var(--text);font-size:12px;cursor:pointer}.match-date-all.is-selected{border-color:var(--selection);background:color-mix(in srgb,var(--selection) 16%,var(--card));color:var(--selection)}
    .match-date-list{gap:0;overflow:hidden;border:1px solid color-mix(in srgb,var(--line) 75%,transparent);border-radius:9px;background:var(--card)}
    .match-date-option{border:0;border-radius:0;background:transparent;min-height:62px}
    .match-date-option+.match-date-option{border-left:1px solid color-mix(in srgb,var(--line) 65%,transparent)}
    .match-date-option.is-today{border-color:transparent;background:color-mix(in srgb,var(--selection) 13%,var(--card))}
    .match-date-option.is-selected{background:color-mix(in srgb,var(--selection) 20%,var(--card));color:var(--selection)}
    .match-date-option.is-today.is-selected{background:color-mix(in srgb,var(--selection) 24%,var(--card))}
    .match-player-filters{display:flex;flex-direction:column;gap:10px;margin:16px 0}
    .match-player-group{display:grid;grid-template-columns:82px minmax(0,1fr);align-items:start;gap:8px}
    .match-player-group-label{padding-top:9px;color:var(--muted);font-size:12px;white-space:nowrap}
    .match-player-options{display:grid;grid-template-columns:repeat(auto-fill,minmax(156px,1fr));gap:4px 10px;min-width:0}
    .match-player-option{display:flex;align-items:center;gap:8px;min-width:0;min-height:34px;padding:7px 8px;border:0;border-radius:6px;background:transparent;color:var(--text);font-size:13px;line-height:1.4;white-space:nowrap;cursor:pointer;text-align:left}
    .match-player-option:hover,.match-player-option[aria-pressed="true"]{background:color-mix(in srgb,var(--selection) 14%,transparent);color:var(--selection)}
    .match-player-option[aria-pressed="true"]{font-weight:600}
    .match-player-option:focus-visible{outline:2px solid var(--selection);outline-offset:1px}
    .match-player-rank{flex:0 0 18px;color:var(--muted);font-size:11px;font-weight:400;font-variant-numeric:tabular-nums;text-align:right}
    .match-controls-row{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:8px 0 13px}
    .match-query-filters{flex:0 1 270px;min-width:190px;margin:0}
    .match-query-filters input{width:100%;height:40px;padding:0 12px;border-color:color-mix(in srgb,var(--line) 78%,transparent);border-radius:8px;background:color-mix(in srgb,var(--card) 76%,var(--bg));font-size:14px}
    .match-status-filters{flex:0 1 auto;flex-wrap:nowrap;gap:0;margin:0;border:1px solid color-mix(in srgb,var(--line) 78%,transparent);border-radius:8px;overflow:hidden;background:color-mix(in srgb,var(--card) 48%,transparent)}
    .match-status-filters>span{padding:0 10px;color:var(--muted);font-size:13px}
    .match-status-filters button{min-height:40px;padding:8px 12px;border:0;border-left:1px solid color-mix(in srgb,var(--line) 48%,transparent);border-radius:0;background:transparent;font-size:13px}
    .match-status-filters button[aria-pressed="true"]{background:color-mix(in srgb,var(--selection) 14%,transparent);color:var(--selection)}
    .match-status-filters button b{font-size:12px}
    .match-fixture.inline-bracket-match{grid-template-columns:112px minmax(0,1fr);min-height:110px;padding:12px 4px;border-bottom-color:color-mix(in srgb,var(--line) 60%,transparent);background:transparent}
    .match-fixture.inline-bracket-match.has-winner{border-bottom-color:color-mix(in srgb,var(--line) 60%,transparent)}
    .match-fixture.match-live{background:color-mix(in srgb,var(--selection) 5%,transparent)}
    .knockout-round-matches{gap:0;border-top:1px solid color-mix(in srgb,var(--line) 58%,transparent)}
    .knockout-match,.knockout-match.has-winner{display:block;margin:0;padding:13px 3px;border:0;border-bottom:1px solid color-mix(in srgb,var(--line) 58%,transparent);border-radius:0;background:transparent}
    .knockout-match-meta{font-size:11px}.knockout-match-players{margin-top:8px}
    .earlier-matches .knockout-match{display:block;width:100%;max-width:none;margin:0}
    .knockout-match .match-name [data-bracket-player]{font-size:13px}
    .inline-bracket-round:has(.match-fixture) h4{padding:10px 0 6px}
    @media(max-width:900px){.match-controls-row{align-items:stretch;flex-direction:column-reverse;gap:8px}.match-query-filters{flex:0 0 auto;width:100%;min-width:0}.match-status-filters{align-self:flex-start}}
    @media(max-width:680px){.match-date-list{grid-template-columns:repeat(7,minmax(0,1fr));border-radius:7px}.match-date-option{min-height:57px;padding:5px 1px}.match-date-option strong{font-size:17px}.match-date-option small,.match-date-option span{font-size:9px}
      .match-player-group{grid-template-columns:minmax(0,1fr);gap:5px}.match-player-group-label{padding:0;font-size:12px}.match-player-options{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 6px}.match-player-option{min-height:36px;padding:7px 6px;font-size:12px}
      .match-controls-row{gap:7px;margin:7px 0 10px}.match-status-filters{width:100%;flex-wrap:nowrap}.match-status-filters>span{padding:0 7px;font-size:12px}.match-status-filters button{flex:1;justify-content:center;min-height:42px;padding:7px 5px;font-size:11px}.match-status-filters button b{font-size:11px}
      .match-fixture.inline-bracket-match{grid-template-columns:minmax(0,1fr);min-height:0;gap:9px;padding:12px 2px}.match-fixture .match-when{padding:0 3px}.match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 58px minmax(0,1fr)}
      .knockout-round-matches{padding:0 2px}.knockout-match,.knockout-match.has-winner{padding:11px 0}.knockout-match-players{grid-template-columns:minmax(0,1fr) 42px minmax(0,1fr)}
    }
    .inline-bracket{margin:-8px 0 0;padding:10px 12px;border:0;border-radius:10px;background:color-mix(in srgb,var(--card) 34%,var(--bg))}
    .inline-bracket-rounds{gap:10px}
    .inline-bracket-round:has(.match-fixture) h4{padding:4px 0 8px}
    .match-date-calendar{margin:8px 0 6px}.match-date-option{min-height:54px}
    .match-player-filters{gap:5px;margin:8px 0}
    .match-player-option{min-height:30px;padding:5px 7px}
    .match-controls-row{gap:10px;margin:6px 0 8px}
    .match-fixture.inline-bracket-match{grid-template-columns:96px minmax(0,1fr);gap:10px;min-height:88px;padding:7px 5px;background:transparent}
    .match-fixture.inline-bracket-match.has-winner{border-bottom-color:color-mix(in srgb,var(--line) 60%,transparent)}
    .match-fixture.match-live{background:transparent}
    .match-fixture .match-when strong{font-size:20px}.match-fixture .match-when .match-live-indicator{margin-top:4px}
    .match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr);gap:8px}
    .match-fixture .match-name>[data-bracket-player]{font-size:14px}
    .match-fixture .match-portrait{width:70px;height:74px}
    .match-fixture .match-score>div{min-height:40px}.match-fixture .match-score b{font-size:22px!important}
    .match-round-divider{padding:8px}.match-round-divider strong{font-size:16px}
    .knockout-chart{gap:16px;padding:4px 1px 8px}.knockout-round h4{margin-bottom:8px;padding:5px 8px}
    .knockout-round-matches{gap:0}.knockout-match,.knockout-match.has-winner{padding:8px 3px}
    .earlier-matches,.later-matches{margin-top:10px}
    @media(max-width:680px){
      .inline-bracket{padding:8px}
      .inline-bracket-rounds{gap:8px}
      .match-date-calendar{margin:6px 0}.match-date-option{min-height:50px}
      .match-player-filters{gap:4px;margin:6px 0}.match-player-options{gap:3px 5px}.match-player-option{min-height:32px;padding:5px 6px}
      .match-controls-row{gap:6px;margin:5px 0 7px}
      .match-fixture.inline-bracket-match{gap:6px;padding:8px 2px}
      .match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 54px minmax(0,1fr);gap:4px}
      .match-fixture .match-portrait{width:54px;height:58px}
      .match-fixture .match-name>[data-bracket-player]{font-size:11px}
      .match-fixture .match-score>div{min-height:36px}
      .knockout-match,.knockout-match.has-winner{padding:8px 0}
    }
  `;
  filterStyle.textContent += `
    .match-date-calendar{display:grid;grid-template-columns:minmax(0,1fr) 90px;gap:8px;align-items:stretch}
    .match-date-calendar-top{display:contents}.match-date-calendar-label{display:none}
    .match-date-list{grid-column:1;grid-row:1}.match-date-all{grid-column:2;grid-row:1;height:100%}
    .match-date-option{position:relative;padding-inline:24px}.match-date-count{position:absolute;right:7px;top:50%;transform:translateY(-50%);display:grid;place-items:center;min-width:20px;height:20px;padding:2px;border-radius:50%;background:color-mix(in srgb,var(--text) 10%,transparent);font-size:10px;font-weight:600}
    .match-controls-row{flex-direction:row;align-items:center}
    .match-status-filters>span{display:none}.match-status-filters button:first-of-type{border-left:0}
    .match-player-filters{position:relative;display:block;flex:0 0 220px;margin:0;min-width:0}
    .match-player-filters summary{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:40px;padding:8px 12px;box-sizing:border-box;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--text);font-size:13px;list-style:none;cursor:pointer}
    .match-player-filters summary::-webkit-details-marker{display:none}.match-player-filters summary::after{content:'⌄';color:var(--muted)}
    .match-player-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:30;width:300px;max-width:calc(100vw - 40px);max-height:340px;overflow:auto;padding:10px;box-sizing:border-box;border:1px solid var(--line);border-radius:9px;background:var(--card);box-shadow:0 12px 28px #0004}
    .match-player-filters:not([open]) .match-player-menu{display:none}.match-player-filters [hidden]{display:none!important}
    .match-player-menu .match-query-filters{position:sticky;top:-10px;z-index:1;width:100%;min-width:0;margin:0 0 7px;padding:0 0 6px;background:var(--card)}
    .match-player-menu .match-query-filters input{height:36px;font-size:12px}
    .match-player-menu .match-player-group{display:block;margin-top:8px}.match-player-menu .match-player-group-label{display:block;padding:5px 7px;font-size:11px}
    .match-player-menu .match-player-options{grid-template-columns:minmax(0,1fr);gap:1px}.match-player-menu .match-player-option{width:100%;min-height:32px;font-size:12px}
    .knockout-chart{display:block;overflow:visible}.knockout-round+.knockout-round{margin-top:12px}
    .knockout-match,.knockout-match.has-winner,.earlier-matches .knockout-match{display:grid;grid-template-columns:132px minmax(0,1fr);align-items:center;gap:12px;min-height:82px;padding:8px 4px;box-sizing:border-box}
    .knockout-match-meta{flex-direction:column;justify-content:center;gap:4px}.match-clock{color:var(--text);font-size:20px;font-variant-numeric:tabular-nums}
    .knockout-match-players{grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr);gap:14px;margin:0}
    .knockout-match .match-entrant,.knockout-match .match-entrant-away,.match-fixture .match-entrant,.match-fixture .match-entrant-away{display:flex;flex-direction:row;align-items:center;gap:12px;min-width:0}
    .match-fixture .match-portrait-wrap{order:0}.match-fixture .match-name{order:1}
    .knockout-match .match-portrait,.match-fixture .match-portrait{width:56px;height:64px;border-radius:7px}
    .knockout-match .match-name,.match-fixture .match-name,.match-fixture .match-entrant-away .match-name{align-items:flex-start;text-align:left;width:auto;gap:5px}
    .knockout-match .match-name [data-bracket-player],.match-fixture .match-name>[data-bracket-player]{font-size:14px}
    .match-name>[data-bracket-player]{display:block;height:auto;min-height:0;background:transparent;padding:0;line-height:1.35}
    .knockout-score{gap:8px}.knockout-score b{font-size:23px}.match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 84px minmax(0,1fr);gap:14px}
    .match-eliminated{top:-12px;right:-34px;width:30px;height:20px;font-size:8px}
    @media(max-width:680px){
      .match-date-calendar{grid-template-columns:minmax(0,1fr) 58px;gap:5px}.match-date-all{padding:4px;font-size:10px}
      .match-date-option{padding-inline:1px}.match-date-count{position:static;transform:none;min-width:14px;height:14px;padding:0;font-size:8px}
      .match-controls-row{flex-wrap:wrap;gap:6px}.match-status-filters{flex:1 1 100%;width:100%}.match-status-filters button{min-height:36px;font-size:11px}
      .match-player-filters{flex:0 1 180px;margin-left:auto}.match-player-filters summary{min-height:34px;padding:6px 10px;font-size:12px}
      .knockout-match,.knockout-match.has-winner,.earlier-matches .knockout-match,.match-fixture.inline-bracket-match{grid-template-columns:minmax(0,1fr);gap:6px;padding:8px 1px;min-height:0}
      .knockout-match-meta{flex-direction:row;align-items:center;justify-content:flex-start;font-size:9px;gap:8px}.match-clock{font-size:16px}
      .knockout-match-players,.match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 44px minmax(0,1fr);gap:5px}
      .knockout-match-players,.match-fixture .match-pair{padding-top:8px}
      .knockout-match .match-entrant,.knockout-match .match-entrant-away,.match-fixture .match-entrant,.match-fixture .match-entrant-away{gap:6px}
      .knockout-match .match-portrait,.match-fixture .match-portrait{width:38px;height:48px;flex-shrink:0}
      .knockout-match .match-name [data-bracket-player],.match-fixture .match-name>[data-bracket-player]{font-size:11px}
      .knockout-score{gap:3px}.knockout-score b{font-size:16px}
      .match-eliminated{top:-11px;right:-25px;width:23px;height:16px;font-size:7px}
    }
  `;
  document.head.append(filterStyle);
  render();
})();
