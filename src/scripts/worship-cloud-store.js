const VALUE_PREFIX = 'worship:';
const META_PREFIX = 'worship-meta:';

function parseJson(value, fallback) {
  if (value === null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function readCloudDocument(result) {
  if (result?.error) {
    throw result.error instanceof Error ? result.error : new Error(String(result.error));
  }
  const data = Array.isArray(result?.data) ? result.data[0] : result?.data;
  return data && typeof data === 'object' ? data : {};
}

function valuesMatch(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function readLocal(storage, key, fallback) {
  const rawValue = storage.getItem(`${VALUE_PREFIX}${key}`);
  const rawMeta = storage.getItem(`${META_PREFIX}${key}`);
  return {
    found: rawValue !== null,
    value: parseJson(rawValue, fallback),
    meta: parseJson(rawMeta, null),
  };
}

function writeLocal(storage, key, value, meta) {
  try {
    storage.setItem(`${VALUE_PREFIX}${key}`, JSON.stringify(value));
    storage.setItem(`${META_PREFIX}${key}`, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

function markLocalClean(storage, key, value, updatedAt) {
  const current = readLocal(storage, key, undefined);
  if (current.meta?.updatedAt !== updatedAt || !valuesMatch(current.value, value)) return false;
  return writeLocal(storage, key, value, { updatedAt, dirty: false });
}

export function createWorshipCloudStore({
  getIdentity,
  getIdentitySnapshot,
  getDocumentRef,
  storage,
  now = () => new Date().toISOString(),
}) {
  let mutationQueue = Promise.resolve();

  const writeCloud = (identity, key, value, updatedAt) => {
    const mutate = async () => {
      const ref = getDocumentRef(identity.uid);
      const current = readCloudDocument(await ref.get());
      const result = await ref.set({
        ...current,
        ownerId: identity.uid,
        account: identity.account,
        [key]: value,
        fieldUpdatedAt: {
          ...(current.fieldUpdatedAt && typeof current.fieldUpdatedAt === 'object' ? current.fieldUpdatedAt : {}),
          [key]: updatedAt,
        },
        updatedAt,
      });
      if (result?.error) {
        throw result.error instanceof Error ? result.error : new Error(String(result.error));
      }
    };
    const pending = mutationQueue.then(mutate, mutate);
    mutationQueue = pending.catch(() => {});
    return pending;
  };

  return {
    get userId() {
      return getIdentitySnapshot()?.uid || null;
    },
    get account() {
      return getIdentitySnapshot()?.account || null;
    },
    async load(key, fallback) {
      const local = readLocal(storage, key, fallback);
      const identity = await getIdentity();
      if (!identity?.uid) return local.value;

      try {
        const ref = getDocumentRef(identity.uid);
        const current = readCloudDocument(await ref.get());
        const hasCloudValue = Object.prototype.hasOwnProperty.call(current, key);
        const cloudValue = current[key];
        const localDiffers = !hasCloudValue || !valuesMatch(local.value, cloudValue);
        const legacyLocalNeedsMigration = local.found && !local.meta && localDiffers;
        const localIsDirty = local.meta?.dirty === true || legacyLocalNeedsMigration;

        if (localIsDirty) {
          const updatedAt = local.meta?.updatedAt || now();
          writeLocal(storage, key, local.value, { updatedAt, dirty: true });
          await writeCloud(identity, key, local.value, updatedAt);
          markLocalClean(storage, key, local.value, updatedAt);
          return local.value;
        }

        if (hasCloudValue) {
          const updatedAt = current.fieldUpdatedAt?.[key] || current.updatedAt || now();
          writeLocal(storage, key, cloudValue, { updatedAt, dirty: false });
          return cloudValue;
        }

        if (local.found) {
          const updatedAt = local.meta?.updatedAt || now();
          writeLocal(storage, key, local.value, { updatedAt, dirty: true });
          await writeCloud(identity, key, local.value, updatedAt);
          markLocalClean(storage, key, local.value, updatedAt);
        }
        return local.value;
      } catch {
        return local.value;
      }
    },
    async save(key, value) {
      const updatedAt = now();
      const persistedLocally = writeLocal(storage, key, value, { updatedAt, dirty: true });
      const identity = await getIdentity();
      if (!identity?.uid) return;

      try {
        await writeCloud(identity, key, value, updatedAt);
        markLocalClean(storage, key, value, updatedAt);
      } catch (error) {
        if (!persistedLocally) throw error;
      }
    },
  };
}
