import { getCloudDb, getCloudSession } from './site-auth';

const collections = {
  todo: 'officialWebsiteTodos', bible: 'officialWebsiteBibleReaderState',
  inspiration: 'officialWebsiteInspirationStudios', funds: 'officialWebsiteFundManagerPreferences',
  stocks: 'officialWebsiteStockTrackingPreferences', dianping: 'officialWebsiteDianpingFavorites',
  worship: 'officialWebsiteWorshipMusic'
} as const;
export type BackupKind = keyof typeof collections;

function checked(result: any): any[] {
  if (!result || result.error || (result.code && result.code !== 'SUCCESS')) throw new Error(result?.error?.message || result?.message || '云端读取失败，未导出');
  if (!('data' in result)) throw new Error('云端未返回数据，未导出');
  if (Array.isArray(result.data)) return result.data;
  return result.data ? [result.data] : [];
}

// Only freshly fetched authenticated records enter this archive. Never use a local fallback.
export async function readCloudBackup(kind: BackupKind) {
  const owner = await getCloudSession();
  if (!owner) throw new Error('请登录后再读取云端备份');
  const collection = getCloudDb().collection(collections[kind]);
  const records: any[] = [];
  if (kind === 'todo' || kind === 'stocks') {
    for (let skip = 0; ; skip += 100) {
      const page = checked(await collection.where({ ownerId: owner.uid }).orderBy('_id', 'asc').skip(skip).limit(100).get());
      records.push(...page);
      if (page.length < 100) break;
      if (skip >= 99900) throw new Error('记录超出备份读取范围，已停止，未导出不完整备份');
    }
  } else {
    records.push(...checked(await collection.doc(owner.uid).get()));
    // Include legacy account-owned Bible documents rather than silently omitting their content.
    if (kind === 'bible') {
      for (let skip = 0; ; skip += 100) {
        const page = checked(await collection.where({ _openid: owner.uid }).orderBy('_id', 'asc').skip(skip).limit(100).get());
        for (const item of page) if (!records.some(record => record._id === item._id)) records.push(item);
        if (page.length < 100) break;
        if (skip >= 99900) throw new Error('历史记录超出备份读取范围，未导出');
      }
    }
  }
  for (const record of records) {
    if (record.ownerId ? record.ownerId !== owner.uid : record._openid ? record._openid !== owner.uid : record._id !== owner.uid) {
      throw new Error('云端返回账号不匹配的数据，已停止导出');
    }
  }
  if ((await getCloudSession())?.uid !== owner.uid) throw new Error('导出期间账号改变，已停止下载');
  const data = JSON.stringify(records);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return { format: 'magicj-cloud-backup', schemaVersion: 1, source: 'cloud', kind, accountUid: owner.uid,
    exportedAt: new Date().toISOString(), collection: collections[kind],
    sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''), records };
}
