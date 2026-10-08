// Browser build: node --input-type=module -e "import('esbuild').then(m=>m.build({entryPoints:['src/scripts/inspiration-studio-cloud.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'public/inspiration-studio-cloud.js',minify:true}))"
import { getCloudDb, getCloudSession, signInWithPassword, signOut } from './site-auth';
import type { CloudSession } from './site-auth';

type Snapshot = { items: unknown[]; tree: unknown[]; bookmarks: unknown[] };
type Store = { snapshot(): Snapshot; replace(data: Snapshot): void; setReady(ready: boolean): void };
type StudioWindow = Window & { InspirationStudioStore?: Store };
const studioWindow = window as StudioWindow;
const collection = getCloudDb().collection('officialWebsiteInspirationStudios');
const empty = (): Snapshot => ({ items: [], tree: [], bookmarks: [] });
const status = document.getElementById('syncStatus')!;
const account = document.getElementById('studioAccount')!;
let session: CloudSession | null = null;
let revision = 0;
let exists = false;
let epoch = 0;
let busy = false;
let loading = false;
let confirmed = empty();
const store = () => studioWindow.InspirationStudioStore!;
const clone = (data: Snapshot) => JSON.parse(JSON.stringify(data)) as Snapshot;
const check = (result: any) => {
  if (!result || result.error || result.code) throw new Error(result?.error?.message || result?.message || '云端请求失败');
  return result;
};
const message = (error: unknown) => error instanceof Error ? error.message : '同步失败';

async function load() {
  if (busy) return;
  busy = true;
  loading = true;
  const token = ++epoch;
  store().setReady(false);
  status.textContent = '正在同步…';
  try {
    const next = await getCloudSession();
    if (token !== epoch) return;
    if (next?.uid !== session?.uid) { store().replace(empty()); confirmed = empty(); }
    session = next;
    account.textContent = session?.account || '登录';
    document.getElementById('studioLogout')!.classList.toggle('hidden', !session);
    if (!session) { store().replace(empty()); status.textContent = '登录后同步'; return; }
    const result = check(await collection.doc(session.uid).get());
    if (token !== epoch) return;
    const record = Array.isArray(result.data) ? result.data[0] : result.data;
    exists = Boolean(record);
    revision = record?.revision || 0;
    if (record && (record.ownerId !== session.uid || record.schemaVersion !== 1 || !Number.isInteger(record.revision))) throw new Error('云端数据格式异常，请勿覆盖');
    const data = record ? JSON.parse(record.payload) : empty();
    store().replace(data);
    confirmed = clone(store().snapshot());
    store().setReady(true);
    status.textContent = '已同步';
  } catch (error) { status.textContent = '同步失败：' + message(error); }
  finally { busy = false; loading = false; }
}

async function save() {
  if (busy || !session) return;
  busy = true;
  store().setReady(false);
  const uid = session.uid, token = epoch;
  const data = clone(store().snapshot());
  status.textContent = '正在保存…';
  try {
    const actual = await getCloudSession();
    if (actual?.uid !== uid || token !== epoch) throw new Error('登录账号已改变，请重新同步');
    const payload = { ownerId: uid, schemaVersion: 1, payload: JSON.stringify(data), revision: revision + 1, updatedAt: new Date().toISOString() };
    if (exists) {
      const result = check(await collection.where({ _id: uid, ownerId: uid, revision }).update(payload));
      if ((result.updated ?? result.data?.updated) !== 1) throw new Error('其他设备已更新，请点击同步后重试');
    } else { check(await collection.add({ _id: uid, ...payload })); exists = true; }
    if (token !== epoch) return;
    revision += 1;
    confirmed = data;
    status.textContent = '已保存至账号';
    store().setReady(true);
  } catch (error) {
    if (token === epoch) { store().replace(confirmed); status.textContent = '未保存：' + message(error); }
  } finally { busy = false; }
}
window.addEventListener('inspiration-studio-change', () => { void save(); });
window.addEventListener('site-auth-change', (event) => {
  const next = (event as CustomEvent<CloudSession | null>).detail;
  if (next?.uid !== session?.uid) { store().replace(empty()); confirmed = empty(); }
  if (loading) return;
  epoch += 1;
  store().setReady(false);
  if (!busy) void load();
  else status.textContent = '账号已改变，请点击同步';
});
window.addEventListener('focus', () => { if (!busy) void load(); });
window.addEventListener('storage', event => {
  if (event.key === 'mywebsite.site-auth-session.v1') { store().replace(empty()); confirmed = empty(); epoch += 1; store().setReady(false); if (!busy) void load(); }
});
document.getElementById('studioSync')!.onclick = () => { void load(); };
document.getElementById('studioAccount')!.onclick = () => {
  if (!session) (document.getElementById('studioLogin') as HTMLDialogElement).showModal();
};
document.getElementById('studioLoginCancel')!.onclick = () => (document.getElementById('studioLogin') as HTMLDialogElement).close();
document.getElementById('studioLoginForm')!.onsubmit = async event => {
  event.preventDefault();
  const button = document.getElementById('studioLoginSubmit') as HTMLButtonElement;
  button.disabled = true;
  try {
    await signInWithPassword((document.getElementById('studioEmail') as HTMLInputElement).value.trim(), (document.getElementById('studioPassword') as HTMLInputElement).value);
    (document.getElementById('studioPassword') as HTMLInputElement).value = '';
    (document.getElementById('studioLogin') as HTMLDialogElement).close();
    await load();
  } catch (error) { document.getElementById('studioLoginError')!.textContent = message(error); }
  finally { button.disabled = false; }
};
document.getElementById('studioLogout')!.onclick = async () => {
  if (busy) return;
  store().setReady(false);
  try { await signOut(); await load(); } catch (error) { status.textContent = message(error); }
};
if (studioWindow.InspirationStudioStore) void load();
