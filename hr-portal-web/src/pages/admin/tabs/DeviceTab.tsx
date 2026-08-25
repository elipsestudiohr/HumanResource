import React, { useState } from 'react';
import type { DeviceSettings } from '../../../lib/dbHelper';
import type { TrustedDeviceRecord } from '../../../utils/biometricAuth';
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
  uploadStatus
}) => {
  const isMuted = !!deviceSettings.is_notifications_muted;
  const [deviceSubTab, setDeviceSubTab] = useState<DeviceSubTab>('notifications');
  const backupTargetDate = new Date().toISOString().split('T')[0];
  const [isExportingBackup, setIsExportingBackup] = useState<boolean>(false);

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

            // Write each table directly into the chosen folder (replacing/updating files without subfolder)
            for (const [table, rows] of Object.entries(backupData)) {
              const fileHandle = await dirHandle.getFileHandle(`${table}.json`, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(JSON.stringify(rows, null, 2));
              await writable.close();
            }

            // Write full consolidated dump & summary directly in root of chosen folder
            const fullDumpHandle = await dirHandle.getFileHandle('full_database_dump.json', { create: true });
            const fullWritable = await fullDumpHandle.createWritable();
            await fullWritable.write(JSON.stringify(backupData, null, 2));
            await fullWritable.close();

            const summaryHandle = await dirHandle.getFileHandle('_backup_summary.json', { create: true });
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
            `All 12 database tables successfully fetched and replaced in backup folder:\n\nFolder: ${chosenFolderName}\\\n\n• profiles.json\n• raw_attendance_logs.json\n• leave_requests.json\n• complaints.json\n• announcements.json\n• notifications.json\n• holidays.json\n• employee_loans.json\n• shift_timings.json\n• trusted_devices.json\n• device_settings.json\n• purpose_transfers.json\n• full_database_dump.json\n• _backup_summary.json\n\nTotal records: ${totalRecords.toLocaleString()}`,
            'Database Tables Refreshed & Replaced'
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

        {/* 4. Device Authentication */}
        <button
          type="button"
          onClick={() => setDeviceSubTab('auth')}
          style={getSubTabBtnStyle(deviceSubTab === 'auth')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <path d="m9 12 2 2 4-4"></path>
          </svg>
          <span>Device Authentication</span>
          {adminTrustedDevice && (
            <span style={{ background: '#10b981', color: '#fff', fontSize: '0.72rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>
              Trusted
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
                Fetch & Replace All Database Tables in Backup Storage Folder:
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
                  title="Fetch all 12 database tables in real-time and replace files directly in your backup directory"
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
                  <span>{isExportingBackup ? 'Fetching & Replacing Tables...' : 'Refresh & Replace Tables in Backup Folder'}</span>
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Fetches all 12 database tables in real-time and replaces the individual <code>.json</code> table files directly inside your chosen backup directory in the background without creating date subfolders.
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
      {/* 4. SUB-TAB: DEVICE AUTHENTICATION                                        */}
      {/* ========================================================================= */}
      {deviceSubTab === 'auth' && (
        <div className="glass-panel animate-fade-in" style={{ padding: '28px', width: '100%', maxWidth: '850px', margin: '0 auto', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
            <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Trusted Device & Biometric Security
            </h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
            Register this device as a <strong>Trusted Device</strong> to log in using <strong>Fingerprint, Touch ID, or Face ID</strong> (like Meezan, HBL, UBL banking apps) without typing passwords.
          </p>

          {adminTrustedDevice ? (
            <div style={{ background: 'var(--bg-surface-hover)', padding: '18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', maxWidth: '560px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"></path>
                  </svg>
                  <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.92rem' }}>
                    ✓ {adminTrustedDevice.auth_type === 'face_id' ? 'Face ID Active' : adminTrustedDevice.auth_type === 'shield_key' ? 'Device PIN Active' : 'Fingerprint Active'} ({adminTrustedDevice.device_name})
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered: {adminTrustedDevice.registered_at}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Auth Type: <code>{adminTrustedDevice.auth_type}</code>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '16px' }}>
                Linked Account: <strong>{adminTrustedDevice.email}</strong>
              </div>
              <button 
                type="button" 
                onClick={handleDisableAdminBiometric} 
                className="btn btn-secondary" 
                style={{ width: '100%', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}
              >
                Disable Biometric Security on this Device
              </button>
            </div>
          ) : (
            <div style={{ maxWidth: '440px' }}>
              <button 
                type="button" 
                onClick={handleRegisterAdminBiometric} 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <path d="m9 12 2 2 4-4"></path>
                </svg>
                <span>Enable & Trust This Device (Fingerprint / Face ID / PIN)</span>
              </button>
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
