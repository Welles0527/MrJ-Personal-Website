import { getCloudSession, signInWithPassword, startEmailSignUp, signOut, startPasswordReset, completePasswordReset } from './site-auth';
import { exportAllCloudBackup } from './all-cloud-backup';
import { mountWeeklyBackupReminder } from './weekly-backup-reminder';
import { readCloudBackup, type BackupKind } from './cloud-backup';

// A page registers its own verified sync/backup operations; the toolbar never reads browser data.
export type AccountActions = { sync?: () => Promise<void>; backup?: () => Promise<unknown>; beforeLeave?: () => Promise<void> };
declare global { interface Window { MagicJAccount?: { openLogin: () => void; register: (actions: AccountActions) => void; readBackup: typeof readCloudBackup } } }

export function mountAccountToolbar() {
  if (window.MagicJAccount || window.top !== window.self) return;
  let actions: AccountActions = {}, verify: ((code: string) => Promise<unknown>) | undefined;
  let passwordResetId: string | undefined;
  const style = document.createElement('style');
  style.textContent = `#mj-account{position:relative;z-index:1000;display:flex;justify-content:flex-end;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 18px;background:#171717;color:#f5eee7;font:13px/1.5 system-ui;border-bottom:1px solid #ffffff20}#mj-account button,#mj-login button{font:inherit;padding:7px 12px;border:1px solid #ae8764;border-radius:8px;background:#29231e;color:#ffe2c5;cursor:pointer}#mj-account button:disabled,#mj-login button:disabled{opacity:.5;cursor:wait}#mj-account-status{max-width:100%;overflow-wrap:anywhere}#mj-account-status[data-error=true]{color:#ffb4a7;font-weight:700}#mj-login{box-sizing:border-box;width:min(420px,calc(100vw - 32px));padding:24px;border:1px solid #ae8764;border-radius:16px;background:#202020;color:#fff;font:15px/1.6 system-ui;max-height:90dvh;overflow:auto}#mj-login::backdrop{background:#0009}#mj-login label{display:block;margin:12px 0}#mj-login input{box-sizing:border-box;display:block;width:100%;padding:10px;background:#303030;color:#fff;border:1px solid #777;border-radius:7px;font:inherit}#mj-login [role=alert]{color:#ffb4a7;white-space:pre-wrap}#mj-login .mj-actions{display:flex;gap:8px;flex-wrap:wrap}#mj-login [hidden]{display:none!important}@media(max-width:500px){#mj-account{padding:8px 12px;gap:6px}#mj-account-status{flex-basis:100%;text-align:right}}`;
  document.head.append(style);
  const bar = document.createElement('div'); bar.id = 'mj-account';
  bar.innerHTML = '<span id="mj-account-status" role="status" aria-live="polite">正在核实账号…</span><button data-login>登录 / 注册</button><button data-sync>同步</button><button data-backup>备份全部数据</button><button data-logout disabled>退出</button>';
  document.body.prepend(bar);
  const dialog = document.createElement('dialog'); dialog.id = 'mj-login';
  dialog.innerHTML = '<form><h2>登录网站账号</h2><p>本站页面共享登录状态，有效期30天。</p><label>邮箱<input name="email" type="email" autocomplete="username" required></label><label>密码<input name="password" type="password" autocomplete="current-password" required></label><label hidden data-code>邮箱验证码<input name="code" autocomplete="one-time-code"></label><p role="alert"></p><div class="mj-actions"><button type="submit">登录</button><button type="button" data-register>注册新账号</button><button type="button" data-close>取消</button></div></form>';
  document.body.append(dialog);
  const status = bar.querySelector<HTMLElement>('[role=status]')!;
  const message = dialog.querySelector<HTMLElement>('[role=alert]')!;
  const field = (name: string) => dialog.querySelector<HTMLInputElement>(`[name=${name}]`)!;
  const say = (text: string, error = false) => { status.textContent = text; status.dataset.error = String(error); };
  const reconcile = async () => {
    const session = await getCloudSession();
    say(session ? `已登录 · ${session.account}` : '未登录');
    bar.querySelector<HTMLButtonElement>('[data-logout]')!.disabled = !session;
    return session;
  };
  const run = async (operation: () => Promise<unknown>) => {
    const buttons = [...bar.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true);
    try { await operation(); } catch (error) { say(error instanceof Error ? error.message : '操作失败，请重试', true); }
    finally { buttons.forEach(b => b.disabled = false); }
  };
  window.MagicJAccount = {
    readBackup: (kind: BackupKind) => readCloudBackup(kind),
    openLogin: () => { message.textContent = ''; if (!dialog.open) dialog.showModal(); },
    register: next => { actions = { ...actions, ...next }; }
  };
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
  window.addEventListener('site-auth-change', () => { void reconcile().catch(error => say(error.message, true)); });
  // Existing links to the old account page become in-place login, not navigation.
  document.addEventListener('click', event => {
    const target = (event.target as Element)?.closest<HTMLElement>('[data-site-auth-login],a');
    if (target && (target.hasAttribute('data-site-auth-login') || (/注册|登录|找回.*密码/.test(target.textContent || '') && target.getAttribute('href')?.includes('/planning/todo')))) {
      event.preventDefault(); event.stopImmediatePropagation(); window.MagicJAccount!.openLogin();
    }
  }, true);
  void reconcile().catch(error => say(error.message, true));
  window.dispatchEvent(new Event('magicj-account-ready'));
}
