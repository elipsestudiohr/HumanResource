import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { supabase } from './supabase';

// Firebase Configuration from Environment Variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BJ0LuD-65IkI6vNCeTHHTQrMDSTfxdCUVONrCjv-qhpeVhzBUkbpsshN4K6vuc2hiUuMzkMONzYQMsJ4aJrF-3U';

// Convert URL-safe base64 string to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Initialize Firebase safely
export const app = !getApps().length && firebaseConfig.apiKey 
  ? initializeApp(firebaseConfig) 
  : (getApps().length ? getApp() : null);

/**
 * Register Web Push & FCM device push token for logged-in user in Supabase
 */
export async function registerFCMDeviceToken(userId: string, email?: string, role?: string): Promise<string | null> {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return null;
    }

    let permission = window.Notification.permission;
    if (permission === 'default') {
      try {
        permission = await window.Notification.requestPermission();
      } catch (e) {}
    }

    if (permission !== 'granted') {
      return null;
    }

    const reg = await navigator.serviceWorker.ready;
    let pushSub: PushSubscription | null = null;

    // 1. Subscribe to Native Web Push with VAPID Key (Wakes closed browsers on Android, iOS, Windows, macOS)
    if (reg && 'pushManager' in reg && VAPID_KEY) {
      try {
        pushSub = await reg.pushManager.getSubscription();
        if (!pushSub) {
          pushSub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY)
          });
        }
      } catch (subErr) {
        console.warn('[WebPush] Native pushManager registration note:', subErr);
      }
    }

    // 2. Also register with Firebase Cloud Messaging
    let fcmToken: string | null = null;
    try {
      const supported = await isSupported();
      if (supported && app && VAPID_KEY) {
        const messaging = getMessaging(app);
        fcmToken = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg
        });
      }
    } catch (fcmErr) {
      console.warn('[Firebase FCM] Token registration note:', fcmErr);
    }

    const primaryToken = (pushSub && pushSub.endpoint) ? pushSub.endpoint : (fcmToken || null);

    if (primaryToken && pushSub) {
      const userAgent = navigator.userAgent.substring(0, 150);
      try {
        await supabase
          .from('user_push_tokens')
          .upsert(
            {
              user_id: userId,
              email: email ? email.trim().toLowerCase() : null,
              role: role || 'employee',
              token: primaryToken,
              subscription_data: JSON.stringify(pushSub),
              device_info: userAgent,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'token' }
          );
      } catch (e) {}

      return primaryToken;
    }

    return null;
  } catch (err) {
    console.warn('[Push Service] Registration error:', err);
    return null;
  }
}

/**
 * Dispatch Push Wake-up signals strictly to targeted recipient devices via secure serverless endpoint
 */
export async function sendPushNotificationToTargetUsers(targetUserId: string | null | undefined, title: string, message: string) {
  try {
    // Skip on local Vite standalone dev server to avoid 404 noise
    if (window.location.hostname === 'localhost' && window.location.port === '5173') {
      return;
    }
    await fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, title, message })
    }).catch(() => null);
  } catch (apiErr) {}
}

/**
 * Listen to foreground FCM push messages
 */
export function setupFCMForegroundListener() {
  isSupported().then((supported) => {
    if (!supported || !app) return;
    try {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        const title = payload.notification?.title || payload.data?.title || 'Notification';
        const body = payload.notification?.body || payload.data?.message || payload.data?.body || '';
        if ((window as any).showNativeNotification) {
          (window as any).showNativeNotification(title, body, true);
        }
      });
    } catch (e) {}
  }).catch(() => {});
}
