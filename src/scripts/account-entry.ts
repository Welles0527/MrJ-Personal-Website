import { mountCalendarFavoriteCloud } from './calendar-favorites-cloud';
import { mountAccountSyncStatus } from './account-sync-status';
import { mountAccountToolbar } from './account-toolbar';
import { getCloudDb, getCloudSession } from './site-auth';
import { loadCloudTodos, upsertCloudTodo, watchCloudTodos, type CloudTodo } from './todo-cloud';

const boardPath = '/super-calendar/';
const path = location.pathname.toLowerCase();
if (path.endsWith(boardPath + 'daily-board.html') || path.endsWith(boardPath + encodeURIComponent('每日看板').toLowerCase() + '.html')) {
  Object.assign(window, { MagicJDailyBoardAccount: {
    session: getCloudSession,
    layouts: () => getCloudDb().collection('officialWebsiteDailyBoardLayouts'),
    todos: {
      load: loadCloudTodos,
      watch: watchCloudTodos,
      async setCompleted(ownerId: string, todo: CloudTodo, completed: boolean) {
        if (!todo.updatedAt || (await getCloudSession())?.uid !== ownerId) throw new Error('请重新同步账号待办。');
        const receipt = await upsertCloudTodo(ownerId, {
          ...todo, completed, updatedAt: new Date().toISOString()
        }, todo.updatedAt);
        return receipt.todo;
      }
    }
  } });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { mountAccountToolbar(); mountAccountSyncStatus(); mountCalendarFavoriteCloud(); }, { once: true });
else { mountAccountToolbar(); mountAccountSyncStatus(); mountCalendarFavoriteCloud(); }
