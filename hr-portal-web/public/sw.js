// Elipse HR Service Worker v10 (Unified Background Sync + Firebase Cloud Messaging Engine)
const CACHE_NAME = 'elipse-hr-v10';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/logo.png'
];

// --- 1. Firebase Cloud Messaging (FCM) Native Background Push Handler ---
try {
  importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

  const firebaseConfig = {
    apiKey: "AIzaSyBcI4EGIhu_BUlnKW9QiFZg_G_GnrQ27bg",
    authDomain: "elipse-hr.firebaseapp.com",
    projectId: "elipse-hr",
    storageBucket: "elipse-hr.firebasestorage.app",
    messagingSenderId: "546240043542",
    appId: "1:546240043542:web:cc63e8c7eae7b01c0af337",
    measurementId: "G-GJD768QN1J"
  };

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const cleanTitle = String(payload.notification?.title || payload.data?.title || 'Notification').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim();
    const cleanBody = String(payload.notification?.body || payload.data?.message || payload.data?.body || '').trim();

    const notificationOptions = {
      body: cleanBody,
      icon: self.location.origin + '/icons/logo.png',
      badge: self.location.origin + '/icons/logo.png',
      tag: 'elipse-fcm-' + (payload.data?.id || Date.now()),
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      silent: false,
      data: {
        url: (payload.data && payload.data.url) || self.location.origin
      }
    };

    return self.registration.showNotification(cleanTitle, notificationOptions);
  });
} catch (fcmErr) {}

// --- 2. IndexedDB Persistent Storage for Background User Context & Last Seen Notification ID ---
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

// --- 3. Install & Activation ---
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

// --- 4. Asset Caching & Fetch Handling ---
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

// --- 5. User Matching Logic ---
function isMatchingUser(targetUserId, user) {
  if (!targetUserId || targetUserId === 'all' || targetUserId === 'null') return true;
  if (!user) return false;

  const t = String(targetUserId).trim().toLowerCase();
  const uid = String(user.id || '').trim().toLowerCase();
  const profId = String(user.profileId || '').trim().toLowerCase();
  const uemail = String(user.email || '').trim().toLowerCase();
  const upin = String(user.pin || '').trim().toLowerCase();
  const udept = String(user.department || '').trim().toLowerCase();
  const udesig = String(user.designation || '').trim().toLowerCase();

  if (user.role === 'admin' || uemail === 'elipsestudiohr@gmail.com') {
    if (
      t === 'admin' || 
      t === 'all' || 
      t === uid || 
      t === profId ||
      t === uemail || 
      (upin && t === upin)
    ) {
      return true;
    }
    return false;
  }

  if (t === 'admin') return false;

  if (
    (uid && t === uid) || 
    (profId && t === profId) ||
    (uemail && t === uemail) || 
    (upin && t === upin)
  ) {
    return true;
  }

  if (udept && t === udept) return true;
  if (udesig && t === udesig) return true;

  return false;
}

// --- 6. Persistent Background Notification Checker ---
let isChecking = false;

async function checkBackgroundNotifications() {
  if (isChecking) return;
  isChecking = true;

  try {
    const context = await getStoredState('user_context');
    const user = context && context.user;
    if (!user) {
      isChecking = false;
      return;
    }

    const supabaseUrl = (context && context.supabaseUrl) || 'https://fkhuybrvtkrdccqswzqr.supabase.co';
    const supabaseAnonKey = (context && context.supabaseAnonKey) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';
    const url = `${supabaseUrl}/rest/v1/notifications?select=*&order=id.desc&limit=15`;
    
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
    if (!Array.isArray(rows) || rows.length === 0) {
      isChecking = false;
      return;
    }

    // Load persistent last seen notification ID from IndexedDB
    let lastSeenId = await getStoredState('last_seen_notification_id');
    const maxRowId = Math.max(...rows.map(r => Number(r.id) || 0));

    // If never seeded, seed it with the current highest ID
    if (lastSeenId === null || lastSeenId === undefined) {
      await setStoredState('last_seen_notification_id', maxRowId);
      isChecking = false;
      return;
    }

    lastSeenId = Number(lastSeenId) || 0;

    // Check if any tab is currently open and focused
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasFocusedClient = clientList.some(c => c.focused);

    let highestDispatchedId = lastSeenId;

    // Process all notifications that are strictly newer than lastSeenId
    for (const row of rows) {
      const rowId = Number(row.id);
      if (rowId > lastSeenId) {
        if (rowId > highestDispatchedId) {
          highestDispatchedId = rowId;
        }

        // Only show background OS notification if no open window has focus
        if (!hasFocusedClient) {
          if (isMatchingUser(row.user_id, user)) {
            const cleanTitle = String(row.title || 'Notification').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim();
            const cleanMsg = String(row.message || '').trim();

            await self.registration.showNotification(cleanTitle, {
              body: cleanMsg,
              icon: self.location.origin + '/icons/logo.png',
              badge: self.location.origin + '/icons/logo.png',
              tag: 'elipse-bg-' + row.id,
              vibrate: [300, 100, 300, 100, 300],
              requireInteraction: true,
              silent: false,
              data: { url: self.location.origin }
            });
          }
        }
      }
    }

    // Update persistent last seen ID in IndexedDB
    if (highestDispatchedId > lastSeenId) {
      await setStoredState('last_seen_notification_id', highestDispatchedId);
    }
  } catch (e) {
  } finally {
    isChecking = false;
  }
}

// Background loop (Checks every 2.5 seconds for instant background delivery)
function scheduleNextCheck() {
  setTimeout(() => {
    checkBackgroundNotifications().then(scheduleNextCheck).catch(scheduleNextCheck);
  }, 2500);
}
scheduleNextCheck();

// Background Sync & Periodic Sync triggers
self.addEventListener('sync', (event) => {
  event.waitUntil(checkBackgroundNotifications());
});

self.addEventListener('periodicsync', (event) => {
  event.waitUntil(checkBackgroundNotifications());
});

// --- 7. Notification Click Handler ---
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

// --- 8. Message Event Handler (Syncs user context & handles login/logout) ---
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
    if (event.data.lastSeenId) {
      setStoredState('last_seen_notification_id', event.data.lastSeenId);
    }
    checkBackgroundNotifications();
  }

  if (event.data.type === 'UPDATE_LAST_SEEN_ID') {
    if (event.data.id) {
      setStoredState('last_seen_notification_id', event.data.id);
    }
  }

  if (event.data.type === 'CLEAR_USER_STATE') {
    setStoredState('user_context', null);
    setStoredState('last_seen_notification_id', null);
  }
});

// --- 9. Push Event Handler (Web Push) ---
self.addEventListener('push', (event) => {
  event.waitUntil(checkBackgroundNotifications());
});
