// Elipse HR Service Worker v20 (Self-Contained Standard Web Push & Background Sync Engine)
const CACHE_NAME = 'elipse-hr-v20';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/logo.png'
];

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

  const t = String(targetUserId || '').trim().toLowerCase();
  const uid = String(user.id || '').trim().toLowerCase();
  const profId = String(user.profileId || '').trim().toLowerCase();
  const uemail = String(user.email || '').trim().toLowerCase();
  const upin = String(user.pin || '').trim().toLowerCase();
  const udept = String(user.department || '').trim().toLowerCase();
  const udesig = String(user.designation || '').trim().toLowerCase();
  const isAdmin = user.role === 'admin' || uemail === 'elipsestudiohr@gmail.com';

  // 1. Specifically targeted to 'admin'
  if (t === 'admin') {
    return isAdmin;
  }

  // 2. Global broadcast for all employees & admins
  if (!targetUserId || t === 'all' || t === 'null') {
    return true;
  }

  // 3. If Admin user
  if (isAdmin) {
    if (
      t === uid || 
      t === profId ||
      t === uemail || 
      (upin && t === upin)
    ) {
      return true;
    }
    return false;
  }

  // 4. Regular employee checks (strictly matching employee's own identity):
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

    // Load persistent set of shown notification IDs from IndexedDB
    let shownIdsRaw = await getStoredState('shown_notification_ids');
    let shownIds = Array.isArray(shownIdsRaw) ? shownIdsRaw : [];

    // If first time initializing on this device session, seed existing row IDs so we don't spam old history
    const isFirstInit = await getStoredState('is_bg_initialized');
    if (!isFirstInit) {
      shownIds = rows.map(r => Number(r.id)).filter(Boolean);
      await setStoredState('shown_notification_ids', shownIds);
      await setStoredState('is_bg_initialized', true);
      isChecking = false;
      return;
    }

    // Check if any client tab is currently open and focused
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasFocusedClient = clientList.some(c => c.focused);

    // Only fire background lock screen notifications if app is not actively focused
    if (!hasFocusedClient) {
      const newShownIds = [...shownIds];

      for (const row of rows) {
        const rowId = Number(row.id);
        if (rowId && !shownIds.includes(rowId)) {
          if (isMatchingUser(row.user_id, user)) {
            const cleanTitle = String(row.title || 'Notification').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim();
            const cleanMsg = String(row.message || '').trim();

            await self.registration.showNotification(cleanTitle, {
              body: cleanMsg,
              icon: self.location.origin + '/icons/logo.png',
              badge: self.location.origin + '/icons/logo.png',
              tag: 'elipse-notif-' + row.id,
              vibrate: [300, 100, 300, 100, 300],
              requireInteraction: true,
              silent: false,
              data: { url: self.location.origin }
            });

            newShownIds.push(rowId);
          } else {
            // Not for this user, mark as processed
            newShownIds.push(rowId);
          }
        }
      }

      // Keep only recent 100 IDs in IndexedDB
      if (newShownIds.length > 100) {
        newShownIds.splice(0, newShownIds.length - 100);
      }
      await setStoredState('shown_notification_ids', newShownIds);
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
    checkBackgroundNotifications();
  }

  if (event.data.type === 'CLEAR_USER_STATE') {
    setStoredState('user_context', null);
    setStoredState('shown_notification_ids', null);
    setStoredState('is_bg_initialized', null);
  }
});

// Dedicated Push Event Handler (Never blocked by background timer loop)
async function handlePushWakeup(payload) {
  try {
    if (payload && (payload.title || payload.body || payload.message)) {
      const cleanTitle = String(payload.title || 'Notification').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim();
      const cleanBody = String(payload.body || payload.message || '').trim();
      const notifId = payload.id || Date.now();

      await self.registration.showNotification(cleanTitle, {
        body: cleanBody,
        icon: self.location.origin + '/icons/logo.png',
        badge: self.location.origin + '/icons/logo.png',
        tag: 'elipse-push-' + notifId,
        vibrate: [300, 100, 300, 100, 300],
        requireInteraction: true,
        silent: false,
        data: { url: self.location.origin }
      });
      return;
    }

    // If empty wake-up push from server, fetch latest notification from Supabase and show immediately
    const context = await getStoredState('user_context');
    const user = context && context.user;
    const supabaseUrl = (context && context.supabaseUrl) || 'https://fkhuybrvtkrdccqswzqr.supabase.co';
    const supabaseAnonKey = (context && context.supabaseAnonKey) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';

    const url = `${supabaseUrl}/rest/v1/notifications?select=*&order=id.desc&limit=5`;
    const res = await fetch(url, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        for (const row of rows) {
          if (!user || isMatchingUser(row.user_id, user)) {
            const cleanTitle = String(row.title || 'Notification').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim();
            const cleanMsg = String(row.message || '').trim();

            await self.registration.showNotification(cleanTitle, {
              body: cleanMsg,
              icon: self.location.origin + '/icons/logo.png',
              badge: self.location.origin + '/icons/logo.png',
              tag: 'elipse-push-' + row.id,
              vibrate: [300, 100, 300, 100, 300],
              requireInteraction: true,
              silent: false,
              data: { url: self.location.origin }
            });
            break;
          }
        }
      }
    }
  } catch (e) {}
}

// --- 9. Push & Background Sync Event Handlers (Web Push) ---
self.addEventListener('push', (event) => {
  let payload = null;
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {}
  }
  event.waitUntil(handlePushWakeup(payload));
});

self.addEventListener('sync', (event) => {
  event.waitUntil(checkBackgroundNotifications());
});

self.addEventListener('periodicsync', (event) => {
  event.waitUntil(checkBackgroundNotifications());
});
