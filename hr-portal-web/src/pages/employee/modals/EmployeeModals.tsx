import React from 'react';
import type { DailySummary, EmployeeProfile, LeaveRequest } from '../../../utils/attendanceProcessor';
import type { Notification, Holiday } from '../../../lib/dbHelper';
import styles from '../EmployeeStyles';

interface EmployeeModalsProps {
  isChangePasswordModalOpen: boolean;
  setIsChangePasswordModalOpen: (open: boolean) => void;
  newPassword: string;
  setNewPassword: (p: string) => void;
  confirmPassword: string;
  setConfirmPassword: (p: string) => void;
  passwordChangeLoading: boolean;
  handleChangePassword: (e: React.FormEvent) => void;

  isLeaveModalOpen: boolean;
  setIsLeaveModalOpen: (open: boolean) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  reason: string;
  setReason: (r: string) => void;
  leaveType: 'Casual' | 'Medical' | 'Annual';
  setLeaveType: (t: 'Casual' | 'Medical' | 'Annual') => void;
  isSingleDayLeave: boolean;
  setIsSingleDayLeave: (val: boolean) => void;
  submitLoading: boolean;
  handleRequestLeave: (e: React.FormEvent) => void;

  selectedCalendarDay: DailySummary | null;
  setSelectedCalendarDay: (day: DailySummary | null) => void;
  holidaysList: Holiday[];
  allProfiles: EmployeeProfile[];
  leaveHistory: LeaveRequest[];
  isCompensationMode: boolean;
  showEmployeeSalary: boolean;
  setShowEmployeeSalary: (val: boolean) => void;
  profile: EmployeeProfile | null;
  formatSalary: (amt: number) => string;
  formatClockDuration: (hrs: number) => string;
  formatOvertimeDuration: (hrs: number) => string;
  getStatusTagStyle: (status: DailySummary['status'], isLate: boolean) => React.CSSProperties;

  showNotificationsDropdown: boolean;
  setShowNotificationsDropdown: (show: boolean) => void;
  notificationsList: Notification[];
  handleMarkAllNotificationsRead: () => void;
  handleMarkNotificationRead: (id: number, notif: Notification) => void;
}

