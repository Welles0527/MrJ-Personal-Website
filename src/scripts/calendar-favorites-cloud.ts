import { getCloudDb, getCloudSession, getRememberedSession } from './site-auth';

const COLLECTION = 'officialWebsiteSnookerFavorites';
const PREFIX = 'snooker.cloud-favorites.v1:';
const KEYS = ['cue-favorites', 'cue-match-favorites', 'super-calendar-cue-index'];
const safeObject = (value: any) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const text = (value: any, max = 200) => typeof value === 'string' ? value.slice(0, max) : '';
const read = (storage: Storage, key: string, fallback: any) => { try { return JSON.parse(storage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
const result = (response: any) => { if (!response || response.error || response.code) throw new Error(response?.error?.message || response?.message || '收藏云同步失败'); return response.data; };
const signature = (value: any) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))) : item);

// Immutable intent records prevent one device's whole-list save from losing another's edits.
export function reduceFavoriteOperations(operations: any[]) {
  const records: Record<string, any> = {};
  const explicit = new Set(operations.filter(op => ['set', 'remove'].includes(op.action)).map(op => op.key));
  for (const op of [...operations].sort((a,b) => a.clock - b.clock || a._id.localeCompare(b._id))) {
    if (op.action === 'migrate' && explicit.has(op.key)) continue;
    if (op.action === 'remove') delete records[op.key];
    else if (op.action === 'set' || op.action === 'migrate' || (op.action === 'metadata' && records[op.key])) records[op.key] = op.value;
  }
  return records;
}

