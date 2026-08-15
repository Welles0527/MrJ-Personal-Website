import type { CloudSession, CloudTodo, CloudTodoCategory, CloudTodoWatcher } from './todo-cloud';

type RangePreset = '4' | '8' | 'month' | 'quarter' | 'year' | 'custom';

type CategoryMeta = {
  key: CloudTodoCategory;
  label: string;
  className: string;
  rgb: string;
};

type ActionRecord = CloudTodo & {
  date: string;
};

export type ActionTaskGroup = {
  key: string;
  title: string;
  count: number;
  important: boolean;
  records: ActionRecord[];
};

export type ActionWeekCategory = {
  category: CloudTodoCategory;
  records: ActionRecord[];
  tasks: ActionTaskGroup[];
  count: number;
};

export type ActionWeek = {
  startKey: string;
  endKey: string;
  weekNumber: number;
  isCurrent: boolean;
  records: ActionRecord[];
  activeDays: number;
  categories: Record<CloudTodoCategory, ActionWeekCategory>;
};

export type ActionOverviewResult = {
  startKey: string;
  endKey: string;
  records: ActionRecord[];
  weeksAscending: ActionWeek[];
  weeksDescending: ActionWeek[];
  trendWeeks: ActionWeek[];
  categoryTotals: Record<CloudTodoCategory, number>;
  completedRecords: number;
  uniqueItems: number;
  activeDays: number;
  categoryCoverage: number;
  topCategory: CategoryMeta | null;
  topCategoryCount: number;
  summary: string;
};

type BuildOptions = {
  range: RangePreset;
  year: number;
  query?: string;
  customStart?: string;
  customEnd?: string;
  now?: Date;
};

export const ACTION_CATEGORIES: CategoryMeta[] = [
  { key: 'work', label: '工作', className: 'cat-work', rgb: '155, 138, 183' },
  { key: 'study', label: '投资', className: 'cat-study', rgb: '215, 123, 92' },
  { key: 'life', label: '生活', className: 'cat-life', rgb: '126, 165, 174' },
  { key: 'health', label: '运动', className: 'cat-health', rgb: '167, 172, 86' },
  { key: 'other', label: '信仰', className: 'cat-other', rgb: '201, 161, 90' }
];

const categoryByKey = new Map(ACTION_CATEGORIES.map((category) => [category.key, category]));
const validDateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;
const dateFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' });
const longDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short'
});

const isCategory = (value: unknown): value is CloudTodoCategory => categoryByKey.has(value as CloudTodoCategory);

const parseDateKey = (value: string) => {
  if (!validDateKeyPattern.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  const dayIndex = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - dayIndex);
  return next;
};

const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);

const isoWeekNumber = (date: Date) => {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const emptyCategoryRecord = (): Record<CloudTodoCategory, number> => ({
  work: 0,
  study: 0,
  life: 0,
  health: 0,
  other: 0
});

const groupTasks = (records: ActionRecord[]): ActionTaskGroup[] => {
  const grouped = new Map<string, ActionTaskGroup>();
  records.forEach((record) => {
    const key = normalizeTitle(record.title);
    const current = grouped.get(key);
    if (current) {
      current.count += 1;
      current.important ||= record.important;
      current.records.push(record);
      return;
    }
    grouped.set(key, {
      key,
      title: record.title.trim(),
      count: 1,
      important: record.important,
      records: [record]
    });
  });
  return [...grouped.values()]
    .map((task) => ({ ...task, records: task.records.sort((a, b) => b.date.localeCompare(a.date)) }))
    .sort((first, second) => second.count - first.count || first.title.localeCompare(second.title, 'zh-CN'));
};

const selectedYearAnchor = (year: number, now: Date) => year === now.getFullYear()
  ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  : new Date(year, 11, 31, 12, 0, 0, 0);

export const resolveDateRange = (options: BuildOptions) => {
  const now = options.now ?? new Date();
  const anchor = selectedYearAnchor(options.year, now);
  let start: Date;
  let end: Date;

  if (options.range === '4' || options.range === '8') {
    const weekCount = Number(options.range);
    end = endOfWeek(anchor);
    start = addDays(startOfWeek(anchor), -7 * (weekCount - 1));
  } else if (options.range === 'month') {
    start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12, 0, 0, 0);
    end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12, 0, 0, 0);
  } else if (options.range === 'quarter') {
    const quarterStartMonth = Math.floor(anchor.getMonth() / 3) * 3;
    start = new Date(anchor.getFullYear(), quarterStartMonth, 1, 12, 0, 0, 0);
    end = new Date(anchor.getFullYear(), quarterStartMonth + 3, 0, 12, 0, 0, 0);
  } else if (options.range === 'year') {
    start = new Date(options.year, 0, 1, 12, 0, 0, 0);
    end = new Date(options.year, 11, 31, 12, 0, 0, 0);
  } else {
    const fallbackStart = addDays(startOfWeek(anchor), -49);
    const parsedStart = parseDateKey(options.customStart ?? '') ?? fallbackStart;
    const parsedEnd = parseDateKey(options.customEnd ?? '') ?? anchor;
    start = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
    end = parsedStart <= parsedEnd ? parsedEnd : parsedStart;
  }

  return { start, end, startKey: toDateKey(start), endKey: toDateKey(end) };
};

