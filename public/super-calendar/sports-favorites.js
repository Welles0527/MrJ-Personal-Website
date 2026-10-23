(() => {
  'use strict';
  const key = 'super-calendar-sports-favorites';
  const cueIndexKey = 'super-calendar-cue-index';
  const isCue = location.pathname.includes('/snooker-calendar/');
  const read = (name, fallback) => { try { return JSON.parse(localStorage.getItem(name)) || fallback; } catch { return fallback; } };
  const write = (name, value) => { try { localStorage.setItem(name, JSON.stringify(value)); return true; } catch { return false; } };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  // Export tournament metadata alongside the existing favorite IDs, without changing them.
  if (isCue) {
    const sync = () => write(cueIndexKey, Object.fromEntries(events.map(e => [e.id, { name:e.name, start:e.start, end:e.end }])));
    const previousRender = render;
    render = function (...args) { const result = previousRender.apply(this, args); sync(); return result; };
    sync();
    return;
  }
  const style = document.createElement('style');
  style.textContent = `.sports-favorites{margin:32px 0 20px;padding:24px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--text)}.sports-favorites h2{font-size:22px;margin:0 0 8px}.sports-favorites-note,.sports-favorite-meta{color:var(--muted);font-size:12px;line-height:1.7}.sports-favorites-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:18px}.sports-favorite-card{border:1px solid var(--line);border-radius:12px;padding:16px;min-width:0}.sports-favorite-card h3{font-size:15px;line-height:1.6;margin:6px 0;overflow-wrap:anywhere}.sports-favorite-countdown{color:var(--purple);font-size:15px;margin:12px 0;font-variant-numeric:tabular-nums}.sports-favorite-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.sports-save,.sports-favorite-actions button,.sports-favorite-actions a{font:inherit;font-size:12px;border:1px solid var(--line);border-radius:8px;padding:8px 12px;background:var(--card);color:var(--text);cursor:pointer;text-decoration:none}.sports-save[aria-pressed=true]{color:var(--purple);border-color:var(--purple)}@media(max-width:680px){.sports-favorites{padding:16px}.sports-favorites-list{grid-template-columns:1fr}}`;
  document.head.append(style);
  function records() {
    const saved = read(key, {});
    const result = Object.entries(saved).map(([id, snapshot]) => {
      const latest = id.startsWith('football:') ? footballMatches.find(m => m.id === id) : entries.find(e => e.id === id);
      return { ...snapshot, ...(latest || {}), id, sourceKey:key };
    });
    const cueIndex = read(cueIndexKey, {});
    const cueIds = read('cue-favorites', []);
    if (Array.isArray(cueIds)) cueIds.forEach(id => result.push({ ...(cueIndex[id] || {name:'已收藏的斯诺克赛事（打开日历加载详情）'}), id, category:'斯诺克', sourceKey:'cue-favorites' }));
    Object.entries(read('cue-match-favorites', {})).forEach(([id, match]) => {
      if (match && match.eventId) result.push({ id, name:`${match.home} vs ${match.away}`, note:match.eventName, category:'斯诺克', start:match.date, time:match.clock, sourceKey:'cue-match-favorites' });
    });
    return result.sort((a,b) => String(a.start || '9999').localeCompare(String(b.start || '9999')));
  }
  function countdown(item) {
    if (item.score || item.status === 'ended') return '已结束';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.start || '')) return '赛程待确认';
    const now = Date.now();
    const date = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
    if (!/^\d{2}:\d{2}$/.test(item.time || '')) {
      if (item.category === '足球') return item.start < date ? '赛果待更新' : '开赛时间待定';
      if ((item.end || item.start) < date) return '已结束';
      if (item.start <= date) return item.end && item.end > date ? '赛事进行中 · 单场时间待定' : '今日比赛 · 时间待定';
      const days = Math.round((Date.parse(item.start+'T00:00:00+08:00')-Date.parse(date+'T00:00:00+08:00'))/86400000);
      return `距比赛日期 ${days} 天 · 时间待定`;
    }
    const remaining = Date.parse(`${item.start}T${item.time}:00+08:00`) - now;
    if (!Number.isFinite(remaining)) return '开赛时间待定';
    if (remaining <= 0) return '已到开赛时间 · 赛况待更新';
    const seconds = Math.floor(remaining/1000);
    return `距开赛 ${Math.floor(seconds/86400)}天 ${Math.floor(seconds/3600)%24}小时 ${Math.floor(seconds/60)%60}分 ${seconds%60}秒`;
  }
  function mount() {
    document.getElementById('sports-favorites')?.remove();
    if (state.page !== 'sports') return;
    const list = records();
    const section = document.createElement('section');
    section.id = 'sports-favorites'; section.className = 'sports-favorites';
    section.setAttribute('aria-label','收藏赛事');
    section.innerHTML = `<h2>收藏赛事 <small>${list.length}</small></h2><p class="sports-favorites-note">关注的比赛集中在这里 · 北京时间 · 收藏保存在当前浏览器</p><div class="sports-favorites-list">${list.map((e,index) => `<article class="sports-favorite-card"><div class="sports-favorite-meta">${escape(e.category || '赛事')}${e.note?' · '+escape(e.note):''}</div><h3>${escape(e.name)}</h3><div class="sports-favorite-meta">${escape(e.start || '日期待定')}${e.time?' '+escape(e.time):''}${e.end && e.end!==e.start?' — '+escape(e.end):''}</div><div class="sports-favorite-countdown" data-countdown="${index}">${escape(countdown(e))}</div><div class="sports-favorite-actions">${e.sourceKey.startsWith('cue-')?'<a href="../snooker-calendar/index.html?theme=neon&view=year">查看斯诺克日历 ↗</a>':`<button type="button" data-saved-open="${index}">查看比赛</button>`}<button type="button" data-saved-remove="${index}">取消收藏</button></div></article>`).join('')}</div>${list.length?'':'<p class="sports-favorites-note">还没有收藏赛事。打开足球比赛详情点击“收藏比赛”，或在斯诺克日历中收藏赛事和单场比赛。</p>'}`;
    const main = document.querySelector('main');
    main?.insertBefore(section, main.querySelector('.bottom-note'));
    section.querySelectorAll('[data-saved-open]').forEach(button => button.onclick=()=>showDetail(list[button.dataset.savedOpen].id));
    section.querySelectorAll('[data-saved-remove]').forEach(button => button.onclick=()=>{
      const item=list[button.dataset.savedRemove], saved=read(item.sourceKey,item.sourceKey==='cue-favorites'?[]:{});
      if (Array.isArray(saved)) { if (!write(item.sourceKey,saved.filter(id=>id!==item.id))) return alert('无法保存收藏，请检查浏览器存储设置。'); }
      else { delete saved[item.id]; if (!write(item.sourceKey,saved)) return alert('无法保存收藏，请检查浏览器存储设置。'); }
      mount();
    });
  }
  function addSave(id) {
    const item = id.startsWith('football:') ? footballMatches.find(m=>m.id===id) : entries.find(e=>e.id===id && e.calendar==='sports');
    const dialog = document.getElementById('detail');
    if (!item || !dialog?.open) return;
    dialog.querySelector('.sports-save')?.remove();
    const button=document.createElement('button');button.type='button';button.className='sports-save';
    const update=()=>{const active=Boolean(read(key,{})[id]);button.textContent=active?'★ 已收藏 · 点击取消':'☆ 收藏比赛';button.setAttribute('aria-pressed',String(active));};
    update();
    button.onclick=()=>{const saved=read(key,{});if(saved[id])delete saved[id];else saved[id]={...item};if(!write(key,saved))return alert('无法保存收藏，请检查浏览器存储设置。');update();mount();};
    (dialog.querySelector('.form-actions') || dialog).prepend(button);
  }
  const previousDetail=showDetail;
  showDetail=function(id){const result=previousDetail(id);addSave(id);return result;};
  const previousFootballDetail=footballDetail;
  footballDetail=function(id){const result=previousFootballDetail(id);addSave(id);return result;};
  const previousRender=render;
  render=function(...args){const result=previousRender.apply(this,args);mount();return result;};
  window.addEventListener('storage', event=>{if([key,cueIndexKey,'cue-favorites','cue-match-favorites'].includes(event.key))mount();});
  window.addEventListener('focus',mount);
  setInterval(()=>{const list=records();document.querySelectorAll('[data-countdown]').forEach(el=>{const item=list[el.dataset.countdown];if(item)el.textContent=countdown(item);});},1000);
  mount();
})();