export function createCalendarFavoriteSync(deps: any) {
  const { storage, db, session, remembered, emit, status, uuid } = deps;
  let owner = text(storage.getItem(PREFIX+'owner')) || 'guest';
  let generation = 0, applying = false, failures = 0;
  let busy: Promise<void> | null = null;
  let remote: any[] = [], pending: any[] = [];
  const readProjection = () => {
    const projection: Record<string, any> = {};
    const index = safeObject(read(storage, KEYS[2], {}));
    const tournaments = read(storage, KEYS[0], []);
    if (Array.isArray(tournaments)) for (const id of tournaments) {
      if (typeof id !== 'string' || !id || id.length > 200) continue;
      const event = safeObject(index[id]);
      projection['tournament:'+id] = { kind:'tournament', id, name:text(event.name), start:text(event.start,10), end:text(event.end,10) };
    }
    for (const [id, raw] of Object.entries(safeObject(read(storage, KEYS[1], {})))) {
      const m = safeObject(raw);
      if (!id || id.length > 400 || !text(m.eventId)) continue;
      projection['match:'+id] = { kind:'match', id, eventId:text(m.eventId), eventName:text(m.eventName), matchId:text(m.matchId), date:text(m.date,10), clock:text(m.clock,5), home:text(m.home), away:text(m.away) };
    }
    return projection;
  };
  let projected = readProjection();
  const cacheKey = (uid: string) => PREFIX+'account:'+encodeURIComponent(uid);
  const persist = () => storage.setItem(cacheKey(owner), JSON.stringify({ projected, pending }));
  const notify = (mode: string, message: string) => status({ mode, message, owner });
  function project(value: Record<string, any>) {
    applying = true;
    try {
      const tournaments: string[] = [], matches: Record<string, any> = {};
      const index = safeObject(read(storage, KEYS[2], {}));
      for (const record of Object.values(value)) {
        if (record.kind === 'tournament') {
          tournaments.push(record.id);
          // Keep locally refreshed tournament metadata when a cloud seed has none.
          index[record.id] = { ...(index[record.id] || {}), ...(record.name ? {name:record.name} : {}), ...(record.start ? {start:record.start,end:record.end || record.start} : {}) };
        } else if (record.kind === 'match') matches[record.id] = record;
      }
      storage.setItem(KEYS[0],JSON.stringify(tournaments));
      storage.setItem(KEYS[1],JSON.stringify(matches));
      storage.setItem(KEYS[2],JSON.stringify(index));
      projected = value;
      persist();
      emit();
    } finally { applying = false; }
    queueMicrotask(()=>capture());
  }
  function switchOwner(next: string) {
    if (next === owner) return;
    persist();
    generation++;
    owner = next;
    remote = [];
    failures = 0;
    const cached = safeObject(read(storage, cacheKey(owner), {}));
    pending = Array.isArray(cached.pending) ? cached.pending : [];
    storage.setItem(PREFIX+'owner',owner);
    project(safeObject(cached.projected));
  }
  function capture() {
    if (applying) return;
    // Sign-out/account changes clear the old projection before accepting another user's edits.
    const hint = remembered()?.uid || 'guest';
    if (hint !== owner) switchOwner(hint);
    const next = readProjection();
    let changed = false;
    for (const key of new Set([...Object.keys(projected),...Object.keys(next)])) {
      if (signature(projected[key]) === signature(next[key])) continue;
      changed = true;
      if (owner !== 'guest') pending.push({ _id:uuid(), key, action:!next[key]?'remove':!projected[key]?'set':'metadata', ...(next[key]?{value:next[key]}:{}) });
    }
    if (!changed) return;
    projected = next;
    persist();
    if (owner === 'guest') notify('local','收藏保存在本机，登录后可同步');
    else { notify('pending','收藏已保留，正在同步…'); void sync(); }
  }
  const valid = (op: any, uid: string) => op?.ownerId === uid && op.schema === 1 && typeof op._id === 'string' && typeof op.key === 'string' && Number.isSafeInteger(op.clock) && ['set','remove','metadata','migrate'].includes(op.action) && (op.action === 'remove' || ['match','tournament'].includes(op.value?.kind));
  async function load(uid: string) {
    const found: any[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = result(await db.collection(COLLECTION).where({ownerId:uid}).orderBy('_id','asc').skip(offset).limit(100).get());
      if (!Array.isArray(page)) throw new Error('收藏数据格式异常');
      if (page.some(op => !valid(op,uid))) throw new Error('收藏云端记录校验失败');
      found.push(...page);
      if (page.length < 100) return found;
    }
  }
  async function checkOwner(uid: string, version: number) {
    if (owner !== uid || generation !== version || remembered()?.uid !== uid) throw new Error('账号已改变，已停止旧账号同步');
    const current = await session();
    if (current?.uid !== uid || generation !== version) throw new Error('登录已失效，请重新登录');
  }
  function sync(): Promise<void> {
    if (busy) return busy;
    const run = async () => {
      const hinted = remembered()?.uid || 'guest';
      switchOwner(hinted);
      if (owner === 'guest') { notify('local','收藏保存在本机，登录后可同步'); return; }
      const uid = owner, version = generation;
      notify('pending','正在读取云端收藏…');
      try {
        await checkOwner(uid,version);
        const loaded = await load(uid);
        await checkOwner(uid,version);
        remote = loaded;
        // Guest data may seed one account only. Migration never overrides a cloud deletion.
        const claimed = storage.getItem(PREFIX+'guest-import-owner');
        const migrationKey = PREFIX+'migrated:'+encodeURIComponent(uid);
        if (!storage.getItem(migrationKey)) {
          const legacy = safeObject(read(storage,cacheKey('guest'),{})).projected || {};
          const known = new Set([...remote,...pending].map(op=>op.key));
          if (!claimed || claimed === uid) {
            for (const [key,value] of Object.entries(legacy)) if (!known.has(key)) pending.push({_id:uuid(),key,action:'migrate',value});
            storage.setItem(PREFIX+'guest-import-owner',uid);
          }
          persist();
          storage.setItem(migrationKey,'1');
        }
        let clock = [...remote,...pending].reduce((max,op)=>Math.max(max,op.clock || 0),0);
        while (pending.length) {
          await checkOwner(uid,version);
          const draft = pending[0];
          if (!draft.clock) { draft.clock = ++clock; persist(); }
          const op = { ...draft, ownerId:uid, schema:1 };
          const existing = result(await db.collection(COLLECTION).where({ownerId:uid,_id:op._id}).orderBy('_id','asc').skip(0).limit(1).get());
          if (!Array.isArray(existing)) throw new Error('收藏核验数据异常');
          if (!existing.length) result(await db.collection(COLLECTION).add(op));
          await checkOwner(uid,version);
          const verified = result(await db.collection(COLLECTION).where({ownerId:uid,_id:op._id}).orderBy('_id','asc').skip(0).limit(1).get());
          const saved = Array.isArray(verified) ? verified[0] : verified;
          if (!saved || signature({key:saved.key,clock:saved.clock,action:saved.action,value:saved.value}) !== signature({key:op.key,clock:op.clock,action:op.action,value:op.value}) || saved.ownerId !== uid) throw new Error('收藏保存核验失败，本机修改已保留');
          remote.push(op);
          pending.shift();
          persist();
        }
        const latest = await load(uid);
        await checkOwner(uid,version);
        remote = latest;
        project(reduceFavoriteOperations([...remote,...pending.map((op,index)=>({...op,clock:op.clock || clock+index+1}))]));
        failures = 0;
        notify('cloud','收藏已同步 · '+new Date().toLocaleTimeString('zh-CN'));
      } catch (error: any) {
        if (owner !== uid || generation !== version) return;
        failures++;
        notify('error',(error?.message || '收藏同步失败')+'；本机修改已保留');
      }
    };
    busy = run().finally(()=>{busy=null;if(pending.length && failures===0)queueMicrotask(()=>void sync());});
    return busy;
  }
  function accountChanged() {
    switchOwner(remembered()?.uid || 'guest');
    // The old request may still be finishing; start the new account only afterwards.
    void (busy || Promise.resolve()).then(()=>sync());
  }
  // Preserve the initial, unscoped favorites as guest data before the first login migration.
  if (!storage.getItem(PREFIX+'owner')) { storage.setItem(PREFIX+'owner',owner); persist(); }
  else { const cached = safeObject(read(storage,cacheKey(owner),{})); pending = Array.isArray(cached.pending)?cached.pending:[]; }
  return { capture, sync, accountChanged, retry:()=>{failures=0;return sync();}, poll:()=>{if(failures<3)return sync();}, getState:()=>({owner,projected,pending,generation,failures}) };
}

