import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Bind global loading and dialog handlers to window object for access anywhere
    window.showLoading = (msg) => setLoadingMsg(msg);
    window.hideLoading = () => setLoadingMsg(null);
    window.customConfirm = (msg, onYes, onNo) => {
      setConfirmData({ msg, onYes, onNo });
    };
    window.customAlert = (msg, title) => {
      setAlertData({ msg, title });
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

  // Request notification permission on first user interaction (required by Mobile Browsers/PWA)
  useEffect(() => {
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

    const playChime = () => {
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
    };

    const triggerToastAndNotification = (title: string, message: string) => {
      addToast(title, message);
      playChime();

      if (document.hidden) {
        const originalTitle = document.title;
        let text = `🔔 [NEW] ${title}: ${message}       `;
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

      // Native Device Push Notification via Service Worker (Displays on Phone Notification Bar)
      if ('Notification' in window && window.Notification.permission === 'granted') {
        const notifOptions = {
          body: message,
          icon: '/icons/logo.png',
          badge: '/icons/logo.png',
          tag: 'elipse-hr-' + Date.now(),
          vibrate: [200, 100, 200],
          renotify: true
        };

        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, notifOptions as any).catch(() => {
              try {
                new window.Notification(title, { body: message, icon: '/icons/logo.png' });
              } catch (e) {}
            });
          }).catch(() => {
            try {
              new window.Notification(title, { body: message, icon: '/icons/logo.png' });
            } catch (e) {}
          });
        } else {
          try {
            new window.Notification(title, { body: message, icon: '/icons/logo.png' });
          } catch (e) {}
        }
      }
    };

    const channel = supabase
      .channel('app-live-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const row = payload.new;
          if (!row.user_id || row.user_id === user.id || role === 'admin') {
            triggerToastAndNotification(row.title || 'Notification', row.message || '');
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload: any) => {
          const row = payload.new;
          triggerToastAndNotification('📢 New Announcement', row.title ? `${row.title}: ${row.message}` : row.message || '');
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'leave_requests' },
        (payload: any) => {
          const row = payload.new;
          if (role === 'admin') {
            triggerToastAndNotification('📋 New Leave Request', `A new leave request was submitted for ${row.start_date} to ${row.end_date}.`);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'employee_loans' },
        (payload: any) => {
          const row = payload.new;
          if (role === 'admin') {
            triggerToastAndNotification('💰 New Loan Request', `${row.employee_name || 'An employee'} requested a loan of PKR ${row.loan_amount?.toLocaleString() || ''}.`);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'complaints' },
        (payload: any) => {
          const row = payload.new;
          if (role === 'admin') {
            triggerToastAndNotification('💬 Helpdesk Ticket', `New ticket: "${row.title}" has been submitted.`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role, addToast]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getUserRole = async (userId: string) => {
    try {
      // First check if role is present on current user state
      if (user && user.role === 'admin') {
        setRole('admin');
        setAuthLoading(false);
        return;
      }

      const { data: allProfiles } = await supabase.from('profiles').select('*');
      if (allProfiles && allProfiles.length > 0) {
        const cleanTarget = String(userId || user?.email || '').trim().toLowerCase();
        const matched = allProfiles.find(p => 
          (p.id && String(p.id).trim().toLowerCase() === cleanTarget) ||
          (p.email && p.email.trim().toLowerCase() === cleanTarget) ||
          (user?.email && p.email && p.email.trim().toLowerCase() === user.email.trim().toLowerCase())
        );
        if (matched && matched.role === 'admin') {
          setRole('admin');
          setAuthLoading(false);
          return;
        }
      }

      setRole('employee');
    } catch (err) {
      setRole('employee');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: any, userRole: 'admin' | 'employee') => {
    setUser(loggedInUser);
    setRole(userRole);
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      localStorage.removeItem('elipse_login_time');
      await supabase.auth.signOut();
    } catch (err) {
      /* console removed */
    } finally {
      setUser(null);
      setRole(null);
      setAuthLoading(false);
    }
  };

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
    </>
  );
}

