import { cloudErrorMessage, getCloudDb, getCloudSession, getRememberedSession, signInWithPassword, signOut, startEmailSignUp } from './site-auth';
import type { CloudSession } from './site-auth';

export type CloudTodoCategory = 'work' | 'study' | 'life' | 'health' | 'other';
export type CloudTodoPlacement = 'upcoming' | 'ai' | 'weekly';

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
  deletedAt?: string;
  syncVersion?: number;
};

type CloudTodoRecord = CloudTodo & {
  _id?: string;
  ownerId?: string;
};

type CloudResult<T> = {
  data?: T;
  error?: { message?: string } | null;
  code?: string | number;
  message?: string;
  requestId?: string;
  request_id?: string;
  updated?: number;
  upsertedId?: string;
  upserted_id?: string;
  deleted?: number;
};

export type CloudTodoLoadResult = {
  todos: CloudTodo[];
  requestId: string | null;
};

export type CloudTodoMutationReceipt = {
  ownerId: string;
  taskId: string;
  createdAt: string;
  updatedAt: string;
  requestId: string;
  verificationRequestId: string | null;
  todo: CloudTodo;
};

export type CloudTodoWatcher = {
  pageCount: number;
  capacity: number;
  close: () => Promise<unknown> | unknown;
};

const TODO_COLLECTION = 'officialWebsiteTodos';
const TODO_WATCH_PAGE_SIZE = 100;
const db = getCloudDb();

const validSyncVersion = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 1;

const resultDataObject = (result: CloudResult<unknown>) => result.data && typeof result.data === 'object' && !Array.isArray(result.data)
  ? result.data as Record<string, unknown>
  : null;

const resultRequestId = (result: CloudResult<unknown>) => result.requestId
  || result.request_id
  || (typeof resultDataObject(result)?.requestId === 'string' ? resultDataObject(result)?.requestId as string : null)
  || null;

const assertCloudResult = <T>(result: CloudResult<T>, fallback: string) => {
  if (!result) throw new Error(fallback);
  if (result.error) throw new Error(result.error.message || fallback);
  if (result.code) throw new Error(result.message || `${fallback}（${String(result.code)}）`);
  return result;
};

const mutationNumber = (result: CloudResult<unknown>, field: 'updated' | 'deleted') => {
  const direct = result[field];
  if (typeof direct === 'number') return direct;
  const nested = resultDataObject(result)?.[field];
  return typeof nested === 'number' ? nested : null;
};

const mutationId = (result: CloudResult<unknown>) => {
  const direct = result.upsertedId || result.upserted_id;
  if (direct) return direct;
  const nested = resultDataObject(result);
  const value = nested?.upsertedId || nested?.upserted_id || nested?.upsert_id || nested?._id;
  return typeof value === 'string' ? value : null;
};

const todoFromRecord = (record: CloudTodoRecord): CloudTodo => {
  const { _id: ignoredId, ownerId: ignoredOwner, ...todo } = record;
  void ignoredId;
  void ignoredOwner;
  return todo;
};

const recordFromResult = (result: CloudResult<CloudTodoRecord[] | CloudTodoRecord>) => {
  const data = result.data;
  if (Array.isArray(data)) return data[0] || null;
  return data && typeof data === 'object' ? data : null;
};

const assertOwnedRecord = (record: CloudTodoRecord, ownerId: string, todoId: string) => {
  if ((record._id && record._id !== todoId) || record.id !== todoId) {
    throw new Error('云端回读记录 ID 与本次保存不一致。');
  }
  if (record.ownerId !== ownerId) throw new Error('云端回读记录所属账号与当前登录账号不一致。');
  return todoFromRecord(record);
};

const isMissingRecordError = (error: unknown) => /not[ _-]?found|does not exist|不存在/i.test(cloudErrorMessage(error, ''));

const logSync = (event: string, detail: Record<string, unknown>) => {
  console.info('[todo-sync]', { event, ...detail });
};

export { getCloudSession, getRememberedSession, signInWithPassword, signOut, startEmailSignUp };
export type { CloudSession };

