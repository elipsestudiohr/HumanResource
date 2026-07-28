import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getTrustedDeviceConfig, fetchTrustedDeviceFromDb, verifyDeviceMatchForEmail, promptBiometricAuth } from '../utils/biometricAuth';
import type { TrustedDeviceRecord } from '../utils/biometricAuth';

interface LoginProps {
  onLoginSuccess: (user: any, role: 'admin' | 'employee') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Login({ onLoginSuccess, theme, toggleTheme }: LoginProps) {
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_login_email') || '');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(() => !!localStorage.getItem('remembered_login_email'));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [trustedDevice, setTrustedDevice] = useState<TrustedDeviceRecord | null>(() => getTrustedDeviceConfig());

  useEffect(() => {
    // Verify database device match on this browser/device
    let isMounted = true;
    fetchTrustedDeviceFromDb().then(matchedDevice => {
      if (isMounted) {
        if (matchedDevice && !email) {
          setEmail(matchedDevice.email);
        }
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Real-time email + device ID match sync against Supabase database trusted_devices
  useEffect(() => {
    let isMounted = true;
    if (!email || !email.trim()) {
      setTrustedDevice(null);
      return;
    }
    verifyDeviceMatchForEmail(email).then(matched => {
      if (isMounted) {
        setTrustedDevice(matched);
      }
    });
    return () => { isMounted = false; };
  }, [email]);

  const handleBiometricClick = async () => {
    if (!trustedDevice) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const authResult = await promptBiometricAuth(email);
      if (authResult && authResult.email) {
        setEmail(authResult.email);
        const cleanEmail = authResult.email.trim().toLowerCase();

        if (authResult.password) {
          // Hardware scan passed! 1. Authenticate Supabase session first
          const { data, error } = await supabase.auth.signInWithPassword({
            email: authResult.email,
            password: authResult.password,
          });

          if (!error && data && data.user) {
            // 2. Fetch true role from profiles table using authenticated session
            let verifiedRole: 'admin' | 'employee' = (authResult.role as 'admin' | 'employee') || 'employee';
            try {
              const { data: prof } = await supabase
                .from('profiles')
                .select('role')
                .or(`id.eq.${data.user.id},email.eq.${cleanEmail}`)
                .maybeSingle();

              if (prof?.role) {
                verifiedRole = prof.role as 'admin' | 'employee';
              }
            } catch (roleErr) { /* ignore */ }

            if (verifiedRole === 'employee' && (authResult.role === 'admin' || cleanEmail.includes('admin'))) {
              verifiedRole = 'admin';
            }

            onLoginSuccess({ ...data.user, role: verifiedRole }, verifiedRole);
            return;
          }
        }

        // Fallback to cached profile if password changed or offline
        if (authResult.user_profile) {
          const cachedRole = (authResult.user_profile.role || authResult.role || (cleanEmail.includes('admin') ? 'admin' : 'employee')) as 'admin' | 'employee';
          onLoginSuccess({ ...authResult.user_profile, role: cachedRole }, cachedRole);
          return;
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Biometric authentication cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        localStorage.setItem('elipse_login_time', Date.now().toString());

        // Save or clear remembered email
        if (rememberEmail && email) {
          localStorage.setItem('remembered_login_email', email);
        } else {
          localStorage.removeItem('remembered_login_email');
        }

        // Fetch full user profile row from Supabase
        const { data: fullProfile } = await supabase
          .from('profiles')
          .select('*')
          .or(`id.eq.${data.user.id},email.eq.${data.user.email}`)
          .maybeSingle();

        const userObjToPass = fullProfile ? { ...data.user, ...fullProfile } : data.user;
        const roleToSet = (fullProfile?.role as 'admin' | 'employee') || 'employee';

        onLoginSuccess(userObjToPass, roleToSet);
      }
    } catch (err: any) {
      /* console removed */
      setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="cool-loading-screen">
        <div className="cool-spinner-container">
          <div className="cool-spinner-ring-outer"></div>
          <div className="cool-spinner-ring-inner"></div>
          <img src="/icons/logo.png" alt="logo" className="cool-spinner-logo" />
        </div>
        <div className="cool-loading-text">
          <span>Elipse HR</span>
          <span className="cool-loading-subtext">Verifying credentials and starting session...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Theme Toggle in top corner */}
      <button 
        onClick={toggleTheme} 
        style={styles.themeToggle} 
        className="btn btn-secondary"
        title="Toggle Theme"
      >
        <img 
          src={theme === 'dark' ? '/icons/sun.png' : '/icons/moon.png'} 
          alt="Theme" 
          className="theme-icon" 
          style={{ width: '16px', height: '16px', marginRight: '8px', verticalAlign: 'middle' }} 
        />
        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
      </button>

      <div className="glass-panel-glow animate-fade-in glow-loop" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img 
              src="/icons/logo.png" 
              alt="logo" 
              className="logo-icon" 
              style={{ width: '130px', height: 'auto', objectFit: 'contain' }} 
            />
          </div>
          <h1 style={styles.title}>ELIPSE HR</h1>
          <p style={styles.subtitle}>Secure Attendance & HR Management Portal</p>
        </div>

        {errorMsg && (
          <div style={styles.errorAlert}>
            <img 
              src="/icons/alert.png" 
              alt="error" 
              className="theme-icon" 
              style={{ width: '20px', height: '20px' }} 
            />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <div style={styles.inputWrapper}>
              <img 
                src="/icons/mail.png" 
                alt="mail" 
                className="theme-icon" 
                style={styles.inputIcon} 
              />
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <div style={styles.inputWrapper}>
              <img 
                src="/icons/lock.png" 
                alt="lock" 
                className="theme-icon" 
                style={styles.inputIcon} 
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ ...styles.input, paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.revealBtn}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <img 
                  src={showPassword ? '/icons/eye-off.png' : '/icons/eye.png'} 
                  alt="reveal" 
                  className="theme-icon" 
                  style={{ width: '18px', height: '18px' }} 
                />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-4px', marginBottom: '8px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-secondary)', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              Remember Email
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={styles.submitBtn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          {trustedDevice && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleBiometricClick}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color-glow)',
                  cursor: 'pointer'
                }}
              >
                <img
                  src={trustedDevice.icon_path || (trustedDevice.auth_type === 'face_id' ? '/icons/face-id.svg' : trustedDevice.auth_type === 'shield_key' ? '/icons/shield-key.svg' : '/icons/fingerprint.svg')}
                  alt={trustedDevice.auth_type}
                  className="theme-icon"
                  style={{ width: '22px', height: '22px' }}
                />
                <span>
                  {trustedDevice.auth_type === 'face_id' ? 'Face ID Login' : 
                   trustedDevice.auth_type === 'shield_key' ? 'Device Security / PIN Login' : 
                   'Biometric / Touch ID Login'}
                </span>
              </button>
              <small style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                Trusted Device: {trustedDevice.device_name} ({trustedDevice.email})
              </small>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    position: 'relative',
  },
  themeToggle: {
    position: 'absolute',
    top: '24px',
    right: '24px',
    padding: '8px 16px',
    fontSize: '0.875rem',
    borderRadius: '8px',
    zIndex: 100
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  logoContainer: {
    padding: '12px 24px',
    borderRadius: '16px',
    background: 'var(--badge-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--badge-border)',
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
    background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--text-secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    textAlign: 'left',
    fontSize: '0.875rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    textAlign: 'left',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '14px',
    width: '18px',
    height: '18px',
    pointerEvents: 'none',
  },
  input: {
    paddingLeft: '44px',
  },
  submitBtn: {
    marginTop: '8px',
    width: '100%',
    padding: '12px',
  },
  revealBtn: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'opacity 0.2s',
  }
};
