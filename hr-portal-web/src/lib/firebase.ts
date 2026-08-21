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
const PRIVATE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_PRIVATE_KEY || 'XRhv2Uo1SuMAil7eERnxLt8rg7Tl-E27VTKf2Senc7s';

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

function uint8ArrayToBase64Url(uint8Array: Uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate standard RFC 8292 VAPID Authorization JWT using Web Crypto API
 * This authenticates push requests directly with Google FCM & Apple APNs to wake up locked/sleeping phones!
 */
async function generateVapidAuthHeader(endpoint: string, subject: string = 'mailto:elipsestudiohr@gmail.com') {
  try {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (12 * 60 * 60); // 12 hours

    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = { aud: audience, exp, sub: subject };

    const encodedHeader = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
    const encodedPayload = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    const dBytes = urlBase64ToUint8Array(PRIVATE_VAPID_KEY);
    const pubBytes = urlBase64ToUint8Array(VAPID_KEY);
    const xBytes = pubBytes.slice(1, 33);
    const yBytes = pubBytes.slice(33, 65);

    const jwk = {
      kty: 'EC',
      crv: 'P-256',
      x: uint8ArrayToBase64Url(xBytes),
      y: uint8ArrayToBase64Url(yBytes),
      d: uint8ArrayToBase64Url(dBytes),
      ext: true
    };

    const key = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signature = await window.crypto.subtle.sign(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      key,
      new TextEncoder().encode(unsignedToken)
    );

    const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));
    const jwt = `${unsignedToken}.${encodedSignature}`;

    return `vapid t=${jwt}, k=${VAPID_KEY}`;
  } catch (err) {
    return null;
  }
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

    const primaryToken = fcmToken || (pushSub ? pushSub.endpoint : null);

    if (primaryToken) {
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
              subscription_data: pushSub ? JSON.stringify(pushSub) : null,
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
 * Dispatch Push Wake-up signals strictly to targeted recipient devices with signed VAPID headers
 */
export async function sendPushNotificationToTargetUsers(targetUserId: string | null | undefined, title: string, message: string) {
  // 1. Primary: Trigger Serverless Push Endpoint on Vercel backend (Node.js with 100% VAPID delivery & zero CORS issues)
  try {
    fetch('/api/send-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, title, message })
    }).catch(() => {});
  } catch (apiErr) {}

  // 2. Secondary: Direct WebPush fallback
  try {
    let query = supabase.from('user_push_tokens').select('*');
    const cleanTarget = String(targetUserId || '').trim().toLowerCase();

    if (cleanTarget === 'admin') {
      // Strictly target admin devices only
      query = query.or('role.eq.admin,email.eq.elipsestudiohr@gmail.com');
    } else if (cleanTarget && cleanTarget !== 'all' && cleanTarget !== 'null') {
      // Strictly target this specific user UUID or email
      query = query.or(`user_id.eq.${cleanTarget},email.eq.${cleanTarget}`);
    } else {
      // Global broadcast: sends to all devices
    }

    const { data: tokens, error } = await query;
    if (error || !tokens || tokens.length === 0) return;

    // Send Authenticated VAPID WebPush POST trigger to wake up each device's push service (Google / Apple / Mozilla)
    for (const record of tokens) {
      if (record.subscription_data) {
        try {
          const sub = JSON.parse(record.subscription_data);
          if (sub && sub.endpoint) {
            const authHeader = await generateVapidAuthHeader(sub.endpoint);
            const headers: Record<string, string> = {
              'TTL': '86400',
              'Urgency': 'high'
            };
            if (authHeader) {
              headers['Authorization'] = authHeader;
            }

            fetch(sub.endpoint, {
              method: 'POST',
              headers,
              mode: 'no-cors'
            }).catch(() => {});
          }
        } catch (jsonErr) {}
      }
    }
  } catch (pushErr) {}
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
