import React from 'react';
import type { EmployeeLoan } from '../../../lib/dbHelper';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import styles from '../AdminStyles';

export interface LoanScheduleMonth {
  key: string;       // e.g. "2026-09"
  label: string;     // e.g. "Sep 2026"
  isSelected: boolean;
}

interface LoanModalsProps {
  scheduleModalLoan: EmployeeLoan | null;
  setScheduleModalLoan: (loan: EmployeeLoan | null) => void;
  scheduleModalMode: 'approve' | 'modify';
  scheduleLoanName: string;
  setScheduleLoanName: (n: string) => void;
  scheduleLoanAmount: string;
  setScheduleLoanAmount: (a: string) => void;
  scheduleDuration: number;
  setScheduleDuration: (d: number) => void;
  scheduleMonths: LoanScheduleMonth[];
  setScheduleMonths: React.Dispatch<React.SetStateAction<LoanScheduleMonth[]>>;
  handleConfirmLoanSchedule: (e: React.FormEvent) => void;
  profiles: EmployeeProfile[];

  paymentLoan: EmployeeLoan | null;
  setPaymentLoan: (l: EmployeeLoan | null) => void;
  paymentAmount: string;
  setPaymentAmount: (a: string) => void;
  handleRecordPayment: (e: React.FormEvent) => void;
}

