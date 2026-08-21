import React from 'react';
import type { Complaint, EmployeeLoan } from '../../../lib/dbHelper';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import type { TrustedDeviceRecord } from '../../../utils/biometricAuth';
import CollapsibleCard from '../../../components/CollapsibleCard';
import styles from '../EmployeeStyles';

interface HelpdeskTabProps {
  complaintsList: Complaint[];
  employeeLoansList: EmployeeLoan[];
  profile: EmployeeProfile | null;
  user: any;
  selectedComplaintIds: number[];
  setSelectedComplaintIds: React.Dispatch<React.SetStateAction<number[]>>;
  hiddenComplaintIds: number[];
  handleDeleteComplaints: (ids: number[]) => void;
  handleDeleteLoan: (id: number) => void;
  handleCreateComplaint: (e: React.FormEvent) => void;
  issueTypes: string[];
  issueType: string;
  setIssueType: (t: string) => void;
  complaintTitle: string;
  setComplaintTitle: (s: string) => void;
  complaintDesc: string;
  setComplaintDesc: (d: string) => void;
  correctionDate: string;
  setCorrectionDate: (d: string) => void;
  correctionCheckIn: string;
  setCorrectionCheckIn: (t: string) => void;
  correctionCheckOut: string;
  setCorrectionCheckOut: (t: string) => void;
  existingCheckIn: string;
  existingCheckOut: string;
  loanName: string;
  setLoanName: (n: string) => void;
  loanAmount: string;
  setLoanAmount: (a: string) => void;
  loanDurationMonths: string;
  setLoanDurationMonths: (m: string) => void;
  loanContact: string;
  setLoanContact: (c: string) => void;
  empTrustedDevice: TrustedDeviceRecord | null;
  handleDisableEmpBiometric: () => void;
  handleRegisterEmpBiometric: () => void;
}

