import React from 'react';
import styles, { getModalOverlayStyle } from '../EmployeeStyles';

interface EmployeeHelpdeskModalProps {
  isSubmitHelpdeskModalOpen: boolean;
  setIsSubmitHelpdeskModalOpen: (open: boolean) => void;
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
}

export const EmployeeHelpdeskModal: React.FC<EmployeeHelpdeskModalProps> = ({
  isSubmitHelpdeskModalOpen,
  setIsSubmitHelpdeskModalOpen,
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
  setLoanContact
}) => {
  if (!isSubmitHelpdeskModalOpen) return null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCreateComplaint(e);
    setIsSubmitHelpdeskModalOpen(false);
  };

  return (
    <div 
      className="custom-overlay" 
      onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
      onClick={e => { 
        if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
          setIsSubmitHelpdeskModalOpen(false); 
        }
      }}
      style={getModalOverlayStyle(11000)}
    >
      <div 
        className="custom-dialog-card glass-panel" 
        onMouseDown={e => e.stopPropagation()} 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: '92%', 
          maxHeight: '88vh', 
          overflowY: 'auto', 
          textAlign: 'left', 
          alignItems: 'stretch', 
          padding: '24px 28px',
          borderRadius: 'var(--radius-md, 16px)',
          boxSizing: 'border-box'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Submit Request
          </h3>
          <button
            type="button"
            onClick={() => setIsSubmitHelpdeskModalOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              lineHeight: 1
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Draft status helper indicator */}
        {(complaintTitle || complaintDesc) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Draft recovered</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('draft_complaint');
                setComplaintTitle('');
                setComplaintDesc('');
              }}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              Clear Draft
            </button>
          </div>
        )}

        <form onSubmit={onSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Issue Type *</label>
            <select
              value={issueType}
              onChange={e => { setIssueType(e.target.value); setComplaintTitle(e.target.value); }}
              className="custom-select"
              style={styles.input}
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
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Loan Purpose / Name *</label>
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
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Contact Number *</label>
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
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Total Loan Amount (PKR) *</label>
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
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Repayment Duration (Months) *</label>
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
                <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Date *</label>
                <input
                  type="date"
                  value={correctionDate}
                  onChange={e => setCorrectionDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              {correctionDate && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={styles.formGroup}>
                    <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
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
                    <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
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
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>Description / Technical Details *</label>
              <textarea
                value={complaintDesc}
                onChange={e => setComplaintDesc(e.target.value)}
                placeholder="Provide details about the issue..."
                rows={4}
                style={{ ...styles.input, resize: 'vertical' }}
                required={issueType !== 'Loan Request'}
              />
            </div>
          )}

          <div style={{ marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontWeight: 700, borderRadius: 'var(--radius-sm)' }}>
              {issueType === 'Loan Request' ? 'Apply for Loan' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeHelpdeskModal;
