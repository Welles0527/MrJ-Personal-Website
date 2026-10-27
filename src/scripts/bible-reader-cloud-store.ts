export type BibleReaderCloudSnapshot = {
  lastRead: {
    book: string;
    chapter: number;
    verse?: number;
    updatedAt: string;
  };
  bookmarks: unknown[];
  notes: unknown[];
  readVerses?: string[];
  bookStatuses?: Record<string, 'reading' | 'read' | 'none'>;
  updatedAt: string;
};

type CloudDocument<T extends BibleReaderCloudSnapshot> = T & {
  _id?: string;
  _openid?: string;
  ownerId?: string;
  account?: string;
  mergedLegacyRecords?: Record<string, string>;
};

type CloudResult<T> = {
  data?: T;
  code?: string;
  message?: string;
  updated?: number;
  error?: { message?: string } | Error | null;
};

type CloudDocumentRef<T extends BibleReaderCloudSnapshot> = {
  get: () => Promise<unknown>;
  set: (payload: CloudDocument<T>) => Promise<unknown>;
  update?: (payload: CloudDocument<T>) => Promise<unknown>;
  updateIfUnchanged?: (payload: CloudDocument<T>, updatedAt: string) => Promise<unknown>;
};

type BibleReaderCloudStoreOptions<T extends BibleReaderCloudSnapshot> = {
  getDocumentRef: (ownerId: string) => CloudDocumentRef<T>;
  getOwnedDocuments?: (ownerId: string) => Promise<unknown>;
};

const assertCloudResult = <T>(input: unknown, fallback: string) => {
  const result = input as CloudResult<T> | null | undefined;
  if (!result) throw new Error(fallback);
  if (result.code) throw new Error(result.message || fallback);
  if (result.error) {
    throw result.error instanceof Error
      ? result.error
      : new Error(result.error.message || fallback);
  }
  return result.data;
};

const cloneSnapshot = <T extends BibleReaderCloudSnapshot>(snapshot: T): T => {
  const { _id, _openid, ownerId, account, ...fields } = snapshot as CloudDocument<T>;
  return {
    ...fields,
    lastRead: { ...snapshot.lastRead },
    bookmarks: snapshot.bookmarks.map((item) => item && typeof item === 'object' ? { ...item } : item),
    notes: snapshot.notes.map((item) => item && typeof item === 'object' ? { ...item } : item),
    readVerses: Array.isArray(snapshot.readVerses) ? [...snapshot.readVerses] : [],
    bookStatuses: snapshot.bookStatuses ? { ...snapshot.bookStatuses } : {}
  } as T;
};

const readDocument = <T extends BibleReaderCloudSnapshot>(
  data: CloudDocument<T> | CloudDocument<T>[] | undefined,
  ownerId: string
): T | null => {
  const document = Array.isArray(data) ? data[0] : data;
  if (!document) return null;
  if ((document.ownerId && document.ownerId !== ownerId) || (document._openid && document._openid !== ownerId)) {
    throw new Error('云端阅读记录所属账号不一致。');
  }
  if (!document.lastRead && 'groupStudy' in document && !document.readVerses?.length &&
    !Object.keys(document.bookStatuses ?? {}).length && !document.bookmarks?.length && !document.notes?.length) return null;
  if (!document.lastRead || !Array.isArray(document.bookmarks) || !Array.isArray(document.notes)) {
    throw new Error('云端阅读记录格式异常，已停止保存以保护原记录。');
  }
  return cloneSnapshot(document);
};

