import React from 'react';
import type { Notification } from '../../../lib/dbHelper';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import ConfettiCanvas from '../../../components/ConfettiCanvas';
import styles, { getModalOverlayStyle } from '../AdminStyles';

interface MiscAdminModalsProps {
  showBirthdayEffect: boolean;
  setShowBirthdayEffect: (show: boolean) => void;

  whatsAppModalEmployee: EmployeeProfile | null;
  setWhatsAppModalEmployee: (emp: EmployeeProfile | null) => void;
  whatsAppModalPhone: string;
  sendAdminContactNotification: (emp: EmployeeProfile, type: any) => Promise<void>;

  isAdminChangePasswordModalOpen: boolean;
  setIsAdminChangePasswordModalOpen: (open: boolean) => void;
  handleAdminChangePassword: (e: React.FormEvent) => void;
  adminNewPassword: string;
  setAdminNewPassword: (p: string) => void;
  adminConfirmPassword: string;
  setAdminConfirmPassword: (p: string) => void;
  adminPasswordChangeLoading: boolean;

  showNotificationsDropdown: boolean;
  setShowNotificationsDropdown: (show: boolean) => void;
  notificationsList: Notification[];
  handleMarkAllNotificationsRead: () => void;
  handleMarkNotificationRead: (id: number, notif: Notification) => void;
}

