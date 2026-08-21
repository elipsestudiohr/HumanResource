// Firebase Cloud Messaging Background Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Parse Firebase configuration from query parameters or default
const urlParams = new URLSearchParams(self.location.search);
const apiKey = urlParams.get('apiKey');
const projectId = urlParams.get('projectId');
const messagingSenderId = urlParams.get('messagingSenderId');
const appId = urlParams.get('appId');

if (apiKey && projectId) {
  firebase.initializeApp({
    apiKey: apiKey,
    projectId: projectId,
    messagingSenderId: messagingSenderId,
    appId: appId
  });

  try {
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const cleanTitle = (payload.notification?.title || payload.data?.title || 'Notification').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim();
      const cleanBody = (payload.notification?.body || payload.data?.message || payload.data?.body || '').trim();

      const notificationOptions = {
        body: cleanBody,
        icon: self.location.origin + '/icons/logo.png',
        badge: self.location.origin + '/icons/logo.png',
        tag: 'elipse-fcm-' + Date.now(),
        vibrate: [200, 100, 200],
        data: {
          url: (payload.data && payload.data.url) || self.location.origin
        }
      };

      return self.registration.showNotification(cleanTitle, notificationOptions);
    });
  } catch (err) {}
}

// Notification Click Handler
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
