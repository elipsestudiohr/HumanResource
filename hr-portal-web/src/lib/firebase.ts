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

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

// Initialize Firebase safely
export const app = !getApps().length && firebaseConfig.apiKey 
  ? initializeApp(firebaseConfig) 
  : (getApps().length ? getApp() : null);

/**
 * Register FCM device push token for logged-in user in Supabase
 */
export async function registerFCMDeviceToken(userId: string, email?: string): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported || !app || !VAPID_KEY) {
      return null;
    }

    if (!('Notification' in window)) {
      return null;
    }

    let permission = window.Notification.permission;
    if (permission === 'default') {
      permission = await window.Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return null;
    }

    const messaging = getMessaging(app);
    const swRegistration = (window as any).__swRegistration || await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });

    if (token) {
      // Save or update token in Supabase user_push_tokens table
      const userAgent = navigator.userAgent.substring(0, 150);
      try {
        await supabase
          .from('user_push_tokens')
          .upsert(
            {
              user_id: userId,
              email: email ? email.trim().toLowerCase() : null,
              token: token,
              device_info: userAgent,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'token' }
          );
      } catch (e) {}

      return token;
    }

    return null;
  } catch (err) {
    console.warn('[Firebase FCM] Token registration skipped:', err);
    return null;
  }
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
