import {
  callCloudFunction,
  cloudErrorMessage,
  describeSessionExpiry,
  getCloudDb,
  getCloudSession,
  getRememberedSession,
  signInWithPassword,
  signOut,
  startEmailSignUp
} from './site-auth';

type StockTrackingAuthBridge = {
  callCloudFunction: typeof callCloudFunction;
  cloudErrorMessage: typeof cloudErrorMessage;
  describeSessionExpiry: typeof describeSessionExpiry;
  getCloudDb: typeof getCloudDb;
  getCloudSession: typeof getCloudSession;
  getRememberedSession: typeof getRememberedSession;
  signInWithPassword: typeof signInWithPassword;
  signOut: typeof signOut;
  startEmailSignUp: typeof startEmailSignUp;
};

declare global {
  interface Window {
    StockTrackingSharedAuth?: StockTrackingAuthBridge;
  }
}

export const mountStockTrackingAuthBridge = () => {
  window.StockTrackingSharedAuth = {
    callCloudFunction,
    cloudErrorMessage,
    describeSessionExpiry,
    getCloudDb,
    getCloudSession,
    getRememberedSession,
    signInWithPassword,
    signOut,
    startEmailSignUp
  };
  window.dispatchEvent(new CustomEvent('stock-auth-ready'));
  void getCloudSession().catch(() => {
    // The stock page can continue in guest mode when CloudBase is temporarily unavailable.
  });
};

