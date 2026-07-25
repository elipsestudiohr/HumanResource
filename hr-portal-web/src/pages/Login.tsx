import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  verifyQuickPin, 
  saveQuickPin, 
  authenticateBiometrics, 
  registerBiometrics, 
  isBiometricAvailable, 
  hasRegisteredBiometrics, 
  getSavedPinInfo 
} from '../utils/authPasscode';
import PWAInstallButton from '../components/PWAInstallButton';

interface LoginProps {
  onLoginSuccess: (user: any, role: 'admin' | 'employee') => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Login({ onLoginSuccess, theme, toggleTheme }: LoginProps) {
  const [loginMode, setLoginMode] = useState<'password' | 'passcode' | 'biometric'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [savePasscodeOption, setSavePasscodeOption] = useState(false);
  const [newPasscode, setNewPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [bioSupported, setBioSupported] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [savedPinData, setSavedPinData] = useState<any>(null);

  useEffect(() => {
    isBiometricAvailable().then(setBioSupported);
    setBioRegistered(hasRegisteredBiometrics());
    const pinInfo = getSavedPinInfo();
    setSavedPinData(pinInfo);
    if (pinInfo?.email) {
      setEmail(pinInfo.email);
    }
  }, []);

  const completeUserSession = async (user: any) => {
    // Save Quick Passcode if option selected
    if (savePasscodeOption && newPasscode.length >= 4 && user.email) {
      await saveQuickPin(user.email, newPasscode);
    }

    // Fetch user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      onLoginSuccess(user, 'employee');
    } else {
      onLoginSuccess(user, (profile?.role as 'admin' | 'employee') || 'employee');
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
        await completeUserSession(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const verifiedEmail = await verifyQuickPin(passcode);
      if (!verifiedEmail) {
        throw new Error('Invalid Passcode/PIN. Please try again or sign in with password.');
      }

      // Check current session or sign in
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user && sessionData.session.user.email === verifiedEmail) {
        await completeUserSession(sessionData.session.user);
      } else {
        setErrorMsg('Passcode verified! Please sign in with password once to initiate your session.');
        setLoginMode('password');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const authenticatedEmail = await authenticateBiometrics();
      if (!authenticatedEmail) {
        throw new Error('Biometric authentication cancelled or failed.');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await completeUserSession(sessionData.session.user);
      } else {
        setErrorMsg('Biometric authentication succeeded! Please enter password to complete login.');
        setLoginMode('password');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Biometric authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBiometricsClick = async () => {
    if (!email) {
      setErrorMsg('Please enter your email address first.');
      return;
    }
    setLoading(true);
    try {
      const success = await registerBiometrics(email);
      if (success) {
        setBioRegistered(true);
        setErrorMsg(null);
        window.customAlert?.('Windows Hello / Biometric unlock registered successfully!', 'Biometrics Registered');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to register biometrics.');
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
      {/* Top Action Controls: Theme Toggle & PWA Download App */}
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

        {/* Authentication Mode Tabs */}
        <div style={styles.tabContainer}>
          <button
            type="button"
            className={`tabBtn ${loginMode === 'password' ? 'active' : ''}`}
            onClick={() => setLoginMode('password')}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              background: loginMode === 'password' ? 'var(--primary)' : 'transparent',
              color: loginMode === 'password' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Password
          </button>
          
          <button
            type="button"
            className={`tabBtn ${loginMode === 'passcode' ? 'active' : ''}`}
            onClick={() => setLoginMode('passcode')}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              background: loginMode === 'passcode' ? 'var(--primary)' : 'transparent',
              color: loginMode === 'passcode' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Passcode (PIN)
          </button>

          {bioSupported && (
            <button
              type="button"
              className={`tabBtn ${loginMode === 'biometric' ? 'active' : ''}`}
              onClick={() => setLoginMode('biometric')}
              style={{
                flex: 1,
                padding: '8px',
                fontSize: '0.825rem',
                fontWeight: 600,
                background: loginMode === 'biometric' ? 'var(--primary)' : 'transparent',
                color: loginMode === 'biometric' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Biometrics
            </button>
          )}
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

        {/* 1. PASSWORD LOGIN FORM */}
        {loginMode === 'password' && (
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

            {/* Quick PIN Setup Option */}
            <div style={{ marginTop: '4px', fontSize: '0.8rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input 
                  type="checkbox"
                  checked={savePasscodeOption}
                  onChange={(e) => setSavePasscodeOption(e.target.checked)}
                />
                Set Quick Passcode (PIN) for this device
              </label>

              {savePasscodeOption && (
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Enter 4 to 6 digit PIN"
                    value={newPasscode}
                    onChange={(e) => setNewPasscode(e.target.value.replace(/\D/g, ''))}
                    style={{ ...styles.input, paddingLeft: '14px', width: '100%', fontSize: '0.9rem' }}
                  />
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={styles.submitBtn}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* 2. PASSCODE (PIN) LOGIN FORM */}
        {loginMode === 'passcode' && (
          <form onSubmit={handlePasscodeLogin} style={styles.form}>
            {savedPinData ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                Enter Quick Passcode for <strong>{savedPinData.email}</strong>:
              </p>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                No Quick Passcode saved on this device. Sign in with password once and select "Set Quick Passcode".
              </p>
            )}

            <div style={styles.inputGroup}>
              <label htmlFor="passcode">4-6 Digit Passcode</label>
              <div style={styles.inputWrapper}>
                <img 
                  src="/icons/lock.png" 
                  alt="lock" 
                  className="theme-icon" 
                  style={styles.inputIcon} 
                />
                <input
                  id="passcode"
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                  required
                  style={{ ...styles.input, letterSpacing: '4px', fontSize: '1.2rem', textAlign: 'center' }}
                />
              </div>
            </div>

            <button type="submit" disabled={loading || !passcode} className="btn btn-primary" style={styles.submitBtn}>
              {loading ? 'Verifying PIN...' : 'Unlock with Passcode'}
            </button>
          </form>
        )}

        {/* 3. BIOMETRIC / WINDOWS HELLO LOGIN FORM */}
        {loginMode === 'biometric' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
              border: '2px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '8px 0'
            }}>
              <img 
                src="/icons/lock.png" 
                alt="Biometrics" 
                className="theme-icon animate-pulse-subtle" 
                style={{ width: '40px', height: '40px' }} 
              />
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Use <strong>Windows Hello</strong>, <strong>Fingerprint</strong>, or <strong>Face ID</strong> to sign in instantly.
            </p>

            <button
              onClick={handleBiometricLogin}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              Scan Fingerprint / Face ID
            </button>

            {!bioRegistered && (
              <button
                type="button"
                onClick={handleRegisterBiometricsClick}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}
              >
                Register Device Biometrics
              </button>
            )}
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
    padding: '32px',
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
  tabContainer: {
    display: 'flex',
    gap: '4px',
    padding: '4px',
    background: 'var(--bg-surface-hover)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)'
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
    gap: '14px',
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