export const EmployeeModals: React.FC<EmployeeModalsProps> = ({
  isChangePasswordModalOpen,
  setIsChangePasswordModalOpen,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordChangeLoading,
  handleChangePassword,
  isLeaveModalOpen,
  setIsLeaveModalOpen,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  reason,
  setReason,
  leaveType,
  setLeaveType,
  isSingleDayLeave,
  setIsSingleDayLeave,
  submitLoading,
  handleRequestLeave,
  selectedCalendarDay,
  setSelectedCalendarDay,
  holidaysList,
  allProfiles,
  leaveHistory,
  isCompensationMode,
  showEmployeeSalary,
  setShowEmployeeSalary,
  profile,
  formatSalary,
  formatClockDuration,
  formatOvertimeDuration,
  getStatusTagStyle,
  showNotificationsDropdown,
  setShowNotificationsDropdown,
  notificationsList,
  handleMarkAllNotificationsRead,
  handleMarkNotificationRead
}) => {
  return (
    <>
      {isChangePasswordModalOpen && (
        <div className="custom-overlay" onClick={() => { setIsChangePasswordModalOpen(false); setNewPassword(''); setConfirmPassword(''); }} style={{ zIndex: 20000 }}>
          <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Change Account Password
            </h3>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div style={styles.formGroup}>
                <label>New Password *</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Confirm Password *</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsChangePasswordModalOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordChangeLoading}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave Modal Overlay */}
      {isLeaveModalOpen && (
        <div className="custom-overlay" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="custom-dialog-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Apply for Leave
            </h3>

            {/* Leave Draft Status Indicator */}
            {(startDate || endDate || reason) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', marginTop: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Draft recovered</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('draft_leave_request');
                    setStartDate('');
                    setEndDate('');
                    setReason('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Clear Draft
                </button>
              </div>
            )}

            <form onSubmit={handleRequestLeave} style={{ ...styles.form, marginTop: '12px' }}>
              <div style={styles.formGroup}>
                <label>Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as 'Casual' | 'Medical' | 'Annual')}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Medical">Medical Leave</option>
                  <option value="Annual">Annual Leave</option>
                </select>
              </div>

              {/* Single Day Leave Toggle Option */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
                <input 
                  type="checkbox"
                  id="chkSingleDayLeave"
                  checked={isSingleDayLeave}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsSingleDayLeave(checked);
                    if (checked && startDate) {
                      setEndDate(startDate);
                    }
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="chkSingleDayLeave" style={{ margin: 0, cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Single Day Leave (1 Day) — Click once to set date
                </label>
              </div>

              <div style={styles.dateRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Start Date *</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartDate(val);
                      if (isSingleDayLeave) {
                        setEndDate(val);
                      }
                    }}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>End Date *</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isSingleDayLeave}
                    required
                    style={{
                      opacity: isSingleDayLeave ? 0.7 : 1,
                      cursor: isSingleDayLeave ? 'not-allowed' : 'pointer'
                    }}
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>Reason *</label>
                <textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State reason for leave..."
                  rows={4}
                  required
                />
              </div>

              <div style={{ ...styles.btnGroup, marginTop: '8px' }}>
                <button 
                  type="submit" 
                  disabled={submitLoading} 
                  className="btn btn-primary" 
                  style={{ flex: 1, background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600 }}
                >
                  {submitLoading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, border: '1px solid var(--border-color)', background: 'var(--bg-surface-hover)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Day Detail Modal */}
      {selectedCalendarDay && (() => {
        const holiday = holidaysList.find(h => h.date === selectedCalendarDay.date);
        const cellDob = new Date(selectedCalendarDay.date + 'T00:00:00');
        const birthdayEmployees = allProfiles.filter(p => {
          if (!p.date_of_birth) return false;
          const dob = new Date(p.date_of_birth + 'T00:00:00');
          return dob.getMonth() === cellDob.getMonth() && dob.getDate() === cellDob.getDate();
        });
        const ownLeave = leaveHistory.find(lh => {
          if (lh.status === 'Rejected') return false;
          return selectedCalendarDay.date >= lh.start_date && selectedCalendarDay.date <= lh.end_date;
        });

        const statusLabel = holiday ? `Holiday (${holiday.title})` :
                            ownLeave ? `On Leave (${ownLeave.leave_type})` :
                            selectedCalendarDay.status;

        const isHolidayOrLeave = holiday || ownLeave;

        return (
          <div className="custom-overlay" onClick={() => setSelectedCalendarDay(null)}>
            <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ padding: '24px', width: '400px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                Attendance Details
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div><strong>Date:</strong> {selectedCalendarDay.date} ({selectedCalendarDay.dayName})</div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    ...styles.statusTag,
                    background: holiday ? 'rgba(239, 68, 68, 0.15)' : ownLeave ? 'rgba(16, 185, 129, 0.15)' : getStatusTagStyle(selectedCalendarDay.status, selectedCalendarDay.isLate).backgroundColor,
                    color: holiday ? '#ef4444' : ownLeave ? '#10b981' : getStatusTagStyle(selectedCalendarDay.status, selectedCalendarDay.isLate).color
                  }}>
                    {statusLabel}
                  </span>
                </div>

                {birthdayEmployees.map(emp => (
                  <div key={emp.id} style={{ color: '#f59e0b', fontWeight: '600' }}>
                    🎂 Birthday: {emp.full_name} ({emp.department || 'Staff'})
                  </div>
                ))}

                {ownLeave && (
                  <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontWeight: '600', color: '#10b981' }}>Leave Request Details:</div>
                    <div>Status: {ownLeave.status}</div>
                    {ownLeave.reason && (
                      <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Reason: "{ownLeave.reason}"</div>
                    )}
                  </div>
                )}

                {!isHolidayOrLeave && (
                  <>
                    <div><strong>Check In:</strong> {selectedCalendarDay.checkIn || '-'}</div>
                    <div><strong>Check Out:</strong> {selectedCalendarDay.checkOut || '-'}</div>
                    <div><strong>Working Hours:</strong> {selectedCalendarDay.workingHours > 0 ? formatClockDuration(selectedCalendarDay.workingHours) : '-'}</div>
                    {isCompensationMode ? (
                      <>
                        <div><strong>Compensation Time:</strong> {selectedCalendarDay.compensatedOvertimeHours > 0 ? formatOvertimeDuration(selectedCalendarDay.compensatedOvertimeHours) : '-'}</div>
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal"><strong>Comp Payout:</strong> {selectedCalendarDay.overtimePayout > 0 ? (showEmployeeSalary ? formatSalary(selectedCalendarDay.overtimePayout) : '••••••') : '-'}</div>
                      </>
                    ) : (
                      <>
                        <div><strong>Overtime Hours:</strong> {selectedCalendarDay.overtimeHours > 0 ? formatOvertimeDuration(selectedCalendarDay.overtimeHours) : '-'}</div>
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal"><strong>Overtime Payout:</strong> {selectedCalendarDay.overtimePayout > 0 ? (showEmployeeSalary ? formatSalary(selectedCalendarDay.overtimePayout) : '••••••') : '-'}</div>
                      </>
                    )}
                    {(() => {
                      const ds = selectedCalendarDay;
                      const ded = (ds.absenceDeduction || 0) + (ds.lateDeduction || 0);
                      if (ded <= 0) return null;
                      const label = ds.absenceDeduction > 0 ? 'Absent' : (ds.isLate ? 'Late Arrival' : 'Short Time');
                      return (
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal">
                          <strong>Deduction ({label}):</strong>{' '}
                          <span style={{ color: 'var(--danger)', fontWeight: '700' }}>
                            {showEmployeeSalary ? `- ${formatSalary(ded)}` : '••••••'}
                          </span>
                        </div>
                      );
                    })()}
                    {(() => {
                      const emp = profile;
                      if (!emp || !emp.base_salary) return null;
                      const dailyBase = (emp.base_salary || 0) / 30;
                      const ds = selectedCalendarDay;
                      let dayTotal = 0;
                      if (ds.status === 'Absent' || ds.status === 'Uninformed Absent') {
                        dayTotal = Math.max(0, dailyBase - (ds.absenceDeduction || 0));
                      } else if (ds.status === 'Unprocessed') {
                        dayTotal = 0;
                      } else {
                        dayTotal = Math.max(0, dailyBase + (ds.overtimePayout || 0) - (ds.lateDeduction || 0));
                      }
                      return (
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }} title="Click to toggle reveal">
                          <strong>Particular Day Total Amount:</strong> <span style={{ color: 'var(--success)', fontWeight: '700' }}>{showEmployeeSalary ? formatSalary(dayTotal) : '••••••'}</span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              <button 
                onClick={() => setSelectedCalendarDay(null)}
                className="btn btn-primary"
                style={{ marginTop: '16px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {/* Sliding Notifications Drawer (Root-level to avoid z-index stacking issues) */}
      {showNotificationsDropdown && (
        <>
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setShowNotificationsDropdown(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 99999,
              animation: 'overlayFadeIn 0.2s ease-out'
            }}
          />
          
          {/* Sliding Drawer */}
          <div className="glass-panel animate-slide-in-right" style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '380px',
            maxWidth: '90vw',
            height: '100vh',
            overflowY: 'auto',
            zIndex: 100000,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: '0',
            borderLeft: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/icons/bell.png" alt="bell" className="theme-icon" style={{ width: '18px', height: '18px' }} />
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700' }}>Notifications</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => (window as any).enableDeviceNotifications ? (window as any).enableDeviceNotifications(true) : (window as any).showNativeNotification?.('🔔 Test Alert', 'Your desktop OS notifications are active and working!')}
                  style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer' }}
                  title="Test OS Desktop Notification"
                >
                  🔔 Test Alert
                </button>
                {notificationsList.filter(n => !n.is_read).length > 0 && (
                  <button 
                    onClick={handleMarkAllNotificationsRead}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Mark all read
                  </button>
                )}
                <button 
                  onClick={() => setShowNotificationsDropdown(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                >
                  <img src="/icons/x.png" alt="close" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            </div>

            {'Notification' in window && (window as any).Notification.permission !== 'granted' && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  🔔 Enable Phone Bar Notifications
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => (window as any).enableDeviceNotifications?.()}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Enable Now
                </button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
              {notificationsList.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: '12px', color: 'var(--text-muted)' }}>
                  <img src="/icons/check-circle.png" alt="empty" className="theme-icon" style={{ width: '36px', height: '36px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>
                    All caught up! No notifications.
                  </p>
                </div>
              ) : (
                notificationsList.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleMarkNotificationRead(n.id!, n)}
                    style={{
                      background: n.is_read ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${n.is_read ? 'var(--border-color)' : 'var(--border-color-glow)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      transition: 'all var(--transition-fast)'
                    }}
                    className="dropdown-item-hover"
                  >
                    {!n.is_read && (
                      <span style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444'
                      }} />
                    )}
                    <div style={{ fontWeight: n.is_read ? '500' : '700', fontSize: '0.85rem', color: 'var(--text-primary)', paddingRight: '12px' }}>{n.title}</div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.message}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                      {new Date(n.created_at || '').toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default EmployeeModals;
