import { getCloudDb, getCloudSession, signInWithPassword, signOut, cloudErrorMessage } from './site-auth';
import type { CloudSession } from './site-auth';

type FavoritesPayload = {
  version: number;
  favorites: Array<Record<string, unknown>>;
  positions: Record<string, unknown>;
  home: Record<string, unknown>;
  notes: Record<string, string>;
  arranged: Record<string, boolean>;
  trash: Record<string, number>;
  deleted: Record<string, boolean>;
  categoryResearch: Record<string, unknown>;
};
type AccountUI = { load(payload?: Partial<FavoritesPayload>): void; snapshot(): FavoritesPayload; clear(): void };
declare global {
  interface Window { dianpingAccountUI: AccountUI; dianpingAccountChanged?: () => void }
}

const collection = getCloudDb().collection('officialWebsiteDianpingFavorites');
let session: CloudSession | null = null;
let generation = 0;
let saving: Promise<void> | null = null;
let pending = false;
let timer: ReturnType<typeof setTimeout> | undefined;

const style = document.createElement('style');
style.textContent = `.account-locked .topbar,.account-locked .layout,.account-locked .account-badge{display:none!important}.account-login{min-height:100dvh;display:grid;place-items:center;padding:24px;background:var(--bg)}.account-login[hidden]{display:none}.account-login form{width:min(100%,390px);padding:28px;background:#fff;border:2px solid var(--ink);border-radius:14px;box-shadow:4px 4px 0 var(--ink)}.account-login h1{font-size:24px;margin:0 0 12px}.account-login p{font-size:14px;line-height:1.6}.account-login label{display:block;margin-top:16px;font-size:14px}.account-login input{display:block;width:100%;padding:10px;margin-top:6px;border:1px solid var(--line);border-radius:6px}.account-login button{width:100%;margin-top:20px;padding:11px;background:var(--ink);color:#fff;border-radius:6px}.account-login button:disabled{opacity:.6}.account-login [role=status]{min-height:24px;color:var(--muted)}.account-badge{position:relative;flex:0 0 auto;max-width:100%;justify-content:flex-start;padding:10px 14px;border:1px solid var(--line);border-radius:9px;background:#fff;box-shadow:0 3px 12px #0002;font-size:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.account-badge button{border:1px solid var(--line);border-radius:5px;padding:3px 6px}.account-badge span{overflow-wrap:anywhere}.account-identity{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px;font-size:14px;font-weight:700;margin-right:auto}.account-identity small{font-size:12px;font-weight:400;color:var(--muted)}`;
document.head.append(style);
const login = document.createElement('section');
login.className = 'account-login';
login.innerHTML = `<form><h1>我的大众点评收藏</h1><p>使用网站账号登录，查看和管理自己的收藏。</p><label>邮箱<input name="email" type="email" autocomplete="username" required></label><label>密码<input name="password" type="password" autocomplete="current-password" required></label><button type="submit">登录</button><p role="status" aria-live="polite">正在检查网站登录状态…</p><a href="/officialwebsite/topics/space/planning/todo/">注册或找回网站账号密码</a></form>`;
document.body.append(login);
const badge = document.createElement('div');
badge.className = 'account-badge';
badge.innerHTML = '<div class="account-identity"><small>已登录 · 当前账号：</small><span data-account></span></div><span data-sync role="status" aria-live="polite"></span><button type="button" data-retry hidden>重试保存</button><button type="button" data-logout>退出登录</button>';
const content = document.querySelector('.sidebar-bottom');
if (content) content.append(badge);
else document.body.prepend(badge);
const form = login.querySelector('form')!;
const message = login.querySelector<HTMLElement>('[role=status]')!;
const sync = badge.querySelector<HTMLElement>('[data-sync]')!;
const retry = badge.querySelector<HTMLButtonElement>('[data-retry]')!;

function assertResult(result: any) {
  if (result?.error || (result?.code && result.code !== 'SUCCESS')) throw new Error(result.error?.message || result.message || '云端请求失败');
  return result;
}
function readRecord(result: any): Record<string, any> | null {
  assertResult(result);
  const data = result?.data;
  return Array.isArray(data) ? data[0] || null : data && typeof data === 'object' ? data : null;
}
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
function lock(text: string) {
  if (!login.isConnected) document.body.append(login);
  document.body.classList.add('account-locked');
  login.hidden = false;
  message.textContent = text;
}
function showSync(text: string, failed = false) {
  sync.textContent = text;
  retry.hidden = !failed;
}