const dedupeCompletedRecords = (todos: CloudTodo[]) => {
  const records = new Map<string, ActionRecord>();
  todos.forEach((todo) => {
    if (!todo.completed || todo.deletedAt || !isCategory(todo.category) || !parseDateKey(todo.date) || !todo.title.trim()) return;
    const key = `${todo.date}|${todo.category}|${normalizeTitle(todo.title)}`;
    const current = records.get(key);
    if (!current || todo.updatedAt > current.updatedAt) records.set(key, todo as ActionRecord);
  });
  return [...records.values()].sort((first, second) => first.date.localeCompare(second.date) || first.title.localeCompare(second.title, 'zh-CN'));
};

const categoryRecordForWeek = (weekRecords: ActionRecord[]): Record<CloudTodoCategory, ActionWeekCategory> => Object.fromEntries(
  ACTION_CATEGORIES.map((category) => {
    const records = weekRecords.filter((record) => record.category === category.key);
    return [category.key, {
      category: category.key,
      records,
      tasks: groupTasks(records),
      count: records.length
    }];
  })
) as Record<CloudTodoCategory, ActionWeekCategory>;

const makeSummary = (week: ActionWeek | undefined) => {
  if (!week || !week.records.length) return '本周暂时没有已完成记录。';
  return ACTION_CATEGORIES.map((category) => {
    const tasks = week.categories[category.key].tasks;
    if (!tasks.length) return '';
    const names = tasks.slice(0, 3).map((task) => task.count > 1 ? `${task.title} ×${task.count}` : task.title);
    const rest = tasks.length - names.length;
    return `${category.label}：${names.join('、')}${rest > 0 ? `等 ${tasks.length} 项` : ''}`;
  }).filter(Boolean).join('；') || '本周暂时没有已完成记录。';
};

export const buildActionOverview = (todos: CloudTodo[], options: BuildOptions): ActionOverviewResult => {
  const now = options.now ?? new Date();
  const range = resolveDateRange({ ...options, now });
  const query = normalizeTitle(options.query ?? '');
  const allCompleted = dedupeCompletedRecords(todos);
  const records = allCompleted.filter((record) => record.date >= range.startKey
    && record.date <= range.endKey
    && (!query || normalizeTitle(record.title).includes(query) || normalizeTitle(record.note).includes(query)));

  const firstWeek = startOfWeek(range.start);
  const lastWeek = startOfWeek(range.end);
  const currentWeekKey = toDateKey(startOfWeek(now));
  const weeksAscending: ActionWeek[] = [];

  for (let cursor = firstWeek, safety = 0; cursor <= lastWeek && safety < 60; cursor = addDays(cursor, 7), safety += 1) {
    const startKey = toDateKey(cursor);
    const endKey = toDateKey(addDays(cursor, 6));
    const weekRecords = records.filter((record) => record.date >= startKey && record.date <= endKey);
    weeksAscending.push({
      startKey,
      endKey,
      weekNumber: isoWeekNumber(cursor),
      isCurrent: startKey === currentWeekKey,
      records: weekRecords,
      activeDays: new Set(weekRecords.map((record) => record.date)).size,
      categories: categoryRecordForWeek(weekRecords)
    });
  }

  const categoryTotals = emptyCategoryRecord();
  records.forEach((record) => { categoryTotals[record.category] += 1; });
  const topCategory = [...ACTION_CATEGORIES].sort((a, b) => categoryTotals[b.key] - categoryTotals[a.key])[0] ?? null;
  const topCategoryCount = topCategory ? categoryTotals[topCategory.key] : 0;
  const summaryWeek = weeksAscending.find((week) => week.isCurrent) ?? weeksAscending.at(-1);

  return {
    startKey: range.startKey,
    endKey: range.endKey,
    records,
    weeksAscending,
    weeksDescending: [...weeksAscending].reverse(),
    trendWeeks: weeksAscending.slice(-8),
    categoryTotals,
    completedRecords: records.length,
    uniqueItems: new Set(records.map((record) => `${record.category}|${normalizeTitle(record.title)}`)).size,
    activeDays: new Set(records.map((record) => record.date)).size,
    categoryCoverage: ACTION_CATEGORIES.filter((category) => categoryTotals[category.key] > 0).length,
    topCategory: topCategoryCount > 0 ? topCategory : null,
    topCategoryCount,
    summary: makeSummary(summaryWeek)
  };
};

