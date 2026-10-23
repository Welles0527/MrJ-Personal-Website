import { getCloudSession, signOut } from './site-auth';

declare global {
  interface Window {
    FamilyHealthAuth?: {
      getSession: typeof getCloudSession;
      signOut: typeof signOut;
    };
  }
}

// Use the same verified CloudBase session and events as the rest of the website.
window.FamilyHealthAuth = { getSession: getCloudSession, signOut };
window.dispatchEvent(new Event('family-health-auth-ready'));
