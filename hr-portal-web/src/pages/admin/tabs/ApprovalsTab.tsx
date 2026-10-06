import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Complaint, EmployeeLoan, Holiday } from '../../../lib/dbHelper';
import { isOffSaturday, type LeaveRequest, type EmployeeProfile } from '../../../utils/attendanceProcessor';
import ExpandableText from '../ExpandableText';
import MonthlyHistoryFilter, { matchesMonthKey, getCurrentMonthKey } from '../../../components/MonthlyHistoryFilter';
import styles from '../AdminStyles';

interface ApprovalsTabProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  approvalsSubTab: 'leaves' | 'complaints' | 'loans';
  setApprovalsSubTab: (subTab: 'leaves' | 'complaints' | 'loans') => void;
  leaveRequests: LeaveRequest[];
  complaintsList: Complaint[];
  employeeLoansList: EmployeeLoan[];
  selectedAdminLeaveIds: number[];
  setSelectedAdminLeaveIds: React.Dispatch<React.SetStateAction<number[]>>;
  handleAdminDeleteLeaveRequests: (ids: number[]) => void;
  handleLeaveStatusChange: (id: number, status: 'Approved' | 'Rejected' | 'Pending') => void;
  profiles: EmployeeProfile[];
  holidaysList: Holiday[];
  leaveBalanceSearchQuery: string;
  setLeaveBalanceSearchQuery: (q: string) => void;
  leaveBalancesList: any[];
  handleOpenLeaveBalanceAdjustment: (emp: EmployeeProfile) => void;
  selectedAdminComplaintIds: number[];
  setSelectedAdminComplaintIds: React.Dispatch<React.SetStateAction<number[]>>;
  handleAdminDeleteComplaints: (ids: number[]) => void;
  handleUpdateComplaintStatus: (id: number, status: 'Open' | 'In Progress' | 'Resolved' | 'Ignored' | 'Rejected') => void;
  handleApproveAttendanceCorrection: (c: Complaint) => void;
  setEditingCorrectionComplaint: (c: Complaint | null) => void;
  setEditCorrectionDate: (d: string) => void;
  setEditCorrectionCheckIn: (t: string) => void;
  setEditCorrectionCheckOut: (t: string) => void;
  handleOpenApproveLoanModal: (l: EmployeeLoan) => void;
  handleOpenModifyLoanModal: (l: EmployeeLoan) => void;
  handleRevertLoan?: (l: EmployeeLoan) => void;
  handleCompleteLoan?: (loan: EmployeeLoan) => void;
  handleRejectLoan: (l: EmployeeLoan) => void;
  handleDeleteLoanRecord: (id: number) => void;
  setPaymentLoan: (l: EmployeeLoan | null) => void;
  setPaymentAmount: (amt: string) => void;
  handleSkipMonth: (l: EmployeeLoan) => void;
  handleOpenWhatsApp?: (p: EmployeeProfile) => void;
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({
  activeTab,
  setActiveTab,
  approvalsSubTab,
  setApprovalsSubTab,
  leaveRequests,
  complaintsList,
  employeeLoansList,
  selectedAdminLeaveIds,
  setSelectedAdminLeaveIds,
  handleAdminDeleteLeaveRequests,
  handleLeaveStatusChange,
  profiles,
  holidaysList,
  leaveBalanceSearchQuery,
  setLeaveBalanceSearchQuery,
  leaveBalancesList,
  handleOpenLeaveBalanceAdjustment,
  selectedAdminComplaintIds,
  setSelectedAdminComplaintIds,
  handleAdminDeleteComplaints,
  handleUpdateComplaintStatus,
  handleApproveAttendanceCorrection,
  setEditingCorrectionComplaint,
  setEditCorrectionDate,
  setEditCorrectionCheckIn,
  setEditCorrectionCheckOut,
  handleOpenApproveLoanModal,
  handleOpenModifyLoanModal,
  handleRevertLoan,
  handleCompleteLoan,
  handleRejectLoan,
  handleDeleteLoanRecord,
  setPaymentLoan,
  setPaymentAmount,
  handleSkipMonth,
  handleOpenWhatsApp
}) => {
  const [activeActionLoanId, setActiveActionLoanId] = useState<number | null>(null);
  const [leaveHistoryMonth, setLeaveHistoryMonth] = useState<string>(getCurrentMonthKey);
  const [complaintHistoryMonth, setComplaintHistoryMonth] = useState<string>(getCurrentMonthKey);
  const [loanHistoryMonth, setLoanHistoryMonth] = useState<string>('ALL');

  useEffect(() => {
    const handleClickOutside = () => setActiveActionLoanId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const dropdownItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    fontSize: '0.82rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
    lineHeight: 1.3
  };

  return (
    <div style={{ ...styles.dashboardContent, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Sub-tabs Navigation for Approvals Panel */}
      <div className="glass-panel tabs-scroll-container" style={{ padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'center', width: '100%', flexWrap: 'nowrap', overflowX: 'auto', boxSizing: 'border-box' }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginRight: '6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
          Approvals Panel:
        </span>
        <button
          type="button"
          onClick={() => { setApprovalsSubTab('leaves'); if (activeTab !== 'approvals') setActiveTab('approvals'); }}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: (approvalsSubTab === 'leaves' && activeTab !== 'complaints') || activeTab === 'leaves' ? 'var(--primary)' : 'var(--bg-surface)',
            color: (approvalsSubTab === 'leaves' && activeTab !== 'complaints') || activeTab === 'leaves' ? 'var(--btn-primary-text, #000000)' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          <span>Leave Approvals</span>
          {leaveRequests.filter(l => l.status === 'Pending').length > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>
              {leaveRequests.filter(l => l.status === 'Pending').length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setApprovalsSubTab('complaints'); if (activeTab !== 'approvals') setActiveTab('approvals'); }}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: (approvalsSubTab === 'complaints' && activeTab !== 'leaves') || activeTab === 'complaints' ? 'var(--primary)' : 'var(--bg-surface)',
            color: (approvalsSubTab === 'complaints' && activeTab !== 'leaves') || activeTab === 'complaints' ? 'var(--btn-primary-text, #000000)' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          <span>Helpdesk & Complaints</span>
          {complaintsList.filter(c => c.status !== 'Resolved' && c.status !== 'Ignored' && c.status !== 'Rejected' && c.status !== 'Closed').length > 0 && (
            <span style={{ background: '#f59e0b', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>
              {complaintsList.filter(c => c.status !== 'Resolved' && c.status !== 'Ignored' && c.status !== 'Rejected' && c.status !== 'Closed').length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setApprovalsSubTab('loans'); if (activeTab !== 'approvals') setActiveTab('approvals'); }}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            background: approvalsSubTab === 'loans' ? 'var(--primary)' : 'var(--bg-surface)',
            color: approvalsSubTab === 'loans' ? 'var(--btn-primary-text, #000000)' : 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            whiteSpace: 'nowrap'
          }}
        >
          <span>Loan Approvals</span>
          {employeeLoansList.filter(l => l.status === 'Pending').length > 0 && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', padding: '1px 6px', borderRadius: '10px' }}>
              {employeeLoansList.filter(l => l.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Sub-Panel 1: Leave Approvals */}
      {((approvalsSubTab === 'leaves' && activeTab !== 'complaints') || activeTab === 'leaves') && (
        <div style={styles.overviewContainer} className="animate-fade-in">
          {/* Bulk Action Bar if items selected */}
          {selectedAdminLeaveIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 18px', borderRadius: 'var(--radius-sm)', width: '100%' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ef4444' }}>
                {selectedAdminLeaveIds.length} leave application(s) selected
              </span>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleAdminDeleteLeaveRequests(selectedAdminLeaveIds)}
                style={{ padding: '6px 16px', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Delete Selected ({selectedAdminLeaveIds.length})
              </button>
            </div>
          )}

          {/* Pending Requests */}
          <div className="glass-panel" style={styles.panel}>
            <h3>Pending Leave Applications</h3>
            <div style={styles.tableContainer} className="table-slider-container">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={
                          leaveRequests.filter(l => l.status === 'Pending').length > 0 &&
                          leaveRequests.filter(l => l.status === 'Pending').every(l => selectedAdminLeaveIds.includes(l.id))
                        }
                        onChange={() => {
                          const pendingIds = leaveRequests.filter(l => l.status === 'Pending').map(l => l.id);
                          const allPendingSelected = pendingIds.every(id => selectedAdminLeaveIds.includes(id));
                          if (allPendingSelected) {
                            setSelectedAdminLeaveIds(prev => prev.filter(id => !pendingIds.includes(id)));
                          } else {
                            setSelectedAdminLeaveIds(prev => Array.from(new Set([...prev, ...pendingIds])));
                          }
                        }}
                        title="Select All Pending"
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Employee</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Applied At</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Leave Type</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Date Range</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Requested Days</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Reason</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.filter(l => l.status === 'Pending').length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{...styles.tableCell, textAlign: 'center', color: '#6b7280'}}>
                        No pending leave requests.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.filter(l => l.status === 'Pending').map(l => {
                      const emp = profiles.find(p => p.id === l.employee_id);
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
                          const offSat = isOffSaturday(loop);
                          
                          const isHoliday = holidayDates.includes(curStr);
                          
                          if (!isSun && !offSat && !isHoliday) {
                            count++;
                          }
                          loop.setDate(loop.getDate() + 1);
                        }
                        return count;
                      };
                      const days = getLeaveDaysCount(l.start_date, l.end_date);
                      const isSelected = selectedAdminLeaveIds.includes(l.id);

                      return (
                        <tr key={l.id} style={{ ...styles.tableRow, background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                          <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedAdminLeaveIds(prev => 
                                  prev.includes(l.id) ? prev.filter(i => i !== l.id) : [...prev, l.id]
                                );
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            <strong style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{emp?.full_name}</strong>{' '}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(PIN: {emp?.pin})</span>
                          </td>
                          <td style={{ ...styles.tableCell, fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            {(l.created_at || l.requested_at) ? new Date(l.created_at || l.requested_at || '').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{l.leave_type}</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            <strong style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>{l.start_date} to {l.end_date}</strong>
                          </td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{days} day(s)</td>
                          <td style={{ ...styles.tableCell, verticalAlign: 'middle' }}><ExpandableText text={l.reason} maxLength={35} /></td>
                          <td style={{...styles.tableCell, ...styles.actionCell}}>
                            <button 
                              onClick={() => handleLeaveStatusChange(l.id, 'Approved')} 
                              className="btn" 
                              style={{...styles.actionBtn, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}
                            >
                              <img 
                                src="/icons/check.png" 
                                alt="Approve" 
                                className="theme-icon" 
                                style={{ width: '12px', height: '12px', marginRight: '4px' }} 
                              /> Approve
                            </button>
                            <button 
                              onClick={() => handleLeaveStatusChange(l.id, 'Rejected')} 
                              className="btn" 
                              style={{...styles.actionBtn, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}
                            >
                              <img 
                                src="/icons/x.png" 
                                alt="Reject" 
                                className="theme-icon" 
                                style={{ width: '12px', height: '12px', marginRight: '4px' }} 
                              /> Reject
                            </button>
                            <button
                              onClick={() => handleAdminDeleteLeaveRequests([l.id])}
                              title="Delete Leave Request"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '6px' }}
                            >
                              <img src="/icons/trash.png" alt="delete" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Processed Requests History */}
          <div className="glass-panel" style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Processed Applications History</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  View approved, rejected, and historical leave applications.
                </p>
              </div>
              <MonthlyHistoryFilter
                value={leaveHistoryMonth}
                onChange={setLeaveHistoryMonth}
                customDates={leaveRequests.filter(l => l.status !== 'Pending').map(l => l.start_date || l.created_at || l.requested_at)}
              />
            </div>
            {(() => {
              const processedLeaves = leaveRequests.filter(l => l.status !== 'Pending');
              const filteredLeaves = processedLeaves.filter(l =>
                matchesMonthKey([l.start_date, l.created_at, l.requested_at], leaveHistoryMonth)
              );

              return (
                <div style={styles.tableContainer} className="table-slider-container">
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Employee</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Applied At</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Leave Type</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Date Range</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Reason</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Status</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaves.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{...styles.tableCell, textAlign: 'center', color: '#6b7280', padding: '30px'}}>
                            {leaveHistoryMonth !== 'ALL' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <span>No processed leave history found for the selected month.</span>
                                <button
                                  type="button"
                                  onClick={() => setLeaveHistoryMonth('ALL')}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                >
                                  Show All Months
                                </button>
                              </div>
                            ) : (
                              'No processed leave history.'
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredLeaves.map(l => {
                          const emp = profiles.find(p => p.id === l.employee_id);

                          return (
                            <tr key={l.id} style={styles.tableRow}>
                              <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                <strong style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{emp?.full_name}</strong>{' '}
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>(PIN: {emp?.pin})</span>
                              </td>
                              <td style={{ ...styles.tableCell, fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                {(l.created_at || l.requested_at) ? new Date(l.created_at || l.requested_at || '').toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                              </td>
                              <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{l.leave_type}</td>
                              <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                                <strong style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>{l.start_date} to {l.end_date}</strong>
                              </td>
                              <td style={{ ...styles.tableCell, verticalAlign: 'middle' }}><ExpandableText text={l.reason} maxLength={35} /></td>
                              <td style={styles.tableCell}>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  backgroundColor: l.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: l.status === 'Approved' ? '#10b981' : '#ef4444'
                                }}>
                                  {l.status}
                                </span>
                              </td>
                              <td style={{ ...styles.tableCell, display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  onClick={() => handleLeaveStatusChange(l.id, 'Pending')}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                  title="Revert back to Pending status"
                                >
                                  Revert
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Employee Leave Balances & Adjustments */}
          <div className="glass-panel" style={styles.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Employee Leave Balances & Adjustments</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  HR has full control to view and manually adjust leave quotas and consumed days for all employees.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface-hover)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', minWidth: '240px' }}>
                <img 
                  src="/icons/search.png" 
                  alt="search" 
                  className="theme-icon" 
                  style={{ width: '14px', height: '14px', opacity: 0.7 }} 
                />
                <input
                  type="text"
                  placeholder="Search PIN, name..."
                  value={leaveBalanceSearchQuery}
                  onChange={e => setLeaveBalanceSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    width: '100%'
                  }}
                />
                {leaveBalanceSearchQuery && (
                  <button 
                    onClick={() => setLeaveBalanceSearchQuery('')}
                    style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div style={styles.tableContainer} className="table-slider-container">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Casual Leave (Used/Total)</th>
                    <th>Medical Leave (Used/Total)</th>
                    <th>Annual Leave (Used/Total)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filtered = profiles
                      .filter(p => p.role !== 'admin')
                      .filter(p => {
                        if (!leaveBalanceSearchQuery.trim()) return true;
                        const q = leaveBalanceSearchQuery.toLowerCase().trim();
                        const pinStr = String(p.pin || '').toLowerCase();
                        const nameStr = String(p.full_name || '').toLowerCase();
                        const deptStr = String(p.department || '').toLowerCase();
                        return pinStr.includes(q) || nameStr.includes(q) || deptStr.includes(q);
                      });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} style={{...styles.tableCell, textAlign: 'center', color: '#6b7280', padding: '24px'}}>
                            {leaveBalanceSearchQuery ? `No employees found matching "${leaveBalanceSearchQuery}".` : 'No employees found.'}
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(emp => {
                      const bal = leaveBalancesList.find(b => b.employee_id === emp.id) || {
                        casual_total: 10, casual_used: 0,
                        medical_total: 10, medical_used: 0,
                        annual_total: 10, annual_used: 0
                      };
                      return (
                        <tr key={emp.id} style={styles.tableRow}>
                          <td style={styles.tableCell}><strong style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)' }}>{emp.full_name}</strong> (PIN: {emp.pin})</td>
                          <td style={styles.tableCell}>{bal.casual_used} / {bal.casual_total}</td>
                          <td style={styles.tableCell}>{bal.medical_used} / {bal.medical_total}</td>
                          <td style={styles.tableCell}>{bal.annual_used} / {bal.annual_total}</td>
                          <td style={{...styles.tableCell, ...styles.actionCell}}>
                            <button
                              onClick={() => handleOpenLeaveBalanceAdjustment(emp)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Adjust Quota
                            </button>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Panel 2: Helpdesk & Complaints Reviewer */}
      {((approvalsSubTab === 'complaints' && activeTab !== 'leaves') || activeTab === 'complaints') && (
        <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Helpdesk / Complaints Reviewer</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Review and resolve employee support tickets, punch corrections, and general requests.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <MonthlyHistoryFilter
                value={complaintHistoryMonth}
                onChange={setComplaintHistoryMonth}
                customDates={complaintsList.map(c => c.created_at)}
              />
              {selectedAdminComplaintIds.length > 0 && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleAdminDeleteComplaints(selectedAdminComplaintIds)}
                  style={{ padding: '6px 16px', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Delete Selected ({selectedAdminComplaintIds.length})
                </button>
              )}
            </div>
          </div>
          
          {(() => {
            const filteredComplaints = complaintsList.filter(c =>
              matchesMonthKey([c.created_at], complaintHistoryMonth)
            );
            const validIds = filteredComplaints.map(c => c.id!).filter(Boolean);
            const allSelected = validIds.length > 0 && validIds.every(id => selectedAdminComplaintIds.includes(id));

            return (
              <div style={styles.tableContainer} className="table-slider-container">
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => {
                            if (allSelected) {
                              setSelectedAdminComplaintIds([]);
                            } else {
                              setSelectedAdminComplaintIds(validIds);
                            }
                          }}
                          title="Select All"
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th>Created At</th>
                      <th>Employee Name (PIN)</th>
                      <th>Ticket Title</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.length > 0 ? (
                      filteredComplaints.map(c => {
                    const empProfile = profiles.find(p => p.id === c.employee_id);
                    const isSelected = c.id ? selectedAdminComplaintIds.includes(c.id) : false;
                    
                    // Nice display for correction requests description
                    let displayDescription = c.description;
                    let parsedDetails: any = null;
                    if (c.title === 'Check In/Out Entry Correction') {
                      try {
                        parsedDetails = JSON.parse(c.description);
                        displayDescription = `Date: ${parsedDetails.date || '-'} | In: ${parsedDetails.check_in || '-'} | Out: ${parsedDetails.check_out || '-'}${parsedDetails.reason ? ` | Reason: ${parsedDetails.reason}` : ''}`;
                      } catch (e) {
                        displayDescription = c.description;
                      }
                    }

                    return (
                      <tr key={c.id} style={{ ...styles.tableRow, background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                        <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                          {c.id && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedAdminComplaintIds(prev => 
                                  prev.includes(c.id!) ? prev.filter(i => i !== c.id!) : [...prev, c.id!]
                                );
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          )}
                        </td>
                        <td style={{ ...styles.tableCell, fontSize: '0.82rem', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          {c.created_at ? new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                        </td>
                        <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <strong style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{empProfile?.full_name || 'Unknown'}</strong>{' '}
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({empProfile?.pin || '-'})</span>
                        </td>
                        <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}><strong>{c.title}</strong></td>
                        <td style={{ ...styles.tableCell, verticalAlign: 'middle' }}><ExpandableText text={displayDescription} maxLength={c.title === 'Check In/Out Entry Correction' ? 68 : 35} /></td>
                        <td style={styles.tableCell}>
                          <span className="status-pill" style={{
                            ...styles.statusTag,
                            backgroundColor: c.status === 'Resolved' ? 'rgba(16, 185, 129, 0.15)' : (c.status === 'Ignored' || c.status === 'Rejected') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: c.status === 'Resolved' ? '#10b981' : (c.status === 'Ignored' || c.status === 'Rejected') ? '#ef4444' : '#f59e0b',
                            border: c.status === 'Resolved' ? '1px solid rgba(16, 185, 129, 0.3)' : (c.status === 'Ignored' || c.status === 'Rejected') ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ ...styles.tableCell, textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                          {c.status === 'Resolved' || c.status === 'Ignored' || c.status === 'Rejected' ? (
                            <>
                              <span style={{ fontSize: '0.85rem', color: c.status === 'Resolved' ? '#10b981' : '#ef4444', fontWeight: 600, marginRight: '4px' }}>
                                {c.status}
                              </span>
                              <button
                                onClick={() => handleUpdateComplaintStatus(c.id!, 'Open')}
                                className="btn btn-secondary"
                                style={{ padding: '4px 10px', fontSize: '0.78rem', fontWeight: 600 }}
                                title="Revert ticket back to Open status"
                              >
                                Revert
                              </button>
                            </>
                          ) : (
                            <>
                              {c.title === 'Check In/Out Entry Correction' ? (
                                <>
                                  <button 
                                    onClick={() => handleApproveAttendanceCorrection(c)}
                                    className="btn btn-success"
                                    style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => {
                                      try {
                                        const parsed = JSON.parse(c.description);
                                        setEditingCorrectionComplaint(c);
                                        setEditCorrectionDate(parsed.date || '');
                                        setEditCorrectionCheckIn(parsed.check_in || '');
                                        setEditCorrectionCheckOut(parsed.check_out || '');
                                      } catch (err) {
                                        window.customAlert('Failed to parse correction data.');
                                      }
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                                  >
                                    Edit & Approve
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateComplaintStatus(c.id!, 'Ignored')}
                                    className="btn btn-danger"
                                    style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                                  >
                                    Ignore
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    onClick={() => handleUpdateComplaintStatus(c.id!, 'Resolved')}
                                    className="btn btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                                  >
                                    Resolve
                                  </button>
                                  <button 
                                    onClick={() => handleUpdateComplaintStatus(c.id!, 'Ignored')}
                                    className="btn btn-danger"
                                    style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                                  >
                                    Ignore
                                  </button>
                                </>
                              )}
                            </>
                          )}
                          {c.id && (
                            <button
                              onClick={() => handleAdminDeleteComplaints([c.id!])}
                              title="Delete Complaint"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}
                            >
                              <img src="/icons/trash.png" alt="delete" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      {complaintHistoryMonth !== 'ALL' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <span>No complaints or requests found for the selected month.</span>
                          <button
                            type="button"
                            onClick={() => setComplaintHistoryMonth('ALL')}
                            className="btn btn-secondary"
                            style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                          >
                            Show All Months
                          </button>
                        </div>
                      ) : (
                        'No complaints submitted by employees.'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
            );
          })()}
        </div>
      )}

      {/* Sub-Panel 3: Loan Approvals */}
      {approvalsSubTab === 'loans' && (
        <div style={styles.overviewContainer} className="animate-fade-in">
          {/* Pending Loan Applications */}
          <div className="glass-panel" style={styles.panel}>
            <h3>Pending Loan Applications</h3>
            <div style={styles.tableContainer} className="table-slider-container">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Applied At</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Employee</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Net Salary</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Loan Purpose / Name</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Loan Amount</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Monthly Deduction</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Duration</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Start Date</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>End Date</th>
                    <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeLoansList.filter(l => l.status === 'Pending').length > 0 ? (
                    employeeLoansList.filter(l => l.status === 'Pending').map(l => {
                      const emp = profiles.find(p => p.id === l.employee_id || p.pin === l.employee_pin);
                      const netSalary = emp?.base_salary || 0;

                      return (
                        <tr 
                          key={l.id} 
                          onClick={() => setActiveActionLoanId(l.id ?? null)}
                          style={{ ...styles.tableRow, cursor: 'pointer' }}
                        >
                          <td style={{ ...styles.tableCell, fontSize: '0.82rem', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            {l.created_at ? new Date(l.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            <strong style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{l.employee_name || 'Employee'}</strong>{' '}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(PIN: {l.employee_pin})</span>
                            {l.employee_contact && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Contact: {l.employee_contact}
                              </div>
                            )}
                          </td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            <strong style={{ color: '#10b981', fontSize: '0.92rem' }}>
                              {netSalary > 0 ? `PKR ${netSalary.toLocaleString()}` : '—'}
                            </strong>
                          </td>
                          <td style={{ ...styles.tableCell, verticalAlign: 'middle' }}><ExpandableText text={l.loan_name} maxLength={30} /></td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}><strong style={{ color: 'var(--text-primary)' }}>PKR {l.loan_amount.toLocaleString()}</strong></td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>PKR {l.monthly_deduction.toLocaleString()} / mo</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{l.months_duration || 1} Months</td>
                          <td style={styles.tableCell}>{new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                          <td style={styles.tableCell}>{(() => { const d = new Date(); d.setMonth(d.getMonth() + (l.months_duration || 1)); return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }); })()}</td>
                          <td style={{ ...styles.tableCell, ...styles.actionCell, textAlign: 'center' }}>
                            {/* 1. Approve Icon Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenApproveLoanModal(l);
                              }}
                              style={{
                                ...styles.iconBtn,
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                borderColor: 'rgba(16, 185, 129, 0.4)'
                              }}
                              title="Approve Loan & Set Schedule"
                            >
                              <img 
                                src="/icons/check.png" 
                                alt="Approve" 
                                className="theme-icon" 
                                style={{ width: '16px', height: '16px' }} 
                              />
                            </button>

                            {/* 2. Modify Icon Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModifyLoanModal(l);
                              }}
                              style={styles.iconBtn}
                              title="Modify Loan Schedule"
                            >
                              <img 
                                src="/icons/edit.png" 
                                alt="Modify" 
                                className="theme-icon" 
                                style={{ width: '16px', height: '16px' }} 
                              />
                            </button>

                            {/* 3. Reject Icon Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectLoan(l);
                              }}
                              style={{
                                ...styles.iconBtn,
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                borderColor: 'rgba(239, 68, 68, 0.3)'
                              }}
                              title="Reject / Ignore Loan"
                            >
                              <img 
                                src="/icons/x.png" 
                                alt="Reject" 
                                className="theme-icon" 
                                style={{ width: '16px', height: '16px' }} 
                              />
                            </button>

                            {/* 4. Delete Icon Button on Pending section */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLoanRecord(l.id!);
                              }}
                              style={{
                                ...styles.iconBtn,
                                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                                borderColor: 'rgba(239, 68, 68, 0.3)'
                              }}
                              title="Delete Loan Request"
                            >
                              <img 
                                src="/icons/trash.png" 
                                alt="Delete" 
                                className="theme-icon" 
                                style={{ width: '16px', height: '16px' }} 
                              />
                            </button>

                            {/* 5. WhatsApp Chat Icon Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (emp && handleOpenWhatsApp) {
                                  handleOpenWhatsApp(emp);
                                } else if (l.employee_contact) {
                                  let phone = l.employee_contact.replace(/[^\d+]/g, '');
                                  if (phone.startsWith('03')) phone = '92' + phone.substring(1);
                                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${l.employee_name || 'Employee'}, regarding your loan application (${l.loan_name})...`)}`, '_blank');
                                } else {
                                  window.customAlert('No contact number found for this employee.');
                                }
                              }}
                              style={styles.iconBtn}
                              title={`Chat with ${l.employee_name || 'Employee'} on WhatsApp`}
                            >
                              <img 
                                src="/icons/whatsapp.png" 
                                alt="WhatsApp" 
                                className="theme-icon" 
                                style={{ width: '16px', height: '16px' }} 
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No pending loan requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active & Historical Loans */}
          <div className="glass-panel" style={{ ...styles.panel, marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0 }}>Active & Historical Employee Loans</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Monitor ongoing repayments, completed terms, and repayment schedules.
                </p>
              </div>
              <MonthlyHistoryFilter
                value={loanHistoryMonth}
                onChange={setLoanHistoryMonth}
                customDates={employeeLoansList.filter(l => l.status !== 'Pending').map(l => l.start_date || l.created_at)}
              />
            </div>
            {(() => {
              const historicalLoans = employeeLoansList.filter(l => l.status !== 'Pending');
              const filteredLoans = historicalLoans.filter(l =>
                matchesMonthKey([l.start_date, l.created_at], loanHistoryMonth)
              );

              return (
                <div style={styles.tableContainer} className="table-slider-container">
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Applied At</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Employee</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Net Salary</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Loan Purpose / Name</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Loan Amount</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Monthly Deduction</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Repaid</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Remaining</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Start Date</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>End Date</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px' }}>Status</th>
                        <th style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '12px 14px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLoans.length > 0 ? (
                        filteredLoans.map((l) => {
                      const emp = profiles.find(p => p.id === l.employee_id || p.pin === l.employee_pin);
                      const netSalary = emp?.base_salary || 0;

                      return (
                        <tr 
                          key={l.id} 
                          onClick={() => setActiveActionLoanId(l.id ?? null)}
                          style={{
                            ...styles.tableRow,
                            cursor: 'pointer',
                            background: l.status === 'Completed' ? 'rgba(16, 185, 129, 0.08)' : l.status === 'Approved' ? 'rgba(16, 185, 129, 0.08)' : l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.05)' : undefined,
                            borderLeft: l.status === 'Completed' ? '4px solid #10b981' : l.status === 'Approved' ? '4px solid #10b981' : l.status === 'Rejected' ? '4px solid #ef4444' : undefined
                          }}
                        >
                          <td style={{ ...styles.tableCell, fontSize: '0.82rem', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            {l.created_at ? new Date(l.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            <strong style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>{l.employee_name || 'Employee'}</strong>{' '}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(PIN: {l.employee_pin})</span>
                            {l.employee_contact && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Contact: {l.employee_contact}
                              </div>
                            )}
                          </td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            <strong style={{ color: '#10b981', fontSize: '0.92rem' }}>
                              {netSalary > 0 ? `PKR ${netSalary.toLocaleString()}` : '—'}
                            </strong>
                          </td>
                          <td style={{ ...styles.tableCell, verticalAlign: 'middle' }}><ExpandableText text={l.loan_name} maxLength={30} /></td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>PKR {l.loan_amount.toLocaleString()}</strong>
                          </td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>PKR {l.monthly_deduction.toLocaleString()} / mo</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>PKR {(l.total_repaid || 0).toLocaleString()}</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>PKR {l.remaining_balance.toLocaleString()}</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{l.start_date ? new Date(l.start_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{l.end_date ? new Date(l.end_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                            <span className="status-pill" style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              lineHeight: 1.2,
                              background: l.status === 'Completed' ? 'rgba(16, 185, 129, 0.15)' : l.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: l.status === 'Completed' ? '#10b981' : l.status === 'Approved' ? '#10b981' : l.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                              border: l.status === 'Completed' ? '1px solid rgba(16, 185, 129, 0.4)' : undefined
                            }}>
                              {l.status === 'Completed' ? (
                                <>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>Completed Dues</span>
                                </>
                              ) : (
                                l.status
                              )}
                            </span>
                          </td>
                          <td style={{ ...styles.tableCell, ...styles.actionCell, textAlign: 'center' }}>
                            {/* 3-Dots Action Menu Trigger Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionLoanId(l.id ?? null);
                              }}
                              style={{
                                ...styles.iconBtn,
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: activeActionLoanId === l.id ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0
                              }}
                              title="Loan Actions (more-vertical)"
                            >
                              <img 
                                src="/icons/more-vertical.svg" 
                                alt="Actions" 
                                className="theme-icon" 
                                style={{ width: '16px', height: '16px', display: 'block', pointerEvents: 'none' }} 
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        {loanHistoryMonth !== 'ALL' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <span>No active or historical loans found for the selected month.</span>
                            <button
                              type="button"
                              onClick={() => setLoanHistoryMonth('ALL')}
                              className="btn btn-secondary"
                              style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                            >
                              Show All Months
                            </button>
                          </div>
                        ) : (
                          'No active or historical loans recorded yet.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
        </div>
      )}

      {/* Centered Loan Actions Modal */}
      {activeActionLoanId !== null && createPortal(
        (() => {
          const l = employeeLoansList.find(x => x.id === activeActionLoanId);
          if (!l) return null;
          const emp = profiles.find(p => p.id === l.employee_id || p.pin === l.employee_pin);
          return (
            <div 
              className="custom-overlay animate-fade-in" 
              onClick={() => setActiveActionLoanId(null)} 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 100000,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0,
                padding: 0
              }}
            >
            <div 
              className="custom-dialog-card glass-panel animate-scale-in" 
              onClick={e => e.stopPropagation()} 
              style={{ width: '420px', maxWidth: '92vw', padding: '22px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.45)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Loan Actions
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {l.employee_name || 'Employee'} (PIN: {l.employee_pin}) · {l.loan_name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveActionLoanId(null)}
                  style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', padding: '10px 12px', background: 'var(--bg-surface-hover)', borderRadius: '8px', fontSize: '0.82rem' }}>
                <div>Remaining: <strong style={{ color: l.remaining_balance <= 0 ? '#10b981' : '#f59e0b' }}>PKR {l.remaining_balance.toLocaleString()}</strong></div>
                <div>Monthly: <strong>PKR {l.monthly_deduction.toLocaleString()}</strong></div>
                <div>Status: <strong style={{ color: l.status === 'Completed' ? '#d97706' : l.status === 'Approved' ? '#10b981' : l.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>{l.status}</strong></div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* 1. Record Payment */}
                {l.status === 'Approved' && l.remaining_balance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionLoanId(null);
                      setPaymentLoan(l);
                      setPaymentAmount(l.monthly_deduction.toString());
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    style={dropdownItemStyle}
                  >
                    <img src="/icons/file-text.png" alt="" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                    <span>Record Payment</span>
                  </button>
                )}

                {/* 2. Complete Loan */}
                {l.status === 'Approved' && l.remaining_balance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionLoanId(null);
                      handleCompleteLoan && handleCompleteLoan(l);
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    style={{ ...dropdownItemStyle, color: '#10b981' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ fontWeight: 600 }}>Mark as Completed</span>
                  </button>
                )}

                {/* 3. Skip Month */}
                {l.status === 'Approved' && l.remaining_balance > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionLoanId(null);
                      handleSkipMonth(l);
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    style={dropdownItemStyle}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 4 15 12 5 20 5 4" />
                      <line x1="19" y1="5" x2="19" y2="19" />
                    </svg>
                    <span>Skip This Month</span>
                  </button>
                )}

                {/* 4. Revert to Pending */}
                {(l.status === 'Approved' || l.status === 'Completed') && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionLoanId(null);
                      handleRevertLoan && handleRevertLoan(l);
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    style={{ ...dropdownItemStyle, color: '#f59e0b' }}
                  >
                    <img src="/icons/revert.png" alt="" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                    <span>Revert to Pending</span>
                  </button>
                )}

                {/* 5. Modify Schedule */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveActionLoanId(null);
                    handleOpenModifyLoanModal(l);
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  style={dropdownItemStyle}
                >
                  <img src="/icons/edit.png" alt="" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                  <span>Modify Schedule</span>
                </button>

                {/* 6. WhatsApp Chat */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveActionLoanId(null);
                    if (emp && handleOpenWhatsApp) {
                      handleOpenWhatsApp(emp);
                    } else if (l.employee_contact) {
                      let phone = l.employee_contact.replace(/[^\d+]/g, '');
                      if (phone.startsWith('03')) phone = '92' + phone.substring(1);
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${l.employee_name || 'Employee'}, regarding your loan (${l.loan_name})...`)}`, '_blank');
                    } else {
                      window.customAlert('No contact number found for this employee.');
                    }
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  style={dropdownItemStyle}
                >
                  <img src="/icons/whatsapp.png" alt="" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                  <span>Chat on WhatsApp</span>
                </button>

                <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />

                {/* 7. Delete Record */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveActionLoanId(null);
                    handleDeleteLoanRecord(l.id!);
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  style={{ ...dropdownItemStyle, color: '#ef4444' }}
                >
                  <img src="/icons/trash.png" alt="" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          </div>
        );
      })(),
      document.body
    )}
    </div>
  );
};

export default ApprovalsTab;
