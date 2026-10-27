import cloudbase from '@cloudbase/js-sdk';

export type CloudSession = {
  uid: string;
  account: string;
};

type CloudResult<T> = {
  data?: T;
  error?: { message?: string; code?: string } | null;
};

type CloudUser = {
  id?: string;
  uid?: string;
  is_anonymous?: boolean;
  username?: string;
  email?: string;
};

type SignInData = {
  user?: CloudUser | null;
  session?: CloudAuthSession | null;
};

type SignUpData = {
  verifyOtp?: (params: { token: string }) => Promise<CloudResult<SignInData>>;
};

type VerificationData = {
  verification_id?: string;
  verificationId?: string;
  verification_token?: string;
  verificationToken?: string;
};

type CloudAuthSession = {
  sub?: string;
  user?: CloudUser | null;
  expires_at?: number;
  expires_in?: number;
  issued_at?: number;
};

type CloudSessionResult = {
  session?: CloudAuthSession | null;
  user?: CloudUser | null;
};

type RememberedSession = CloudSession & {
  expiresAt: number;
};

const ENV_ID = 'magicj-web-d5g9yvowj6862f7a2';
const SESSION_KEY = 'mywebsite.site-auth-session.v1';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_DEADLINE_KEY = 'mywebsite.site-auth-deadline.v1';
const app = cloudbase.init({ env: ENV_ID });
const auth = app.auth({ persistence: 'local' });
const db = app.database();
let sessionRevision = 0;
let sessionCheck: Promise<CloudSession | null> | null = null;
let explicitlySignedOut = false;

const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  if (error && typeof error === 'object' && 'error' in error) {
    const nestedError = error.error;
    if (nestedError && typeof nestedError === 'object' && 'message' in nestedError && typeof nestedError.message === 'string') return nestedError.message;
  }
  return fallback;
};

const readRememberedSession = (): RememberedSession | null => {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedSession>;
    if (!parsed?.uid || !parsed.account || typeof parsed.expiresAt !== 'number') return null;
    return { uid: parsed.uid, account: parsed.account, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
};

let knownSession: CloudSession | null = readRememberedSession();

const rememberSession = (session: CloudSession) => {
  const changed = knownSession?.uid !== session.uid || knownSession.account !== session.account;
  const remembered = readRememberedSession();
  try {
    if (changed || !remembered || remembered.expiresAt <= Date.now()) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, expiresAt: Date.now() + SESSION_TTL_MS }));
    }
  } catch {
    // This cache is only a display hint. CloudBase owns session validity and renewal.
  }
  knownSession = session;
  if (changed) {
    sessionRevision += 1;
    window.dispatchEvent(new CustomEvent('site-auth-change', { detail: session }));
  }
};

const forgetSession = () => {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clean up when localStorage is unavailable.
  }
  sessionRevision += 1;
  knownSession = null;
  sessionCheck = null;
  window.dispatchEvent(new CustomEvent('site-auth-change', { detail: null }));
};

const sessionFromCurrentUser = (currentUser: CloudUser | null | undefined, session?: CloudAuthSession | null) => {
  const uid = currentUser?.id || currentUser?.uid || session?.sub;
  if (!uid || currentUser?.is_anonymous) return null;
  return { uid, account: currentUser?.email || currentUser?.username || '我的账号' } satisfies CloudSession;
};

const assertCloudResult = <T>(result: CloudResult<T>, fallback: string) => {
  if (!result) throw new Error(fallback);
  if (result.error) throw Object.assign(new Error(result.error.message || fallback), { code: result.error.code });
  return result.data;
};

export const getCloudDb = () => db;

export const callCloudFunction = async (
  name: string,
  data: Record<string, unknown> = {}
) => app.callFunction({ name, data });

export const getRememberedSession = () => {
  const remembered = readRememberedSession();
  if (!remembered) return null;
  if (remembered.expiresAt <= Date.now()) {
    return null;
  }
  return { uid: remembered.uid, account: remembered.account } satisfies CloudSession;
};

const withSessionLock = async <T>(operation: () => Promise<T>): Promise<T> =>
  navigator.locks ? await navigator.locks.request(`mywebsite.auth:${ENV_ID}`, operation) : operation();

const sessionNeedsRefresh = (session: CloudAuthSession) => {
  const expiresAt = session.expires_at ?? (session.issued_at && session.expires_in !== undefined
    ? session.issued_at + session.expires_in : undefined);
  return expiresAt !== undefined ? expiresAt <= Date.now() / 1000 + 60
    : session.expires_in !== undefined && session.expires_in <= 60;
};

