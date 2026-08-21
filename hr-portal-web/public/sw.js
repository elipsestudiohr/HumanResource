// Elipse HR Service Worker v4 (Clean Notification Pipeline)
const CACHE_NAME = 'elipse-hr-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
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
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. Only intercept GET requests
  if (event.request.method !== 'GET') return;

  // 2. Completely ignore non-same-origin requests (e.g. Google Fonts) so browser handles them natively without CSP / SW fetch errors
  try {
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) {
      return;
    }
  } catch (e) {
    return;
  }

  // 3. Same-origin assets: attempt network fetch first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// 4. Native Phone Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// 5. Message event listener for immediate update reload
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 6. Push Event Handler for Native OS Notification Bar Banners (Web Push only)
self.addEventListener('push', (event) => {
  let title = 'Elipse HR Notification';
  let body = 'You have a new update in Elipse HR.';
  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.message || data.body || body;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: self.location.origin + '/icons/logo.png',
    badge: self.location.origin + '/icons/logo.png',
    tag: 'elipse-push-' + Date.now(),
    vibrate: [200, 100, 200],
    silent: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
