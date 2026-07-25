import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if already running in standalone (PWA installed) mode
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (isStandalone) {
    return null; // Already installed and running in standalone app window
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="btn btn-secondary pwa-install-btn animate-pulse-subtle"
        title="Download / Install Elipse HR App"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          fontSize: '0.825rem',
          fontWeight: 600,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          color: 'var(--text-primary)',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        <img
          src="/icons/logo.png"
          alt="App Icon"
          className="logo-icon"
          style={{ width: '16px', height: '16px', borderRadius: '4px' }}
        />
        <span>Download App</span>
      </button>

      {showModal && (
        <div className="custom-overlay" style={{ zIndex: 99999 }}>
          <div className="custom-dialog-card glass-panel" style={{ maxWidth: '420px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/icons/logo.png" alt="Logo" className="logo-icon" style={{ width: '32px', height: '32px' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Install Elipse HR App</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Install the official Elipse HR app on your device for fast access, native notifications, and offline capabilities!
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem' }}>
              <div style={{ padding: '10px 12px', background: 'var(--bg-surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <strong>💻 Windows / Chrome / Edge:</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                  Click the <strong>Install Icon (⊕)</strong> in your browser's address bar or menu, then click <strong>Install</strong>.
                </p>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--bg-surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <strong>📱 Android (Chrome):</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                  Tap the browser menu <strong>(⋮)</strong> and select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.
                </p>
              </div>

              <div style={{ padding: '10px 12px', background: 'var(--bg-surface-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <strong>🍎 iPhone / iPad (Safari):</strong>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>
                  Tap the <strong>Share button (⎋)</strong> at the bottom, scroll down, and select <strong>"Add to Home Screen"</strong>.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '18px', textAlign: 'right' }}>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-primary"
                style={{ padding: '8px 20px', borderRadius: '6px' }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
