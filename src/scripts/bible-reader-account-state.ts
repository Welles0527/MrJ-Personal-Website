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
  cloud,
  fallback
}: ResolveAccountSnapshotOptions<T>) => {
  // Browser snapshots are backups only, never an account data source.
  // Reading an empty cloud record must not implicitly upload a local snapshot.
  return {
    snapshot: cloneSnapshot(cloud ?? fallback),
    migratedLegacy: false,
    shouldWriteCloud: false
  };
};
