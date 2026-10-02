import React, { useState, useEffect } from 'react';
import type { DeviceSettings } from '../../../lib/dbHelper';
import { 
  type TrustedDeviceRecord, 
  type LoginDeviceRecord,
  getAllLoginDevices, 
  toggleDeviceBlock, 
  renameDevice, 
  deleteDeviceRecord,
  getOrCreateDeviceId,
  isDeviceOnline,
  logoutRemoteDevice
} from '../../../utils/biometricAuth';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import { supabase } from '../../../lib/supabase';
import styles from '../AdminStyles';

type DeviceSubTab = 'notifications' | 'zkteco' | 'backup' | 'auth' | 'usb';

interface DeviceTabProps {
  deviceSettings: DeviceSettings;
  handleSaveDeviceSettings: (e: React.FormEvent) => void;
  handleToggleMuteNotifications?: () => void;
  editDeviceIp: string;
  setEditDeviceIp: (val: string) => void;
  editDevicePort: number;
  setEditDevicePort: (val: number) => void;
  editDeviceInterval: number;
  setEditDeviceInterval: (val: number) => void;
  editAutoBackupEnabled: boolean;
  setEditAutoBackupEnabled: (val: boolean) => void;
  editBackupDirectory: string;
  setEditBackupDirectory: (val: string) => void;
  adminTrustedDevice: TrustedDeviceRecord | null;
  handleDisableAdminBiometric: () => void;
  handleRegisterAdminBiometric: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  processMultipleFiles: (files: FileList | File[]) => void;
  uploadStatus: string | null;
  profiles?: EmployeeProfile[];
}

// Cached Directory Handle for zero-prompt background refresh & saving
let cachedBackupDirHandle: any = null;

