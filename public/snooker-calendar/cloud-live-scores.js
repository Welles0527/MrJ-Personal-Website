/* CloudBase snapshot reader. Static snapshots remain the offline fallback. */
(() => {
  const envId = 'magicj-web-d5g9yvowj6862f7a2';
  const sdkUrl = 'https://static.cloudbase.net/cloudbase-js-sdk/2.28.6/cloudbase.full.js';

  async function loadCloudSnapshot() {
    if (!window.cloudbase?.init) throw new Error(`CloudBase SDK unavailable: ${sdkUrl}`);
    const app = window.cloudbase.init({ env: envId, region: 'ap-shanghai' });
    const auth = app.auth();
    const getToken = async () => {
      const hasPersonalAccount = () => Boolean(window.localStorage.getItem('mywebsite.site-auth-session.v1'));
      let existing;
      try {
        existing = await auth.getSession?.();
        if (existing?.error) throw new Error(existing.error.message || 'CloudBase session unavailable');
      } catch (error) {
        // This SDK also reports a fresh visitor's missing credentials as a null scope.
        if (hasPersonalAccount() || !/credentials not found|Cannot read properties of null \(reading 'scope'\)|null is not an object.*scope/i.test(error?.message || '')) throw error;
      }
      const existingToken = existing?.data?.session?.access_token;
      if (existingToken) return existingToken;
      // A temporary failure to restore a personal account must not replace its credentials.
      if (hasPersonalAccount()) throw new Error('Personal session temporarily unavailable; using static scores');
      const anonymous = await auth.signInAnonymously();
      if (anonymous?.error) throw new Error(anonymous.error.message || 'CloudBase anonymous session unavailable');
      return anonymous?.data?.session?.access_token;
    };
    const token = navigator.locks?.request
      ? await navigator.locks.request(`mywebsite.auth:${envId}`, getToken)
      : await getToken();
    if (!token) throw new Error('CloudBase anonymous session unavailable');
    const response = await fetch(`https://${envId}.ap-shanghai.tcb-api.tencentcloudapi.com/web?env=${envId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'functions.invokeFunction',
        dataVersion: '2020-01-10',
        env: envId,
        function_name: 'refreshScores',
        request_data: JSON.stringify({ action: 'getSnookerScores' }),
        access_token: token,
        seqId: Math.random().toString(36).slice(2),
      }),
    });
    if (!response.ok) throw new Error(`CloudBase function request failed (${response.status})`);
    const body = await response.json();
    const result = typeof body?.data?.response_data === 'string'
      ? JSON.parse(body.data.response_data)
      : body?.data?.response_data;
    const snapshot = result?.snapshot;
    if (!snapshot || snapshot.version !== 1 || !snapshot.events) {
      throw new Error('CloudBase returned an invalid snooker snapshot');
    }
    return snapshot;
  }

  window.CUE_LOAD_CLOUD_SCORES = () => Promise.race([
    loadCloudSnapshot(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('CloudBase snapshot timeout')), 8000)),
  ]);
})();
