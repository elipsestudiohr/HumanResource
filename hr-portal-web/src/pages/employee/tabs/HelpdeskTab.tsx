import React from 'react';
import type { Complaint, EmployeeLoan } from '../../../lib/dbHelper';
import CollapsibleCard from '../../../components/CollapsibleCard';
import styles from '../EmployeeStyles';

interface HelpdeskTabProps {
  complaintsList: Complaint[];
  employeeLoansList: EmployeeLoan[];
  selectedComplaintIds: number[];
  setSelectedComplaintIds: React.Dispatch<React.SetStateAction<number[]>>;
  hiddenComplaintIds: number[];
  handleDeleteComplaints: (ids: number[]) => void;
  handleDeleteLoan: (id: number) => void;
  setIsSubmitHelpdeskModalOpen: (open: boolean) => void;
}

export const HelpdeskTab: React.FC<HelpdeskTabProps> = ({
  complaintsList,
  employeeLoansList,
  selectedComplaintIds,
  setSelectedComplaintIds,
  hiddenComplaintIds,
  handleDeleteComplaints,
  handleDeleteLoan,
  setIsSubmitHelpdeskModalOpen
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Top Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Requests</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Report technical issues, request attendance punch corrections, or apply for company loans.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsSubmitHelpdeskModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, cursor: 'pointer', border: 'none' }}
        >
          <img src="/icons/file-text.png" alt="request" className="theme-icon" style={{ width: '16px', height: '16px' }} />
          <span>Request</span>
        </button>
      </div>

      {/* Main Full-Width Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        {/* Technical Complaints & Issues */}
        <CollapsibleCard title="Your Technical Complaints & Issues" defaultOpenMobile={true}>
          {(() => {
            const visibleComplaints = complaintsList.filter(c => c.id && !hiddenComplaintIds.includes(c.id));
            const openComplaints = visibleComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Ignored' && c.status !== 'Rejected');
            const allSelected = openComplaints.length > 0 && openComplaints.every(c => c.id && selectedComplaintIds.includes(c.id));

            const toggleSelectAll = () => {
              if (allSelected) {
                setSelectedComplaintIds([]);
              } else {
                setSelectedComplaintIds(openComplaints.map(c => c.id!).filter(Boolean));
              }
            };

            const toggleSelectOne = (id: number) => {
              setSelectedComplaintIds(prev => 
                prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
              );
            };

            return (
              <>
                {openComplaints.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        checked={allSelected} 
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer' }}
                        id="selectAllComplaints"
                      />
                      <label htmlFor="selectAllComplaints" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        Select All Open Complaints ({selectedComplaintIds.length} selected)
                      </label>
                    </div>

                    {selectedComplaintIds.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => handleDeleteComplaints(selectedComplaintIds)}
                        className="btn btn-secondary" 
                        style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      >
                        Cancel Selected ({selectedComplaintIds.length})
                      </button>
                    )}
                  </div>
                )}

                <div style={styles.tableContainer} className="table-slider-container">
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Complaint Details</th>
                        <th>Type</th>
                        <th>Submitted At</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleComplaints.length > 0 ? (
                        visibleComplaints.map(c => {
                          const isOpen = c.status !== 'Resolved' && c.status !== 'Ignored' && c.status !== 'Rejected';
                          const isSelected = c.id ? selectedComplaintIds.includes(c.id) : false;

                          return (
                            <tr key={c.id} style={styles.tableRow}>
                              <td style={{ ...styles.tableCell, width: '40px' }}>
                                {isOpen && c.id ? (
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected} 
                                    onChange={() => toggleSelectOne(c.id!)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                )}
                              </td>
                              <td style={styles.tableCell}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                                {c.description && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '400px' }}>
                                    {c.description}
                                  </div>
                                )}
                                {(c.resolution || c.admin_response) && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '6px', background: 'rgba(59, 130, 246, 0.08)', padding: '4px 8px', borderRadius: '4px' }}>
                                    <strong>Admin:</strong> {c.resolution || c.admin_response}
                                  </div>
                                )}
                              </td>
                              <td style={styles.tableCell}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {c.title.includes('Correction') ? 'Punch Correction' : 'Helpdesk'}
                                </span>
                              </td>
                              <td style={styles.tableCell}>
                                {c.created_at ? new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                              </td>
                              <td style={styles.tableCell}>
                                <span style={{
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  background: c.status === 'Resolved' ? 'rgba(16, 185, 129, 0.15)' : c.status === 'Rejected' || c.status === 'Ignored' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: c.status === 'Resolved' ? '#10b981' : c.status === 'Rejected' || c.status === 'Ignored' ? '#ef4444' : '#f59e0b'
                                }}>
                                  {c.status}
                                </span>
                              </td>
                              <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                                {isOpen && c.id ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComplaints([c.id!])}
                                    title="Cancel Complaint Ticket"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <img src="/icons/trash.png" alt="delete" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                                  </button>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                            No requests submitted yet. Click "Request" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </CollapsibleCard>

        {/* Employee Loan Applications History */}
        <CollapsibleCard title="Your Loan Applications & History" defaultOpenMobile={true}>
          <div style={styles.tableContainer} className="table-slider-container">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Application Date</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Monthly Installment</th>
                  <th>Repayment Mode</th>
                  <th>Tenure</th>
                  <th>Recovery Start</th>
                  <th>Recovery End</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {employeeLoansList && employeeLoansList.length > 0 ? (
                  employeeLoansList.map((l: any) => (
                    <tr key={l.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        {l.created_at ? new Date(l.created_at).toLocaleDateString([], { dateStyle: 'short' }) : '—'}
                      </td>
                      <td style={{ ...styles.tableCell, fontWeight: 700, color: 'var(--text-primary)' }}>
                        Rs. {Number(l.amount || 0).toLocaleString()}
                      </td>
                      <td style={{ ...styles.tableCell, maxWidth: '200px' }}>
                        {l.reason || 'Personal / Emergency'}
                      </td>
                      <td style={{ ...styles.tableCell, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Rs. {Number(l.monthly_installment || 0).toLocaleString()}/mo
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)' }}>
                          {l.deduction_basis === 'manual_repayment' ? 'Manual Repayment' : 'Salary Deduction'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        {l.tenure_months || 1} Month(s)
                      </td>
                      <td style={styles.tableCell}>{l.start_date ? new Date(l.start_date).toLocaleDateString('en-PK') : '—'}</td>
                      <td style={styles.tableCell}>{l.end_date ? new Date(l.end_date).toLocaleDateString('en-PK') : '—'}</td>
                      <td style={styles.tableCell}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: l.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: l.status === 'Approved' ? '#10b981' : l.status === 'Rejected' ? '#ef4444' : '#f59e0b'
                        }}>
                          {l.status}
                        </span>
                      </td>
                      <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                        {l.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLoan(l.id)}
                            className="btn btn-danger"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                          >
                            Cancel / Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No loan requests submitted yet. Click "Request" to apply.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
};

export default HelpdeskTab;
