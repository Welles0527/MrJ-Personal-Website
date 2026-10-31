'use strict';
const { createHash } = require('node:crypto');
const hash = value => createHash('sha256').update(value).digest('hex');
const CHUNK = 192 * 1024;
const refs = state => {
  const ids = new Set([...(state.reports || []).map(r => r.fileId), ...(state.meds || []).map(m => m.photoFileId)].filter(Boolean));
  for (const row of state.trash || []) for (const id of refs(row.data || {})) ids.add(id);
  return ids;
};
const first = result => {
  if (result.code) throw new Error('UNAVAILABLE');
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  return value && Object.keys(value).length ? value : undefined;
};
const fail = code => { throw new Error(code); };
exports.createHandler = (db, getIdentity) => async (event = {}) => {
  try {
    const identity = await getIdentity();
    if (!identity?.uid || identity.anonymous || event.httpMethod) fail('AUTH_REQUIRED');
    const owner = hash(identity.uid).slice(0, 32), collection = 'family_health_private';
    const doc = (key, store = db) => store.collection(collection).doc(owner + '_' + key);
    const get = async (key, store = db) => first(await doc(key, store).get());
    const set = async (key, data, store = db) => { const result = await doc(key, store).set(data); if (result.code) fail('UNAVAILABLE'); };
    if (event.action === 'load') {
      const head = await get('head');
      return { ok: true, uid: identity.uid, revision: head?.revision || 0, snapshot: head ? (await get('v' + head.revision))?.snapshot : null };
    }
    if (event.action === 'chunk-put') {
      if (typeof event.data !== 'string' || event.data.length > Math.ceil(CHUNK / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(event.data)) fail('INVALID_FILE');
      const bytes = Buffer.from(event.data, 'base64');
      if (!bytes.length || bytes.toString('base64') !== event.data || bytes.length > CHUNK) fail('INVALID_FILE');
      const digest = hash(bytes);
      if (event.hash !== digest) fail('INVALID_FILE');
      await set('b' + digest, { data: event.data, size: bytes.length });
      return { ok: true, uid: identity.uid, hash: digest };
    }
    if (event.action === 'chunk-get') {
      if (!/^[a-f0-9]{64}$/.test(event.hash || '')) fail('INVALID_FILE');
      const chunk = await get('b' + event.hash);
      if (!chunk) fail('MISSING_FILE');
      return { ok: true, uid: identity.uid, data: chunk.data };
    }
    if (event.action !== 'save') fail('INVALID_REQUEST');
    const { snapshot, expectedRevision, operationId } = event;
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !/^[a-f0-9-]{36}$/.test(operationId || '')) fail('INVALID_REQUEST');
    if (!snapshot?.state || !Array.isArray(snapshot.files) || Buffer.byteLength(JSON.stringify(snapshot)) > 700000) fail('ARCHIVE_TOO_LARGE');
    for (const key of ['profiles', 'conditions', 'events', 'meds', 'reports', 'notes', 'logs']) if (!Array.isArray(snapshot.state[key])) fail('INVALID_ARCHIVE');
    const wanted = refs(snapshot.state), seen = new Set();
    if (wanted.size !== snapshot.files.length) fail('MISSING_FILE');
    for (const file of snapshot.files) {
      if (!wanted.has(file.id) || seen.has(file.id) || typeof file.name !== 'string' || file.name.length > 500 || !['image/jpeg','image/png','image/webp','application/pdf','application/msword','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type) || !Number.isSafeInteger(file.size) || file.size <= 0 || file.size > 10 * 1024 * 1024 || !Array.isArray(file.chunks) || file.chunks.length !== Math.ceil(file.size / CHUNK)) fail('INVALID_FILE');
      seen.add(file.id);
      let size = 0;
      for (let i = 0; i < file.chunks.length; i++) {
        const digest = file.chunks[i];
        if (!/^[a-f0-9]{64}$/.test(digest)) fail('INVALID_FILE');
        const chunk = await get('b' + digest);
        if (!chunk || chunk.size !== Math.min(CHUNK, file.size - i * CHUNK)) fail('MISSING_FILE');
        size += chunk.size;
      }
      if (size !== file.size) fail('MISSING_FILE');
    }
    const fingerprint = hash(JSON.stringify(snapshot));
    const revision = await db.runTransaction(async transaction => {
      const receipt = await get('o' + operationId, transaction);
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) fail('INVALID_REQUEST');
        return receipt.revision;
      }
      const head = await get('head', transaction);
      if ((head?.revision || 0) !== expectedRevision) fail('CONFLICT');
      const next = expectedRevision + 1;
      await set('v' + next, { snapshot, createdAt: Date.now() }, transaction);
      await set('head', { revision: next }, transaction);
      await set('o' + operationId, { revision: next, fingerprint }, transaction);
      return next;
    });
    return { ok: true, uid: identity.uid, revision };
  } catch (error) {
    const codes = ['AUTH_REQUIRED','INVALID_REQUEST','INVALID_ARCHIVE','INVALID_FILE','ARCHIVE_TOO_LARGE','MISSING_FILE','CONFLICT'];
    return { ok: false, error: codes.includes(error.message) ? error.message : 'UNAVAILABLE' };
  }
};
exports.main = async event => {
  const cloudbase = require('@cloudbase/node-sdk');
  const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
  return exports.createHandler(app.database(), () => {
    const user = app.auth().getUserInfo();
    return { uid: user.uid, anonymous: user.isAnonymous === true || user.loginType === 'ANONYMOUS' };
  })(event);
};
