import { Viewer, TileMapServiceImageryProvider, ArcGisMapServerImageryProvider, ImageryLayer, Cartesian3, Cartesian2, Color, DirectionalLight, Matrix4, PerspectiveFrustum, Rectangle, SceneTransforms, SceneMode } from 'cesium';
import { attachStarMapSky } from './starmap-sky';

type Album = { id: string; name: string; markerName: string; mapGroup?: string; country: string; region: string; count: number; latitude: number; longitude: number; href: string; cover: string };
type MapPlace = { id: string; label: string; latitude: number; longitude: number; albumIds: string[]; provinceId?: string; isProvince?: boolean };
const albums: Album[] = JSON.parse(document.querySelector('#cesium-albums')?.textContent || '[]');
const places: MapPlace[] = JSON.parse(document.querySelector('#cesium-places')?.textContent || '[]');
const albumsById = new Map(albums.map(album => [album.id, album]));
const placesById = new Map(places.map(place => [place.id, place]));
const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/cesium/`;
declare global { interface Window { CESIUM_BASE_URL: string } }
window.CESIUM_BASE_URL = base;
const loading = document.querySelector<HTMLElement>('[data-loading]')!;
const panel = document.querySelector<HTMLElement>('[data-selection]')!;
const panelScroll = panel.querySelector<HTMLElement>('[data-selection-scroll]')!;
const panelGallery = panel.querySelector<HTMLElement>('[data-selection-gallery]')!;
const panelStatus = panel.querySelector<HTMLElement>('[data-selection-status]')!;
const panelLink = panel.querySelector<HTMLAnchorElement>('[data-selection-link]')!;
const status = document.querySelector<HTMLElement>('[data-view-status]')!;
const homeButton = document.querySelector<HTMLButtonElement>('.map-toolbar [data-home]')!;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const provinceDetailHeight = 2800000;
const provinceFocusHeight = 560000;
const fallbackMap = document.querySelector<HTMLElement>('[data-fallback-map]')!;
const selectionButtons = document.querySelectorAll<HTMLButtonElement>('[data-focus], [data-place]');

// Preview covers without changing the current camera or album selection.
const coverPreview = document.createElement('div');
coverPreview.hidden = true;
coverPreview.setAttribute('role', 'tooltip');
coverPreview.id = 'travel-cover-preview';
coverPreview.style.cssText = 'position:fixed;z-index:50;pointer-events:none;width:220px;max-width:calc(100vw - 24px);padding:9px;border:1px solid #b9dfef66;border-radius:12px;background:#0a1728ed;color:#edf6ff;box-shadow:0 12px 36px #0008;backdrop-filter:blur(12px);font:12px sans-serif';
document.body.append(coverPreview);
function hideCoverPreview() {
  coverPreview.hidden = true;
  document.querySelectorAll('[aria-describedby="travel-cover-preview"]').forEach(button => button.removeAttribute('aria-describedby'));
}
selectionButtons.forEach(button => {
  const showCoverPreview = () => {
    const place = button.dataset.place ? placesById.get(button.dataset.place) : undefined;
    if (place?.isProvince) return;
    const ids = place?.albumIds ?? (button.dataset.focus ? [button.dataset.focus] : []);
    const items = ids.map(id => albumsById.get(id)).filter((album): album is Album => !!album);
    if (!items.length) return;
    hideCoverPreview();
    coverPreview.replaceChildren();
    const title = document.createElement('div');
    title.textContent = place?.label ?? items[0].markerName;
    title.style.cssText = 'font-weight:600;margin-bottom:7px';
    coverPreview.append(title);
    const images = document.createElement('div');
    images.style.cssText = 'display:flex;gap:5px';
    items.slice(0,3).forEach(album => {
      const image = document.createElement('img');
      image.src = album.cover;
      image.alt = album.name + '相册封面';
      image.style.cssText = 'width:0;flex:1;min-width:0;height:125px;object-fit:cover;border-radius:7px';
      images.append(image);
    });
    coverPreview.append(images);
    coverPreview.hidden = false;
    button.setAttribute('aria-describedby', coverPreview.id);
    const rect = button.getBoundingClientRect();
    const box = coverPreview.getBoundingClientRect();
    coverPreview.style.left = Math.max(12, Math.min(innerWidth-box.width-12, rect.left+(rect.width-box.width)/2))+'px';
    coverPreview.style.top = Math.max(12, Math.min(innerHeight-box.height-12, rect.bottom+box.height+12<innerHeight ? rect.bottom+10 : rect.top-box.height-10))+'px';
  };
  button.addEventListener('mouseenter', showCoverPreview);
  button.addEventListener('focus', showCoverPreview);
  button.addEventListener('mouseleave', hideCoverPreview);
  button.addEventListener('blur', hideCoverPreview);
  button.addEventListener('click', hideCoverPreview);
});
window.addEventListener('resize', hideCoverPreview);
window.addEventListener('wheel', hideCoverPreview, { passive: true, capture: true });
window.addEventListener('scroll', hideCoverPreview, true);
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideCoverPreview(); });

let selected: string | null = null;
let albumRequest: AbortController | undefined;
let selectionTrigger: HTMLElement | null = null;
let mapMode = '3d';
let mapFailed = false;
let focusMapAlbum: ((album: Album) => void) | undefined;
let focusMapProvince: ((place: MapPlace, moveFocus: boolean) => void) | undefined;
let refreshMapMarkers: (() => void) | undefined;
let changeSceneMode: ((flat: boolean) => void) | undefined;
let resetMap: (() => void) | undefined;
const updateModeButtons = () => document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mapMode)));
const closeSelection = () => {
  if (panel.hidden) return;
  const restoreFocus = panel.contains(document.activeElement);
  albumRequest?.abort();
  panel.hidden = true;
  panelGallery.replaceChildren();
  if (restoreFocus) {
    const trigger = selectionTrigger?.getClientRects().length ? selectionTrigger : homeButton;
    trigger.focus({ preventScroll: true });
  }
  selectionTrigger = null;
  selected = null;
  status.textContent = '全球视角';
  document.querySelectorAll('.is-selected').forEach(row => row.classList.remove('is-selected'));
  selectionButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
  refreshMapMarkers?.();
};

async function loadPanelPhotos(album: Album) {
  albumRequest?.abort();
  const request = new AbortController();
  albumRequest = request;
  panelScroll.scrollTop = 0;
  panelGallery.replaceChildren();
  panelStatus.hidden = false;
  panelStatus.textContent = '正在加载照片…';

  try {
    const response = await fetch(album.href, { signal: request.signal });
    if (!response.ok) throw new Error('Album preview unavailable');
    // Read the published gallery markup without mounting it or loading its images.
    const template = document.createElement('template');
    template.innerHTML = await response.text();
    if (request.signal.aborted) return;

    const fragment = document.createDocumentFragment();
    let groupLabel: string | undefined;
    let photos: HTMLDivElement | undefined;
    for (const card of template.content.querySelectorAll<HTMLElement>('.photo-card[data-src]')) {
      const src = new URL(card.dataset.src!, response.url);
      if (src.origin !== location.origin || !src.pathname.includes('/images/photo-wall/')) continue;
      const label = card.dataset.day || card.closest('section')?.querySelector('h2, h3')?.textContent?.trim() || '';
      if (!photos || groupLabel !== label) {
        groupLabel = label;
        const group = document.createElement('section');
        group.className = 'selection-group';
        if (label) {
          const heading = document.createElement('h3');
          heading.textContent = label;
          group.append(heading);
        }
        photos = document.createElement('div');
        photos.className = 'selection-photos';
        group.append(photos);
        fragment.append(group);
      }
      const photo = document.createElement('button');
      photo.type = 'button';
      photo.className = 'selection-photo';
      photo.setAttribute('aria-expanded', 'false');
      const image = document.createElement('img');
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = card.getAttribute('aria-label') || '查看照片';
      image.src = src.href;
      photo.append(image);
      photos.append(photo);
    }
    if (!photos) throw new Error('No photos in album preview');
    panelGallery.replaceChildren(fragment);
    panelStatus.hidden = true;
  } catch {
    if (!request.signal.aborted) panelStatus.textContent = '照片暂时无法加载，可打开完整相册查看。';
  }
}

panelGallery.addEventListener('click', event => {
  const photo = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.selection-photo') : null;
  if (!photo) return;
  const frameTop = panelScroll.getBoundingClientRect().top;
  const offset = photo.getBoundingClientRect().top - frameTop;
  const expanded = panelGallery.querySelector<HTMLButtonElement>('.selection-photo[aria-expanded="true"]');
  expanded?.setAttribute('aria-expanded', 'false');
  if (photo !== expanded) photo.setAttribute('aria-expanded', 'true');

  const bounds = photo.getBoundingClientRect();
  const maxOffset = Math.max(0, panelScroll.clientHeight - bounds.height);
  const visibleOffset = Math.max(0, Math.min(offset, maxOffset));
  panelScroll.scrollTop += bounds.top - frameTop - visibleOffset;
});

function showSelection(title: string, count: string, href?: string) {
  if (document.activeElement instanceof HTMLElement && !panel.contains(document.activeElement)) {
    selectionTrigger = document.activeElement;
  }
  panel.querySelector('[data-selection-title]')!.textContent = title;
  panel.querySelector('[data-selection-count]')!.textContent = count;
  panelLink.hidden = !href;
  if (href) panelLink.href = href;
  panel.hidden = false;
  refreshMapMarkers?.();
}

const selectAlbum = (id: string, moveFocus = false) => {
  const album = albumsById.get(id);
  if (!album) return;
  selected = id;
  showSelection(album.name, `${album.count.toLocaleString()} 张照片`, album.href);
  status.textContent = `${album.markerName} · ${album.latitude.toFixed(2)}° / ${album.longitude.toFixed(2)}°`;
  selectionButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.focus === id || button.dataset.place === (album.mapGroup ?? album.id))));
  document.querySelectorAll<HTMLElement>('[data-album-row]').forEach(row => row.classList.toggle('is-selected', row.dataset.albumRow === id));
  focusMapAlbum?.(album);
  void loadPanelPhotos(album);
  if (innerWidth <= 820) document.querySelector('.world')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
  if (moveFocus) panel.focus({ preventScroll: true });
};

function selectPlace(place: MapPlace, moveFocus = false) {
  if (place.isProvince && focusMapProvince) {
    closeSelection();
    focusMapProvince(place, moveFocus);
    return;
  }
  const { albumIds, label } = place;
  if (albumIds.length === 1) {
    selectAlbum(albumIds[0], moveFocus);
    return;
  }
  closeSelection();
  showSelection(label, `${albumIds.length} 本相册`);
  panelStatus.hidden = true;
  const list = document.createElement('ul');
  list.className = 'selection-albums';
  for (const id of albumIds) {
    const album = albumsById.get(id)!;
    const row = document.createElement('li');
    const button = document.createElement('button');
    const count = document.createElement('small');
    button.type = 'button';
    button.textContent = album.markerName;
    count.textContent = `${album.count.toLocaleString()} 张`;
    button.append(count);
    button.addEventListener('click', () => selectAlbum(album.id, true));
    row.append(button);
    list.append(row);
  }
  panelGallery.replaceChildren(list);
  panelScroll.scrollTop = 0;
  if (moveFocus) panel.focus({ preventScroll: true });
}

const showFlatFallback = (message: string) => {
  if (mapFailed) return;
  mapFailed = true;
  mapMode = '2d';
  focusMapAlbum = undefined;
  focusMapProvince = undefined;
  refreshMapMarkers = undefined;
  changeSceneMode = undefined;
  resetMap = undefined;
  document.querySelector<HTMLElement>('#cesium-globe')!.hidden = true;
  fallbackMap.hidden = false;
  loading.hidden = false;
  loading.textContent = message;
  document.querySelector('[data-imagery]')!.textContent = '本地平面地图';
  document.querySelector('[data-atlas]')!.setAttribute('data-ready', 'fallback');
  document.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => { button.disabled = true; });
  updateModeButtons();
};
selectionButtons.forEach(button => button.addEventListener('click', event => {
  const moveFocus = event.detail === 0;
  if (button.dataset.place) selectPlace(placesById.get(button.dataset.place)!, moveFocus);
  else selectAlbum(button.dataset.focus!, moveFocus);
}));
panel.querySelector('[data-close]')!.addEventListener('click', closeSelection);
homeButton.addEventListener('click', () => { closeSelection(); resetMap?.(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSelection(); });
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () => {
  closeSelection();
  if (mapFailed) return;
  mapMode = button.dataset.mode!;
  updateModeButtons();
  if (changeSceneMode) {
    fallbackMap.hidden = true;
    changeSceneMode(mapMode === '2d');
  } else {
    fallbackMap.hidden = mapMode !== '2d';
    loading.hidden = mapMode === '2d';
  }
}));
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
  // Start from the shipped map so a slow satellite service cannot block the UI.
  const imagery = await TileMapServiceImageryProvider.fromUrl(`${base}Assets/Textures/NaturalEarthII`, { maximumLevel: 2 });
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
  const positions = places.map(place => Cartesian3.fromDegrees(place.longitude, place.latitude, 500));
  const entities = positions.map((position, i) => viewer.entities.add({ id: places[i].id, position, show: !places[i].provinceId, point: { pixelSize: 5, color: Color.fromCssColorString('#dae9d0'), outlineColor: Color.fromCssColorString('#5b968e'), outlineWidth: 2 } }));
  const pins = places.map(place => document.querySelector<HTMLButtonElement>(`[data-pin="${place.id}"]`)!);
  const leaders = places.map(place => document.querySelector<SVGLineElement>(`[data-leader="${place.id}"]`)!);
  const markerLayer = document.querySelector<HTMLElement>('[data-markers]')!;
  const topbar = document.querySelector<HTMLElement>('.topbar')!;
  const toolbar = document.querySelector<HTMLElement>('.map-toolbar')!;
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
  resetMap = () => globalView();
  globalView(false);
  // Keep the reference's illuminated overview independent of the visitor's time zone.
  const light = new DirectionalLight({ direction: Cartesian3.clone(viewer.camera.directionWC) });
  viewer.scene.light = light;
  viewer.scene.preRender.addEventListener(() => Cartesian3.clone(viewer.camera.directionWC, light.direction));
  const skyOptions = { overviewHeight: overviewHeight(), overviewLat: 28, overviewLng: 80, isInteracting: () => motionActive };
  let detachSky = attachStarMapSky(viewer, skyOptions);
  document.querySelector('[data-imagery]')!.textContent = '本地底图 · 正在连接高清影像';
  const focusLocation = (longitude: number, latitude: number, height: number) => {
    const destination = Cartesian3.fromDegrees(longitude, latitude, height);
    useMotionResolution();
    viewer.camera.flyTo({ destination, duration: reducedMotion ? 0 : 1.6, orientation: { heading: 0, pitch: -Math.PI/2, roll: 0 } });
    restoreResolution();
  };
  focusMapAlbum = (album: Album) => {
    const place = placesById.get(album.mapGroup ?? album.id);
    focusLocation(album.longitude, album.latitude, place?.provinceId ? provinceFocusHeight : 2800000);
  };
  focusMapProvince = (place, moveFocus) => {
    focusLocation(place.longitude, place.latitude, provinceFocusHeight);
    if (moveFocus) viewer.canvas.focus({ preventScroll: true });
  };
  viewer.selectedEntityChanged.addEventListener(entity => {
    const place = entity && placesById.get(entity.id);
    if (place) selectPlace(place);
  });
  document.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => { const distance = viewer.camera.positionCartographic.height * .35; if (button.dataset.zoom === 'in') viewer.camera.zoomIn(distance); else viewer.camera.zoomOut(distance); viewer.scene.requestRender(); });
  });
  changeSceneMode = (flat: boolean) => {
    detachSky();
    viewer.scene.globe.enableLighting = !flat;
    viewer.scene.globe.dynamicAtmosphereLighting = !flat;
    for (let index = 0; index < viewer.imageryLayers.length; index++) {
      const layer = viewer.imageryLayers.get(index);
      layer.brightness = flat ? 1 : 0.78;
      layer.contrast = flat ? 1 : 1.15;
      layer.saturation = flat ? 1 : 0.62;
    }
    if (flat) {
      viewer.scene.morphTo2D(0);
      detachSky = () => {};
    } else {
      viewer.scene.morphTo3D(0);
      skyOptions.overviewHeight = overviewHeight();
      detachSky = attachStarMapSky(viewer, skyOptions);
    }
    globalView(false);
  };
  const previousView = new Matrix4();
  let previousWidth = 0, previousHeight = 0, previousScale = 0, previousSelected: string | null = null;
  let provinceDetailsVisible = false;
  refreshMapMarkers = () => { previousWidth = 0; viewer.scene.requestRender(); };
  const headerObserver = new ResizeObserver(refreshMapMarkers);
  headerObserver.observe(topbar);
  viewer.scene.postRender.addEventListener(() => {
    const width = viewer.canvas.clientWidth, height = viewer.canvas.clientHeight;
    const cameraHeight = viewer.camera.positionCartographic.height;
    const flat = viewer.scene.mode === SceneMode.SCENE2D;
    const scale = flat ? cameraHeight : 0;
    if (width === previousWidth && height === previousHeight && scale === previousScale && previousSelected === selected && Matrix4.equals(previousView, viewer.camera.viewMatrix)) return;
    Matrix4.clone(viewer.camera.viewMatrix, previousView);
    previousWidth = width; previousHeight = height; previousScale = scale; previousSelected = selected;

    const labelScale = Math.max(.76, Math.min(1.25, .76 + Math.log2(Math.max(1, overviewHeight() / cameraHeight)) * .13));
    markerLayer.style.setProperty('--map-label-scale', labelScale.toFixed(3));
    const title = document.querySelector<HTMLElement>('.topbar .brand');
    if (title) {
      const rect = title.getBoundingClientRect(), canvasRect = viewer.canvas.getBoundingClientRect();
      const samples = [rect.left+4, (rect.left+rect.right)/2, rect.right-4];
      const covered = !flat && samples.some(x => [rect.top+4, (rect.top+rect.bottom)/2, rect.bottom-4].some(y => {
        const point = new Cartesian2(x-canvasRect.left,y-canvasRect.top);
        return point.x>=0 && point.x<=width && point.y>=0 && point.y<=height && !!viewer.camera.pickEllipsoid(point, viewer.scene.globe.ellipsoid);
      }));
      title.style.visibility = covered ? 'hidden' : '';
    }
    const showProvinceDetails = cameraHeight <= provinceDetailHeight * (flat ? Math.max(1, width / height) : 1);
    if (showProvinceDetails !== provinceDetailsVisible) {
      provinceDetailsVisible = showProvinceDetails;
      places.forEach((place, i) => { entities[i].show = showProvinceDetails ? !place.isProvince : !place.provinceId; });
      viewer.scene.requestRender();
    }
    const mapTop = markerLayer.getBoundingClientRect().top;
    const controls = toolbar.getBoundingClientRect();
    const controlsAtTop = controls.top - mapTop < height / 2;
    const minY = Math.max(150, Math.max(topbar.getBoundingClientRect().bottom, controlsAtTop ? controls.bottom : mapTop) - mapTop + 20);
    const maxY = controlsAtTop ? height - 80 : Math.min(height - 125, controls.top - mapTop - 20);
    const narrow = width <= 820;
    const inset = narrow ? 40 : 55;
    const columnGap = narrow ? 78 : 105;
    const rowGap = narrow ? 40 : 48;
    const placements: { i: number; x: number; y: number; anchorX: number; anchorY: number }[] = [];
    const candidates: { x: number; y: number }[] = [];
    for (let y = minY; y <= maxY; y += rowGap) {
      for (let x = inset; x <= width - inset; x += columnGap) candidates.push({ x, y });
    }
    const available = ({ x, y }: { x: number; y: number }) =>
      !placements.some(other => Math.abs(other.x - x) < columnGap && Math.abs(other.y - y) < rowGap);
    const album = selected ? albumsById.get(selected) : undefined;
    const selectedPlace = album?.mapGroup ?? album?.id;
    const order = places.map((_, i) => i).sort((a, b) => Number(places[b].id === selectedPlace) - Number(places[a].id === selectedPlace));
    for (const i of order) {
      if (!entities[i].show) continue;
      const point = SceneTransforms.worldToWindowCoordinates(viewer.scene, positions[i], new Cartesian2());
      const normal = viewer.scene.globe.ellipsoid.geodeticSurfaceNormal(positions[i]);
      const toCamera = Cartesian3.subtract(viewer.camera.positionWC, positions[i], new Cartesian3());
      const visible = point && (viewer.scene.mode !== SceneMode.SCENE3D || Cartesian3.dot(normal, toCamera)>0) && point.x > 45 && point.x < width - 45 && point.y > 80 && point.y < height - 55;
      if (!visible) continue;
      const anchor = { x: point.x, y: point.y };
      point.x = Math.max(inset, Math.min(width - inset, point.x));
      point.y = Math.max(minY, Math.min(maxY, point.y));
      if (!available(point)) {
        const candidate = candidates.filter(available).sort((a, b) => Math.hypot(a.x - anchor.x, a.y - anchor.y) - Math.hypot(b.x - anchor.x, b.y - anchor.y))[0];
        if (candidate) { point.x = candidate.x; point.y = candidate.y; }
      }
      placements.push({ i, x: point.x, y: point.y, anchorX: anchor.x, anchorY: anchor.y });
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
  viewer.scene.globe.tileLoadProgressEvent.addEventListener(remaining => { if (!mapFailed && remaining===0) loading.hidden=true; });
  viewer.scene.renderError.addEventListener(() => showFlatFallback('3D暂时无法显示，已切换平面地图，可从列表打开相册。'));
  fallbackMap.hidden = true;
  if (mapMode === '2d') changeSceneMode(true);
  if (selected) selectAlbum(selected);
  document.querySelector('[data-atlas]')?.setAttribute('data-ready','true');
  viewer.scene.requestRender();
  // Keep the local layer underneath while satellite imagery loads in the background.
  void ArcGisMapServerImageryProvider.fromUrl('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer', { enablePickFeatures: false }).then(provider => {
    if (mapFailed || viewer.isDestroyed()) return;
    const flat = mapMode === '2d';
    viewer.imageryLayers.add(new ImageryLayer(provider, { brightness: flat ? 1 : 0.78, contrast: flat ? 1 : 1.15, saturation: flat ? 1 : 0.62 }));
    document.querySelector('[data-imagery]')!.textContent = '高清卫星影像 · Esri';
    viewer.scene.requestRender();
  }).catch(() => {
    if (!mapFailed && !viewer.isDestroyed()) document.querySelector('[data-imagery]')!.textContent = '本地底图 · 高清影像暂不可用';
  });
  window.addEventListener('pagehide',()=>{interactionEvents.abort();headerObserver.disconnect();window.clearTimeout(restoreTimer);detachSky();if(!viewer.isDestroyed())viewer.destroy();},{once:true});
}
start().catch(error => { console.error('Travel globe initialization failed', error); showFlatFallback('3D暂时无法显示，已切换平面地图，可从列表打开相册。'); });
