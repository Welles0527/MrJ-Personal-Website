import cloudbase from '@cloudbase/js-sdk';

export type CloudSession = {
  uid: string;
  account: string;
};

type CloudResult<T> = {
  data?: T;
  error?: { message?: string } | null;
};

type CloudUser = {
  uid?: string;
  username?: string;
  email?: string;
};

type SignInData = {
  user?: CloudUser | null;
};

type SignUpData = {
  verifyOtp?: (params: { token: string }) => Promise<CloudResult<SignInData>>;
};

type LoginState = {
  user?: CloudUser | null;
} | null;

type RememberedSession = CloudSession & {
  expiresAt: number;
};

const ENV_ID = 'magicj-web-d5g9yvowj6862f7a2';
const SESSION_KEY = 'mywebsite.site-auth-session.v1';
const SESSION_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const app = cloudbase.init({ env: ENV_ID });
const auth = app.auth();
const db = app.database();

const errorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
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

const rememberSession = (session: CloudSession) => {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, expiresAt: Date.now() + SESSION_TTL_MS }));
    window.dispatchEvent(new CustomEvent('site-auth-change', { detail: session }));
  } catch {
    // CloudBase auth still owns the real session; this only controls the three-day local default.
  }
};

const forgetSession = () => {
  try {
    window.localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new CustomEvent('site-auth-change', { detail: null }));
  } catch {
    // Nothing to clean up when localStorage is unavailable.
  }
};

const sessionFromCurrentUser = (loginState?: LoginState) => {
  const currentUser = loginState?.user ?? auth.currentUser as CloudUser | null;
  if (!currentUser?.uid) return null;
  return { uid: currentUser.uid, account: currentUser.email || currentUser.username || '我的账号' } satisfies CloudSession;
};

const assertCloudResult = <T>(result: CloudResult<T>, fallback: string) => {
  if (!result) throw new Error(fallback);
  if (result.error) throw new Error(result.error.message || fallback);
  return result.data;
};

export const getCloudDb = () => db;

export const getRememberedSession = () => {
  const remembered = readRememberedSession();
  if (!remembered) return null;
  if (remembered.expiresAt <= Date.now()) {
    forgetSession();
    return null;
  }
  return { uid: remembered.uid, account: remembered.account } satisfies CloudSession;
};

export const getCloudSession = async () => {
  const remembered = getRememberedSession();
  const loginState = await auth.getLoginState() as LoginState;
  const session = sessionFromCurrentUser(loginState);
  if (!session) return remembered;

  if (!remembered || remembered.uid !== session.uid) {
    rememberSession(session);
    return session;
  }
  return session;
};

export const startEmailSignUp = async (email: string, password: string) => {
  const result = await auth.signUp({ email, password }) as CloudResult<SignUpData>;
  const signUpData = assertCloudResult(result, '无法发送邮箱验证码。');
  const verifyOtp = signUpData?.verifyOtp;
  if (!verifyOtp) throw new Error('无法发送邮箱验证码，请稍后重试。');

  return async (verificationCode: string) => {
    const verifyResult = await verifyOtp({ token: verificationCode });
    const verificationData = assertCloudResult(verifyResult, '邮箱验证码无效或已过期。');
    const session = sessionFromCurrentUser({ user: verificationData?.user }) || await getCloudSession();
    if (!session) throw new Error('验证成功，但未取得登录会话。请重新登录。');
    rememberSession(session);
    return session;
  };
};

export const signInWithPassword = async (email: string, password: string) => {
  const result = await auth.signInWithPassword({ email, password }) as CloudResult<SignInData>;
  const loginData = assertCloudResult(result, '登录失败。');
  const session = sessionFromCurrentUser({ user: loginData?.user }) || await getCloudSession();
  if (!session) throw new Error('登录成功，但未取得登录会话。请重试。');
  rememberSession(session);
  return session;
};

export const signOut = async () => {
  forgetSession();
  await auth.signOut();
};

export const describeSessionExpiry = () => '登录状态默认保留 3 天。';

export const cloudErrorMessage = errorMessage;
