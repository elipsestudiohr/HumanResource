import React from 'react';
import type { Announcement } from '../../../lib/dbHelper';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import ExpandableText from '../ExpandableText';
import styles from '../AdminStyles';

interface AnnouncementsTabProps {
  announcementsList: Announcement[];
  handleDeleteAnnouncement: (id: number) => void;
  handleOpenEditAnnouncement: (ann: Announcement) => void;
  handleDisposeAnnouncement: (id: number) => void;
  handleReactivateAnnouncement: (id: number) => void;
  handleOpenCreateAnnouncement: () => void;
  profiles: EmployeeProfile[];
}

export const AnnouncementsTab: React.FC<AnnouncementsTabProps> = ({
  announcementsList,
  handleDeleteAnnouncement,
  handleOpenEditAnnouncement,
  handleDisposeAnnouncement,
  handleReactivateAnnouncement,
  handleOpenCreateAnnouncement,
  profiles
}) => {
  return (
    <div style={{ ...styles.dashboardContent, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Announcements</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Broadcast important updates, schedule future releases, and manage auto-disposed or archived notices.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateAnnouncement}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>Company Announcements ({announcementsList.length})</h4>
        </div>
        <div style={styles.tableContainer} className="table-slider-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Announcement Title</th>
                <th>Message</th>
                <th>Schedule & Dispose</th>
                <th>Target Audience</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcementsList.length > 0 ? (
                announcementsList.map(ann => {
                  const now = new Date();
                  const isExplicitlyDisposed = ann.status === 'Disposed';
                  const isAutoExpired = Boolean(ann.dispose_at && new Date(ann.dispose_at) <= now);
                  const isDisposed = isExplicitlyDisposed || isAutoExpired;
                  const isScheduled = !isDisposed && Boolean(ann.schedule_from && new Date(ann.schedule_from) > now);

                  return (
                    <tr key={ann.id} style={{ ...styles.tableRow, opacity: isDisposed ? 0.72 : 1 }}>
                      <td style={styles.tableCell}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Date(ann.created_at || '').toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(ann.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
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
                          <strong style={{ color: isDisposed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                            {ann.title}
                          </strong>
                        </div>
                      </td>
                      <td style={{ ...styles.tableCell, maxWidth: '380px' }}>
                        <ExpandableText text={ann.message} maxLength={45} />
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>From: </span>
                            <span style={{ fontWeight: ann.schedule_from ? 600 : 400, color: ann.schedule_from ? 'var(--primary)' : 'var(--text-secondary)' }}>
                              {ann.schedule_from ? new Date(ann.schedule_from).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Immediate'}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Until: </span>
                            <span style={{ fontWeight: ann.dispose_at ? 600 : 400, color: ann.dispose_at ? (isAutoExpired ? 'var(--danger)' : '#f59e0b') : 'var(--text-secondary)' }}>
                              {ann.dispose_at ? new Date(ann.dispose_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Manual Dispose'}
                            </span>
                          </div>
                        </div>
                      </td>
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
                      <td style={styles.tableCell}>
                        {isDisposed ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(107, 114, 128, 0.15)',
                            color: '#9ca3af',
                            border: '1px solid rgba(107, 114, 128, 0.3)'
                          }}>
                            {isAutoExpired ? 'Auto-Disposed' : 'Disposed'}
                          </span>
                        ) : isScheduled ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)'
                          }}>
                            Scheduled
                          </span>
                        ) : (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            Active
                          </span>
                        )}
                      </td>
                      <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditAnnouncement(ann)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Edit & Update Announcement"
                          >
                            <img 
                              src="/icons/edit.png" 
                              alt="edit" 
                              className="theme-icon" 
                              style={{ width: '14px', height: '14px' }} 
                            />
                            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Edit</span>
                          </button>

                          {/* Dispose / Reactivate Button */}
                          {isDisposed ? (
                            <button
                              type="button"
                              onClick={() => handleReactivateAnnouncement(ann.id!)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Reactivate Announcement (Show to employees)"
                            >
                              <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Reactivate</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDisposeAnnouncement(ann.id!)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 8px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              title="Dispose Announcement (Hide from employees without deleting)"
                            >
                              <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Dispose</span>
                            </button>
                          )}

                          {/* Delete Button */}
                          <button 
                            type="button"
                            onClick={() => handleDeleteAnnouncement(ann.id!)} 
                            className="btn btn-secondary"
                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Permanently Delete Announcement"
                          >
                            <img 
                              src="/icons/trash.png" 
                              alt="delete" 
                              className="theme-icon" 
                              style={{ width: '15px', height: '15px' }} 
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
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
