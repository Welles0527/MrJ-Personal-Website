(() => {
  const dialog = document.querySelector('.project-deck');
  const cards = [...document.querySelectorAll('#projects [data-project-gallery] .feature-card')];
  if (!dialog?.showModal || !cards.length) return;

  const find = selector => dialog.querySelector(selector);
  const slide = find('.project-deck-slide');
  const icon = find('.project-deck-icon');
  const brand = find('.project-deck-brand');
  const subtitle = find('.project-deck-subtitle');
  const description = find('.project-deck-description');
  const count = find('.project-deck-count');
  const previewName = find('.project-deck-preview-name');
  const openProject = find('.project-deck-open');
  const introToggle = find('.project-deck-intro');
  const compactLayout = matchMedia('(max-width: 760px), (max-width: 1366px) and (pointer: coarse)');
  const fullActions = find('.project-deck-live-actions');
  const fullTitle = find('.project-deck-full-title');
  const returnToDeck = find('.project-deck-return');
  const close = find('.project-deck-close');
  const screen = find('.project-deck-screen');
  const loading = find('.project-deck-loading');
  const strip = find('.project-deck-thumbnails');
  const boards = find('.project-deck-boards');
  const fundBoard = find('[data-deck-board="funds"]');
  const stockBoard = find('[data-deck-board="stocks"]');
  let active = -1;
  let opener;
  let frame;
  let previewScrollTop;

  const projects = cards.map((card, index) => {
    const title = card.querySelector('.feature-copy h3').textContent.trim();
    const [name, brand = ''] = title.split(' · ');
    const preview = card.querySelector('.product-preview');
    const placeholder = preview.cloneNode(false);
    const tile = document.createElement('li');
    const art = document.createElement('div');
    const button = document.createElement('button');
    const caption = document.createElement('span');

    art.className = 'project-deck-thumbnail-art';
    art.setAttribute('aria-hidden', 'true');
    art.inert = true;
    button.type = 'button';
    button.setAttribute('aria-label', title);
    caption.textContent = name;
    button.append(caption);
    tile.append(art, button);
    strip.append(tile);

    button.addEventListener('click', () => select(index));
    card.setAttribute('aria-haspopup', 'dialog');
    card.addEventListener('click', event => {
      if (event.target.closest('.project-like') || event.metaKey || event.ctrlKey ||
          event.shiftKey || event.altKey || event.defaultPrevented) return;
      event.preventDefault();
      show(index);
    });

    return { card, title, name, brand, preview, placeholder, art, tile, button };
  });

  new ResizeObserver(([entry]) => {
    if (entry.contentRect.width) {
      const scale = entry.contentRect.width / 1440;
      screen.style.setProperty('--deck-scale', String(scale));
      screen.style.setProperty('--deck-frame-height', (entry.contentRect.height / scale) + 'px');
    }
  }).observe(screen);

  function loadHome(destination, label) {
    const url = new URL(destination, location.href);
    const href = url.origin === 'https://www.magicj.cn'
      ? url.pathname + url.search + url.hash
      : url.href;
    openProject.href = href;
    fullTitle.textContent = label;
    unmountPreview();
    if (!dialog.classList.contains('is-intro')) mountPreview();
  }

  function unmountPreview() {
    frame?.remove();
    frame = undefined;
    loading.hidden = true;
  }

  function mountPreview() {
    loading.hidden = false;
    const nextFrame = document.createElement('iframe');
    nextFrame.title = fullTitle.textContent + '首页预览';
    nextFrame.allowFullscreen = true;
    nextFrame.src = openProject.getAttribute('href');
    nextFrame.addEventListener('load', () => {
      if (frame !== nextFrame) return;
      loading.hidden = true;
      updateTravelPreviewTitle();
    });
    screen.prepend(nextFrame);
    frame = nextFrame;
  }

  function updateTravelPreviewTitle() {
    if (projects[active]?.card.dataset.project !== 'travel') return;
    const page = frame?.contentDocument;
    if (!page?.querySelector('[data-atlas]')) return;
    const style = page.getElementById('showcase-travel-preview-title');
    if (!compactLayout.matches || !fullActions.hidden || !previewName) {
      style?.remove();
    } else if (!style) {
      // The deck header already names the project in compact preview mode.
      const compactTitle = page.createElement('style');
      compactTitle.id = 'showcase-travel-preview-title';
      compactTitle.textContent = '[data-atlas] .topbar > h1.brand, [data-atlas] :is(.topbar, .journal) > .mj-project-brand { display: none !important; }';
      page.head.append(compactTitle);
    }
  }

  function selectBoard(board) {
    if (projects[active]?.card.dataset.project !== 'funds') return;
    fundBoard.setAttribute('aria-pressed', String(board === fundBoard));
    stockBoard.setAttribute('aria-pressed', String(board === stockBoard));
    loadHome(board.dataset.url || projects[active].card.href, board.textContent.trim());
  }

  function select(index) {
    if (active === index) return;
    setIntro(false);
    active = index;
    const project = projects[index];
    const details = project.card.querySelector('.project-deck-details').content.cloneNode(true);
    icon.replaceChildren(details.querySelector('svg'));
    brand.textContent = project.brand || project.name;
    if (previewName) previewName.textContent = brand.textContent;
    subtitle.textContent = project.brand ? project.name : '';
    subtitle.hidden = !project.brand;
    description.replaceChildren(details);
    count.textContent = (index + 1) + ' / ' + projects.length;
    boards.hidden = project.card.dataset.project !== 'funds';
    if (boards.hidden) loadHome(project.card.href, project.title);
    else selectBoard(fundBoard);

    projects.forEach((item, position) => {
      item.button.setAttribute('aria-current', String(position === index));
    });
    const track = strip.getBoundingClientRect();
    const tile = project.tile.getBoundingClientRect();
    if (tile.left < track.left) strip.scrollLeft += tile.left - track.left;
    else if (tile.right > track.right) strip.scrollLeft += tile.right - track.right;
    slide.scrollTop = 0;
  }

  function show(index) {
    opener = projects[index].card;
    // Move the original artwork so the running animations and canvas stay attached.
    projects.forEach(({ card, preview, placeholder, art }) => {
      art.style.setProperty('--deck-preview-aspect', getComputedStyle(card).getPropertyValue('--demo-aspect') || '1.4');
      preview.replaceWith(placeholder);
      art.append(preview);
    });
    dialog.showModal();
    select(index);
  }

  function move(offset) {
    select((active + offset + projects.length) % projects.length);
  }

  function setIntro(open) {
    dialog.classList.toggle('is-intro', open);
    if (introToggle) {
      introToggle.textContent = open ? '返回预览' : '项目介绍';
      introToggle.setAttribute('aria-expanded', String(open));
    }
  }

  function showPreview() {
    setIntro(false);
    slide.scrollTop = 0;
    if (!frame) mountPreview();
  }

  introToggle?.addEventListener('click', () => {
    if (dialog.classList.contains('is-intro')) {
      showPreview();
    } else {
      setIntro(true);
      slide.scrollTop = 0;
      unmountPreview();
    }
  });
  compactLayout.addEventListener('change', event => {
    if (!event.matches && dialog.open && dialog.classList.contains('is-intro')) showPreview();
    updateTravelPreviewTitle();
  });

  function setFullProject(open) {
    dialog.classList.toggle('is-full-project', open);
    dialog.setAttribute('aria-labelledby', open ? 'project-deck-full-title' : 'project-deck-title');
    fullActions.hidden = !open;
    updateTravelPreviewTitle();
  }

  function closeFullProject() {
    setFullProject(false);
    if (dialog.classList.contains('is-intro')) unmountPreview();
    slide.scrollTop = previewScrollTop;
    openProject.focus({ preventScroll: true });
  }

  openProject.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    event.preventDefault();
    previewScrollTop = slide.scrollTop;
    setFullProject(true);
    if (!frame) mountPreview();
    returnToDeck.focus();
  });
  returnToDeck.addEventListener('click', closeFullProject);
  dialog.addEventListener('cancel', event => {
    if (!fullActions.hidden) {
      event.preventDefault();
      closeFullProject();
    } else if (dialog.classList.contains('is-intro')) {
      event.preventDefault();
      showPreview();
      introToggle.focus();
    }
  });
  fundBoard.addEventListener('click', () => {
    if (fundBoard.getAttribute('aria-pressed') !== 'true') selectBoard(fundBoard);
  });
  stockBoard.addEventListener('click', () => {
    if (stockBoard.getAttribute('aria-pressed') !== 'true') selectBoard(stockBoard);
  });
  find('.project-deck-prev').addEventListener('click', () => move(-1));
  find('.project-deck-next').addEventListener('click', () => move(1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (!fullActions.hidden || event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey ||
        (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
    if (strip.contains(event.target)) projects[active].button.focus({ preventScroll: true });
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    if (!fullActions.hidden) setFullProject(false);
    unmountPreview();
    setIntro(false);
    projects.forEach(({ preview, placeholder }) => placeholder.replaceWith(preview));
    active = -1;
    opener?.focus({ preventScroll: true });
  });
})();
