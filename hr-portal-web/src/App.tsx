import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';


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

    // Check active session in Supabase
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

  // Request notification permission on user session initialization
  useEffect(() => {
    if (user && 'Notification' in window) {
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission();
      }
    }
  }, [user]);

  // Supabase Realtime subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('toast-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const row = payload.new;
          // Show toast if it's for this user or a broadcast (null user_id)
          if (!row.user_id || row.user_id === user.id) {
            addToast(row.title || 'Notification', row.message || '');

            // Also show native browser push notification
            if ('Notification' in window && window.Notification.permission === 'granted') {
              try {
                new window.Notification(row.title || 'Notification', {
                  body: row.message || '',
                  icon: '/icons/logo.png'
                });
              } catch (e) {
                /* console removed */
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, addToast]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setRole((data?.role as 'admin' | 'employee') || 'employee');
    } catch (err) {
      /* console removed */
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

  return (
    <>
      {content}

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

