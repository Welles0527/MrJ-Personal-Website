const CACHE_PREFIX = 'j-space-';
const CACHE_VERSION = '20260722-v6';
const PAGE_CACHE = `${CACHE_PREFIX}pages-${CACHE_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-${CACHE_VERSION}`;
const BASE_PATH = '/officialwebsite/';
const FUND_DASHBOARD_PATH = `${BASE_PATH}topics/space/investing/funds/`;
const HASHED_ASSET_PATTERN = /\/[A-Za-z0-9_.-]+\.[A-Za-z0-9_-]{8}\.(?:css|js|mjs|png|jpe?g|webp|avif|gif|svg|woff2?)$/i;

self.addEventListener('install', () => {
  // Activate immediately so the old cache-first worker cannot keep serving stale HTML.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => (key.startsWith(CACHE_PREFIX) || key.startsWith('j-space-shell-'))
          && key !== PAGE_CACHE
          && key !== ASSET_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

const fetchFresh = (request) => {
  const url = new URL(request.url);
  url.searchParams.set('__sw_update', `${CACHE_VERSION}-${Date.now()}`);
  const init = {
    method: request.method,
    headers: request.headers,
    credentials: request.credentials,
    redirect: request.redirect,
    cache: 'no-store'
  };
  if (request.mode && request.mode !== 'navigate') init.mode = request.mode;
  return fetch(new Request(url.toString(), init));
};

const networkFirst = async (request, cacheName, fallbackRequest) => {
  try {
    const response = await fetchFresh(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackRequest) {
      const fallback = await caches.match(fallbackRequest);
      if (fallback) return fallback;
    }
    throw error;
  }
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(ASSET_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE_PATH)) {
    return;
  }

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, PAGE_CACHE, BASE_PATH));
    return;
  }

  if (url.pathname.startsWith(FUND_DASHBOARD_PATH)) {
    event.respondWith(networkFirst(request, ASSET_CACHE));
    return;
  }

  if (url.pathname.startsWith(`${BASE_PATH}_astro/`) && HASHED_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
