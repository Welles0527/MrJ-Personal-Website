import { mountCalendarFavoriteCloud } from './calendar-favorites-cloud';
import { mountAccountSyncStatus } from './account-sync-status';
import { mountAccountToolbar } from './account-toolbar';
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { mountAccountToolbar(); mountAccountSyncStatus(); mountCalendarFavoriteCloud(); }, { once: true });
else { mountAccountToolbar(); mountAccountSyncStatus(); mountCalendarFavoriteCloud(); }
