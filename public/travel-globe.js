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
  let landPixels;
  let rotation = 1.08;
  let width = 0;
  let height = 0;
  let sphereSize = 0;
  let samplePoints = [];
  let visible = true;
  let lastPaint = 0;
  let demoTime = 0;
  let demoCity = null;
  const visitedCities = new Set();
  const photoCount = 8;
  // Shanghai reference photos: CC0, Wikimedia Commons.
  // https://commons.wikimedia.org/wiki/File:Shanghai_Skyline1.jpg
  // https://commons.wikimedia.org/wiki/File:Shanghai,_Yu_Garden.jpg
  // https://commons.wikimedia.org/wiki/File:2014.11.17.121615_Jing%27an_Temple_Shanghai.jpg
  // https://commons.wikimedia.org/wiki/File:Waibaidu_Bridge_20250501-1.jpg
  // https://commons.wikimedia.org/wiki/File:2010_Shanghai_Museum.jpg
  // https://commons.wikimedia.org/wiki/File:20191114_Oriental_Pearl_Tower-1.jpg
  // https://commons.wikimedia.org/wiki/File:2010_Shanghai_Expo_World%27s_Fair_-_China_Pavilion_01.jpg
  // https://commons.wikimedia.org/wiki/File:Shanghai_Museum_East_balcony.jpg
  const cityPhotos = {
    '三亚': ['sanya-2016/1ac0d1fd-2cc5-46fb-827d-8e875d4b0fe2.webp', 'sanya-2016/3a4bc483-aca5-4461-a358-0be6d64e7fa2.webp', 'sanya-2016/46d1dc31-628f-43c3-a529-ea7044822c3e.webp', 'sanya-2016/99d81330-267b-4c88-9f9b-796a61782168.webp', 'sanya-2016/c43a08af-e341-4c2e-b0f2-9c6fb18d8f01.webp', 'sanya-2016/3f129b41-db1f-4a44-8752-6599a1c5685c.webp', 'sanya-2016/bb1d9ebf-b3e7-419d-9c3d-bc09096bfb86.webp', 'sanya-2016/94ab178c-6b37-40c7-ae21-63a51148f564.webp'],
    '北京': ['beijing-2019/714a5b13-d5b9-4ca9-af35-762281c2478b.webp', 'beijing-2019/23d41b97-4154-476f-be12-296677774d52.webp', 'beijing-2019/db60b2db-8841-4dad-b889-18535d8429c4.webp', 'beijing-2019/f39fa623-96bb-4179-b680-dd89755bb643.webp', 'beijing-2019/0b48faa1-a21f-40dc-a12b-5d0b7171886d.webp', 'beijing-2019/b3116a8a-e910-41de-bb49-4f7b7a0253e5.webp', 'beijing-2019/247d03cd-b47f-4a8e-8a08-5bf1a30e01fc.webp', 'beijing-2019/440cd69c-7e3e-460a-9741-713923238066.webp'],
    '上海': ['/officialwebsite/images/travel-shanghai-1.jpg', '/officialwebsite/images/travel-shanghai-3.jpg', '/officialwebsite/images/travel-shanghai-4.jpg', '/officialwebsite/images/travel-shanghai-5.jpg', '/officialwebsite/images/travel-shanghai-6.jpg', '/officialwebsite/images/travel-shanghai-7.jpg', '/officialwebsite/images/travel-shanghai-8.jpg', '/officialwebsite/images/travel-shanghai-9.jpg'],
    '伦敦': ['london-2018/ae2aebd2-3d1f-47f4-939d-530897be24b7.webp', 'london-2018/cf68d733-8b30-4eb6-a78c-d19b33cb6927.webp', 'london-2018/677669ab-9a01-4467-966d-573ff57c77a0.webp', 'london-2018/7a973e2d-04a4-4cba-972f-008cac1d3859.webp', 'london-2018/8821742a-686a-4f75-a2c7-d5cd48598cfd.webp', 'london-2018/2b340699-bc30-4d37-abb9-7dcbd4dfee93.webp', 'london-2018/e87e0a75-ca3a-4c2c-a2f6-c3836c139722.webp', 'london-2018/f26a1153-d456-4cc1-82ef-01a027521638.webp'],
    '湖州': ['huzhou-2018/01c2627b-a5ea-4b09-81d3-7847df24855b.webp', 'huzhou-2018/2ecdd2b9-f3cb-44b9-ad39-614f159000f6.webp', 'huzhou-2018/3e87e7d7-5e14-4f80-a9b9-a46abb01f3e0.webp', 'huzhou-2018/4cf96003-53ae-42d6-bfbe-fbd0a2f12408.webp', 'huzhou-2018/5b62712b-c686-4f97-bdf2-ecefda560954.webp', 'huzhou-2018/610ce4d8-1a85-48aa-9dec-10d6e1ff6c85.webp', 'huzhou-2018/b535e59d-4d79-4030-8d3c-643e35266114.webp', 'huzhou-2018/d2de3d2b-6dae-4a64-8344-a756c7d85a92.webp'],
    '洛杉矶': ['california-2019/8814944a-c138-4958-896e-3f28167e8420.webp', 'california-2019/c3ee6a0b-3764-433a-9d08-a52ff7cf0131.webp', 'california-2019/d63dab60-bb3a-4017-961e-de94bfea96a4.webp', 'california-2019/07ec4b1d-bd32-41b1-8ed6-a36d3d66ca7d.webp', 'california-2019/b73ade77-9d1c-4e88-bde9-56b26b7f4da1.webp', 'california-2019/bd19bb69-79df-4dac-948a-039ca7807e51.webp', 'california-2019/ca7edc85-0e0e-420b-b7db-de5fcc1b8e8f.webp', 'california-2019/697eb0d9-49f7-4de8-9b59-86fedc10d4d1.webp'],
    '旧金山': ['california-2019/8dd11cee-fff0-413d-81cb-2a554c669482.webp', 'california-2019/9e3110f5-591d-4b46-92b9-032b0ad26c35.webp', 'california-2019/5cdfca34-0672-44fd-b87c-50134f60b98d.webp', 'california-2019/9a687097-a895-4602-b528-b981e006537b.webp', 'california-2019/07ef4696-328f-45df-8305-a67082e2f6ec.webp', 'california-2019/2d9ab476-dfbf-4ac4-8d54-4573a256b9bc.webp', 'california-2019/010225dc-7d7e-4018-a9e2-ca95c8dc89e5.webp', 'california-2019/a1256318-4676-42ba-a7be-7ba3582fbca0.webp'],
  };
  const photoCache = new Map();
  // Normalized framing keeps passing visitors outside the displayed landscape.
  const photoCrops = {
    '三亚': { 4: [0, .55, 1, .45], 7: [0, 0, 1, .78] },
    '北京': { 1: [.2, .4, .7, .28], 2: [0, 0, 1, .74], 5: [0, 0, 1, .58] },
    '上海': { 1: [0, 0, 1, .43], 2: [0, 0, 1, .66], 3: [0, .43, 1, .38], 4: [0, 0, 1, .78], 6: [0, 0, .92, .7] },
    '伦敦': { 2: [.45, 0, .55, .9], 3: [.56, .62, .28, .18], 5: [0, 0, 1, .75], 6: [0, 0, 1, .84], 7: [.55, 0, .45, .73] },
    '洛杉矶': { 1: [0, 0, 1, .83], 3: [0, 0, 1, .72], 6: [0, 0, 1, .82], 7: [0, 0, 1, .86] },
    '旧金山': { 0: [0, 0, 1, .78], 4: [0, .48, 1, .5] },
  };
  function cityPhoto(name, index) {
    const path = cityPhotos[name][index];
    if (!photoCache.has(path)) {
      const image = new Image();
      image.onload = () => paint();
      image.src = path.startsWith('/') ? path : '/officialwebsite/images/photo-wall/' + path;
      photoCache.set(path, image);
    }
    return photoCache.get(path);
  }
  canvas.setAttribute('aria-label', '旅行相册动画演示：地球旋转、鼠标点击城市、展开小相册');
  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'pointer';

  function drawDemo(markers) {
    if (!demoCity || demoTime < 1000) return;
    const city = markers.find(marker => marker.name === demoCity.name);
    if (!city) return;
    const fade = Math.min(1, (demoTime - 1000) / 200, (3000 - demoTime) / 300);
    context.save();
    context.globalAlpha = Math.max(0, fade);
    // A simulated pointer approaches the city before the click pulse.
    const progress = Math.min(1, (demoTime - 1000) / 450);
    const ease = 1 - Math.pow(1 - progress, 3);
    const px = city.x + (1 - ease) * 55;
    const py = city.y + (1 - ease) * 65;
    if (demoTime >= 1450 && demoTime < 1950) {
      const pulse = (demoTime - 1450) / 500;
      context.strokeStyle = 'rgba(255,190,120,' + (1 - pulse) + ')';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(city.x, city.y, 5 + pulse * 19, 0, Math.PI * 2);
      context.stroke();
    }
    context.save();
    context.translate(px, py);
    const press = demoTime > 1450 && demoTime < 1620 ? .8 : 1;
    context.scale(press, press);
    context.beginPath();
    context.moveTo(0, 0); context.lineTo(2, 21); context.lineTo(7, 16);
    context.lineTo(12, 24); context.lineTo(16, 22); context.lineTo(11, 14);
    context.lineTo(19, 13); context.closePath();
    context.fillStyle = '#fff5e7'; context.fill();
    context.strokeStyle = '#493529'; context.lineWidth = 1.5; context.stroke();
    context.restore();
    if (demoTime >= 1650) {
      const appear = Math.min(1, (demoTime - 1650) / 300);
      const albumWidth = Math.min(148, width * .76);
      const albumHeight = albumWidth * .7;
      const x = Math.max(5, Math.min(width - albumWidth - 5, city.x - albumWidth * .3));
      const y = Math.min(height - albumHeight - 6, city.y + 30);
      context.globalAlpha *= appear;
      context.translate(x + albumWidth / 2, y);
      context.scale(.7 + .3 * appear, .7 + .3 * appear);
      context.translate(-albumWidth / 2, (1 - appear) * 14);
      context.shadowColor = '#0008'; context.shadowBlur = 12;
      context.fillStyle = '#141210';
      context.beginPath(); context.roundRect(0, 0, albumWidth, albumHeight, 7); context.fill();
      context.shadowBlur = 0;
      const gold = context.createLinearGradient(0, 0, albumWidth, albumHeight);
      gold.addColorStop(0, '#f4d4a0');
      gold.addColorStop(.5, '#ad743e');
      gold.addColorStop(1, '#d4a562');
      context.strokeStyle = gold; context.lineWidth = 1; context.stroke();
      Array.from({ length: photoCount }, (_, index) => index).forEach(index => {
        const w = (albumWidth - 23) / 4, h = (albumHeight - 34) / 2;
        const x = 7 + (index % 4) * (w + 3);
        const y = 7 + Math.floor(index / 4) * (h + 3);
        const photo = cityPhoto(city.name, index);
        context.fillStyle = '#25211b';
        context.fillRect(x, y, w, h);
        if (photo.complete && photo.naturalWidth) {
          const crop = photoCrops[city.name]?.[index] || [0, 0, 1, 1];
          const cropWidth = photo.naturalWidth * crop[2], cropHeight = photo.naturalHeight * crop[3];
          const scale = Math.max(w / cropWidth, h / cropHeight);
          const sw = w / scale, sh = h / scale;
          const sx = photo.naturalWidth * crop[0] + (cropWidth - sw) / 2;
          const sy = photo.naturalHeight * crop[1] + (cropHeight - sh) / 2;
          context.drawImage(photo, sx, sy, sw, sh, x, y, w, h);
        }
      });
      context.fillStyle = '#e8bd83';
      context.font = '10px "Microsoft YaHei", sans-serif';
      context.textAlign = 'center';
      context.fillText(city.name + ' · 旅行相册', albumWidth / 2, albumHeight - 10);
    }
    context.restore();
  }

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
    if (demoTime >= 1000 && !demoCity) {
      demoCity = markers.find(city => !visitedCities.has(city.name)) || null;
      if (demoCity) {
        visitedCities.add(demoCity.name);
        for (let index = 0; index < photoCount; index++) cityPhoto(demoCity.name, index);
      }
    }
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
      context.arc(city.x, city.y, demoCity?.name === city.name ? 10 : 6.2, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    });
    const labelMarkers = demoCity
      ? [...markers.filter(city => city.name === demoCity.name), ...markers.filter(city => city.name !== demoCity.name)]
      : markers;
    drawCityLabels(labelMarkers, dark, cx);
    drawDemo(markers);
  }

  function animate(time) {
    const delta = Math.min(time - (lastPaint || time), 100);
    if (time - lastPaint > 50) {
      lastPaint = time;
      if (visible && !document.hidden && !reducedMotion.matches) {
        // Hold the pointer stage until an unvisited city rotates into view.
        demoTime = demoCity ? demoTime + delta : Math.min(1000, demoTime + delta);
        if (demoTime >= 3000) {
          demoTime -= 3000;
          demoCity = null;
        }
        if (!demoCity) {
          rotation += delta * 0.00032;
          if (rotation > Math.PI) rotation -= 2 * Math.PI;
        }
        paint();
      }
    }
    requestAnimationFrame(animate);
  }

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(canvas);
  new MutationObserver(() => paint()).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  fetch('/officialwebsite/images/travel-earth-land.geojson')
    .then((response) => { if (!response.ok) throw new Error('Globe map unavailable'); return response.json(); })
    .then((data) => { buildLandMask(data); paint(); })
    .catch((error) => console.error(error));
  requestAnimationFrame(animate);
})();
