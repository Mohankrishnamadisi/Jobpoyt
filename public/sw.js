const CACHE_PREFIX = 'jobpoyt-v4';
const LEGACY_CACHE_PREFIXES = ['jobpoyt-cache', 'jobpoyt-v'];
const SHELL_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/icons/jobpoyt-icon-192-v4.png',
  '/icons/jobpoyt-icon-512-v4.png',
  '/icons/jobpoyt-icon-512-maskable-v4.png',
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
      await Promise.all(
        SHELL_CACHE_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch (error) {
            // A non-critical optional asset must not block SW installation.
          }
        })
      );
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
          .filter((cacheName) => (
            LEGACY_CACHE_PREFIXES.some((prefix) => cacheName.startsWith(prefix)) &&
            cacheName !== currentCacheName
          ))
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
        const responseForCache = response.clone();
        const cache = caches.open(getCacheName());
        cache.then((store) => store.put(request, responseForCache)).catch(() => undefined);
      }
      return response;
    }).catch(() => caches.match(request))
  );
});
