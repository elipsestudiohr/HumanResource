import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  isDeviceTrusted, 
  getTrustedDevice, 
  authenticateBiometrics, 
  isBiometricAvailable,
} from '../utils/authPasscode';
import type { TrustedDeviceInfo } from '../utils/authPasscode';
import PWAInstallButton from '../components/PWAInstallButton';

interface LoginProps {
  onLoginSuccess: (user: any, role: 'admin' | 'employee') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Login({ onLoginSuccess, theme, toggleTheme }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isTrusted, setIsTrusted] = useState(false);
  const [trustedInfo, setTrustedInfo] = useState<TrustedDeviceInfo | null>(null);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);

    // Banking-app style automatic device recognition & auto-biometric prompt on startup
    const checkAndAutoLoginBiometrics = async () => {
      const trusted = isDeviceTrusted();
      setIsTrusted(trusted);

      if (trusted) {
        const deviceData = getTrustedDevice();
        setTrustedInfo(deviceData);
        if (deviceData?.email) {
          setEmail(deviceData.email);
        }

        // Trigger automatic biometric scan prompt on launch
        try {
          const authResult = await authenticateBiometrics();
          if (authResult) {
            // Biometric scan succeeded! Verify active session or complete login
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData?.session?.user) {
              onLoginSuccess(sessionData.session.user, authResult.role);
            }
          }
        } catch (e) {
          console.log('Auto biometric prompt cancelled or failed, falling back to password:', e);
        }
      }
    };

    checkAndAutoLoginBiometrics();
  }, []);

  const handleManualBiometricUnlock = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const authResult = await authenticateBiometrics();
      if (!authResult) {
        throw new Error('Biometric authentication failed or was cancelled.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        onLoginSuccess(sessionData.session.user, authResult.role);
      } else {
        setErrorMsg(`Biometric verified for ${authResult.email}! Please enter password to restore session.`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Biometric authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
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
        // Fetch user profile to check role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        const userRole = (profile?.role as 'admin' | 'employee') || 'employee';
        onLoginSuccess(data.user, userRole);
      }
    } catch (err: any) {
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
      {/* Top Action Controls */}
      <div style={styles.topActions}>
        <PWAInstallButton />
        <button 
          onClick={toggleTheme} 
          className="btn btn-secondary"
          title="Toggle Theme"
          style={{ padding: '6px 14px', fontSize: '0.825rem', borderRadius: '8px' }}
        >
          <img 
            src={theme === 'dark' ? '/icons/sun.png' : '/icons/moon.png'} 
            alt="Theme" 
            className="theme-icon" 
            style={{ width: '16px', height: '16px', marginRight: '6px', verticalAlign: 'middle' }} 
          />
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      <div className="glass-panel-glow animate-fade-in glow-loop" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <img 
              src="/icons/logo.png" 
              alt="logo" 
              className="logo-icon" 
              style={{ width: '120px', height: 'auto', objectFit: 'contain' }} 
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

        {/* Clean Standard Email & Password Login Form */}
        <form onSubmit={handlePasswordLogin} style={styles.form}>
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

          <button type="submit" disabled={loading} className="btn btn-primary" style={styles.submitBtn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Subtle Biometric Unlock Button (Displays if device is trusted or biometrics supported) */}
        {(isTrusted || bioAvailable) && (
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleManualBiometricUnlock}
              className="btn btn-secondary animate-pulse-subtle"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: 'var(--text-primary)'
              }}
            >
              <img 
                src="/icons/lock.png" 
                alt="biometric" 
                className="theme-icon" 
                style={{ width: '18px', height: '18px' }} 
              />
              <span>{isTrusted ? `Unlock with Windows Hello / Biometrics (${trustedInfo?.email?.split('@')[0]})` : 'Unlock with Windows Hello / Biometrics'}</span>
            </button>
          </div>
        )}
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
  topActions: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    zIndex: 100
  },
  card: {
    width: '100%',
    maxWidth: '440px',
    padding: '36px 32px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
  },
  logoContainer: {
    padding: '10px 20px',
    borderRadius: '16px',
    background: 'var(--badge-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--badge-border)',
    marginBottom: '4px',
  },
  title: {
    fontSize: '1.7rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
    background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--text-secondary) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    textAlign: 'left',
    fontSize: '0.85rem',
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
    gap: '4px',
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
    marginTop: '6px',
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