export const HelpdeskTab: React.FC<HelpdeskTabProps> = ({
  complaintsList,
  employeeLoansList,
  profile: _profile,
  user: _user,
  selectedComplaintIds,
  setSelectedComplaintIds,
  hiddenComplaintIds,
  handleDeleteComplaints,
  handleDeleteLoan,
  handleCreateComplaint,
  issueTypes,
  issueType,
  setIssueType,
  complaintTitle,
  setComplaintTitle,
  complaintDesc,
  setComplaintDesc,
  correctionDate,
  setCorrectionDate,
  correctionCheckIn,
  setCorrectionCheckIn,
  correctionCheckOut,
  setCorrectionCheckOut,
  existingCheckIn,
  existingCheckOut,
  loanName,
  setLoanName,
  loanAmount,
  setLoanAmount,
  loanDurationMonths,
  setLoanDurationMonths,
  loanContact,
  setLoanContact,
  empTrustedDevice,
  handleDisableEmpBiometric,
  handleRegisterEmpBiometric
}) => {
  return (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', width: '100%', alignItems: 'flex-start' }} className="animate-fade-in responsive-split-container">
          {/* Left panel column: Complaints & Loans */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

                const toggleSelectComplaint = (id: number) => {
                  setSelectedComplaintIds(prev => 
                    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                  );
                };

                return (
                  <>
                    {selectedComplaintIds.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>
                          {selectedComplaintIds.length} open ticket(s) selected
                        </span>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDeleteComplaints(selectedComplaintIds)}
                          style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          Cancel Selected ({selectedComplaintIds.length})
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
                                disabled={openComplaints.length === 0}
                                title="Select All Open"
                                style={{ cursor: openComplaints.length > 0 ? 'pointer' : 'default' }}
                              />
                            </th>
                            <th>Created At</th>
                            <th>Ticket Title</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'center', width: '70px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleComplaints.length > 0 ? (
                            visibleComplaints.map(c => {
                              const isOpen = c.status !== 'Resolved' && c.status !== 'Ignored' && c.status !== 'Rejected';
                              const isSelected = c.id ? selectedComplaintIds.includes(c.id) : false;
                              let displayDescription = c.description;
                              if (c.title === 'Check In/Out Entry Correction') {
                                try {
                                  const parsed = JSON.parse(c.description);
                                  displayDescription = `Date: ${parsed.date || '-'} | In: ${parsed.check_in || '-'} | Out: ${parsed.check_out || '-'}${parsed.reason ? ` | Reason: ${parsed.reason}` : ''}`;
                                } catch (e) {
                                  displayDescription = c.description;
                                }
                              }

                              return (
                                <tr key={c.id} style={{ ...styles.tableRow, background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                                  <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                                    {isOpen && c.id ? (
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelectComplaint(c.id!)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                    )}
                                  </td>
                                  <td style={{ ...styles.tableCell, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                    {c.created_at ? new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                  </td>
                                  <td style={styles.tableCell}><strong>{c.title}</strong></td>
                                  <td style={styles.tableCell}>{displayDescription}</td>
                                  <td style={styles.tableCell}>
                                    <span style={{
                                      padding: '4px 10px',
                                      borderRadius: 'var(--radius-full)',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      background: c.status === 'Resolved' ? 'rgba(16, 185, 129, 0.15)' : c.status === 'In Progress' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                      color: c.status === 'Resolved' ? '#10b981' : c.status === 'In Progress' ? '#3b82f6' : '#f59e0b'
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
                          ) : (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                No complaints submitted yet. Need help? Submit a ticket on the right.
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

            {/* Loan Applications List */}
            <CollapsibleCard title="Your Loan Applications & Repayment Status" defaultOpenMobile={true}>
              <div style={styles.tableContainer} className="table-slider-container">
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Applied At</th>
                      <th>Loan Name</th>
                      <th>Loan Amount</th>
                      <th>Monthly Deduction</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Repaid</th>
                      <th>Remaining</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeLoansList.length > 0 ? (
                      employeeLoansList.map(l => (
                        <tr 
                          key={l.id} 
                          style={{
                            ...styles.tableRow,
                            background: l.status === 'Approved' ? 'rgba(16, 185, 129, 0.08)' : l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.05)' : undefined,
                            borderLeft: l.status === 'Approved' ? '4px solid #10b981' : l.status === 'Rejected' ? '4px solid #ef4444' : undefined
                          }}
                        >
                          <td style={{ ...styles.tableCell, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {l.created_at ? new Date(l.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td style={styles.tableCell}><strong>{l.loan_name}</strong></td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--text-primary)' }}>PKR {l.loan_amount.toLocaleString()}</strong></td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap' }}>PKR {l.monthly_deduction.toLocaleString()} / mo ({l.months_duration || 1} mos)</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap' }}>{l.start_date ? new Date(l.start_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap' }}>{l.end_date ? new Date(l.end_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap' }}>PKR {(l.total_repaid || 0).toLocaleString()}</td>
                          <td style={{ ...styles.tableCell, whiteSpace: 'nowrap' }}><strong style={{ color: l.remaining_balance > 0 ? '#f59e0b' : '#10b981' }}>PKR {l.remaining_balance.toLocaleString()}</strong></td>
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
                          <td style={styles.tableCell}>
                            {l.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteLoan(l.id!)}
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
                          No loan requests submitted yet. Select "Loan Request" in the form to apply.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleCard>
          </div>

          {/* Right panel: Submit Complaint Form */}
          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minWidth: 0 }}>
            <CollapsibleCard title="Submit Tech Issue / Loan Request / Feedback" defaultOpenMobile={true}>
              {/* Draft status helper indicator */}
              {(complaintTitle || complaintDesc) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Draft recovered from localStorage</span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('draft_complaint');
                      setComplaintTitle('');
                      setComplaintDesc('');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Clear Draft
                  </button>
                </div>
              )}

              <form onSubmit={handleCreateComplaint} style={styles.form}>
                <div style={styles.formGroup}>
                  <label>Issue Type *</label>
                  <select
                    value={issueType}
                    onChange={e => { setIssueType(e.target.value); setComplaintTitle(e.target.value); }}
                    className="custom-select"
                    required
                  >
                    <option value="">-- Select Issue Type --</option>
                    {issueTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {issueType === 'Loan Request' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={styles.formGroup}>
                      <label>Loan Purpose / Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Personal Emergency Loan"
                        value={loanName}
                        onChange={e => setLoanName(e.target.value)}
                        required
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label>Contact Number *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 0300-1234567"
                        value={loanContact}
                        onChange={e => setLoanContact(e.target.value)}
                        required
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label>Total Loan Amount (PKR) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 50000"
                        value={loanAmount}
                        onChange={e => setLoanAmount(e.target.value)}
                        required
                        min={1}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label>Repayment Duration (Months) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={loanDurationMonths}
                        onChange={e => setLoanDurationMonths(e.target.value)}
                        required
                        min={1}
                        max={60}
                        style={styles.input}
                      />
                    </div>
                    {parseInt(loanDurationMonths, 10) > 0 && (
                      <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: '#10b981' }}>Repayment Schedule:</div>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          <span>Start: <strong>{new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</strong></span>
                          <span>End: <strong>{(() => { const d = new Date(); d.setMonth(d.getMonth() + parseInt(loanDurationMonths, 10)); return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }); })()}</strong></span>
                        </div>
                      </div>
                    )}
                    {parseFloat(loanAmount) > 0 && parseInt(loanDurationMonths, 10) > 0 && (
                      <div style={{ padding: '10px 14px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Per Month Deduction Calculation:</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, margin: '4px 0', color: 'var(--text-primary)' }}>
                          PKR {new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(parseFloat(loanAmount) / parseInt(loanDurationMonths, 10))} / month
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          This amount will be deducted per month until the total loan of PKR {new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(parseFloat(loanAmount))} is completed.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {issueType === 'Check In/Out Entry Correction' && (
                  <>
                    <div style={styles.formGroup}>
                      <label>Date *</label>
                      <input
                        type="date"
                        value={correctionDate}
                        onChange={e => setCorrectionDate(e.target.value)}
                        required
                      />
                    </div>
                    {correctionDate && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={styles.formGroup}>
                          <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Proposed Check-In Time</span>
                            {existingCheckIn && <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>Current: {existingCheckIn}</span>}
                          </label>
                          <input
                            type="time"
                            value={correctionCheckIn}
                            onChange={e => setCorrectionCheckIn(e.target.value)}
                            style={styles.input}
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Proposed Check-Out Time</span>
                            {existingCheckOut && <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>Current: {existingCheckOut}</span>}
                          </label>
                          <input
                            type="time"
                            value={correctionCheckOut}
                            onChange={e => setCorrectionCheckOut(e.target.value)}
                            style={styles.input}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {issueType && issueType !== 'Check In/Out Entry Correction' && (
                  <div style={styles.formGroup}>
                    <label>Description / Technical Details *</label>
                    <textarea
                      value={complaintDesc}
                      onChange={e => setComplaintDesc(e.target.value)}
                      placeholder="Provide details about the issue..."
                      rows={5}
                      required={issueType !== 'Loan Request'}
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', fontWeight: 600 }}>
                  {issueType === 'Loan Request' ? 'Apply for Loan' : 'Send Complaint'}
                </button>
              </form>
            </CollapsibleCard>

            {/* Trusted Device & Biometric Security Settings Card */}
            <CollapsibleCard title="Trusted Device & Biometric Security" defaultOpenMobile={true}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Enable <strong>Fingerprint / Touch ID / Face ID</strong> (like Meezan, HBL, UBL banking apps) to log in instantly without typing your password.
                </p>

                {empTrustedDevice ? (
                  <div style={{ background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={empTrustedDevice.icon_path || '/icons/fingerprint.svg'}
                        alt={empTrustedDevice.auth_type}
                        className="theme-icon"
                        style={{ width: '20px', height: '20px' }}
                      />
                      <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.85rem' }}>
                        ✓ {empTrustedDevice.auth_type === 'face_id' ? 'Face ID Active' : empTrustedDevice.auth_type === 'shield_key' ? 'Device PIN Active' : 'Fingerprint Active'} ({empTrustedDevice.device_name})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Icon File: <code>{empTrustedDevice.icon_name || 'fingerprint.svg'}</code>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Linked Account: <strong>{empTrustedDevice.email}</strong>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleDisableEmpBiometric} 
                      className="btn btn-secondary" 
                      style={{ width: '100%', fontSize: '0.8rem', color: 'var(--danger)' }}
                    >
                      Disable Biometric Login
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleRegisterEmpBiometric} 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '10px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span>Register / Trust This Device (Fingerprint / Face ID / PIN)</span>
                  </button>
                )}
              </div>
            </CollapsibleCard>
          </div>
        </div>
  );
};

export default HelpdeskTab;
