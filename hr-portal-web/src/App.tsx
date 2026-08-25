import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { registerFCMDeviceToken, setupFCMForegroundListener } from './lib/firebase';
import { getDeviceSettings } from './lib/dbHelper';

const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EmployeeDashboard = lazy(() => import('./pages/EmployeeDashboard'));


declare global {
  interface Window {
    showLoading: (msg: string) => void;
    hideLoading: () => void;
    customConfirm: (msg: string, onYes: () => void, onNo?: () => void) => void;
    customAlert: (msg: string, title?: string) => void;
  }
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [portalMode, setPortalMode] = useState<'admin' | 'employee'>('admin');
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  // Global Dialog States
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [confirmData, setConfirmData] = useState<{
    msg: string;
    onYes: () => void;
    onNo?: () => void;
  } | null>(null);
  const [alertData, setAlertData] = useState<{
    msg: string;
    title?: string;
  } | null>(null);

  // Toast Notification System (WhatsApp-style)
  interface ToastItem {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    exiting?: boolean;
  }
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenNotificationIdsRef = useRef<Set<string | number>>(new Set());
  const recentDispatchedNotificationsRef = useRef<Map<string, number>>(new Map());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Service Worker App Update Popup State
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setWaitingWorker(e.detail);
        setIsUpdateAvailable(true);
      }
    };
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  // Expose custom alert and native notification trigger globally for convenience
  useEffect(() => {
    window.showLoading = (msg) => setLoadingMsg(msg);
    window.hideLoading = () => setLoadingMsg(null);
    window.customConfirm = (msg, onYes, onNo) => {
      setConfirmData({ msg, onYes, onNo });
    };
    window.customAlert = (msg, title) => {
      setAlertData({ msg, title });
    };

    // Helper to generate perfectly centered, uncropped 1:1 square notification icons
    const getResponsiveSquareIcon = async (isDark: boolean): Promise<string> => {
      const srcUrl = isDark ? '/icons/logo-white.png' : '/icons/logo.png';
      return new Promise<string>((resolve) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const size = 256;
              const canvas = document.createElement('canvas');
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(srcUrl);
                return;
              }

              // Fit the entire logo into the square container with 15% safe margin
              const padding = size * 0.15;
              const maxW = size - padding * 2;
              const maxH = size - padding * 2;
              const scale = Math.min(maxW / img.width, maxH / img.height);
              const drawW = img.width * scale;
              const drawH = img.height * scale;
              const drawX = (size - drawW) / 2;
              const drawY = (size - drawH) / 2;

              ctx.clearRect(0, 0, size, size);
              ctx.drawImage(img, drawX, drawY, drawW, drawH);
              resolve(canvas.toDataURL('image/png'));
            } catch (e) {
              resolve(srcUrl);
            }
          };
          img.onerror = () => resolve(srcUrl);
          img.src = srcUrl;
        } catch (e) {
          resolve(srcUrl);
        }
      });
    };

    (window as any).showNativeNotification = async (title: string, message: string, shouldAddToast: boolean = true) => {
      const cleanTitle = String(title || 'Notification').replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/gu, '').trim() || 'Notification';
      const cleanMsg = String(message || '').trim();

      // Check if notifications are globally muted by Admin
      const isMuted = localStorage.getItem('is_notifications_muted') === 'true' || (window as any).__isNotificationsGloballyMuted;
      if (isMuted) {
        // Still dispatch table refresh so UI counters stay in sync, but silence audio/toast/banners!
        try {
          window.dispatchEvent(new CustomEvent('app-refresh-notifications', { detail: { title: cleanTitle, message: cleanMsg } }));
        } catch (e) {}
        return;
      }

      // 1. Play Audio Chime
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {}

      // 2. Add in-app toast if requested
      if (shouldAddToast) {
        addToast(cleanTitle, cleanMsg);
      }

      // 3. Dispatch global sync event so Dashboard notification panels & badge counters update in real-time
      try {
        window.dispatchEvent(new CustomEvent('app-refresh-notifications', { detail: { title: cleanTitle, message: cleanMsg } }));
      } catch (e) {}

      // 4. Native Browser & Mobile Desktop Notification (Mobile Chrome, Safari, Opera, Firefox, Edge, Brave)
      if (!('Notification' in window)) return;

      let perm = window.Notification.permission;
      if (perm === 'default') {
        try { perm = await window.Notification.requestPermission(); } catch (e) {}
      }
      if (perm !== 'granted') {
        if (perm === 'denied' && shouldAddToast) {
          console.warn('[Elipse HR] Browser notifications are blocked. Enable in site settings.');
        }
        return;
      }

      // Unique tag per notification so fresh banner pops up on all platforms
      const notifTag = 'elipse-hr-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      
      // Dynamic dark/light adaptive responsive 1:1 square logo selection (prevents cropping as 'EL')
      const isDarkMode = theme === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches;
      let iconUrl = window.location.origin + (isDarkMode ? '/icons/logo-white.png' : '/icons/logo.png');
      try {
        iconUrl = await getResponsiveSquareIcon(isDarkMode);
      } catch (e) {}

      const badgeUrl = window.location.origin + '/icons/logo.png';

      // Native OS Notification Delivery (Single delivery path prevents duplicate popups)
      let delivered = false;

      // A. Service Worker Delivery (Required for Mobile Chrome on Android & PWA notifications)
      if ('serviceWorker' in navigator) {
        try {
          const reg: any = (window as any).__swRegistration || await navigator.serviceWorker.ready || await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            await reg.showNotification(cleanTitle, {
              body: cleanMsg,
              icon: iconUrl,
              badge: badgeUrl,
              tag: notifTag,
              vibrate: [300, 100, 300, 100, 300],
              requireInteraction: false,
              silent: false,
              data: { url: window.location.origin }
            });
            delivered = true;
            // Auto dismiss popup banner after 10 seconds so it stays in Windows notification panel
            setTimeout(async () => {
              try {
                const notifs = await reg.getNotifications({ tag: notifTag });
                notifs.forEach((n: any) => n.close());
              } catch (_) {}
            }, 10000);
          }
        } catch (swErr) {}
      }

      // B. Direct Window Notification (Fallback only if Service Worker not registered)
      if (!delivered) {
        try {
          const n = new window.Notification(cleanTitle, {
            body: cleanMsg,
            icon: iconUrl,
            badge: badgeUrl,
            tag: notifTag,
            silent: false
          });
          n.onclick = () => { window.focus(); n.close(); };
          // Auto close desktop popup banner after 10 seconds
          setTimeout(() => { try { n.close(); } catch (_) {} }, 10000);
        } catch (e) {
          try {
            const fallbackN = new window.Notification(cleanTitle, { body: cleanMsg });
            setTimeout(() => { try { fallbackN.close(); } catch (_) {} }, 10000);
          } catch (_) {}
        }
      }
    };

    (window as any).enableDeviceNotifications = async (triggerTestAlert: boolean = true) => {
      if ('Notification' in window) {
        try {
          let perm = window.Notification.permission;
          if (perm !== 'granted') {
            perm = await window.Notification.requestPermission();
          }

          if (perm === 'granted') {
            if (triggerTestAlert && (window as any).showNativeNotification) {
              await (window as any).showNativeNotification(
                'Browser & Desktop Notifications Active',
                'You will now receive instant push alerts directly on your screen.'
              );
            }
            return true;
          } else if (perm === 'denied') {
            (window as any).customAlert(
              'Notifications are currently BLOCKED in browser permissions for this site.\n\nTo allow notifications:\n1. Look at the address bar next to the site URL\n2. Click the Lock or Site Settings icon\n3. Change "Notifications" to "Allow"\n4. Reload the page!',
              'Notifications Blocked in Browser'
            );
            return false;
          } else {
            (window as any).customAlert(
              'Please click "Allow" on the browser popup prompt to enable notifications.',
              'Notification Permission'
            );
            return false;
          }
        } catch (e) {
          (window as any).customAlert('Failed to request notification permissions: ' + (e as any)?.message);
        }
      } else {
        (window as any).customAlert('Notifications are not supported by this browser.');
      }
      return false;
    };

    // Check active session in Supabase on app mount / reload
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        getUserRole(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        getUserRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Toast helper with hover pause and 2-second auto-dismiss
  const toastTimersRef = useRef<{ [key: string]: any }>({});

  const dismissToast = useCallback((id: string) => {
    if (toastTimersRef.current[id]) {
      clearTimeout(toastTimersRef.current[id]);
      delete toastTimersRef.current[id];
    }
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 350);
  }, []);

  const startToastTimer = useCallback((id: string, duration: number = 2000) => {
    if (toastTimersRef.current[id]) {
      clearTimeout(toastTimersRef.current[id]);
    }
    toastTimersRef.current[id] = setTimeout(() => {
      dismissToast(id);
    }, duration);
  }, [dismissToast]);

  const pauseToastTimer = useCallback((id: string) => {
    if (toastTimersRef.current[id]) {
      clearTimeout(toastTimersRef.current[id]);
      delete toastTimersRef.current[id];
    }
  }, []);

  const addToast = useCallback((title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const newToast: ToastItem = { id, title, message, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, 3); // Max 3 visible
    });
    // Auto-dismiss after 10 seconds when unhovered
    startToastTimer(id, 10000);
  }, [startToastTimer]);

  // Request notification permission immediately on mount and on first user interaction (required by Mobile Browsers/PWA)
  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
      try {
        window.Notification.requestPermission().catch(() => {});
      } catch (e) {}
    }

    const handleFirstTouch = () => {
      if ('Notification' in window && window.Notification.permission === 'default') {
        window.Notification.requestPermission().catch(() => {});
      }
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };

    window.addEventListener('click', handleFirstTouch, { once: true });
    window.addEventListener('touchstart', handleFirstTouch, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
  }, []);

  // Supabase Realtime subscription for live notifications & chat-style alerts
  useEffect(() => {
    if (!user) return;

    const triggerToastAndNotification = (title: string, message: string, notifId?: string | number) => {
      const cleanTitle = String(title || 'Notification').trim();
      const cleanMsg = String(message || '').trim();
      const dedupKey = `${cleanTitle}:::${cleanMsg}`;
      const now = Date.now();
      const lastSent = recentDispatchedNotificationsRef.current.get(dedupKey) || 0;

      // Deduplicate: If identical message was sent in last 4 seconds, ignore duplicate!
      if (now - lastSent < 4000) {
        if (notifId) seenNotificationIdsRef.current.add(notifId);
        return;
      }
      recentDispatchedNotificationsRef.current.set(dedupKey, now);

      if (notifId) {
        seenNotificationIdsRef.current.add(notifId);
      }

      // Memory cleanup for dedup map
      if (recentDispatchedNotificationsRef.current.size > 100) {
        for (const [k, ts] of recentDispatchedNotificationsRef.current.entries()) {
          if (now - ts > 30000) recentDispatchedNotificationsRef.current.delete(k);
        }
      }

      // Direct in-app WhatsApp banner
      addToast(cleanTitle, cleanMsg);

      // Flash tab title in background
      if (document.hidden) {
        const originalTitle = document.title;
        let text = `[NEW] ${cleanTitle}: ${cleanMsg}       `;
        const titleInterval = setInterval(() => {
          text = text.substring(1) + text.substring(0, 1);
          document.title = text;
        }, 250);

        const handleVisibilityChange = () => {
          if (!document.hidden) {
            clearInterval(titleInterval);
            document.title = originalTitle;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
      }

      // Invoke the global OS notification tray dispatcher
      if ((window as any).showNativeNotification) {
        (window as any).showNativeNotification(cleanTitle, cleanMsg, false);
      }
    };

    const isNotificationForUser = (targetUserId: string | undefined | null, title?: string, message?: string) => {
      if (!user) return false;

      const t = String(targetUserId || '').trim().toLowerCase();
      const uid = String(user.id || '').trim().toLowerCase();
      const uemail = String(user.email || userProfile?.email || localStorage.getItem('remembered_login_email') || '').trim().toLowerCase();
      const upin = String(userProfile?.pin || user?.pin || '').trim().toLowerCase();
      const profId = String(userProfile?.id || user?.id || '').trim().toLowerCase();
      const uname = String(userProfile?.full_name || user?.full_name || '').trim().toLowerCase();
      const udept = String(userProfile?.department || user?.department || '').trim().toLowerCase();
      const udesig = String(userProfile?.designation || user?.designation || '').trim().toLowerCase();
      const isAdminUser = role === 'admin' || user.role === 'admin' || userProfile?.role === 'admin' || (Array.isArray(userProfile?.allowed_tabs) && userProfile.allowed_tabs.some((t: string) => t.startsWith('admin:')));

      // 1. Admin sees ALL notifications from everywhere across the whole portal!
      if (isAdminUser) {
        return true;
      }

      // 2. Notifications targeted specifically to 'admin' are NEVER shown to regular employees
      if (t === 'admin' || t === 'administrator') {
        return false;
      }

      // 3. Employee submissions / requests to admin must NEVER trigger toasts or notifications for regular employees
      const titleLower = String(title || '').toLowerCase();
      const msgLower = String(message || '').toLowerCase();
      const isEmployeeToAdminSubmission = 
        titleLower.includes('new leave request') ||
        titleLower.includes('attendance correction') ||
        titleLower.includes('helpdesk:') ||
        titleLower.includes('new loan request') ||
        titleLower.includes('password changed') ||
        msgLower.includes('submitted a leave request') ||
        msgLower.includes('requested correction') ||
        msgLower.includes('submitted a complaint') ||
        msgLower.includes('submitted "');

      if (isEmployeeToAdminSubmission) {
        return false;
      }

      // 4. Direct match by UUID, PIN, Email, or Name for this logged in employee
      if (
        (uid && t === uid) || 
        (profId && t === profId) ||
        (uemail && t === uemail) || 
        (upin && t === upin) ||
        (uname && t === uname)
      ) {
        return true;
      }

      // 5. Match department or designation targeting
      if (udept && t === udept) return true;
      if (udesig && t === udesig) return true;

      // 6. If targeted to another specific user/PIN/ID, ignore
      if (t && t !== 'all' && t !== 'null' && t !== 'undefined') {
        return false;
      }

      // 7. Global broadcast for all employees (e.g. Announcements, Holidays, General Notices)
      if (!targetUserId || t === 'all' || t === 'null') {
        if (upin && msgLower.includes('pin:') && !msgLower.includes(`pin: ${upin}`)) {
          return false;
        }
        return true;
      }

      return false;
    };

    // 1. Initial Notification Seeding & Heartbeat Poller (Guarantees zero missed notifications)
    const pollRecentNotifications = async () => {
      try {
        const { data: recent, error } = await supabase
          .from('notifications')
          .select('*')
          .order('id', { ascending: false })
          .limit(25);

        if (error || !recent) return;

        if (isInitialLoadRef.current) {
          // On login, mark all existing items as seen so we don't spam old notifications
          recent.forEach(r => seenNotificationIdsRef.current.add(r.id));
          const maxId = recent.length > 0 ? Math.max(...recent.map(r => Number(r.id) || 0)) : 0;
          if (maxId > 0 && navigator.serviceWorker?.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_LAST_SEEN_ID', id: maxId });
          }
          isInitialLoadRef.current = false;
          return;
        }

        // On subsequent polls, trigger alert for any newly inserted notification
        for (const r of recent) {
          if (!seenNotificationIdsRef.current.has(r.id)) {
            seenNotificationIdsRef.current.add(r.id);
            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_LAST_SEEN_ID', id: r.id });
            }
            if (isNotificationForUser(r.user_id, r.title, r.message)) {
              triggerToastAndNotification(r.title || 'Notification', r.message || '', r.id);
            }
          }
        }
      } catch (e) {}
    };

    // Execute initial seed immediately
    pollRecentNotifications();

    // Fast Heartbeat every 2.5 seconds (Guarantees zero missed notifications across all devices)
    const pollInterval = setInterval(pollRecentNotifications, 2500);
    const handleWindowFocus = () => pollRecentNotifications();
    window.addEventListener('focus', handleWindowFocus);

    // Local custom event listener for instant 0ms local actions
    const handleLocalNotif = (e: any) => {
      const notif = e.detail;
      if (notif && notif.id && !seenNotificationIdsRef.current.has(notif.id)) {
        seenNotificationIdsRef.current.add(notif.id);
        if (isNotificationForUser(notif.user_id, notif.title, notif.message)) {
          triggerToastAndNotification(notif.title || 'Notification', notif.message || '', notif.id);
        }
      }
    };
    window.addEventListener('app-local-notification', handleLocalNotif);

    // 2. Instant Realtime Push via Supabase WebSocket Broadcast & Notifications Table
    const channel = supabase
      .channel('app-global-live-notifications')
      .on(
        'broadcast',
        { event: 'new_notification' },
        ({ payload }: any) => {
          if (payload?.id && !seenNotificationIdsRef.current.has(payload.id)) {
            seenNotificationIdsRef.current.add(payload.id);
            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_LAST_SEEN_ID', id: payload.id });
            }
            if (isNotificationForUser(payload.user_id, payload.title, payload.message)) {
              triggerToastAndNotification(payload.title || 'Notification', payload.message || '', payload.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const row = payload.new;
          if (row?.id && !seenNotificationIdsRef.current.has(row.id)) {
            seenNotificationIdsRef.current.add(row.id);
            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'UPDATE_LAST_SEEN_ID', id: row.id });
            }
            if (isNotificationForUser(row.user_id, row.title, row.message)) {
              triggerToastAndNotification(row.title || 'Notification', row.message || '', row.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('app-local-notification', handleLocalNotif);
      supabase.removeChannel(channel);
    };
  }, [user, role, userProfile, addToast]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getUserRole = async (userId: string) => {
    try {
      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles && allProfiles.length > 0) {
        const cleanTarget = String(userId || user?.email || '').trim().toLowerCase();
        const matched = allProfiles.find(p => 
          (p.id && String(p.id).trim().toLowerCase() === cleanTarget) ||
          (p.email && p.email.trim().toLowerCase() === cleanTarget) ||
          (p.pin && String(p.pin).trim().toLowerCase() === cleanTarget) ||
          (user?.email && p.email && p.email.trim().toLowerCase() === user.email.trim().toLowerCase())
        );

        if (matched) {
          const isMatchedAdmin = matched.role === 'admin' || 
            (Array.isArray(matched.allowed_tabs) && matched.allowed_tabs.some((t: string) => t.startsWith('admin:')));
          const matchedRole = isMatchedAdmin ? 'admin' : 'employee';
          setUserProfile(matched);
          setRole(matchedRole);
          setPortalMode(matchedRole);
          setAuthLoading(false);
          return;
        }
      }

      const fallbackRole = (user?.role === 'admin' || userProfile?.role === 'admin') ? 'admin' : 'employee';
      setRole(fallbackRole);
      setPortalMode(fallbackRole);
    } catch (err) {
      setRole('employee');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: any, userRole: 'admin' | 'employee') => {
    setUser(loggedInUser);
    setRole(userRole);
    if (loggedInUser) {
      setUserProfile(loggedInUser);
    }
    getUserRole(loggedInUser?.id || loggedInUser?.email);
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      if (user) {
        const lastEmail = user.email || (typeof user.id === 'string' && user.id.includes('@') ? user.id : '');
        if (lastEmail) {
          localStorage.setItem('remembered_login_email', lastEmail.trim().toLowerCase());
        }
      }
      localStorage.removeItem('elipse_login_time');
      
      // Clear background Service Worker notifications on logout
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_STATE' });
      }

      await supabase.auth.signOut();
    } catch (err) {
      /* console removed */
    } finally {
      setUser(null);
      setRole(null);
      setAuthLoading(false);
    }
  };

  // Sync user context to Service Worker for background notifications when app/tab is closed
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (user && role) {
        const payload = {
          type: 'SYNC_USER_STATE',
          user: {
            id: user.id,
            profileId: userProfile?.id || user?.id,
            email: user.email || userProfile?.email || localStorage.getItem('remembered_login_email'),
            role: role || userProfile?.role,
            pin: userProfile?.pin || user?.pin,
            department: userProfile?.department || user?.department,
            designation: userProfile?.designation || user?.designation
          },
          config: {
            supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
            supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
          }
        };

        const sendSync = (reg?: ServiceWorkerRegistration) => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage(payload);
          } else if (reg?.active) {
            reg.active.postMessage(payload);
          }
        };

        sendSync();
        navigator.serviceWorker.ready.then(sendSync).catch(() => {});

        // Register Web Push & Firebase (FCM) device push token with exact role
        registerFCMDeviceToken(user.id, user.email || userProfile?.email, role || userProfile?.role).catch(() => {});
      } else if (!user && !authLoading) {
        const clearMsg = { type: 'CLEAR_USER_STATE' };
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage(clearMsg);
        }
      }
    }
  }, [user, role, userProfile, authLoading]);

  // Setup foreground push listener & global mute sync
  useEffect(() => {
    setupFCMForegroundListener();

    getDeviceSettings().then(settings => {
      if (settings?.is_notifications_muted !== undefined) {
        localStorage.setItem('is_notifications_muted', settings.is_notifications_muted ? 'true' : 'false');
        (window as any).__isNotificationsGloballyMuted = settings.is_notifications_muted;
      }
    }).catch(() => {});

    const handleMuteChange = (e: any) => {
      const isMuted = !!e?.detail?.isMuted;
      localStorage.setItem('is_notifications_muted', isMuted ? 'true' : 'false');
      (window as any).__isNotificationsGloballyMuted = isMuted;
    };
    window.addEventListener('app-mute-notifications-changed', handleMuteChange);
    return () => window.removeEventListener('app-mute-notifications-changed', handleMuteChange);
  }, []);

  if (authLoading) {
    return (
      <div className="cool-loading-screen">
        <div className="cool-spinner-container">
          <div className="cool-spinner-ring-outer"></div>
          <div className="cool-spinner-ring-inner"></div>
          <img src="/icons/logo.png" alt="logo" className="cool-spinner-logo" />
        </div>
        <div className="cool-loading-text">
          <span>Elipse HR</span>
          <span className="cool-loading-subtext">Verifying secure session...</span>
        </div>
      </div>
    );
  }

  // Route Screens
  const activeUserData = user ? { ...user, ...userProfile } : null;

  const hasAdminAccess = role === 'admin' || user?.role === 'admin' || userProfile?.role === 'admin' || (Array.isArray(userProfile?.allowed_tabs) && userProfile.allowed_tabs.some((t: string) => t.startsWith('admin:')));

  const hasEmployeeAccess = true;

  let content = null;
  if (!user || !role) {
    content = <Login onLoginSuccess={handleLoginSuccess} theme={theme} toggleTheme={toggleTheme} />;
  } else if (hasAdminAccess && portalMode === 'admin') {
    content = (
      <AdminDashboard 
        user={activeUserData} 
        onLogout={handleLogout} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        onSwitchPortal={(p) => setPortalMode(p)}
        hasEmployeePortalAccess={hasEmployeeAccess}
      />
    );
  } else {
    content = (
      <EmployeeDashboard 
        user={activeUserData} 
        onLogout={handleLogout} 
        theme={theme} 
        toggleTheme={toggleTheme} 
        onSwitchPortal={(p) => setPortalMode(p)}
        hasAdminPortalAccess={hasAdminAccess}
      />
    );
  }

  const PageFallback = (
    <div className="cool-loading-screen">
      <div className="cool-spinner-container">
        <div className="cool-spinner-ring-outer"></div>
        <div className="cool-spinner-ring-inner"></div>
        <img src="/icons/logo.png" alt="logo" className="cool-spinner-logo" />
      </div>
      <div className="cool-loading-text">
        <span>Elipse HR</span>
        <span className="cool-loading-subtext">Loading workspace...</span>
      </div>
    </div>
  );

  return (
    <>
      <Suspense fallback={PageFallback}>
        {content}
      </Suspense>

      {/* Global Loading Spinner Dialog Overlay */}
      {loadingMsg && (
        <div className="custom-overlay" style={{ zIndex: 999999 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '24px', width: '280px' }}>
            <div className="cool-spinner-container" style={{ width: '70px', height: '70px' }}>
              <div className="cool-spinner-ring-outer" style={{ width: '60px', height: '60px' }}></div>
              <div className="cool-spinner-ring-inner" style={{ width: '44px', height: '44px' }}></div>
              <img src="/icons/logo.png" alt="logo" className="cool-spinner-logo" style={{ width: '24px', height: '24px' }} />
            </div>
            <p className="custom-dialog-msg" style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{loadingMsg}</p>
          </div>
        </div>
      )}

      {/* Global Confirmation Dialog Overlay (Yes/No) */}
      {confirmData && (
        <div className="custom-overlay" style={{ zIndex: 30000 }}>
          <div className="custom-dialog-card" style={{ maxWidth: '380px' }}>
            <h3 className="custom-dialog-title">Confirm Action</h3>
            <p className="custom-dialog-msg">{confirmData.msg}</p>
            <div className="custom-dialog-buttons">
              <button 
                className="btn-danger" 
                style={{ padding: '10px 24px', minWidth: '95px' }}
                onClick={() => {
                  confirmData.onYes();
                  setConfirmData(null);
                }}
              >
                Yes
              </button>
              <button 
                className="btn-secondary" 
                style={{ 
                  padding: '10px 24px', 
                  minWidth: '95px', 
                  background: 'var(--bg-surface-hover)', 
                  border: '1px solid var(--border-color)', 
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
                onClick={() => {
                  if (confirmData.onNo) confirmData.onNo();
                  setConfirmData(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Alert Dialog Overlay (OK) */}
      {alertData && (
        <div className="custom-overlay" style={{ zIndex: 30000 }}>
          <div className="custom-dialog-card" style={{ maxWidth: '360px' }}>
            <h3 className="custom-dialog-title">{alertData.title || 'Notification'}</h3>
            <p className="custom-dialog-msg">{alertData.msg}</p>
            <div className="custom-dialog-buttons">
              <button 
                className="btn-primary" 
                style={{ 
                  padding: '10px 32px', 
                  minWidth: '110px', 
                  background: 'var(--primary)', 
                  color: 'var(--btn-primary-text)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                onClick={() => setAlertData(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp-Style Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`toast-item ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
              onMouseEnter={() => pauseToastTimer(toast.id)}
              onMouseLeave={() => startToastTimer(toast.id, 10000)}
            >
              <div className="toast-icon">
                <img src="/icons/bell.png" alt="notification" className="theme-icon" style={{ width: '18px', height: '18px' }} />
              </div>
              <div className="toast-body">
                <div className="toast-title">{toast.title}</div>
                <div className="toast-message">{toast.message}</div>
              </div>
              <div className="toast-time">{toast.timestamp}</div>
              <button
                className="toast-close"
                onClick={() => dismissToast(toast.id)}
              >
                <img src="/icons/x.png" alt="close" className="theme-icon" style={{ width: '12px', height: '12px' }} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating App Update Available Popup Banner */}
      {isUpdateAvailable && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 12px 32px rgba(16, 185, 129, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          maxWidth: '90vw',
          width: '440px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'overlayFadeIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/icons/sync.png" alt="update" className="theme-icon" style={{ width: '24px', height: '24px', filter: 'brightness(0) invert(1)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', letterSpacing: '0.01em' }}>New Version Available!</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>A new update for Elipse HR Portal is ready. Click Update Now to get the latest features.</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                if (waitingWorker) {
                  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
                } else {
                  window.location.reload();
                }
              }}
              style={{
                background: '#ffffff',
                color: '#047857',
                border: 'none',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Update Now
            </button>
            <button
              onClick={() => setIsUpdateAvailable(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '600',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

