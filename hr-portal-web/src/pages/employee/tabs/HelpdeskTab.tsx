import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getDeviceSettings, type Complaint, type EmployeeLoan } from '../../../lib/dbHelper';
import CollapsibleCard from '../../../components/CollapsibleCard';
import MonthlyHistoryFilter, { matchesMonthKey, getCurrentMonthKey } from '../../../components/MonthlyHistoryFilter';
import styles, { getModalOverlayStyle } from '../EmployeeStyles';

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

  // HR Contact Channel Selection Modal State
  const [contactTarget, setContactTarget] = useState<{
    type: 'ticket' | 'loan';
    title: string;
    status: string;
    details?: string;
  } | null>(null);
  const [hrSettings, setHrSettings] = useState<{ phone: string; email: string }>({
    phone: '+92 300 1234567',
    email: 'hr@elipsestudio.com'
  });

  useEffect(() => {
    getDeviceSettings().then(ds => {
      if (ds) {
        setHrSettings({
          phone: ds.hr_contact_phone || '+92 300 1234567',
          email: ds.hr_contact_email || 'hr@elipsestudio.com'
        });
      }
    }).catch(() => {});
  }, []);

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

  const renderComplaintDescription = (desc?: string) => {
    if (!desc) return null;
    const trimmed = desc.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === 'attendance_correction' || parsed.date || parsed.check_in !== undefined || parsed.check_out !== undefined) {
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px', alignItems: 'center', marginTop: '6px' }}>
              <span className="ticket-detail-tag">
                Date: <strong>{parsed.date || '—'}</strong>
              </span>
              <span className="ticket-detail-tag">
                In: <strong>{parsed.check_in || '—'}</strong>
              </span>
              <span className="ticket-detail-tag">
                Out: <strong>{parsed.check_out || '—'}</strong>
              </span>
              {parsed.reason && (
                <span style={{ fontSize: '0.78rem', color: 'inherit', opacity: 0.85, fontStyle: 'italic' }}>
                  Note: {parsed.reason}
                </span>
              )}
            </div>
          );
        }
      } catch {
        // fallback to plain text below
      }
    }

    return (
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '400px' }}>
        {desc}
      </div>
    );
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
                            <tr 
                              key={c.id} 
                              onClick={() => setActiveActionComplaintId(c.id ?? null)}
                              style={{ ...styles.tableRow, cursor: 'pointer', background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined }}
                            >
                              <td style={{ ...styles.tableCell, width: '40px' }}>
                                {isOpen && c.id ? (
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected} 
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => toggleSelectOne(c.id!)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                )}
                              </td>
                              <td style={styles.tableCell}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.title}</div>
                                {renderComplaintDescription(c.description)}
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
                                <span className="status-pill" style={{
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
                      filteredLoans.map((l: any) => {
                    return (
                      <tr 
                        key={l.id} 
                        onClick={() => setActiveActionLoanId(l.id ?? null)}
                        style={{ ...styles.tableRow, cursor: 'pointer' }}
                      >
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
                          <span className="timing-rule-tag table-neutral-tag" style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)' }}>
                            {l.deduction_basis === 'manual_repayment' ? 'Manual Repayment' : 'Salary Deduction'}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          {l.tenure_months || 1} Month(s)
                        </td>
                        <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{l.start_date ? new Date(l.start_date).toLocaleDateString('en-PK') : '—'}</td>
                        <td style={{ ...styles.tableCell, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{l.end_date ? new Date(l.end_date).toLocaleDateString('en-PK') : '—'}</td>
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

      {/* Centered Complaint Actions Modal */}
      {activeActionComplaintId !== null && createPortal(
        (() => {
          const c = complaintsList.find(x => x.id === activeActionComplaintId);
          if (!c) return null;
          const isOpen = c.status === 'Open' || c.status === 'In Progress';
          return (
            <div 
              className="custom-overlay animate-fade-in" 
              onClick={() => setActiveActionComplaintId(null)} 
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
                      Ticket Actions
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {c.title}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveActionComplaintId(null)}
                    style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', padding: '10px 12px', background: 'var(--bg-surface-hover)', borderRadius: '8px', fontSize: '0.82rem' }}>
                  <div>Category: <strong>{(c as any).issue_type || 'General'}</strong></div>
                  <div>Status: <strong style={{ color: c.status === 'Resolved' ? '#10b981' : c.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>{c.status}</strong></div>
                </div>

                {c.description && (
                  <div style={{ marginBottom: '14px' }}>
                    {renderComplaintDescription(c.description)}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isOpen && c.id ? (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveActionComplaintId(null);
                        handleDeleteComplaints([c.id!]);
                      }}
                      style={{
                        ...loanDropdownItemStyle,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span style={{ fontWeight: 600 }}>Cancel Request</span>
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
                    style={{ ...loanDropdownItemStyle, padding: '10px 14px', borderRadius: '8px' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionComplaintId(null);
                      setContactTarget({
                        type: 'ticket',
                        title: c.title,
                        status: c.status,
                        details: c.description
                      });
                    }}
                    style={{ ...loanDropdownItemStyle, padding: '10px 14px', borderRadius: '8px' }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span>Contact HR</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* Centered Loan Actions Modal */}
      {activeActionLoanId !== null && createPortal(
        (() => {
          const l = employeeLoansList.find(x => x.id === activeActionLoanId);
          if (!l) return null;
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
                      Loan Request Actions
                    </h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                      {l.loan_name || 'Personal Loan'}
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
                  <div>Amount: <strong>PKR {Number(l.loan_amount || 0).toLocaleString()}</strong></div>
                  <div>Status: <strong style={{ color: l.status === 'Approved' ? '#10b981' : l.status === 'Rejected' ? '#ef4444' : '#f59e0b' }}>{l.status}</strong></div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {l.status === 'Pending' && l.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveActionLoanId(null);
                        handleDeleteLoan(l.id!);
                      }}
                      style={{
                        ...loanDropdownItemStyle,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span style={{ fontWeight: 600 }}>Cancel Request</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveActionLoanId(null);
                      setContactTarget({
                        type: 'loan',
                        title: l.loan_name || 'Loan Request',
                        status: l.status,
                        details: `Amount: Rs. ${Number(l.loan_amount || 0).toLocaleString()}`
                      });
                    }}
                    style={{ ...loanDropdownItemStyle, padding: '10px 14px', borderRadius: '8px' }}
                  >
                    <img src="/icons/whatsapp.png" alt="" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                    <span>Contact HR Support</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* Centered HR Contact Channel Selection Modal */}
      {contactTarget && createPortal(
        <div 
          className="custom-overlay animate-fade-in" 
          onClick={() => setContactTarget(null)} 
          style={getModalOverlayStyle()}
        >
          <div 
            className="custom-dialog-card glass-panel animate-scale-in" 
            onClick={e => e.stopPropagation()} 
            style={{ width: '440px', maxWidth: '92vw', padding: '24px', borderRadius: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Contact HR Department
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                  Regarding: <strong>{contactTarget.title}</strong> ({contactTarget.status})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContactTarget(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Choose your preferred channel to directly reach HR support. Your ticket details will be pre-filled automatically.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 1. WhatsApp Desktop / App */}
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = hrSettings.phone.replace(/[^\d]/g, '');
                  const msg = `Hello HR, I am reaching out regarding my ${contactTarget.type === 'loan' ? 'Loan Request' : 'Ticket'}: "${contactTarget.title}" (Status: ${contactTarget.status}).`;
                  window.location.href = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
                  setTimeout(() => {
                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                  }, 800);
                  setContactTarget(null);
                }}
                style={{
                  ...loanDropdownItemStyle,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src="/icons/whatsapp.png" alt="" className="theme-icon" style={{ width: '20px', height: '20px' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>WhatsApp Application</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Open in WhatsApp Desktop or Mobile App ({hrSettings.phone})</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>→</span>
              </button>

              {/* 2. WhatsApp Web */}
              <button
                type="button"
                onClick={() => {
                  const cleanPhone = hrSettings.phone.replace(/[^\d]/g, '');
                  const msg = `Hello HR, I am reaching out regarding my ${contactTarget.type === 'loan' ? 'Loan Request' : 'Ticket'}: "${contactTarget.title}" (Status: ${contactTarget.status}).`;
                  window.open(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
                  setContactTarget(null);
                }}
                style={{
                  ...loanDropdownItemStyle,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  color: '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>WhatsApp Web</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Open in browser via web.whatsapp.com</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>→</span>
              </button>

              {/* 3. Official HR Email */}
              <button
                type="button"
                onClick={() => {
                  const subject = encodeURIComponent(`HR Inquiry: ${contactTarget.title} [Status: ${contactTarget.status}]`);
                  const body = encodeURIComponent(`Hello HR Team,\n\nI am writing regarding my ${contactTarget.type === 'loan' ? 'loan application' : 'helpdesk ticket'}:\nTitle: ${contactTarget.title}\nStatus: ${contactTarget.status}\n\nPlease update me on this at your earliest convenience.\n\nThank you.`);
                  window.location.href = `mailto:${hrSettings.email}?subject=${subject}&body=${body}`;
                  setContactTarget(null);
                }}
                style={{
                  ...loanDropdownItemStyle,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Official HR Email</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>Send email directly to {hrSettings.email}</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>→</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HelpdeskTab;
