type TodoCategory = 'work' | 'study' | 'life' | 'health' | 'other';
type TodoFilter = 'all' | TodoCategory;

type Todo = {
  id: string;
  title: string;
  date: string;
  category: TodoCategory;
  important: boolean;
  completed: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type TodoState = {
  todos: Todo[];
  filter: TodoFilter;
  selectedDate: Date;
  viewYear: number;
  viewMonth: number;
  weekIndex: number;
  editingId: string | null;
  pendingDeleteId: string | null;
  storageMessage: string | null;
};

const STORAGE_KEY = 'mywebsite.weekly-todos.v1';
const categories: Array<{ value: TodoCategory; label: string }> = [
  { value: 'work', label: '工作' },
  { value: 'study', label: '学习' },
  { value: 'life', label: '生活' },
  { value: 'health', label: '健康' },
  { value: 'other', label: '其他' }
];

const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const atNoon = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
const createDate = (year: number, month: number, day: number) => new Date(year, month, day, 12);
const addDays = (date: Date, amount: number) => createDate(date.getFullYear(), date.getMonth(), date.getDate() + amount);

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;
  const date = createDate(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return toDateKey(date) === value ? date : null;
};

const sameDate = (first: Date, second: Date) => toDateKey(first) === toDateKey(second);

/** Monday is the fixed start of every week, including weeks that cross month or year boundaries. */
const startOfWeek = (date: Date) => addDays(atNoon(date), -((date.getDay() + 6) % 7));
const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);

const monthWeeks = (year: number, month: number) => {
  const firstVisibleDay = startOfWeek(createDate(year, month, 1));
  const lastVisibleDay = endOfWeek(createDate(year, month + 1, 0));
  const weeks: Date[][] = [];
  for (let cursor = firstVisibleDay; cursor <= lastVisibleDay; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => addDays(cursor, index)));
  }
  return weeks;
};

const weekIndexForDate = (date: Date, year: number, month: number) => {
  const dateKey = toDateKey(date);
  return Math.max(0, monthWeeks(year, month).findIndex((week) => week.some((item) => toDateKey(item) === dateKey)));
};

const createId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `todo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isCategory = (value: unknown): value is TodoCategory => categories.some((category) => category.value === value);

const isTodo = (value: unknown): value is Todo => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string'
    && typeof item.title === 'string'
    && Boolean(parseDateKey(String(item.date)))
    && isCategory(item.category)
    && typeof item.important === 'boolean'
    && typeof item.completed === 'boolean'
    && typeof item.note === 'string'
    && typeof item.createdAt === 'string'
    && typeof item.updatedAt === 'string';
};

const createExamples = (anchor: Date): Todo[] => {
  const monday = startOfWeek(anchor);
  const now = new Date().toISOString();
  const examples: Array<Pick<Todo, 'title' | 'category' | 'important' | 'completed' | 'note'> & { offset: number }> = [
    { offset: 0, title: '整理本周工作重点', category: 'work', important: true, completed: false, note: '明确三件最重要的事。' },
    { offset: 1, title: '完成课程笔记', category: 'study', important: false, completed: true, note: '' },
    { offset: 2, title: '更新预算记录', category: 'other', important: false, completed: false, note: '' },
    { offset: 3, title: '安排一次深度学习', category: 'study', important: true, completed: false, note: '预留 90 分钟无干扰时间。' },
    { offset: 4, title: '整理下周工作计划', category: 'work', important: false, completed: false, note: '' },
    { offset: 5, title: '户外散步 30 分钟', category: 'health', important: false, completed: false, note: '' },
    { offset: 6, title: '和家人共进晚餐', category: 'life', important: false, completed: false, note: '' }
  ];
  return examples.map((example) => ({
    id: createId(),
    title: example.title,
    date: toDateKey(addDays(monday, example.offset)),
    category: example.category,
    important: example.important,
    completed: example.completed,
    note: example.note,
    createdAt: now,
    updatedAt: now
  }));
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const categoryLabel = (category: TodoCategory) => categories.find((item) => item.value === category)?.label ?? '其他';
const monthDay = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}`;
const longDate = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日`;
const dateDescription = (date: Date) => `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