export const loadCloudTodos = async (ownerId: string): Promise<CloudTodoLoadResult> => {
  const result = assertCloudResult(
    await db.collection(TODO_COLLECTION).where({ ownerId }).limit(1000).get() as CloudResult<CloudTodoRecord[]>,
    '读取云端待办失败。'
  );
  const todos = (result.data || [])
    .filter((todo) => todo && typeof todo.id === 'string' && todo.ownerId === ownerId)
    .map(todoFromRecord)
    .sort((first, second) => String(first.date || '').localeCompare(String(second.date || '')) || String(first.createdAt || '').localeCompare(String(second.createdAt || '')));
  const requestId = resultRequestId(result);
  logSync('load_completed', {
    user_id: ownerId,
    request_id: requestId,
    task_count: todos.length,
    read_at: new Date().toISOString()
  });
  return { todos, requestId };
};

export const loadCloudTodo = async (ownerId: string, todoId: string) => {
  try {
    const result = assertCloudResult(
      await db.collection(TODO_COLLECTION).doc(todoId).get() as CloudResult<CloudTodoRecord[] | CloudTodoRecord>,
      '回读云端待办失败。'
    );
    const record = recordFromResult(result);
    return {
      todo: record ? assertOwnedRecord(record, ownerId, todoId) : null,
      requestId: resultRequestId(result)
    };
  } catch (error) {
    if (isMissingRecordError(error)) return { todo: null, requestId: null };
    throw error;
  }
};

export const watchCloudTodos = (
  ownerId: string,
  todoCount: number,
  onChange: (todos: CloudTodo[]) => void,
  onError: (error: Error) => void
): CloudTodoWatcher => {
  const pageCount = Math.max(1, Math.ceil(todoCount / TODO_WATCH_PAGE_SIZE));
  const watchers: CloudTodoWatcher[] = [];
  let closed = false;
  let failed = false;

  const close = async () => {
    if (closed) return;
    closed = true;
    await Promise.all(watchers.map((watcher) => Promise.resolve(watcher.close()).catch(() => undefined)));
  };

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const watcher = db.collection(TODO_COLLECTION)
      .where({ ownerId })
      .skip(pageIndex * TODO_WATCH_PAGE_SIZE)
      .limit(TODO_WATCH_PAGE_SIZE)
      .watch({
        onChange: (snapshot) => {
          if (closed) return;
          const records = Array.isArray(snapshot.docs) ? snapshot.docs as CloudTodoRecord[] : [];
          const todos = records
            .filter((todo) => todo?.ownerId === ownerId && typeof todo.id === 'string')
            .map(todoFromRecord);
          logSync('watch_snapshot', {
            user_id: ownerId,
            page_index: pageIndex,
            page_count: pageCount,
            task_count: todos.length,
            read_at: new Date().toISOString()
          });
          onChange(todos);
        },
        onError: (error: unknown) => {
          if (closed || failed) return;
          failed = true;
          console.warn('[todo-sync]', {
            event: 'watch_failed',
            user_id: ownerId,
            page_index: pageIndex,
            page_count: pageCount,
            error: cloudErrorMessage(error, '云端待办实时同步已中断。')
          });
          void close();
          onError(new Error(cloudErrorMessage(error, '云端待办实时同步已中断。')));
        }
      }) as CloudTodoWatcher;
    watchers.push(watcher);
  }

  return { pageCount, capacity: pageCount * TODO_WATCH_PAGE_SIZE, close };
};

