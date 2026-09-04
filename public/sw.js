const CACHE_NAME = 'vetaxis-rural-offline-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/index.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline layout and shell assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Cleaning old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude non-GET, external origins, API, Firebase, and Auth requests
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('firebase') ||
    url.pathname.includes('google')
  ) {
    return;
  }

  const isHtmlNavigation = 
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));

  // Network-First for HTML/page navigation to always serve the newest deployed application
  if (isHtmlNavigation) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] Offline mode: Serving cached HTML fallback for:', url.pathname);
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/') || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Stale-while-revalidate or Network-first for other static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// ─────────────────────────────────────────────────────────────────
// NOTIFICATION CLICK & INTERACTION HANDLER (Mobile bar & Browser)
// ─────────────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the app
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if (client.url !== targetUrl && 'navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // If no open tab is found, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─────────────────────────────────────────────────────────────────
// PUSH EVENT HANDLER (Background Web Push)
// ─────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {
    title: 'VetAxis 360 Notification',
    body: 'You have a new update from VetAxis 360.',
    url: '/'
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body || payload.message,
    icon: '/favicon-192.png',
    badge: '/favicon-96.png',
    vibrate: [200, 100, 200],
    data: { url: payload.url || payload.actionUrl || '/' },
    tag: payload.tag || 'vetaxis_push_' + Date.now(),
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

