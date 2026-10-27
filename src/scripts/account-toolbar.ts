import { getCloudSession, signInWithPassword, startEmailSignUp, signOut, startPasswordReset, completePasswordReset } from './site-auth';
import { exportAllCloudBackup } from './all-cloud-backup';
import { mountWeeklyBackupReminder } from './weekly-backup-reminder';
import { readCloudBackup, type BackupKind } from './cloud-backup';
import { createProjectBrand, mountProjectBrand } from './project-brand';

// A page registers its own verified sync/backup operations; the toolbar never reads browser data.
export type AccountActions = { sync?: () => Promise<void>; backup?: () => Promise<unknown>; beforeLeave?: () => Promise<void> };
declare global { interface Window { MagicJAccount?: { openLogin: () => void; register: (actions: AccountActions) => void; readBackup: typeof readCloudBackup } } }

export function mountAccountToolbar() {
  if (window.MagicJAccount || window.top !== window.self) return;
  let actions: AccountActions = {}, verify: ((code: string) => Promise<unknown>) | undefined;
  let passwordResetId: string | undefined;
  const style = document.createElement('style');
  style.textContent = `#mj-account{position:relative;z-index:10;display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 18px;background:transparent;color:var(--ink,var(--foreground,var(--text,#f5eee7)));font:13px/1.5 system-ui;border:0;pointer-events:none}#mj-account button,#mj-login button{font:inherit;padding:7px 12px;border:1px solid #ae8764;border-radius:8px;background:#29231e;color:#ffe2c5;cursor:pointer}#mj-account button:disabled,#mj-login button:disabled{opacity:.5;cursor:wait}#mj-account-status{max-width:100%;overflow-wrap:anywhere}#mj-account-status[data-error=true]{color:#ffb4a7;font-weight:700}#mj-login{box-sizing:border-box;width:min(420px,calc(100vw - 32px));padding:24px;border:1px solid #ae8764;border-radius:16px;background:#202020;color:#fff;font:15px/1.6 system-ui;max-height:90dvh;overflow:auto}#mj-login::backdrop{background:#0009}#mj-login label{display:block;margin:12px 0}#mj-login input{box-sizing:border-box;display:block;width:100%;padding:10px;background:#303030;color:#fff;border:1px solid #777;border-radius:7px;font:inherit}#mj-login [role=alert]{color:#ffb4a7;white-space:pre-wrap}#mj-login .mj-actions{display:flex;gap:8px;flex-wrap:wrap}#mj-login [hidden]{display:none!important}@media(max-width:500px){#mj-account{padding:8px 12px;gap:6px}#mj-account-status{flex-basis:100%;text-align:right}}`;
  style.textContent += '#mj-account>*{pointer-events:auto}#mj-account[data-auth=guest] [data-sync],#mj-account[data-auth=guest] [data-backup],#mj-account[data-auth=guest] [data-logout],#mj-account[data-auth=signed-in] [data-login]{display:none!important}';
  style.textContent += '\n.frontpage .universe-header:not(.projects-nav){margin-top:var(--mj-account-visible-height,0px)}';
  style.textContent += '.mj-project-brand{display:inline-flex;align-items:center;gap:9px;flex:none;margin-right:auto;color:inherit;text-decoration:none;font:700 18px/1.3 system-ui;letter-spacing:.12em;white-space:nowrap}.mj-project-brand svg{width:27px;height:27px;flex:none}.mj-project-brand:focus-visible{outline:2px solid #d49162;outline-offset:4px;border-radius:4px}@media(max-width:500px){.mj-project-brand{font-size:17px;gap:7px}.mj-project-brand svg{width:25px;height:25px}}';
  document.head.append(style);
  style.textContent += '@media(min-width:821px){.mj-project-brand[data-native=coffee]{display:none}}';
  style.textContent += '#mj-account .mj-project-brand{color:inherit}body.overview-page #mj-account{color:var(--space-ink,#222733)}';
  // Native modal dialogs sit above custom cursor elements, even at maximum z-index.
  style.textContent += 'html.custom-cursor-enabled dialog:modal,html.custom-cursor-enabled dialog:modal *{cursor:auto!important}html.custom-cursor-enabled dialog:modal :is(input,textarea){cursor:text!important}html.custom-cursor-enabled dialog:modal :is(button,a,select){cursor:pointer!important}html.custom-cursor-enabled:has(dialog:modal) .neon-cursor{visibility:hidden!important}';
  const bar = document.createElement('div'); bar.id = 'mj-account'; bar.dataset.auth = 'guest';
  bar.dataset.home = String(['/', '/index.html', '/officialwebsite/homepage-root.html'].includes(location.pathname));
  bar.innerHTML = '<details class="mj-account-menu"><summary><span id="mj-account-status" role="status" aria-live="polite">正在核实账号…</span></summary><div class="mj-account-actions"><button data-login>登录 / 注册</button><button data-sync>同步</button><button data-backup>备份全部数据</button><button data-logout disabled>退出</button></div></details>';
  const projectBrand = createProjectBrand();
  document.body.prepend(bar);
  if (projectBrand && projectBrand.dataset.project !== 'resume') mountProjectBrand(projectBrand, bar);
  const travelAtlas = projectBrand?.dataset.project === 'travel' && document.querySelector<HTMLElement>('.atlas');
  if (travelAtlas) { travelAtlas.prepend(bar); bar.dataset.embedded = 'travel'; }
  const menu = bar.querySelector<HTMLDetailsElement>('.mj-account-menu')!;
  style.textContent += `
    #mj-account .mj-account-menu{position:relative;max-width:100%;font:inherit}
    #mj-account summary{display:flex;align-items:center;gap:5px;max-width:min(65vw,320px);padding:4px 2px;color:inherit;cursor:pointer;list-style:none}
    #mj-account summary::-webkit-details-marker{display:none}#mj-account summary:after{content:'▾';font-size:11px;opacity:.65}
    #mj-account summary:focus-visible{outline:2px solid #d49162;outline-offset:3px}
    #mj-account-status{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #mj-account .mj-account-actions{position:absolute;right:0;top:calc(100% + 7px);z-index:30;display:grid;min-width:150px;gap:6px;padding:8px;border:1px solid #ad876466;border-radius:11px;background:#201c19;box-shadow:0 8px 24px #0005}
    #mj-account .mj-account-actions button{text-align:left;white-space:nowrap}
    #mj-account[data-native=true]{display:none!important}
    #mj-account[data-home=true]{display:none!important}
    #mj-account[data-embedded=travel]{position:absolute;top:12px;right:18px;z-index:15;padding:0;background:transparent}
    .atlas:has(#mj-account[data-embedded=travel])>.topbar{top:58px}
  `;
  // Page-wide form/header rules must not change the shared dialog's geometry or type.
  style.textContent += `
    #mj-login{position:fixed;inset:0;margin:auto;float:none;transform:none;text-align:left;letter-spacing:normal;word-spacing:normal;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;box-shadow:0 20px 70px #0006}
    #mj-login,#mj-login *{box-sizing:border-box}
    #mj-login form{display:block;position:static;width:100%;max-width:none;margin:0;padding:0;border:0;background:transparent;color:inherit;box-shadow:none}
    #mj-login h2{margin:0 0 8px;padding:0;font:600 22px/1.35 system-ui;color:inherit;letter-spacing:normal;text-transform:none;text-shadow:none}
    #mj-login p{margin:0 0 16px;padding:0;font:inherit;color:inherit;letter-spacing:normal}
    #mj-login label{position:static;float:none;width:auto;font:inherit;letter-spacing:normal;text-transform:none;color:inherit}
    #mj-login input{height:auto;min-height:44px;margin:6px 0 0;letter-spacing:normal;text-align:left;box-shadow:none}
    #mj-login button{position:static;width:auto;height:auto;min-height:40px;margin:0;letter-spacing:normal;text-transform:none;line-height:1.5;box-shadow:none;transform:none}
    #mj-login .mj-actions{margin-top:20px;justify-content:flex-start}
    #mj-login [role=alert]:empty{display:none}
    #mj-account{font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;letter-spacing:normal}
  `;
  menu.querySelector('summary')!.addEventListener('click', event => {
    if (bar.dataset.auth === 'guest') { event.preventDefault(); window.MagicJAccount?.openLogin(); }
  });
  document.addEventListener('click', event => { if (menu.open && !menu.contains(event.target as Node)) menu.open = false; });
  // Fixed navigation does not follow the account bar's normal document flow.
  // Reserve only the part of the bar still visible, including wrapped mobile rows.
  const updateHeaderSpace = () => {
    const rect = bar.getBoundingClientRect();
    const visible = bar.dataset.embedded ? 0 : rect.height ? bar.offsetHeight * Math.max(0, Math.min(1, rect.bottom / rect.height)) : 0;
    document.documentElement.style.setProperty('--mj-account-visible-height', `${visible}px`);
  };
  new ResizeObserver(updateHeaderSpace).observe(bar);
  window.addEventListener('scroll', updateHeaderSpace, { passive: true });
  window.addEventListener('resize', updateHeaderSpace);
  updateHeaderSpace();
  const dialog = document.createElement('dialog'); dialog.id = 'mj-login';
  dialog.innerHTML = '<form><h2>登录网站账号</h2><p>本站页面共享登录状态，有效期30天。</p><label>邮箱<input name="email" type="email" autocomplete="username" required></label><label>密码<input name="password" type="password" autocomplete="current-password" required></label><label hidden data-code>邮箱验证码<input name="code" autocomplete="one-time-code"></label><p role="alert"></p><div class="mj-actions"><button type="submit">登录</button><button type="button" data-register>注册新账号</button><button type="button" data-close>取消</button></div></form>';
  document.body.append(dialog);
  // Reuse a page's existing account entry, including controls rendered after startup.
  const nativeSelector = '[data-action="cloud-login"],#studioAccount,#login-open,#fund-auth-link,[data-action="open-auth"],[data-action="auth-signout"],[data-action="open-login"],[data-calendar-login],[data-site-auth-login]';
  const findNativeLogin = () => [...document.querySelectorAll<HTMLElement>(nativeSelector)]
    .find(element => !element.closest('#mj-account,dialog,[role=dialog]'));
  const updateNativeEntry = () => {
    const value = String(Boolean(findNativeLogin()));
    if (bar.dataset.native !== value) bar.dataset.native = value;
  };

  new MutationObserver(updateNativeEntry).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden','class','style'] });
  updateNativeEntry();
  let authRevision = 0;
  const status = bar.querySelector<HTMLElement>('[role=status]')!;
  const message = dialog.querySelector<HTMLElement>('[role=alert]')!;
  const field = (name: string) => dialog.querySelector<HTMLInputElement>(`[name=${name}]`)!;
  const say = (text: string, error = false) => { status.textContent = text; status.dataset.error = String(error); };
  const reportError = (error: unknown) => {
    const sessionNotice = (error as { code?: string })?.code === 'SITE_AUTH_REQUIRED';
    status.title = error instanceof Error ? error.message : '操作失败，请重试';
    say(sessionNotice ? '未登录 · 登录 / 注册' : '账号连接异常 · 重试', !sessionNotice);
    if (bar.dataset.native === 'true') {
      const native = findNativeLogin();
      if (native) native.title = status.title;
    }
  };
  const reconcile = async () => {
    const revision = ++authRevision;
    let session;
    try { session = await getCloudSession(); }
    catch (error) {
      if ((error as { code?: string })?.code === 'SITE_AUTH_REQUIRED') bar.dataset.auth = 'guest';
      throw error;
    }
    // Another bundle may publish sign-in while this SDK check is still pending.
    if (revision !== authRevision) return session;
    bar.dataset.auth = session ? 'signed-in' : 'guest';
    say(session ? `已登录 · ${session.account}` : '未登录 · 登录 / 注册');
    bar.querySelector<HTMLButtonElement>('[data-logout]')!.disabled = !session;
    return session;
  };
  const run = async (operation: () => Promise<unknown>) => {
    const buttons = [...bar.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
    try { menu.open = false; await operation(); } catch (error) { reportError(error); }
    finally { buttons.forEach(b => b.disabled = false); }
  };
  window.MagicJAccount = {
    readBackup: (kind: BackupKind) => readCloudBackup(kind),
    openLogin: () => { message.textContent = ''; if (!dialog.open) dialog.showModal(); },
    register: next => { actions = { ...actions, ...next }; }
  };
  // Some pages open their native login after an asynchronous session check.
  // Transfer that request to the shared dialog instead of stacking two modals.
  const adoptNativeLogin = () => {
    const native = [...document.querySelectorAll<HTMLDialogElement>('.todo-login-modal[open],[data-login-modal][open],#login-dialog[open]')];
    if (!native.length) return;
    native.forEach(modal => modal.close());
    window.MagicJAccount!.openLogin();
  };
  new MutationObserver(adoptNativeLogin).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
  adoptNativeLogin();
  bar.querySelector<HTMLButtonElement>('[data-login]')!.onclick = () => window.MagicJAccount!.openLogin();
  dialog.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => dialog.close();
  const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = '忘记密码';
  dialog.querySelector('.mj-actions')!.append(reset);
  reset.onclick = async () => {
    reset.disabled = true;
    try {
      if (!field('email').reportValidity()) return;
      passwordResetId = await startPasswordReset(field('email').value.trim()); verify = undefined;
      dialog.querySelector<HTMLElement>('[data-code]')!.hidden = false;
      dialog.querySelector<HTMLButtonElement>('[type=submit]')!.textContent = '重置密码并登录';
      message.textContent = '请填写邮箱验证码和新密码（至少8位）。';
    } catch (error) { message.textContent = error instanceof Error ? error.message : '请求失败'; }
    finally { reset.disabled = false; }
  };
  bar.querySelector<HTMLButtonElement>('[data-sync]')!.onclick = () => void run(async () => {
    if (!await reconcile()) { window.MagicJAccount!.openLogin(); return; }
    say('正在同步云端…');
    if (actions.sync) await actions.sync();
    else { location.reload(); return; }
    say('云端同步完成');
  });
  bar.querySelector<HTMLButtonElement>('[data-logout]')!.onclick = () => void run(async () => {
    await actions.beforeLeave?.(); await signOut(); await reconcile();
  });
  const backupAll = () => run(async () => {
    if (!await reconcile()) { window.MagicJAccount!.openLogin(); return; }
    await actions.beforeLeave?.();
    await exportAllCloudBackup(text => say(text));
    say('全部云端数据 Excel 已导出');
  });
  bar.querySelector<HTMLButtonElement>('[data-backup]')!.onclick = () => void backupAll();
  mountWeeklyBackupReminder(backupAll);
  dialog.querySelector<HTMLButtonElement>('[data-register]')!.onclick = async () => {
    const register = dialog.querySelector<HTMLButtonElement>('[data-register]')!;
    register.disabled = true;
    message.textContent = '';
    try {
      if (!dialog.querySelector('form')!.reportValidity()) return;
      if (field('password').value.length < 8) throw new Error('注册密码至少8位');
      passwordResetId = undefined;
      verify = await startEmailSignUp(field('email').value.trim(), field('password').value);
      dialog.querySelector<HTMLElement>('[data-code]')!.hidden = false;
      dialog.querySelector<HTMLButtonElement>('[type=submit]')!.textContent = '验证并登录';
      message.textContent = '验证码已发送，请查收邮箱。';
    } catch (error) { message.textContent = error instanceof Error ? error.message : '注册失败'; }
    finally { register.disabled = false; }
  };
  dialog.querySelector('form')!.onsubmit = async event => {
    event.preventDefault(); const button = dialog.querySelector<HTMLButtonElement>('[type=submit]')!; button.disabled = true;
    try {
      if (await getCloudSession().catch(() => null)) await actions.beforeLeave?.();
      if (passwordResetId) {
        if (field('password').value.length < 8) throw new Error('新密码至少8位');
        await completePasswordReset(field('email').value.trim(), passwordResetId, field('code').value.trim(), field('password').value);
        await signInWithPassword(field('email').value.trim(), field('password').value);
      } else if (verify) await verify(field('code').value.trim());
      else await signInWithPassword(field('email').value.trim(), field('password').value);
      field('password').value = ''; verify = undefined; passwordResetId = undefined;
      dialog.querySelector<HTMLElement>('[data-code]')!.hidden = true;
      dialog.querySelector<HTMLButtonElement>('[type=submit]')!.textContent = '登录';
      dialog.close(); await reconcile();
    } catch (error) { message.textContent = error instanceof Error ? error.message : '登录失败'; }
    finally { button.disabled = false; }
  };
  window.addEventListener('site-auth-change', () => { void reconcile().catch(reportError); });
  window.addEventListener('focus', () => { void reconcile().catch(reportError); });
  // Existing links to the old account page become in-place login, not navigation.
  document.addEventListener('click', event => {
    const native = (event.target as Element)?.closest<HTMLElement>(nativeSelector);
    if (native && bar.dataset.auth === 'guest' && !native.closest('#mj-account,#mj-login')) {
      event.preventDefault(); event.stopImmediatePropagation(); window.MagicJAccount!.openLogin(); return;
    }
    const target = (event.target as Element)?.closest<HTMLElement>('[data-site-auth-login],a');
    if (target && (target.hasAttribute('data-site-auth-login') || (/注册|登录|找回.*密码/.test(target.textContent || '') && target.getAttribute('href')?.includes('/planning/todo')))) {
      event.preventDefault(); event.stopImmediatePropagation(); window.MagicJAccount!.openLogin();
    }
  }, true);
  void reconcile().catch(reportError);
  window.dispatchEvent(new Event('magicj-account-ready'));
}
