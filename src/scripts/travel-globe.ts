import { Viewer, TileMapServiceImageryProvider, ArcGisMapServerImageryProvider, ImageryLayer, Cartesian3, Cartesian2, Color, DirectionalLight, Matrix4, PerspectiveFrustum, Rectangle, SceneTransforms, SceneMode } from 'cesium';
import { attachStarMapSky } from './starmap-sky';

type Album = { id: string; name: string; markerName: string; country: string; region: string; count: number; latitude: number; longitude: number; href: string; cover: string };
const albums: Album[] = JSON.parse(document.querySelector('#cesium-albums')?.textContent || '[]');
const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/cesium/`;
declare global { interface Window { CESIUM_BASE_URL: string } }
window.CESIUM_BASE_URL = base;
const loading = document.querySelector<HTMLElement>('[data-loading]')!;
const panel = document.querySelector<HTMLElement>('[data-selection]')!;
const status = document.querySelector<HTMLElement>('[data-view-status]')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const filterButtons = document.querySelectorAll<HTMLButtonElement>('[data-album-filter]');
filterButtons.forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.albumFilter;
  let count = 0;
  document.querySelectorAll<HTMLElement>('[data-album-row]').forEach(row => {
    row.hidden = filter !== 'all' && row.dataset.region !== filter;
    if (!row.hidden) count++;
  });
  filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  const label = filter === 'domestic' ? '国内' : filter === 'international' ? '国外' : '全部';
  document.querySelector('[data-filter-count]')!.textContent = `${label} · ${count} 本`;
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
  const useMotionResolution = () => {
    window.clearTimeout(restoreTimer);
    viewer.resolutionScale = Math.min(devicePixelRatio, 1.25) / devicePixelRatio;
  };
  const restoreResolution = () => {
    window.clearTimeout(restoreTimer);
    restoreTimer = window.setTimeout(() => {
      if (pointers.size || viewer.isDestroyed()) return;
      viewer.resolutionScale = fullResolution;
      viewer.scene.requestRender();
    }, 500);
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
  positions.forEach((position, i) => viewer.entities.add({ id: albums[i].id, position, point: { pixelSize: 5, color: Color.fromCssColorString('#dae9d0'), outlineColor: Color.fromCssColorString('#5b968e'), outlineWidth: 2 } }));
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
    if (animate && !reducedMotion) viewer.camera.flyTo({ ...options, duration: 1.6 });
    else viewer.camera.setView(options);
    viewer.scene.requestRender();
  };
  globalView(false);
  // Keep the reference's illuminated overview independent of the visitor's time zone.
  const light = new DirectionalLight({ direction: Cartesian3.clone(viewer.camera.directionWC) });
  viewer.scene.light = light;
  viewer.scene.preRender.addEventListener(() => Cartesian3.clone(viewer.camera.directionWC, light.direction));
  const skyOptions = { overviewHeight: overviewHeight(), overviewLat: 28, overviewLng: 80 };
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
    panel.querySelector<HTMLAnchorElement>('[data-selection-link]')!.href = album.href;
    panel.hidden = false;
    status.textContent = `${album.markerName} · ${album.latitude.toFixed(2)}° / ${album.longitude.toFixed(2)}°`;
    document.querySelectorAll<HTMLButtonElement>('.album-focus').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.focus === id)));
    document.querySelectorAll<HTMLElement>('[data-album-row]').forEach(row => row.classList.toggle('is-selected', row.dataset.albumRow === id));
    const destination = Cartesian3.fromDegrees(album.longitude, album.latitude, 2800000);
    viewer.camera.flyTo({ destination, duration: reducedMotion ? 0 : 1.6, orientation: { heading: 0, pitch: -Math.PI/2, roll: 0 } });
    if (innerWidth <= 820) document.querySelector('.world')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  };
  document.querySelectorAll<HTMLButtonElement>('[data-focus]').forEach(button => button.addEventListener('click', () => selectAlbum(button.dataset.focus!)));
  viewer.selectedEntityChanged.addEventListener(entity => { if (entity) selectAlbum(entity.id); });
  const close = () => { panel.hidden = true; selected = null; status.textContent = '全球视角'; document.querySelectorAll('.is-selected').forEach(row => row.classList.remove('is-selected')); document.querySelectorAll('.album-focus').forEach(button=>button.setAttribute('aria-pressed','false')); };
  document.querySelector('[data-close]')!.addEventListener('click', close);
  document.querySelector('[data-home]')!.addEventListener('click', () => { close(); globalView(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
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
  viewer.scene.postRender.addEventListener(() => {
    const width = viewer.canvas.clientWidth, height = viewer.canvas.clientHeight;
    if (width === previousWidth && height === previousHeight && previousSelected === selected && Matrix4.equals(previousView, viewer.camera.viewMatrix)) return;
    Matrix4.clone(viewer.camera.viewMatrix, previousView);
    previousWidth = width; previousHeight = height; previousSelected = selected;
    const occupied: {x:number;y:number}[] = [];
    const placements: { i: number; x: number; y: number; anchorX: number; anchorY: number }[] = [];
    const order = albums.map((_,i)=>i).sort((a,b)=>Number(albums[b].id===selected)-Number(albums[a].id===selected));
    for (const i of order) {
      const point = SceneTransforms.worldToWindowCoordinates(viewer.scene, positions[i], new Cartesian2());
      const normal = viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(positions[i]);
      const toCamera = Cartesian3.subtract(viewer.camera.positionWC, positions[i], new Cartesian3());
      const visible = point && (viewer.scene.mode !== SceneMode.SCENE3D || Cartesian3.dot(normal, toCamera)>0) && point.x > 45 && point.x < width - 45 && point.y > 80 && point.y < height - 55;
      if (!visible) continue;
      const anchor = { x: point.x, y: point.y };
      for (let step=0; step<12; step++) {
        if (!occupied.some(other=>Math.abs(other.x-point.x)<95 && Math.abs(other.y-point.y)<48)) break;
        point.y = Math.max(90, Math.min(height-70, anchor.y + (step%2===0 ? 1 : -1)*Math.ceil((step+1)/2)*50));
        if (step>7) point.x = Math.max(55, Math.min(width-55, anchor.x-105));
      }
      placements.push({ i, x: point.x, y: point.y, anchorX: anchor.x, anchorY: anchor.y });
      occupied.push({ x: point.x, y: point.y });
    }
    // Finish projection/layout reads before changing the overlay DOM.
    for (let i = 0; i < pins.length; i++) {
      const placement = placements.find(item => item.i === i);
      const pin = pins[i], leader = leaders[i];
      if (!placement) { pin.hidden = true; leader.style.display = 'none'; continue; }
      leader.style.display='';
      leader.setAttribute('x1',String(placement.anchorX)); leader.setAttribute('y1',String(placement.anchorY));
      leader.setAttribute('x2',String(placement.x)); leader.setAttribute('y2',String(placement.y));
      pin.hidden=false;
      pin.style.left='0'; pin.style.top='0';
      pin.style.transform=`translate3d(${placement.x}px,${placement.y}px,0) translate(-50%,-50%)`;
    }
  });
  viewer.scene.globe.tileLoadProgressEvent.addEventListener(remaining => { if (remaining===0) loading.hidden=true; });
  viewer.scene.renderError.addEventListener(()=>{ loading.hidden=false;loading.textContent='地球显示暂时不可用，仍可从相册列表打开照片。'; });
  document.querySelector('[data-atlas]')?.setAttribute('data-ready','true');
  viewer.scene.requestRender();
  window.addEventListener('pagehide',()=>{interactionEvents.abort();window.clearTimeout(restoreTimer);detachSky();if(!viewer.isDestroyed())viewer.destroy();},{once:true});
}
start().catch(error => { console.error('Travel globe initialization failed', error); loading.textContent='地球暂时无法加载，仍可从相册列表打开照片。'; });
