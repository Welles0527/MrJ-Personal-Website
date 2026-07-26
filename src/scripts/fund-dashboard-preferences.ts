import { cloudErrorMessage, getCloudDb, getCloudSession, getRememberedSession } from './site-auth';

type PreferenceRecord = {
  managerId: string;
  favorite: boolean;
  attributeOverride: string[] | null;
  updatedAt: string;
  schemaVersion: string;
};

type PreferenceDocument = {
  ownerId?: string;
  account?: string;
  schemaVersion?: string;
  preferences?: Record<string, PreferenceRecord>;
  updatedAt?: string;
};

type CloudResult<T> = { data?: T; error?: { message?: string } | null };

const COLLECTION = 'officialWebsiteFundManagerPreferences';
const SCHEMA_VERSION = 'fund-manager-preferences-v1';

const assertCloudResult = <T>(result: CloudResult<T>, fallback: string) => {
  if (!result) throw new Error(fallback);
  if (result.error) throw new Error(result.error.message || fallback);
  return result.data;
};

const readDocument = (result: CloudResult<PreferenceDocument[] | PreferenceDocument>) => {
  const data = assertCloudResult(result, '读取基金经理收藏失败。');
  return (Array.isArray(data) ? data[0] : data) || {};
};

const currentSession = async () => {
  const remembered = getRememberedSession();
  if (remembered) return remembered;
  if (location.protocol === 'file:' || ['127.0.0.1', 'localhost'].includes(location.hostname)) return null;
  return await getCloudSession();
};

const api = {
  async getSession() {
    try {
      return await currentSession();
    } catch (error) {
      throw new Error(cloudErrorMessage(error, '无法确认共享登录状态。'));
    }
  },
  async load() {
    const session = await currentSession();
    if (!session?.uid) return null;
    try {
      const result = await getCloudDb().collection(COLLECTION).doc(session.uid).get() as CloudResult<PreferenceDocument[] | PreferenceDocument>;
      const document = readDocument(result);
      return {
        ownerId: session.uid,
        account: session.account,
        schemaVersion: document.schemaVersion || SCHEMA_VERSION,
        preferences: document.preferences && typeof document.preferences === 'object' ? document.preferences : {},
        updatedAt: document.updatedAt || null
      };
    } catch (error) {
      throw new Error(cloudErrorMessage(error, '读取基金经理收藏失败。'));
    }
  },
  async save(preferences: Record<string, PreferenceRecord>) {
    const session = await currentSession();
    if (!session?.uid) throw new Error('当前未登录，收藏已保留在本机。');
    const payload = {
      ownerId: session.uid,
      account: session.account,
      schemaVersion: SCHEMA_VERSION,
      preferences,
      updatedAt: new Date().toISOString()
    };
    try {
      const result = await getCloudDb().collection(COLLECTION).doc(session.uid).set(payload) as CloudResult<unknown>;
      assertCloudResult(result, '保存基金经理收藏失败。');
      return payload;
    } catch (error) {
      throw new Error(cloudErrorMessage(error, '保存基金经理收藏失败。'));
    }
  }
};

declare global {
  interface Window { FundPreferenceCloud?: typeof api; }
}

window.FundPreferenceCloud = api;
window.dispatchEvent(new CustomEvent('fund-preference-cloud-ready'));
