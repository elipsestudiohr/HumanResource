import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { registerFCMDeviceToken, setupFCMForegroundListener } from './lib/firebase';

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

      // A. Service Worker Delivery (Required for Mobile Chrome on Android & PWA notifications)
      if ('serviceWorker' in navigator) {
        try {
          const reg: any = (window as any).__swRegistration || await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            reg.showNotification(cleanTitle, {
              body: cleanMsg,
              icon: iconUrl,
              badge: iconUrl,
              tag: notifTag,
              vibrate: [200, 100, 200],
              data: { url: window.location.origin }
            }).catch(() => {});
          }
        } catch (swErr) {}
      }

      // B. Direct Window Notification (For Desktop Chrome, Safari, Firefox, macOS, Windows)
      try {
        const n = new window.Notification(cleanTitle, {
          body: cleanMsg,
          icon: iconUrl,
          tag: notifTag,
          silent: false
        });
        n.onclick = () => { window.focus(); n.close(); };
        // Auto-close after 8 seconds to prevent Windows stacking
        setTimeout(() => { try { n.close(); } catch (_) {} }, 8000);
      } catch (e) {
        // Fallback without icon (Safari quirk)
        try { new window.Notification(cleanTitle, { body: cleanMsg }); } catch (_) {}
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

    // 12-Hour Session Expiry Check Helper
    const check12HourSessionExpiry = (): boolean => {
      const loginTimeStr = localStorage.getItem('elipse_login_time');
      if (!loginTimeStr) return false;

      const loginTime = parseInt(loginTimeStr, 10);
      const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000; // 12 Hours in Milliseconds

      if (Date.now() - loginTime > TWELVE_HOURS_MS) {
        localStorage.removeItem('elipse_login_time');
        supabase.auth.signOut();
        setUser(null);
        setRole(null);
        setAuthLoading(false);
        window.customAlert('Your 12-hour login session has expired. Please sign in again.');
        return true; // Expired!
      }
      return false; // Valid session!
    };

    // Check active session in Supabase on app mount / reload
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const isExpired = check12HourSessionExpiry();
        if (!isExpired) {
          if (!localStorage.getItem('elipse_login_time')) {
            localStorage.setItem('elipse_login_time', Date.now().toString());
          }
          setUser(session.user);
          getUserRole(session.user.id);
        }
      } else {
        setAuthLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        localStorage.setItem('elipse_login_time', Date.now().toString());
      }

      if (session?.user) {
        const isExpired = check12HourSessionExpiry();
        if (!isExpired) {
          setUser(session.user);
          getUserRole(session.user.id);
        }
      } else {
        localStorage.removeItem('elipse_login_time');
        setUser(null);
        setRole(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Continuous 12-Hour Session Expiry Monitor
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const loginTimeStr = localStorage.getItem('elipse_login_time');
      if (loginTimeStr) {
        const loginTime = parseInt(loginTimeStr, 10);
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
        if (Date.now() - loginTime > TWELVE_HOURS_MS) {
          localStorage.removeItem('elipse_login_time');
          supabase.auth.signOut();
          setUser(null);
          setRole(null);
          window.customAlert('Your 12-hour login session has expired. Please sign in again.');
        }
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Toast helper
  const addToast = useCallback((title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const newToast: ToastItem = { id, title, message, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setToasts(prev => {
      const updated = [newToast, ...prev];
      return updated.slice(0, 3); // Max 3 visible
    });
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 400);
    }, 5000);
  }, []);

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

    const isNotificationForUser = (targetUserId: string | undefined | null) => {
      if (!user) return false;

      // Broadcast notifications for everyone
      if (!targetUserId || targetUserId === 'all' || targetUserId === 'null') {
        return true;
      }

      const t = String(targetUserId).trim().toLowerCase();
      const uid = String(user.id || '').trim().toLowerCase();
      const uemail = String(user.email || userProfile?.email || localStorage.getItem('remembered_login_email') || '').trim().toLowerCase();
      const upin = String(userProfile?.pin || user?.pin || '').trim().toLowerCase();
      const profId = String(userProfile?.id || user?.id || '').trim().toLowerCase();
      const udept = String(userProfile?.department || user?.department || '').trim().toLowerCase();
      const udesig = String(userProfile?.designation || user?.designation || '').trim().toLowerCase();

      if (role === 'admin' || user.role === 'admin' || userProfile?.role === 'admin' || uemail === 'elipsestudiohr@gmail.com') {
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

      // Regular employee checks:
      if (t === 'admin') return false;

      // Match strictly to this specific employee's UUID, profile ID, email, or PIN
      if (
        (uid && t === uid) || 
        (profId && t === profId) ||
        (uemail && t === uemail) || 
        (upin && t === upin)
      ) {
        return true;
      }

      // Match department or designation targeting
      if (udept && t === udept) return true;
      if (udesig && t === udesig) return true;

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
            if (isNotificationForUser(r.user_id)) {
              triggerToastAndNotification(r.title || 'Notification', r.message || '', r.id);
            }
          }
        }
      } catch (e) {}
    };

    // Execute initial seed immediately
    pollRecentNotifications();

    // Heartbeat every 5 seconds (safety net fallback)
    const pollInterval = setInterval(pollRecentNotifications, 5000);
    const handleWindowFocus = () => pollRecentNotifications();
    window.addEventListener('focus', handleWindowFocus);

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
            if (isNotificationForUser(payload.user_id)) {
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
            if (isNotificationForUser(row.user_id)) {
              triggerToastAndNotification(row.title || 'Notification', row.message || '', row.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleWindowFocus);
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
          const isMatchedAdmin = matched.role === 'admin' || matched.email?.trim().toLowerCase() === 'elipsestudiohr@gmail.com';
          const matchedRole = isMatchedAdmin ? 'admin' : 'employee';
          setUserProfile(matched);
          setRole(matchedRole);
          setAuthLoading(false);
          return;
        }
      }

      const fallbackRole = (user?.email?.trim().toLowerCase() === 'elipsestudiohr@gmail.com') ? 'admin' : 'employee';
      setRole(fallbackRole);
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

        navigator.serviceWorker.ready.then(sendSync).catch(() => {});

        // Register Firebase Cloud Messaging (FCM) device push token
        registerFCMDeviceToken(user.id, user.email || userProfile?.email).catch(() => {});
      } else if (!user && !authLoading) {
        const clearMsg = { type: 'CLEAR_USER_STATE' };
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage(clearMsg);
        }
      }
    }
  }, [user, role, userProfile, authLoading]);

  // Setup foreground push listener
  useEffect(() => {
    setupFCMForegroundListener();
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
  let content = null;
  if (!user || !role) {
    content = <Login onLoginSuccess={handleLoginSuccess} theme={theme} toggleTheme={toggleTheme} />;
  } else if (role === 'admin') {
    content = <AdminDashboard user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />;
  } else {
    content = <EmployeeDashboard user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />;
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
                onClick={() => {
                  setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, exiting: true } : t));
                  setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                  }, 400);
                }}
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
          <div style={{ fontSize: '1.5rem' }}>🚀</div>
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