export function mountCalendarFavoriteCloud() {
  if (!/\/(super-calendar|snooker-calendar)\//.test(location.pathname)) return;
  let sync: ReturnType<typeof createCalendarFavoriteSync>;
  let lastStatus: any;
  const status = ({ mode, message }: any) => {
    lastStatus={mode,message};
    let node = document.getElementById('snooker-favorites-cloud-status');
    const parent = document.querySelector('.calendar-topbar .calendar-account-tools') || document.getElementById('mj-account');
    if (!parent) return;
    if (!node) { node=document.createElement('span');node.id='snooker-favorites-cloud-status';node.setAttribute('role','status');node.style.cssText='font-size:11px;max-width:100%;overflow-wrap:anywhere';parent.append(node); }
    node.textContent=message;
    node.dataset.status=mode;
    if (mode === 'error') { const button=document.createElement('button');button.textContent='重试收藏同步';button.onclick=()=>void sync.retry();node.append(button); }
  };
  sync=createCalendarFavoriteSync({storage:localStorage,db:getCloudDb(),session:getCloudSession,remembered:getRememberedSession,uuid:()=>crypto.randomUUID(),status,emit:()=>window.dispatchEvent(new Event('snooker-favorites-cloud-change'))});
  window.addEventListener('snooker-favorites-local-change',()=>sync.capture());
  window.addEventListener('snooker-favorites-view-change',()=>{if(lastStatus)status(lastStatus);});
  window.addEventListener('site-auth-change',()=>sync.accountChanged());
  window.addEventListener('storage',event=>{if(event.key==='mywebsite.site-auth-session.v1')sync.accountChanged();else if(event.key===PREFIX+'account:'+encodeURIComponent(getRememberedSession()?.uid || 'guest'))void sync.poll();});
  window.addEventListener('online',()=>void sync.retry());
  window.addEventListener('focus',()=>void sync.poll());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync.poll();});
  setInterval(()=>{if(!document.hidden)void sync.poll();},30000);
  void sync.sync();
}
