import { getCloudSession, callCloudFunction } from './site-auth';
import { readCloudBackup, type BackupKind } from './cloud-backup';
import { createBackupWorkbook, jsonRows, type BackupSheet } from './backup-workbook';

const areas: [string, BackupKind][] = [['个人待办', 'todo'], ['超级日历生活计划', 'todo'], ['AI灵感站', 'inspiration'], ['微读圣经', 'bible'], ['小组查经', 'bible'], ['赞美诗歌', 'worship'], ['基金看板', 'funds'], ['股票跟踪', 'stocks'], ['大众点评收藏', 'dianping']];
const stable = (value: any): string => JSON.stringify(value, (_, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const hash = async (bytes: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>)), n => n.toString(16).padStart(2, '0')).join('');

// Download an entire account snapshot; a missing service/attachment aborts the whole export.
export async function exportAllCloudBackup(progress: (message: string) => void) {
  const session = await getCloudSession();
  if (!session) throw new Error('请登录后再备份全部云端数据');
  const checkOwner = async () => { if ((await getCloudSession())?.uid !== session.uid) throw new Error('备份期间账号改变，已停止下载'); };
  const archives = new Map<BackupKind, Awaited<ReturnType<typeof readCloudBackup>>>();
  for (const [label, kind] of areas) {
    if (archives.has(kind)) continue;
    progress(`正在读取云端：${label}…`);
    const archive = await readCloudBackup(kind);
    if (archive.accountUid !== session.uid) throw new Error('备份账号不一致，已停止下载');
    archives.set(kind, archive);
  }
  const healthCall = async (data: Record<string, unknown>) => {
    await checkOwner();
    const response = await callCloudFunction('family-health', data), result = response.result as any;
    if (!result?.ok || result.uid !== session.uid) throw new Error('家安云端读取失败，全部备份未下载');
    await checkOwner(); return result;
  };
  progress('正在读取云端：家安档案与附件…');
  const health = await healthCall({ action: 'load' });
  if (health.revision && !health.snapshot) throw new Error('家安云端档案缺失，已停止备份');
  const references = (state: any): Set<string> => {
    const ids = new Set<string>([...(state.reports || []).map((r: any) => r.fileId), ...(state.meds || []).map((m: any) => m.photoFileId)].filter(Boolean));
    for (const item of state.trash || []) for (const id of references(item.data || {})) ids.add(id);
    return ids;
  };
  const wanted = references(health.snapshot?.state || {});
  const manifests = health.snapshot?.files || [];
  if (wanted.size !== manifests.length || manifests.some((file: any) => !wanted.has(file.id))) throw new Error('家安云端附件清单不完整，已停止备份');
  const attachmentRows = [['附件ID', '文件名', '类型', '字节数', '云端分块序号', 'SHA256', '段序号', 'Base64原件（按分块和段序号拼接）']];
  for (const file of health.snapshot?.files || []) {
    let size = 0;
    for (const [chunkIndex, checksum] of file.chunks.entries()) {
      const chunk = await healthCall({ action: 'chunk-get', hash: checksum });
      if (typeof chunk.data !== 'string') throw new Error('云端附件缺失，已停止备份');
      const bytes = Uint8Array.from(atob(chunk.data), c => c.charCodeAt(0));
      if (await hash(bytes) !== checksum) throw new Error('云端附件校验失败，已停止备份');
      size += bytes.length;
      for (let start = 0; start < chunk.data.length; start += 30000) attachmentRows.push([file.id, file.name, file.type, String(file.size), String(chunkIndex + 1), checksum, String(start / 30000 + 1), chunk.data.slice(start, start + 30000)]);
    }
    if (size !== file.size) throw new Error('云端附件大小不符，已停止备份');
  }
  const sheets: BackupSheet[] = [{ name: '备份说明', rows: [
    ['项目', '内容'], ['格式', 'MagicJ 全站云端备份 v1'], ['账号UID', session.uid], ['读取完成时间', new Date().toISOString()],
    ['来源', '本次重新读取云端；不使用浏览器缓存或示例数据'],
    ['范围', '十个页面的账号数据，含赞美诗歌与家安附件；个人待办与生活计划共享待办库；微读圣经与小组查经共享档案库。不含独立商家权限的咖啡营业订单。'],
    ['未保存内容', '尚未成功上传云端的输入不在此备份内，请先确认各页面保存成功'],
    ['还原说明', '各原始档案表按分段序号拼接第二列可还原完整JSON。不要编辑原文列。'],
    ['附件还原', '按附件ID、云端分块序号、段序号拼接Base64，解码并依次连接各云端分块，即原始文件；SHA256用于校验每块。'],
    ['一致性', '各数据源从云端读取并再次核对；更新、读取失败或账号变化会停止下载。这不是跨集合事务快照，备份期间请勿编辑。']
  ] }];
  const fields = (value: any, prefix = ''): string[][] => {
    if (value === null || typeof value !== 'object') {
      const text = value === undefined ? '' : String(value);
      return [[prefix, text.length <= 30000 ? text : text.slice(0, 29900) + '（完整内容见原始档案表）']];
    }
    return Object.entries(value).flatMap(([key, child]) => fields(child, prefix ? `${prefix}.${key}` : key));
  };
  for (const [label, kind] of areas) {
    const archive = archives.get(kind)!;
    const records = kind === 'bible' ? archive.records.map(record => label === '小组查经'
      ? { _id: record._id, groupStudy: record.groupStudy, groupStudyRevision: record.groupStudyRevision }
      : Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith('groupStudy'))))
      : archive.records.map(record => typeof record.payload === 'string' ? { ...record, payload: JSON.parse(record.payload) } : record);
    sheets.push({ name: label, rows: [['云端字段路径', '内容'], ...(records.length ? fields(records) : [['状态', '此账号云端暂无记录']])] });
  }
  sheets.push({ name: '家安家庭健康档案', rows: [['云端字段路径', '内容'], ...(health.snapshot ? fields(health.snapshot.state) : [['状态', '此账号云端暂无档案']])] });
  for (const [kind, archive] of archives) sheets.push({ name: `${kind}原始档案`, rows: jsonRows(archive) });
  sheets.push({ name: '家安原始档案', rows: jsonRows({ source: 'cloud', accountUid: session.uid, revision: health.revision, snapshot: health.snapshot || null }) }, { name: '家安附件原件', rows: attachmentRows });
  progress('正在再次核对全部云端记录…');
  for (const [kind, archive] of archives) {
    const latest = await readCloudBackup(kind);
    if (latest.accountUid !== session.uid) throw new Error('备份账号不一致，已停止下载');
    if (stable(latest.records) !== stable(archive.records)) throw new Error('云端记录在备份期间发生更新，请重新导出');
  }
  // Verify health revision again after downloading all its attachment chunks.
  if ((await healthCall({ action: 'load' })).revision !== health.revision) throw new Error('家安档案在备份期间发生更新，请重新导出');
  await checkOwner();
  progress('正在生成全部云端数据 Excel…');
  const workbook = createBackupWorkbook(sheets);
  await checkOwner();
  const url = URL.createObjectURL(new Blob([workbook as Uint8Array<ArrayBuffer>], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a'); link.href = url; link.download = `MagicJ-全部云端备份-${new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)}.xlsx`;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
