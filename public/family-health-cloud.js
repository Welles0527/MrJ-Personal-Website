/* Account-scoped cloud archive. Browser storage is never a production fallback. */
(function (root) {
  const CHUNK = 192 * 1024;
  const messages = { AUTH_REQUIRED: '请重新确认网站登录状态', CONFLICT: '其他页面已更新云端档案，请保留当前输入，重新加载后再修改', MISSING_FILE: '云端附件不完整，已停止保存或导出', INVALID_FILE: '附件校验失败', ARCHIVE_TOO_LARGE: '档案超过单次保存上限，未保存', UNAVAILABLE: '云端暂不可用，未确认保存成功' };
  const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
  const encode = bytes => { let text = ''; for (const n of bytes) text += String.fromCharCode(n); return btoa(text); };
  const decode = text => Uint8Array.from(atob(text), n => n.charCodeAt(0));
  function refs(state) {
    const ids = new Set([...(state.reports || []).map(r => r.fileId), ...(state.meds || []).map(m => m.photoFileId)].filter(Boolean));
    for (const item of state.trash || []) for (const id of refs(item.data || {})) ids.add(id);
    return ids;
  }
  class FamilyHealthCloud {
    constructor(auth, uid) { this.auth = auth; this.uid = uid; this.revision = 0; this.files = []; this.busy = false; this.blocked = false; this.fileCache = new Map(); }
    async call(data) {
      const session = await this.auth.getSession();
      if (session?.uid !== this.uid) throw new Error('账号已改变，请重新加载');
      const response = await this.auth.callCloudFunction('family-health', data);
      const result = response.result;
      if (!result?.ok) throw new Error(messages[result?.error] || '云端操作失败，请保留输入后重试');
      if (result.uid !== this.uid || (await this.auth.getSession())?.uid !== this.uid) throw new Error('账号已改变，请重新加载');
      return result;
    }
    async load() {
      const result = await this.call({ action: 'load' });
      if (result.revision && !result.snapshot) throw new Error('云端档案缺失，已停止加载');
      this.revision = result.revision; this.files = result.snapshot?.files || []; this.blocked = false;
      return result.snapshot?.state || null;
    }
    async file(id, files = this.files) {
      const file = files.find(f => f.id === id);
      if (!file) return undefined;
      const key = JSON.stringify(file);
      if (!this.fileCache.has(key)) {
        const pending = this.fetchFile(file);
        this.fileCache.set(key, pending);
        pending.catch(() => this.fileCache.delete(key));
      }
      const result = await this.fileCache.get(key);
      if ((await this.auth.getSession())?.uid !== this.uid) throw new Error('账号已改变，请重新加载');
      return result;
    }
    async fetchFile(file) {
      const parts = new Array(file.chunks.length);
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(4, file.chunks.length) }, async () => {
        while (next < file.chunks.length) {
          const index = next++, hash = file.chunks[index];
          const result = await this.call({ action: 'chunk-get', hash });
          const bytes = decode(result.data);
          if (await digest(bytes) !== hash) throw new Error('附件校验失败，已停止读取');
          parts[index] = bytes;
        }
      }));
      const blob = new Blob(parts, { type: file.type });
      if (blob.size !== file.size) throw new Error('附件大小不符，已停止读取');
      // Bound retained originals; pending requests remain deduplicated while loading.
      let retained = 0;
      for (const [key, value] of this.fileCache) {
        const size = JSON.parse(key).size;
        retained += size;
        if (retained > 32 * 1024 * 1024 && JSON.stringify(file) !== key) this.fileCache.delete(key);
      }
      return { id: file.id, name: file.name, blob };
    }
    async save(state, changes = []) {
      if (this.busy || this.blocked) throw new Error('请等待同步完成；若上次保存失败，请保留输入并重新加载');
      this.busy = true;
      try {
        const files = new Map(this.files.map(f => [f.id, f]));
        for (const file of changes) {
          if (file.blob.size <= 0 || file.blob.size > 10 * 1024 * 1024) throw new Error('每个附件须在 10 MB 以内');
          const chunks = [];
          for (let start = 0; start < file.blob.size; start += CHUNK) {
            const bytes = new Uint8Array(await file.blob.slice(start, start + CHUNK).arrayBuffer()), hash = await digest(bytes);
            await this.call({ action: 'chunk-put', hash, data: encode(bytes) }); chunks.push(hash);
          }
          files.set(file.id, { id: file.id, name: file.name, type: file.blob.type, size: file.blob.size, chunks });
        }
        const wanted = refs(state), selected = [...wanted].map(id => files.get(id));
        if (selected.some(f => !f)) throw new Error('缺少附件原件，未保存到云端');
        const result = await this.call({ action: 'save', expectedRevision: this.revision, operationId: crypto.randomUUID(), snapshot: { state: structuredClone(state), files: selected } });
        this.revision = result.revision; this.files = selected;
      } catch (error) { this.blocked = true; throw error; }
      finally { this.busy = false; }
    }
    async exportArchive() {
      if (this.busy || this.blocked) throw new Error('有未确认保存的内容，暂不能导出；请先保留输入并重新加载核对');
      const result = await this.call({ action: 'load' });
      if (!result.snapshot) throw new Error('此账号云端尚无档案，请先导入真实备份或保存记录');
      const attachments = [];
      for (const manifest of result.snapshot.files) {
        const file = await this.file(manifest.id, result.snapshot.files);
        attachments.push({ id: file.id, name: file.name, type: file.blob.type, data: encode(new Uint8Array(await file.blob.arrayBuffer())) });
      }
      if (refs(result.snapshot.state).size !== attachments.length) throw new Error('云端附件缺失，已停止导出');
      return { format: 'jiaan-family-health-backup', schema: 1, exportedAt: new Date().toISOString(), source: 'cloud', accountUid: this.uid, revision: result.revision, data: result.snapshot.state, attachments };
    }
  }
  root.FamilyHealthCloud = FamilyHealthCloud;
})(globalThis);
