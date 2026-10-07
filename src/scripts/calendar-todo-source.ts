import { signInWithPassword, signOut } from './site-auth';
import { getCloudSession, getRememberedSession, loadCloudTodos, watchCloudTodos } from './todo-cloud';
import type { CloudTodoWatcher } from './todo-cloud';

/** Shared account login and read-only Personal Plan bridge for the same-origin calendar. */
export function mountCalendarTodoSource() {
  if (window.parent === window) return;
  try {
    if (window.parent.location.origin !== location.origin
      || !window.parent.location.pathname.endsWith('/super-calendar/index.html')) return;
  } catch { return; }

  const planPalette: Record<string, string> = {};
  const planShell = document.querySelector<HTMLElement>('[data-todo-app]');
  if (planShell) {
    const styles = getComputedStyle(planShell);
    for (const category of ['work', 'study', 'life', 'health', 'other']) {
      const sample = document.createElement('div');
      sample.dataset.taskCategory = category;
      planShell.append(sample);
      planPalette[category] = getComputedStyle(sample).getPropertyValue('--task-background').trim()
        || styles.getPropertyValue(`--category-${category}`).trim();
      sample.remove();
    }
  }
  document.head.querySelectorAll('link[rel="stylesheet"], style').forEach(element => element.remove());
  document.body.innerHTML = `<style>body{margin:0;padding:24px;background:var(--account-bg,#fffdf8);color:var(--account-text,#232323);font:15px system-ui;box-sizing:border-box}*{box-sizing:border-box}h2{margin:0 0 12px;font-size:24px}p{line-height:1.6}label{display:block;margin:16px 0}input,button{font:inherit;width:100%;padding:12px;border:1px solid #bbb;border-radius:10px}input{margin-top:7px;background:var(--account-cell,#fff);color:var(--account-text,#232323)}button{cursor:pointer;background:var(--account-accent,#242424);color:var(--account-ink,white)}button:disabled{opacity:.6}#auth-message{min-height:24px;color:#a22836;overflow-wrap:anywhere}[hidden]{display:none!important}</style><h2>登录超级日历</h2><p>使用网站统一账号，登录后自动同步个人计划。</p><form id="calendar-login"><label>邮箱<input name="email" type="email" autocomplete="username" required></label><label>密码<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">登录并同步</button></form><p id="auth-account" hidden></p><button id="auth-logout" hidden>退出登录</button><p id="auth-message" role="status" aria-live="polite"></p>`;
  const loginStyle = document.createElement('style');
  loginStyle.textContent = `html{background:#3c3c3c;color-scheme:dark}body{margin:18px;padding:24px 28px;border-radius:24px;background:#3c3c3c;color:#eee;box-shadow:7px 7px 16px #292929,-6px -6px 16px #535353}body:before{content:'J. WORKSPACE';display:block;font-size:10px;letter-spacing:2px;color:#ccc;margin-bottom:28px}h2{text-align:center;font-size:22px;font-weight:600}h2:before{content:'J✦';display:grid;place-items:center;width:90px;height:90px;margin:0 auto 24px;border:1px solid #777;border-radius:50%;font:italic 36px Georgia,serif;box-shadow:7px 7px 15px #292929,-7px -7px 15px #535353}body>p{font-size:12px;text-align:center;color:#bbb}label{font-size:12px;margin:24px 0}input{min-height:50px;padding:14px 20px;background:#393939;color:#eee;border:1px solid transparent;border-radius:28px;box-shadow:inset 6px 6px 12px #202020,inset -5px -5px 10px #4a4a4a}input:focus-visible,button:focus-visible{outline:2px solid #ccc;outline-offset:3px}button{min-height:50px;margin:12px 0;border:0;border-radius:28px;background:#3c3c3c;color:#eee;font-weight:600;box-shadow:5px 5px 12px #292929,-5px -5px 12px #525252}button:active{box-shadow:inset 4px 4px 9px #292929,inset -4px -4px 9px #525252}#auth-message{color:#ebc5a6}@media(max-width:400px){body{padding:22px 18px;margin:14px}}`;
  document.body.append(loginStyle);
  const form = document.querySelector<HTMLFormElement>('#calendar-login')!;
  const message = document.querySelector<HTMLElement>('#auth-message')!;
  const account = document.querySelector<HTMLElement>('#auth-account')!;
  const logout = document.querySelector<HTMLButtonElement>('#auth-logout')!;
  const publishAccount = (session: { account: string } | null) => {
    form.hidden = !!session;
    account.hidden = logout.hidden = !session;
    account.textContent = session ? `当前账号：${session.account}` : '';
    window.parent.postMessage({ type: 'calendar-account', account: session?.account || '' }, location.origin);
  };
  const showAccount = () => {
    const colors = getComputedStyle(window.parent.document.documentElement);
    for (const [name, source] of Object.entries({ bg: '--card', text: '--text', cell: '--cell', accent: '--purple', ink: '--accent-ink' })) {
      document.documentElement.style.setProperty(`--account-${name}`, colors.getPropertyValue(source));
    }
    if (!form.hidden) form.querySelector<HTMLInputElement>('input')?.focus();
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>('button')!;
    submit.disabled = true;
    message.textContent = '正在登录…';
    try {
      const values = new FormData(form);
      const session = await signInWithPassword(String(values.get('email')).trim(), String(values.get('password')));
      form.reset();
      publishAccount(session);
      message.textContent = '登录成功';
      void refresh();
    } catch (error) { message.textContent = error instanceof Error ? error.message : '登录失败，请重试。'; }
    finally { submit.disabled = false; }
  });
  logout.addEventListener('click', async () => {
    logout.disabled = true;
    try { await signOut(); message.textContent = ''; }
    catch { message.textContent = '退出失败，请重试。'; }
    finally { logout.disabled = false; }
  });
  let watcher: CloudTodoWatcher | null = null;
  let ownerId = '';
  let revision = 0;
  let busy = false;
  let pending = false;
  let stopped = false;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const send = (status: string, todos: unknown[] = []) => window.parent.postMessage({
    type: 'personal-plan-calendar', status, todos, palette: planPalette
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
      const session = await getCloudSession();
      if (currentRevision !== revision || stopped) return;
      publishAccount(session);
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
  window.addEventListener('site-auth-change', () => {
    revision += 1;
    ownerId = '';
    closeWatcher();
    const session = getRememberedSession();
    publishAccount(session);
    send(session ? 'loading' : 'signed-out');
    void refresh();
  });
  window.addEventListener('storage', event => {
    if (event.key === 'mywebsite.todo-theme.v1') { location.reload(); return; }
    if (event.key !== null && event.key !== 'mywebsite.site-auth-session.v1') return;
    revision += 1;
    ownerId = '';
    closeWatcher();
    send('loading');
    void refresh();
  });
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent) return;
    if (event.data?.type === 'personal-plan-calendar-refresh') void refresh();
    if (event.data?.type === 'calendar-account-open') showAccount();
  });
  const timer = setInterval(() => { void refresh(); }, 30000);
  window.addEventListener('pagehide', () => {
    stopped = true;
    revision += 1;
    clearInterval(timer);
    clearTimeout(debounce);
    closeWatcher();
  });
  showAccount();
  void refresh();
}
