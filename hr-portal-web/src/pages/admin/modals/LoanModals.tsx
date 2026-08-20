import React from 'react';
import type { EmployeeLoan } from '../../../lib/dbHelper';
import styles from '../AdminStyles';

interface LoanModalsProps {
  editingLoan: EmployeeLoan | null;
  setEditingLoan: (loan: any) => void;
  editLoanName: string;
  setEditLoanName: (n: string) => void;
  editLoanAmount: string;
  setEditLoanAmount: (a: string) => void;
  editLoanMonthlyDeduction: string;
  setEditLoanMonthlyDeduction: (d: string) => void;
  handleSaveModifiedLoan: (e: React.FormEvent) => void;

  paymentLoan: EmployeeLoan | null;
  setPaymentLoan: (l: EmployeeLoan | null) => void;
  paymentAmount: string;
  setPaymentAmount: (a: string) => void;
  handleRecordPayment: (e: React.FormEvent) => void;
}

export const LoanModals: React.FC<LoanModalsProps> = ({
  editingLoan,
  setEditingLoan,
  editLoanName,
  setEditLoanName,
  editLoanAmount,
  setEditLoanAmount,
  editLoanMonthlyDeduction,
  setEditLoanMonthlyDeduction,
  handleSaveModifiedLoan,
  paymentLoan,
  setPaymentLoan,
  paymentAmount,
  setPaymentAmount,
  handleRecordPayment
}) => {
  return (
    <>
      {/* Modify Loan Dialog Modal */}
      {editingLoan && (
        <div className="custom-overlay" onClick={() => setEditingLoan(null)} style={{ zIndex: 12000 }}>
          <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ padding: '28px', width: '460px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Modify Loan Request Details</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Employee: <strong>{editingLoan.employee_name || 'Employee'}</strong> (PIN: {editingLoan.employee_pin})
            </p>
            <form onSubmit={handleSaveModifiedLoan} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label>Loan Purpose / Name *</label>
                <input
                  type="text"
                  value={editLoanName}
                  onChange={e => setEditLoanName(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Total Loan Amount (PKR) *</label>
                <input
                  type="number"
                  value={editLoanAmount}
                  onChange={e => setEditLoanAmount(e.target.value)}
                  style={styles.input}
                  min={1}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Monthly Deduction Amount (PKR) *</label>
                <input
                  type="number"
                  value={editLoanMonthlyDeduction}
                  onChange={e => setEditLoanMonthlyDeduction(e.target.value)}
                  style={styles.input}
                  min={1}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Duration (Months)</label>
                <input
                  type="number"
                  value={editingLoan.months_duration || 1}
                  onChange={e => setEditingLoan({...editingLoan, months_duration: parseInt(e.target.value, 10) || 1})}
                  style={styles.input}
                  min={1}
                  max={120}
                />
              </div>

              {parseFloat(editLoanAmount) > 0 && parseFloat(editLoanMonthlyDeduction) > 0 && (
                <div style={{ padding: '10px 14px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Per Month Deduction Calculation:</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '4px' }}>
                    Deducting <strong>PKR {parseFloat(editLoanMonthlyDeduction).toLocaleString()} / month</strong> until total of <strong>PKR {parseFloat(editLoanAmount).toLocaleString()}</strong> is complete (~{Math.ceil(parseFloat(editLoanAmount) / parseFloat(editLoanMonthlyDeduction))} months).
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingLoan(null)} style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Save Loan Changes
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
