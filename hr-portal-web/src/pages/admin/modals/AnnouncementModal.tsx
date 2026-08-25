import React from 'react';
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
  handleCreateAnnouncement,
  sortedDepartmentsList,
  designationsList,
  profiles
}) => {
  if (!isPostAnnouncementModalOpen) return null;

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
          maxWidth: '520px', 
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
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Post New Announcement
          </h3>
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

        {/* Local Draft Status */}
        {(announceTitle || announceMessage || announceTargetValue) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Draft recovered</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('draft_announcement');
                setAnnounceTitle('');
                setAnnounceMessage('');
                setAnnounceTargetValue('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Clear Draft
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={styles.formGroup}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
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
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
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

          <div style={styles.formGroup}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
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
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
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

          <div style={styles.formGroup}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Theme Color Palette *
            </label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              {['#ff3b57', '#ff8f00', '#00b8ff', '#7000ff', '#ff00a0'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAnnounceColor(color)}
                  style={{
                    width: '34px',
                    height: '34px',
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
              type="submit" 
              className="btn btn-primary" 
              style={{ flex: 1, padding: '12px', fontWeight: 700, borderRadius: 'var(--radius-sm)' }}
            >
              Publish Announcement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementModal;
