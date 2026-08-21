// Elipse HR Service Worker v6 (Persistent Background Notification & Sync Engine)
const CACHE_NAME = 'elipse-hr-v6';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/logo.png'
];

// --- 1. IndexedDB Persistent Storage for Background User Context ---
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('elipse_bg_sync_db', 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('config');
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

// --- 2. Install & Activation ---
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

// --- 3. Asset Caching & Fetch Handling ---
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

// --- 4. Background Notification Checker (Runs Even When All Tabs Are Closed) ---
let seenNotificationIds = new Set();
let isChecking = false;

function isMatchingUser(targetUserId, user) {
  if (!targetUserId || targetUserId === 'all' || targetUserId === 'null') return true;
  if (!user) return false;

  const t = String(targetUserId).trim().toLowerCase();
  const uid = String(user.id || '').trim().toLowerCase();
  const uemail = String(user.email || '').trim().toLowerCase();
  const upin = String(user.pin || '').trim().toLowerCase();
  const profId = String(user.id || '').trim().toLowerCase();
  const udept = String(user.department || '').trim().toLowerCase();
  const udesig = String(user.designation || '').trim().toLowerCase();

  if (user.role === 'admin') {
    if (
      t === 'admin' || 
      t === 'all' || 
      t === uid || 
      t === uemail || 
      (upin && t === upin) || 
      (profId && t === profId)
    ) {
      return true;
    }
    return false;
  }

  if (t === 'admin') return false;

  if (
    (uid && t === uid) || 
    (uemail && t === uemail) || 
    (upin && t === upin) || 
    (profId && t === profId)
  ) {
    return true;
  }

  if (udept && t === udept) return true;
  if (udesig && t === udesig) return true;

  return false;
}

async function checkBackgroundNotifications() {
  if (isChecking) return;
  isChecking = true;

  try {
    const context = await getStoredState('user_context');
    if (!context || !context.user || !context.supabaseUrl || !context.supabaseAnonKey) {
      isChecking = false;
      return;
    }

    const { user, supabaseUrl, supabaseAnonKey } = context;
    const url = `${supabaseUrl}/rest/v1/notifications?select=*&order=id.desc&limit=10`;
    
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (!res.ok) {
      isChecking = false;
      return;
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) {
      isChecking = false;
      return;
    }

    // Initial load: seed existing items so we don't alert old notifications
    if (seenNotificationIds.size === 0) {
      rows.forEach(r => seenNotificationIds.add(r.id));
      isChecking = false;
      return;
    }

    // Check if any tab is currently open and focused
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasFocusedClient = clientList.some(c => c.focused);

    // If app is closed or in background, trigger OS notification
    if (!hasFocusedClient) {
      for (const row of rows) {
        if (!seenNotificationIds.has(row.id)) {
          seenNotificationIds.add(row.id);
          if (isMatchingUser(row.user_id, user)) {
            const cleanTitle = String(row.title || 'Notification').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim();
            const cleanMsg = String(row.message || '').trim();

            await self.registration.showNotification(cleanTitle, {
              body: cleanMsg,
              icon: self.location.origin + '/icons/logo.png',
              badge: self.location.origin + '/icons/logo.png',
              tag: 'elipse-bg-' + row.id,
              vibrate: [200, 100, 200],
              data: { url: self.location.origin }
            });
          }
        }
      }
    } else {
      // Tab is open, seed seen IDs
      rows.forEach(r => seenNotificationIds.add(r.id));
    }
  } catch (e) {
  } finally {
    isChecking = false;
  }
}

// Background polling loop (every 12 seconds while service worker is active)
setInterval(checkBackgroundNotifications, 12000);

// Background Sync & Periodic Sync triggers
self.addEventListener('sync', (event) => {
  event.waitUntil(checkBackgroundNotifications());
});

self.addEventListener('periodicsync', (event) => {
  event.waitUntil(checkBackgroundNotifications());
});

// --- 5. Notification Click Handler ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// --- 6. Message Event Handler (Syncs user context & handles login/logout) ---
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'SYNC_USER_STATE') {
    setStoredState('user_context', {
      user: event.data.user,
      supabaseUrl: event.data.config?.supabaseUrl,
      supabaseAnonKey: event.data.config?.supabaseAnonKey
    });
    // Trigger immediate background check
    checkBackgroundNotifications();
  }

  if (event.data.type === 'CLEAR_USER_STATE') {
    setStoredState('user_context', null);
    seenNotificationIds.clear();
  }
});

// --- 7. Push Event Handler (Web Push) ---
self.addEventListener('push', (event) => {
  event.waitUntil(checkBackgroundNotifications());
});
