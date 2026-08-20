import React from 'react';
import type { DeviceSettings } from '../../../lib/dbHelper';
import type { TrustedDeviceRecord } from '../../../utils/biometricAuth';
import styles from '../AdminStyles';

interface DeviceTabProps {
  deviceSettings: DeviceSettings;
  handleSaveDeviceSettings: (e: React.FormEvent) => void;
  editDeviceIp: string;
  setEditDeviceIp: (val: string) => void;
  editDevicePort: number;
  setEditDevicePort: (val: number) => void;
  editDeviceInterval: number;
  setEditDeviceInterval: (val: number) => void;
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
  editDeviceIp,
  setEditDeviceIp,
  editDevicePort,
  setEditDevicePort,
  editDeviceInterval,
  setEditDeviceInterval,
  adminTrustedDevice,
  handleDisableAdminBiometric,
  handleRegisterAdminBiometric,
  fileInputRef,
  handleFileUpload,
  processMultipleFiles,
  uploadStatus
}) => {
  return (
    <div style={styles.splitLayout} className="animate-fade-in">
      {/* Left panel: Edit settings and status */}
      <div className="glass-panel" style={{...styles.panel, flex: 2, padding: '24px'}}>
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
            Save Device Configuration
          </button>
        </form>

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