export const DeviceTab: React.FC<DeviceTabProps> = ({
  deviceSettings,
  handleSaveDeviceSettings,
  handleToggleMuteNotifications,
  editDeviceIp,
  setEditDeviceIp,
  editDevicePort,
  setEditDevicePort,
  editDeviceInterval,
  setEditDeviceInterval,
  editAutoBackupEnabled,
  setEditAutoBackupEnabled,
  editBackupDirectory,
  setEditBackupDirectory,
  adminTrustedDevice,
  handleDisableAdminBiometric,
  handleRegisterAdminBiometric,
  fileInputRef,
  handleFileUpload,
  processMultipleFiles,
  uploadStatus,
  profiles = []
}) => {
  const isMuted = !!deviceSettings.is_notifications_muted;
  const [deviceSubTab, setDeviceSubTab] = useState<DeviceSubTab>('notifications');
  const backupTargetDate = new Date().toISOString().split('T')[0];
  const [isExportingBackup, setIsExportingBackup] = useState<boolean>(false);

  // Authorized & Login Devices states
  const [loginDevices, setLoginDevices] = useState<LoginDeviceRecord[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(false);
  const [deviceSearch, setDeviceSearch] = useState<string>('');
  const [deviceToRename, setDeviceToRename] = useState<LoginDeviceRecord | null>(null);
  const [newDeviceName, setNewDeviceName] = useState<string>('');
  const [deviceCategoryTab, setDeviceCategoryTab] = useState<'admin' | 'employee'>('admin');
  const [activeActionDeviceId, setActiveActionDeviceId] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveActionDeviceId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const deviceDropdownItemStyle: React.CSSProperties = {
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

  const isAdminDevice = (device: LoginDeviceRecord) => {
    const emp = getEmployeeForDevice(device.user_email);
    if (emp?.role === 'admin') return true;
    const clean = (device.user_email || '').toLowerCase().trim();
    if (clean.includes('admin') || clean === 'admin@hrportal.local' || clean === 'admin') return true;
    if (!emp && clean.includes('admin')) return true;
    return false;
  };

  const handleRemoteLogout = async (device: LoginDeviceRecord) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      if ((window as any).customConfirm) {
        (window as any).customConfirm(
          `Are you sure you want to remotely log out ${device.device_name || 'Device'} (${device.user_email})? Their active browser session will be immediately terminated.`,
          () => resolve(true),
          () => resolve(false)
        );
      } else {
        resolve(window.confirm(`Are you sure you want to remotely log out this device?`));
      }
    });
    if (!confirmed) return;
    if ((window as any).showLoading) (window as any).showLoading('Terminating remote device session...');
    try {
      const ok = await logoutRemoteDevice(device.id);
      if (ok) {
        await loadDevices();
        if ((window as any).customAlert) {
          (window as any).customAlert('Device session terminated successfully. The remote user has been logged out.');
        }
      } else {
        if ((window as any).customAlert) (window as any).customAlert('Failed to terminate remote session.');
      }
    } finally {
      if ((window as any).hideLoading) (window as any).hideLoading();
    }
  };

  const loadDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const list = await getAllLoginDevices();
      setLoginDevices(list);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (deviceSubTab === 'auth') {
      loadDevices();
    }
  }, [deviceSubTab]);

  const handleToggleBlock = async (device: LoginDeviceRecord) => {
    const actionText = device.is_active ? 'block' : 'unblock';
    const confirmed = await new Promise<boolean>((resolve) => {
      if ((window as any).customConfirm) {
        (window as any).customConfirm(
          `Are you sure you want to ${actionText} this device (${device.device_name || 'Device'}) for ${device.user_email}? ${device.is_active ? 'Access to the HR Portal will be denied on this device.' : 'The user will be able to log in again.'}`,
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
        await loadDevices();
        if ((window as any).customAlert) {
          (window as any).customAlert(`Device successfully ${device.is_active ? 'blocked' : 'unblocked'}.`);
        }
      } else {
        if ((window as any).customAlert) (window as any).customAlert('Failed to update device status.');
      }
    } finally {
      if ((window as any).hideLoading) (window as any).hideLoading();
    }
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceToRename || !newDeviceName.trim()) return;
    if ((window as any).showLoading) (window as any).showLoading('Renaming device...');
    try {
      const ok = await renameDevice(deviceToRename.id, newDeviceName.trim());
      if (ok) {
        await loadDevices();
        setDeviceToRename(null);
        setNewDeviceName('');
        if ((window as any).customAlert) (window as any).customAlert('Device renamed successfully.');
      } else {
        if ((window as any).customAlert) (window as any).customAlert('Failed to rename device.');
      }
    } finally {
      if ((window as any).hideLoading) (window as any).hideLoading();
    }
  };

  const handleDeleteDevice = async (device: LoginDeviceRecord) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      if ((window as any).customConfirm) {
        (window as any).customConfirm(
          `Permanently remove device registration for ${device.device_name || 'Device'} (${device.user_email})?`,
          () => resolve(true),
          () => resolve(false)
        );
      } else {
        resolve(window.confirm('Delete this device record?'));
      }
    });
    if (!confirmed) return;
    if ((window as any).showLoading) (window as any).showLoading('Removing device...');
    try {
      const ok = await deleteDeviceRecord(device.id);
      if (ok) {
        await loadDevices();
        if ((window as any).customAlert) (window as any).customAlert('Device record removed successfully.');
      } else {
        if ((window as any).customAlert) (window as any).customAlert('Failed to remove device.');
      }
    } finally {
      if ((window as any).hideLoading) (window as any).hideLoading();
    }
  };

  const getEmployeeForDevice = (email: string) => {
    if (!profiles || profiles.length === 0) return null;
    const clean = email.trim().toLowerCase();
    return profiles.find(p => p.email?.trim().toLowerCase() === clean || p.pin?.trim().toLowerCase() === clean);
  };

  const handleExportBackupForDate = async (targetDate: string) => {
    setIsExportingBackup(true);
    if ((window as any).showLoading) (window as any).showLoading(`Refreshing & replacing all 12 database tables in backup folder...`);

    try {
      const TABLES = [
        'profiles',
        'raw_attendance_logs',
        'leave_requests',
        'complaints',
        'announcements',
        'notifications',
        'holidays',
        'employee_loans',
        'shift_timings',
        'trusted_devices',
        'device_settings',
        'purpose_transfers'
      ];

      const backupData: Record<string, any[]> = {};
      const recordCounts: Record<string, number> = {};
      let totalRecords = 0;

      for (const table of TABLES) {
        try {
          const { data, error } = await supabase.from(table).select('*');
          if (!error && data) {
            backupData[table] = data;
            recordCounts[table] = data.length;
            totalRecords += data.length;
          } else {
            backupData[table] = [];
            recordCounts[table] = 0;
          }
        } catch (e) {
          backupData[table] = [];
          recordCounts[table] = 0;
        }
      }

      // Check if browser supports direct File System Access (Chrome / Edge on Windows)
      let savedDirectlyToFolder = false;
      let chosenFolderName = '';

      if ('showDirectoryPicker' in window) {
        try {
          let dirHandle = cachedBackupDirHandle;

          if (dirHandle) {
            try {
              const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
              if (perm !== 'granted') {
                const req = await dirHandle.requestPermission({ mode: 'readwrite' });
                if (req !== 'granted') dirHandle = null;
              }
            } catch (_) {
              dirHandle = null;
            }
          }

          if (!dirHandle) {
            dirHandle = await (window as any).showDirectoryPicker({
              id: 'elipse_backup_storage_folder',
              mode: 'readwrite'
            });
            if (dirHandle) {
              cachedBackupDirHandle = dirHandle;
            }
          }

          if (dirHandle) {
            chosenFolderName = dirHandle.name;

            // Create or get the dedicated dated snapshot folder (e.g. YYYY-MM-DD)
            const dateFolderHandle = await dirHandle.getDirectoryHandle(targetDate, { create: true });

            // Write each table inside the dated snapshot folder
            for (const [table, rows] of Object.entries(backupData)) {
              const fileHandle = await dateFolderHandle.getFileHandle(`${table}.json`, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(JSON.stringify(rows, null, 2));
              await writable.close();
            }

            // Write full consolidated dump & summary inside the dated snapshot folder
            const fullDumpHandle = await dateFolderHandle.getFileHandle('full_database_dump.json', { create: true });
            const fullWritable = await fullDumpHandle.createWritable();
            await fullWritable.write(JSON.stringify(backupData, null, 2));
            await fullWritable.close();

            const summaryHandle = await dateFolderHandle.getFileHandle('_backup_summary.json', { create: true });
            const summaryWritable = await summaryHandle.createWritable();
            await summaryWritable.write(JSON.stringify({
              last_synced_at: new Date().toISOString(),
              backup_date: targetDate,
              total_tables: TABLES.length,
              total_records: totalRecords,
              tables: recordCounts
            }, null, 2));
            await summaryWritable.close();

            savedDirectlyToFolder = true;
          }
        } catch (dirErr: any) {
          if (dirErr.name === 'AbortError') {
            if ((window as any).hideLoading) (window as any).hideLoading();
            setIsExportingBackup(false);
            return;
          }
        }
      }

      // If File System Access API wasn't used or not supported, download consolidated JSON as fallback
      if (!savedDirectlyToFolder) {
        const exportBundle = {
          app_name: 'Elipse HR Portal',
          backup_date: targetDate,
          exported_at: new Date().toISOString(),
          total_tables: TABLES.length,
          total_records: totalRecords,
          table_summary: recordCounts,
          data: backupData
        };
        const jsonBlob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(jsonBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `elipse_database_backup_${targetDate}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
      }

      // Update last_backup_time in Supabase
      try {
        const nowIso = new Date().toISOString();
        await supabase.from('device_settings').update({ last_backup_time: nowIso }).eq('id', 1);
        if (deviceSettings) {
          deviceSettings.last_backup_time = nowIso;
        }
      } catch (e) {}

      if ((window as any).customAlert) {
        if (savedDirectlyToFolder) {
          (window as any).customAlert(
            `All 12 database tables successfully saved into date folder:\n\nFolder: ${chosenFolderName}\\${targetDate}\\\n\n• profiles.json\n• raw_attendance_logs.json\n• leave_requests.json\n• complaints.json\n• announcements.json\n• notifications.json\n• holidays.json\n• employee_loans.json\n• shift_timings.json\n• trusted_devices.json\n• device_settings.json\n• purpose_transfers.json\n• full_database_dump.json\n• _backup_summary.json\n\nTotal records: ${totalRecords.toLocaleString()}`,
            'Database Backup Complete'
          );
        } else {
          (window as any).customAlert(
            `Database snapshot for ${targetDate} exported successfully!\n\n• Tables: ${TABLES.length}\n• Total Records: ${totalRecords.toLocaleString()}\n• File: elipse_database_backup_${targetDate}.json`,
            'Backup Complete'
          );
        }
      }
    } catch (err: any) {
      if ((window as any).customAlert) {
        (window as any).customAlert('Failed to save database backup: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setIsExportingBackup(false);
      if ((window as any).hideLoading) (window as any).hideLoading();
    }
  };

  const getSubTabBtnStyle = (active: boolean) => ({
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    background: active ? 'var(--primary)' : 'var(--bg-surface)',
    color: active ? 'var(--btn-primary-text, #000000)' : 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s ease'
  });

  return (
    <div style={{ ...styles.dashboardContent, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', alignItems: 'center' }} className="animate-fade-in">
      
      {/* Sub-tabs Navigation for Device & System Settings Panel */}
      <div className="glass-panel tabs-scroll-container" style={{ padding: '10px 16px', display: 'flex', gap: '10px', alignItems: 'center', width: '100%', maxWidth: '850px', margin: '0 auto', flexWrap: 'nowrap', overflowX: 'auto', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginRight: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Device & Settings Panel:
        </span>
        
        {/* 1. System Notification */}
        <button
          type="button"
          onClick={() => setDeviceSubTab('notifications')}
          style={getSubTabBtnStyle(deviceSubTab === 'notifications')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span>System Notification</span>
          {isMuted ? (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>
              Muted
            </span>
          ) : (
            <span style={{ background: '#10b981', color: '#fff', fontSize: '0.72rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>
              Active
            </span>
          )}
        </button>

        {/* 2. ZKTeco K40 */}
        <button
          type="button"
          onClick={() => setDeviceSubTab('zkteco')}
          style={getSubTabBtnStyle(deviceSubTab === 'zkteco')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>ZKTeco K40</span>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: deviceSettings.status === 'Online' || deviceSettings.status === 'System Online' ? '#10b981' : '#9ca3af',
            boxShadow: deviceSettings.status === 'Online' || deviceSettings.status === 'System Online' ? '0 0 6px #10b981' : 'none'
          }} />
        </button>

        {/* 3. Database Backup */}
        <button
          type="button"
          onClick={() => setDeviceSubTab('backup')}
          style={getSubTabBtnStyle(deviceSubTab === 'backup')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
          </svg>
          <span>Database Backup</span>
          {editAutoBackupEnabled && (
            <span style={{ background: '#10b981', color: '#fff', fontSize: '0.72rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>
              Auto
            </span>
          )}
        </button>

        {/* 4. Device Manager & Security */}
        <button
          type="button"
          onClick={() => setDeviceSubTab('auth')}
          style={getSubTabBtnStyle(deviceSubTab === 'auth')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          <span>Device Manager & Security</span>
          {loginDevices.length > 0 && (
            <span style={{ background: 'var(--primary)', color: 'var(--btn-primary-text, #000)', fontSize: '0.72rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>
              {loginDevices.length}
            </span>
          )}
        </button>

        {/* 5. USB Fallback */}
        <button
          type="button"
          onClick={() => setDeviceSubTab('usb')}
          style={getSubTabBtnStyle(deviceSubTab === 'usb')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span>USB Fallback</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SUB-TAB: SYSTEM NOTIFICATION                                          */}
      {/* ========================================================================= */}
      {deviceSubTab === 'notifications' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', width: '100%', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box' }}>
          <div style={{
            background: isMuted 
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.06))' 
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06))',
            border: isMuted ? '1.5px solid rgba(239, 68, 68, 0.35)' : '1.5px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '24px',
            boxShadow: isMuted ? '0 4px 20px rgba(239, 68, 68, 0.08)' : '0 4px 20px rgba(16, 185, 129, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isMuted ? '#ef4444' : '#10b981'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    {isMuted && <line x1="2" y1="2" x2="22" y2="22"></line>}
                  </svg>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    System Notification Master Control
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      background: isMuted ? '#ef4444' : '#10b981',
                      boxShadow: isMuted ? '0 0 8px #ef4444' : '0 0 8px #10b981'
                    }}></span>
                    <span style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: isMuted ? '#ef4444' : '#10b981'
                    }}>
                      {isMuted ? 'Globally Muted (Silent Mode)' : 'Notifications Active (Live Delivery Enabled)'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if ((window as any).showNativeNotification) {
                      (window as any).showNativeNotification(
                        'Test System Notification',
                        'Real-time sound chimes and push alerts are working properly!',
                        true
                      );
                    }
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-sm, 8px)',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  <span>Test Notification</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleMuteNotifications}
                  className={`btn ${isMuted ? 'btn-success' : 'btn-danger'}`}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-sm, 8px)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: isMuted ? '#10b981' : '#ef4444',
                    color: '#ffffff',
                    boxShadow: isMuted ? '0 2px 10px rgba(16, 185, 129, 0.3)' : '0 2px 10px rgba(239, 68, 68, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{isMuted ? 'Unmute System Notifications' : 'Mute All Notifications'}</span>
                </button>
              </div>
            </div>

            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              margin: '16px 0 0 0',
              lineHeight: 1.5,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '12px'
            }}>
              {isMuted 
                ? 'All system notifications are currently silenced. No sound chimes, in-app toast banners, or lock-screen push alerts will be sent to any employee or admin device.' 
                : 'Notifications are working normally. Employees and admins receive instant real-time sound chimes, lock-screen pushes, and in-app banners (10s auto-dismiss).'}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUB-TAB: ZKTECO K40                                                   */}
      {/* ========================================================================= */}
      {deviceSubTab === 'zkteco' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', width: '100%', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.15rem', color: 'var(--text-primary)' }}>
            ZKTeco K40 Hardware Reader Settings
          </h3>
          
          {/* Status section */}
          <div style={{ ...styles.syncInfoBox, marginBottom: '24px' }}>
            <div style={styles.syncIndicator}>
              <div style={{
                ...styles.activeDot,
                background: deviceSettings.status === 'Online' || deviceSettings.status === 'System Online' ? 'var(--success)' : '#9ca3af'
              }}></div>
              <strong>Device Status: {deviceSettings.status || 'Offline'}</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              The Node.js synchronization agent connects locally to the reader over TCP/IP and writes new punches to Supabase.
            </p>
            
            <div style={{ ...styles.infoBullets, marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>Last Connection State: <code>{deviceSettings.last_connection_state || 'Unknown'}</code></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>Last Successful Sync: <code>{deviceSettings.last_sync ? new Date(deviceSettings.last_sync).toLocaleString() : 'Never'}</code></span>
              </div>
            </div>
          </div>

          {/* Edit settings form */}
          <form onSubmit={handleSaveDeviceSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '520px' }}>
            <div style={styles.formGroup}>
              <label>Device IP Address *</label>
              <input 
                type="text" 
                value={editDeviceIp} 
                onChange={e => setEditDeviceIp(e.target.value)} 
                placeholder="e.g. 192.168.1.201" 
                style={styles.input}
                required 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.formGroup}>
                <label>Device TCP Port *</label>
                <input 
                  type="number" 
                  value={editDevicePort} 
                  onChange={e => setEditDevicePort(Number(e.target.value))} 
                  placeholder="4370" 
                  style={styles.input}
                  required 
                />
              </div>
              <div style={styles.formGroup}>
                <label>Sync Interval (Seconds) *</label>
                <input 
                  type="number" 
                  value={editDeviceInterval} 
                  onChange={e => setEditDeviceInterval(Number(e.target.value))} 
                  placeholder="30" 
                  style={styles.input}
                  required 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: '10px 22px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, border: 'none', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '8px' }}
            >
              Save Configuration
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-TAB: DATABASE BACKUP                                              */}
      {/* ========================================================================= */}
      {deviceSubTab === 'backup' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', width: '100%', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box' }}>
          <div style={{
            background: editAutoBackupEnabled 
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06))' 
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02))',
            border: editAutoBackupEnabled ? '1.5px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '24px',
            boxShadow: editAutoBackupEnabled ? '0 4px 20px rgba(16, 185, 129, 0.08)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: editAutoBackupEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={editAutoBackupEnabled ? '#10b981' : 'var(--text-muted)'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                  </svg>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Automated Daily Database Backup
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: editAutoBackupEnabled ? '#10b981' : '#9ca3af',
                      boxShadow: editAutoBackupEnabled ? '0 0 8px #10b981' : 'none'
                    }}></span>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: editAutoBackupEnabled ? '#10b981' : 'var(--text-muted)'
                    }}>
                      {editAutoBackupEnabled ? 'Active (Auto-backing up daily)' : 'Disabled (Turned Off by Default)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {editAutoBackupEnabled ? 'Backup Active' : 'Backup Off'}
                </span>
                <input
                  type="checkbox"
                  checked={editAutoBackupEnabled}
                  onChange={e => setEditAutoBackupEnabled(e.target.checked)}
                  style={{
                    width: '40px',
                    height: '22px',
                    cursor: 'pointer',
                    accentColor: 'var(--primary)'
                  }}
                />
              </label>
            </div>

            <p style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              margin: '12px 0 16px 0',
              lineHeight: 1.45,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '10px'
            }}>
              When turned ON, the local background sync agent automatically exports a complete backup of all 12 Supabase tables into a date-stamped folder (e.g. <code>YYYY-MM-DD/profiles.json</code>) every day at midnight.
            </p>

            {/* Backup Path Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Backup Storage Folder Path:
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={editBackupDirectory}
                  onChange={e => setEditBackupDirectory(e.target.value)}
                  placeholder="e.g. D:\Elipse\HRPortal\backups"
                  style={{ ...styles.input, flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}
                  disabled={!editAutoBackupEnabled}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Default path: <code>D:\Elipse\HRPortal\backups</code>. Each day's snapshot is saved inside a dedicated <code>YYYY-MM-DD</code> subfolder with all table data.
              </span>
            </div>

            {deviceSettings.last_backup_time && (
              <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>Last Backup Completed: <strong>{new Date(deviceSettings.last_backup_time).toLocaleString()}</strong></span>
              </div>
            )}

            {/* On-Demand Database Refresh & Direct Replace */}
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                Create On-Demand Database Backup (Dated Folder):
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleExportBackupForDate(backupTargetDate)}
                  disabled={isExportingBackup}
                  className="btn btn-secondary"
                  style={{
                    padding: '9px 18px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: isExportingBackup ? 'not-allowed' : 'pointer',
                    background: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  title="Fetch all 12 database tables in real-time and save to a dedicated dated backup folder"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isExportingBackup ? 'rotate(360deg)' : 'none',
                      transition: 'transform 0.8s ease'
                    }}
                  >
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  <span>{isExportingBackup ? 'Backing Up Tables...' : 'Create Dated Backup Now'}</span>
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Fetches all 12 database tables in real-time and creates a dedicated dated folder (e.g. <code>{backupTargetDate || 'YYYY-MM-DD'}</code>) inside your chosen backup directory containing individual table JSON files and a complete dump.
              </span>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={(e) => handleSaveDeviceSettings(e)}
                className="btn btn-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                Save Backup Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-TAB: DEVICE MANAGER & SECURITY                                     */}
      {/* ========================================================================= */}
      {deviceSubTab === 'auth' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', width: '100%', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Device Manager & Access Security
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                Track all employee workstations and mobile devices. Rename devices, or block unauthorized hardware to immediately revoke portal access.
              </p>
            </div>

            <button
              type="button"
              onClick={loadDevices}
              disabled={isLoadingDevices}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', fontSize: '0.85rem' }}
              title="Refresh device list from database"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: isLoadingDevices ? 'rotate(360deg)' : 'none', transition: 'transform 0.8s ease' }}
              >
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              <span>{isLoadingDevices ? 'Refreshing...' : 'Refresh Devices'}</span>
            </button>
          </div>

          {/* Top Cards: Station Biometrics & Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Station Biometrics Card */}
            <div style={{ background: 'var(--bg-surface-hover)', padding: '18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Admin Workstation Biometrics
                  </span>
                  {adminTrustedDevice ? (
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      Active
                    </span>
                  ) : (
                    <span style={{ background: 'var(--badge-bg)', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      Unregistered
                    </span>
                  )}
                </div>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Enable Fingerprint, Face ID, or Windows Hello on this physical workstation for one-tap passwordless login.
                </p>
                {adminTrustedDevice && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Device: <strong>{adminTrustedDevice.device_name}</strong></div>
                    <div>Account: <strong>{adminTrustedDevice.email}</strong></div>
                  </div>
                )}
              </div>

              {adminTrustedDevice ? (
                <button
                  type="button"
                  onClick={handleDisableAdminBiometric}
                  className="btn btn-secondary"
                  style={{ width: '100%', fontSize: '0.82rem', color: 'var(--danger)', fontWeight: 600, padding: '8px 12px' }}
                >
                  Disable Biometrics on This PC
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRegisterAdminBiometric}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  <span>Enable Biometrics on This PC</span>
                </button>
              )}
            </div>

            {/* Total Devices Stat */}
            <div style={{ background: 'var(--bg-surface-hover)', padding: '18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Registered Devices
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                {loginDevices.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Hardware profiles recorded in system database
              </div>
            </div>

            {/* Active vs Blocked Stat */}
            <div style={{ background: 'var(--bg-surface-hover)', padding: '18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Access Posture
              </div>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', alignItems: 'baseline' }}>
                <div>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
                    {loginDevices.filter(d => d.is_active !== false).length}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>Authorized</span>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444' }}>
                    {loginDevices.filter(d => d.is_active === false).length}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>Blocked</span>
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Blocked devices cannot access HR portal
              </div>
            </div>

          </div>

          {/* Subtab Category Selector: Admin Devices (Default) vs Employee Devices */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginTop: '6px' }}>
            <div style={{
              display: 'inline-flex',
              gap: '6px',
              padding: '4px',
              background: 'var(--bg-surface-hover)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <button
                type="button"
                onClick={() => setDeviceCategoryTab('admin')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 18px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  transition: 'all 0.2s ease',
                  background: deviceCategoryTab === 'admin' ? 'var(--primary)' : 'transparent',
                  color: deviceCategoryTab === 'admin' ? 'var(--btn-primary-text, #000000)' : 'var(--text-secondary)'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Admin Devices</span>
                <span style={{
                  background: deviceCategoryTab === 'admin' ? 'rgba(0,0,0,0.15)' : 'var(--badge-bg)',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {loginDevices.filter(d => isAdminDevice(d)).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDeviceCategoryTab('employee')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 18px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  transition: 'all 0.2s ease',
                  background: deviceCategoryTab === 'employee' ? 'var(--primary)' : 'transparent',
                  color: deviceCategoryTab === 'employee' ? 'var(--btn-primary-text, #000000)' : 'var(--text-secondary)'
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Employee Devices</span>
                <span style={{
                  background: deviceCategoryTab === 'employee' ? 'rgba(0,0,0,0.15)' : 'var(--badge-bg)',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {loginDevices.filter(d => !isAdminDevice(d)).length}
                </span>
              </button>
            </div>

            {/* Search Box */}
            <div style={{ width: '100%', maxWidth: '300px' }}>
              <input
                type="text"
                placeholder={deviceCategoryTab === 'admin' ? "Search admin devices..." : "Search employee devices..."}
                value={deviceSearch}
                onChange={e => setDeviceSearch(e.target.value)}
                style={{ ...styles.input, padding: '8px 12px', fontSize: '0.82rem', width: '100%' }}
              />
            </div>
          </div>

          {/* Table Container */}
          <div style={{ ...styles.tableContainer, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', maxHeight: '560px', overflowX: 'auto', overflowY: 'auto', paddingBottom: '80px' }}>
            <table style={styles.table}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={tableThStyle}>Device Name</th>
                  <th style={tableThStyle}>{deviceCategoryTab === 'admin' ? 'Admin User' : 'Employee'}</th>
                  <th style={{ ...tableThStyle, textAlign: 'center' }}>Online Status</th>
                  <th style={tableThStyle}>Auth Method</th>
                  <th style={tableThStyle}>Device Identifier</th>
                  <th style={{ ...tableThStyle, textAlign: 'center' }}>Status</th>
                  <th style={tableThStyle}>Last Active</th>
                  <th style={{ ...tableThStyle, textAlign: 'center', width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const categoryDevices = loginDevices.filter(d => {
                    if (deviceCategoryTab === 'admin') return isAdminDevice(d);
                    return !isAdminDevice(d);
                  });

                  const filtered = categoryDevices.filter(d => {
                    if (!deviceSearch.trim()) return true;
                    const q = deviceSearch.toLowerCase();
                    const emp = getEmployeeForDevice(d.user_email);
                    return (
                      (d.device_name && d.device_name.toLowerCase().includes(q)) ||
                      (d.user_email && d.user_email.toLowerCase().includes(q)) ||
                      (d.device_id && d.device_id.toLowerCase().includes(q)) ||
                      (emp?.full_name && emp.full_name.toLowerCase().includes(q)) ||
                      (emp?.pin && emp.pin.toLowerCase().includes(q))
                    );
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                          {deviceSearch.trim() 
                            ? `No ${deviceCategoryTab === 'admin' ? 'admin' : 'employee'} devices matching your search query.` 
                            : `No ${deviceCategoryTab === 'admin' ? 'admin' : 'employee'} login devices registered yet.`}
                        </td>
                      </tr>
                    );
                  }

                  const currentDevId = getOrCreateDeviceId();

                  return filtered.map((dev, idx, arr) => {
                    const emp = getEmployeeForDevice(dev.user_email);
                    const isBlocked = dev.is_active === false;
                    const isCurrentDevice = dev.device_id === currentDevId;
                    const isOnline = isDeviceOnline(dev, currentDevId);
                    const isNearBottom = idx >= arr.length - 2 && arr.length > 2;

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
                      <tr key={dev.id} style={{ ...styles.tableRow, background: isBlocked ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                        
                        {/* Device Name with inline Rename shortcut */}
                        <td style={styles.tableCell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ fontWeight: 600, color: isBlocked ? '#ef4444' : 'var(--text-primary)', fontSize: '0.88rem' }}>
                              {dev.device_name || 'Generic Device'}
                            </div>
                            <button
                              type="button"
                              onClick={() => { setDeviceToRename(dev); setNewDeviceName(dev.device_name || ''); }}
                              className="btn btn-secondary"
                              style={{ padding: '2px 6px', fontSize: '0.72rem', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                              title="Rename this device"
                            >
                              Rename
                            </button>
                          </div>
                        </td>

                        {/* Employee / Admin User info */}
                        <td style={styles.tableCell}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                              {emp?.full_name || (dev.user_email.includes('admin') ? 'Administrator' : 'System User')}
                            </span>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {emp?.pin && (
                                <span style={{ background: 'var(--badge-bg)', border: '1px solid var(--border-color)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  PIN: {emp.pin}
                                </span>
                              )}
                              <span>{dev.user_email}</span>
                            </div>
                          </div>
                        </td>

                        {/* Online Status Indicator */}
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
                              ...styles.iconBtn,
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

                          {/* Floating Actions Popover */}
                          {activeActionDeviceId === dev.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                ...(isNearBottom ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35), 0 8px 10px -6px rgba(0,0,0,0.25)',
                                zIndex: 1000,
                                minWidth: '190px',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                textAlign: 'left'
                              }}
                              className="animate-fade-in"
                            >
                              {/* 1. Rename Device */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionDeviceId(null);
                                  setDeviceToRename(dev);
                                  setNewDeviceName(dev.device_name || '');
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={deviceDropdownItemStyle}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                <span>Rename Device</span>
                              </button>

                              {/* 2. Block / Unblock Device */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionDeviceId(null);
                                  handleToggleBlock(dev);
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = isBlocked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={{ ...deviceDropdownItemStyle, color: isBlocked ? '#10b981' : '#ef4444' }}
                              >
                                {isBlocked ? (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                                    </svg>
                                    <span>Unblock Device</span>
                                  </>
                                ) : (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                    </svg>
                                    <span>Block Access</span>
                                  </>
                                )}
                              </button>

                              {/* 3. Remote Logout */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionDeviceId(null);
                                  handleRemoteLogout(dev);
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={{ ...deviceDropdownItemStyle, color: '#f59e0b' }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                  <polyline points="16 17 21 12 16 7" />
                                  <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                <span>Remote Logout</span>
                              </button>

                              <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                              {/* 4. Delete Device Record */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionDeviceId(null);
                                  handleDeleteDevice(dev);
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={{ ...deviceDropdownItemStyle, color: '#ef4444' }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                <span>Delete Device</span>
                              </button>
                            </div>
                          )}
                        </td>

                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          {/* Rename Device Modal */}
          {deviceToRename && (
            <div className="custom-overlay" onClick={() => setDeviceToRename(null)} style={{ zIndex: 12000 }}>
              <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ padding: '28px', width: '420px', maxWidth: '90vw' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  Rename Device
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Set a clear, recognizable name for this device (e.g. Workstation PC 1, Admin Laptop, Personal iPhone).
                </p>
                <div style={{ marginBottom: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  User: <strong>{deviceToRename.user_email}</strong>
                </div>
                <form onSubmit={handleSaveRename} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={styles.formGroup}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Device Name *</label>
                    <input
                      type="text"
                      value={newDeviceName}
                      onChange={e => setNewDeviceName(e.target.value)}
                      placeholder="e.g. Office PC, Home Laptop"
                      style={styles.input}
                      required
                      autoFocus
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setDeviceToRename(null)}
                      style={{ padding: '8px 16px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      Save Device Name
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-TAB: USB FALLBACK                                                 */}
      {/* ========================================================================= */}
      {deviceSubTab === 'usb' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', width: '100%', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', color: 'var(--text-primary)' }}>
            Manual File Upload (USB Fallback)
          </h3>
          <div style={styles.uploadBox}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              If the direct network sync agent is offline, you can manually upload the raw Excel sheet (<strong>.xls / .xlsx</strong>), <strong>attlog.dat</strong> file, or <strong>CSV / Tab-delimited Text</strong>.
            </p>

            <div 
              onClick={() => fileInputRef.current?.click()} 
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files) {
                  processMultipleFiles(e.dataTransfer.files);
                }
              }}
              style={styles.dropzone}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '10px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Drag & Drop or Click to Select File</span>
              <small>Accepts Excel (.xls, .xlsx), attlog.dat, CSV, or Text</small>
            </div>

            <input 
              type="file" 
              ref={fileInputRef as any} 
              onChange={handleFileUpload} 
              style={{ display: 'none' }} 
              accept=".xls,.xlsx,.dat,.txt,.csv"
              multiple
            />

            {uploadStatus && (
              <div style={styles.statusBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>{uploadStatus}</span>
              </div>
            )}

            <div style={styles.alertBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Ensure employee IDs in the machine match PIN IDs in the profile settings.</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DeviceTab;
