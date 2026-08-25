import React from 'react';
import type { Announcement } from '../../../lib/dbHelper';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import styles from '../AdminStyles';

interface AnnouncementsTabProps {
  announcementsList: Announcement[];
  handleDeleteAnnouncement: (id: number) => void;
  setIsPostAnnouncementModalOpen: (open: boolean) => void;
  profiles: EmployeeProfile[];
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  announcementsList,
  handleDeleteAnnouncement,
  setIsPostAnnouncementModalOpen,
  profiles
}) => {
  return (
    <div style={{ ...styles.dashboardContent, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Announcements</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Broadcast important updates, office closures, and company notifications to employees.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsPostAnnouncementModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, cursor: 'pointer', border: 'none' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Post New Announcement</span>
        </button>
      </div>

      {/* Active announcements list (Full Width) */}
      <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ margin: 0, marginBottom: '16px', fontSize: '1.05rem', color: 'var(--text-primary)' }}>Published Announcements</h4>
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
                    No announcements posted yet. Click "Post New Announcement" to broadcast one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsTab;
