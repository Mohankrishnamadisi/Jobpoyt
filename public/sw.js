const CACHE_PREFIX = 'jobpoyt-cache';
const SHELL_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
  '/jobpoyttitle.png',
];

const getBuildId = async () => {
  try {
    const response = await fetch('/build-meta.json', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });

    if (!response.ok) return 'dev';
    const payload = await response.json();
    return typeof payload?.buildId === 'string' ? payload.buildId : 'dev';
  } catch (error) {
    return 'dev';
  }
};

const getCacheName = async () => `${CACHE_PREFIX}-${await getBuildId()}`;

const isApiOrSupabaseRequest = (url) => {
  const isSupabase = url.hostname.includes('supabase.co');
  const isRestApiPath =
    url.pathname.includes('/rest/v1') ||
    url.pathname.includes('/storage/v1') ||
    url.pathname.includes('/auth/v1');

  return isSupabase || isRestApiPath || url.pathname.includes('/api/');
};

const isNavigationRequest = (request) => request.mode === 'navigate' || request.destination === 'document';

const isHashedAsset = (url) => {
  const hasHashedAssetPattern = /\.[a-z0-9]{8,}\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ico)$/i.test(url.pathname);
  return hasHashedAssetPattern || /\/assets\//i.test(url.pathname);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cacheName = await getCacheName();
      const cache = await caches.open(cacheName);
      await cache.addAll(SHELL_CACHE_ASSETS);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const currentCacheName = await getCacheName();
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== currentCacheName)
          .map((cacheName) => caches.delete(cacheName))
      );
      self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin || isApiOrSupabaseRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request, { cache: 'no-store' });
          if (response && response.ok) {
            const cache = await caches.open(await getCacheName());
            cache.put('/index.html', response.clone());
          }
          return response;
        } catch (error) {
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;
          return caches.match('/');
        }
      })()
    );
    return;
  }

  if (isHashedAsset(url) || /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(await getCacheName());
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request, { cache: 'force-cache' });
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  event.respondWith(
    fetch(request).then((response) => {
      if (response && response.ok) {
        const cache = caches.open(getCacheName());
        cache.then((store) => store.put(request, response.clone()));
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
