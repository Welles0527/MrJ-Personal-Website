import { getCloudSession, signOut } from './site-auth';

type AuthBlock = {
  root: HTMLElement;
  status: HTMLElement;
  login: HTMLElement | null;
  signOut: HTMLButtonElement | null;
};

const todoLoginUrl = '/officialwebsite/topics/space/planning/todo';

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

export const mountSiteAuthStatus = async (root: ParentNode = document) => {
  const blocks = findBlocks(root);
  if (!blocks.length) return;

  blocks.forEach((block) => {
    block.status.textContent = '正在检查登录状态…';
    if (block.login instanceof HTMLAnchorElement) block.login.href = todoLoginUrl;
  });

  try {
    const session = await getCloudSession();
    blocks.forEach((block) => renderBlock(block, session?.account ?? null));
  } catch {
    blocks.forEach((block) => renderBlock(block, null));
  }

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
