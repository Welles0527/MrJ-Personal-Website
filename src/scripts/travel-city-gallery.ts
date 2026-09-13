export {};

type CityPhoto = { id: string; src: string; width: number; height: number; takenAt: string };
type City = { id: string; name: string; count: number; photosPath: string; albumSlugs: string[] };
type SourceAlbum = { slug: string; name: string; href: string };
const cities: City[] = JSON.parse(document.querySelector('#cesium-albums')?.textContent || '[]');
const albums: SourceAlbum[] = JSON.parse(document.querySelector('#city-source-albums')?.textContent || '[]');
const dialog = document.querySelector<HTMLDialogElement>('[data-city-gallery]')!;
const grid = dialog.querySelector<HTMLElement>('[data-city-photo-grid]')!;
const status = dialog.querySelector<HTMLElement>('[data-city-gallery-status]')!;
const view = dialog.querySelector<HTMLElement>('[data-city-photo-view]')!;
const image = dialog.querySelector<HTMLImageElement>('[data-city-photo-image]')!;
const caption = dialog.querySelector<HTMLElement>('[data-city-photo-caption]')!;
const cache = new Map<string, CityPhoto[]>();
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
let photos: CityPhoto[] = [];
let current = 0;
let load: AbortController | null = null;
let cityName = '';
let gridScroll = 0;

function showPhoto(index: number) {
  if (!photos.length) return;
  if (view.hidden) gridScroll = dialog.scrollTop;
  current = (index + photos.length) % photos.length;
  const photo = photos[current];
  image.src = `${base}${photo.src}`;
  image.alt = `${cityName}旅行照片 ${current + 1}`;
  caption.textContent = `${photo.takenAt.slice(0, 10)} · ${current + 1} / ${photos.length}`;
  dialog.classList.add('is-photo-view');
  view.hidden = false;
  dialog.scrollTop = 0;
  dialog.querySelector<HTMLButtonElement>('[data-photo-back]')!.focus();
}
function backToGrid() {
  view.hidden = true;
  dialog.classList.remove('is-photo-view');
  dialog.scrollTop = gridScroll;
  grid.querySelectorAll<HTMLButtonElement>('button')[current]?.focus({ preventScroll: true });
}
async function openCity(id: string) {
  const city = cities.find(item => item.id === id);
  if (!city) return;
  load?.abort();
  load = new AbortController();
  const request = load;
  photos = [];
  cityName = city.name;
  dialog.dataset.cityId = id;
  dialog.classList.remove('is-photo-view');
  view.hidden = true;
  grid.replaceChildren();
  status.textContent = '正在加载城市照片…';
  dialog.querySelector('[data-city-gallery-title]')!.textContent = city.name;
  dialog.querySelector('[data-city-gallery-count]')!.textContent = `${city.count.toLocaleString()} 张照片`;
  const links = dialog.querySelector('[data-city-source-links]')!;
  links.replaceChildren(...albums.filter(album => city.albumSlugs.includes(album.slug)).map(album => {
    const link = document.createElement('a');
    link.href = album.href;
    link.textContent = `${album.name} ↗`;
    return link;
  }));
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  try {
    let result = cache.get(id);
    if (!result) {
      const response = await fetch(city.photosPath, { signal: request.signal });
      if (!response.ok) throw new Error(`City photos returned ${response.status}`);
      const data = await response.json();
      if (data.id !== id || !Array.isArray(data.photos) || data.photos.length !== city.count || data.photos.some((photo: CityPhoto) => !photo.src?.startsWith('/images/photo-wall/'))) throw new Error('Invalid city photo manifest');
      result = data.photos as CityPhoto[];
      cache.set(id, result);
    }
    if (request.signal.aborted || !dialog.open) return;
    photos = result;
    const fragment = document.createDocumentFragment();
    photos.forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `查看${city.name}第${index + 1}张照片`);
      const thumbnail = document.createElement('img');
      thumbnail.src = `${base}${photo.src}`;
      thumbnail.width = photo.width;
      thumbnail.height = photo.height;
      thumbnail.alt = `${city.name}旅行照片 ${index + 1}`;
      thumbnail.loading = 'lazy';
      thumbnail.decoding = 'async';
      button.append(thumbnail);
      button.addEventListener('click', () => showPhoto(index));
      fragment.append(button);
    });
    grid.append(fragment);
    status.textContent = '';
  } catch (error) {
    if (request.signal.aborted) return;
    status.textContent = '城市照片暂时无法加载，请重新打开，或从上方原相册查看。';
    console.error('City gallery loading failed', error);
  }
}
document.querySelectorAll<HTMLButtonElement>('[data-city-open]').forEach(button => button.addEventListener('click', () => void openCity(button.dataset.cityOpen!)));
document.querySelector<HTMLButtonElement>('[data-selection-open]')?.addEventListener('click', event => {
  const id = (event.currentTarget as HTMLButtonElement).dataset.cityId;
  if (id) void openCity(id);
});
dialog.querySelector('[data-city-gallery-close]')!.addEventListener('click', () => dialog.close());
dialog.querySelector('[data-photo-back]')!.addEventListener('click', backToGrid);
dialog.querySelector('[data-city-photo-previous]')!.addEventListener('click', () => showPhoto(current - 1));
dialog.querySelector('[data-city-photo-next]')!.addEventListener('click', () => showPhoto(current + 1));
dialog.addEventListener('close', () => { load?.abort(); });
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('cancel', event => { if (!view.hidden) { event.preventDefault(); backToGrid(); } });
dialog.addEventListener('keydown', event => {
  if (view.hidden) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(current - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(current + 1); }
});