const formatMonthDay = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  return date ? dateFormatter.format(date) : dateKey;
};

const formatLongDate = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  return date ? longDateFormatter.format(date) : dateKey;
};

const rangeLabel = (result: ActionOverviewResult) => `${formatMonthDay(result.startKey)} — ${formatMonthDay(result.endKey)}`;

const renderTaskLines = (week: ActionWeek, category: CategoryMeta, visibleLimit = 4) => {
  const tasks = week.categories[category.key].tasks;
  if (!tasks.length) return '<div class="empty-cell">本周无记录</div>';
  const renderTask = (task: ActionTaskGroup) => `<button class="task-line" type="button" data-action="open-task" data-week-start="${week.startKey}" data-category="${category.key}" data-title="${escapeHtml(task.title)}" title="${escapeHtml(task.records.map((record) => formatMonthDay(record.date)).join('、'))}">
    <span class="task-dot ${category.className}" aria-hidden="true"></span>
    <span class="task-title">${task.important ? '<span class="important-star" aria-label="重要">★</span>' : ''}${escapeHtml(task.title)}</span>
    ${task.count > 1 ? `<span class="repeat">×${task.count}</span>` : ''}
  </button>`;
  const visible = tasks.slice(0, visibleLimit).map(renderTask).join('');
  const hidden = tasks.slice(visibleLimit).map(renderTask).join('');
  return `${visible}${hidden ? `<div class="hidden-items">${hidden}</div><button class="expand-btn" type="button" data-action="toggle-cell" data-more="${tasks.length - visibleLimit}">展开 +${tasks.length - visibleLimit} 项</button>` : ''}`;
};

const renderMatrix = (result: ActionOverviewResult) => {
  const header = `<div class="matrix-header">
    <div class="header-cell">周次 / 完成量</div>
    ${ACTION_CATEGORIES.map((category) => `<div class="header-cell" data-category-column="${category.key}"><span class="header-dot ${category.className}"></span>${category.label}<span class="header-total">${result.categoryTotals[category.key]}</span></div>`).join('')}
  </div>`;
  const rows = result.weeksDescending.map((week) => `<div class="matrix-row" id="week-${week.startKey}">
    <section class="matrix-cell week-cell">
      <div class="week-kicker">第 ${week.weekNumber} 周</div>
      <div class="week-range">${formatMonthDay(week.startKey)} — ${formatMonthDay(week.endKey)}</div>
      <div class="week-meta"><strong>${week.records.length}</strong> 次完成 · ${week.activeDays} 天活跃</div>
      ${week.isCurrent ? '<span class="current-badge">当周</span>' : ''}
    </section>
    ${ACTION_CATEGORIES.map((category) => {
      const categoryWeek = week.categories[category.key];
      const alpha = Math.min(0.2, 0.035 + categoryWeek.count * 0.012).toFixed(3);
      return `<section class="matrix-cell category-cell" role="button" tabindex="0" data-action="open-cell" data-week-start="${week.startKey}" data-category="${category.key}" data-category-column="${category.key}" style="--cat-rgb:${category.rgb};--cell-alpha:${alpha}">
        <div class="cell-head"><span class="cell-count">${categoryWeek.count} 次</span><span class="cell-unique">${categoryWeek.tasks.length} 项</span></div>
        <div class="cell-items">${renderTaskLines(week, category)}</div>
      </section>`;
    }).join('')}
  </div>`).join('');
  return header + rows;
};

