import React, { useState, useEffect } from 'react';
import type { TrustedDeviceRecord } from '../../../utils/biometricAuth';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import styles from '../EmployeeStyles';

type EmployeeDeviceSubTab = 'auth' | 'notifications';

interface EmployeeDeviceTabProps {
  empTrustedDevice: TrustedDeviceRecord | null;
  handleDisableEmpBiometric: () => void;
  handleRegisterEmpBiometric: () => void;
  profile: EmployeeProfile | null;
  user: any;
}

export const EmployeeDeviceTab: React.FC<EmployeeDeviceTabProps> = ({
  empTrustedDevice,
  handleDisableEmpBiometric,
  handleRegisterEmpBiometric,
  profile,
  user
}) => {
  const [activeSubTab, setActiveSubTab] = useState<EmployeeDeviceSubTab>('auth');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      if (perm === 'granted') {
        new Notification('ELIPSE HR Portal', {
          body: 'System notifications are now enabled on this device!',
          icon: '/icons/logo.png'
        });
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }} className="animate-fade-in">
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Device Settings & Security
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Manage biometric login, trusted device authentication, and system push notifications.
          </p>
        </div>
      </div>

      {/* Sub-tabs Selector Pill (Centered) */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '4px 0 8px 0' }}>
        <div style={{
          display: 'inline-flex',
          gap: '6px',
          padding: '6px',
          background: 'var(--bg-surface-hover)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('auth')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.2s ease',
              background: activeSubTab === 'auth' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'auth' ? 'var(--btn-primary-text)' : 'var(--text-secondary)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Device Authentication</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('notifications')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'all 0.2s ease',
              background: activeSubTab === 'notifications' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'notifications' ? 'var(--btn-primary-text)' : 'var(--text-secondary)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span>System Notifications</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Device Authentication */}
      {activeSubTab === 'auth' && (
        <div style={{ maxWidth: '850px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
          <div className="glass-panel" style={{ ...styles.panel, padding: '28px', borderRadius: 'var(--radius-md, 12px)', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Biometric & Passkey Authentication
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Log in instantly with <strong>Fingerprint, Face ID, or Windows Hello / Device PIN</strong> without typing your password.
                </p>
              </div>
            </div>

            {empTrustedDevice ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <img src="/icons/shield-key.svg" alt="shield" className="theme-icon" style={{ width: '24px', height: '24px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.95rem' }}>
                      This Device is Registered & Trusted
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Method: <strong>{empTrustedDevice.auth_type === 'face_id' ? 'Face ID / Camera' : empTrustedDevice.auth_type === 'shield_key' ? 'Device PIN / Security Key' : 'Fingerprint / Touch ID'}</strong> ({empTrustedDevice.device_name || 'Current Device'})
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Linked Account:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{empTrustedDevice.email || user?.email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Employee Name:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{profile?.full_name || 'Employee'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Device Identifier:</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{empTrustedDevice.device_id ? `${empTrustedDevice.device_id.substring(0, 16)}...` : 'Browser Credential'}</span>
                  </div>
                  {empTrustedDevice.registered_at && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Registered On:</span>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(empTrustedDevice.registered_at).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={handleDisableEmpBiometric} 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '12px', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}
                >
                  Revoke Trusted Device Biometrics
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                <div style={{
                  background: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-color)',
                  padding: '16px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  <img src="/icons/shield-key.svg" alt="shield" className="theme-icon" style={{ width: '24px', height: '24px', opacity: 0.7, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      No Biometric Authentication Linked
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Register this device to log in instantly using Face ID, Fingerprint, or Device PIN.
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Registering this device allows you to use your phone or computer’s built-in biometric sensor (Touch ID, Face ID, Fingerprint, or PIN) for fast, secure login without entering your password every time.
                </div>

                <button
                  type="button"
                  onClick={handleRegisterEmpBiometric}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <img src="/icons/fingerprint.svg" alt="biometric" style={{ width: '18px', height: '18px', filter: 'brightness(0) invert(1)' }} />
                  <span>Register This Device with Biometrics</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: System Notifications */}
      {activeSubTab === 'notifications' && (
        <div className="glass-panel" style={{ ...styles.panel, width: '100%', maxWidth: '850px', margin: '0 auto', padding: '28px', borderRadius: 'var(--radius-md, 12px)', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Push & System Notifications</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Enable system push notifications and phone bar alerts to receive real-time updates for approvals, company announcements, and shifts.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div style={{
                background: notificationPermission === 'granted' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-hover)',
                border: `1px solid ${notificationPermission === 'granted' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: notificationPermission === 'granted' ? '#10b981' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                    Browser & Device Notification Status: <span style={{ textTransform: 'capitalize' }}>{notificationPermission}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {notificationPermission === 'granted' 
                      ? 'Notifications are active and will pop up on your screen & phone bar.' 
                      : notificationPermission === 'denied'
                      ? 'Notifications are blocked in your browser settings. Please allow notifications in site settings.'
                      : 'Click the button below to enable real-time notifications.'}
                  </div>
                </div>

                {notificationPermission !== 'granted' && (
                  <button
                    type="button"
                    onClick={handleRequestNotificationPermission}
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    Enable Notifications
                  </button>
                )}
              </div>

              <div style={{ background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  Notification Types Delivered to this Device:
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <li>Company & department broadcast announcements</li>
                  <li>Leave application approvals & rejections</li>
                  <li>Attendance punch correction request updates</li>
                  <li>Loan application status updates</li>
                  <li>Birthday & celebratory greetings</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDeviceTab;
