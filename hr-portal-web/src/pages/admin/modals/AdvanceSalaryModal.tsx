import React, { useState, useEffect } from 'react';
import type { EmployeeProfile, RawLog, LeaveRequest, ShiftTiming } from '../../../utils/attendanceProcessor';
import {
  processAttendanceLogs,
  getEmployeeShiftTiming,
  roundSalary
} from '../../../utils/attendanceProcessor';
import { saveSalaryDivisionPlans } from '../../../lib/dbHelper';
import { getModalOverlayStyle } from '../AdminStyles';

export interface SalaryDivision {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface SalaryDivisionPlan {
  monthKey: string; // e.g. "2026-08"
  divisionCount: number;
  divisions: SalaryDivision[];
}

interface AdvanceSalaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate?: string;
  profiles: EmployeeProfile[];
  rawLogs: RawLog[];
  leaveRequests: LeaveRequest[];
  holidaysList: any[];
  monthlyGraceSettings?: any;
  graceTimeMinsSetting: number;
  shiftTimings?: ShiftTiming[];
  complaintsList?: any[];
  approvedCorrectionsList?: any[];
  employeeLoansList?: any[];
  salaryDivisionPlans: Record<string, SalaryDivisionPlan>;
  setSalaryDivisionPlans: React.Dispatch<React.SetStateAction<Record<string, SalaryDivisionPlan>>>;
}

