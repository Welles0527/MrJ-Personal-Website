(() => {
  const previews = [...document.querySelectorAll('[data-preview-motion]')];
  if (!previews.length) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const states = previews.map(element => ({
    element,
    visible: false,
    elapsed: 0,
    progress: element.querySelector('[data-reading-progress]'),
    readingStatus: element.querySelector('[data-reading-status]'),
    status: element.querySelector('[data-investing-status]'),
    days: [...element.querySelectorAll('[data-calendar-day]')],
    calendarDate: element.querySelector('[data-calendar-date]'),
    calendarEvent: element.querySelector('[data-calendar-event]'),
    calendarDetail: element.querySelector('[data-calendar-detail]'),
    calendarStatus: element.querySelector('[data-calendar-status]'),
    toolsStatus: element.querySelector('[data-tools-status]'),
    toolsDetail: element.querySelector('[data-tools-detail]'),
    resumeStatus: element.querySelector('[data-resume-status]'),
    phase: '',
    language: 'zh',
  }));
  let frame = 0;
  let lastTime = 0;
  let lastUpdate = 0;

  function render(state) {
    const cycle = state.elapsed % 10000;
    if (state.progress) {
      const progress = Math.round(42 + Math.min(cycle / 8000, 1) * 26);
      const phase = cycle < 2800 ? 'reading' : cycle < 6800 ? 'audio' : 'notes';
      state.element.dataset.readingPhase = phase;
      state.element.style.setProperty('--reading-progress', String(progress / 100));
      state.progress.textContent = `${progress}%`;
      if (state.readingStatus) state.readingStatus.textContent = { reading: '阅读进度 · 智能阅读分析', audio: '语音播报 · 跟随阅读', notes: '个性化笔记 · 已记录' }[phase];
    } else if (state.status) {
      const phase = cycle < 3200 ? 'screening' : cycle < 6500 ? 'evaluating' : 'matched';
      state.element.dataset.investingPhase = phase;
      state.status.textContent = { screening: '智能筛选中', evaluating: '综合评估中', matched: '匹配已完成' }[phase];
    } else if (state.calendarDate) {
      const step = cycle < 3200 ? 0 : cycle < 6500 ? 1 : 2;
      const phase = ['browse', 'plan', 'remind'][step];
      if (state.phase === phase) return;
      state.phase = phase;
      state.element.dataset.calendarPhase = phase;
      const day = ((Number(state.element.dataset.calendarToday) - 1 + [0, 3, 7][step]) % state.days.length) + 1;
      state.days.forEach(cell => cell.classList.toggle('is-selected', Number(cell.dataset.calendarDay) === day));
      state.calendarDate.textContent = day;
      state.calendarEvent.textContent = ['赛事关注', '投资研究', '阅读计划'][step];
      state.calendarDetail.textContent = ['把热爱排进日程', '为思考留出时间', '每天留一刻给自己'][step];
      state.calendarStatus.textContent = ['查看日程', '已加入关注', '提醒已就绪'][step];
    } else if (state.toolsStatus) {
      const step = cycle < 3200 ? 0 : cycle < 6500 ? 1 : 2;
      const phase = ['order', 'reminder', 'done'][step];
      if (state.phase === phase) return;
      state.phase = phase;
      state.element.dataset.toolsPhase = phase;
      state.toolsStatus.textContent = ['选好你的咖啡', '预约取餐提醒', '咖啡已准备好'][step];
      state.toolsDetail.textContent = ['偏好已记录', '制作进度同步中', '待办清单已完成'][step];
    } else if (state.resumeStatus) {
      const phase = cycle < 3200 ? 'profile' : cycle < 6500 ? 'experience' : 'skills';
      const language = Math.floor(state.elapsed / 10000) % 2 ? 'en' : 'zh';
      if (state.phase === phase && state.language === language) return;
      state.phase = phase;
      state.element.dataset.resumePhase = phase;
      state.resumeStatus.textContent = language === 'en' ? 'Experience into possibilities' : '正在展开个人经历';
      if (state.language !== language) {
        state.language = language;
        const english = language === 'en';
        state.element.querySelector('[data-resume-name]').textContent = english ? 'Welles Gu' : 'J先生';
        state.element.querySelector('[data-resume-subtitle]').textContent = english ? 'Finance · Investment · AI' : '财务分析 · 投资研究 · AI实践';
        state.element.querySelector('[data-resume-label]').textContent = english ? 'EXPERIENCE & SKILLS' : '经历与能力';
        state.element.querySelector('[data-resume-heading]').textContent = english ? 'A story of experience' : '从经历，看见能力';
        state.element.querySelectorAll('[data-resume-language]').forEach(label => label.classList.toggle('is-current', label.dataset.resumeLanguage === language));
        state.element.querySelectorAll('[data-resume-role]').forEach((label, index) => {
          label.textContent = (english ? ['Financial analysis', 'Investment research', 'AI practice'] : ['财务分析', '投资研究', 'AI 实践'])[index];
        });
        state.element.querySelectorAll('[data-resume-caption]').forEach((label, index) => {
          label.textContent = (english ? ['Read data. Understand business.', 'Think independently.', 'Turn ideas into projects.'] : ['洞察数据，理解商业', '独立思考，长期关注', '把想法做成作品'])[index];
        });
      }
    }
  }

  function tick(time) {
    const delta = lastTime ? Math.min(time - lastTime, 100) : 0;
    lastTime = time;
    states.forEach(state => { if (state.visible) state.elapsed += delta; });
    if (time - lastUpdate > 120) {
      states.forEach(state => { if (state.visible) render(state); });
      lastUpdate = time;
    }
    frame = requestAnimationFrame(tick);
  }

  function syncPlayback() {
    const enabled = !document.hidden && !reducedMotion.matches;
    states.forEach(state => state.element.classList.toggle('is-animating', enabled && state.visible));
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (enabled && states.some(state => state.visible)) frame = requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = states.find(item => item.element === entry.target);
      state.visible = entry.isIntersecting;
    });
    syncPlayback();
  }, { threshold: 0 });
  states.forEach(state => observer.observe(state.element));
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', syncPlayback);
})();
