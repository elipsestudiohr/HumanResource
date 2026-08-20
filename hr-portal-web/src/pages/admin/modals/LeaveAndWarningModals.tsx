import React from 'react';
import type { Holiday, Complaint } from '../../../lib/dbHelper';
import type { LeaveRequest, EmployeeProfile } from '../../../utils/attendanceProcessor';
import styles from '../AdminStyles';

export function calculateLeaveWorkingDays(startDateStr: string, endDateStr: string, holidayDates: string[] = []): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  let count = 0;
  const loop = new Date(start);
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
}

interface LeaveAndWarningModalsProps {
  selectedLeaveForApproval: LeaveRequest | null;
  setSelectedLeaveForApproval: (leave: LeaveRequest | null) => void;
  holidaysList: Holiday[];
  profiles: EmployeeProfile[];
  leaveBalancesList: any[];
  primaryLeaveDaysAllocated: number;
  setPrimaryLeaveDaysAllocated: (days: number) => void;
  chosenLeaveTypeForApproval: 'Annual' | 'Casual' | 'Medical';
  setChosenLeaveTypeForApproval: (type: 'Annual' | 'Casual' | 'Medical') => void;
  secondaryLeaveTypeForApproval: 'Annual' | 'Casual' | 'Medical';
  setSecondaryLeaveTypeForApproval: (type: 'Annual' | 'Casual' | 'Medical') => void;
  handleApproveLeaveWithDetails: () => void;

  editingLeaveBalanceEmp: EmployeeProfile | null;
  setEditingLeaveBalanceEmp: (emp: EmployeeProfile | null) => void;
  adjCasualUsed: number;
  setAdjCasualUsed: (n: number) => void;
  adjCasualTotal: number;
  setAdjCasualTotal: (n: number) => void;
  adjMedicalUsed: number;
  setAdjMedicalUsed: (n: number) => void;
  adjMedicalTotal: number;
  setAdjMedicalTotal: (n: number) => void;
  adjAnnualUsed: number;
  setAdjAnnualUsed: (n: number) => void;
  adjAnnualTotal: number;
  setAdjAnnualTotal: (n: number) => void;
  handleSaveLeaveBalanceAdjustment: (e: React.FormEvent) => void;

  warningTargetEmployee: EmployeeProfile | null;
  setWarningTargetEmployee: (emp: EmployeeProfile | null) => void;
  handleClearWarning: (id: string) => void;
  handleSaveWarning: (e: React.FormEvent) => void;
  warningText: string;
  setWarningText: (t: string) => void;
  warningExpiry: string;
  setWarningExpiry: (e: string) => void;
  warningColor: string;
  setWarningColor: (c: string) => void;

  editingCorrectionComplaint: Complaint | null;
  setEditingCorrectionComplaint: (c: Complaint | null) => void;
  handleSaveAndApproveCorrection: (e: React.FormEvent) => void;
  editCorrectionDate: string;
  setEditCorrectionDate: (d: string) => void;
  editCorrectionCheckIn: string;
  setEditCorrectionCheckIn: (t: string) => void;
  editCorrectionCheckOut: string;
  setEditCorrectionCheckOut: (t: string) => void;
}

