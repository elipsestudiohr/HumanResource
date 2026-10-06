import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  type TrustedDeviceRecord, 
  type LoginDeviceRecord, 
  getOrCreateDeviceId, 
  detectDeviceName, 
  renameDevice,
  getEmployeeDevices,
  isDeviceOnline,
  toggleDeviceBlock,
  logoutRemoteDevice,
  deleteDeviceRecord
} from '../../../utils/biometricAuth';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import { matchPin } from '../../../utils/attendanceProcessor';
import {
  type AuditChangeRecord,
  getChangeHistory,
  revertSavedChange,
  retryPendingChange,
  discardPendingChange,
  syncAllPendingMutations
} from '../../../lib/syncCacheManager';
import { supabase } from '../../../lib/supabase';
import styles from '../EmployeeStyles';

type EmployeeDeviceSubTab = 'auth' | 'notifications' | 'audit';

interface EmployeeDeviceTabProps {
  empTrustedDevice: TrustedDeviceRecord | null;
  handleDisableEmpBiometric: () => void;
  handleRegisterEmpBiometric: () => void;
  profile: EmployeeProfile | null;
  user: any;
  initialSubTab?: EmployeeDeviceSubTab;
}

export const EmployeeDeviceTab: React.FC<EmployeeDeviceTabProps> = ({
  empTrustedDevice,
  handleDisableEmpBiometric,
  handleRegisterEmpBiometric,
  profile,
  user,
  initialSubTab
}) => {
  const [activeSubTab, setActiveSubTab] = useState<EmployeeDeviceSubTab>(initialSubTab || 'auth');
  const [auditHistory, setAuditHistory] = useState<AuditChangeRecord[]>([]);
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('ALL');
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('ALL');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [isSyncingAudit, setIsSyncingAudit] = useState<boolean>(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [deviceRecord, setDeviceRecord] = useState<LoginDeviceRecord | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [newDeviceName, setNewDeviceName] = useState<string>('');

  // Dedicated Employee Devices List & Actions
  const [empDevicesList, setEmpDevicesList] = useState<LoginDeviceRecord[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(false);
  const [activeActionDeviceId, setActiveActionDeviceId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveActionDeviceId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const empDeviceDropdownItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    fontSize: '0.82rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
    lineHeight: 1.3
  };

  const tableThStyle: React.CSSProperties = {
    padding: '12px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    borderBottom: '1px solid var(--border-color)',
    textAlign: 'left'
  };

  const loadEmpDevices = async () => {
    const cleanEmail = (profile?.email || user?.email || '').trim().toLowerCase();
    if (!cleanEmail) return;
    setIsLoadingDevices(true);
    try {
      const list = await getEmployeeDevices(cleanEmail);
      setEmpDevicesList(list);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadEmpDevices();
  }, [profile, user, empTrustedDevice]);

  const loadDeviceRecord = async () => {
    const cleanEmail = (profile?.email || user?.email || '').trim().toLowerCase();
    const deviceId = getOrCreateDeviceId();
    if (!cleanEmail) return;
    try {
      const { data } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('device_id', deviceId)
        .eq('user_email', cleanEmail)
        .maybeSingle();

      if (data) {
        setDeviceRecord(data as LoginDeviceRecord);
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadDeviceRecord();
  }, [profile, user, empTrustedDevice]);

  useEffect(() => {
    setAuditHistory(getChangeHistory());
    const handleAuditUpdate = () => {
      setAuditHistory(getChangeHistory());
    };
    window.addEventListener('hr_portal_audit_updated', handleAuditUpdate);
    window.addEventListener('hr_portal_sync_complete', handleAuditUpdate);
    return () => {
      window.removeEventListener('hr_portal_audit_updated', handleAuditUpdate);
      window.removeEventListener('hr_portal_sync_complete', handleAuditUpdate);
    };
  }, []);

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  const empAuditRecords = auditHistory.filter(item => {
    const pId = profile?.id;
    const pPin = profile?.pin;
    const pEmail = profile?.email || user?.email;
    const isThisEmp = Boolean(
      (pId && item.userId === pId) ||
      (pPin && (item.userPin === pPin || matchPin(item.userPin, pPin))) ||
      (pId && String(item.targetId) === pId) ||
      (pEmail && item.userName && item.userName.toLowerCase().includes(pEmail.toLowerCase()))
    );
    return isThisEmp;
  });

  const filteredEmpRecords = empAuditRecords.filter(item => {
    if (auditStatusFilter !== 'ALL') {
      if (auditStatusFilter === 'saved' && item.status !== 'saved') return false;
      if (auditStatusFilter === 'failed' && item.status !== 'failed') return false;
      if (auditStatusFilter === 'pending' && item.status !== 'pending') return false;
      if (auditStatusFilter === 'delete' && item.action !== 'delete') return false;
      if (auditStatusFilter === 'create' && item.action !== 'create') return false;
      if (auditStatusFilter === 'update' && item.action !== 'update') return false;
    }
    if (auditEntityFilter !== 'ALL' && item.entity !== auditEntityFilter) {
      return false;
    }
    if (auditSearchQuery.trim()) {
      const q = auditSearchQuery.toLowerCase();
      const matchTarget = (item.targetName || '').toLowerCase().includes(q);
      const matchEntity = (item.entity || '').toLowerCase().includes(q);
      const matchErr = (item.errorMessage || '').toLowerCase().includes(q);
      if (!matchTarget && !matchEntity && !matchErr) return false;
    }
    return true;
  });

  const handleOpenRename = () => {
    const currentName = deviceRecord?.device_name || empTrustedDevice?.device_name || detectDeviceName();
    setNewDeviceName(currentName);
    setIsRenameModalOpen(true);
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    const cleanEmail = (profile?.email || user?.email || '').trim().toLowerCase();
    const deviceId = getOrCreateDeviceId();
    if ((window as any).showLoading) (window as any).showLoading('Updating device name...');
    try {
      let idToUpdate = deviceRecord?.id;
      if (!idToUpdate) {
        const { data } = await supabase
          .from('trusted_devices')
          .select('id')
          .eq('device_id', deviceId)
          .eq('user_email', cleanEmail)
          .maybeSingle();
        idToUpdate = data?.id;
      }

      if (idToUpdate) {
        const ok = await renameDevice(idToUpdate, newDeviceName.trim());
        if (ok) {
          if (deviceRecord) {
            setDeviceRecord({ ...deviceRecord, device_name: newDeviceName.trim() });
          }
          if (empTrustedDevice) {
            empTrustedDevice.device_name = newDeviceName.trim();
          }
          await loadEmpDevices();
          setIsRenameModalOpen(false);
          if ((window as any).customAlert) (window as any).customAlert('Device renamed successfully.');
        } else {
          if ((window as any).customAlert) (window as any).customAlert('Failed to update device name.');
        }
      } else {
        if ((window as any).customAlert) (window as any).customAlert('Device record not found in system.');
      }
    } finally {
      if ((window as any).hideLoading) (window as any).hideLoading();
    }
  };

  const handleToggleBlockDevice = async (device: LoginDeviceRecord) => {
    const actionText = device.is_active ? 'block' : 'unblock';
    const confirmed = await new Promise<boolean>((resolve) => {
      if ((window as any).customConfirm) {
        (window as any).customConfirm(
          `Are you sure you want to ${actionText} this device (${device.device_name || 'Device'})? ${device.is_active ? 'You will not be able to log in from this hardware until unblocked.' : 'Portal access will be restored on this hardware.'}`,
          () => resolve(true),
          () => resolve(false)
        );
      } else {
        resolve(window.confirm(`Are you sure you want to ${actionText} this device?`));
      }
    });
    if (!confirmed) return;
    if ((window as any).showLoading) (window as any).showLoading(`${device.is_active ? 'Blocking' : 'Unblocking'} device...`);
    try {
      const ok = await toggleDeviceBlock(device.id, device.is_active);
      if (ok) {
        await loadEmpDevices();
        if ((window as any).customAlert) (window as any).customAlert(`Device successfully ${device.is_active ? 'blocked' : 'unblocked'}.`);
      } else {
        if ((window as any).customAlert) (window as any).customAlert('Failed to update device status.');
      }
    } finally {
      if ((window as any).hideLoading) (window as any).hideLoading();
    }
  };

  const handleLogoutOrDeleteDevice = async (device: LoginDeviceRecord, action: 'logout' | 'delete') => {
    const isCurrentDevice = device.device_id === getOrCreateDeviceId();
    const confirmed = await new Promise<boolean>((resolve) => {
      if ((window as any).customConfirm) {
        (window as any).customConfirm(
          isCurrentDevice
            ? `You are currently using this device. Logging it out will immediately sign you out of the HR Portal. Continue?`
            : `Are you sure you want to ${action} ${device.device_name || 'this device'}? The remote session will be terminated immediately.`,
          () => resolve(true),
          () => resolve(false)
        );
      } else {
        resolve(window.confirm(`Are you sure you want to ${action} this device?`));
      }
    });
    if (!confirmed) return;

    if ((window as any).showLoading) (window as any).showLoading(action === 'logout' ? 'Logging out device...' : 'Deleting device...');
    try {
      const ok = action === 'logout' ? await logoutRemoteDevice(device.id) : await deleteDeviceRecord(device.id);
      if (ok) {
        if (isCurrentDevice) {
          handleDisableEmpBiometric();
          if ((window as any).customAlert) {
            (window as any).customAlert('This device has been signed out. Redirecting to login...');
          }
          window.location.reload();
          return;
        }
        await loadEmpDevices();
        if ((window as any).customAlert) {
          (window as any).customAlert(action === 'logout' ? 'Remote device signed out successfully.' : 'Device record removed.');
        }
      } else {
        if ((window as any).customAlert) (window as any).customAlert(`Failed to ${action} device.`);
      }
    } finally {
      if ((window as any).hideLoading) (window as any).hideLoading();
    }
  };

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

          <button
            type="button"
            onClick={() => setActiveSubTab('audit')}
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
              background: activeSubTab === 'audit' ? 'var(--primary)' : 'transparent',
              color: activeSubTab === 'audit' ? 'var(--btn-primary-text)' : 'var(--text-secondary)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Last Changes & Audit</span>
            {empAuditRecords.some(r => r.status === 'failed' || r.status === 'pending') && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                borderRadius: '10px',
                fontSize: '0.7rem',
                padding: '1px 6px',
                fontWeight: 700
              }}>
                {empAuditRecords.filter(r => r.status === 'failed' || r.status === 'pending').length}
              </span>
            )}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Device Name:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{deviceRecord?.device_name || empTrustedDevice.device_name || detectDeviceName()}</strong>
                      <button 
                        type="button" 
                        onClick={handleOpenRename} 
                        className="btn btn-secondary" 
                        style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                      >
                        Rename
                      </button>
                    </div>
                  </div>
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

                {/* Detected Workstation / Device Details */}
                <div style={{ background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Current Device Name:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{deviceRecord?.device_name || detectDeviceName()}</strong>
                      <button 
                        type="button" 
                        onClick={handleOpenRename} 
                        className="btn btn-secondary" 
                        style={{ padding: '2px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                      >
                        Rename
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Device Identifier:</span>
                    <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>{getOrCreateDeviceId().substring(0, 16)}...</span>
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

          {/* Dedicated Active & Logged-In Devices Panel (Only for this employee) */}
          <div className="glass-panel" style={{ ...styles.panel, padding: '24px', borderRadius: 'var(--radius-md, 12px)', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Your Active & Logged-In Devices
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Manage computers and smartphones logged into your account ({profile?.email || user?.email}). You can remotely log out or block any unauthorized device.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={loadEmpDevices}
                disabled={isLoadingDevices}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Refresh list"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <span>{isLoadingDevices ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>

            <div style={{ ...styles.tableContainer, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', maxHeight: '520px', overflowX: 'auto', overflowY: 'auto', paddingBottom: '80px' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <th style={tableThStyle}>Device Name</th>
                    <th style={{ ...tableThStyle, textAlign: 'center' }}>Online Status</th>
                    <th style={tableThStyle}>Auth Type</th>
                    <th style={tableThStyle}>Hardware Identifier</th>
                    <th style={{ ...tableThStyle, textAlign: 'center' }}>Status</th>
                    <th style={tableThStyle}>Last Active</th>
                    <th style={{ ...tableThStyle, textAlign: 'center', width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {empDevicesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                        No trusted devices registered yet for your account. Register your current device above to enable instant login.
                      </td>
                    </tr>
                  ) : (
                    empDevicesList.map((dev) => {
                      const currentDevId = getOrCreateDeviceId();
                      const isCurrentDevice = dev.device_id === currentDevId;
                      const isOnline = isDeviceOnline(dev, currentDevId);
                      const isBlocked = dev.is_active === false;

                      const formatAuthType = (type: string) => {
                        if (type === 'face_id') return 'Face ID / Camera';
                        if (type === 'shield_key') return 'Device PIN / Hello';
                        if (type === 'fingerprint') return 'Fingerprint / Touch ID';
                        return 'Web Portal';
                      };

                      const formatDate = (isoStr: string) => {
                        if (!isoStr) return '-';
                        try {
                          const d = new Date(isoStr);
                          return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        } catch (e) {
                          return isoStr;
                        }
                      };

                      return (
                        <tr 
                          key={dev.id} 
                          onClick={() => setActiveActionDeviceId(dev.id ?? null)}
                          style={{ ...styles.tableRow, cursor: 'pointer', background: isBlocked ? 'rgba(239, 68, 68, 0.04)' : undefined }}
                        >
                          {/* Device Name */}
                          <td style={styles.tableCell}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ fontWeight: 600, color: isBlocked ? '#ef4444' : 'var(--text-primary)', fontSize: '0.88rem' }}>
                                {dev.device_name || 'My Device'}
                              </div>
                            </div>
                          </td>

                          {/* Online Status */}
                          <td style={{ ...styles.tableCell, textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: isOnline ? '#10b981' : '#9ca3af',
                                  boxShadow: isOnline ? '0 0 8px #10b981' : 'none',
                                  display: 'inline-block'
                                }}
                              />
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isOnline ? '#10b981' : 'var(--text-muted)' }}>
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                              {isCurrentDevice && (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '10px',
                                  background: 'rgba(59, 130, 246, 0.15)',
                                  color: '#3b82f6',
                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                  marginLeft: '2px'
                                }}>
                                  This Device
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Auth Type */}
                          <td style={styles.tableCell}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {formatAuthType(dev.auth_type)}
                            </span>
                          </td>

                          {/* Hardware ID */}
                          <td style={styles.tableCell}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }} title={dev.device_id}>
                              {dev.device_id ? `${dev.device_id.substring(0, 16)}...` : 'Unknown'}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                            {isBlocked ? (
                              <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                Blocked
                              </span>
                            ) : (
                              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                                Active
                              </span>
                            )}
                          </td>

                          {/* Last Active */}
                          <td style={styles.tableCell}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {formatDate(dev.updated_at || dev.created_at)}
                            </span>
                          </td>

                          {/* Actions (3-Dots Dropdown Menu) */}
                          <td style={{ ...styles.tableCell, textAlign: 'center', position: 'relative', overflow: 'visible', width: '80px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionDeviceId((prev: number | null) => prev === dev.id ? null : (dev.id ?? null));
                              }}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: activeActionDeviceId === dev.id ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto',
                                padding: 0
                              }}
                              title="More Options (more-vertical)"
                            >
                              <img 
                                src="/icons/more-vertical.svg" 
                                alt="More Options" 
                                className="theme-icon" 
                                style={{ width: '16px', height: '16px', display: 'block', pointerEvents: 'none' }} 
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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

      {/* Sub-Tab 3: Last Changes & Activity Audit */}
      {activeSubTab === 'audit' && (
        <div style={{ maxWidth: '960px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', boxSizing: 'border-box' }}>
          {/* Header Card */}
          <div className="glass-panel" style={{ ...styles.panel, padding: '24px', borderRadius: 'var(--radius-md, 12px)', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    My Recent Activity & Changes Audit Log
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Audit trail for <strong>{profile?.full_name || 'You'}</strong> (PIN: {profile?.pin || 'N/A'}). Track what was saved, deleted, or pending offline, with one-click options to retry or discard.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={async () => {
                    setIsSyncingAudit(true);
                    try {
                      await syncAllPendingMutations();
                      setAuditHistory(getChangeHistory());
                      if ((window as any).customAlert) (window as any).customAlert('Synced with server successfully.');
                    } finally {
                      setIsSyncingAudit(false);
                    }
                  }}
                  disabled={isSyncingAudit}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                  </svg>
                  <span>{isSyncingAudit ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: 'var(--bg-surface-hover)', padding: '14px 18px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Activities</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {filteredEmpRecords.length}
                </div>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>Saved Successfully</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {filteredEmpRecords.filter(h => h.status === 'saved').length}
                </div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '14px 18px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444' }}>Pending / Failed</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
                  {filteredEmpRecords.filter(h => h.status === 'failed' || h.status === 'pending').length}
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '18px', background: 'var(--bg-surface-hover)', padding: '12px 16px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px', flex: '1 1 160px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status / Action:</label>
                <select
                  value={auditStatusFilter}
                  onChange={e => setAuditStatusFilter(e.target.value)}
                  style={{ ...styles.input, padding: '7px 10px', fontSize: '0.82rem' }}
                >
                  <option value="ALL">All Changes</option>
                  <option value="saved">Saved Successfully</option>
                  <option value="failed">Failed to Save</option>
                  <option value="pending">Pending Offline</option>
                  <option value="create">Created Items</option>
                  <option value="update">Updated Items</option>
                  <option value="delete">Deleted Items</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px', flex: '1 1 150px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Entity Type:</label>
                <select
                  value={auditEntityFilter}
                  onChange={e => setAuditEntityFilter(e.target.value)}
                  style={{ ...styles.input, padding: '7px 10px', fontSize: '0.82rem' }}
                >
                  <option value="ALL">All Entities</option>
                  <option value="Leave">Leave Requests</option>
                  <option value="Loan">Loan Applications</option>
                  <option value="Complaint">Helpdesk & Requests</option>
                  <option value="Employee">Profile & Credentials</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '200px', flex: '2 1 200px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Search My Activity:</label>
                <input
                  type="text"
                  placeholder="Filter by description, reason..."
                  value={auditSearchQuery}
                  onChange={e => setAuditSearchQuery(e.target.value)}
                  style={{ ...styles.input, padding: '7px 10px', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* Audit Records Table */}
            <div style={styles.tableContainer} className="table-slider-container">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={tableThStyle}>Time</th>
                    <th style={tableThStyle}>Action</th>
                    <th style={tableThStyle}>Entity</th>
                    <th style={tableThStyle}>Description / Target</th>
                    <th style={tableThStyle}>Status</th>
                    <th style={{ ...tableThStyle, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmpRecords.length > 0 ? (
                    filteredEmpRecords.map(rec => (
                      <tr key={rec.id} style={styles.tableRow}>
                        <td style={{ ...styles.tableCell, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(rec.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ ...styles.tableCell, whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: rec.action === 'create' ? 'rgba(16, 185, 129, 0.15)' : rec.action === 'delete' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: rec.action === 'create' ? '#10b981' : rec.action === 'delete' ? '#ef4444' : 'var(--primary)'
                          }}>
                            {rec.action}
                          </span>
                        </td>
                        <td style={{ ...styles.tableCell, fontWeight: 600, fontSize: '0.85rem' }}>
                          {rec.entity}
                        </td>
                        <td style={{ ...styles.tableCell, fontSize: '0.82rem' }}>
                          <div><strong>{rec.targetName}</strong></div>
                          {rec.errorMessage && (
                            <div style={{ fontSize: '0.74rem', color: '#ef4444', marginTop: '2px' }}>
                              Error: {rec.errorMessage}
                            </div>
                          )}
                        </td>
                        <td style={{ ...styles.tableCell, whiteSpace: 'nowrap' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: rec.status === 'saved' ? 'rgba(16, 185, 129, 0.15)' : rec.status === 'failed' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: rec.status === 'saved' ? '#10b981' : rec.status === 'failed' ? '#ef4444' : '#f59e0b'
                          }}>
                            {rec.status === 'saved' ? 'Saved' : rec.status === 'failed' ? 'Failed' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ ...styles.tableCell, textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {rec.status === 'saved' ? (
                            rec.previousData ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  const cf = (window as any).customConfirm;
                                  const proceed = await new Promise<boolean>(res => {
                                    if (cf) {
                                      cf(`Revert this change on "${rec.targetName}"? This will restore your previous data.`, () => res(true), () => res(false));
                                    } else {
                                      res(window.confirm(`Revert this change on "${rec.targetName}"?`));
                                    }
                                  });
                                  if (!proceed) return;
                                  if ((window as any).showLoading) (window as any).showLoading('Reverting...');
                                  try {
                                    const res = await revertSavedChange(rec.id);
                                    if ((window as any).customAlert) (window as any).customAlert(res.message);
                                    setAuditHistory(getChangeHistory());
                                  } catch (e: any) {
                                    if ((window as any).customAlert) (window as any).customAlert(e?.message || 'Failed to revert');
                                  } finally {
                                    if ((window as any).hideLoading) (window as any).hideLoading();
                                  }
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 600 }}
                              >
                                Revert
                              </button>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                            )
                          ) : (
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={async () => {
                                  if ((window as any).showLoading) (window as any).showLoading('Retrying...');
                                  try {
                                    const ok = await retryPendingChange(rec.id);
                                    if (ok) {
                                      if ((window as any).customAlert) (window as any).customAlert('Saved successfully!');
                                    } else {
                                      if ((window as any).customAlert) (window as any).customAlert('Server still unreachable. Will retry when connection restores.');
                                    }
                                    setAuditHistory(getChangeHistory());
                                  } finally {
                                    if ((window as any).hideLoading) (window as any).hideLoading();
                                  }
                                }}
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                              >
                                Try Again
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  discardPendingChange(rec.id);
                                  setAuditHistory(getChangeHistory());
                                  if ((window as any).customAlert) (window as any).customAlert('Item removed.');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.74rem', color: '#ef4444' }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No audit change records match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Centered Device Actions Modal */}
      {activeActionDeviceId !== null && createPortal(
        (() => {
          const dev = empDevicesList.find(x => x.id === activeActionDeviceId);
          if (!dev) return null;
          const isBlocked = !dev.is_active;
          return (
            <div 
              className="custom-overlay animate-fade-in" 
              onClick={() => setActiveActionDeviceId(null)} 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 100000,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
                padding: 0
              }}
            >
              <div 
                className="custom-dialog-card glass-panel animate-scale-in" 
                onClick={e => e.stopPropagation()} 
                style={{ width: '420px', maxWidth: '92vw', padding: '22px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.45)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Device Actions
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {dev.device_name || 'Hardware Device'} ({dev.user_email})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveActionDeviceId(null)}
                    style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', padding: '10px 12px', background: 'var(--bg-surface-hover)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <div>Status: <strong style={{ color: dev.is_active ? '#10b981' : '#ef4444' }}>{dev.is_active ? 'Active' : 'Blocked'}</strong></div>
                  <div>Type: <strong>{dev.auth_type || 'Unknown'}</strong></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* 1. Rename Device */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionDeviceId(null);
                      setDeviceRecord(dev);
                      setNewDeviceName(dev.device_name || '');
                      setIsRenameModalOpen(true);
                    }}
                    style={{ ...empDeviceDropdownItemStyle, padding: '10px 14px', borderRadius: '8px' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>Rename Device</span>
                  </button>

                  {/* 2. Block / Unblock */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionDeviceId(null);
                      handleToggleBlockDevice(dev);
                    }}
                    style={{
                      ...empDeviceDropdownItemStyle,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      color: isBlocked ? '#10b981' : '#ef4444',
                      background: isBlocked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${isBlocked ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                    }}
                  >
                    {isBlocked ? (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                        </svg>
                        <span>Unblock Device</span>
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        <span>Block Access</span>
                      </>
                    )}
                  </button>

                  {/* 3. Logout Device */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionDeviceId(null);
                      handleLogoutOrDeleteDevice(dev, 'logout');
                    }}
                    style={{
                      ...empDeviceDropdownItemStyle,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      color: '#f59e0b'
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>Logout Device</span>
                  </button>

                  {/* 4. Delete Device */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionDeviceId(null);
                      handleLogoutOrDeleteDevice(dev, 'delete');
                    }}
                    style={{
                      ...empDeviceDropdownItemStyle,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      color: '#ef4444'
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    <span>Delete Device</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* Rename Device Modal */}
      {isRenameModalOpen && createPortal(
        <div 
          className="custom-overlay animate-fade-in" 
          onClick={() => setIsRenameModalOpen(false)} 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 100000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            padding: 0
          }}
        >
          <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Rename This Device
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Give your device a friendly name (e.g. Work Laptop, Personal iPhone, Office PC) so it is easy to recognize.
            </p>
            <form onSubmit={handleSaveRename} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Device Name *</label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={e => setNewDeviceName(e.target.value)}
                  placeholder="e.g. Work Laptop, Personal Mobile"
                  style={styles.input}
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRenameModalOpen(false)}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmployeeDeviceTab;