export const createBibleReaderCloudStore = <T extends BibleReaderCloudSnapshot>({
  getDocumentRef,
  getOwnedDocuments
}: BibleReaderCloudStoreOptions<T>) => {
  const legacyRecordsByOwner = new Map<string, Record<string, string>>();
  const loadedVersions = new Map<string, string | null>();
  const stableJson = (value: unknown): string => JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
  const content = (snapshot: T) => stableJson({
    lastRead: snapshot.lastRead, bookmarks: snapshot.bookmarks, notes: snapshot.notes,
    readVerses: [...(snapshot.readVerses ?? [])].sort(), bookStatuses: snapshot.bookStatuses ?? {}, updatedAt: snapshot.updatedAt
  });
  return {
  async load(ownerId: string): Promise<T | null> {
    const reference = getDocumentRef(ownerId);
    const data = assertCloudResult<CloudDocument<T> | CloudDocument<T>[]>(
      await reference.get(),
      '读取云端阅读进度失败。'
    );
    let snapshot = readDocument<T>(data, ownerId);
    const canonical = Array.isArray(data) ? data[0] : data;
    if (!getOwnedDocuments) {
      loadedVersions.set(ownerId, canonical?.updatedAt ?? null);
      return snapshot;
    }
    const mergedLegacyRecords = { ...canonical?.mergedLegacyRecords };
    const documents = assertCloudResult<CloudDocument<T>[]>(await getOwnedDocuments(ownerId), '读取历史阅读记录失败。') ?? [];
    if (documents.length >= 1000) throw new Error('阅读记录超出单次读取范围，已停止写入以保护数据。');
    const mergeItems = (left: unknown[], right: unknown[]) => {
      const items = new Map<string, unknown>();
      for (const item of [...left, ...right]) {
        if (!item || typeof item !== 'object' || !('id' in item) || typeof item.id !== 'string') throw new Error('历史阅读记录格式异常，已停止同步。');
        const previous = items.get(item.id) as { updatedAt?: string } | undefined;
        const updatedAt = 'updatedAt' in item && typeof item.updatedAt === 'string' ? item.updatedAt : '';
        if (!previous || Date.parse(updatedAt) >= Date.parse(previous.updatedAt || '')) items.set(item.id, item);
      }
      return [...items.values()];
    };
    for (const document of documents) {
      if (document._openid !== ownerId) throw new Error('云端阅读记录所属账号不一致。');
      if (document._id === ownerId) continue;
      if (document._id && mergedLegacyRecords[document._id] === document.updatedAt) continue;
      if (!document.lastRead || !Array.isArray(document.bookmarks) || !Array.isArray(document.notes)) throw new Error('历史阅读记录格式异常，已停止同步。');
      const historical = cloneSnapshot(document);
      if (document._id) mergedLegacyRecords[document._id] = document.updatedAt;
      if (!snapshot) { snapshot = historical; continue; }
      const newer = Date.parse(historical.updatedAt) > Date.parse(snapshot.updatedAt);
      snapshot = {
        ...snapshot,
        lastRead: Date.parse(historical.lastRead.updatedAt) > Date.parse(snapshot.lastRead.updatedAt) ? historical.lastRead : snapshot.lastRead,
        bookmarks: mergeItems(snapshot.bookmarks, historical.bookmarks),
        notes: mergeItems(snapshot.notes, historical.notes),
        readVerses: [...new Set([...(snapshot.readVerses ?? []), ...(historical.readVerses ?? [])])],
        bookStatuses: newer ? { ...snapshot.bookStatuses, ...historical.bookStatuses } : { ...historical.bookStatuses, ...snapshot.bookStatuses },
        updatedAt: newer ? historical.updatedAt : snapshot.updatedAt
      };
    }
    legacyRecordsByOwner.set(ownerId, mergedLegacyRecords);
    loadedVersions.set(ownerId, canonical?.updatedAt ?? null);
    return snapshot;
  },

  async save(ownerId: string, account: string, snapshot: T): Promise<T> {
    if (!loadedVersions.has(ownerId)) throw new Error('请先读取云端阅读记录，再保存。');
    const reference = getDocumentRef(ownerId);
    const payload = {
      lastRead: { ...snapshot.lastRead },
      bookmarks: snapshot.bookmarks.map(item => item && typeof item === 'object' ? { ...item } : item),
      notes: snapshot.notes.map(item => item && typeof item === 'object' ? { ...item } : item),
      readVerses: [...(snapshot.readVerses ?? [])],
      bookStatuses: { ...(snapshot.bookStatuses ?? {}) },
      updatedAt: snapshot.updatedAt,
      ownerId,
      account
    } as CloudDocument<T>;
    const mergedLegacyRecords = legacyRecordsByOwner.get(ownerId);
    if (mergedLegacyRecords) payload.mergedLegacyRecords = mergedLegacyRecords;
    if (reference.update) {
      const existing = assertCloudResult<CloudDocument<T> | CloudDocument<T>[]>(await reference.get(), '读取云端阅读进度失败。');
      const current = Array.isArray(existing) ? existing[0] : existing;
      if (current) {
        readDocument<T>(current, ownerId);
        if (current.updatedAt !== loadedVersions.get(ownerId)) throw new Error('云端记录已在其他页面或设备更新，已阻止旧进度覆盖。请重新打开页面读取最新记录。');
        const result = await (reference.updateIfUnchanged
          ? reference.updateIfUnchanged(payload, current.updatedAt)
          : reference.update(payload)) as CloudResult<{ updated?: number }>;
        assertCloudResult(result, '保存云端阅读进度失败。');
        if ((result.updated ?? result.data?.updated) !== 1) throw new Error('云端阅读记录未更新，请重新同步。');
      } else {
        if (loadedVersions.get(ownerId) !== null) throw new Error('云端记录已改变，已停止保存。请重新同步。');
        assertCloudResult(await reference.set(payload), '保存云端阅读进度失败。');
      }
    } else {
      assertCloudResult(await reference.set(payload), '保存云端阅读进度失败。');
    }

    const verifiedData = assertCloudResult<CloudDocument<T> | CloudDocument<T>[]>(
      await reference.get(),
      '保存后回读云端阅读进度失败。'
    );
    const verified = readDocument<T>(verifiedData, ownerId);
    if (!verified || content(verified) !== content(snapshot)) {
      throw new Error('云端阅读进度保存后校验不一致。');
    }
    loadedVersions.set(ownerId, verified.updatedAt);
    return verified;
  }
  };
};