export const MiscAdminModals: React.FC<MiscAdminModalsProps> = ({
  showBirthdayEffect,
  setShowBirthdayEffect,
  whatsAppModalEmployee,
  setWhatsAppModalEmployee,
  whatsAppModalPhone,
  sendAdminContactNotification,
  isAdminChangePasswordModalOpen,
  setIsAdminChangePasswordModalOpen,
  handleAdminChangePassword,
  adminNewPassword,
  setAdminNewPassword,
  adminConfirmPassword,
  setAdminConfirmPassword,
  adminPasswordChangeLoading,
  showNotificationsDropdown,
  setShowNotificationsDropdown,
  notificationsList,
  handleMarkAllNotificationsRead,
  handleMarkNotificationRead
}) => {
  return (
    <>
      {/* Birthday Celebration Confetti Modal */}
      {showBirthdayEffect && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setShowBirthdayEffect(false);
            }
          }} 
          style={getModalOverlayStyle(99998)}
        >
          <ConfettiCanvas />
          <div 
            className="custom-dialog-card glass-panel" 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
            style={{ padding: '32px', width: '380px', textAlign: 'center', alignItems: 'center' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12"></polyline>
                <rect x="2" y="7" width="20" height="5"></rect>
                <line x1="12" y1="22" x2="12" y2="7"></line>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Happy Birthday!</h3>
            <p style={{ margin: '12px 0 24px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Happy Birthday! Wishing you a wonderful day filled with joy, health, and success.
            </p>
            <button 
              onClick={() => setShowBirthdayEffect(false)} 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '10px' }}
            >
              Thank You
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Launch Method Modal */}
      {whatsAppModalEmployee && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setWhatsAppModalEmployee(null);
            }
          }} 
          style={getModalOverlayStyle(11500)}
        >
          <div 
            className="custom-dialog-card glass-panel" 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
            style={{ padding: '24px', width: '440px', maxWidth: '92vw', textAlign: 'left', alignItems: 'stretch' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <img src="/icons/whatsapp.png" alt="WhatsApp" className="theme-icon" style={{ width: '22px', height: '22px' }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                  Open WhatsApp Chat
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {whatsAppModalEmployee.full_name} ({whatsAppModalPhone})
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  window.location.href = `whatsapp://send?phone=${whatsAppModalPhone}`;
                  if (whatsAppModalEmployee) {
                    await sendAdminContactNotification(whatsAppModalEmployee, 'WhatsApp');
                  }
                  setWhatsAppModalEmployee(null);
                }}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'flex-start',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <img src="/icons/app.png" alt="App" className="theme-icon" style={{ width: '20px', height: '20px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>WhatsApp App / Beta / Installed App</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Opens native WhatsApp desktop or mobile app (triggers OS app picker)</div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  window.open(`https://web.whatsapp.com/send?phone=${whatsAppModalPhone}`, '_blank');
                  if (whatsAppModalEmployee) {
                    await sendAdminContactNotification(whatsAppModalEmployee, 'WhatsApp');
                  }
                  setWhatsAppModalEmployee(null);
                }}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'flex-start',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <img src="/icons/web.png" alt="Web" className="theme-icon" style={{ width: '20px', height: '20px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>WhatsApp Web (Browser)</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Opens direct chat on web.whatsapp.com in your browser</div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  window.open(`https://wa.me/${whatsAppModalPhone}`, '_blank');
                  if (whatsAppModalEmployee) {
                    await sendAdminContactNotification(whatsAppModalEmployee, 'WhatsApp');
                  }
                  setWhatsAppModalEmployee(null);
                }}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'flex-start',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <img src="/icons/link.png" alt="Link" className="theme-icon" style={{ width: '20px', height: '20px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Universal Link (wa.me)</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Standard wa.me redirect link</div>
                </div>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  const email = whatsAppModalEmployee.email || (whatsAppModalEmployee as any).contact_email;
                  if (!email) {
                    alert(`No email address found for ${whatsAppModalEmployee.full_name}. Please add an email address in their profile.`);
                    return;
                  }
                  window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`, '_blank');
                  if (whatsAppModalEmployee) {
                    await sendAdminContactNotification(whatsAppModalEmployee, 'Email');
                  }
                  setWhatsAppModalEmployee(null);
                }}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  justifyContent: 'flex-start',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                <img src="/icons/mail.png" alt="Gmail" className="theme-icon" style={{ width: '20px', height: '20px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Gmail Compose (Email)</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {whatsAppModalEmployee.email ? `Opens Gmail composer for ${whatsAppModalEmployee.email}` : 'No email address set for employee'}
                  </div>
                </div>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setWhatsAppModalEmployee(null)}
                style={{ padding: '6px 16px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Change Password Modal */}
      {isAdminChangePasswordModalOpen && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setIsAdminChangePasswordModalOpen(false);
            }
          }} 
          style={getModalOverlayStyle(11000)}
        >
          <div 
            className="custom-dialog-card glass-panel" 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
            style={{ padding: '24px', width: '420px', maxWidth: '90vw', textAlign: 'left', alignItems: 'stretch' }}
          >
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Change Admin Password
            </h3>
            <form onSubmit={handleAdminChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div style={styles.formGroup}>
                <label>New Password *</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={adminNewPassword}
                  onChange={e => setAdminNewPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Confirm Password *</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={adminConfirmPassword}
                  onChange={e => setAdminConfirmPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsAdminChangePasswordModalOpen(false);
                    setAdminNewPassword('');
                    setAdminConfirmPassword('');
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminPasswordChangeLoading}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sliding Notifications Drawer (Root-level to avoid z-index stacking issues) */}
      {showNotificationsDropdown && (
        <>
          {/* Backdrop Overlay */}
          <div 
            onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
            onClick={e => {
              if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
                setShowNotificationsDropdown(false);
              }
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 99999,
              animation: 'overlayFadeIn 0.2s ease-out'
            }}
          />
          
          {/* Sliding Drawer */}
          <div 
            className="glass-panel animate-slide-in-right" 
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '380px',
            maxWidth: '90vw',
            height: '100vh',
            overflowY: 'auto',
            zIndex: 100000,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: '0',
            borderLeft: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/icons/bell.png" alt="bell" className="theme-icon" style={{ width: '18px', height: '18px' }} />
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700' }}>Notifications</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {notificationsList.filter(n => !n.is_read).length > 0 && (
                  <button 
                    onClick={handleMarkAllNotificationsRead}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Mark all read
                  </button>
                )}
                <button 
                  onClick={() => setShowNotificationsDropdown(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                >
                  <img src="/icons/x.png" alt="close" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            </div>

            {'Notification' in window && (window as any).Notification.permission !== 'granted' && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  🔔 Enable Phone Bar Notifications
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => (window as any).enableDeviceNotifications?.()}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Enable Now
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
              {notificationsList.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: '12px', color: 'var(--text-muted)' }}>
                  <img src="/icons/check-circle.png" alt="empty" className="theme-icon" style={{ width: '36px', height: '36px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>
                    All caught up! No notifications.
                  </p>
                </div>
              ) : (
                notificationsList.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleMarkNotificationRead(n.id!, n)}
                    style={{
                      background: n.is_read ? 'rgba(255, 255, 255, 0.01)' : 'var(--bg-surface-hover)',
                      border: `1px solid ${n.is_read ? 'var(--border-color)' : 'var(--border-color-glow)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      transition: 'all var(--transition-fast)'
                    }}
                    className="dropdown-item-hover"
                  >
                    {!n.is_read && (
                      <span style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444'
                      }} />
                    )}
                    <div style={{ fontWeight: n.is_read ? '500' : '700', fontSize: '0.85rem', color: 'var(--text-primary)', paddingRight: '12px' }}>{n.title}</div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.message}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                      {new Date(n.created_at || '').toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default MiscAdminModals;
