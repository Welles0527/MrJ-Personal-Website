import { mountAccountToolbar } from './account-toolbar';
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAccountToolbar, { once: true });
else mountAccountToolbar();
