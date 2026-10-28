// Browser build: node --input-type=module -e "import('esbuild').then(m=>m.build({entryPoints:['src/scripts/inspiration-studio-cloud.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:'public/inspiration-studio-cloud.js',minify:true}))"
import { getCloudDb, getCloudSession, signInWithPassword, signOut } from './site-auth';
import type { CloudSession } from './site-auth';

type Snapshot = { items: unknown[]; tree: unknown[]; bookmarks: unknown[] };
type Store = { snapshot(): Snapshot; replace(data: Snapshot, options?: { resetView: boolean }): void; setReady(ready: boolean): void };
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
type Draft = { uid: string; baseRevision: number; basePayload: string; data: Snapshot; pending?: { revision: number; payload: string } };
const draftPrefix = 'magicj.inspiration-draft.v1:';
const writer = crypto.randomUUID();
let draft: Draft | null = null;
let inherited: { key: string; raw: string }[] = [];
let dirty = false;
let paused = false;
let initialized = false;
let saveDue = false;
let recoveryConflict = false;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
const store = () => studioWindow.InspirationStudioStore!;
const clone = (data: Snapshot) => JSON.parse(JSON.stringify(data)) as Snapshot;
const check = (result: any) => {
  if (!result || result.error || result.code) throw new Error(result?.error?.message || result?.message || '云端请求失败');
  return result;
};
const message = (error: unknown) => {
  const detail = error && typeof error === 'object' && 'message' in error ? error.message : '';
  return typeof detail === 'string' && detail.trim() ? detail.trim().slice(0, 240) : '同步失败';
};
const encode = (data: Snapshot) => JSON.stringify(data);
const keyFor = (uid: string) => draftPrefix + encodeURIComponent(uid) + ':' + writer;
status.hidden = false;
const draftActions = document.createElement('div');
draftActions.className = 'studio-draft-actions';
const downloadDraft = document.createElement('button');
downloadDraft.textContent = '下载本机草稿';
downloadDraft.className = 'secondary';
downloadDraft.type = 'button';
const useCloud = document.createElement('button');
useCloud.textContent = '保留草稿并读取云端';
useCloud.className = 'secondary';
useCloud.type = 'button';
draftActions.append(downloadDraft, useCloud);
document.querySelector('.profile')!.append(draftActions);
const archivedDrafts = () => {
  const values: Draft[] = [];
  if (!session) return values;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith('magicj.inspiration-archive.v1:')) {
      const value = JSON.parse(localStorage.getItem(key)!);
      if (value.uid === session.uid) values.push(value);
    }
  }
  return values;
};
const showActions = () => {
  let archived = false;
  try { archived = archivedDrafts().length > 0; } catch { /* The storage error is reported by writeDraft/load. */ }
  draftActions.style.display = dirty || archived ? 'flex' : 'none';
  useCloud.hidden = !dirty || !paused;
};
showActions();
function stopTimers() {
  clearTimeout(idleTimer); clearTimeout(deadlineTimer);
  idleTimer = undefined; deadlineTimer = undefined; saveDue = false;
}
function writeDraft() {
  if (!draft) return false;
  try {
    localStorage.setItem(keyFor(draft.uid), JSON.stringify(draft));
    if (!recoveryConflict) {
      for (const entry of inherited) if (entry.key !== keyFor(draft.uid) && localStorage.getItem(entry.key) === entry.raw) localStorage.removeItem(entry.key);
      inherited = [];
    }
    return true;
  } catch {
    paused = true; stopTimers(); store().setReady(false);
    status.textContent = '本机草稿保存失败（存储不可用或已满），已暂停编辑；请下载草稿并点击同步保存到云端';
    showActions(); return false;
  }
}
function clearDrafts() {
  if (!draft) return;
  // Remove only the exact drafts incorporated into the verified cloud snapshot.
  localStorage.removeItem(keyFor(draft.uid));
  for (const entry of inherited) if (localStorage.getItem(entry.key) === entry.raw) localStorage.removeItem(entry.key);
  inherited = [];
}
function schedule() {
  if (!dirty || paused) return;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { idleTimer = undefined; saveDue = true; void save(); }, 5000);
  deadlineTimer ??= setTimeout(() => { deadlineTimer = undefined; saveDue = true; void save(); }, 10000);
}
function changed() {
  if (!session || !draft) return;
  draft.data = clone(store().snapshot());
  dirty = true;
  showActions();
  if (!writeDraft()) return;
  if (!paused) {
    status.textContent = busy ? '正在保存，后续修改已存本机草稿' : '已存本机草稿，等待同步';
    schedule();
  }
}
function recover(uid: string) {
  inherited = [];
  const found: Draft[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (!key.startsWith(draftPrefix + encodeURIComponent(uid) + ':')) continue;
    const raw = localStorage.getItem(key)!;
    const value = JSON.parse(raw) as Draft;
    if (value.uid !== uid || !Number.isInteger(value.baseRevision) || typeof value.basePayload !== 'string' || !value.data) throw new Error('本机草稿格式异常，已保留原件，请勿清除浏览器数据');
    inherited.push({ key, raw }); found.push(value);
  }
  if (!found.length) return;
  draft = cloneDraft(found[0]);
  store().replace(draft.data);
  dirty = true; initialized = true;
  if (found.some(value => encode(value.data) !== encode(draft!.data))) {
    paused = true; recoveryConflict = true;
    throw new Error('发现多个不同的本机草稿，已保留全部版本；请下载草稿核对，或保留草稿并读取云端');
  }
}
const cloneDraft = (value: Draft): Draft => JSON.parse(JSON.stringify(value));
function reconcile(record: any) {
  if (record && (record.ownerId !== session!.uid || record.schemaVersion !== 1 || !Number.isInteger(record.revision))) throw new Error('云端数据格式异常，请勿覆盖');
  const remoteRevision = record?.revision || 0;
  const remotePayload = record?.payload || encode(empty());
  const data = JSON.parse(remotePayload) as Snapshot;
  if (dirty && draft) {
    if (draft.pending && remoteRevision === draft.pending.revision && remotePayload === draft.pending.payload) {
      draft.baseRevision = remoteRevision; draft.basePayload = remotePayload; delete draft.pending;
    }
    if (remoteRevision !== draft.baseRevision || remotePayload !== draft.basePayload) throw new Error('其他设备或窗口已更新，存在冲突；本机草稿和云端版本均已保留，请勿直接覆盖');
    delete draft.pending;
    revision = remoteRevision; exists = Boolean(record);
    if (encode(draft.data) === remotePayload) {
      clearDrafts(); dirty = false;
    } else if (!writeDraft()) throw new Error('无法持久保存本机草稿，请先下载备份');
  } else {
    store().replace(data);
    revision = remoteRevision; exists = Boolean(record);
  }
  draft = { uid: session!.uid, baseRevision: revision, basePayload: remotePayload, data: clone(store().snapshot()) };
}
async function load() {
  if (busy) return;
  stopTimers(); busy = true;
  const token = ++epoch;
  store().setReady(false);
  status.textContent = '正在同步…';
  try {
    const next = await getCloudSession();
    if (token !== epoch) return;
    if (next?.uid !== session?.uid) {
      store().replace(empty(), { resetView: true }); draft = null; dirty = false; inherited = []; initialized = false;
    }
    session = next;
    account.textContent = session?.account || '登录';
    document.getElementById('studioLogout')!.classList.toggle('hidden', !session);
    if (!session) { store().replace(empty(), { resetView: true }); status.textContent = '登录后同步'; return; }
    paused = false;
    if (!initialized) recover(session.uid);
    if (recoveryConflict) throw new Error('多个本机草稿存在冲突，请先下载核对，或保留草稿并读取云端');
    const result = check(await collection.doc(session.uid).get());
    if (token !== epoch) return;
    const record = Array.isArray(result.data) ? result.data[0] : result.data;
    reconcile(record);
    initialized = true; paused = false;
    store().setReady(true);
    status.textContent = dirty ? '已恢复本机草稿，等待同步' : '已同步';
  } catch (error) {
    if (token !== epoch) return;
    paused = true;
    status.textContent = '同步失败：' + message(error) + '；点击同步重试';
    // A recovered draft remains editable offline; no cloud overwrite is attempted.
    if (dirty && draft) store().setReady(true);
  } finally {
    busy = false; showActions();
    if (token !== epoch) void load();
    else if (dirty && !paused) schedule();
  }
}
async function save() {
  if (busy || !session || !draft || !dirty || paused) return;
  stopTimers(); busy = true;
  const uid = session.uid, token = epoch;
  const data = clone(store().snapshot());
  const payload = { ownerId: uid, schemaVersion: 1, payload: encode(data), revision: revision + 1, updatedAt: new Date().toISOString() };
  // Persist the attempted revision before the request, so a lost response can be reconciled after reload.
  draft.pending = { revision: payload.revision, payload: payload.payload };
  if (!writeDraft()) { busy = false; return; }
  status.textContent = '正在后台保存…';
  try {
    if ((await getCloudSession())?.uid !== uid || token !== epoch) throw new Error('登录账号已改变，请重新同步');
    if (exists) {
      const result = check(await collection.where({ _id: uid, ownerId: uid, revision }).update(payload));
      if ((result.updated ?? result.data?.updated) !== 1) throw new Error('其他设备已更新，存在冲突，请点击同步核对');
    } else { check(await collection.add({ _id: uid, ...payload })); }
    if (token !== epoch) return;
    const verified = check(await collection.doc(uid).get());
    const saved = Array.isArray(verified.data) ? verified.data[0] : verified.data;
    if ((await getCloudSession())?.uid !== uid || saved?.ownerId !== uid || saved?.schemaVersion !== 1 || saved?.revision !== payload.revision || saved?.payload !== payload.payload) throw new Error('云端保存核验失败，请点击同步核对');
    if (token !== epoch) return;
    revision = payload.revision; exists = true;
    draft.baseRevision = revision; draft.basePayload = payload.payload; delete draft.pending;
    // Do not replace the view or discard edits made while this request was in flight.
    if (encode(draft.data) === payload.payload) {
      clearDrafts(); dirty = false;
      status.textContent = '已保存至账号';
    } else if (writeDraft()) status.textContent = '前批已核验，后续修改已存本机草稿';
  } catch (error) {
    if (token === epoch) {
      paused = true; stopTimers();
      status.textContent = '未保存：' + message(error) + '；本机草稿已保留，点击同步重试';
    }
  } finally {
    busy = false; showActions();
    if (token !== epoch) void load();
    else if (dirty && !paused) {
      // A deadline that elapsed during an upload must run as soon as that upload finishes.
      if (saveDue) void save();
    }
  }
}
async function flush() {
  if (busy) throw new Error('正在保存或同步，请稍候；本机草稿已保留');
  if (paused && dirty) throw new Error('存在未同步草稿，请点击同步处理，或下载草稿备份');
  if (dirty) await save();
  if (dirty || busy) throw new Error('仍有未同步草稿，请完成同步后重试');
}
window.addEventListener('inspiration-studio-change', changed);
function accountChanged() {
  stopTimers(); epoch += 1;
  store().setReady(false);
  store().replace(empty(), { resetView: true });
  session = null; draft = null; dirty = false; inherited = []; initialized = false; paused = false; recoveryConflict = false;
  showActions();
  if (!busy) void load();
}
window.addEventListener('site-auth-change', event => {
  if ((event as CustomEvent<CloudSession | null>).detail?.uid !== session?.uid) accountChanged();
});
window.addEventListener('storage', event => {
  if (event.key === 'mywebsite.site-auth-session.v1') {
    try { if (JSON.parse(event.newValue || 'null')?.uid === session?.uid) return; } catch { /* Revalidate malformed session. */ }
    accountChanged();
  }
});
window.addEventListener('beforeunload', event => {
  if (!dirty) return;
  writeDraft(); event.preventDefault();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) { writeDraft(); if (!paused) void save(); } });
