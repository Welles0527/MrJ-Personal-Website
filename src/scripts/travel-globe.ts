import { Viewer, TileMapServiceImageryProvider, ArcGisMapServerImageryProvider, ImageryLayer, Cartesian3, Cartesian2, Color, DirectionalLight, Matrix4, PerspectiveFrustum, Rectangle, SceneTransforms, SceneMode } from 'cesium';
import { attachStarMapSky } from './starmap-sky';

type Album = { id: string; name: string; markerName: string; country: string; region: string; count: number; latitude: number; longitude: number; photosPath: string; cover: string };
const albums: Album[] = JSON.parse(document.querySelector('#cesium-albums')?.textContent || '[]');
const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/cesium/`;
declare global { interface Window { CESIUM_BASE_URL: string } }
window.CESIUM_BASE_URL = base;
const loading = document.querySelector<HTMLElement>('[data-loading]')!;
const panel = document.querySelector<HTMLElement>('[data-selection]')!;
const status = document.querySelector<HTMLElement>('[data-view-status]')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const filterButtons = document.querySelectorAll<HTMLButtonElement>('[data-album-filter]');
const search = document.querySelector<HTMLInputElement>('[data-city-search]')!;
let activeFilter = 'all';
let visibleIds = new Set(albums.map(album => album.id));
let filterRevision = 0;
let refreshMap = () => {};
const applyFilter = () => {
  const keyword = search.value.trim().toLowerCase();
  let count = 0;
  visibleIds = new Set();
  document.querySelectorAll<HTMLElement>('[data-album-row]').forEach(row => {
    row.hidden = (activeFilter !== 'all' && row.dataset.region !== activeFilter) || !row.dataset.search?.includes(keyword);
    if (!row.hidden) { count++; visibleIds.add(row.dataset.albumRow!); }
  });
  filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item.dataset.albumFilter === activeFilter)));
  const label = activeFilter === 'domestic' ? '国内' : activeFilter === 'international' ? '国外' : '全部';
  document.querySelector('[data-filter-count]')!.textContent = `${label} · ${count} 处`;
  document.querySelector<HTMLElement>('[data-empty-cities]')!.hidden = count > 0;
  filterRevision++;
  refreshMap();
};
search.addEventListener('input', applyFilter);
filterButtons.forEach(button => button.addEventListener('click', () => {
  activeFilter = button.dataset.albumFilter!;
  applyFilter();
}));

async function start() {
  let highResolution = true;
  const imagery = await ArcGisMapServerImageryProvider.fromUrl('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer', { enablePickFeatures: false }).catch(async () => {
    highResolution = false;
    return TileMapServiceImageryProvider.fromUrl(`${base}Assets/Textures/NaturalEarthII`, { maximumLevel: 2 });
  });
  const viewer = new Viewer('cesium-globe', {
    baseLayer: new ImageryLayer(imagery, { brightness: 0.78, contrast: 1.15, saturation: 0.62 }), baseLayerPicker: false, geocoder: false,
    animation: false, timeline: false, navigationHelpButton: false, homeButton: false,
    sceneModePicker: false, fullscreenButton: false, selectionIndicator: false, infoBox: false,
    requestRenderMode: reducedMotion, maximumRenderTimeChange: Infinity, shouldAnimate: false,
    useBrowserRecommendedResolution: false,
  });
  viewer.resolutionScale = Math.min(devicePixelRatio, 2) / devicePixelRatio;
  const fullResolution = viewer.resolutionScale;
  const interactionEvents = new AbortController();
  const pointers = new Set<number>();
  let restoreTimer = 0;
  let motionActive = false;
  const sampledView = new Matrix4();
  const useMotionResolution = () => {
    window.clearTimeout(restoreTimer);
    motionActive = true;
    viewer.resolutionScale = 1 / devicePixelRatio;
  };
  const restoreResolution = () => {
    window.clearTimeout(restoreTimer);
    Matrix4.clone(viewer.camera.viewMatrix, sampledView);
    let stableSamples = 0;
    const waitForCamera = () => {
      if (viewer.isDestroyed()) return;
      const stable = !pointers.size && Matrix4.equalsEpsilon(sampledView, viewer.camera.viewMatrix, 1e-7);
      stableSamples = stable ? stableSamples + 1 : 0;
      Matrix4.clone(viewer.camera.viewMatrix, sampledView);
      if (stableSamples < 3) { restoreTimer = window.setTimeout(waitForCamera, 120); return; }
      motionActive = false;
      viewer.resolutionScale = fullResolution;
      viewer.scene.requestRender();
    };
    restoreTimer = window.setTimeout(waitForCamera, 120);
  };
  // Camera movement events also fire when the drawing buffer resizes. Use real
  // input events so restoring high resolution cannot restart the low-res mode.
  viewer.canvas.addEventListener('pointerdown', event => { pointers.add(event.pointerId); useMotionResolution(); }, { signal: interactionEvents.signal });
  const releasePointer = (event: PointerEvent) => { pointers.delete(event.pointerId); if (!pointers.size) restoreResolution(); };
  window.addEventListener('pointerup', releasePointer, { signal: interactionEvents.signal });
  window.addEventListener('pointercancel', releasePointer, { signal: interactionEvents.signal });
  window.addEventListener('blur', () => { pointers.clear(); restoreResolution(); }, { signal: interactionEvents.signal });
  viewer.canvas.addEventListener('wheel', () => { useMotionResolution(); restoreResolution(); }, { passive: true, signal: interactionEvents.signal });
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.dynamicAtmosphereLighting = true;
  viewer.scene.globe.vertexShadowDarkness = 0.48;
  viewer.scene.globe.baseColor = Color.fromCssColorString('#07111f');
  viewer.scene.backgroundColor = Color.fromCssColorString('#010409');
  if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
  if (viewer.scene.sun) viewer.scene.sun.show = false;
  if (viewer.scene.moon) viewer.scene.moon.show = false;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 500;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 40000000;
  viewer.scene.globe.maximumScreenSpaceError = 2;
  viewer.scene.fog.enabled = true;
  viewer.canvas.setAttribute('aria-label', '交互式地球：拖动旋转，滚轮缩放');
  viewer.canvas.tabIndex = 0;
  const positions = albums.map(album => Cartesian3.fromDegrees(album.longitude, album.latitude, 500));
  const entities = positions.map((position, i) => viewer.entities.add({ id: albums[i].id, position, point: { pixelSize: 5, color: Color.fromCssColorString('#dae9d0'), outlineColor: Color.fromCssColorString('#5b968e'), outlineWidth: 2 } }));
  const pins = albums.map(album => document.querySelector<HTMLButtonElement>(`[data-pin="${album.id}"]`)!);
  const leaders = albums.map(album => document.querySelector<SVGLineElement>(`[data-leader="${album.id}"]`)!);
  let selected: string | null = null;
  const overviewHeight = () => {
    const { clientWidth: width, clientHeight: height } = viewer.canvas;
    const diameter = Math.min(height * 0.74, width * (innerWidth <= 820 ? 0.82 : 0.42));
    const frustum = viewer.camera.frustum as PerspectiveFrustum;
    const radius = viewer.scene.globe.ellipsoid.maximumRadius;
    const angularSize = (diameter / height) * Math.tan((frustum.fovy ?? Math.PI / 3) / 2);
    return radius * (Math.sqrt(1 + 1 / (angularSize * angularSize)) - 1);
  };
  const globalView = (animate = true) => {
    const halfLongitudeSpan = Math.min(179, 65 * viewer.canvas.clientWidth / viewer.canvas.clientHeight);
    const destination = viewer.scene.mode === SceneMode.SCENE2D
      ? Rectangle.fromDegrees(70 - halfLongitudeSpan, -45, 70 + halfLongitudeSpan, 85)
      : Cartesian3.fromDegrees(80, 28, overviewHeight());
    const options = { destination, orientation: { heading: 0, pitch: -Math.PI/2, roll: 0 } };
    if (animate && !reducedMotion) { useMotionResolution(); viewer.camera.flyTo({ ...options, duration: 1.6 }); restoreResolution(); }
    else viewer.camera.setView(options);
    viewer.scene.requestRender();
  };
  globalView(false);
  // Keep the reference's illuminated overview independent of the visitor's time zone.
  const light = new DirectionalLight({ direction: Cartesian3.clone(viewer.camera.directionWC) });
  viewer.scene.light = light;
  viewer.scene.preRender.addEventListener(() => Cartesian3.clone(viewer.camera.directionWC, light.direction));
  const skyOptions = { overviewHeight: overviewHeight(), overviewLat: 28, overviewLng: 80, isInteracting: () => motionActive };
  let detachSky = attachStarMapSky(viewer, skyOptions);
  document.querySelector('[data-imagery]')!.textContent = highResolution ? '高清卫星影像 · Esri' : '离线底图 · 高清影像暂不可用';
  const selectAlbum = (id: string) => {
    const album = albums.find(item => item.id === id);
    if (!album) return;
    selected = id;
    const image = panel.querySelector<HTMLImageElement>('[data-selection-image]')!;
    image.src = album.cover; image.alt = `${album.markerName}相册封面`;
    panel.querySelector('[data-selection-title]')!.textContent = album.name;
    panel.querySelector('[data-selection-region]')!.textContent = album.region;
    panel.querySelector('[data-selection-count]')!.textContent = `${album.count.toLocaleString()} 张照片`;
    panel.querySelector<HTMLButtonElement>('[data-selection-open]')!.dataset.cityId = album.id;
    panel.hidden = false;
    status.textContent = `${album.markerName} · ${album.latitude.toFixed(2)}° / ${album.longitude.toFixed(2)}°`;
    document.querySelectorAll<HTMLButtonElement>('.album-focus').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.focus === id)));
    document.querySelectorAll<HTMLElement>('[data-album-row]').forEach(row => row.classList.toggle('is-selected', row.dataset.albumRow === id));
    const destination = Cartesian3.fromDegrees(album.longitude, album.latitude, 180000);
    useMotionResolution();
    viewer.camera.flyTo({ destination, duration: reducedMotion ? 0 : 1.6, orientation: { heading: 0, pitch: -Math.PI/2, roll: 0 } });
    restoreResolution();
    if (innerWidth <= 820) document.querySelector('.world')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  };
  document.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button => button.addEventListener('click', () => selectAlbum(button.dataset.focus!)));
  viewer.selectedEntityChanged.addEventListener(entity => { if (entity) selectAlbum(entity.id); });
  const close = () => { panel.hidden = true; selected = null; status.textContent = '全球视角'; document.querySelectorAll('.is-selected').forEach(row => row.classList.remove('is-selected')); document.querySelectorAll('.album-focus').forEach(button=>button.setAttribute('aria-pressed','false')); };
  document.querySelector('[data-close]')!.addEventListener('click', close);
  document.querySelector('[data-home]')!.addEventListener('click', () => { close(); globalView(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.querySelector('dialog[open]')) close(); });
  refreshMap = () => {
    entities.forEach(entity => { entity.show = visibleIds.has(entity.id); });
    if (selected && !visibleIds.has(selected)) close();
    viewer.scene.requestRender();
  };
  refreshMap();
  document.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => button.addEventListener('click', () => { const distance = viewer.camera.positionCartographic.height * .35; if (button.dataset.zoom === 'in') viewer.camera.zoomIn(distance); else viewer.camera.zoomOut(distance); viewer.scene.requestRender(); }));
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => {
    close();
    document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    detachSky();
    const flat = button.dataset.mode === '2d';
    viewer.scene.globe.enableLighting = !flat;
    viewer.scene.globe.dynamicAtmosphereLighting = !flat;
    const layer = viewer.imageryLayers.get(0);
    layer.brightness = flat ? 1 : 0.78;
    layer.contrast = flat ? 1 : 1.15;
    layer.saturation = flat ? 1 : 0.62;
    if (button.dataset.mode === '2d') {
      viewer.scene.morphTo2D(0);
      detachSky = () => {};
    } else {
      viewer.scene.morphTo3D(0);
      skyOptions.overviewHeight = overviewHeight();
      detachSky = attachStarMapSky(viewer, skyOptions);
    }
    globalView(false);
  }));
  const previousView = new Matrix4();
  let previousWidth = 0, previousHeight = 0, previousSelected: string | null = null;
  let previousFilterRevision = -1;
  const pinGroups = new Map<string, number[]>();
  pins.forEach((pin, index) => pin.addEventListener('click', () => {
    const group = pinGroups.get(albums[index].id) ?? [index];
    if (group.length === 1) { selectAlbum(albums[group[0]].id); return; }
    close();
    const latitudes = group.map(i => albums[i].latitude);
    const longitudes = group.map(i => albums[i].longitude);
    const west = Math.min(...longitudes), east = Math.max(...longitudes);
    const south = Math.min(...latitudes), north = Math.max(...latitudes);
    const padding = Math.max(0.03, Math.max(east - west, north - south) * 0.2);
    if (east - west > 180) { selectAlbum(albums[group[0]].id); return; }
    useMotionResolution();
    viewer.camera.flyTo({ destination: Rectangle.fromDegrees(Math.max(-180, west - padding), Math.max(-89, south - padding), Math.min(180, east + padding), Math.min(89, north + padding)), duration: reducedMotion ? 0 : 1.2 });
    restoreResolution();
  }));
  viewer.scene.postRender.addEventListener(() => {
    const width = viewer.canvas.clientWidth, height = viewer.canvas.clientHeight;
    if (width === previousWidth && height === previousHeight && previousSelected === selected && previousFilterRevision === filterRevision && Matrix4.equals(previousView, viewer.camera.viewMatrix)) return;
    Matrix4.clone(viewer.camera.viewMatrix, previousView);
    previousWidth = width; previousHeight = height; previousSelected = selected;
    previousFilterRevision = filterRevision;
    const groups: { indices: number[]; x: number; y: number; count: number }[] = [];
    const radius = innerWidth <= 820 ? 52 : 64;
    const order = albums.map((_,i)=>i).sort((a,b)=>Number(albums[b].id===selected)-Number(albums[a].id===selected));
    for (const i of order) {
      if (!visibleIds.has(albums[i].id)) continue;
      const point = SceneTransforms.worldToWindowCoordinates(viewer.scene, positions[i], new Cartesian2());
      const normal = viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(positions[i]);
      const toCamera = Cartesian3.subtract(viewer.camera.positionWC, positions[i], new Cartesian3());
      const visible = point && (viewer.scene.mode !== SceneMode.SCENE3D || Cartesian3.dot(normal, toCamera)>0) && point.x > 45 && point.x < width - 45 && point.y > 80 && point.y < height - 55;
      if (!visible) continue;
      const group = albums[i].id === selected ? undefined : groups.find(candidate => !candidate.indices.some(index => albums[index].id === selected) && Math.hypot(candidate.x - point.x, candidate.y - point.y) < radius);
      if (group) {
        const count = group.count + albums[i].count;
        group.x = (group.x * group.count + point.x * albums[i].count) / count;
        group.y = (group.y * group.count + point.y * albums[i].count) / count;
        group.count = count;
        group.indices.push(i);
      } else groups.push({ indices: [i], x: point.x, y: point.y, count: albums[i].count });
    }
    pinGroups.clear();
    // Finish projection reads before updating the city/cluster overlay.
    for (let i = 0; i < pins.length; i++) {
      const group = groups.find(item => item.indices[0] === i);
      const pin = pins[i], leader = leaders[i];
      leader.style.display = 'none';
      if (!group) { pin.hidden = true; continue; }
      pinGroups.set(albums[i].id, group.indices);
      const clustered = group.indices.length > 1;
      pin.classList.toggle('is-cluster', clustered);
      pin.dataset.clusterSize = String(group.indices.length);
      pin.dataset.photoCount = String(group.count);
      pin.setAttribute('aria-label', clustered ? `展开${albums[i].name}附近${group.indices.length}处地点，共${group.count}张照片` : `在地图上查看${albums[i].name}，${group.count}张照片`);
      const label = pin.querySelector<HTMLElement>('[data-pin-label]')!;
      const small = document.createElement('small');
      small.textContent = clustered ? `${group.indices.length} 处` : `${group.count} 张`;
      label.replaceChildren(document.createTextNode(clustered ? group.count.toLocaleString() : albums[i].name), small);
      pin.hidden=false;
      pin.style.left='0'; pin.style.top='0';
      pin.style.transform=`translate3d(${group.x}px,${group.y}px,0) translate(-50%,-50%)`;
    }
  });
  viewer.scene.globe.tileLoadProgressEvent.addEventListener(remaining => { loading.hidden = remaining === 0; });
  viewer.scene.renderError.addEventListener(()=>{ loading.hidden=false;loading.textContent='地球显示暂时不可用，仍可从相册列表打开照片。'; });
  document.querySelector('[data-atlas]')?.setAttribute('data-ready','true');
  viewer.scene.requestRender();
  window.addEventListener('pagehide',()=>{interactionEvents.abort();window.clearTimeout(restoreTimer);detachSky();if(!viewer.isDestroyed())viewer.destroy();},{once:true});
}
start().catch(error => { console.error('Travel globe initialization failed', error); loading.textContent='地球暂时无法加载，仍可从相册列表打开照片。'; });
