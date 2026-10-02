import React, { useState, useEffect } from 'react';
import type { Complaint, EmployeeLoan } from '../../../lib/dbHelper';
import CollapsibleCard from '../../../components/CollapsibleCard';
import MonthlyHistoryFilter, { matchesMonthKey, getCurrentMonthKey } from '../../../components/MonthlyHistoryFilter';
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
  const [activeActionLoanId, setActiveActionLoanId] = useState<number | null>(null);
  const [activeActionComplaintId, setActiveActionComplaintId] = useState<number | null>(null);
  const [complaintHistoryMonth, setComplaintHistoryMonth] = useState<string>(getCurrentMonthKey);
  const [loanHistoryMonth, setLoanHistoryMonth] = useState<string>(getCurrentMonthKey);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveActionLoanId(null);
      setActiveActionComplaintId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loanDropdownItemStyle: React.CSSProperties = {
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
        <CollapsibleCard
          title="Your Technical Complaints & Issues"
          defaultOpenMobile={true}
          actionButton={
            <MonthlyHistoryFilter
              value={complaintHistoryMonth}
              onChange={setComplaintHistoryMonth}
              customDates={complaintsList.map(c => c.created_at)}
            />
          }
        >
          {(() => {
            const visibleComplaints = complaintsList.filter(c => c.id && !hiddenComplaintIds.includes(c.id));
            const filteredComplaints = visibleComplaints.filter(c =>
              matchesMonthKey([c.created_at], complaintHistoryMonth)
            );
            const openComplaints = filteredComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Ignored' && c.status !== 'Rejected');
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
                      {filteredComplaints.length > 0 ? (
                        filteredComplaints.map(c => {
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
                              <td style={{ ...styles.tableCell, textAlign: 'center', position: 'relative', overflow: 'visible' }}>
                                {/* 3-Dots Action Menu Trigger Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionComplaintId((prev: number | null) => prev === c.id ? null : (c.id ?? null));
                                  }}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border-color)',
                                    background: activeActionComplaintId === c.id ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto',
                                    padding: 0
                                  }}
                                  title="More Options (more-vertical)"
                                >
                                  <img 
                                    src="/icons/more-vertical.svg" 
                                    alt="More Options" 
                                    className="theme-icon" 
                                    style={{ width: '16px', height: '16px', display: 'block', pointerEvents: 'none' }} 
                                  />
                                </button>

                                {/* Floating Actions Popover */}
                                {activeActionComplaintId === c.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      position: 'absolute',
                                      right: '10px',
                                      top: 'calc(100% + 4px)',
                                      background: 'var(--bg-surface)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '8px',
                                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35), 0 8px 10px -6px rgba(0,0,0,0.25)',
                                      zIndex: 1000,
                                      minWidth: '185px',
                                      padding: '6px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px',
                                      textAlign: 'left'
                                    }}
                                    className="animate-fade-in"
                                  >
                                    {isOpen && c.id ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveActionComplaintId(null);
                                          handleDeleteComplaints([c.id!]);
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        style={{ ...loanDropdownItemStyle, color: '#ef4444' }}
                                      >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                        <span>Cancel Request</span>
                                      </button>
                                    ) : null}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionComplaintId(null);
                                        const text = `Ticket: ${c.title}\nStatus: ${c.status}\nSubmitted: ${c.created_at || ''}`;
                                        navigator.clipboard?.writeText(text);
                                        if ((window as any).customAlert) {
                                          (window as any).customAlert('Ticket info copied to clipboard.');
                                        }
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      style={loanDropdownItemStyle}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                      </svg>
                                      <span>Copy Details</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveActionComplaintId(null);
                                        window.open(`https://wa.me/?text=${encodeURIComponent(`Hi HR, regarding my ticket: ${c.title} (Status: ${c.status})`)}`, '_blank');
                                      }}
                                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                      style={loanDropdownItemStyle}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                      </svg>
                                      <span>Contact HR</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
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
                              'No requests submitted yet. Click "Request" to create one.'
                            )}
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
        <CollapsibleCard
          title="Your Loan Applications & History"
          defaultOpenMobile={true}
          actionButton={
            <MonthlyHistoryFilter
              value={loanHistoryMonth}
              onChange={setLoanHistoryMonth}
              customDates={(employeeLoansList || []).map(l => l.created_at || l.start_date)}
            />
          }
        >
          {(() => {
            const filteredLoans = (employeeLoansList || []).filter(l =>
              matchesMonthKey([l.created_at, l.start_date], loanHistoryMonth)
            );

            return (
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
                    {filteredLoans && filteredLoans.length > 0 ? (
                      filteredLoans.map((l: any, idx: number, arr: any[]) => {
                    const isNearBottom = idx >= arr.length - 2 && arr.length > 2;

                    return (
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
                        <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{l.start_date ? new Date(l.start_date).toLocaleDateString('en-PK') : '—'}</td>
                        <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{l.end_date ? new Date(l.end_date).toLocaleDateString('en-PK') : '—'}</td>
                        <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            lineHeight: 1.2,
                            background: (l.status === 'Approved' || l.status === 'Completed') ? 'rgba(16, 185, 129, 0.15)' : l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: (l.status === 'Approved' || l.status === 'Completed') ? '#10b981' : l.status === 'Rejected' ? '#ef4444' : '#f59e0b',
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
                        <td style={{ ...styles.tableCell, textAlign: 'center', position: 'relative', overflow: 'visible' }}>
                          {/* 3-Dots Action Menu Trigger Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionLoanId((prev: number | null) => prev === l.id ? null : (l.id ?? null));
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: activeActionLoanId === l.id ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto',
                              padding: 0
                            }}
                            title="More Options (more-vertical)"
                          >
                            <img 
                              src="/icons/more-vertical.svg" 
                              alt="More Options" 
                              className="theme-icon" 
                              style={{ width: '16px', height: '16px', display: 'block', pointerEvents: 'none' }} 
                            />
                          </button>

                          {/* Floating Actions Popover */}
                          {activeActionLoanId === l.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                right: '10px',
                                ...(isNearBottom ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35), 0 8px 10px -6px rgba(0,0,0,0.25)',
                                zIndex: 1000,
                                minWidth: '185px',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                textAlign: 'left'
                              }}
                              className="animate-fade-in"
                            >
                              {/* 1. If Pending: Cancel Request */}
                              {l.status === 'Pending' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionLoanId(null);
                                    handleDeleteLoan(l.id);
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  style={{ ...loanDropdownItemStyle, color: '#ef4444' }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                  <span>Cancel Request</span>
                                </button>
                              )}

                              {/* 2. Contact HR Support */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionLoanId(null);
                                  window.open(`https://wa.me/923000000000?text=${encodeURIComponent(`Hello HR, regarding my loan request (Amount: Rs. ${Number(l.amount || 0).toLocaleString()}, Status: ${l.status})...`)}`, '_blank');
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={loanDropdownItemStyle}
                              >
                                <img src="/icons/whatsapp.png" alt="" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                                <span>Contact HR Support</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      {loanHistoryMonth !== 'ALL' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <span>No loan requests found for the selected month.</span>
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
                        'No loan requests submitted yet. Click "Request" to apply.'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
            );
          })()}
        </CollapsibleCard>
      </div>
    </div>
  );
};

export default HelpdeskTab;
