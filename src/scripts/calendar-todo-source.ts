import { getCloudSession, getRememberedSession, loadCloudTodos, watchCloudTodos } from './todo-cloud';
import type { CloudTodoWatcher } from './todo-cloud';

/** Read-only bridge for the same-origin life calendar; task editing stays in Personal Plan. */
export function mountCalendarTodoSource() {
  if (window.parent === window) return;
  try {
    if (window.parent.location.origin !== location.origin
      || !window.parent.location.pathname.endsWith('/super-calendar/index.html')) return;
  } catch { return; }

  let watcher: CloudTodoWatcher | null = null;
  let ownerId = '';
  let revision = 0;
  let busy = false;
  let pending = false;
  let stopped = false;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const send = (status: string, todos: unknown[] = []) => window.parent.postMessage({
    type: 'personal-plan-calendar', status, todos
  }, location.origin);
  const closeWatcher = () => {
    const old = watcher;
    watcher = null;
    if (old) void Promise.resolve(old.close()).catch(() => undefined);
  };
  const schedule = () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { void refresh(); }, 200);
  };
  const refresh = async () => {
    if (stopped) return;
    if (busy) { pending = true; return; }
    busy = true;
    const currentRevision = revision;
    try {
      const remembered = getRememberedSession();
      const session = remembered ? await getCloudSession() : null;
      if (currentRevision !== revision || stopped) return;
      if (!session) {
        ownerId = '';
        closeWatcher();
        send('signed-out');
        return;
      }
      if (ownerId !== session.uid) {
        closeWatcher();
        ownerId = session.uid;
        send('loading');
      }
      const result = await loadCloudTodos(session.uid);
      if (currentRevision !== revision || stopped || getRememberedSession()?.uid !== session.uid) return;
      send('ready', result.todos.filter(todo => !todo.deletedAt && /^\d{4}-\d{2}-\d{2}$/.test(todo.date)).map(todo => ({
        id: todo.id, title: todo.title, date: todo.date, completed: todo.completed,
        important: todo.important, category: todo.category, note: todo.note
      })));
      if (watcher && result.todos.length >= watcher.capacity) closeWatcher();
      if (!watcher) watcher = watchCloudTodos(session.uid, result.todos.length + 1, schedule, () => {
        closeWatcher();
        send('error');
      });
    } catch {
      if (currentRevision === revision && !stopped) { closeWatcher(); send('error'); }
    } finally {
      busy = false;
      if (pending && !stopped) { pending = false; schedule(); }
    }
  };
  window.addEventListener('storage', event => {
    if (event.key !== null && event.key !== 'mywebsite.site-auth-session.v1') return;
    revision += 1;
    ownerId = '';
    closeWatcher();
    send('loading');
    void refresh();
  });
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === window.parent
      && event.data?.type === 'personal-plan-calendar-refresh') void refresh();
  });
  const timer = setInterval(() => { void refresh(); }, 30000);
  window.addEventListener('pagehide', () => {
    stopped = true;
    revision += 1;
    clearInterval(timer);
    clearTimeout(debounce);
    closeWatcher();
  });
  void refresh();
}
