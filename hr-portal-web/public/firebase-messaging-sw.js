// Firebase Cloud Messaging Background Service Worker for Elipse HR
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

try {
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const cleanTitle = String(payload.notification?.title || payload.data?.title || 'Notification').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim();
    const cleanBody = String(payload.notification?.body || payload.data?.message || payload.data?.body || '').trim();

    const notificationOptions = {
      body: cleanBody,
      icon: self.location.origin + '/icons/logo.png',
      badge: self.location.origin + '/icons/logo.png',
      tag: 'elipse-fcm-' + (payload.data?.id || Date.now()),
      vibrate: [200, 100, 200],
      data: {
        url: (payload.data && payload.data.url) || self.location.origin
      }
    };

    return self.registration.showNotification(cleanTitle, notificationOptions);
  });
} catch (err) {}

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
