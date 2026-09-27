(() => {
  const selector = 'a[href^="mailto:welles.gu@gmail.com"],[data-copy="MrJ-0527"],[data-contact-qr]';
  let dialog;

  function openContact() {
    if (!dialog) {
      const style = document.createElement('style');
      style.textContent = `
        .site-contact-dialog{position:fixed;inset:0;margin:auto;width:min(420px,calc(100vw - 28px));max-height:calc(100dvh - 28px);padding:0;border:1px solid #a97853;border-radius:22px;background:#171512;color:#f6ece2;box-shadow:0 24px 80px #000b;overflow:auto;font-family:inherit}
        .site-contact-dialog::backdrop{background:#080706c9;backdrop-filter:blur(5px)}
        .site-contact-inner{padding:25px 26px 24px;text-align:center}
        .site-contact-close{position:absolute;top:12px;right:13px;display:grid;place-items:center;width:34px;height:34px;border:1px solid #c59a7766;border-radius:50%;background:#2b221c;color:#f6ece2;font-size:23px;line-height:1;cursor:pointer}
        .site-contact-head{display:flex;align-items:center;gap:14px;margin:0 22px 20px 0;text-align:left}
        .site-contact-avatar-frame{width:62px;height:62px;flex:none;overflow:hidden;border:2px solid #dba474;border-radius:16px}
        .site-contact-avatar{display:block;width:100%;height:100%;object-fit:cover;transform:scale(2.2);transform-origin:50% 30%}
        .site-contact-head strong{display:block;color:#ffc08c;font-size:19px;line-height:1.3}
        .site-contact-head span{display:block;margin-top:5px;color:#bcb0a7;font-size:12px}
        .site-contact-qr{position:relative;width:min(100%,340px);aspect-ratio:1;margin:auto;overflow:hidden;border:8px solid #f8f5ee;border-radius:12px;background:white}
        .site-contact-qr img{position:absolute;left:-10%;top:-33.75%;width:120.375%;height:155.875%;max-width:none;display:block}
        .site-contact-caption{margin:16px 0 0;color:#dfb08b;font-size:14px;letter-spacing:.08em}
        @media(max-width:430px){.site-contact-inner{padding:22px 16px 20px}.site-contact-avatar-frame{width:54px;height:54px}}
      `;
      document.head.append(style);
      dialog = document.createElement('dialog');
      dialog.className = 'site-contact-dialog';
      dialog.setAttribute('aria-label', 'J先生微信二维码');
      dialog.innerHTML = `<div class="site-contact-inner"><button class="site-contact-close" type="button" aria-label="关闭二维码">×</button><div class="site-contact-head"><span class="site-contact-avatar-frame"><img class="site-contact-avatar" src="/officialwebsite/images/portrait-4c9fcb33e55e.png" alt="J先生卡通头像"></span><div><strong>J先生_Welles</strong><span>扫码添加微信，聊聊你的想法</span></div></div><div class="site-contact-qr"><img src="/officialwebsite/images/wechat-qr-original.jpg" alt="J先生微信二维码" width="963" height="1247"></div><p class="site-contact-caption">微信扫一扫 · 添加好友</p></div>`;
      dialog.querySelector('.site-contact-close').addEventListener('click', () => dialog.close());
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      document.body.append(dialog);
    }
    if (!dialog.open) dialog.showModal();
  }

  document.addEventListener('click', event => {
    if (!event.target.closest(selector)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openContact();
  }, true);
})();
