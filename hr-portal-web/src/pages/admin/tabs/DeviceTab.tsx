import React from 'react';
import type { DeviceSettings } from '../../../lib/dbHelper';
import type { TrustedDeviceRecord } from '../../../utils/biometricAuth';
import styles from '../AdminStyles';

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

  return (
    <div style={styles.splitLayout} className="animate-fade-in">
      {/* Left panel: Edit settings, Notifications Control, and status */}
      <div className="glass-panel" style={{...styles.panel, flex: 2, padding: '24px'}}>
        
        {/* Global Master Notification Control */}
        <div style={{
          background: isMuted 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(220, 38, 38, 0.06))' 
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06))',
          border: isMuted ? '1.5px solid rgba(239, 68, 68, 0.35)' : '1.5px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 'var(--radius-md, 12px)',
          padding: '18px 20px',
          marginBottom: '28px',
          boxShadow: isMuted ? '0 4px 20px rgba(239, 68, 68, 0.08)' : '0 4px 20px rgba(16, 185, 129, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src="/icons/bell.png" 
                  alt="notifications" 
                  className="theme-icon" 
                  style={{ 
                    width: '22px', 
                    height: '22px',
                    filter: isMuted ? 'grayscale(100%) opacity(0.6)' : 'none'
                  }} 
                />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  System Notification Master Switch
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isMuted ? '#ef4444' : '#10b981',
                    boxShadow: isMuted ? '0 0 8px #ef4444' : '0 0 8px #10b981'
                  }}></span>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: isMuted ? '#ef4444' : '#10b981'
                  }}>
                    {isMuted ? 'Globally Muted (Silent Mode)' : 'Notifications Active (Live Delivery)'}
                  </span>
                </div>
              </div>
            </div>

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

          <p style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            margin: '12px 0 0 0',
            lineHeight: 1.45,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '10px'
          }}>
            {isMuted 
              ? 'All system notifications are currently silenced. No sound chimes, in-app banners, or lock-screen push alerts will be sent to any employee or admin device.' 
              : 'Notifications are working normally. Employees and admins receive instant real-time sound chimes, lock-screen pushes, and in-app banners.'}
          </p>
        </div>

        <h3>ZKTeco K40 Device Settings</h3>
        
        {/* Status section */}
        <div style={{...styles.syncInfoBox, marginBottom: '24px'}}>
          <div style={styles.syncIndicator}>
            <div style={{
              ...styles.activeDot,
              background: deviceSettings.status === 'Online' || deviceSettings.status === 'System Online' ? 'var(--success)' : '#9ca3af'
            }}></div>
            <strong>Device Status: {deviceSettings.status || 'Offline'}</strong>
          </div>
          <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px'}}>
            The Node.js synchronization agent connects locally to the reader over TCP/IP and writes new punches to Supabase.
          </p>
          
          <div style={{...styles.infoBullets, marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '20px'}}>
            <div>
              <img src="/icons/info.png" alt="info" className="theme-icon" style={{ width: '16px', height: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
              Last Connection State: <code>{deviceSettings.last_connection_state || 'Unknown'}</code>
            </div>
            <div>
              <img src="/icons/info.png" alt="info" className="theme-icon" style={{ width: '16px', height: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
              Last Successful Sync: <code>{deviceSettings.last_sync ? new Date(deviceSettings.last_sync).toLocaleString() : 'Never'}</code>
            </div>
          </div>
        </div>

        {/* Edit settings form */}
        <form onSubmit={handleSaveDeviceSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
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
            style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, border: 'none', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '8px' }}
          >
            Save Configuration
          </button>
        </form>

        {/* Automated Daily Database Backup Card */}
        <div style={{
          background: editAutoBackupEnabled 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.06))' 
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02))',
          border: editAutoBackupEnabled ? '1.5px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md, 12px)',
          padding: '20px',
          marginTop: '28px',
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
                <img 
                  src="/icons/save.png" 
                  alt="backup" 
                  className="theme-icon" 
                  style={{ 
                    width: '22px', 
                    height: '22px',
                    filter: editAutoBackupEnabled ? 'none' : 'grayscale(100%) opacity(0.6)'
                  }} 
                />
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
              <img src="/icons/info.png" alt="info" className="theme-icon" style={{ width: '14px', height: '14px' }} />
              Last Backup Completed: <strong>{new Date(deviceSettings.last_backup_time).toLocaleString()}</strong>
            </div>
          )}

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

        {/* Trusted Device & Biometrics Card */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span>Device Authentication</span>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              Trusted Device & Biometric Security
            </h4>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
            Register this device as a <strong>Trusted Device</strong> to log in using <strong>Fingerprint, Touch ID, or Face ID</strong> (like Meezan, HBL, UBL banking apps) without typing passwords.
          </p>

          {adminTrustedDevice ? (
            <div style={{ background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img
                    src={adminTrustedDevice.icon_path || '/icons/fingerprint.svg'}
                    alt={adminTrustedDevice.auth_type}
                    className="theme-icon"
                    style={{ width: '20px', height: '20px' }}
                  />
                  <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.88rem' }}>
                    ✓ {adminTrustedDevice.auth_type === 'face_id' ? 'Face ID Active' : adminTrustedDevice.auth_type === 'shield_key' ? 'Device PIN Active' : 'Fingerprint Active'} ({adminTrustedDevice.device_name})
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registered: {adminTrustedDevice.registered_at}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Icon File: <code>{adminTrustedDevice.icon_name || 'fingerprint.svg'}</code>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '12px' }}>
                Linked Account: <strong>{adminTrustedDevice.email}</strong>
              </div>
              <button 
                type="button" 
                onClick={handleDisableAdminBiometric} 
                className="btn btn-secondary" 
                style={{ width: '100%', fontSize: '0.82rem', color: 'var(--danger)' }}
              >
                Disable Biometric Security on this Device
              </button>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={handleRegisterAdminBiometric} 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>Enable & Trust This Device (Fingerprint / Face ID / PIN)</span>
            </button>
          )}
        </div>
      </div>

      {/* Right panel: File upload fallback */}
      <div className="glass-panel" style={{...styles.panel, flex: 1}}>
        <h3>Manual File Upload (USB Fallback)</h3>
        <div style={styles.uploadBox}>
          <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4'}}>
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
            <img 
              src="/icons/upload.png" 
              alt="Upload" 
              className="theme-icon" 
              style={{ width: '36px', height: '36px', marginBottom: '10px' }} 
            />
            <span>Drag & Drop or Click to Select File</span>
            <small>Accepts Excel (.xls, .xlsx), attlog.dat, CSV, or Text</small>
          </div>

          <input 
            type="file" 
            ref={fileInputRef as any} 
            onChange={handleFileUpload} 
            style={{display: 'none'}} 
            accept=".xls,.xlsx,.dat,.txt,.csv"
            multiple
          />

          {uploadStatus && (
            <div style={styles.statusBox}>
              <img 
                src="/icons/info.png" 
                alt="info" 
                className="theme-icon" 
                style={{ width: '16px', height: '16px', marginRight: '6px' }} 
              />
              <span>{uploadStatus}</span>
            </div>
          )}

          <div style={styles.alertBox}>
            <img 
              src="/icons/alert.png" 
              alt="Warning" 
              className="theme-icon" 
              style={{ width: '18px', height: '18px', marginRight: '6px' }} 
            />
            <span>Ensure employee IDs in the machine match PIN IDs in the profile settings.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceTab;
