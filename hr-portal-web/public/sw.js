// Elipse HR Service Worker v30 (Pure Standard Web Push & Instant Lock-Screen Delivery with Mute Support)
const CACHE_NAME = 'elipse-hr-v30';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/logo.png'
];

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('elipse_bg_sync_db', 2);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config');
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e);
  });
}

async function getStoredState(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('config', 'readonly');
      const req = tx.objectStore('config').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function setStoredState(key, val) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('config', 'readwrite');
      const req = tx.objectStore('config').put(val, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

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

// --- 3. Pure Direct Push Event Handler (Instant Lock-Screen Wake-up with Mute Support) ---
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    // Check if notifications are muted on this device
    const isMuted = await getStoredState('is_notifications_muted');
    if (isMuted) return;

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

    await self.registration.showNotification(cleanTitle, {
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
  })());
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

  if (event.data.type === 'SET_MUTE_STATE') {
    setStoredState('is_notifications_muted', !!event.data.muted);
  }
});
