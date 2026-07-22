import { getCloudSession, getRememberedSession, signOut } from './site-auth';
import type { CloudSession } from './site-auth';

type AuthBlock = {
  root: HTMLElement;
  status: HTMLElement;
  login: HTMLElement | null;
  signOut: HTMLButtonElement | null;
};

const todoLoginUrl = '/officialwebsite/topics/space/planning/todo';
const sessionStorageKey = 'mywebsite.site-auth-session.v1';

const findBlocks = (root: ParentNode): AuthBlock[] => [...root.querySelectorAll<HTMLElement>('[data-site-auth]')]
  .map((element) => {
    const status = element.querySelector<HTMLElement>('[data-site-auth-status]');
    if (!status) return null;
    return {
      root: element,
      status,
      login: element.querySelector<HTMLElement>('[data-site-auth-login]'),
      signOut: element.querySelector<HTMLButtonElement>('[data-site-auth-sign-out]')
    };
  })
  .filter((block): block is AuthBlock => Boolean(block));

const renderBlock = (block: AuthBlock, account: string | null) => {
  block.root.dataset.authState = account ? 'signed-in' : 'signed-out';
  block.status.textContent = account ? `已登录：${account}` : '未登录';
  if (block.login) block.login.hidden = Boolean(account);
  if (block.signOut) block.signOut.hidden = !account;
};

const renderBlocks = (blocks: AuthBlock[], session: CloudSession | null) => {
  blocks.forEach((block) => renderBlock(block, session?.account ?? null));
};

export const mountSiteAuthStatus = async (root: ParentNode = document) => {
  const blocks = findBlocks(root);
  if (!blocks.length) return;

  let sessionCheck: Promise<void> | null = null;
  const reconcileSession = () => {
    if (sessionCheck) return sessionCheck;
    const fallback = getRememberedSession();
    sessionCheck = getCloudSession()
      .then((session) => { renderBlocks(blocks, session); })
      .catch(() => { renderBlocks(blocks, fallback); })
      .finally(() => { sessionCheck = null; });
    return sessionCheck;
  };

  const remembered = getRememberedSession();
  blocks.forEach((block) => {
    block.status.textContent = remembered ? `已登录：${remembered.account}` : '正在检查登录状态…';
    if (block.login instanceof HTMLAnchorElement) block.login.href = todoLoginUrl;
  });
  if (remembered) renderBlocks(blocks, remembered);

  await reconcileSession();

  window.addEventListener('site-auth-change', (event) => {
    const session = event instanceof CustomEvent ? event.detail as CloudSession | null : null;
    renderBlocks(blocks, session);
  });

  window.addEventListener('storage', (event) => {
    if (event.key && event.key !== sessionStorageKey) return;
    renderBlocks(blocks, getRememberedSession());
    void reconcileSession();
  });

  window.addEventListener('focus', () => { void reconcileSession(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reconcileSession();
  });

  blocks.forEach((block) => {
    block.signOut?.addEventListener('click', async () => {
      block.signOut!.disabled = true;
      try {
        await signOut();
        blocks.forEach((item) => renderBlock(item, null));
      } finally {
        block.signOut!.disabled = false;
      }
    });
  });
};