export const LeaveAndWarningModals: React.FC<LeaveAndWarningModalsProps> = ({
  selectedLeaveForApproval,
  setSelectedLeaveForApproval,
  holidaysList,
  profiles,
  leaveBalancesList,
  primaryLeaveDaysAllocated,
  setPrimaryLeaveDaysAllocated,
  chosenLeaveTypeForApproval,
  setChosenLeaveTypeForApproval,
  secondaryLeaveTypeForApproval,
  setSecondaryLeaveTypeForApproval,
  handleApproveLeaveWithDetails,
  editingLeaveBalanceEmp,
  setEditingLeaveBalanceEmp,
  adjCasualUsed,
  setAdjCasualUsed,
  adjCasualTotal,
  setAdjCasualTotal,
  adjMedicalUsed,
  setAdjMedicalUsed,
  adjMedicalTotal,
  setAdjMedicalTotal,
  adjAnnualUsed,
  setAdjAnnualUsed,
  adjAnnualTotal,
  setAdjAnnualTotal,
  handleSaveLeaveBalanceAdjustment,
  warningTargetEmployee,
  setWarningTargetEmployee,
  handleClearWarning,
  handleSaveWarning,
  warningText,
  setWarningText,
  warningExpiry,
  setWarningExpiry,
  warningColor,
  setWarningColor,
  editingCorrectionComplaint,
  setEditingCorrectionComplaint,
  handleSaveAndApproveCorrection,
  editCorrectionDate,
  setEditCorrectionDate,
  editCorrectionCheckIn,
  setEditCorrectionCheckIn,
  editCorrectionCheckOut,
  setEditCorrectionCheckOut
}) => {
  return (
    <>
      {/* Leave Approval & Category Distribution Modal */}
      {selectedLeaveForApproval && (() => {
        const holidayDates = holidaysList.map(h => h.date);
        const totalWorkingDays = calculateLeaveWorkingDays(selectedLeaveForApproval.start_date, selectedLeaveForApproval.end_date, holidayDates);
        const emp = profiles.find(p => p.id === selectedLeaveForApproval.employee_id);
        const bal = leaveBalancesList.find(b => b.employee_id === selectedLeaveForApproval.employee_id);
        const casualRem = Math.max(0, (bal?.casual_total ?? 10) - (bal?.casual_used ?? 0));
        const medicalRem = Math.max(0, (bal?.medical_total ?? 10) - (bal?.medical_used ?? 0));
        const annualRem = Math.max(0, (bal?.annual_total ?? 10) - (bal?.annual_used ?? 0));

        const secondaryDays = Math.max(0, totalWorkingDays - primaryLeaveDaysAllocated);

        return (
          <div className="custom-overlay" onClick={() => setSelectedLeaveForApproval(null)} style={{ zIndex: 10010 }}>
            <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '28px', textAlign: 'left', alignItems: 'stretch' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                Approve Leave
              </h3>
              
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '12px 0', lineHeight: 1.4 }}>
                Request for <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{emp?.full_name || 'Employee'}</strong>: <strong>{selectedLeaveForApproval.start_date} to {selectedLeaveForApproval.end_date}</strong> (Total: <strong>{totalWorkingDays} working days</strong>).
              </div>

              {/* Current Balances Summary Box */}
              <div style={{ fontSize: '0.78rem', background: 'var(--bg-surface-hover)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Casual</div>
                  <strong style={{ color: casualRem > 0 ? '#10b981' : '#ef4444' }}>{casualRem} days rem</strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({bal?.casual_used ?? 0}/{bal?.casual_total ?? 10})</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Medical</div>
                  <strong style={{ color: medicalRem > 0 ? '#10b981' : '#ef4444' }}>{medicalRem} days rem</strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({bal?.medical_used ?? 0}/{bal?.medical_total ?? 10})</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Annual</div>
                  <strong style={{ color: annualRem > 0 ? '#10b981' : '#ef4444' }}>{annualRem} days rem</strong>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({bal?.annual_used ?? 0}/{bal?.annual_total ?? 10})</div>
                </div>
              </div>

              {/* Primary Category Allocation */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <div style={{ ...styles.formGroup, flex: 2 }}>
                  <label>Primary Leave Category *</label>
                  <select
                    value={chosenLeaveTypeForApproval}
                    onChange={e => {
                      const newType = e.target.value as any;
                      setChosenLeaveTypeForApproval(newType);
                      let rem = 10;
                      if (newType === 'Annual') rem = annualRem;
                      else if (newType === 'Casual') rem = casualRem;
                      else if (newType === 'Medical') rem = medicalRem;
                      setPrimaryLeaveDaysAllocated(Math.min(totalWorkingDays, rem > 0 ? rem : totalWorkingDays));
                    }}
                    style={styles.input}
                  >
                    <option value="Annual">Annual Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Medical">Medical Leave</option>
                  </select>
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Days Allocated *</label>
                  <input
                    type="number"
                    value={primaryLeaveDaysAllocated}
                    onChange={e => setPrimaryLeaveDaysAllocated(Math.min(totalWorkingDays, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={styles.input}
                    min={1}
                    max={totalWorkingDays}
                    required
                  />
                </div>
              </div>

              {/* Secondary Category Allocation (If days exceed primary allocation) */}
              {secondaryDays > 0 && (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', marginBottom: '8px' }}>
                    ⚠️ Exceeding Portion: {secondaryDays} remaining {secondaryDays === 1 ? 'day' : 'days'}
                  </div>
                  <div style={styles.formGroup}>
                    <label style={{ fontSize: '0.8rem' }}>Assign Exceeding {secondaryDays} {secondaryDays === 1 ? 'Day' : 'Days'} To Category *</label>
                    <select
                      value={secondaryLeaveTypeForApproval}
                      onChange={e => setSecondaryLeaveTypeForApproval(e.target.value as any)}
                      style={styles.input}
                    >
                      {['Casual', 'Medical', 'Annual'].filter(t => t !== chosenLeaveTypeForApproval).map(t => (
                        <option key={t} value={t}>{t} Leave</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ ...styles.btnGroup, marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedLeaveForApproval(null)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApproveLeaveWithDetails}
                  style={{ flex: 1, background: 'var(--success)' }}
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Direct Leave Balance Adjustment Editor modal */}
      {editingLeaveBalanceEmp && (
        <div className="custom-overlay" onClick={() => setEditingLeaveBalanceEmp(null)} style={{ zIndex: 10010 }}>
          <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', padding: '28px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Adjust Leave Quotas: {editingLeaveBalanceEmp.full_name}
            </h3>
            <form onSubmit={handleSaveLeaveBalanceAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Casual Used</label>
                  <input
                    type="number"
                    value={adjCasualUsed}
                    onChange={e => setAdjCasualUsed(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Casual Total</label>
                  <input
                    type="number"
                    value={adjCasualTotal}
                    onChange={e => setAdjCasualTotal(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Medical Used</label>
                  <input
                    type="number"
                    value={adjMedicalUsed}
                    onChange={e => setAdjMedicalUsed(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Medical Total</label>
                  <input
                    type="number"
                    value={adjMedicalTotal}
                    onChange={e => setAdjMedicalTotal(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Annual Used</label>
                  <input
                    type="number"
                    value={adjAnnualUsed}
                    onChange={e => setAdjAnnualUsed(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Annual Total</label>
                  <input
                    type="number"
                    value={adjAnnualTotal}
                    onChange={e => setAdjAnnualTotal(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingLeaveBalanceEmp(null)}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Save Adjustments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disciplinary warning modal */}
      {warningTargetEmployee && (
        <div className="custom-overlay" onClick={() => setWarningTargetEmployee(null)} style={{ zIndex: 10010 }}>
          <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '28px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Disciplinary Warning: {warningTargetEmployee.full_name}
            </h3>
            
            {warningTargetEmployee.warning_active && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', marginTop: '10px', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>Current active warning exists.</span>
                <button 
                  type="button" 
                  onClick={() => handleClearWarning(warningTargetEmployee.id)}
                  className="btn btn-danger"
                  style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                >
                  Clear Active Warning
                </button>
              </div>
            )}

            <form onSubmit={handleSaveWarning} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div style={styles.formGroup}>
                <label>Warning Reason *</label>
                <textarea
                  value={warningText}
                  onChange={e => setWarningText(e.target.value)}
                  placeholder="State the reason/details of the disciplinary warning..."
                  rows={3}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>Warning Expiry Date *</label>
                <input
                  type="date"
                  value={warningExpiry}
                  onChange={e => setWarningExpiry(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>Theme Color Palette *</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {['#ff3b57', '#ff8f00', '#00b8ff', '#7000ff', '#ff00a0'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setWarningColor(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: warningColor === color ? '3px solid var(--text-primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transform: warningColor === color ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.1s'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setWarningTargetEmployee(null);
                    setWarningText('');
                    setWarningExpiry('');
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', backgroundColor: warningColor }}
                >
                  Send Warning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attendance Correction Dialog Modal */}
      {editingCorrectionComplaint && (
        <div className="custom-overlay" onClick={() => setEditingCorrectionComplaint(null)} style={{ zIndex: 12000 }}>
          <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Edit & Approve Correction</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Employee: <strong>{profiles.find(p => p.id === editingCorrectionComplaint.employee_id)?.full_name || 'Unknown'}</strong>
            </p>
            <form onSubmit={handleSaveAndApproveCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label>Date *</label>
                <input
                  type="date"
                  value={editCorrectionDate}
                  onChange={e => setEditCorrectionDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Requested Check-In (e.g. 11:30 AM or 11:30)</label>
                <input
                  type="text"
                  value={editCorrectionCheckIn}
                  onChange={e => setEditCorrectionCheckIn(e.target.value)}
                  placeholder="e.g. 11:00 AM"
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label>Requested Check-Out (e.g. 08:00 PM or 20:00)</label>
                <input
                  type="text"
                  value={editCorrectionCheckOut}
                  onChange={e => setEditCorrectionCheckOut(e.target.value)}
                  placeholder="e.g. 08:00 PM"
                  style={styles.input}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCorrectionComplaint(null)} style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Approve & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LeaveAndWarningModals;
