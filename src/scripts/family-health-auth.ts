import { getCloudSession, signOut, callCloudFunction } from './site-auth';

declare global {
  interface Window {
    FamilyHealthAuth?: {
      getSession: typeof getCloudSession;
      signOut: typeof signOut;
      callCloudFunction: typeof callCloudFunction;
    };
  }
}

// Use the same verified CloudBase session and events as the rest of the website.
window.FamilyHealthAuth = { getSession: getCloudSession, signOut, callCloudFunction };
window.dispatchEvent(new Event('family-health-auth-ready'));
