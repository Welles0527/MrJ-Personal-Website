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
  ownerId?: string;
  account?: string;
};

type CloudResult<T> = {
  data?: T;
  error?: { message?: string } | Error | null;
};

type CloudDocumentRef<T extends BibleReaderCloudSnapshot> = {
  get: () => Promise<unknown>;
  set: (payload: CloudDocument<T>) => Promise<unknown>;
};

type BibleReaderCloudStoreOptions<T extends BibleReaderCloudSnapshot> = {
  getDocumentRef: (ownerId: string) => CloudDocumentRef<T>;
};

const assertCloudResult = <T>(input: unknown, fallback: string) => {
  const result = input as CloudResult<T> | null | undefined;
  if (!result) throw new Error(fallback);
  if (result.error) {
    throw result.error instanceof Error
      ? result.error
      : new Error(result.error.message || fallback);
  }
  return result.data;
};

const cloneSnapshot = <T extends BibleReaderCloudSnapshot>(snapshot: T): T => ({
  ...snapshot,
  lastRead: { ...snapshot.lastRead },
  bookmarks: snapshot.bookmarks.map((item) => item && typeof item === 'object' ? { ...item } : item),
  notes: snapshot.notes.map((item) => item && typeof item === 'object' ? { ...item } : item),
  readVerses: Array.isArray(snapshot.readVerses) ? [...snapshot.readVerses] : [],
  bookStatuses: snapshot.bookStatuses ? { ...snapshot.bookStatuses } : {}
});

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
  getDocumentRef
}: BibleReaderCloudStoreOptions<T>) => ({
  async load(ownerId: string): Promise<T | null> {
    const reference = getDocumentRef(ownerId);
    const data = assertCloudResult<CloudDocument<T> | CloudDocument<T>[]>(
      await reference.get(),
      '读取云端阅读进度失败。'
    );
    return readDocument<T>(data, ownerId);
  },

  async save(ownerId: string, account: string, snapshot: T): Promise<T> {
    const reference = getDocumentRef(ownerId);
    const payload = {
      ...cloneSnapshot(snapshot),
      ownerId,
      account
    } as CloudDocument<T>;
    assertCloudResult(await reference.set(payload), '保存云端阅读进度失败。');

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
});
