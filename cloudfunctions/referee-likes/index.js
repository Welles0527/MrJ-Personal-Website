'use strict';
const { createHash } = require('node:crypto');
const refereeIds = ['zheng-weili','zhu-ying','peggy-li','lyu-xilin','wang-wei','michaela-tabb','desislava-bozhilova','tatiana-woollaston','maike-kesseler','proletina-velichkova','malgorzata-kanieska','jan-verhaas','paul-collier','brendan-moore','olivier-marteel','marcel-eckardt','leo-scullion','rob-spencer','ben-williams','colin-humphries','eirian-williams','len-ganley'];
const hash = value => createHash('sha256').update(value).digest('hex');
exports.createHandler = (db, getUid) => async (event = {}) => {
  if (event.httpMethod || !['list', 'like'].includes(event.action)) return { ok: false, error: 'INVALID_REQUEST' };
  const uid = getUid();
  const visitor = uid ? hash(uid) : null;
  const votes = db.collection('snooker_referee_likes');
  try {
    if (event.action === 'like') {
      if (!visitor) return { ok: false, error: 'AUTH_REQUIRED' };
      if (!refereeIds.includes(event.refereeId)) return { ok: false, error: 'INVALID_REFEREE' };
      // One deterministic document per referee/caller: retries and concurrent clicks cannot add duplicate votes.
      await votes.doc(hash(`${event.refereeId}:${visitor}`)).set({ refereeId: event.refereeId, visitor });
      const result = await votes.where({ refereeId: event.refereeId }).count();
      return { ok: true, refereeId: event.refereeId, count: result.total, liked: true };
    }
    const [summary, own] = await Promise.all([
      votes.aggregate().group({ _id: '$refereeId', count: db.command.aggregate.sum(1) }).limit(refereeIds.length).end(),
      visitor ? votes.where({ visitor }).limit(refereeIds.length).get() : Promise.resolve({ data: [] })
    ]);
    return { ok: true, counts: Object.fromEntries(refereeIds.map(id => [id, summary.data.find(row => row._id === id)?.count || 0])),
      liked: own.data.map(row => row.refereeId).filter(id => refereeIds.includes(id)) };
  } catch {
    return { ok: false, error: 'UNAVAILABLE' };
  }
};
exports.main = async event => {
  const cloudbase = require('@cloudbase/node-sdk');
  const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
  return exports.createHandler(app.database(), () => app.auth().getUserInfo().uid)(event);
};
