export type AccountBookStatus = 'reading' | 'read' | 'none';

export type AccountReaderSnapshot = {
  lastRead: {
    book: string;
    chapter: number;
    verse?: number;
    updatedAt: string;
  };
  bookmarks: unknown[];
  notes: unknown[];
  readVerses?: string[];
  bookStatuses?: Record<string, AccountBookStatus>;
  updatedAt: string;
};

type ResolveAccountSnapshotOptions<T extends AccountReaderSnapshot> = {
  uid: string;
  cloud: T | null;
  accountCache: T | null;
  legacy: T | null;
  legacyOwner: string | null;
  fallback: T;
};

const cloneSnapshot = <T extends AccountReaderSnapshot>(snapshot: T): T => ({
  ...snapshot,
  lastRead: { ...snapshot.lastRead },
  bookmarks: [...snapshot.bookmarks],
  notes: [...snapshot.notes],
  readVerses: Array.isArray(snapshot.readVerses) ? [...snapshot.readVerses] : [],
  bookStatuses: snapshot.bookStatuses ? { ...snapshot.bookStatuses } : {}
});

export const accountStorageKey = (baseKey: string, uid: string) =>
  `${baseKey}.account.${encodeURIComponent(uid)}`;

export const resolveAccountSnapshot = <T extends AccountReaderSnapshot>({
  uid,
  cloud,
  accountCache,
  legacy,
  legacyOwner,
  fallback
}: ResolveAccountSnapshotOptions<T>) => {
  const mayUseLegacy = Boolean(legacy) && (!legacyOwner || legacyOwner === uid);

  if (cloud) {
    const snapshot = cloneSnapshot(cloud);
    let migratedLegacy = false;
    if (!cloud.bookStatuses && mayUseLegacy && legacy?.bookStatuses) {
      snapshot.bookStatuses = { ...legacy.bookStatuses };
      migratedLegacy = true;
    }
    return { snapshot, migratedLegacy, shouldWriteCloud: migratedLegacy };
  }

  if (accountCache) {
    return {
      snapshot: cloneSnapshot(accountCache),
      migratedLegacy: false,
      shouldWriteCloud: true
    };
  }

  if (mayUseLegacy && legacy) {
    return {
      snapshot: cloneSnapshot(legacy),
      migratedLegacy: true,
      shouldWriteCloud: true
    };
  }

  return {
    snapshot: cloneSnapshot(fallback),
    migratedLegacy: false,
    shouldWriteCloud: true
  };
};
