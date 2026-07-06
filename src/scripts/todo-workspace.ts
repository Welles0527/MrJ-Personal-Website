import type { CloudSession, CloudTodo, CloudTodoCategory } from './todo-cloud';

let cloudApi: Promise<typeof import('./todo-cloud')> | null = null;
const getCloudApi = () => {
  cloudApi ??= import('./todo-cloud');
  return cloudApi;
};

type TodoCategory = CloudTodoCategory;
type TodoFilter = 'all' | TodoCategory;
type Todo = CloudTodo;
type TrashTodo = Todo & { deletedAt: string };

type TodoState = {
  todos: Todo[];
  trash: TrashTodo[];
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
const TRASH_KEY = 'mywebsite.weekly-todos-trash.v1';
const PENDING_UPSERT_KEY = 'mywebsite.weekly-todo-upserts.v1';
const PENDING_DELETE_KEY = 'mywebsite.weekly-todo-deletes.v1';
const LOCAL_MIGRATION_ORIGIN = 'http://localhost:4321';
const LOCAL_MIGRATION_PATH = '/officialwebsite/topics/space/planning/todo';
const OFFICIAL_WEBSITE_ORIGIN = 'https://www.magicj.cn';
const categories: Array<{ value: TodoCategory; label: string }> = [
  { value: 'work', label: '工作' },
  { value: 'study', label: '学习' },
  { value: 'life', label: '生活' },
  { value: 'health', label: '运动' },
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

const isTrashTodo = (value: unknown): value is TrashTodo =>
  isTodo(value) && typeof (value as Record<string, unknown>).deletedAt === 'string';

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
      if (target.origin === OFFICIAL_WEBSITE_ORIGIN) {
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
  const todayPanel = root.querySelector<HTMLElement>('[data-today-panel]');
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
  const trashModal = getElement<HTMLDialogElement>('[data-trash-modal]');
  const migrationModal = getElement<HTMLDialogElement>('[data-migration-modal]');
  const loginModal = getElement<HTMLDialogElement>('[data-login-modal]');
  const todoForm = getElement<HTMLFormElement>('[data-todo-form]');
  const loginForm = getElement<HTMLFormElement>('[data-login-form]');
  const formTitle = getElement<HTMLElement>('[data-form-title]');
  const titleError = getElement<HTMLElement>('[data-title-error]');
  const deleteMessage = getElement<HTMLElement>('[data-delete-message]');
  const trashList = getElement<HTMLElement>('[data-trash-list]');
  const migrationStatus = getElement<HTMLElement>('[data-migration-status]');
  const migrationConfirm = getElement<HTMLButtonElement>('[data-action="confirm-migration"]');
  const signUpButton = getElement<HTMLButtonElement>('[data-action="sign-up"]');
  const authStatus = getElement<HTMLElement>('[data-auth-status]');
  const signOutButton = getElement<HTMLButtonElement>('[data-sign-out]');
  const loginMessage = getElement<HTMLElement>('[data-login-message]');
  const verificationField = getElement<HTMLElement>('[data-verification-field]');
  const toast = getElement<HTMLElement>('[data-toast]');
  const titleInput = todoForm.elements.namedItem('title') as HTMLInputElement;
  const dateInput = todoForm.elements.namedItem('date') as HTMLInputElement;
  const categoryInput = todoForm.elements.namedItem('category') as HTMLSelectElement;
  const importantInput = todoForm.elements.namedItem('important') as HTMLInputElement;
  const noteInput = todoForm.elements.namedItem('note') as HTMLTextAreaElement;
  const loginEmailInput = loginForm.elements.namedItem('email') as HTMLInputElement;
  const loginPasswordInput = loginForm.elements.namedItem('password') as HTMLInputElement;
  const verificationCodeInput = loginForm.elements.namedItem('verificationCode') as HTMLInputElement;
  const compactQuery = window.matchMedia('(max-width: 760px)');
  const currentDate = atNoon(new Date());
  let toastTimer: number | undefined;
  let pendingMigrationTodos: Todo[] | null = null;
  let migrationFrame: HTMLIFrameElement | null = null;
  let migrationTimer: number | undefined;
  let cloudSession: CloudSession | null = null;
  let completeEmailSignUp: ((verificationCode: string) => Promise<CloudSession>) | null = null;
  const localMigrationOrigin = LOCAL_MIGRATION_ORIGIN;

  const persist = (todos: Todo[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
      return true;
    } catch {
      return false;
    }
  };

  const loadIdQueue = (key: string) => {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return new Set<string>();
      const parsed: unknown = JSON.parse(stored);
      return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
    } catch {
      return new Set<string>();
    }
  };

  const persistIdQueue = (key: string, ids: Set<string>) => {
    try {
      window.localStorage.setItem(key, JSON.stringify([...ids]));
    } catch {
      // The visible todo data is still saved separately; queue persistence is best-effort.
    }
  };

  const enqueueId = (key: string, id: string) => {
    const ids = loadIdQueue(key);
    ids.add(id);
    persistIdQueue(key, ids);
  };

  const removeQueuedId = (key: string, id: string) => {
    const ids = loadIdQueue(key);
    ids.delete(id);
    persistIdQueue(key, ids);
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

  const loadTrash = () => {
    try {
      const stored = window.localStorage.getItem(TRASH_KEY);
      if (!stored) return [];
      const parsed: unknown = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter(isTrashTodo) : [];
    } catch {
      return [];
    }
  };

  const persistTrash = (trash: TrashTodo[]) => {
    try {
      window.localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
      return true;
    } catch {
      return false;
    }
  };

  const timestamp = (value: string) => {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const localUpdatesForExistingCloudTodos = (localTodos: Todo[], cloudTodos: Todo[]) => {
    const cloudById = new Map(cloudTodos.map((todo) => [todo.id, todo]));
    return localTodos.filter((todo) => {
      const cloudTodo = cloudById.get(todo.id);
      return cloudTodo ? timestamp(todo.updatedAt) > timestamp(cloudTodo.updatedAt) : false;
    });
  };

  const mergeCloudTodosWithLocalUpdates = (localTodos: Todo[], cloudTodos: Todo[], forceLocalIds = new Set<string>()) => {
    const localById = new Map(localTodos.map((todo) => [todo.id, todo]));
    const cloudIds = new Set(cloudTodos.map((todo) => todo.id));
    const merged = cloudTodos.map((cloudTodo) => {
      const localTodo = localById.get(cloudTodo.id);
      return localTodo && (forceLocalIds.has(localTodo.id) || timestamp(localTodo.updatedAt) > timestamp(cloudTodo.updatedAt)) ? localTodo : cloudTodo;
    });
    localTodos.forEach((localTodo) => {
      if (forceLocalIds.has(localTodo.id) && !cloudIds.has(localTodo.id)) merged.push(localTodo);
    });
    return merged.sort((first, second) => first.date.localeCompare(second.date) || first.createdAt.localeCompare(second.createdAt));
  };

  const loaded = loadTodos();
  const state: TodoState = {
    todos: loaded.todos,
    trash: loadTrash(),
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
      return `<button class="todo-day-overview ${sameDate(date, state.selectedDate) ? 'is-selected' : ''} ${sameDate(date, currentDate) ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''}" type="button" data-action="select-date" data-date="${toDateKey(date)}" aria-label="选择${weekdayNames[index]}${dateDescription(date)}">
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
      return `<article class="todo-day-column ${sameDate(date, state.selectedDate) ? 'is-selected' : ''} ${sameDate(date, currentDate) ? 'is-today' : ''} ${originalIndex > 4 ? 'is-weekend' : ''}">
        <header class="todo-column-header">
          <div>
            <h2 class="todo-column-name">${weekdayNames[originalIndex]}</h2>
            <p class="todo-column-date">${longDate(date)}</p>
          </div>
        </header>
        ${todos.length ? `<ul class="todo-list">${todos.map(renderTodo).join('')}</ul>` : '<p class="todo-empty-day">还没有安排。<br />给今天留出空间。</p>'}
        <div class="todo-add-slots"><button class="todo-add-bottom" type="button" data-action="open-create" data-date="${dateKey}" aria-label="在${longDate(date)}新增待办">＋</button></div>
      </article>`;
    }).join('');
  };

  const renderTodayPanel = () => {
    if (!todayPanel) return;
    const selectedWeek = getSelectedWeek();
    const dayIndex = selectedWeek.findIndex((item) => sameDate(item, state.selectedDate));
    const weekday = weekdayNames[dayIndex >= 0 ? dayIndex : (state.selectedDate.getDay() + 6) % 7];
    const todos = todosForDate(state.selectedDate);
    const groups = [
      { title: '头号任务', fallback: '先处理今天最重要的一件事。' },
      { title: '轻松任务', fallback: '适合穿插完成的小任务。' },
      { title: '专注任务', fallback: '留一段安静时间推进。' }
    ];
    const canCompleteAll = todos.some((todo) => !todo.completed);

    todayPanel.innerHTML = `
      <header class="todo-today-header">
        <h2 class="todo-today-title">今天 · ${weekday} ${longDate(state.selectedDate)} <span class="todo-sun" aria-hidden="true">☀</span></h2>
        <button class="todo-complete-day" type="button" data-action="complete-selected-day" ${canCompleteAll ? '' : 'disabled'}>完成全部</button>
      </header>
      <div class="todo-focus-list">
        ${groups.map((group, index) => {
          const todo = todos[index];
          if (!todo) {
            return `<section class="todo-focus-group">
              <h3><span class="todo-priority-icon" aria-hidden="true">☆</span>${group.title}</h3>
              <p class="todo-focus-empty"><span aria-hidden="true">☕</span>没有安排，给今天留白吧。</p>
            </section>`;
          }
          return `<section class="todo-focus-group">
            <h3><span class="todo-priority-icon" aria-hidden="true">☆</span>${group.title}</h3>
            <div class="todo-focus-task ${todo.completed ? 'is-completed' : ''}">
              <input class="todo-checkbox" type="checkbox" ${todo.completed ? 'checked' : ''} data-action="toggle-complete" data-todo-id="${todo.id}" aria-label="${todo.completed ? '取消完成' : '完成'}：${escapeHtml(todo.title)}" />
              <div>
                <p class="todo-focus-title-row">
                  <span class="todo-focus-title">${escapeHtml(todo.title)}</span>
                  <span class="todo-tag ${todo.category}">${categoryLabel(todo.category)}</span>
                  ${todo.important ? '<span class="todo-tag important">重要</span>' : ''}
                  ${todo.completed ? '<span class="todo-tag done">已完成</span>' : ''}
                </p>
                <p class="todo-focus-note">${escapeHtml(todo.note || group.fallback)}</p>
              </div>
            </div>
          </section>`;
        }).join('')}
      </div>
      <p class="todo-today-note">添加备注 / 心情记录...</p>
    `;
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
    const todayWeekday = `星期${'一二三四五六日'[(currentDate.getDay() + 6) % 7]}`;
    todayLabel.textContent = `今天：${dateDescription(currentDate)} · ${todayWeekday}`;
    renderFilters();
    renderSelectors();
    renderMonthCalendar();
    renderOverview();
    renderMobileDays();
    renderBoard();
    renderTodayPanel();
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
    deleteMessage.textContent = `“${todo.title}” 将移入回收站，可稍后恢复。`;
    if (!deleteModal.open) deleteModal.showModal();
  };

  const trashTimeLabel = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '未知时间';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${dateDescription(date)} ${hours}:${minutes}`;
  };

  const moveTodoToTrash = (todo: Todo) => {
    const deletedAt = new Date().toISOString();
    const trashed: TrashTodo = { ...todo, deletedAt };
    state.trash = [trashed, ...state.trash.filter((item) => item.id !== todo.id)];
    return persistTrash(state.trash);
  };

  const renderTrashList = () => {
    if (!state.trash.length) {
      trashList.innerHTML = '<p class="todo-trash-empty">回收站为空。</p>';
      return;
    }
    trashList.innerHTML = state.trash.map((todo) => `<section class="todo-trash-item">
      <p class="todo-trash-title">${escapeHtml(todo.title)}</p>
      <p class="todo-trash-meta">${todo.date} · ${categoryLabel(todo.category)} · 删除于 ${trashTimeLabel(todo.deletedAt)}</p>
      <div class="todo-trash-actions">
        <button class="todo-secondary-button" type="button" data-action="restore-trash" data-todo-id="${todo.id}">恢复</button>
        <button class="todo-danger-button" type="button" data-action="delete-trash" data-todo-id="${todo.id}">彻底删除</button>
      </div>
    </section>`).join('');
  };

  const openTrash = () => {
    renderTrashList();
    if (!trashModal.open) trashModal.showModal();
  };

  const upsertTodoInState = (todo: Todo) => {
    state.todos = state.todos.some((item) => item.id === todo.id)
      ? state.todos.map((item) => item.id === todo.id ? todo : item)
      : [...state.todos, todo];
  };

  const saveState = (successMessage: string) => {
    const saved = persist(state.todos);
    render();
    notify(saved ? successMessage : `${successMessage} 浏览器存储不可用，当前会话已更新。`);
    return saved;
  };

  const showLogin = (message = '') => {
    loginMessage.textContent = message;
    authStatus.textContent = '未登录';
    signOutButton.hidden = true;
    if (!loginModal.open) loginModal.showModal();
  };

  const resetEmailSignUp = () => {
    completeEmailSignUp = null;
    verificationField.hidden = true;
    verificationCodeInput.value = '';
    signUpButton.textContent = '创建账号';
  };

  const activateSession = async (session: CloudSession, successMessage?: string) => {
    cloudSession = session;
    authStatus.textContent = `已登录：${session.account}`;
    signOutButton.hidden = false;
    const api = await getCloudApi();
    const localTodos = state.todos;
    const pendingUpsertIds = loadIdQueue(PENDING_UPSERT_KEY);
    const pendingDeleteIds = loadIdQueue(PENDING_DELETE_KEY);
    const cloudTodos = await api.loadCloudTodos(session.uid);
    const cloudTodoIds = new Set(cloudTodos.map((todo) => todo.id));
    const visibleCloudTodos = cloudTodos.filter((todo) => !pendingDeleteIds.has(todo.id));
    const localUpdates = localUpdatesForExistingCloudTodos(localTodos, visibleCloudTodos);
    const pendingUpserts = localTodos.filter((todo) => pendingUpsertIds.has(todo.id));
    const syncUpserts = [...new Map([...localUpdates, ...pendingUpserts].map((todo) => [todo.id, todo])).values()];
    state.todos = mergeCloudTodosWithLocalUpdates(localTodos, visibleCloudTodos, pendingUpsertIds);
    persist(state.todos);
    render();
    if (loginModal.open) loginModal.close();
    notify(successMessage || '已连接云端待办。');
    if (syncUpserts.length) await Promise.allSettled(syncUpserts.map(async (todo) => {
      await api.upsertCloudTodo(session.uid, todo);
      removeQueuedId(PENDING_UPSERT_KEY, todo.id);
    }));
    const syncDeleteIds = [...pendingDeleteIds].filter((todoId) => {
      if (cloudTodoIds.has(todoId)) return true;
      removeQueuedId(PENDING_DELETE_KEY, todoId);
      return false;
    });
    if (syncDeleteIds.length) await Promise.allSettled(syncDeleteIds.map(async (todoId) => {
      await api.removeCloudTodo(todoId);
      removeQueuedId(PENDING_DELETE_KEY, todoId);
    }));
  };

  const saveCloudTodo = async (todo: Todo, successMessage: string, options: { optimistic?: boolean } = {}) => {
    if (!cloudSession) {
      showLogin('请先登录后再保存待办。');
      return false;
    }
    if (options.optimistic) {
      upsertTodoInState(todo);
      persist(state.todos);
      render();
      enqueueId(PENDING_UPSERT_KEY, todo.id);
      notify('已保存到本地，正在同步云端。');
    }
    try {
      await (await getCloudApi()).upsertCloudTodo(cloudSession.uid, todo);
      removeQueuedId(PENDING_UPSERT_KEY, todo.id);
      if (!options.optimistic) upsertTodoInState(todo);
      saveState(successMessage);
    } catch (error) {
      if (!options.optimistic) throw error;
      notify('已保存到本地；云端暂未同步，刷新后会继续保留。');
    }
    return true;
  };

  const showCloudError = (error: unknown, fallback: string) => {
    notify(error instanceof Error ? error.message : fallback);
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
    const sourceUrl = new URL(LOCAL_MIGRATION_PATH, LOCAL_MIGRATION_ORIGIN);
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

  const importMigration = async () => {
    if (!pendingMigrationTodos?.length) return;
    if (!cloudSession) {
      showLogin('请先登录后再导入待办。');
      return;
    }
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
    const nextTodos = [...merged.values()].sort((first, second) => first.date.localeCompare(second.date) || first.createdAt.localeCompare(second.createdAt));
    for (const todo of nextTodos) await (await getCloudApi()).upsertCloudTodo(cloudSession.uid, todo);
    state.todos = nextTodos;
    closeMigrationDialog();
    saveState(`旧数据已合并：新增 ${added} 项，更新 ${updated} 项，保留当前 ${kept} 项。`);
  };

  const exportBackup = () => {
    const escapeXml = (value: string) => value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
    const textCell = (column: string, row: number, value: string) =>
      `<c r="${column}${row}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    const rows = [
      ['日期', '分类', '待办事项', '重要', '完成状态', '备注', '创建时间', '更新时间'],
      ...state.todos.map((todo) => [
        todo.date,
        categoryLabel(todo.category),
        todo.title,
        todo.important ? '是' : '否',
        todo.completed ? '已完成' : '未完成',
        todo.note,
        todo.createdAt,
        todo.updatedAt
      ])
    ];
    const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((values, index) => `<row r="${index + 1}">${values.map((value, column) => textCell(String.fromCharCode(65 + column), index + 1, value)).join('')}</row>`).join('')}</sheetData></worksheet>`;
    const encoder = new TextEncoder();
    const crc32 = (bytes: Uint8Array) => {
      let crc = 0xffffffff;
      for (const byte of bytes) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
      return (crc ^ 0xffffffff) >>> 0;
    };
    const entries = [
      ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'],
      ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="个人待办" sheetId="1" r:id="rId1"/></sheets></workbook>'],
      ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
      ['xl/worksheets/sheet1.xml', worksheet]
    ].map(([name, content]) => ({ name: encoder.encode(name), content: encoder.encode(content) }));
    const localParts: Uint8Array[] = [];
    const centralParts: Uint8Array[] = [];
    let offset = 0;
    for (const entry of entries) {
      const crc = crc32(entry.content);
      const localHeader = new Uint8Array(30 + entry.name.length);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, entry.content.length, true);
      localView.setUint32(22, entry.content.length, true);
      localView.setUint16(26, entry.name.length, true);
      localHeader.set(entry.name, 30);
      localParts.push(localHeader, entry.content);

      const centralHeader = new Uint8Array(46 + entry.name.length);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, entry.content.length, true);
      centralView.setUint32(24, entry.content.length, true);
      centralView.setUint16(28, entry.name.length, true);
      centralView.setUint32(42, offset, true);
      centralHeader.set(entry.name, 46);
      centralParts.push(centralHeader);
      offset += localHeader.length + entry.content.length;
    }
    const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
    const endOfCentralDirectory = new Uint8Array(22);
    const endView = new DataView(endOfCentralDirectory.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, entries.length, true);
    endView.setUint16(10, entries.length, true);
    endView.setUint32(12, centralSize, true);
    endView.setUint32(16, offset, true);
    const parts = [...localParts, ...centralParts, endOfCentralDirectory];
    const archive = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let cursor = 0;
    for (const part of parts) {
      archive.set(part, cursor);
      cursor += part.length;
    }
    const file = new Blob([archive], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mywebsite-todos-${toDateKey(currentDate)}.xlsx`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    notify('Excel 待办备份已下载。');
  };

  window.addEventListener('message', (event) => {
    if (event.origin !== localMigrationOrigin || !event.data || event.data.type !== 'todo-localhost-migration') return;
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

  root.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest<HTMLElement>('[data-action]');
    if (!trigger) return;
    const action = trigger.dataset.action;

    if (action === 'open-sidebar') openSidebar();
    if (action === 'close-sidebar') closeSidebar();
    if (action === 'open-trash') {
      openTrash();
      closeSidebar();
    }
    if (action === 'close-trash') {
      if (trashModal.open) trashModal.close();
    }
    if (action === 'restore-trash') {
      const trashTodo = state.trash.find((item) => item.id === trigger.dataset.todoId);
      if (!trashTodo) return;
      const restoredTodo: Todo = {
        id: trashTodo.id,
        title: trashTodo.title,
        date: trashTodo.date,
        category: trashTodo.category,
        important: trashTodo.important,
        completed: trashTodo.completed,
        note: trashTodo.note,
        createdAt: trashTodo.createdAt,
        updatedAt: new Date().toISOString()
      };
      state.trash = state.trash.filter((item) => item.id !== trashTodo.id);
      persistTrash(state.trash);
      upsertTodoInState(restoredTodo);
      enqueueId(PENDING_UPSERT_KEY, restoredTodo.id);
      selectDate(parseDateKey(restoredTodo.date) ?? state.selectedDate);
      saveState('待办已从回收站恢复。');
      renderTrashList();
      if (cloudSession) {
        try {
          await (await getCloudApi()).upsertCloudTodo(cloudSession.uid, restoredTodo);
          removeQueuedId(PENDING_UPSERT_KEY, restoredTodo.id);
        } catch {
          notify('待办已本地恢复；云端暂未同步。');
        }
      }
    }
    if (action === 'delete-trash') {
      const trashTodo = state.trash.find((item) => item.id === trigger.dataset.todoId);
      if (!trashTodo) return;
      state.trash = state.trash.filter((item) => item.id !== trashTodo.id);
      persistTrash(state.trash);
      renderTrashList();
      notify('已从回收站彻底删除。');
    }
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
    if (action === 'confirm-migration') {
      try {
        await importMigration();
      } catch (error) {
        showCloudError(error, '导入云端待办失败。');
      }
    }
    if (action === 'export-backup') exportBackup();
    if (action === 'close-form') closeForm();
    if (action === 'toggle-complete') {
      const todo = state.todos.find((item) => item.id === trigger.dataset.todoId);
      if (todo) {
        const nextTodo = { ...todo, completed: !todo.completed, updatedAt: new Date().toISOString() };
        try {
          await saveCloudTodo(nextTodo, nextTodo.completed ? '待办已完成并同步到云端。' : '待办已恢复并同步到云端。', { optimistic: true });
        } catch (error) {
          showCloudError(error, '更新云端待办失败。');
        }
      }
    }
    if (action === 'complete-selected-day') {
      const selectedDateKey = toDateKey(state.selectedDate);
      const pendingTodos = filterTodos(state.todos.filter((todo) => todo.date === selectedDateKey && !todo.completed));
      if (!pendingTodos.length) return;
      const now = new Date().toISOString();
      const pendingIds = new Set(pendingTodos.map((todo) => todo.id));
      const completedTodos = pendingTodos.map((todo) => ({ ...todo, completed: true, updatedAt: now }));

      state.todos = state.todos.map((todo) => pendingIds.has(todo.id)
        ? { ...todo, completed: true, updatedAt: now }
        : todo);
      persist(state.todos);
      completedTodos.forEach((todo) => enqueueId(PENDING_UPSERT_KEY, todo.id));
      render();
      notify('今天的可见待办已全部完成。');

      if (cloudSession) {
        const session = cloudSession;
        try {
          const api = await getCloudApi();
          await Promise.all(completedTodos.map((todo) => api.upsertCloudTodo(session.uid, todo)));
          completedTodos.forEach((todo) => removeQueuedId(PENDING_UPSERT_KEY, todo.id));
          saveState('今天的待办已同步完成。');
        } catch {
          notify('已保存到本地；云端暂未同步，刷新后会继续保留。');
        }
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
      if (!cloudSession) {
        showLogin('请先登录后再删除待办。');
        return;
      }
      const deletingId = state.pendingDeleteId;
      const deletingTodo = state.todos.find((todo) => todo.id === deletingId);
      const trashSaved = deletingTodo ? moveTodoToTrash(deletingTodo) : true;
      state.todos = state.todos.filter((todo) => todo.id !== deletingId);
      state.pendingDeleteId = null;
      enqueueId(PENDING_DELETE_KEY, deletingId);
      removeQueuedId(PENDING_UPSERT_KEY, deletingId);
      if (deleteModal.open) deleteModal.close();
      saveState(trashSaved ? '待办已移入回收站，正在同步云端。' : '待办已移入本次会话回收站；浏览器存储不可用。');
      try {
        await (await getCloudApi()).removeCloudTodo(deletingId);
        removeQueuedId(PENDING_DELETE_KEY, deletingId);
        saveState('待办已移入回收站，云端已同步删除。');
      } catch {
        notify('待办已进入回收站；云端暂未同步，刷新后会继续隐藏。');
      }
    }
    if (action === 'sign-out') {
      try {
        await (await getCloudApi()).signOut();
        cloudSession = null;
        state.todos = [];
        render();
        showLogin('已退出登录。');
      } catch (error) {
        showCloudError(error, '退出登录失败。');
      }
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

  todoForm.addEventListener('submit', async (event) => {
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
    try {
      const saved = await saveCloudTodo(nextTodo, existing ? '待办已更新并同步到云端。' : '待办已添加并同步到云端。', { optimistic: true });
      if (!saved) return;
      selectDate(date);
      render();
      closeForm();
    } catch (error) {
      showCloudError(error, '保存云端待办失败。');
    }
  });

  const loginCredentials = () => {
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('请输入有效邮箱地址。');
    if (password.length < 8) throw new Error('密码至少需要 8 位。');
    return { email, password };
  };

  const setLoginPending = (pending: boolean) => {
    loginEmailInput.disabled = pending;
    loginPasswordInput.disabled = pending;
    verificationCodeInput.disabled = pending;
    signUpButton.disabled = pending;
    const submitButton = loginForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submitButton) submitButton.disabled = pending;
  };

  const login = async () => {
    const { email, password } = loginCredentials();
    setLoginPending(true);
    loginMessage.textContent = '正在登录并读取云端待办…';
    try {
      await activateSession(await (await getCloudApi()).signInWithPassword(email, password), '登录成功，已读取云端待办。');
    } finally {
      setLoginPending(false);
    }
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await login();
    } catch (error) {
      loginMessage.textContent = error instanceof Error ? error.message : '登录失败，请重试。';
    }
  });

  signUpButton.addEventListener('click', async () => {
    try {
      setLoginPending(true);
      if (completeEmailSignUp) {
        const verificationCode = verificationCodeInput.value.trim();
        if (!verificationCode) throw new Error('请输入邮箱收到的验证码。');
        loginMessage.textContent = '正在验证邮箱并创建账号…';
        await activateSession(await completeEmailSignUp(verificationCode), '账号创建成功，已连接云端待办。');
        resetEmailSignUp();
      } else {
        const { email, password } = loginCredentials();
        loginMessage.textContent = '正在发送邮箱验证码…';
        completeEmailSignUp = await (await getCloudApi()).startEmailSignUp(email, password);
        verificationField.hidden = false;
        signUpButton.textContent = '完成注册';
        loginMessage.textContent = '验证码已发送到邮箱，请输入后点击“完成注册”。';
        verificationCodeInput.focus();
      }
    } catch (error) {
      loginMessage.textContent = error instanceof Error ? error.message : '创建账号失败，请重试。';
      if (completeEmailSignUp) resetEmailSignUp();
    } finally {
      setLoginPending(false);
    }
  });

  loginModal.addEventListener('cancel', (event) => event.preventDefault());

  const initialiseCloud = async () => {
    try {
      const session = await (await getCloudApi()).getCloudSession();
      if (session) {
        await activateSession(session);
      } else {
        showLogin('首次使用请创建账号；之后在其他设备登录同一账号即可同步。');
      }
    } catch (error) {
      showLogin(error instanceof Error ? error.message : '无法连接云端服务，请检查网络后重试。');
    }
  };

  compactQuery.addEventListener('change', render);
  render();
  if (state.storageMessage) notify(state.storageMessage);
  void initialiseCloud();
}
