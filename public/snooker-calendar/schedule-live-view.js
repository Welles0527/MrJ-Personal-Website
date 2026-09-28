/* Schedule-page presentation enhancements: live-first list, bracket markers, and seed badges. */
(() => {
  const baseFiltered = filtered;
  const baseCard = card;
  const baseInlineBracket = inlineBracket;
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

  const decorateBracket = html => {
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
    template.content.querySelectorAll('.inline-bracket-match').forEach(match => {
      const row = match.querySelector(':scope > div');
      if (!row) return;
      const players = [...match.querySelectorAll('[data-bracket-player]')].length ?
        [...match.querySelectorAll('[data-bracket-player]')] : [...row.querySelectorAll(':scope > span')];
      if (players.length !== 2) return;
      const winner = match.dataset.matchStatus && match.dataset.matchStatus !== 'ended' ? null :
        bracketWinnerIndex(match.dataset.score || row.querySelector(':scope > b')?.textContent);
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
    return template.innerHTML;
  };

  inlineBracket = event => decorateBracket(baseInlineBracket(event));

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
      <div><strong>正在进行的赛事</strong><span>${liveCount} 场对阵图已默认展开${state.scheduleShowUpcoming ? ` · 已显示 ${upcomingCount} 场未开始赛事` : ''}</span></div>
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
    @media(max-width:1100px) and (min-width:681px){.match-fixture.inline-bracket-match{grid-template-columns:100px minmax(0,1fr) 106px;gap:8px;padding-inline:10px}.match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 62px minmax(0,1fr);gap:5px}.match-fixture .match-entrant{grid-template-columns:minmax(0,1fr) 62px;gap:5px}.match-fixture .match-entrant-away{grid-template-columns:62px minmax(0,1fr)}.match-fixture .match-portrait{width:62px;height:72px}.match-name>[data-bracket-player]{font-size:13px}.match-when strong{font-size:20px}.match-score b{font-size:20px!important}}
    @media(max-width:680px){.schedule-control{align-items:flex-start;flex-direction:column;gap:9px}.schedule-control button{width:100%}.bracket-key{order:3;width:100%;margin-left:0}.inline-bracket-heading button{margin-left:auto}}
    @media(max-width:680px){.inline-bracket{padding:12px 0}.inline-bracket-match:not(.match-fixture){grid-template-columns:minmax(0,1fr);gap:8px;padding:12px 10px}.inline-bracket-match:not(.match-fixture)>div{font-size:15px;gap:6px}.inline-bracket-match:not(.match-fixture) b{min-width:44px;font-size:16px;padding:3px}.inline-bracket-match .bracket-player{overflow-wrap:anywhere}.schedule-control button{text-align:left}.match-fixture.inline-bracket-match{grid-template-columns:minmax(0,1fr);gap:10px;padding:14px 8px;min-height:0}.match-fixture .match-when{display:flex;flex-direction:row;align-items:baseline;gap:7px}.match-when strong{font-size:18px}.match-when>span,.match-when>small{font-size:10px!important}.match-when .match-live-indicator{margin:0 0 0 auto;font-size:10px}.match-fixture .match-pair{grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr);gap:5px}.match-fixture .match-entrant,.match-fixture .match-entrant-away{display:flex;flex-direction:column;align-items:center;gap:5px}.match-fixture .match-portrait{order:0;width:58px;height:62px}.match-fixture .match-name,.match-fixture .match-entrant-away .match-name{order:1;align-items:center;text-align:center}.match-name>[data-bracket-player]{font-size:12px}.match-name>small{font-size:9px!important}.match-name .match-flag{height:14px}.match-flag .rank-flag,.match-flag svg{width:22px;height:14px;margin:auto}.match-score>div{min-height:40px}.match-score b{font-size:17px!important}.match-score>small{font-size:8px!important;white-space:normal;text-align:center}.match-fixture .match-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.match-actions a{min-height:32px;font-size:11px}}
  `;
  document.head.append(style);
  render();
})();