const loginRequired = () => Object.assign(new Error('登录会话已失效，请重新登录；本地数据已保留。'), { code: 'SITE_AUTH_REQUIRED' });
const missingSessionCredentials = (error: unknown) =>
  /credentials not found|Cannot read properties of (?:null|undefined) \(reading ['"]refresh_token['"]\)/i.test(errorMessage(error, ''));

const renewCloudSession = async () => {
  try {
    const data = assertCloudResult(await auth.refreshSession() as CloudResult<CloudSessionResult>, '无法续期登录会话。');
    if (!data?.session) throw loginRequired();
    return data;
  } catch (error) {
    const code = String((error as { code?: string })?.code || '');
    if (/^(?:refresh_token_expired|invalid_refresh_token)$/i.test(code) || missingSessionCredentials(error)) {
      throw loginRequired();
    }
    throw error;
  }
};

export const getCloudSession = (): Promise<CloudSession | null> => {
  if (explicitlySignedOut) return Promise.resolve(null);
  const deadline = Number(window.localStorage.getItem(LOGIN_DEADLINE_KEY));
  if (deadline && deadline <= Date.now()) {
    return signOut().then(() => { throw loginRequired(); });
  }
  if (sessionCheck) return sessionCheck;
  const revisionAtStart = sessionRevision;
  const pending = withSessionLock(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (revisionAtStart !== sessionRevision || explicitlySignedOut) return null;
      try {
        let sessionData: CloudSessionResult | undefined;
        try {
          sessionData = assertCloudResult(await auth.getSession() as CloudResult<CloudSessionResult>, '无法核实登录状态。');
        } catch (error) {
          if (revisionAtStart !== sessionRevision || explicitlySignedOut) return null;
          const missingCredentials = missingSessionCredentials(error);
          if (missingCredentials && !readRememberedSession()) return null;
          if (!missingCredentials) {
            if (!/token_expired|access_token_expired/i.test(String((error as { code?: string })?.code))) throw error;
            sessionData = await renewCloudSession();
          }
        }
        if (revisionAtStart !== sessionRevision || explicitlySignedOut) return null;
        if (sessionData?.session && sessionNeedsRefresh(sessionData.session)) {
          sessionData = await renewCloudSession();
        } else if (!sessionData?.session && readRememberedSession() && attempt === 2) {
          // A display hint cannot supply refresh credentials; allow restoration, then request explicit login.
          throw loginRequired();
        }
        if (revisionAtStart !== sessionRevision || explicitlySignedOut) return null;
        const authenticated = sessionData?.session;
        const session = authenticated ? sessionFromCurrentUser(sessionData?.user || authenticated.user, authenticated) : null;
        if (session) {
          // Start the transition period once for existing valid SDK sessions; never slide it on refresh.
          if (!window.localStorage.getItem(LOGIN_DEADLINE_KEY)) {
            window.localStorage.setItem(LOGIN_DEADLINE_KEY, String(Date.now() + SESSION_TTL_MS));
          }
          rememberSession(session);
          return session;
        }
        if (!readRememberedSession()) return null;
        lastError = new Error('暂时无法核实登录会话，将自动重试。');
      } catch (error) {
        if (revisionAtStart !== sessionRevision || explicitlySignedOut) return null;
        if ((error as { code?: string })?.code === 'SITE_AUTH_REQUIRED') throw error;
        if (/credentials not found/i.test(errorMessage(error, ''))) {
          if (!readRememberedSession()) return null;
          lastError = new Error('暂时无法核实登录会话，将自动重试。');
        } else lastError = error;
      }
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
    }
    // Never authorize cloud access from the display cache, or broadcast a logout on network failure.
    throw lastError;
  }).finally(() => { if (sessionCheck === pending) sessionCheck = null; });
  sessionCheck = pending;
  return pending;
};

export const startEmailSignUp = async (email: string, password: string) => {
  const result = await auth.signUp({ email, password }) as CloudResult<SignUpData>;
  const signUpData = assertCloudResult(result, '无法发送邮箱验证码。');
  const verifyOtp = signUpData?.verifyOtp;
  if (!verifyOtp) throw new Error('无法发送邮箱验证码，请稍后重试。');

  return async (verificationCode: string) => {
    sessionRevision += 1;
    sessionCheck = null;
    explicitlySignedOut = false;
    const verifyResult = await verifyOtp({ token: verificationCode });
    assertCloudResult(verifyResult, '邮箱验证码无效或已过期。');
    window.localStorage.setItem(LOGIN_DEADLINE_KEY, String(Date.now() + SESSION_TTL_MS));
    const session = await getCloudSession();
    if (!session) throw new Error('验证成功，但未取得登录会话。请重新登录。');
    rememberSession(session);
    return session;
  };
};

