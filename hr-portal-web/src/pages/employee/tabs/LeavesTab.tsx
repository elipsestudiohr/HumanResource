import React from 'react';
import type { LeaveRequest } from '../../../utils/attendanceProcessor';
import CollapsibleCard from '../../../components/CollapsibleCard';
import styles from '../EmployeeStyles';

import type { Holiday } from '../../../lib/dbHelper';

interface LeavesTabProps {
  leaveBalance: any | null;
  setIsLeaveModalOpen: (open: boolean) => void;
  leaveHistory: LeaveRequest[];
  hiddenLeaveIds: number[];
  selectedLeaveIds: number[];
  setSelectedLeaveIds: React.Dispatch<React.SetStateAction<number[]>>;
  handleDeleteLeaveRequests: (ids: number[]) => void;
  holidaysList: Holiday[];
}

export const LeavesTab: React.FC<LeavesTabProps> = ({
  leaveBalance,
  setIsLeaveModalOpen,
  leaveHistory,
  hiddenLeaveIds,
  selectedLeaveIds,
  setSelectedLeaveIds,
  handleDeleteLeaveRequests,
  holidaysList
}) => {
  return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }} className="animate-fade-in">
          {/* Leave Balances */}
          <CollapsibleCard 
            title="Available Leave Balances" 
            style={{ width: '100%' }}
            actionButton={
              <button 
                onClick={() => setIsLeaveModalOpen(true)}
                className="btn btn-primary leave-apply-btn"
                style={{ 
                  fontWeight: 600, 
                  padding: '8px 16px', 
                  fontSize: '0.85rem', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <img
                  src="/icons/leave.png"
                  alt="Leave"
                  className="leave-button-icon"
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                />
                <span>Apply for Leave</span>
              </button>
            }
          >
            <div style={styles.balancesGrid}>
              <div className="glass-panel" style={styles.balanceCard}>
                <div style={styles.balanceHeader}>
                  <span style={styles.balanceType}>Casual Leaves</span>
                  <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.casual_total - leaveBalance.casual_used : 10} Left</span>
                </div>
                <div style={styles.balanceProgressBg}>
                  <div 
                    style={{
                      ...styles.balanceProgressBar, 
                      backgroundColor: 'var(--primary)',
                      width: `${leaveBalance ? ((leaveBalance.casual_total - leaveBalance.casual_used) / leaveBalance.casual_total) * 100 : 100}%`
                    }}
                  ></div>
                </div>
                <small style={styles.balanceSub}>Used: {leaveBalance?.casual_used || 0} / Total: {leaveBalance?.casual_total || 10}</small>
              </div>

              <div className="glass-panel" style={styles.balanceCard}>
                <div style={styles.balanceHeader}>
                  <span style={styles.balanceType}>Medical Leaves</span>
                  <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.medical_total - leaveBalance.medical_used : 10} Left</span>
                </div>
                <div style={styles.balanceProgressBg}>
                  <div 
                    style={{
                      ...styles.balanceProgressBar, 
                      backgroundColor: 'var(--accent)',
                      width: `${leaveBalance ? ((leaveBalance.medical_total - leaveBalance.medical_used) / leaveBalance.medical_total) * 100 : 100}%`
                    }}
                  ></div>
                </div>
                <small style={styles.balanceSub}>Used: {leaveBalance?.medical_used || 0} / Total: {leaveBalance?.medical_total || 10}</small>
              </div>

              <div className="glass-panel" style={styles.balanceCard}>
                <div style={styles.balanceHeader}>
                  <span style={styles.balanceType}>Annual Leaves</span>
                  <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.annual_total - leaveBalance.annual_used : 10} Left</span>
                </div>
                <div style={styles.balanceProgressBg}>
                  <div 
                    style={{
                      ...styles.balanceProgressBar, 
                      backgroundColor: 'var(--success)',
                      width: `${leaveBalance ? ((leaveBalance.annual_total - leaveBalance.annual_used) / leaveBalance.annual_total) * 100 : 100}%`
                    }}
                  ></div>
                </div>
                <small style={styles.balanceSub}>Used: {leaveBalance?.annual_used || 0} / Total: {leaveBalance?.annual_total || 10}</small>
              </div>
            </div>
          </CollapsibleCard>

          {/* Leave History Table */}
          <CollapsibleCard title="Leave Application History" style={{ width: '100%' }}>
            {(() => {
              const visibleLeaves = leaveHistory.filter(l => !hiddenLeaveIds.includes(l.id));
              const pendingLeaves = visibleLeaves.filter(l => l.status === 'Pending');
              const allSelected = pendingLeaves.length > 0 && pendingLeaves.every(l => selectedLeaveIds.includes(l.id));

              const toggleSelectAll = () => {
                if (allSelected) {
                  setSelectedLeaveIds([]);
                } else {
                  setSelectedLeaveIds(pendingLeaves.map(l => l.id));
                }
              };

              const toggleSelectLeave = (id: number) => {
                setSelectedLeaveIds(prev => 
                  prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                );
              };

              return (
                <>
                  {selectedLeaveIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>
                        {selectedLeaveIds.length} pending leave request(s) selected
                      </span>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDeleteLeaveRequests(selectedLeaveIds)}
                        style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Cancel Selected ({selectedLeaveIds.length})
                      </button>
                    </div>
                  )}

                  <div style={styles.tableContainer} className="table-slider-container">
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              disabled={pendingLeaves.length === 0}
                              title="Select All Pending"
                              style={{ cursor: pendingLeaves.length > 0 ? 'pointer' : 'default' }}
                            />
                          </th>
                          <th>Applied At</th>
                          <th>Leave Type</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Days</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center', width: '70px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleLeaves.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No leave requests found.
                            </td>
                          </tr>
                        ) : (
                          visibleLeaves.map((leave) => {
                            const getLeaveDaysCount = (startStr: string, endStr: string) => {
                              const start = new Date(startStr + 'T00:00:00');
                              const end = new Date(endStr + 'T00:00:00');
                              let count = 0;
                              const loop = new Date(start);
                              const holidayDates = holidaysList.map(h => h.date);
                              while (loop <= end) {
                                const pad = (n: number) => n.toString().padStart(2, '0');
                                const curStr = `${loop.getFullYear()}-${pad(loop.getMonth() + 1)}-${pad(loop.getDate())}`;
                                const dayOfWeek = loop.getDay();
                                const isSun = dayOfWeek === 0;
                                
                                const dayOfMonth = loop.getDate();
                                const weekNum = Math.ceil(dayOfMonth / 7);
                                const offSat = dayOfWeek === 6 && (weekNum === 1 || weekNum === 3 || weekNum === 5);
                                
                                const isHoliday = holidayDates.includes(curStr);
                                
                                if (!isSun && !offSat && !isHoliday) {
                                  count++;
                                }
                                loop.setDate(loop.getDate() + 1);
                              }
                              return count;
                            };
                            const days = getLeaveDaysCount(leave.start_date, leave.end_date);
                            const isPending = leave.status === 'Pending';
                            const isSelected = selectedLeaveIds.includes(leave.id);

                            return (
                              <tr key={leave.id} style={{ ...styles.tableRow, background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                                <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                                  {isPending ? (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelectLeave(leave.id)}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                  )}
                                </td>
                                <td style={{ ...styles.tableCell, fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                  {(leave.created_at || leave.requested_at) ? new Date(leave.created_at || leave.requested_at || '').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                </td>
                                <td style={{ ...styles.tableCell, fontWeight: '600' }}>{leave.leave_type} Leave</td>
                                <td style={styles.tableCell}>{leave.start_date}</td>
                                <td style={styles.tableCell}>{leave.end_date}</td>
                                <td style={styles.tableCell}>{days}</td>
                                <td style={styles.tableCell}>{leave.reason || '-'}</td>
                                <td style={styles.tableCell}>
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    background: leave.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : leave.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: leave.status === 'Approved' ? '#10b981' : leave.status === 'Rejected' ? '#ef4444' : '#f59e0b'
                                  }}>
                                    {leave.status}
                                  </span>
                                </td>
                                <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                                  {isPending ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLeaveRequests([leave.id])}
                                      title="Cancel Leave Request"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                                    >
                                      🗑️
                                    </button>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </CollapsibleCard>
        </div>
  );
};

export default LeavesTab;
