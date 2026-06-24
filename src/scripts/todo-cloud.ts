import cloudbase from '@cloudbase/js-sdk';

export type CloudTodoCategory = 'work' | 'study' | 'life' | 'health' | 'other';

export type CloudTodo = {
  id: string;
  title: string;
  date: string;
  category: CloudTodoCategory;
  important: boolean;
  completed: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
};

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

type LoginState = {
  user?: CloudUser | null;
} | null;

const ENV_ID = 'magicj-web-d5g9yvowj6862f7a2';
const TODO_COLLECTION = 'officialWebsiteTodos';
const app = cloudbase.init({ env: ENV_ID });
const auth = app.auth();
const db = app.database();

const errorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
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

export const getCloudSession = async () => {
  const loginState = await auth.getLoginState() as LoginState;
  return sessionFromCurrentUser(loginState);
};

export const signUpWithPassword = async (email: string, password: string) => {
  const result = await auth.signUp({ email, password }) as CloudResult<unknown>;
  assertCloudResult(result, '注册失败。');
};

export const signInWithPassword = async (email: string, password: string) => {
  const result = await auth.signInWithPassword({ email, password }) as CloudResult<SignInData>;
  const loginData = assertCloudResult(result, '登录失败。');
  const session = sessionFromCurrentUser({ user: loginData?.user }) || await getCloudSession();
  if (!session) throw new Error('登录成功，但未取得登录会话。请重试。');
  return session;
};

export const signOut = () => auth.signOut();

export const loadCloudTodos = async (ownerId: string): Promise<CloudTodo[]> => {
  const result = await db.collection(TODO_COLLECTION).where({ ownerId }).get() as CloudResult<CloudTodo[]>;
  return (assertCloudResult(result, '读取云端待办失败。') || [])
    .filter((todo) => todo && typeof todo.id === 'string')
    .sort((first, second) => first.date.localeCompare(second.date) || first.createdAt.localeCompare(second.createdAt));
};

export const upsertCloudTodo = async (ownerId: string, todo: CloudTodo) => {
  try {
    const result = await db.collection(TODO_COLLECTION).doc(todo.id).set({ ...todo, ownerId }) as CloudResult<unknown>;
    assertCloudResult(result, '保存云端待办失败。');
  } catch (error) {
    throw new Error(errorMessage(error, '保存云端待办失败。'));
  }
};

export const removeCloudTodo = async (todoId: string) => {
  try {
    const result = await db.collection(TODO_COLLECTION).doc(todoId).remove() as CloudResult<unknown>;
    assertCloudResult(result, '删除云端待办失败。');
  } catch (error) {
    throw new Error(errorMessage(error, '删除云端待办失败。'));
  }
};