export const LoanModals: React.FC<LoanModalsProps> = ({
  scheduleModalLoan,
  setScheduleModalLoan,
  scheduleModalMode,
  scheduleLoanName,
  setScheduleLoanName,
  scheduleLoanAmount,
  setScheduleLoanAmount,
  scheduleDuration,
  setScheduleDuration,
  scheduleMonths,
  setScheduleMonths,
  handleConfirmLoanSchedule,
  profiles,
  paymentLoan,
  setPaymentLoan,
  paymentAmount,
  setPaymentAmount,
  handleRecordPayment
}) => {
  if (!scheduleModalLoan && !paymentLoan) return null;

  const empProfile = scheduleModalLoan 
    ? profiles.find(p => p.id === scheduleModalLoan.employee_id || p.pin === scheduleModalLoan.employee_pin)
    : null;

  const netSalary = empProfile?.base_salary || 0;
  const loanAmt = parseFloat(scheduleLoanAmount) || 0;
  const activeSelectedMonths = scheduleMonths.filter(m => m.isSelected);
  const activeCount = activeSelectedMonths.length;
  const perMonthDeduction = activeCount > 0 ? Math.round(loanAmt / activeCount) : 0;
  const salaryPercent = (netSalary > 0 && perMonthDeduction > 0) ? Math.round((perMonthDeduction / netSalary) * 100) : 0;

  // Toggle month selection & dynamically extend next month if deselected
  const handleToggleMonth = (index: number) => {
    setScheduleMonths(prev => {
      const updated = [...prev];
      const target = updated[index];
      if (!target) return prev;
      
      const newSelected = !target.isSelected;
      target.isSelected = newSelected;

      // If deselecting a month, add an additional month at the end so duration is maintained
      if (!newSelected) {
        const lastMonth = updated[updated.length - 1];
        if (lastMonth) {
          const [yrStr, moStr] = lastMonth.key.split('-');
          let yr = parseInt(yrStr, 10);
          let mo = parseInt(moStr, 10); // 1-12
          mo += 1;
          if (mo > 12) {
            mo = 1;
            yr += 1;
          }
          const pad = (n: number) => n.toString().padStart(2, '0');
          const nextKey = `${yr}-${pad(mo)}`;
          const d = new Date(yr, mo - 1, 1);
          const nextLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          if (!updated.some(m => m.key === nextKey)) {
            updated.push({
              key: nextKey,
              label: nextLabel,
              isSelected: true
            });
          }
        }
      }
      return updated;
    });
  };

  return (
    <>
      {/* Interactive Loan Approval & Schedule Modal */}
      {scheduleModalLoan && (
        <div className="custom-overlay" onClick={() => setScheduleModalLoan(null)} style={{ zIndex: 12000 }}>
          <div 
            className="custom-dialog-card glass-panel" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              padding: '24px 28px', 
              width: '540px', 
              maxWidth: '92vw',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/icons/Salry.png" alt="Loan" style={{ width: '24px', height: '24px' }} />
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                  {scheduleModalMode === 'approve' ? 'Approve & Schedule Loan' : 'Modify Loan Schedule'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setScheduleModalLoan(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>

            {/* Employee Information Card with Net Salary */}
            <div style={{
              background: 'var(--bg-surface-hover, rgba(255, 255, 255, 0.05))',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
              borderRadius: 'var(--radius-md, 10px)',
              padding: '12px 16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {scheduleModalLoan.employee_name || 'Employee'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  PIN: <strong>{scheduleModalLoan.employee_pin}</strong>
                  {scheduleModalLoan.employee_contact && ` · ${scheduleModalLoan.employee_contact}`}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Employee Net Salary
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981' }}>
                  {netSalary > 0 ? `PKR ${netSalary.toLocaleString()}` : 'Not Specified'}
                </div>
              </div>
            </div>

            <form onSubmit={handleConfirmLoanSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label>Loan Purpose / Name *</label>
                <input
                  type="text"
                  value={scheduleLoanName}
                  onChange={e => setScheduleLoanName(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={styles.formGroup}>
                  <label>Total Loan Amount (PKR) *</label>
                  <input
                    type="number"
                    value={scheduleLoanAmount}
                    onChange={e => setScheduleLoanAmount(e.target.value)}
                    style={styles.input}
                    min={1}
                    required
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Duration (Months) *</label>
                  <input
                    type="number"
                    value={scheduleDuration}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setScheduleDuration(val);
                    }}
                    style={styles.input}
                    min={1}
                    max={60}
                    required
                  />
                </div>
              </div>

              {/* Dynamic Per-Month Deduction Calculation Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(37, 99, 235, 0.05))',
                border: '1.5px solid rgba(59, 130, 246, 0.35)',
                borderRadius: 'var(--radius-md, 10px)',
                padding: '12px 16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                    Automatic Per-Month Deduction:
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    PKR {perMonthDeduction.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ month</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Calculated across <strong>{activeCount} active selected month(s)</strong>
                  {salaryPercent > 0 && ` (${salaryPercent}% of monthly net salary)`}.
                </div>
              </div>

              {/* Month Selection List & Automatic Next-Month Transfer */}
              <div style={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ margin: 0, fontWeight: 700 }}>
                    Deduction Months Schedule ({activeCount} Active):
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Uncheck to skip & transfer to next month
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '8px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  padding: '4px',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                  borderRadius: 'var(--radius-sm, 8px)',
                  background: 'rgba(0, 0, 0, 0.15)'
                }}>
                  {scheduleMonths.map((m, idx) => (
                    <div
                      key={m.key}
                      onClick={() => handleToggleMonth(idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: m.isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                        border: m.isSelected ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed rgba(239, 68, 68, 0.4)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={m.isSelected}
                        onChange={() => {}} // Handled by parent div
                        style={{ cursor: 'pointer', accentColor: '#10b981' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ 
                          fontSize: '0.82rem', 
                          fontWeight: 700, 
                          color: m.isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                          textDecoration: m.isSelected ? 'none' : 'line-through'
                        }}>
                          {m.label}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: m.isSelected ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                          {m.isSelected ? `PKR ${perMonthDeduction.toLocaleString()}` : 'Skipped (Transferred)'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setScheduleModalLoan(null)} 
                  style={{ padding: '9px 18px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success" 
                  disabled={activeCount === 0 || loanAmt <= 0}
                  style={{ padding: '9px 22px', fontWeight: 700 }}
                >
                  {scheduleModalMode === 'approve' ? 'Confirm & Approve Loan' : 'Save Schedule Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Loan Payment Modal */}
      {paymentLoan && (
        <div className="custom-overlay" onClick={() => setPaymentLoan(null)} style={{ zIndex: 12000 }}>
          <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Record Loan Payment</h3>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Employee: <strong>{paymentLoan.employee_name || 'Employee'}</strong> — {paymentLoan.loan_name}
            </p>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <div>Remaining: <strong style={{ color: '#f59e0b' }}>PKR {paymentLoan.remaining_balance.toLocaleString()}</strong></div>
              <div>Monthly: <strong>PKR {paymentLoan.monthly_deduction.toLocaleString()}</strong></div>
            </div>
            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label>Payment Amount (PKR) *</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  style={styles.input}
                  min={1}
                  required
                />
              </div>
              {parseFloat(paymentAmount) > 0 && (
                <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <div style={{ color: '#10b981', fontWeight: 600 }}>After this payment:</div>
                  <div style={{ marginTop: '4px' }}>
                    Repaid: <strong>PKR {((paymentLoan.total_repaid || 0) + parseFloat(paymentAmount)).toLocaleString()}</strong>
                    {' · '}Remaining: <strong style={{ color: Math.max(0, paymentLoan.remaining_balance - parseFloat(paymentAmount)) <= 0 ? '#10b981' : '#f59e0b' }}>
                      PKR {Math.max(0, paymentLoan.remaining_balance - parseFloat(paymentAmount)).toLocaleString()}
                    </strong>
                    {Math.max(0, paymentLoan.remaining_balance - parseFloat(paymentAmount)) <= 0 && (
                      <span style={{ marginLeft: '8px', color: '#10b981', fontWeight: 700 }}>✓ FULLY PAID</span>
                    )}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setPaymentLoan(null)} style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LoanModals;
