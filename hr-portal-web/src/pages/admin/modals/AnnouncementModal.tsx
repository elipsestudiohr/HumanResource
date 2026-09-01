import React from 'react';
import type { Announcement } from '../../../lib/dbHelper';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import styles, { getModalOverlayStyle } from '../AdminStyles';

interface AnnouncementModalProps {
  isPostAnnouncementModalOpen: boolean;
  setIsPostAnnouncementModalOpen: (open: boolean) => void;
  announceTitle: string;
  setAnnounceTitle: (val: string) => void;
  announceMessage: string;
  setAnnounceMessage: (val: string) => void;
  announceTargetType: 'all' | 'department' | 'designation' | 'employee';
  setAnnounceTargetType: (val: 'all' | 'department' | 'designation' | 'employee') => void;
  announceTargetValue: string;
  setAnnounceTargetValue: (val: string) => void;
  announceColor: string;
  setAnnounceColor: (val: string) => void;
  announceScheduleFrom: string;
  setAnnounceScheduleFrom: (val: string) => void;
  announceDisposeAt: string;
  setAnnounceDisposeAt: (val: string) => void;
  announceStatus: 'Active' | 'Disposed';
  setAnnounceStatus: (val: 'Active' | 'Disposed') => void;
  editingAnnouncement: Announcement | null;
  handleCreateAnnouncement: (e: React.FormEvent) => void;
  sortedDepartmentsList: string[];
  designationsList: string[];
  profiles: EmployeeProfile[];
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isPostAnnouncementModalOpen,
  setIsPostAnnouncementModalOpen,
  announceTitle,
  setAnnounceTitle,
  announceMessage,
  setAnnounceMessage,
  announceTargetType,
  setAnnounceTargetType,
  announceTargetValue,
  setAnnounceTargetValue,
  announceColor,
  setAnnounceColor,
  announceScheduleFrom,
  setAnnounceScheduleFrom,
  announceDisposeAt,
  setAnnounceDisposeAt,
  announceStatus,
  setAnnounceStatus,
  editingAnnouncement,
  handleCreateAnnouncement,
  sortedDepartmentsList,
  designationsList,
  profiles
}) => {
  if (!isPostAnnouncementModalOpen) return null;

  const isEditing = Boolean(editingAnnouncement);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateAnnouncement(e);
    setIsPostAnnouncementModalOpen(false);
  };

  return (
    <div 
      className="custom-overlay" 
      onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
      onClick={e => { 
        if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
          setIsPostAnnouncementModalOpen(false); 
        }
      }}
      style={getModalOverlayStyle(11000)}
    >
      <div 
        className="custom-dialog-card glass-panel" 
        onMouseDown={e => e.stopPropagation()} 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '560px', 
          width: '92%', 
          maxHeight: '88vh', 
          overflowY: 'auto', 
          textAlign: 'left', 
          alignItems: 'stretch', 
          padding: '24px 28px',
          borderRadius: 'var(--radius-md, 16px)',
          boxSizing: 'border-box'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src={isEditing ? "/icons/edit.png" : "/icons/info.png"} 
              alt="announcement" 
              className="theme-icon" 
              style={{ width: '18px', height: '18px' }} 
            />
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEditing ? 'Edit Announcement' : 'Post New Announcement'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsPostAnnouncementModalOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              lineHeight: 1
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Local Draft Status (Only in Create Mode) */}
        {!isEditing && (announceTitle || announceMessage || announceTargetValue) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Draft recovered</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('draft_announcement');
                setAnnounceTitle('');
                setAnnounceMessage('');
                setAnnounceTargetValue('');
                setAnnounceScheduleFrom('');
                setAnnounceDisposeAt('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Clear Draft
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={styles.formGroup}>
            <label style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Announcement Title *
            </label>
            <input
              type="text"
              value={announceTitle}
              onChange={e => setAnnounceTitle(e.target.value)}
              placeholder="e.g. Eid Holidays Office Closure"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Message Content *
            </label>
            <textarea
              value={announceMessage}
              onChange={e => setAnnounceMessage(e.target.value)}
              placeholder="Type the message for employees..."
              rows={4}
              style={{ ...styles.input, resize: 'vertical' }}
              required
            />
          </div>

          {/* Target Audience Row */}
          <div style={{ display: 'grid', gridTemplateColumns: announceTargetType !== 'all' ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <div style={styles.formGroup}>
              <label style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Target Audience
              </label>
              <select
                value={announceTargetType}
                onChange={e => {
                  setAnnounceTargetType(e.target.value as any);
                  setAnnounceTargetValue('');
                }}
                className="custom-select"
                style={styles.input}
              >
                <option value="all">All Employees</option>
                <option value="department">Specific Department</option>
                <option value="designation">Specific Designation</option>
                <option value="employee">Specific Employee</option>
              </select>
            </div>

            {announceTargetType !== 'all' && (
              <div style={styles.formGroup}>
                <label style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Select {
                    announceTargetType === 'department' ? 'Department' : 
                    announceTargetType === 'designation' ? 'Designation' : 'Employee'
                  } *
                </label>
                <select
                  value={announceTargetValue}
                  onChange={e => setAnnounceTargetValue(e.target.value)}
                  className="custom-select"
                  style={styles.input}
                  required
                >
                  <option value="">
                    -- Choose {
                      announceTargetType === 'department' ? 'Department' : 
                      announceTargetType === 'designation' ? 'Designation' : 'Employee'
                    } --
                  </option>
                  {announceTargetType === 'department' && sortedDepartmentsList.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                  {announceTargetType === 'designation' && designationsList.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                  {announceTargetType === 'employee' && profiles.filter(p => p.role !== 'admin').map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.pin})</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Scheduling & Auto-Dispose Options */}
          <div style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <img src="/icons/clock.png" alt="schedule" className="theme-icon" style={{ width: '14px', height: '14px' }} />
              <span>Schedule & Auto-Dispose Controls</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={styles.formGroup}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Schedule Start (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={announceScheduleFrom}
                  onChange={e => setAnnounceScheduleFrom(e.target.value)}
                  style={{ ...styles.input, fontSize: '0.82rem' }}
                  title="Leave empty to publish immediately"
                />
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Leave empty to show immediately
                </span>
              </div>

              <div style={styles.formGroup}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Auto-Dispose / Hide (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={announceDisposeAt}
                  onChange={e => setAnnounceDisposeAt(e.target.value)}
                  style={{ ...styles.input, fontSize: '0.82rem' }}
                  title="Leave empty to keep until manually disposed"
                />
                <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Hides from portal after this time
                </span>
              </div>
            </div>

            {isEditing && (
              <div style={styles.formGroup}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Announcement Status
                </label>
                <select
                  value={announceStatus}
                  onChange={e => setAnnounceStatus(e.target.value as any)}
                  className="custom-select"
                  style={{ ...styles.input, fontSize: '0.82rem' }}
                >
                  <option value="Active">Active (Visible to target audience)</option>
                  <option value="Disposed">Disposed (Hidden from portal, kept for records)</option>
                </select>
              </div>
            )}
          </div>

          {/* Color Palette */}
          <div style={styles.formGroup}>
            <label style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Theme Color Palette
            </label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              {['#ff3b57', '#ff8f00', '#00b8ff', '#7000ff', '#ff00a0', '#10b981'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAnnounceColor(color)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: announceColor === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                    boxShadow: announceColor === color ? `0 0 10px ${color}` : 'none',
                    cursor: 'pointer',
                    transform: announceColor === color ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.15s ease'
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setIsPostAnnouncementModalOpen(false)}
              className="btn btn-secondary"
              style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '12px', fontWeight: 700, borderRadius: 'var(--radius-sm)' }}
            >
              {isEditing ? 'Update Announcement' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementModal;
