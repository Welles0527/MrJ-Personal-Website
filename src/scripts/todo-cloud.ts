import { cloudErrorMessage, getCloudDb, getCloudSession, getRememberedSession, signInWithPassword, signOut, startEmailSignUp } from './site-auth';
import type { CloudSession } from './site-auth';

export type CloudTodoCategory = 'work' | 'study' | 'life' | 'health' | 'other';
export type CloudTodoPlacement = 'upcoming' | 'ai';

export type CloudTodo = {
  id: string;
  title: string;
  date: string;
  category: CloudTodoCategory;
  placement?: CloudTodoPlacement;
  sortOrder?: number;
  important: boolean;
  completed: boolean;
  note: string;
  createdAt: string;
  updatedAt: string;
};

type CloudResult<T> = {
  data?: T;
  error?: { message?: string } | null;
};

const TODO_COLLECTION = 'officialWebsiteTodos';
const db = getCloudDb();

const assertCloudResult = <T>(result: CloudResult<T>, fallback: string) => {
  if (!result) throw new Error(fallback);
  if (result.error) throw new Error(result.error.message || fallback);
  return result.data;
};

export { getCloudSession, getRememberedSession, signInWithPassword, signOut, startEmailSignUp };
export type { CloudSession };

export const loadCloudTodos = async (ownerId: string): Promise<CloudTodo[]> => {
  const result = await db.collection(TODO_COLLECTION).where({ ownerId }).get() as CloudResult<CloudTodo[]>;
  return (assertCloudResult(result, '读取云端待办失败。') || [])
    .filter((todo) => todo && typeof todo.id === 'string')
    .sort((first, second) => String(first.date || '').localeCompare(String(second.date || '')) || String(first.createdAt || '').localeCompare(String(second.createdAt || '')));
};

export const upsertCloudTodo = async (ownerId: string, todo: CloudTodo) => {
  try {
    const result = await db.collection(TODO_COLLECTION).doc(todo.id).set({ ...todo, ownerId }) as CloudResult<unknown>;
    assertCloudResult(result, '保存云端待办失败。');
  } catch (error) {
    throw new Error(cloudErrorMessage(error, '保存云端待办失败。'));
  }
};

export const removeCloudTodo = async (todoId: string) => {
  try {
    const result = await db.collection(TODO_COLLECTION).doc(todoId).remove() as CloudResult<unknown>;
    assertCloudResult(result, '删除云端待办失败。');
  } catch (error) {
    throw new Error(cloudErrorMessage(error, '删除云端待办失败。'));
  }
};
