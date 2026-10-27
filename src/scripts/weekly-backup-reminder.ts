export function mondayBackupKey(now = new Date()): string | null {
  const date = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return date.getUTCDay() === 1 ? date.toISOString().slice(0, 10) : null;
}

export function mountWeeklyBackupReminder(backup: () => Promise<void>) {
  const storageKey = 'magicj.all-cloud-backup.reminded-monday.v1';
  let shown: string | null = null;
  const check = () => {
    const today = mondayBackupKey();
    if (!today || document.visibilityState === 'hidden' || document.querySelector('dialog[open]') || shown === today) return;
    try { if (localStorage.getItem(storageKey) === today) return; } catch { /* Current-page deduplication remains available. */ }
    shown = today;
    try { localStorage.setItem(storageKey, today); } catch { /* Storage is not a backup data source. */ }
    const dialog = document.createElement('dialog'); dialog.className = 'mj-backup-reminder';
    dialog.style.cssText = 'position:fixed;inset:0;margin:auto;box-sizing:border-box;width:min(460px,calc(100vw - 32px));max-height:85dvh;overflow:auto;padding:24px;border:1px solid #ae8764;border-radius:16px;background:#202020;color:#fff;font:15px/1.7 system-ui';
    dialog.innerHTML = '<h2>每周备份提醒</h2><p>今天是周一。建议备份个人待办、生活计划、家安、AI灵感站、微读圣经、小组查经、基金、股票和大众点评收藏。</p><p>确认输入已保存到云端后，一次下载全部数据到一个 Excel，包含家安附件原件。未登录时请先登录。</p><button type="button" data-export>备份全部云端数据</button> <button type="button" data-later>稍后再说</button><p role="alert"></p>';
    dialog.querySelectorAll<HTMLElement>('h2,p').forEach(el => el.style.margin = '0 0 16px');
    dialog.querySelectorAll<HTMLButtonElement>('button').forEach(el => el.style.cssText = 'font:inherit;padding:9px 12px;margin:0 6px 6px 0;border:1px solid #ae8764;border-radius:8px;background:#29231e;color:#ffe2c5;cursor:pointer');
    document.body.append(dialog); dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('[data-later]')!.onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.querySelector<HTMLButtonElement>('[data-export]')!.onclick = async () => {
      dialog.close(); await backup();
    };
  };
  check();
  const timer = window.setInterval(check, 60 * 1000);
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pagehide', () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); }, { once: true });
}
