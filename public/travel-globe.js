(() => {
  const canvas = document.querySelector('.travel-globe');
  if (!canvas) return;

  const context = canvas.getContext('2d', { alpha: true });
  const globe = document.createElement('canvas');
  const globeContext = globe.getContext('2d');
  const mask = document.createElement('canvas');
  mask.width = 720;
  mask.height = 360;
  const maskContext = mask.getContext('2d', { willReadFrequently: true });
  const cities = [
    { name: '伦敦', lat: 51.507, lon: -0.128 },
    { name: '北京', lat: 39.904, lon: 116.407 },
    { name: '上海', lat: 31.230, lon: 121.474 },
    { name: '湖州', lat: 30.894, lon: 120.086 },
    { name: '三亚', lat: 18.253, lon: 109.503 },
    { name: '洛杉矶', lat: 34.052, lon: -118.244 },
    { name: '旧金山', lat: 37.775, lon: -122.419 },
  ];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const parentLink = canvas.closest('a');
  let landPixels;
  let rotation = 1.08;
  let width = 0;
  let height = 0;
  let sphereSize = 0;
  let samplePoints = [];
  let visible = true;
  let dragging = false;
  let moved = false;
  let suppressClick = false;
  let pointerX = 0;
  let lastPaint = 0;

  function themeColor(name, fallback) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function colorToRgb(color) {
    const probe = document.createElement('canvas').getContext('2d');
    probe.fillStyle = color;
    const normalized = probe.fillStyle;
    if (/^#[\da-f]{6}$/i.test(normalized)) {
      return [1, 3, 5].map(index => parseInt(normalized.slice(index, index + 2), 16));
    }
    const match = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return match ? match.slice(1, 4).map(Number) : [255, 173, 114];
  }

  function buildLandMask(geojson) {
    function drawRing(ring) {
      ring.forEach(([lon, lat], index) => {
        const x = (lon + 180) * 2;
        const y = (90 - lat) * 2;
        if (index === 0) maskContext.moveTo(x, y);
        else maskContext.lineTo(x, y);
      });
      maskContext.closePath();
    }
    maskContext.fillStyle = '#fff';
    geojson.features.forEach(({ geometry }) => {
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      polygons.forEach((rings) => {
        maskContext.beginPath();
        rings.forEach(drawRing);
        maskContext.fill('evenodd');
      });
    });
    landPixels = maskContext.getImageData(0, 0, mask.width, mask.height).data;
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    sphereSize = Math.round(Math.min(height * 0.8, width * 0.75, 286));
    globe.width = sphereSize;
    globe.height = sphereSize;
    const radius = sphereSize / 2;
    samplePoints = new Array(sphereSize * sphereSize);
    for (let y = 0; y < sphereSize; y++) {
      for (let x = 0; x < sphereSize; x++) {
        const nx = (x + 0.5 - radius) / radius;
        const ny = (radius - y - 0.5) / radius;
        const squared = nx * nx + ny * ny;
        if (squared <= 1) {
          const nz = Math.sqrt(1 - squared);
          samplePoints[y * sphereSize + x] = {
            lon: Math.atan2(nx, nz),
            lat: Math.asin(ny),
            light: Math.max(0, -nx * 0.32 + ny * 0.4 + nz * 0.85),
            highlight: Math.pow(Math.max(0, -nx * 0.23 + ny * 0.28 + nz * 0.932), 24),
            rim: 1 - nz,
          };
        }
      }
    }
    paint();
  }

  function drawCityLabels(markers, dark, cx) {
    const fontSize = width < 190 ? 9 : 11;
    const limit = width < 190 ? 2 : 3;
    const placed = [];
    context.font = `500 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.lineWidth = 3;
    context.strokeStyle = dark ? '#1b2023' : '#fff8ed';
    context.fillStyle = dark ? '#ffe4c3' : '#563a29';

    for (const city of markers) {
      if (placed.length === limit) break;
      const textWidth = context.measureText(city.name).width;
      const side = city.x > cx ? -1 : 1;
      const candidates = [
        { x: side > 0 ? city.x + 9 : city.x - textWidth - 9, y: city.y },
        { x: side > 0 ? city.x - textWidth - 9 : city.x + 9, y: city.y },
        { x: city.x - textWidth / 2, y: city.y - fontSize - 7 },
        { x: city.x - textWidth / 2, y: city.y + fontSize + 7 },
      ];
      const label = candidates.find(({ x, y }) => {
        const box = { left: x - 3, right: x + textWidth + 3, top: y - fontSize / 2 - 3, bottom: y + fontSize / 2 + 3 };
        if (box.left < 2 || box.right > width - 2 || box.top < 2 || box.bottom > height - 2) return false;
        if (placed.some(other => box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top)) return false;
        placed.push(box);
        return true;
      });
      if (!label) continue;
      context.strokeText(city.name, label.x, label.y);
      context.fillText(city.name, label.x, label.y);
    }
  }

  function paint() {
    if (!width || !height) return;
    const dark = document.documentElement.classList.contains('dark');
    const cx = width * 0.5;
    const cy = height * 0.47;
    const radius = sphereSize / 2;
    context.clearRect(0, 0, width, height);
    const accent = colorToRgb(themeColor('--u-orange', '#ffad72'));
    const land = dark ? accent.map((channel, index) => channel * 0.52 + [106, 107, 108][index] * 0.48) : [174, 125, 91];
    const ocean = dark ? [48, 54, 58] : [216, 225, 222];

    context.save();
    context.translate(cx, cy + radius + 8);
    context.scale(1, 0.16);
    const shadow = context.createRadialGradient(0, 0, 0, 0, 0, radius * 0.85);
    shadow.addColorStop(0, dark ? 'rgba(0,0,0,.35)' : 'rgba(68,47,31,.2)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = shadow;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();

    if (landPixels) {
      const frame = globeContext.createImageData(sphereSize, sphereSize);
      for (let i = 0; i < samplePoints.length; i++) {
        const point = samplePoints[i];
        if (!point) continue;
        let lon = point.lon + rotation;
        if (lon > Math.PI) lon -= 2 * Math.PI;
        if (lon < -Math.PI) lon += 2 * Math.PI;
        const mapX = Math.min(719, Math.max(0, Math.floor((lon / Math.PI + 1) * 360)));
        const mapY = Math.min(359, Math.max(0, Math.floor((0.5 - point.lat / Math.PI) * 360)));
        const isLand = landPixels[(mapY * 720 + mapX) * 4 + 3] > 110;
        const light = (dark ? 0.42 : 0.68) + point.light * (dark ? 0.58 : 0.32);
        const highlight = point.highlight * (dark ? 14 : 24);
        const noise = (((mapX * 17 + mapY * 29) % 19) - 9) * 0.3;
        const p = i * 4;
        if (isLand) {
          frame.data[p] = (land[0] + noise) * light + highlight;
          frame.data[p + 1] = (land[1] + noise) * light + highlight;
          frame.data[p + 2] = (land[2] + noise) * light + highlight;
        } else {
          frame.data[p] = (ocean[0] + point.rim * 3) * light + highlight;
          frame.data[p + 1] = (ocean[1] + point.rim * 3) * light + highlight;
          frame.data[p + 2] = (ocean[2] + point.rim * 3) * light + highlight;
        }
        frame.data[p + 3] = 255;
      }
      globeContext.putImageData(frame, 0, 0);
      context.drawImage(globe, cx - radius, cy - radius);
    }

    const rimLight = context.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    rimLight.addColorStop(0, dark ? `rgba(${accent.join(',')},.5)` : 'rgba(111,80,58,.48)');
    rimLight.addColorStop(1, dark ? `rgba(${accent.join(',')},.08)` : 'rgba(111,80,58,.15)');
    context.strokeStyle = rimLight;
    context.lineWidth = 0.8;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.stroke();

    const markers = cities.map((city) => {
      const lat = city.lat * Math.PI / 180;
      const lon = city.lon * Math.PI / 180 - rotation;
      const depth = Math.cos(lat) * Math.cos(lon);
      return { ...city, depth, x: cx + radius * Math.cos(lat) * Math.sin(lon), y: cy - radius * Math.sin(lat) };
    }).filter((city) => city.depth > 0.18).sort((a, b) => b.depth - a.depth);
    markers.forEach((city) => {
      context.save();
      const glow = context.createRadialGradient(city.x, city.y, 1, city.x, city.y, 13);
      glow.addColorStop(0, 'rgba(255,191,109,.9)');
      glow.addColorStop(.35, 'rgba(255,132,44,.55)');
      glow.addColorStop(1, 'rgba(255,132,44,0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(city.x, city.y, 13, 0, Math.PI * 2);
      context.fill();
      context.shadowColor = '#ff8a35';
      context.shadowBlur = 10;
      context.fillStyle = '#ffbd72';
      context.beginPath();
      context.arc(city.x, city.y, 3.2, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#ff9a43';
      context.lineWidth = 1.4;
      context.beginPath();
      context.arc(city.x, city.y, 6.2, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    });
    drawCityLabels(markers, dark, cx);
  }

  function animate(time) {
    if (visible && !document.hidden && !dragging && !reducedMotion.matches && time - lastPaint > 50) {
      rotation += Math.min(time - (lastPaint || time), 100) * 0.00016;
      if (rotation > Math.PI) rotation -= 2 * Math.PI;
      paint();
      lastPaint = time;
    }
    requestAnimationFrame(animate);
  }

  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    moved = false;
    pointerX = event.clientX;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - pointerX;
    if (Math.abs(dx) > 1) moved = true;
    rotation -= dx * 0.009;
    pointerX = event.clientX;
    paint();
  });
  function endDrag() {
    if (moved) suppressClick = true;
    dragging = false;
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  parentLink?.addEventListener('click', (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }
  }, true);
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);
  new MutationObserver(() => paint()).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  fetch('/officialwebsite/images/travel-earth-land.geojson')
    .then((response) => { if (!response.ok) throw new Error('Globe map unavailable'); return response.json(); })
    .then((data) => { buildLandMask(data); paint(); })
    .catch((error) => console.error(error));
  requestAnimationFrame(animate);
})();
