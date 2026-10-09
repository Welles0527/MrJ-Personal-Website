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
  if (!document?.lastRead) return null;
  if (document.ownerId && document.ownerId !== ownerId) {
    throw new Error('云端阅读记录所属账号不一致。');
  }
  return cloneSnapshot(document);
};

export const createBibleReaderCloudStore = <T extends BibleReaderCloudSnapshot>({
  getDocumentRef,
  getOwnedDocuments
}: BibleReaderCloudStoreOptions<T>) => {
  const legacyRecordsByOwner = new Map<string, Record<string, string>>();
  return {
  async load(ownerId: string): Promise<T | null> {
    const reference = getDocumentRef(ownerId);
    const data = assertCloudResult<CloudDocument<T> | CloudDocument<T>[]>(
      await reference.get(),
      '读取云端阅读进度失败。'
    );
    let snapshot = readDocument<T>(data, ownerId);
    if (!getOwnedDocuments) return snapshot;
    const canonical = Array.isArray(data) ? data[0] : data;
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
    return snapshot;
  },

  async save(ownerId: string, account: string, snapshot: T): Promise<T> {
    const reference = getDocumentRef(ownerId);
    const payload = {
      ...cloneSnapshot(snapshot),
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
        const result = await reference.update(payload) as CloudResult<{ updated?: number }>;
        assertCloudResult(result, '保存云端阅读进度失败。');
        if ((result.updated ?? result.data?.updated) !== 1) throw new Error('云端阅读记录未更新，请重新同步。');
      } else {
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
    if (!verified || verified.updatedAt !== snapshot.updatedAt || verified.lastRead.updatedAt !== snapshot.lastRead.updatedAt) {
      throw new Error('云端阅读进度保存后校验不一致。');
    }
    return verified;
  }
  };
};
