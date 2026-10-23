'use strict';
// Provision site_metrics/home with { count: 0 } before enabling the HTTP endpoint.
// Deny direct client access to site_metrics; only this function updates it.
exports.main = async event => {
  const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
  const response = (statusCode, body) => ({statusCode,headers,body:JSON.stringify(body)});
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') return response(405,{error:'Method not allowed'});
  try {
    const cloudbase = require('@cloudbase/node-sdk');
    const app = cloudbase.init({env:cloudbase.SYMBOL_CURRENT_ENV});
    const db = app.database();
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
