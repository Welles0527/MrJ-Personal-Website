'use strict';
const { createHash } = require('node:crypto');
const projectIds = ['calendar', 'travel', 'bible', 'funds', 'tools', 'resume'];
// Provision site_metrics/home with { count: 0 } before enabling the HTTP endpoint.
// Deny direct client access to site_metrics; only this function updates it.
exports.createHandler = db => async (event = {}) => {
  const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
  const response = (statusCode, body) => ({statusCode,headers,body:JSON.stringify(body)});
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') return response(405,{error:'Method not allowed'});
  try {
    const metric = event.queryStringParameters?.metric;
    if (metric && metric !== 'project-likes') return response(400,{error:'Invalid metric'});
    if (metric === 'project-likes') {
      const votes = db.collection('site_metrics');
      const count = async projectId => {
        const result = await votes.where({ projectId }).count();
        if (!Number.isSafeInteger(result.total) || result.total < 0) throw Error('Invalid count');
        return result.total;
      };
      if (event.httpMethod === 'POST') {
        let body;
        try {
          const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
          body = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch { return response(400,{error:'Invalid request'}); }
        if (!projectIds.includes(body?.projectId) || typeof body?.requestId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(body.requestId)) return response(400,{error:'Invalid request'});
        // A receipt per click makes replay safe even when the response is lost.
        const id = 'project_like_' + createHash('sha256').update(body.projectId + ':' + body.requestId).digest('hex');
        await votes.doc(id).set({ projectId: body.projectId, requestId: body.requestId });
        return response(200,{projectId:body.projectId,count:await count(body.projectId)});
      }
      const entries = await Promise.all(projectIds.map(async id => [id, await count(id)]));
      return response(200,{counts:Object.fromEntries(entries)});
    }
    const counter = db.collection('site_metrics').doc('home');
    if (event.httpMethod === 'POST') {
      // Atomic increment: simultaneous visits cannot overwrite one another.
      const updated = await counter.update({count:db.command.inc(1)});
      if (updated.updated !== 1) return response(503,{error:'Counter not initialized'});
    }
    const result = await counter.get();
    const count = result.data?.[0]?.count;
    if (!Number.isSafeInteger(count) || count < 0) return response(503,{error:'Counter unavailable'});
    return response(200,{count});
  } catch {
    return response(503,{error:'Counter unavailable'});
  }
};
exports.main = async event => {
  try {
    const cloudbase = require('@cloudbase/node-sdk');
    const app = cloudbase.init({env:cloudbase.SYMBOL_CURRENT_ENV});
    return exports.createHandler(app.database())(event);
  } catch {
    return {statusCode:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify({error:'Counter unavailable'})};
  }
};