async function activate(next: CloudSession | null) {
  const revision = ++generation;
  clearTimeout(timer);
  pending = false;
  session = null;
  window.dianpingAccountUI.clear();
  lock(next ? '正在加载账号收藏…' : '请登录网站账号。');
  if (!next) return;
  try {
    const current = await getCloudSession();
    if (revision !== generation) return;
    if (!current || current.uid !== next.uid) throw new Error('网站登录已失效，请重新登录。');
    const record = readRecord(await collection.doc(current.uid).get());
    if (revision !== generation) return;
    if (record && record.ownerId !== current.uid) throw new Error('收藏记录与当前账号不匹配。');
    window.dianpingAccountUI.load(record?.payload || {});
    session = current;
    badge.querySelector<HTMLElement>('[data-account]')!.textContent = current.account;
    showSync('已从云端加载');
    login.hidden = true;
    login.remove();
    document.body.classList.remove('account-locked');
  } catch (error) { if (revision === generation) lock(cloudErrorMessage(error, '账号收藏加载失败，请重试登录。')); }
}

async function save() {
  if (saving) return saving;
  if (!session || !pending) return;
  const owner = session;
  const revision = generation;
  saving = (async () => {
    while (pending && session?.uid === owner.uid && generation === revision) {
      pending = false;
      const payload = structuredClone(window.dianpingAccountUI.snapshot());
      const updatedAt = new Date().toISOString();
      showSync('正在保存…');
      try {
        const current = await getCloudSession();
        if (!current || current.uid !== owner.uid || generation !== revision) throw new Error('登录状态已改变，修改未保存。');
        assertResult(await collection.doc(owner.uid).set({ ownerId: owner.uid, payload, updatedAt }));
        const verified = readRecord(await collection.doc(owner.uid).get());
        if (verified?.ownerId !== owner.uid || verified?.updatedAt !== updatedAt || JSON.stringify(canonical(verified.payload)) !== JSON.stringify(canonical(payload))) throw new Error('云端保存校验失败，请重试。');
        if (generation === revision) showSync('已保存到云端');
      } catch (error) {
        if (generation === revision) { pending = true; showSync(cloudErrorMessage(error, '修改未保存'), true); }
        break;
      }
    }
  })().finally(() => { saving = null; });
  return saving;
}
window.dianpingAccountChanged = () => {
  if (!session) return;
  pending = true;
  showSync('修改待保存');
  clearTimeout(timer);
  timer = setTimeout(() => { void save(); }, 500);
};
retry.onclick = () => { void save(); };
badge.querySelector<HTMLButtonElement>('[data-logout]')!.onclick = async () => {
  await save();
  if (pending) { showSync('还有未保存修改，请重试保存后退出。', true); return; }
  try { await signOut(); await activate(null); } catch (error) { showSync(cloudErrorMessage(error, '退出失败')); }
};
form.onsubmit = async event => {
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('button')!;
  button.disabled = true;
  message.textContent = '正在登录…';
  const email = form.querySelector<HTMLInputElement>('[name=email]')!.value.trim();
  const password = form.querySelector<HTMLInputElement>('[name=password]')!;
  try { const current = await signInWithPassword(email, password.value); password.value = ''; await activate(current); }
  catch (error) { message.textContent = cloudErrorMessage(error, '登录失败'); }
  finally { button.disabled = false; }
};
window.addEventListener('site-auth-change', event => {
  const next = (event as CustomEvent<CloudSession | null>).detail;
  if (!next || (session && next.uid !== session.uid)) void activate(next);
});
window.addEventListener('beforeunload', event => { if (pending || saving) { event.preventDefault(); event.returnValue = ''; } });
lock('正在检查网站登录状态…');
void getCloudSession().then(activate).catch(error => {
  if (/credentials not found/i.test(cloudErrorMessage(error, ''))) void activate(null);
  else lock('无法检查网站登录状态，请稍后重试。');
});
