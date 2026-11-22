import { mountCalendarFavoriteCloud } from './calendar-favorites-cloud';
import { mountAccountSyncStatus } from './account-sync-status';
import { mountAccountToolbar } from './account-toolbar';
import { getCloudDb, getCloudSession } from './site-auth';

const boardPath = '/super-calendar/';
const path = location.pathname.toLowerCase();
if (path.endsWith(boardPath + 'daily-board.html') || path.endsWith(boardPath + encodeURIComponent('每日看板').toLowerCase() + '.html')) {
  Object.assign(window, { MagicJDailyBoardAccount: {
    session: getCloudSession,
    layouts: () => getCloudDb().collection('officialWebsiteDailyBoardLayouts')
  } });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { mountAccountToolbar(); mountAccountSyncStatus(); mountCalendarFavoriteCloud(); }, { once: true });
else { mountAccountToolbar(); mountAccountSyncStatus(); mountCalendarFavoriteCloud(); }