export const AdvanceSalaryModal: React.FC<AdvanceSalaryModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate: _endDate,
  profiles,
  rawLogs,
  leaveRequests,
  holidaysList,
  monthlyGraceSettings,
  graceTimeMinsSetting,
  shiftTimings = [],
  complaintsList = [],
  approvedCorrectionsList = [],
  employeeLoansList = [],
  salaryDivisionPlans,
  setSalaryDivisionPlans
}) => {
  // Extract Year & Month from startDate (e.g. "2026-08-01")
  const defaultYear = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
  const defaultMonth = startDate ? new Date(startDate).getMonth() : new Date().getMonth();

  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [divisionCount, setDivisionCount] = useState<number>(2);
  const [divisions, setDivisions] = useState<SalaryDivision[]>([]);

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' });

  // Initialize or load existing division plan for the selected month
  useEffect(() => {
    if (!isOpen) return;

    const existingPlan = salaryDivisionPlans[monthKey];
    const pad = (n: number) => String(n).padStart(2, '0');
    const moStr = pad(selectedMonth + 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    if (existingPlan && existingPlan.divisions && existingPlan.divisions.length > 0) {
      setDivisionCount(existingPlan.divisionCount || existingPlan.divisions.length);
      setDivisions(existingPlan.divisions);
    } else {
      // Default 2-division template (1st–15th and 16th–lastDay)
      setDivisionCount(2);
      setDivisions([
        {
          id: 'div-1',
          name: '1st Division (Advance Salary)',
          startDate: `${selectedYear}-${moStr}-01`,
          endDate: `${selectedYear}-${moStr}-15`
        },
        {
          id: 'div-2',
          name: '2nd Division (Final Settlement)',
          startDate: `${selectedYear}-${moStr}-16`,
          endDate: `${selectedYear}-${moStr}-${pad(lastDay)}`
        }
      ]);
    }
  }, [isOpen, monthKey, selectedYear, selectedMonth]);

  // When division count changes, regenerate or adjust divisions
  const handleDivisionCountChange = (count: number) => {
    const num = Math.max(2, Math.min(4, count));
    setDivisionCount(num);

    const pad = (n: number) => String(n).padStart(2, '0');
    const moStr = pad(selectedMonth + 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const daysPerDiv = Math.floor(lastDay / num);

    const newDivs: SalaryDivision[] = [];
    for (let i = 0; i < num; i++) {
      const startD = i === 0 ? 1 : (i * daysPerDiv + 1);
      const endD = i === num - 1 ? lastDay : ((i + 1) * daysPerDiv);
      const isFirst = i === 0;
      const isLast = i === num - 1;

      newDivs.push({
        id: `div-${i + 1}`,
        name: isFirst ? '1st Division (Advance)' : (isLast ? `${i + 1}th Division (Final Settlement)` : `Division #${i + 1}`),
        startDate: `${selectedYear}-${moStr}-${pad(startD)}`,
        endDate: `${selectedYear}-${moStr}-${pad(endD)}`
      });
    }
    setDivisions(newDivs);
  };

  const handleUpdateDivision = (index: number, field: keyof SalaryDivision, value: string) => {
    setDivisions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Helper: Calculate sum of day totals for all active employees over a specific date range
  const calculateDivisionTotalSum = (startStr: string, endStr: string) => {
    const holidayDates = holidaysList.map(h => h.date);

    return profiles
      .filter(p => p.role !== 'admin')
      .reduce((total, emp) => {
        const timing = getEmployeeShiftTiming(emp, shiftTimings);
        const effectiveGrace = timing.graceMins !== undefined
          ? timing.graceMins
          : (monthlyGraceSettings && Object.keys(monthlyGraceSettings).length > 0 ? monthlyGraceSettings : graceTimeMinsSetting);

        // Effective base and tax
        let effectiveTax = emp.income_tax || 0;
        let loanDed = 0;
        if (employeeLoansList && employeeLoansList.length > 0) {
          const activeLoans = employeeLoansList.filter(l =>
            l.status === 'Approved' && l.remaining_balance > 0 &&
            (l.employee_id === emp.id || l.employee_pin === emp.pin)
          );
          activeLoans.forEach(l => {
            let isDeducting = true;
            if (l.skipped_months && l.skipped_months.includes(monthKey)) isDeducting = false;
            if (l.selected_months && l.selected_months.length > 0 && !l.selected_months.includes(monthKey)) isDeducting = false;
            if (isDeducting) {
              loanDed += (l.monthly_deduction || 0);
              if (l.loan_tax_mode === 'custom' && l.loan_tax_amount !== undefined) {
                effectiveTax = l.loan_tax_amount;
              }
            }
          });
        }

        const effectiveBase = Math.max(0, (emp.base_salary || 0) - loanDed);
        const dailyBase = Math.max(0, effectiveBase - effectiveTax) / 30;

        const dailySummaries = processAttendanceLogs(
          emp,
          rawLogs,
          leaveRequests.filter(lr => lr.employee_id === emp.id),
          startStr,
          endStr,
          holidayDates,
          effectiveGrace,
          timing.startTime,
          timing.endTime,
          complaintsList,
          approvedCorrectionsList,
          timing.isFixedHours,
          timing.totalHours,
          shiftTimings,
          employeeLoansList
        );

        let empSum = 0;
        dailySummaries.forEach(s => {
          let dayTotal = 0;
          if (s.status === 'Absent' || s.status === 'Uninformed Absent') {
            dayTotal = Math.max(0, dailyBase - (s.absenceDeduction || 0));
          } else if (s.status === 'Unprocessed') {
            dayTotal = 0;
          } else {
            dayTotal = Math.max(0, dailyBase + (s.overtimePayout || 0) - (s.lateDeduction || 0));
          }
          empSum += dayTotal;
        });

        return total + roundSalary(empSum);
      }, 0);
  };

  // Save division plan
  const handleSavePlan = async () => {
    // Validate date sequences
    for (const d of divisions) {
      if (!d.startDate || !d.endDate) {
        if (window.customAlert) window.customAlert('Please specify valid start and end dates for all divisions.');
        return;
      }
      if (d.startDate > d.endDate) {
        if (window.customAlert) window.customAlert(`Start date cannot be after end date in "${d.name}".`);
        return;
      }
    }

    const updatedPlan: SalaryDivisionPlan = {
      monthKey,
      divisionCount,
      divisions
    };

    const nextPlans = {
      ...salaryDivisionPlans,
      [monthKey]: updatedPlan
    };

    setSalaryDivisionPlans(nextPlans);
    await saveSalaryDivisionPlans(nextPlans);

    if (window.customAlert) {
      window.customAlert(`Advance Salary & Division Plan for ${monthName} ${selectedYear} saved successfully to database! You can now select these divisions in the Export Salary modal.`);
    }
    onClose();
  };

  // Reset / clear plan for current month
  const handleClearPlan = async () => {
    const nextPlans = { ...salaryDivisionPlans };
    delete nextPlans[monthKey];
    setSalaryDivisionPlans(nextPlans);
    await saveSalaryDivisionPlans(nextPlans);

    if (window.customAlert) {
      window.customAlert(`Division plan cleared for ${monthName} ${selectedYear}. Exports will use standard full month calculation.`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="custom-overlay"
      onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
      onClick={e => {
        if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
          onClose();
        }
      }}
      style={getModalOverlayStyle(11600)}
    >
      <div
        className="custom-dialog-card glass-panel"
        style={{ maxWidth: '640px', width: '95%', textAlign: 'left', alignItems: 'stretch', padding: '24px', maxHeight: '90vh', overflowY: 'auto' }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <img src="/icons/calendar.png" alt="plan" className="theme-icon" style={{ width: '18px', height: '18px' }} />
              <span>Advance Salary & Division Plan</span>
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Configure advance payments and division date ranges for <strong>{monthName} {selectedYear}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Month & Division Count Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
              className="custom-select"
              style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
              Year
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="custom-select"
              style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px' }}>
              Number of Divisions
            </label>
            <select
              value={divisionCount}
              onChange={e => handleDivisionCountChange(parseInt(e.target.value, 10))}
              className="custom-select"
              style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 700 }}
            >
              <option value={2}>2 Divisions (e.g. 1st & 2nd Half)</option>
              <option value={3}>3 Divisions (10-Day Tranches)</option>
              <option value={4}>4 Divisions (Weekly Tranches)</option>
            </select>
          </div>
        </div>

        {/* Division List / Date Configuration Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {divisions.map((div, idx) => {
            const divTotal = calculateDivisionTotalSum(div.startDate, div.endDate);
            const isFirst = idx === 0;
            const isLast = idx === divisions.length - 1;

            return (
              <div
                key={div.id || idx}
                style={{
                  background: 'var(--bg-surface-hover)',
                  border: isFirst ? '1px solid rgba(59, 130, 246, 0.4)' : (isLast ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)'),
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      background: isFirst ? '#3b82f6' : (isLast ? '#10b981' : '#f59e0b'),
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '4px'
                    }}>
                      DIV #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={div.name}
                      onChange={e => handleUpdateDivision(idx, 'name', e.target.value)}
                      style={{
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        padding: '4px 8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        width: '240px'
                      }}
                      placeholder="Division Name"
                    />
                  </div>

                  {/* Estimated Employee Total */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Calculated Sum</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: isFirst ? '#3b82f6' : '#10b981' }}>
                      Rs. {divTotal.toLocaleString('en-PK')}
                    </div>
                  </div>
                </div>

                {/* Date Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={div.startDate}
                      onChange={e => handleUpdateDivision(idx, 'startDate', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={div.endDate}
                      onChange={e => handleUpdateDivision(idx, 'endDate', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Explanatory Info Card */}
        <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
          <strong style={{ color: '#3b82f6' }}>How it works: </strong>
          When you export a saved division, the system automatically sums each employee's exact <code>dayTotal</code> amounts from that division's start date to end date. When both divisions are exported, the sum equals the exact full month total with zero over-counting.
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {salaryDivisionPlans[monthKey] && (
              <button
                type="button"
                onClick={handleClearPlan}
                className="btn btn-secondary"
                style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', padding: '8px 14px', fontSize: '0.8rem' }}
              >
                Clear Saved Plan
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '8px 18px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePlan}
              className="btn btn-primary"
              style={{ padding: '8px 22px', fontWeight: 600 }}
            >
              Save Division Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