downloadDraft.onclick = () => {
  if (!draft) return;
  const versions = [...inherited.map(entry => JSON.parse(entry.raw)), ...archivedDrafts()];
  const blob = new Blob([JSON.stringify({ ...draft.data, localDrafts: [...versions, draft] }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = 'AI灵感站-未同步草稿.json'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
useCloud.onclick = () => {
  if (!draft || busy) return;
  try {
    if (!writeDraft()) return;
    const entries = [...inherited, { key: keyFor(draft.uid), raw: localStorage.getItem(keyFor(draft.uid))! }];
    // Archive first. Never delete a draft that another window has changed.
    for (const entry of entries) localStorage.setItem('magicj.inspiration-archive.v1:' + crypto.randomUUID(), entry.raw);
    for (const entry of entries) if (localStorage.getItem(entry.key) === entry.raw) localStorage.removeItem(entry.key);
    dirty = false; draft = null; inherited = []; initialized = false; recoveryConflict = false;
    void load();
  } catch (error) { status.textContent = '草稿归档失败：' + message(error) + '；未读取云端，请先下载草稿'; }
};
document.getElementById('studioSync')!.onclick = async () => {
  await load();
  if (dirty && !paused) await save();
};

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
  try { await flush(); store().setReady(false); await signOut(); await load(); }
  catch (error) { status.textContent = message(error); }
};
if (studioWindow.InspirationStudioStore) void load();
const registerAccount = () => window.MagicJAccount?.register({
  beforeLeave: flush,
  sync: async () => { await load(); if (paused) throw new Error(status.textContent || '云端同步未完成'); await flush(); },
  backup: async () => {
    await flush();
    const { readCloudBackup } = await import('./cloud-backup');
    return readCloudBackup('inspiration');
  }
});
window.addEventListener('magicj-account-ready', registerAccount);
registerAccount();