export const upsertCloudTodo = async (
  ownerId: string,
  todo: CloudTodo,
  expectedUpdatedAt?: string
): Promise<CloudTodoMutationReceipt> => {
  let requestId: string | null = null;
  try {
    const current = await loadCloudTodo(ownerId, todo.id);
    let nextSyncVersion = 1;
    if (current.todo) {
      if (expectedUpdatedAt) {
        if (current.todo.updatedAt !== expectedUpdatedAt) {
          throw new Error('云端待办已在其他浏览器更新，请刷新后重试。');
        }
      } else if (current.todo.updatedAt !== todo.updatedAt) {
        throw new Error('云端已存在同 ID 的其他版本，已拒绝覆盖。');
      }
      nextSyncVersion = validSyncVersion(current.todo.syncVersion) ? current.todo.syncVersion + 1 : 1;
    } else if (expectedUpdatedAt) {
      throw new Error('云端待办已在其他浏览器删除，请刷新后重试。');
    }
    const payload = { ...todo, ownerId, syncVersion: nextSyncVersion };
    let result: CloudResult<unknown>;
    if (current.todo) {
      const conditions: Record<string, unknown> = {
        ownerId,
        id: todo.id,
        updatedAt: current.todo.updatedAt
      };
      if (validSyncVersion(current.todo.syncVersion)) conditions.syncVersion = current.todo.syncVersion;
      result = assertCloudResult(
        await db.collection(TODO_COLLECTION).where(conditions).update({
          ...payload,
          deletedAt: todo.deletedAt ?? db.command.remove()
        }) as CloudResult<unknown>,
        '保存云端待办失败。'
      );
      if (mutationNumber(result, 'updated') !== 1) {
        throw new Error('云端待办已在其他浏览器更新，请刷新后重试。');
      }
    } else {
      result = assertCloudResult(
        await db.collection(TODO_COLLECTION).doc(todo.id).set(payload) as CloudResult<unknown>,
        '保存云端待办失败。'
      );
      const updated = mutationNumber(result, 'updated');
      const upsertedId = mutationId(result);
      if (updated !== 1 && upsertedId !== todo.id) {
        throw new Error('云端保存未确认影响记录，请重新读取云端后重试。');
      }
    }
    requestId = resultRequestId(result);
    if (!requestId) throw new Error('云端保存未返回 requestId，无法确认本次写入。');

    const verification = await loadCloudTodo(ownerId, todo.id);
    if (!verification.todo) throw new Error('云端保存后未能回读该记录。');
    if (verification.todo.updatedAt !== todo.updatedAt) throw new Error('云端回读的更新时间与本次保存不一致。');
    if (verification.todo.deletedAt !== todo.deletedAt) throw new Error('云端回读的删除标记与本次保存不一致。');
    if (verification.todo.syncVersion !== nextSyncVersion) throw new Error('云端回读的同步版本与本次保存不一致。');

    logSync('save_verified', {
      user_id: ownerId,
      task_id: todo.id,
      request_id: requestId,
      verification_request_id: verification.requestId,
      created_at: todo.createdAt,
      updated_at: todo.updatedAt,
      sync_version: nextSyncVersion
    });
    return {
      ownerId,
      taskId: todo.id,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
      requestId,
      verificationRequestId: verification.requestId,
      todo: verification.todo
    };
  } catch (error) {
    console.warn('[todo-sync]', {
      event: 'save_failed',
      user_id: ownerId,
      task_id: todo.id,
      request_id: requestId,
      created_at: todo.createdAt,
      updated_at: todo.updatedAt,
      error: cloudErrorMessage(error, '保存云端待办失败。')
    });
    throw new Error(cloudErrorMessage(error, '保存云端待办失败。'));
  }
};

export const removeCloudTodo = async (ownerId: string, todoId: string, expectedUpdatedAt: string) => {
  let requestId: string | null = null;
  try {
    const current = await loadCloudTodo(ownerId, todoId);
    if (!current.todo) throw new Error('云端待办已不存在。');
    if (current.todo.updatedAt !== expectedUpdatedAt) {
      throw new Error('云端待办已在其他浏览器更新，已拒绝彻底删除。');
    }
    const conditions: Record<string, unknown> = { ownerId, id: todoId, updatedAt: expectedUpdatedAt };
    if (validSyncVersion(current.todo.syncVersion)) conditions.syncVersion = current.todo.syncVersion;
    const result = assertCloudResult(
      await db.collection(TODO_COLLECTION).where(conditions).remove() as CloudResult<unknown>,
      '删除云端待办失败。'
    );
    requestId = resultRequestId(result);
    if (!requestId) throw new Error('云端删除未返回 requestId，无法确认本次操作。');
    if (mutationNumber(result, 'deleted') !== 1) throw new Error('云端删除未确认影响记录。');

    const verification = await loadCloudTodo(ownerId, todoId);
    if (verification.todo) throw new Error('云端删除后记录仍然存在。');
    logSync('delete_verified', {
      user_id: ownerId,
      task_id: todoId,
      request_id: requestId,
      verification_request_id: verification.requestId,
      deleted_at: new Date().toISOString()
    });
    return { ownerId, taskId: todoId, requestId, verificationRequestId: verification.requestId };
  } catch (error) {
    console.warn('[todo-sync]', {
      event: 'delete_failed',
      user_id: ownerId,
      task_id: todoId,
      request_id: requestId,
      error: cloudErrorMessage(error, '删除云端待办失败。')
    });
    throw new Error(cloudErrorMessage(error, '删除云端待办失败。'));
  }
};

export const upgradeCloudTodoVersions = async (ownerId: string, todos: CloudTodo[]) => {
  const outdatedTodos = todos.filter((todo) => !validSyncVersion(todo.syncVersion));
  for (const todo of outdatedTodos) {
    await upsertCloudTodo(ownerId, todo, todo.updatedAt);
  }
  return outdatedTodos.length;
};
