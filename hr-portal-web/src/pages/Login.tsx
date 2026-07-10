import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

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
        // Fetch user profile to check role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          // If no profile exists yet, default to employee
          onLoginSuccess(data.user, 'employee');
        } else {
          onLoginSuccess(data.user, (profile?.role as 'admin' | 'employee') || 'employee');
        }
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

          <button type="submit" disabled={loading} className="btn btn-primary" style={styles.submitBtn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
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
