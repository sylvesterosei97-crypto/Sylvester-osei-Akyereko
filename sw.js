const CACHE_NAME = 'hitmi-cache-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/components/Icon.tsx',
  '/components/ChatBubble.tsx',
  '/components/MessageInput.tsx',
  '/components/Header.tsx',
  '/components/Logo.tsx',
  '/services/authService.ts',
  '/components/SignInView.tsx',
  '/components/StatusView.tsx',
  '/services/messagingService.ts',
  '/components/SendMediaView.tsx'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(APP_SHELL_URLS);
      })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(err => {
          console.error('Fetch failed:', err);
          // If fetch fails and we have a cached response, we can still use it.
          // If not, the request will fail, which is the expected behavior for no network and no cache.
      });

      // Return the cached response immediately if available, and fetch in background (stale-while-revalidate).
      // If not cached, wait for the network response.
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
