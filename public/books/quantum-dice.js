(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'ai-reader-quantum-dice-v2';
  const flow = $('page-flow');
  const viewport = $('page-window');
  const clamp = (v, low, high) => Math.max(low, Math.min(high, v));
  let book, pages, totals, total, column = 0, columns = 1, nodes = [], currentText = '';
  let selected = null, timer, resizeTimer, previousFocus, pendingSearch = '';
  let state = { version: 2, bookId: 'quantum-dice', page: 3, offset: 0, completed: false,
    fontSize: innerWidth < 600 ? 19 : 21, leading: '1.95', measure: '760', theme: 'paper',
    mode: 'text', bookmarks: [], notes: [] };

  function notify(message) {
    $('status').textContent = message;
    clearTimeout(timer);
    timer = setTimeout(() => { $('status').textContent = ''; }, 3500);
  }
  function readJSON(name, fallback) {
    try { return JSON.parse(localStorage.getItem(name)) ?? fallback; } catch { return fallback; }
  }
  function validate(value) {
    if (!value || value.version !== 2 || value.bookId !== 'quantum-dice' || !Array.isArray(value.bookmarks) || !Array.isArray(value.notes)) throw Error('不是本书的阅读记录');
    const clean = { ...state, ...value };
    clean.page = clamp(Number.isInteger(value.page) ? value.page : 3, 0, pages.length - 1);
    clean.offset = clamp(Number.isInteger(value.offset) ? value.offset : 0, 0, pages[clean.page].text.length);
    clean.fontSize = clamp(Number(value.fontSize) || 21, 15, 32);
    clean.leading = ['1.65', '1.95', '2.3'].includes(value.leading) ? value.leading : '1.95';
    clean.measure = ['620', '760', '920'].includes(value.measure) ? value.measure : '760';
    clean.theme = ['paper', 'white', 'night'].includes(value.theme) ? value.theme : 'paper';
    clean.mode = value.mode === 'original' ? 'original' : 'text';
    clean.completed = value.completed === true && clean.page === pages.length - 1;
    const validPosition = item => item && Number.isInteger(item.page) && item.page >= 0 && item.page < pages.length && Number.isInteger(item.offset) && item.offset >= 0 && item.offset <= pages[item.page].text.length && typeof item.id === 'string';
    clean.bookmarks = value.bookmarks.filter(validPosition).slice(0, 2000).map(item => ({ id: item.id.slice(0, 100), page: item.page, offset: item.offset, label: String(item.label || '').slice(0, 160) }));
    clean.notes = value.notes.filter(item => validPosition(item) && typeof item.quote === 'string' && item.quote.length > 0 && item.quote.length <= 4000 && pages[item.page].text.slice(item.offset, item.offset + item.quote.length) === item.quote)
      .slice(0, 3000).map(item => ({ id: item.id.slice(0, 100), page: item.page, offset: item.offset, quote: item.quote, text: String(item.text || '').slice(0, 6000) }));
    return clean;
  }
  function percent() {
    if (state.completed) return 100;
    const at = totals[state.page] + Math.min(state.offset, pages[state.page].text.length);
    return clamp(at / total * 100, 0, 99.9);
  }
  function persist() {
    try {
      localStorage.setItem(key, JSON.stringify(state));
      const progress = readJSON('ai-shelf-progress', {});
      const map = progress && typeof progress === 'object' && !Array.isArray(progress) ? progress : {};
      map['quantum-dice'] = state.completed ? 100 : Math.min(99, Math.floor(percent()));
      localStorage.setItem('ai-shelf-progress', JSON.stringify(map));
      window.dispatchEvent(new Event('ai-reader-progress'));
    } catch { notify('浏览器未能保存记录，请导出阅读记录留存'); }
  }
  function chapter(page = state.page) {
    const entries = book.toc.filter(item => item.level === 0 && (item.page < page || (item.page === page && (page !== state.page || Math.max(0, pages[page].text.indexOf(item.title)) <= state.offset))));
    return entries.at(-1)?.title || book.title;
  }
  function prepare(raw) {
    const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
    const blocks = [];
    let text = '';
    const flush = () => { if (text) blocks.push({ text, heading: false }); text = ''; };
    const titles = new Set(book.toc.map(item => item.title.replace(/\s/g, '')));
    for (const line of lines) {
      const heading = titles.has(line.replace(/\s/g, '')) || /^第[一二三四五六七八九十百\d]+章\s/.test(line) || /^\d{1,2}-\d{1,2}$/.test(line);
      if (heading) { flush(); blocks.push({ text: line, heading: true }); }
      else {
        const gap = /[a-zA-Z0-9]$/.test(text) && /^[a-zA-Z0-9]/.test(line) ? ' ' : '';
        text += (text ? gap : '') + line;
        if (/[。！？…][”’）)]?$/.test(line) || text.length > 650) flush();
      }
    }
    flush();
    return { blocks, text: blocks.map(block => block.text).join('') };
  }
  function applySettings() {
    document.body.dataset.theme = state.theme;
    document.documentElement.style.setProperty('--size', `${state.fontSize}px`);
    document.documentElement.style.setProperty('--leading', state.leading);
    document.documentElement.style.setProperty('--measure', `${state.measure}px`);
    $('font-size').textContent = `${state.fontSize} px`;
    $('leading').value = state.leading;
    $('measure').value = state.measure;
    document.querySelectorAll('#themes button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.theme === state.theme)));
    $('text-mode').setAttribute('aria-pressed', String(state.mode === 'text'));
    $('original-mode').setAttribute('aria-pressed', String(state.mode === 'original'));
  }
  function locate(offset) {
    let item = nodes.find(entry => offset < entry.end) || nodes.at(-1);
    if (!item) return null;
    const range = document.createRange();
    const local = clamp(offset - item.start, 0, Math.max(0, item.node.length - 1));
    range.setStart(item.node, local);
    range.setEnd(item.node, Math.min(item.node.length, local + 1));
    return range;
  }
  function columnFor(offset) {
    const range = locate(offset);
    if (!range) return 0;
    return clamp(Math.floor((range.getBoundingClientRect().left - flow.getBoundingClientRect().left + 1) / (viewport.clientWidth + 64)), 0, columns - 1);
  }
  function columnOffset(index) {
    if (!index) return 0;
    let low = 0, high = currentText.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (columnFor(middle) < index) low = middle + 1; else high = middle;
    }
    return low;
  }
  function updateFooter() {
    const progress = percent();
    $('chapter-title').textContent = chapter().replace(/^上帝掷骰子吗.*$/, '序言与目录');
    $('position').textContent = `原书 ${state.page + 1} / ${pages.length} 页` + (state.mode === 'text' ? ` · ${column + 1}/${columns} 屏` : '');
    $('percentage').textContent = `${progress.toFixed(progress >= 100 ? 0 : 1)}%`;
    $('progress').value = String(Math.round(progress * 10));
    $('page-number').value = String(state.page + 1);
    $('prev').disabled = state.page === 0 && column === 0;
    $('next').disabled = state.page === pages.length - 1 && column === columns - 1;
    const saved = state.bookmarks.some(item => item.page === state.page && Math.abs(item.offset - state.offset) < 20);
    $('bookmark').setAttribute('aria-pressed', String(saved));
    $('bookmark').textContent = saved ? '✓ 已加书签' : '＋ 书签';
  }
  function render() {
    applySettings();
    $('selection-tools').hidden = true;
    selected = null;
    currentText = pages[state.page].text;
    flow.hidden = state.mode !== 'text';
    $('original').hidden = state.mode !== 'original';
    flow.style.transform = '';
    if (state.mode === 'original') {
      columns = 1; column = 0;
      $('original-image').src = `./quantum-dice-pages/${String(state.page + 1).padStart(3, '0')}.webp`;
      $('original-image').alt = `原书第 ${state.page + 1} 页，保留插图和公式`;
      $('original').classList.remove('zoomed');
      $('original').scrollTop = 0;
    } else {
      flow.style.setProperty('--column-width', `${viewport.clientWidth}px`);
      const highlights = state.notes.filter(note => note.page === state.page);
      flow.replaceChildren();
      let start = 0;
      for (const block of pages[state.page].blocks) {
        const element = document.createElement(block.heading ? 'h2' : 'p');
        const end = start + block.text.length;
        const cuts = new Set([start, end]);
        const intervals = highlights.map(note => [note.offset, note.offset + note.quote.length]);
        if (pendingSearch) {
          let pos = currentText.toLocaleLowerCase().indexOf(pendingSearch.toLocaleLowerCase(), start);
          while (pos >= start && pos < end) {
            intervals.push([pos, pos + pendingSearch.length]);
            pos = currentText.toLocaleLowerCase().indexOf(pendingSearch.toLocaleLowerCase(), pos + pendingSearch.length);
          }
        }
        for (const [a, b] of intervals) if (a < end && b > start) { cuts.add(Math.max(a, start)); cuts.add(Math.min(b, end)); }
        const points = [...cuts].sort((a, b) => a - b);
        for (let i = 0; i < points.length - 1; i++) {
          const a = points[i], b = points[i + 1];
          const text = document.createTextNode(currentText.slice(a, b));
          if (intervals.some(([left, right]) => a >= left && b <= right)) {
            const mark = document.createElement('mark'); mark.append(text); element.append(mark);
          } else element.append(text);
        }
        flow.append(element);
        start = end;
      }
      nodes = [];
      const walker = document.createTreeWalker(flow, NodeFilter.SHOW_TEXT);
      let node, at = 0;
      while ((node = walker.nextNode())) { nodes.push({ node, start: at, end: at + node.length }); at += node.length; }
      columns = Math.max(1, Math.round((flow.scrollWidth + 64) / (viewport.clientWidth + 64)));
      column = columnFor(state.offset);
      flow.style.transform = `translateX(${-column * (viewport.clientWidth + 64)}px)`;
    }
    updateFooter();
  }
  function go(page, offset = 0, last = false) {
    state.page = clamp(page, 0, pages.length - 1);
    state.offset = clamp(offset, 0, pages[state.page].text.length);
    state.completed = false;
    render();
    if (last && state.mode === 'text') {
      column = columns - 1;
      state.offset = columnOffset(column);
      flow.style.transform = `translateX(${-column * (viewport.clientWidth + 64)}px)`;
      updateFooter();
    }
    persist();
  }
  function turn(delta) {
    if (!book || !$('panel').hidden || $('note-dialog').open) return;
    if (state.mode === 'text' && column + delta >= 0 && column + delta < columns) {
      column += delta;
      state.offset = columnOffset(column);
      state.completed = false;
      flow.style.transform = `translateX(${-column * (viewport.clientWidth + 64)}px)`;
      updateFooter(); persist();
    } else if (state.page + delta >= 0 && state.page + delta < pages.length) go(state.page + delta, 0, delta < 0);
  }
  function closePanel() {
    $('panel').hidden = true; $('shade').hidden = true;
    previousFocus?.focus();
  }
  function openPanel(id) {
    previousFocus = document.activeElement;
    $('panel-title').textContent = ({ contents: '目录', search: '搜索', settings: '阅读设置', saved: '书签与笔记' })[id];
    ['contents', 'search', 'settings', 'saved'].forEach(name => { $(name).hidden = name !== id; });
    $('panel').hidden = false; $('shade').hidden = false;
    if (id === 'saved') renderSaved();
    (id === 'search' ? $('query') : $('close-panel')).focus();
  }
  function addBookmark() {
    const existing = state.bookmarks.find(item => item.page === state.page && Math.abs(item.offset - state.offset) < 20);
    if (existing) state.bookmarks = state.bookmarks.filter(item => item !== existing);
    else state.bookmarks.push({ id: crypto.randomUUID(), page: state.page, offset: state.offset, label: currentText.slice(state.offset, state.offset + 50) });
    persist(); updateFooter(); renderSaved();
    notify(existing ? '书签已移除' : '已收藏当前位置');
  }
  function renderSaved() {
    for (const kind of ['bookmarks', 'notes']) {
      $(kind).replaceChildren();
      if (!state[kind].length) { const p = document.createElement('p'); p.textContent = kind === 'notes' ? '选中正文后，可以高亮摘录或写笔记。' : '还没有书签。'; $(kind).append(p); }
      for (const item of state[kind]) {
        const wrapper = document.createElement('div'); wrapper.className = 'saved-item';
        const jump = document.createElement('button'); jump.className = 'result'; jump.textContent = `第 ${item.page + 1} 页 · ${chapter(item.page)}`;
        jump.onclick = () => { closePanel(); go(item.page, item.offset); };
        const quote = document.createElement('blockquote'); quote.textContent = item.quote || item.label;
        wrapper.append(jump, quote);
        if (item.text) { const note = document.createElement('p'); note.textContent = item.text; wrapper.append(note); }
        const remove = document.createElement('button'); remove.textContent = '删除'; remove.setAttribute('aria-label', `删除${kind === 'notes' ? '摘录' : '书签'}：${(item.quote || item.label).slice(0, 20)}`);
        remove.onclick = () => { state[kind] = state[kind].filter(entry => entry.id !== item.id); persist(); renderSaved(); render(); };
        wrapper.append(remove); $(kind).append(wrapper);
      }
    }
  }
  function selection() {
    if (state.mode !== 'text' || !$('panel').hidden) return;
    const s = getSelection();
    if (!s.rangeCount || s.isCollapsed || !flow.contains(s.anchorNode) || !flow.contains(s.focusNode)) return;
    const range = s.getRangeAt(0);
    const before = document.createRange(); before.selectNodeContents(flow); before.setEnd(range.startContainer, range.startOffset);
    const offset = before.toString().length;
    const quote = range.toString();
    if (!quote.trim() || quote.length > 4000 || currentText.slice(offset, offset + quote.length) !== quote) return;
    selected = { page: state.page, offset, quote };
    $('selection-tools').hidden = false;
  }
  function saveNote(text = '') {
    if (!selected) return;
    state.notes.push({ id: crypto.randomUUID(), ...selected, text });
    persist(); render(); notify('摘录已保存');
    getSelection()?.removeAllRanges();
  }
  function settings(change) { Object.assign(state, change); render(); persist(); }

  async function init() {
    try {
      const response = await fetch('./quantum-dice-content.json');
      if (!response.ok) throw Error('电子书文件加载失败');
      book = await response.json();
      pages = book.pages.map(page => prepare(page.text));
      total = 0; totals = pages.map((page, index) => { const start = total; if (index >= book.startPage) total += page.text.length; return start; });
      const saved = readJSON(key, null);
      if (saved) { try { state = validate(saved); } catch { notify('旧记录格式不同，已保留旧数据并从序言开始'); } }
      for (const item of book.toc) {
        const button = document.createElement('button'); button.className = 'toc-button' + (item.level > 0 ? ' sub' : '');
        const label = document.createElement('span'); label.textContent = item.title;
        const page = document.createElement('small'); page.textContent = String(item.page + 1);
        button.append(label, page);
        button.onclick = () => {
          const offset = pages[item.page].text.indexOf(item.title);
          closePanel(); go(item.page, Math.max(0, offset));
        };
        $('toc').append(button);
      }
      render(); persist();
      if (new URLSearchParams(location.search).get('panel') === 'contents') openPanel('contents');
    } catch (error) {
      $('stage').replaceChildren(); const div = document.createElement('div'); div.className = 'error';
      div.textContent = `${error.message}。请刷新页面重试，已有阅读记录保留。`; $('stage').append(div);
    }
  }

  document.querySelectorAll('[data-panel]').forEach(button => button.onclick = () => { if (book) openPanel(button.dataset.panel); });
  $('close-panel').onclick = closePanel; $('shade').onclick = closePanel;
  $('prev').onclick = () => turn(-1); $('next').onclick = () => turn(1);
  $('bookmark').onclick = () => { if (book) addBookmark(); }; $('add-bookmark').onclick = addBookmark;
  $('smaller').onclick = () => settings({ fontSize: Math.max(15, state.fontSize - 2) });
  $('larger').onclick = () => settings({ fontSize: Math.min(32, state.fontSize + 2) });
  $('leading').onchange = event => settings({ leading: event.target.value });
  $('measure').onchange = event => settings({ measure: event.target.value });
  document.querySelectorAll('#themes button').forEach(button => button.onclick = () => settings({ theme: button.dataset.theme }));
  $('text-mode').onclick = () => settings({ mode: 'text' });
  $('original-mode').onclick = () => settings({ mode: 'original' });
  $('original-image').onclick = () => $('original').classList.toggle('zoomed');
  $('original-image').onerror = () => notify('原版页面未能载入，可切换文字排版继续阅读');
  $('percentage').onclick = () => { if (book) { openPanel('settings'); $('page-number').focus(); } };
  $('jump-form').onsubmit = event => { event.preventDefault(); const page = Number($('page-number').value); if (Number.isInteger(page) && page >= 1 && page <= pages.length) { closePanel(); go(page - 1); } };
  $('progress').onchange = event => {
    if (!book) return;
    const at = Number(event.target.value) / 1000 * total;
    let page = book.startPage;
    while (page < pages.length - 1 && totals[page + 1] <= at) page++;
    go(page, Math.floor(at - totals[page]));
  };
  $('focus').onclick = () => { const active = document.body.classList.toggle('focus'); $('focus').setAttribute('aria-pressed', String(active)); $('focus').textContent = active ? '退出专注' : '专注'; };
  $('restart').onclick = () => { closePanel(); go(book.startPage); notify('已回到序言，书签和笔记保留'); };
  $('complete').onclick = () => { closePanel(); go(pages.length - 1, pages.at(-1).text.length); state.completed = true; updateFooter(); persist(); notify('已标记读完'); };
  $('search-form').onsubmit = event => {
    event.preventDefault(); const query = $('query').value.trim(); if (!query) return;
    pendingSearch = query; $('results').replaceChildren(); let count = 0;
    pages.forEach((page, index) => {
      let from = 0, found;
      while ((found = page.text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase(), from)) >= 0) {
        count++;
        if (count <= 100) {
          const offset = found; const button = document.createElement('button'); button.className = 'result';
          button.textContent = `第 ${index + 1} 页 · ${page.text.slice(Math.max(0, found - 20), found + query.length + 45)}`;
          button.onclick = () => { closePanel(); state.mode = 'text'; go(index, offset); };
          $('results').append(button);
        }
        from = found + query.length;
      }
    });
    $('search-summary').textContent = count ? `找到 ${count} 处${count > 100 ? '，显示前 100 处' : ''}` : '未找到匹配的文字';
  };
  flow.addEventListener('pointerup', () => setTimeout(selection, 50));
  flow.addEventListener('keyup', selection);
  document.addEventListener('selectionchange', () => { if (getSelection()?.isCollapsed && !$('note-dialog').open) $('selection-tools').hidden = true; });
  $('highlight').onclick = () => saveNote();
  $('write-note').onclick = () => {
    if (!selected) return;
    $('note-quote').textContent = selected.quote; $('note-text').value = '';
    $('selection-tools').hidden = true; $('note-dialog').showModal(); $('note-text').focus();
  };
  $('note-form').onsubmit = event => { event.preventDefault(); const text = $('note-text').value.trim(); $('note-dialog').close(); saveNote(text); };
  $('cancel-note').onclick = () => $('note-dialog').close();
  $('cancel-selection').onclick = () => { selected = null; getSelection()?.removeAllRanges(); $('selection-tools').hidden = true; };
  $('export').onclick = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = '上帝掷骰子吗-阅读记录.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('import').onclick = () => $('records-file').click();
  $('records-file').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('阅读记录不能超过 5 MB');
      const imported = validate(JSON.parse(await file.text()));
      const merge = (a, b) => [...new Map([...a, ...b].map(item => [item.id, item])).values()];
      imported.notes = merge(state.notes, imported.notes); imported.bookmarks = merge(state.bookmarks, imported.bookmarks);
      state = imported; render(); persist(); notify('阅读记录已合并，已恢复阅读位置');
    } catch (error) { notify(`未导入：${error.message}`); }
    event.target.value = '';
  };
  document.addEventListener('keydown', event => {
    if ($('note-dialog').open) return;
    if (!$('panel').hidden) {
      if (event.key === 'Escape') closePanel();
      if (event.key === 'Tab') {
        const items = [...$('panel').querySelectorAll('button,input,select,textarea,a')].filter(item => !item.disabled && item.getClientRects().length);
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      return;
    }
    if (event.target.matches('input,textarea,select,button,a') || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); turn(1); }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); turn(-1); }
    if (event.key === 'Escape') { document.body.classList.remove('focus'); $('focus').setAttribute('aria-pressed', 'false'); $('focus').textContent = '专注'; }
  });
  let touch;
  viewport.addEventListener('touchstart', event => { const point = event.touches[0]; touch = { x: point.clientX, y: point.clientY }; }, { passive: true });
  viewport.addEventListener('touchend', event => {
    if (!touch || state.mode !== 'text' || !getSelection()?.isCollapsed) return;
    const point = event.changedTouches[0]; const dx = point.clientX - touch.x, dy = point.clientY - touch.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) turn(dx < 0 ? 1 : -1);
    touch = null;
  }, { passive: true });
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (book) render(); }, 100); });
  window.addEventListener('pagehide', () => { if (book) persist(); });
  init();
})();
