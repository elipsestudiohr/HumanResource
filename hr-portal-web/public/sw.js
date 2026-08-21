// Elipse HR Service Worker v25 (Pure Standard Web Push & Instant Lock-Screen Delivery)
const CACHE_NAME = 'elipse-hr-v25';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/logo.png'
];

// --- 1. Install & Activation ---
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

// --- 2. Asset Caching & Fetch Handling ---
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  try {
    const url = new URL(event.request.url);
    if (url.origin !== location.origin) {
      return;
    }
  } catch (e) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// --- 3. Pure Direct Push Event Handler (Instant Lock-Screen Wake-up) ---
self.addEventListener('push', (event) => {
  let data = {
    title: 'Elipse HR Portal',
    body: 'New notification',
    id: Date.now(),
    url: '/'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      try {
        data.body = event.data.text() || data.body;
      } catch (_) {}
    }
  }

  const cleanTitle = String(data.title || 'Elipse HR Portal').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim();
  const cleanBody = String(data.body || data.message || '').trim();

  const showPromise = self.registration.showNotification(cleanTitle, {
    body: cleanBody,
    icon: self.location.origin + '/icons/logo.png',
    badge: self.location.origin + '/icons/logo.png',
    tag: 'elipse-' + (data.id || Date.now()),
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    silent: false,
    data: {
      url: data.url || self.location.origin,
      id: data.id
    }
  });

  event.waitUntil(showPromise);
});

// --- 4. Notification Click Navigation Handler ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// --- 5. Message Event Handler ---
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