export const signInWithPassword = async (email: string, password: string) => {
  const revisionAtStart = ++sessionRevision;
  sessionCheck = null;
  explicitlySignedOut = false;
  const result = await withSessionLock(() => auth.signInWithPassword({ email, password })) as CloudResult<SignInData>;
  if (revisionAtStart !== sessionRevision || explicitlySignedOut) throw new Error('登录操作已取消，请重试。');
  const loginData = assertCloudResult(result, '登录失败。');
  window.localStorage.setItem(LOGIN_DEADLINE_KEY, String(Date.now() + SESSION_TTL_MS));
  const authenticatedSession = loginData?.session;
  const session = authenticatedSession
    ? sessionFromCurrentUser(loginData?.user || authenticatedSession.user, authenticatedSession)
    : await getCloudSession();
  if (!session) throw new Error('登录成功，但未取得登录会话。请重试。');
  rememberSession(session);
  return session;
};

export const startPasswordReset = async (email: string) => {
  const modernAuth = auth as typeof auth & {
    getVerification: (params: { email: string; target: 'USER' }) => Promise<CloudResult<VerificationData> & VerificationData>;
  };
  const result = await modernAuth.getVerification({ email, target: 'USER' });
  const verification = assertCloudResult<VerificationData>(result, '无法发送邮箱验证码，请稍后重试。');
  const verificationId = verification?.verification_id || verification?.verificationId || result.verification_id || result.verificationId;
  if (!verificationId) throw new Error('验证码已请求，但没有取得验证编号。请稍后重试。');
  return verificationId;
};

export const completePasswordReset = async (email: string, verificationId: string, code: string, newPassword: string) => {
  const modernAuth = auth as typeof auth & {
    verify: (params: { verification_id: string; verification_code: string }) => Promise<CloudResult<VerificationData>>;
    resetPassword: (params: { email: string; new_password: string; verification_token: string }) => Promise<unknown>;
  };
  const verificationResult = await modernAuth.verify({ verification_id: verificationId, verification_code: code });
  const verification = assertCloudResult<VerificationData>(verificationResult, '邮箱验证码错误或已过期。');
  const verificationToken = verification?.verification_token || verification?.verificationToken;
  if (!verificationToken) throw new Error('验证码验证成功，但没有取得重置授权。请重新获取验证码。');
  const resetPassword = modernAuth.resetPassword as unknown as (params: {
    email: string;
    new_password: string;
    verification_token: string;
  }) => Promise<unknown>;
  const result: unknown = await resetPassword({ email, new_password: newPassword, verification_token: verificationToken });
  if (result && typeof result === 'object' && 'error' in result && result.error) {
    throw new Error(typeof result.error === 'object' && result.error && 'message' in result.error && typeof result.error.message === 'string'
      ? result.error.message
      : '重置密码失败，请稍后重试。');
  }
};

export const signOut = async () => {
  const result = await withSessionLock(() => auth.signOut());
  if (result?.error) throw new Error(result.error.message || '云端退出失败，请重试');
  explicitlySignedOut = true;
  forgetSession();
  window.localStorage.removeItem(LOGIN_DEADLINE_KEY);
};

// Static pages can contain more than one built entry. Share explicit sign-in/out in the same document too.
window.addEventListener('site-auth-change', (event) => {
  const next = (event as CustomEvent<CloudSession | null>).detail;
  if ((next?.uid || null) === (knownSession?.uid || null) && Boolean(next) !== explicitlySignedOut) return;
  knownSession = next || null;
  explicitlySignedOut = !next;
  sessionRevision += 1;
  sessionCheck = null;
});

window.addEventListener('storage', (event) => {
  if (event.key !== null && event.key !== SESSION_KEY) return;
  const remembered = readRememberedSession();
  if (remembered?.uid === knownSession?.uid && remembered?.account === knownSession?.account) return;
  sessionRevision += 1;
  sessionCheck = null;
  explicitlySignedOut = !remembered;
  if (!remembered) {
    knownSession = null;
    window.dispatchEvent(new CustomEvent('site-auth-change', { detail: null }));
  } else void getCloudSession().catch(() => undefined);
});

const maintainSession = () => {
  if (!explicitlySignedOut && readRememberedSession() && document.visibilityState !== 'hidden' && navigator.onLine !== false) {
    void getCloudSession().catch(() => undefined);
  }
};
window.addEventListener('focus', maintainSession);
window.addEventListener('online', maintainSession);
document.addEventListener('visibilitychange', maintainSession);
setInterval(maintainSession, 60_000);

export const describeSessionExpiry = () => '登录有效期为 30 天；到期需重新登录。';

export const cloudErrorMessage = errorMessage;
