import React from 'react';
import type { Announcement } from '../../../lib/dbHelper';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import styles from '../AdminStyles';

interface AnnouncementsTabProps {
  announcementsList: Announcement[];
  handleDeleteAnnouncement: (id: number) => void;
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

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  announcementsList,
  handleDeleteAnnouncement,
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
  return (
    <div style={{ ...styles.dashboardContent, display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', width: '100%' }} className="animate-fade-in">
      {/* Active announcements list */}
      <div className="glass-panel" style={{ ...styles.panel, flex: 2, padding: '24px' }}>
        <h3 style={{ margin: 0, marginBottom: '16px' }}>Published Announcements</h3>
        <div style={styles.tableContainer} className="table-slider-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Announcement Title</th>
                <th>Message</th>
                <th>Target Audience</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {announcementsList.length > 0 ? (
                announcementsList.map(ann => (
                  <tr key={ann.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>{new Date(ann.created_at || '').toLocaleDateString()}</td>
                    <td style={styles.tableCell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: ann.color || '#ff3b57',
                          display: 'inline-block',
                          boxShadow: `0 0 8px ${ann.color || '#ff3b57'}`
                        }} />
                        <strong>{ann.title}</strong>
                      </div>
                    </td>
                    <td style={styles.tableCell}>{ann.message}</td>
                    <td style={styles.tableCell}>
                      <span style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        background: ann.target_type === 'all' ? 'rgba(255,255,255,0.06)' : ann.target_type === 'department' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: ann.target_type === 'all' ? 'var(--text-primary)' : ann.target_type === 'department' ? '#10b981' : '#f59e0b'
                      }}>
                        {(() => {
                          if (ann.target_type === 'all') return 'All Employees';
                          if (ann.target_type === 'department') return `Dept: ${ann.target_value}`;
                          if (ann.target_type === 'designation') return `Role: ${ann.target_value}`;
                          if (ann.target_type === 'employee') {
                            const emp = profiles.find(p => p.id === ann.target_value || p.pin === ann.target_value || p.email === ann.target_value);
                            if (emp) {
                              return `Employee: ${emp.full_name || emp.email}${emp.pin ? ` (${emp.pin})` : ''}`;
                            }
                            return `Employee: ${ann.target_value}`;
                          }
                          return `${ann.target_type}: ${ann.target_value}`;
                        })()}
                      </span>
                    </td>
                    <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDeleteAnnouncement(ann.id!)} 
                        className="btn btn-secondary"
                        style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
                        title="Delete Announcement"
                      >
                        <img 
                          src="/icons/trash.png" 
                          alt="delete" 
                          className="theme-icon" 
                          style={{ width: '16px', height: '16px' }} 
                        />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No announcements posted yet. Use the form on the right to post one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Post announcement form */}
      <div className="glass-panel" style={{ ...styles.panel, flex: 1, padding: '24px' }}>
        <h3 style={{ margin: 0, marginBottom: '16px' }}>Post New Announcement</h3>

        {/* Local Draft Status */}
        {(announceTitle || announceMessage || announceTargetValue) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Draft recovered</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('draft_announcement');
                setAnnounceTitle('');
                setAnnounceMessage('');
                setAnnounceTargetValue('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Clear Draft
            </button>
          </div>
        )}

        <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={styles.formGroup}>
            <label>Announcement Title *</label>
            <input
              type="text"
              value={announceTitle}
              onChange={e => setAnnounceTitle(e.target.value)}
              placeholder="e.g. Eid Holidays Office Closure"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label>Message Content *</label>
            <textarea
              value={announceMessage}
              onChange={e => setAnnounceMessage(e.target.value)}
              placeholder="Type the message for employees..."
              rows={5}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label>Target Audience</label>
            <select
              value={announceTargetType}
              onChange={e => {
                setAnnounceTargetType(e.target.value as any);
                setAnnounceTargetValue('');
              }}
              className="custom-select"
            >
              <option value="all">All Employees</option>
              <option value="department">Specific Department</option>
              <option value="designation">Specific Designation</option>
              <option value="employee">Specific Employee</option>
            </select>
          </div>

          {announceTargetType !== 'all' && (
            <div style={styles.formGroup}>
              <label>
                Select {
                  announceTargetType === 'department' ? 'Department' : 
                  announceTargetType === 'designation' ? 'Designation' : 'Employee'
                } *
              </label>
              <select
                value={announceTargetValue}
                onChange={e => setAnnounceTargetValue(e.target.value)}
                className="custom-select"
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
            <label>Theme Color Palette *</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              {['#ff3b57', '#ff8f00', '#00b8ff', '#7000ff', '#ff00a0'].map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAnnounceColor(color)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: announceColor === color ? '3px solid var(--text-primary)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    transform: announceColor === color ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.1s'
                  }}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', fontWeight: 600, backgroundColor: announceColor }}>
            Publish Announcement
          </button>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementsTab;