const renderMobileWeeks = (result: ActionOverviewResult) => result.weeksDescending.map((week, index) => `<details class="mobile-week" id="mobile-week-${week.startKey}" ${index === 0 ? 'open' : ''}>
  <summary>
    <span class="mobile-week-summary"><strong>第 ${week.weekNumber} 周 · ${formatMonthDay(week.startKey)} — ${formatMonthDay(week.endKey)}</strong><small>${week.activeDays} 天活跃${week.isCurrent ? ' · 当周' : ''}</small></span>
    <span class="mobile-week-total">${week.records.length} 次完成</span>
  </summary>
  <div class="mobile-week-body">
    ${ACTION_CATEGORIES.map((category) => {
      const categoryWeek = week.categories[category.key];
      const alpha = Math.min(0.2, 0.035 + categoryWeek.count * 0.012).toFixed(3);
      return `<section class="mobile-category" data-category-column="${category.key}" style="--cat-rgb:${category.rgb};--cell-alpha:${alpha}">
        <button class="mobile-category-head" type="button" data-action="open-cell" data-week-start="${week.startKey}" data-category="${category.key}"><span><i class="legend-dot ${category.className}"></i>${category.label}</span><span>${categoryWeek.count} 次 · ${categoryWeek.tasks.length} 项</span></button>
        ${renderTaskLines(week, category, 3)}
      </section>`;
    }).join('')}
  </div>
</details>`).join('');

const reportText = (result: ActionOverviewResult) => {
  const current = result.weeksAscending.find((week) => week.isCurrent) ?? result.weeksAscending.at(-1);
  if (!current) return result.summary;
  return `行动周报｜${formatMonthDay(current.startKey)}—${formatMonthDay(current.endKey)}\n完成 ${current.records.length} 次，活跃 ${current.activeDays} 天。\n${result.summary}`;
};

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;

