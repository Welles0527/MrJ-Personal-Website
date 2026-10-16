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
      const annotated = state.element.classList.contains('reader-annotation-demo');
      const readingCycle = state.elapsed % 12000;
      const progress = Math.round(42 + Math.min((annotated ? readingCycle / 11000 : cycle / 8000), 1) * 26);
      state.element.classList.toggle('is-resetting', annotated && readingCycle >= 11000);
      if (annotated) {
        const speechTime = readingCycle - 6500;
        const speaking = speechTime >= 0 && speechTime < 4000 && speechTime % 2000 < 1800;
        state.element.classList.toggle('is-speaking', speaking);
        state.element.style.setProperty('--spoken-left', String(1 - Math.max(0, Math.min(1, speechTime / 1800))));
        state.element.style.setProperty('--spoken-right', String(1 - Math.max(0, Math.min(1, (speechTime - 2000) / 1800))));
      }
      const phase = annotated
        ? readingCycle < 1000 ? 'reading' : readingCycle < 4200 ? 'highlight' : readingCycle < 6500 ? 'saved' : readingCycle < 11000 ? 'audio' : 'reset'
        : cycle < 1400 ? 'reading' : cycle < 3800 ? 'saved' : cycle < 7000 ? 'notes' : 'audio';
      state.element.dataset.readingPhase = phase;
      state.element.style.setProperty('--reading-progress', String(progress / 100));
      state.progress.textContent = `${progress}%`;
      const saved = state.element.querySelector('[data-reading-save]');
      if (saved) saved.textContent = ['reading', 'highlight', 'reset'].includes(phase) ? '收藏本章' : '已收藏';
      if (state.readingStatus) state.readingStatus.textContent = annotated
        ? { reading: '今日阅读 · 希伯来书 11:1', highlight: '选中原文 · 留下高亮', saved: '已收藏 · 随时重温这一句', audio: '正在语音播报 · 逐句跟读', reset: '演示完成 · 再读这一句' }[phase]
        : { reading: '继续阅读 · 第 11 章', saved: '收藏成功 · 随时重温', audio: '阅读进度已同步 · 语音跟读', notes: '记录感悟 · 笔记自动保存' }[phase];
    } else if (state.status) {
      if (state.element.classList.contains('invest-dual-demo')) {
        const time = state.elapsed % 6000;
        const stock = Math.floor(state.elapsed / 6000) % 2 === 1;
        const view = stock ? 'stock' : 'fund';
        const phase = time < 1800 ? 'screening' : time < 3400 ? 'evaluating' : 'matched';
        if (state.phase === `${view}-${phase}`) return;
        state.phase = `${view}-${phase}`;
        state.element.dataset.investingView = view;
        state.element.dataset.investingPhase = phase;
        state.element.querySelectorAll('[data-investing-tab]').forEach(tab => tab.classList.toggle('is-current', tab.dataset.investingTab === view));
        state.element.querySelectorAll('[data-investing-label]').forEach((label, i) => { label.textContent = (stock ? ['跟踪对象', '信息来源'] : ['筛选范围', '研究方式'])[i]; });
        state.element.querySelectorAll('[data-investing-value]').forEach((label, i) => { label.textContent = (stock ? ['自选个股', '财报与公告'] : ['全市场基金', '多维因子'])[i]; });
        state.status.textContent = (stock ? { screening: '梳理财报', evaluating: '解读公告', matched: '归档完成' } : { screening: '智能筛选', evaluating: '综合评估', matched: '匹配完成' })[phase];
        const ready = ['screening', 'evaluating', 'matched'].indexOf(phase);
        state.element.querySelectorAll('[data-investing-record]').forEach((item, index) => {
          item.classList.toggle('is-ready', index <= ready);
          item.querySelector('em').textContent = index <= ready ? '已整理 ✓' : '待整理';
        });
        return;
      }
      const phase = cycle < 3200 ? 'screening' : cycle < 6500 ? 'evaluating' : 'matched';
      state.element.dataset.investingPhase = phase;
      state.status.textContent = { screening: '智能筛选中', evaluating: '综合评估中', matched: '匹配已完成' }[phase];
    } else if (state.calendarDate) {
      if (state.element.classList.contains('calendar-switch-demo')) {
        const step = Math.floor((state.elapsed % 16000) / 4000);
        const time = reducedMotion.matches ? 1500 : state.elapsed % 4000;
        const stage = time < 600 ? 'move' : time < 900 ? 'click' : time < 1200 ? 'dates' : 'agenda';
        const scenes = [
          { key: 'life', label: '生活日历', color: '#f1a5da', event: '晨间运动', detail: '07:30 · 开启活力一天', next: '晚间阅读', nextDetail: '20:00 · 留一刻给自己' },
          { key: 'travel', label: '出行日历', color: '#83d9ff', event: '出发去三亚', detail: '09:30 · 航班出行', next: '海边漫步', nextDetail: '17:00 · 看一场日落' },
          { key: 'sports', label: '赛事日历', color: '#f5cd81', event: '斯诺克赛事', detail: '14:00 · 关注精彩对决', next: '足球之夜', nextDetail: '20:00 · 为热爱留时间' },
          { key: 'ai', label: 'AI 日历', color: '#71d6b4', event: '模型发布', detail: '10:00 · 关注最新进展', next: 'AI 学习计划', nextDetail: '19:30 · 试用一个新工具' },
        ];
        const scene = scenes[step];
        if (state.phase === `${scene.key}-${stage}`) return;
        state.phase = `${scene.key}-${stage}`;
        state.element.dataset.calendarPhase = scene.key;
        state.element.dataset.calendarStage = stage;
        state.element.style.setProperty('--calendar-tab-index', step);
        if (stage === 'move') return;
        state.element.style.setProperty('--calendar-accent', scene.color);
        state.element.querySelectorAll('[data-calendar-tab]').forEach(tab => tab.classList.toggle('is-current', tab.dataset.calendarTab === scene.key));
        if (stage === 'click') return;
        const day = ((Number(state.element.dataset.calendarToday) - 1 + step * 3) % state.days.length) + 1;
        state.days.forEach(cell => {
          const value = Number(cell.dataset.calendarDay);
          cell.classList.toggle('is-selected', value === day);
          cell.classList.toggle('has-event', [day, (day + 2) % state.days.length + 1, (day + 6) % state.days.length + 1].includes(value));
        });
        if (stage === 'dates') return;
        state.calendarDate.textContent = day;
        state.calendarEvent.textContent = scene.event;
        state.calendarDetail.textContent = scene.detail;
        state.calendarStatus.textContent = scene.label;
        state.element.querySelector('[data-calendar-secondary]').textContent = scene.next;
        state.element.querySelector('[data-calendar-secondary-detail]').textContent = scene.nextDetail;
        state.element.querySelector('.cover-demo-heading>small').textContent = '日程切换演示';
        const agenda = state.element.querySelector('.calendar-agenda');
        agenda.classList.remove('is-changing');
        void agenda.offsetWidth;
        agenda.classList.add('is-changing');
        return;
      }
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
      if (state.element.classList.contains('coffee-learning')) {
        if (state.element.classList.contains('coffee-learning-lab')) {
          const lesson = Math.floor((state.elapsed % 12000) / 4000);
          const phase = ['beans', 'drinks', 'brew'][lesson];
          const settled = reducedMotion.matches || state.elapsed % 4000 > 800;
          const key = `${phase}-${settled}`;
          if (state.phase === key) return;
          state.phase = key;
          state.element.dataset.toolsPhase = phase;
          state.element.dataset.coffeeSettled = String(settled);
          state.element.querySelectorAll('[data-coffee-panel]').forEach(panel => { panel.hidden = panel.dataset.coffeePanel !== phase; });
          state.element.querySelector('[data-coffee-heading]').textContent = ['认识烘焙与风味', '拆解一杯拿铁', '试一试粉水比'][lesson];
          state.element.querySelectorAll('[data-coffee-roast]').forEach(roast => roast.classList.toggle('is-current', roast.dataset.coffeeRoast === (settled ? 'medium' : 'light')));
          state.element.querySelectorAll('[data-coffee-flavor]').forEach((flavor, i) => { flavor.textContent = (settled ? ['坚果香', '均衡醇厚'] : ['花果香', '明亮酸质'])[i]; });
          state.element.querySelector('[data-coffee-ratio]').textContent = settled ? '1 : 15' : '1 : 14';
          state.element.querySelector('[data-coffee-water]').textContent = settled ? '225' : '210';
          state.toolsStatus.textContent = ['发现你的风味偏好', '浓缩 + 牛奶 + 奶泡', settled ? '15 × 15 = 225 g' : '调整比例，看看变化'][lesson];
          state.toolsDetail.textContent = ['烘焙程度不同，风味各有特点', '从组成认识一款咖啡', '把咖啡知识变成一次练习'][lesson];
          return;
        }
        const phase = ['beans', 'drinks', 'brew'][step];
        if (state.phase === phase) return;
        state.phase = phase;
        state.element.dataset.toolsPhase = phase;
        state.element.querySelectorAll('[data-coffee-topic]').forEach(topic => topic.classList.toggle('is-current', topic.dataset.coffeeTopic === phase));
        state.toolsStatus.textContent = ['从一颗咖啡豆开始', '找到喜欢的那一杯', '试着安排一杯咖啡'][step];
        state.toolsDetail.textContent = ['探索品种与烘焙程度', '认识浓缩、奶咖与冷萃', '用粉水比计算器练习'][step];
        return;
      }
      const phase = ['order', 'reminder', 'done'][step];
      if (state.phase === phase) return;
      state.phase = phase;
      state.element.dataset.toolsPhase = phase;
      state.toolsStatus.textContent = ['选好你的咖啡', '预约取餐提醒', '咖啡已准备好'][step];
      state.toolsDetail.textContent = ['偏好已记录', '制作进度同步中', '待办清单已完成'][step];
    } else if (state.resumeStatus) {
      if (state.element.classList.contains('resume-capability-demo')) {
        const time = state.elapsed % 12000;
        const still = reducedMotion.matches;
        const reveal = still ? 1 : Math.min(1, time / 1800);
        state.element.style.setProperty('--radar-reveal', String(.08 + .92 * reveal));
        state.element.classList.toggle('is-capability-reset', !still && time >= 11200);
        const activeAxis = Math.floor(Math.max(0, time - 1800) / 1600) % 5;
        state.element.querySelectorAll('[data-resume-axis], [data-resume-axis-label]').forEach(item => {
          item.classList.toggle('is-current', !still && Number(item.dataset.resumeAxis ?? item.dataset.resumeAxisLabel) === activeAxis);
        });
        state.element.querySelectorAll('[data-resume-ai-bar]').forEach((bar, index) => {
          const progress = still ? 1 : Math.max(0, Math.min(1, (time - 1200 - index * 350) / 900));
          bar.style.setProperty('--skill-reveal', String(progress));
        });
        const switchTime = state.elapsed % 6000;
        const targetLanguage = Math.floor(state.elapsed / 6000) % 2 ? 'en' : 'zh';
        const changing = !still && state.elapsed >= 6000 && switchTime < 1350;
        state.element.dataset.resumeTarget = targetLanguage;
        state.element.classList.toggle('is-language-switching', changing);
        state.element.classList.toggle('is-clicking', changing && switchTime >= 500 && switchTime < 800);
        state.element.classList.toggle('is-language-fading', changing && switchTime >= 600 && switchTime < 950);
        const language = Math.floor(Math.max(0, state.elapsed - 800) / 6000) % 2 ? 'en' : 'zh';
        if (state.phase === language) return;
        state.phase = language;
        state.language = language;
        state.element.dataset.resumeLanguage = language;
        const english = language === 'en';
        state.element.querySelector('.resume-paper').lang = english ? 'en' : 'zh-CN';
        state.element.querySelector('[data-resume-paper-kicker]').textContent = english ? 'RÉSUMÉ' : '个人简历';
        state.element.querySelector('[data-resume-name]').textContent = english ? 'Welles Gu' : 'J先生';
        state.element.querySelector('[data-resume-subtitle]').textContent = english ? 'Finance · Investment · AI' : '财务分析 · 投资研究 · AI实践';
        state.element.querySelector('[data-resume-label]').textContent = english ? 'EXPERIENCE' : '职业经历';
        state.resumeStatus.textContent = english ? 'Bilingual résumé' : '中英双语 · 自由切换';
        state.element.querySelectorAll('[data-resume-language]').forEach(label => label.classList.toggle('is-current', label.dataset.resumeLanguage === language));
        state.element.querySelectorAll('[data-resume-entry-title]').forEach((label, index) => {
          label.textContent = (english ? ['AI Magic Academy', 'Mr. J Financial Literacy Academy', 'Fortune Global 500 Company'] : ['AI魔法学院', 'J先生财商学院', '世界500强'])[index];
        });
        state.element.querySelectorAll('[data-resume-entry-detail]').forEach((label, index) => {
          label.textContent = (english ? ['Founder', 'Founder', 'Investment Analyst'] : ['创始人', '创始人', '投资分析师'])[index];
        });
        return;
      }
      const phase = cycle < 3200 ? 'profile' : cycle < 6500 ? 'experience' : 'skills';
      const language = Math.floor(state.elapsed / 10000) % 2 ? 'en' : 'zh';
      if (state.phase === phase && state.language === language) return;
      state.phase = phase;
      state.element.dataset.resumePhase = phase;
      state.resumeStatus.textContent = language === 'en' ? 'Experience, connected' : '选择能力，展开经历';
      if (state.language !== language) {
        state.language = language;
        const english = language === 'en';
        state.element.querySelector('[data-resume-name]').textContent = english ? 'Welles Gu' : 'J先生';
        state.element.querySelector('[data-resume-subtitle]').textContent = english ? 'Finance · Investment · AI' : '财务分析 · 投资研究 · AI实践';
        state.element.querySelector('[data-resume-label]').textContent = english ? 'EXPERIENCE & WORK' : '经历与作品';
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
    if (reducedMotion.matches) states.filter(state => state.element.classList.contains('resume-capability-demo')).forEach(render);
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
  states.forEach(state => { render(state); observer.observe(state.element); });
  document.addEventListener('visibilitychange', syncPlayback);
  reducedMotion.addEventListener('change', syncPlayback);
})();
