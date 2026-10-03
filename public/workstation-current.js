(() => {
  const network = document.querySelector('.brain-network');
  if (!network) return;
  const svg = network.querySelector('.network-lines');
  const nodes = [...network.querySelectorAll('.station-node')];
  const originalPaths = [...svg.querySelectorAll('.wire-paths path')];
  // Existing wire markup alternates the left and right columns.
  const paths = [0, 2, 4, 6, 1, 3, 5, 7].map(index => originalPaths[index]);
  const desktopPaths = paths.map(path => path.getAttribute('d'));
  const ns = 'http://www.w3.org/2000/svg';
  const electrons = document.createElementNS(ns, 'g');
  electrons.setAttribute('class', 'current-electrons');
  electrons.setAttribute('visibility', 'hidden');
  const dots = [3.6, 2.4, 1.5].map((radius, index) => {
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('r', radius);
    dot.setAttribute('opacity', 1 - index * .3);
    electrons.append(dot);
    return dot;
  });
  svg.append(electrons);
  let lengths = [];
  let elapsed = 0;
  let lastTime = 0;
  let visible = true;
  let activeNode = -1;
  let startAngles = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const travel = 1100;
  const borderLap = 2600;
  const slot = travel + borderLap;
  const cycle = 700 + nodes.length * slot + 2500;

  function layout() {
    const box = network.getBoundingClientRect();
    const mobile = matchMedia('(max-width: 760px)').matches;
    startAngles = nodes.map((_, index) => (mobile ? index % 2 === 0 : index >= 4) ? 270 : 90);
    svg.setAttribute('viewBox', mobile ? `0 0 ${box.width} ${box.height}` : '0 0 1200 590');
    paths.forEach((path, index) => {
      if (!mobile) { path.setAttribute('d', desktopPaths[index]); return; }
      const node = nodes[index].getBoundingClientRect();
      const left = index % 2 === 0;
      const x = (left ? node.left : node.right) - box.left;
      const y = node.top - box.top + node.height / 2;
      const rail = left ? x - 6 : x + 6;
      // Mobile retains the two-column cards, with current routed outside them.
      path.setAttribute('d', `M${x} ${y} H${rail} V205 Q${rail} 145 ${box.width / 2} 145`);
    });
    lengths = paths.map(path => path.getTotalLength());
  }

  function reset() {
    nodes.forEach(node => node.classList.remove('is-powered'));
    paths.forEach(path => path.classList.remove('is-powered', 'is-charging'));
    activeNode = -1;
    electrons.setAttribute('visibility', 'hidden');
  }

  function frame(time) {
    const delta = lastTime ? Math.min(time - lastTime, 80) : 0;
    lastTime = time;
    if (visible && !document.hidden && !reducedMotion.matches) {
      elapsed += delta;
      if (elapsed >= cycle) { elapsed %= cycle; reset(); }
      const index = Math.floor((elapsed - 700) / slot);
      const phase = elapsed - 700 - index * slot;
      const node = nodes[index];
      if (node && !node.classList.contains('is-dimmed') && phase < travel) {
        if (activeNode !== index) {
          nodes.forEach(node => node.classList.remove('is-powered'));
          paths.forEach(path => path.classList.remove('is-powered', 'is-charging'));
          paths[index].classList.add('is-charging');
          activeNode = index;
        }
        const progress = phase / travel;
        dots.forEach((dot, tail) => {
          const point = paths[index].getPointAtLength(lengths[index] * (1 - Math.max(0, progress - tail * .045)));
          dot.setAttribute('cx', point.x);
          dot.setAttribute('cy', point.y);
        });
        electrons.setAttribute('visibility', 'visible');
      } else {
        electrons.setAttribute('visibility', 'hidden');
        if (activeNode >= 0) paths[activeNode].classList.remove('is-charging');
        activeNode = -1;
        if (node && !node.classList.contains('is-dimmed') && phase >= travel) {
          // Positive angles move clockwise, starting at the wire's contact edge.
          const progress = Math.min(1, (phase - travel) / borderLap);
          node.style.setProperty('--station-phase', `${startAngles[index] + progress * 360}deg`);
          node.classList.add('is-powered');
          paths[index].classList.remove('is-charging');
          paths[index].classList.add('is-powered');
        }
        if (index >= nodes.length) reset();
      }
    } else {
      electrons.setAttribute('visibility', 'hidden');
      if (activeNode >= 0) paths[activeNode].classList.remove('is-charging');
      activeNode = -1;
    }
    requestAnimationFrame(frame);
  }

  new ResizeObserver(layout).observe(network);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(network);
  reducedMotion.addEventListener('change', () => { elapsed = 0; reset(); });
  layout();
  requestAnimationFrame(frame);
})();