const exportRecords = (result: ActionOverviewResult) => {
  const header = ['日期', '周次', '分类', '事项', '重要', '备注', '创建时间', '更新时间'];
  const rows = result.records.map((record) => {
    const date = parseDateKey(record.date)!;
    return [
      record.date,
      `第 ${isoWeekNumber(date)} 周`,
      categoryByKey.get(record.category)?.label ?? record.category,
      record.title,
      record.important ? '是' : '否',
      record.note,
      record.createdAt,
      record.updatedAt
    ];
  });
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `行动全览-${result.startKey}-${result.endKey}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export function mountActionOverview(root: HTMLElement) {
  const getElement = <T extends Element>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`行动全览缺少页面元素：${selector}`);
    return element;
  };

  const today = getElement<HTMLElement>('[data-today]');
  const authStatus = getElement<HTMLElement>('[data-auth-status]');
  const lastSync = getElement<HTMLElement>('[data-last-sync]');
  const status = getElement<HTMLElement>('[data-status]');
  const signOutButton = getElement<HTMLButtonElement>('[data-action="sign-out"]');
  const yearSelect = getElement<HTMLSelectElement>('[data-year]');
  const rangeSelect = getElement<HTMLSelectElement>('[data-range]');
  const customRange = getElement<HTMLElement>('[data-custom-range]');
  const startInput = getElement<HTMLInputElement>('[data-start]');
  const endInput = getElement<HTMLInputElement>('[data-end]');
  const searchInput = getElement<HTMLInputElement>('[data-search]');
  const trend = getElement<HTMLElement>('[data-trend]');
  const rangeText = getElement<HTMLElement>('[data-range-label]');
  const categoryTotals = getElement<HTMLElement>('[data-category-totals]');
  const matrix = getElement<HTMLElement>('[data-matrix]');
  const mobileWeeks = getElement<HTMLElement>('[data-mobile-weeks]');
  const summary = getElement<HTMLElement>('[data-summary]');
  const drawer = getElement<HTMLElement>('[data-drawer]');
  const drawerBackdrop = getElement<HTMLElement>('[data-drawer-backdrop]');
  const drawerKicker = getElement<HTMLElement>('[data-drawer-kicker]');
  const drawerTitle = getElement<HTMLElement>('[data-drawer-title]');
  const drawerBody = getElement<HTMLElement>('[data-drawer-body]');
  const toast = getElement<HTMLElement>('[data-toast]');
  const kpiRecords = getElement<HTMLElement>('[data-kpi-records]');
  const kpiUnique = getElement<HTMLElement>('[data-kpi-unique]');
  const kpiDays = getElement<HTMLElement>('[data-kpi-days]');
  const kpiCoverage = getElement<HTMLElement>('[data-kpi-coverage]');
  const kpiTop = getElement<HTMLElement>('[data-kpi-top]');
  const kpiTopNote = getElement<HTMLElement>('[data-kpi-top-note]');

  const now = new Date();
  today.textContent = `今天：${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · 星期${'日一二三四五六'[now.getDay()]}`;
  let todos: CloudTodo[] = [];
  let session: CloudSession | null = null;
  let watcher: CloudTodoWatcher | null = null;
  let currentResult: ActionOverviewResult;
  let currentCategory: 'all' | CloudTodoCategory = 'all';
  let refreshPromise: Promise<void> | null = null;
  let toastTimer = 0;

  const yearsFromTodos = () => {
    const years = todos.map((todo) => parseDateKey(todo.date)?.getFullYear()).filter((year): year is number => Boolean(year));
    return [...new Set([now.getFullYear(), ...years])].sort((a, b) => b - a);
  };

  const selectedYear = () => Number(yearSelect.value) || now.getFullYear();

  const populateYears = () => {
    const previous = selectedYear();
    const years = yearsFromTodos();
    yearSelect.innerHTML = years.map((year) => `<option value="${year}">${year}年</option>`).join('');
    yearSelect.value = String(years.includes(previous) ? previous : now.getFullYear());
  };

  const setStatus = (message: string, tone: 'loading' | 'success' | 'error' = 'loading') => {
    status.textContent = message;
    status.classList.toggle('is-success', tone === 'success');
    status.classList.toggle('is-error', tone === 'error');
  };

  const notify = (message: string) => {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2200);
  };

  const applyCategoryFilter = () => {
    root.querySelectorAll<HTMLElement>('[data-category-column]').forEach((element) => {
      element.classList.toggle('is-muted', currentCategory !== 'all' && element.dataset.categoryColumn !== currentCategory);
    });
    root.querySelectorAll<HTMLElement>('.category-total').forEach((element) => {
      element.classList.toggle('is-muted', currentCategory !== 'all' && element.dataset.category !== currentCategory);
    });
    root.querySelectorAll<HTMLButtonElement>('[data-action="filter-category"]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.category === currentCategory);
    });
  };

  const renderTrend = (result: ActionOverviewResult) => {
    const maxTotal = Math.max(1, ...result.trendWeeks.map((week) => week.records.length));
    trend.innerHTML = result.trendWeeks.map((week) => {
      const total = week.records.length;
      const height = total ? Math.max(28, Math.round((total / maxTotal) * 132)) : 22;
      const segments = ACTION_CATEGORIES.map((category) => {
        const count = week.categories[category.key].count;
        return count ? `<span class="bar-segment ${category.className}" style="height:${(count / Math.max(total, 1)) * 100}%" title="${category.label} ${count}"></span>` : '';
      }).join('');
      return `<button class="week-bar-wrap" type="button" data-action="jump-week" data-week-start="${week.startKey}" aria-label="查看第 ${week.weekNumber} 周，完成 ${total} 次">
        <span class="bar-total">${total}</span>
        <span class="week-bar" style="height:${height}px">${segments}</span>
        <span class="bar-label">${formatMonthDay(week.startKey)}</span>
      </button>`;
    }).join('');
    rangeText.textContent = result.trendWeeks.length
      ? `${formatMonthDay(result.trendWeeks[0].startKey)} — ${formatMonthDay(result.trendWeeks.at(-1)!.endKey)}`
      : rangeLabel(result);
  };

  const renderCategoryTotals = (result: ActionOverviewResult) => {
    const maxTotal = Math.max(1, ...Object.values(result.categoryTotals));
    categoryTotals.innerHTML = ACTION_CATEGORIES.map((category) => {
      const count = result.categoryTotals[category.key];
      return `<div class="category-total" data-category="${category.key}">
        <div class="category-total-head"><span><i class="legend-dot ${category.className}"></i>${category.label}</span><strong>${count}</strong></div>
        <div class="category-track"><span class="${category.className}" style="width:${(count / maxTotal) * 100}%"></span></div>
      </div>`;
    }).join('');
  };

  const render = () => {
    currentResult = buildActionOverview(todos, {
      range: rangeSelect.value as RangePreset,
      year: selectedYear(),
      query: searchInput.value,
      customStart: startInput.value,
      customEnd: endInput.value,
      now
    });
    kpiRecords.textContent = String(currentResult.completedRecords);
    kpiUnique.textContent = String(currentResult.uniqueItems);
    kpiDays.textContent = String(currentResult.activeDays);
    kpiCoverage.textContent = `${currentResult.categoryCoverage} / 5`;
    kpiTop.textContent = currentResult.topCategory?.label ?? '—';
    kpiTopNote.textContent = currentResult.topCategory ? `${currentResult.topCategoryCount} 次完成` : '暂无完成记录';
    renderTrend(currentResult);
    renderCategoryTotals(currentResult);
    summary.textContent = currentResult.summary;
    matrix.innerHTML = renderMatrix(currentResult);
    mobileWeeks.innerHTML = renderMobileWeeks(currentResult);
    applyCategoryFilter();
  };

  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    drawerBackdrop.hidden = true;
  };

  const openDrawer = (weekStart: string, categoryKey: CloudTodoCategory, title?: string) => {
    const category = categoryByKey.get(categoryKey);
    const week = currentResult.weeksAscending.find((item) => item.startKey === weekStart);
    if (!category || !week) return;
    const normalized = title ? normalizeTitle(title) : '';
    const records = week.categories[categoryKey].records
      .filter((record) => !normalized || normalizeTitle(record.title) === normalized)
      .sort((first, second) => second.date.localeCompare(first.date));
    drawerKicker.textContent = `第 ${week.weekNumber} 周 · ${category.label} · ${records.length} 条记录`;
    drawerTitle.textContent = title || `${formatMonthDay(week.startKey)}—${formatMonthDay(week.endKey)} ${category.label}`;
    drawerBody.innerHTML = records.length ? records.map((record) => `<article class="detail-record" style="--cat-rgb:${category.rgb}">
      <time datetime="${record.date}">${formatLongDate(record.date)}</time>
      <h3>${record.important ? '<span class="important-star" aria-label="重要">★</span>' : ''}${escapeHtml(record.title)}</h3>
      ${record.note ? `<p>${escapeHtml(record.note)}</p>` : '<p>没有附加备注。</p>'}
      <small>分类：${category.label}</small>
    </article>`).join('') : '<p class="drawer-empty">该单元格暂无完成记录。</p>';
    drawerBackdrop.hidden = false;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    getElement<HTMLButtonElement>('[data-action="close-drawer"]').focus();
  };

  const refresh = async () => {
    if (!session) return;
    if (refreshPromise) return refreshPromise;
    const request = (async () => {
      const api = await import('./todo-cloud');
      const result = await api.loadCloudTodos(session!.uid);
      todos = result.todos;
      populateYears();
      render();
      const stamp = new Date();
      authStatus.textContent = `已同步：${session!.account}`;
      lastSync.textContent = `最后同步：${stamp.toLocaleTimeString('zh-CN', { hour12: false })}`;
      signOutButton.hidden = false;
      setStatus(`已从云端读取 ${todos.length} 条待办，其中 ${dedupeCompletedRecords(todos).length} 条为有日期的已完成记录。`, 'success');
    })().finally(() => { refreshPromise = null; });
    refreshPromise = request;
    return request;
  };

  const startWatcher = async () => {
    if (!session) return;
    await Promise.resolve(watcher?.close()).catch(() => undefined);
    const api = await import('./todo-cloud');
    watcher = api.watchCloudTodos(session.uid, todos.length, () => {
      void refresh().catch((error) => setStatus(error instanceof Error ? error.message : '刷新云端待办失败。', 'error'));
    }, (error) => {
      setStatus(`实时同步已中断：${error.message}`, 'error');
    });
  };

  const initialise = async () => {
    populateYears();
    render();
    try {
      const api = await import('./todo-cloud');
      const remembered = api.getRememberedSession();
      if (remembered) {
        authStatus.textContent = `正在同步：${remembered.account}`;
        lastSync.textContent = '正在校验云端登录状态';
      }
      session = await api.getCloudSession();
      if (!session) {
        authStatus.textContent = '尚未登录云端待办';
        lastSync.textContent = '请先在“周计划”页面登录';
        setStatus('当前未登录，行动全览暂时显示空数据；登录“我的待办”后返回即可读取真实完成记录。', 'error');
        return;
      }
      await refresh();
      await startWatcher();
    } catch (error) {
      authStatus.textContent = '云端数据读取失败';
      lastSync.textContent = '请稍后重试';
      setStatus(error instanceof Error ? error.message : '读取云端待办失败。', 'error');
    }
  };

  root.addEventListener('click', async (event) => {
    const trigger = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!trigger) return;
    const action = trigger.dataset.action;
    if (action === 'filter-category') {
      const category = trigger.dataset.category;
      if (category === 'all' || isCategory(category)) {
        currentCategory = category;
        applyCategoryFilter();
      }
    }
    if (action === 'focus-search') searchInput.focus();
    if (action === 'monthly-review') notify('月度复盘将在下一阶段开放。');
    if (action === 'toggle-cell') {
      event.stopPropagation();
      const cell = trigger.closest<HTMLElement>('.category-cell, .mobile-category');
      if (!cell) return;
      cell.classList.toggle('is-expanded');
      trigger.textContent = cell.classList.contains('is-expanded') ? '收起' : `展开 +${trigger.dataset.more} 项`;
    }
    if (action === 'jump-week') {
      const weekStart = trigger.dataset.weekStart;
      const targetId = window.matchMedia('(max-width: 720px)').matches ? `mobile-week-${weekStart}` : `week-${weekStart}`;
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (action === 'open-cell' && isCategory(trigger.dataset.category)) {
      openDrawer(trigger.dataset.weekStart ?? '', trigger.dataset.category);
    }
    if (action === 'open-task' && isCategory(trigger.dataset.category)) {
      event.stopPropagation();
      openDrawer(trigger.dataset.weekStart ?? '', trigger.dataset.category, trigger.dataset.title);
    }
    if (action === 'close-drawer') closeDrawer();
    if (action === 'copy-report') {
      const text = reportText(currentResult);
      try {
        await navigator.clipboard.writeText(text);
        notify('周报已复制。');
      } catch {
        notify('浏览器未允许复制，请在详情中手动选择周报文字。');
      }
    }
    if (action === 'export-overview') {
      exportRecords(currentResult);
      notify(`已导出 ${currentResult.records.length} 条完成记录。`);
    }
    if (action === 'sign-out') {
      try {
        await (await import('./todo-cloud')).signOut();
        session = null;
        todos = [];
        await Promise.resolve(watcher?.close()).catch(() => undefined);
        watcher = null;
        signOutButton.hidden = true;
        authStatus.textContent = '已退出登录';
        lastSync.textContent = '云端数据已从当前页面移除';
        populateYears();
        render();
        setStatus('已退出登录。', 'success');
      } catch (error) {
        notify(error instanceof Error ? error.message : '退出登录失败。');
      }
    }
  });

  root.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;
    if ((event.key === 'Enter' || event.key === ' ') && target.matches('.category-cell[data-action="open-cell"]')) {
      event.preventDefault();
      target.click();
    }
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
  });

  drawerBackdrop.addEventListener('click', closeDrawer);
  rangeSelect.addEventListener('change', () => {
    customRange.hidden = rangeSelect.value !== 'custom';
    render();
  });
  yearSelect.addEventListener('change', render);
  startInput.addEventListener('change', render);
  endInput.addEventListener('change', render);
  searchInput.addEventListener('input', render);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && session) void refresh().catch(() => undefined);
  });
  window.addEventListener('beforeunload', () => { void Promise.resolve(watcher?.close()); }, { once: true });

  void initialise();
}