export function mountTodoWorkspace(root: HTMLElement) {
  const migrationParams = new URLSearchParams(window.location.search);
  const migrationTarget = migrationParams.get('todo-migration-target');

  // The hidden localhost iframe only reads its own origin's data and returns it with postMessage.
  // It exits before normal initialisation so a missing old store is never replaced with examples.
  if (migrationParams.get('todo-migration-source') === '1' && window.parent !== window && migrationTarget) {
    try {
      const target = new URL(migrationTarget);
      if (target.protocol === window.location.protocol && target.hostname === '127.0.0.1' && target.port === window.location.port) {
        let raw: string | null = null;
        let error = false;
        try {
          raw = window.localStorage.getItem(STORAGE_KEY);
        } catch {
          error = true;
        }
        window.parent.postMessage({ type: 'todo-localhost-migration', raw, error }, target.origin);
      }
    } catch {
      // Invalid migration parameters are intentionally ignored.
    }
    return;
  }

  const getElement = <T extends Element>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`待办页面缺少必要节点：${selector}`);
    return element;
  };

  const filterContainer = getElement<HTMLElement>('[data-category-filters]');
  const monthCalendar = getElement<HTMLElement>('[data-month-calendar]');
  const weekOverview = getElement<HTMLElement>('[data-week-overview]');
  const mobileDays = getElement<HTMLElement>('[data-mobile-days]');
  const board = getElement<HTMLElement>('[data-weekly-board]');
  const stats = getElement<HTMLElement>('[data-weekly-stats]');
  const weekRange = getElement<HTMLElement>('[data-week-range]');
  const yearSelect = getElement<HTMLSelectElement>('[data-control="year"]');
  const monthSelect = getElement<HTMLSelectElement>('[data-control="month"]');
  const weekSelect = getElement<HTMLSelectElement>('[data-control="week"]');
  const todayLabel = getElement<HTMLElement>('[data-today-label]');
  const sidebar = getElement<HTMLElement>('[data-todo-sidebar]');
  const backdrop = getElement<HTMLElement>('[data-sidebar-backdrop]');
  const todoModal = getElement<HTMLDialogElement>('[data-todo-modal]');
  const deleteModal = getElement<HTMLDialogElement>('[data-delete-modal]');
  const migrationModal = getElement<HTMLDialogElement>('[data-migration-modal]');
  const todoForm = getElement<HTMLFormElement>('[data-todo-form]');
  const formTitle = getElement<HTMLElement>('[data-form-title]');
  const titleError = getElement<HTMLElement>('[data-title-error]');
  const deleteMessage = getElement<HTMLElement>('[data-delete-message]');
  const migrationStatus = getElement<HTMLElement>('[data-migration-status]');
  const migrationConfirm = getElement<HTMLButtonElement>('[data-action="confirm-migration"]');
  const toast = getElement<HTMLElement>('[data-toast]');
  const titleInput = todoForm.elements.namedItem('title') as HTMLInputElement;
  const dateInput = todoForm.elements.namedItem('date') as HTMLInputElement;
  const categoryInput = todoForm.elements.namedItem('category') as HTMLSelectElement;
  const importantInput = todoForm.elements.namedItem('important') as HTMLInputElement;
  const noteInput = todoForm.elements.namedItem('note') as HTMLTextAreaElement;
  const compactQuery = window.matchMedia('(max-width: 760px)');
  const currentDate = atNoon(new Date());
  let toastTimer: number | undefined;
  let pendingMigrationTodos: Todo[] | null = null;
  let migrationFrame: HTMLIFrameElement | null = null;
  let migrationTimer: number | undefined;
  const localhostOrigin = `${window.location.protocol}//localhost${window.location.port ? `:${window.location.port}` : ''}`;

  const persist = (todos: Todo[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
      return true;
    } catch {
      return false;
    }
  };

  const loadTodos = () => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === null) {
        const examples = createExamples(currentDate);
        return { todos: examples, storageMessage: persist(examples) ? null : '浏览器存储不可用，示例数据仅保留到本次会话。' };
      }
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.every(isTodo)) {
        const examples = createExamples(currentDate);
        return { todos: examples, storageMessage: persist(examples) ? '本地待办数据异常，已安全恢复为示例数据。' : '本地待办数据异常，已使用临时示例数据。' };
      }
      return { todos: parsed, storageMessage: null };
    } catch {
      const examples = createExamples(currentDate);
      return { todos: examples, storageMessage: '无法读取本地待办数据，已使用临时示例数据。' };
    }
  };

  const loaded = loadTodos();
  const state: TodoState = {
    todos: loaded.todos,
    filter: 'all',
    selectedDate: currentDate,
    viewYear: currentDate.getFullYear(),
    viewMonth: currentDate.getMonth(),
    weekIndex: weekIndexForDate(currentDate, currentDate.getFullYear(), currentDate.getMonth()),
    editingId: null,
    pendingDeleteId: null,
    storageMessage: loaded.storageMessage
  };

  const getWeeks = () => monthWeeks(state.viewYear, state.viewMonth);
  const getSelectedWeek = () => getWeeks()[Math.min(state.weekIndex, getWeeks().length - 1)];
  const filterTodos = (todos: Todo[]) => state.filter === 'all' ? todos : todos.filter((todo) => todo.category === state.filter);
  const todosForDate = (date: Date) => filterTodos(state.todos.filter((todo) => todo.date === toDateKey(date)));
  const notify = (message: string) => {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2600);
  };

  const closeSidebar = () => {
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    backdrop.hidden = true;
  };

  const openSidebar = () => {
    sidebar.classList.add('is-open');
    backdrop.hidden = false;
    backdrop.classList.add('is-open');
  };

  const selectDate = (date: Date) => {
    const normalized = atNoon(date);
    state.selectedDate = normalized;
    state.viewYear = normalized.getFullYear();
    state.viewMonth = normalized.getMonth();
    state.weekIndex = weekIndexForDate(normalized, state.viewYear, state.viewMonth);
  };

  const setMonth = (year: number, month: number) => {
    const firstDay = createDate(year, month, 1);
    state.viewYear = year;
    state.viewMonth = month;
    state.selectedDate = firstDay;
    state.weekIndex = weekIndexForDate(firstDay, year, month);
  };

  const renderFilters = () => {
    const all = [{ value: 'all' as TodoFilter, label: '全部' }, ...categories];
    filterContainer.innerHTML = all.map((category) => `<button class="todo-filter ${state.filter === category.value ? 'is-active' : ''}" type="button" data-action="set-filter" data-category="${category.value}">${category.label}</button>`).join('');
  };

  const renderSelectors = () => {
    const thisYear = currentDate.getFullYear();
    yearSelect.innerHTML = Array.from({ length: 11 }, (_, index) => thisYear - 5 + index)
      .map((year) => `<option value="${year}">${year}年</option>`).join('');
    monthSelect.innerHTML = Array.from({ length: 12 }, (_, index) => `<option value="${index}">${index + 1}月</option>`).join('');
    const weeks = getWeeks();
    weekSelect.innerHTML = weeks.map((week, index) => `<option value="${index}">第${index + 1}周 ${monthDay(week[0])}-${monthDay(week[6])}</option>`).join('');
    yearSelect.value = String(state.viewYear);
    monthSelect.value = String(state.viewMonth);
    weekSelect.value = String(state.weekIndex);
  };

  const renderMonthCalendar = () => {
    const selectedWeekKeys = new Set(getSelectedWeek().map(toDateKey));
    monthCalendar.innerHTML = getWeeks().flat().map((date) => {
      const dateKey = toDateKey(date);
      const classes = [
        'todo-month-day',
        date.getMonth() !== state.viewMonth ? 'is-outside' : '',
        selectedWeekKeys.has(dateKey) ? 'is-in-week' : '',
        sameDate(date, state.selectedDate) ? 'is-selected' : ''
      ].filter(Boolean).join(' ');
      return `<button class="${classes}" type="button" data-action="select-date" data-date="${dateKey}" aria-label="${dateDescription(date)}"><span>${date.getDate()}</span></button>`;
    }).join('');
  };

  const renderOverview = () => {
    const week = getSelectedWeek();
    weekRange.textContent = `${monthDay(week[0])} — ${monthDay(week[6])}`;
    weekOverview.innerHTML = week.map((date, index) => {
      const todos = todosForDate(date);
      const isWeekend = index > 4;
      return `<button class="todo-day-overview ${sameDate(date, state.selectedDate) ? 'is-selected' : ''} ${isWeekend ? 'is-weekend' : ''}" type="button" data-action="select-date" data-date="${toDateKey(date)}" aria-label="选择${weekdayNames[index]}${dateDescription(date)}">
        <span class="todo-day-name">${weekdayNames[index]}</span>
        <strong class="todo-day-date">${monthDay(date)}</strong>
        <span class="todo-day-count">${todos.length ? `${todos.length} 项待办` : '安排留白'}</span>
        <i class="todo-day-dot" aria-hidden="true"></i>
      </button>`;
    }).join('');
  };

  const renderMobileDays = () => {
    mobileDays.innerHTML = getSelectedWeek().map((date, index) => `<button class="todo-mobile-day ${sameDate(date, state.selectedDate) ? 'is-selected' : ''}" type="button" data-action="select-date" data-date="${toDateKey(date)}">${weekdayNames[index]} ${monthDay(date)}</button>`).join('');
  };

  const renderTodo = (todo: Todo) => {
    const tags = [
      `<span class="todo-tag ${todo.category}">${categoryLabel(todo.category)}</span>`,
      todo.important ? '<span class="todo-tag important">重要</span>' : '',
      todo.completed ? '<span class="todo-tag done">已完成</span>' : ''
    ].join('');
    return `<li class="todo-item ${todo.completed ? 'is-completed' : ''}">
      <input class="todo-checkbox" type="checkbox" ${todo.completed ? 'checked' : ''} data-action="toggle-complete" data-todo-id="${todo.id}" aria-label="${todo.completed ? '取消完成' : '完成'}：${escapeHtml(todo.title)}" />
      <div class="todo-item-main">
        <p class="todo-item-title">${escapeHtml(todo.title)}</p>
        ${todo.note ? `<p class="todo-item-note">${escapeHtml(todo.note)}</p>` : ''}
        <div class="todo-tags">${tags}</div>
      </div>
      <div class="todo-item-actions">
        <button type="button" data-action="edit-todo" data-todo-id="${todo.id}" aria-label="编辑：${escapeHtml(todo.title)}" title="编辑">编</button>
        <button class="todo-delete-button" type="button" data-action="ask-delete" data-todo-id="${todo.id}" aria-label="删除：${escapeHtml(todo.title)}" title="删除">删</button>
      </div>
    </li>`;
  };

  const renderBoard = () => {
    const selectedWeek = getSelectedWeek();
    const dates = compactQuery.matches ? selectedWeek.filter((date) => sameDate(date, state.selectedDate)) : selectedWeek;
    board.classList.toggle('is-compact', compactQuery.matches);
    board.innerHTML = dates.map((date) => {
      const originalIndex = selectedWeek.findIndex((item) => sameDate(item, date));
      const todos = todosForDate(date);
      const dateKey = toDateKey(date);
      return `<article class="todo-day-column ${sameDate(date, state.selectedDate) ? 'is-selected' : ''} ${originalIndex > 4 ? 'is-weekend' : ''}">
        <header class="todo-column-header">
          <div>
            <h2 class="todo-column-name">${weekdayNames[originalIndex]}</h2>
            <p class="todo-column-date">${longDate(date)}</p>
          </div>
          <button class="todo-add-icon" type="button" data-action="open-create" data-date="${dateKey}" aria-label="在${longDate(date)}新增待办">+</button>
        </header>
        ${todos.length ? `<ul class="todo-list">${todos.map(renderTodo).join('')}</ul>` : '<p class="todo-empty-day">还没有安排。<br />给今天留出空间。</p>'}
        <button class="todo-add-bottom" type="button" data-action="open-create" data-date="${dateKey}">＋ 添加待办</button>
      </article>`;
    }).join('');
  };

  const renderStats = () => {
    const keys = new Set(getSelectedWeek().map(toDateKey));
    const weeklyTodos = filterTodos(state.todos.filter((todo) => keys.has(todo.date)));
    const completed = weeklyTodos.filter((todo) => todo.completed).length;
    const pending = weeklyTodos.length - completed;
    const rate = weeklyTodos.length ? Math.round((completed / weeklyTodos.length) * 100) : 0;
    const filterText = state.filter === 'all' ? '' : `（${categoryLabel(state.filter)}）`;
    stats.innerHTML = `本周${filterText}共 <strong>${weeklyTodos.length}</strong> 项待办，已完成 <strong class="todo-stat-done">${completed}</strong> 项，未完成 <strong class="todo-stat-pending">${pending}</strong> 项，完成率 <strong>${rate}%</strong>。`;
  };

  const render = () => {
    todayLabel.textContent = `今天 · ${dateDescription(currentDate)}`;
    renderFilters();
    renderSelectors();
    renderMonthCalendar();
    renderOverview();
    renderMobileDays();
    renderBoard();
    renderStats();
  };

  const openForm = (date = state.selectedDate, todo?: Todo) => {
    state.editingId = todo?.id ?? null;
    formTitle.textContent = todo ? '编辑待办' : '新增待办';
    titleInput.value = todo?.title ?? '';
    dateInput.value = todo?.date ?? toDateKey(date);
    categoryInput.innerHTML = categories.map((category) => `<option value="${category.value}">${category.label}</option>`).join('');
    categoryInput.value = todo?.category ?? 'work';
    importantInput.checked = todo?.important ?? false;
    noteInput.value = todo?.note ?? '';
    titleError.textContent = '';
    if (!todoModal.open) todoModal.showModal();
    titleInput.focus();
  };

  const closeForm = () => {
    if (todoModal.open) todoModal.close();
  };

  const openDeleteDialog = (todo: Todo) => {
    state.pendingDeleteId = todo.id;
    deleteMessage.textContent = `“${todo.title}” 将从本地待办中删除，且无法恢复。`;
    if (!deleteModal.open) deleteModal.showModal();
  };

  const saveState = (successMessage: string) => {
    const saved = persist(state.todos);
    render();
    notify(saved ? successMessage : `${successMessage} 浏览器存储不可用，当前会话已更新。`);
  };

  const clearMigrationProbe = () => {
    window.clearTimeout(migrationTimer);
    migrationFrame?.remove();
    migrationFrame = null;
  };

  const closeMigrationDialog = () => {
    clearMigrationProbe();
    if (migrationModal.open) migrationModal.close();
  };

  const showMigrationResult = (message: string, todos: Todo[] | null = null) => {
    pendingMigrationTodos = todos;
    migrationStatus.textContent = message;
    migrationConfirm.disabled = !todos?.length;
  };

  const startMigration = () => {
    pendingMigrationTodos = null;
    migrationConfirm.disabled = true;
    migrationStatus.textContent = '正在检查 localhost 中保存的待办数据…';
    if (!migrationModal.open) migrationModal.showModal();

    clearMigrationProbe();
    const sourceUrl = new URL(window.location.href);
    sourceUrl.hostname = 'localhost';
    sourceUrl.search = '';
    sourceUrl.searchParams.set('todo-migration-source', '1');
    sourceUrl.searchParams.set('todo-migration-target', window.location.origin);

    migrationFrame = document.createElement('iframe');
    migrationFrame.className = 'todo-migration-frame';
    migrationFrame.src = sourceUrl.toString();
    migrationFrame.title = '旧待办数据迁移源';
    migrationFrame.setAttribute('aria-hidden', 'true');
    document.body.append(migrationFrame);
    migrationTimer = window.setTimeout(() => {
      showMigrationResult('无法连接到 localhost 中的旧数据。请确认仍使用同一浏览器配置文件，并重新打开页面后再试。');
      clearMigrationProbe();
    }, 5000);
  };

  const importMigration = () => {
    if (!pendingMigrationTodos?.length) return;
    const merged = new Map(state.todos.map((todo) => [todo.id, todo]));
    let added = 0;
    let updated = 0;
    let kept = 0;
    pendingMigrationTodos.forEach((incoming) => {
      const current = merged.get(incoming.id);
      if (!current) {
        merged.set(incoming.id, incoming);
        added += 1;
      } else if (Date.parse(incoming.updatedAt) > Date.parse(current.updatedAt)) {
        merged.set(incoming.id, incoming);
        updated += 1;
      } else {
        kept += 1;
      }
    });
    state.todos = [...merged.values()].sort((first, second) => first.date.localeCompare(second.date) || first.createdAt.localeCompare(second.createdAt));
    closeMigrationDialog();
    saveState(`旧数据已合并：新增 ${added} 项，更新 ${updated} 项，保留当前 ${kept} 项。`);
  };

  const exportBackup = () => {
    const backup = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      sourceOrigin: window.location.origin,
      todos: state.todos
    };
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mywebsite-todos-${toDateKey(currentDate)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    notify('待办备份已下载。');
  };

  window.addEventListener('message', (event) => {
    if (event.origin !== localhostOrigin || !event.data || event.data.type !== 'todo-localhost-migration') return;
    clearMigrationProbe();
    if (event.data.error) {
      showMigrationResult('读取 localhost 旧数据失败。请确认没有使用隐私窗口或被浏览器禁止站点存储。');
      return;
    }
    if (event.data.raw === null) {
      showMigrationResult('localhost 中没有找到待办数据。请确认昨天使用的是同一浏览器配置文件。');
      return;
    }
    try {
      const parsed: unknown = JSON.parse(event.data.raw);
      if (!Array.isArray(parsed) || !parsed.every(isTodo)) {
        showMigrationResult('localhost 中的待办数据格式无法识别，未导入任何内容。');
        return;
      }
      if (!parsed.length) {
        showMigrationResult('localhost 中的待办列表为空，没有需要导入的内容。');
        return;
      }
      showMigrationResult(`找到 ${parsed.length} 项旧待办。导入会与当前数据合并；同一 ID 时保留更新时间较新的版本。`, parsed);
    } catch {
      showMigrationResult('localhost 中的待办数据无法解析，未导入任何内容。');
    }
  });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest<HTMLElement>('[data-action]');
    if (!trigger) return;
    const action = trigger.dataset.action;

    if (action === 'open-sidebar') openSidebar();
    if (action === 'close-sidebar') closeSidebar();
    if (action === 'set-filter' && (isCategory(trigger.dataset.category) || trigger.dataset.category === 'all')) {
      state.filter = trigger.dataset.category as TodoFilter;
      render();
    }
    if (action === 'select-date') {
      const date = parseDateKey(trigger.dataset.date ?? '');
      if (date) {
        selectDate(date);
        render();
      }
    }
    if (action === 'open-create') {
      const date = parseDateKey(trigger.dataset.date ?? '') ?? state.selectedDate;
      openForm(date);
    }
    if (action === 'start-migration') startMigration();
    if (action === 'cancel-migration') closeMigrationDialog();
    if (action === 'confirm-migration') importMigration();
    if (action === 'export-backup') exportBackup();
    if (action === 'close-form') closeForm();
    if (action === 'toggle-complete') {
      const todo = state.todos.find((item) => item.id === trigger.dataset.todoId);
      if (todo) {
        todo.completed = !todo.completed;
        todo.updatedAt = new Date().toISOString();
        saveState(todo.completed ? '待办已完成。' : '已恢复为未完成。');
      }
    }
    if (action === 'edit-todo') {
      const todo = state.todos.find((item) => item.id === trigger.dataset.todoId);
      if (todo) openForm(parseDateKey(todo.date) ?? state.selectedDate, todo);
    }
    if (action === 'ask-delete') {
      const todo = state.todos.find((item) => item.id === trigger.dataset.todoId);
      if (todo) openDeleteDialog(todo);
    }
    if (action === 'cancel-delete') {
      state.pendingDeleteId = null;
      if (deleteModal.open) deleteModal.close();
    }
    if (action === 'confirm-delete' && state.pendingDeleteId) {
      state.todos = state.todos.filter((todo) => todo.id !== state.pendingDeleteId);
      state.pendingDeleteId = null;
      if (deleteModal.open) deleteModal.close();
      saveState('待办已删除。');
    }
  });

  backdrop.addEventListener('click', closeSidebar);
  yearSelect.addEventListener('change', () => setMonth(Number(yearSelect.value), state.viewMonth));
  yearSelect.addEventListener('change', render);
  monthSelect.addEventListener('change', () => setMonth(state.viewYear, Number(monthSelect.value)));
  monthSelect.addEventListener('change', render);
  weekSelect.addEventListener('change', () => {
    const weeks = getWeeks();
    const nextWeek = weeks[Number(weekSelect.value)];
    if (!nextWeek) return;
    state.weekIndex = Number(weekSelect.value);
    if (!nextWeek.some((date) => sameDate(date, state.selectedDate))) state.selectedDate = nextWeek[0];
    render();
  });

  titleInput.addEventListener('input', () => { titleError.textContent = ''; });
  todoModal.addEventListener('close', () => { state.editingId = null; });
  deleteModal.addEventListener('close', () => { state.pendingDeleteId = null; });
  migrationModal.addEventListener('close', () => {
    pendingMigrationTodos = null;
    migrationConfirm.disabled = true;
    clearMigrationProbe();
  });

  todoForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const date = parseDateKey(dateInput.value);
    if (!title) {
      titleError.textContent = '请填写待办标题。';
      titleInput.focus();
      return;
    }
    if (!date || !isCategory(categoryInput.value)) {
      titleError.textContent = '请填写有效的日期与分类。';
      return;
    }

    const now = new Date().toISOString();
    const existing = state.editingId ? state.todos.find((todo) => todo.id === state.editingId) : undefined;
    const nextTodo: Todo = {
      id: existing?.id ?? createId(),
      title,
      date: toDateKey(date),
      category: categoryInput.value,
      important: importantInput.checked,
      completed: existing?.completed ?? false,
      note: noteInput.value.trim(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    state.todos = existing ? state.todos.map((todo) => todo.id === existing.id ? nextTodo : todo) : [...state.todos, nextTodo];
    selectDate(date);
    closeForm();
    saveState(existing ? '待办已更新。' : '待办已添加。');
  });

  compactQuery.addEventListener('change', render);
  render();
  if (state.storageMessage) notify(state.storageMessage);
}
