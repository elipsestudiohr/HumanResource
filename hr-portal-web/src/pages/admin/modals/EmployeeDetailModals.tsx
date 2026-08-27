import React from 'react';
import type { Holiday, ShiftTiming } from '../../../lib/dbHelper';
import type { EmployeeProfile, LeaveRequest } from '../../../utils/attendanceProcessor';
import type { DailySummary } from '../../../utils/attendanceProcessor';
import { getEmployeeShiftTiming, formatClockDuration, formatOvertimeDuration } from '../../../utils/attendanceProcessor';
import { getModalOverlayStyle } from '../AdminStyles';

interface EmployeeDetailModalsProps {
  selectedCalendarProfile: EmployeeProfile | null;
  setSelectedCalendarProfile: (p: EmployeeProfile | null) => void;
  selectedAdminEmpCalendarDayData: any;
  setSelectedAdminEmpCalendarDayData: (d: any) => void;
  adminAttendanceViewMode: 'calendar' | 'table';
  setAdminAttendanceViewMode: (mode: 'calendar' | 'table') => void;
  selectedCalendarLogs: any[];
  setSelectedCalendarLogs: (logs: any[]) => void;
  getRawLogs: (pin?: string) => Promise<any[]>;
  adminViewMonth: number;
  setAdminViewMonth: (m: number) => void;
  adminViewYear: number;
  setAdminViewYear: (y: number) => void;
  getEmployeeCalendarData: () => DailySummary[];
  exportOtMode: 'with_ot' | 'without_ot' | 'base_x_ot';
  holidaysList: Holiday[];
  leaveRequests: LeaveRequest[];
  handleAdminEmpCalendarDayClick: (summary: any) => void;
  formatSalary: (val: number) => string;
  viewingProfileDetails: any;
  setViewingProfileDetails: (p: any) => void;
  showDetailsPassword: boolean;
  setShowDetailsPassword: (show: boolean) => void;
  getEmployeeShiftTimingHelper: (emp: EmployeeProfile) => any;
  handleEditTransferClick: (p: any) => void;
  setEmployeeModalTab: (tab: any) => void;
  setIsAddEmployeeModalOpen: (open: boolean) => void;
  handleEditProfileClick: (p: EmployeeProfile) => void;
  selectedCalendarDayData: any;
  setSelectedCalendarDayData: (d: any) => void;
  handleDeleteHoliday: (id: number) => void;
  setSelectedHolidayDate: (d: string) => void;
  setIsHolidayModalOpen: (open: boolean) => void;
  shiftTimings: ShiftTiming[];
  employeeLoansList?: any[];
  getEmployeeNetSalary?: (emp: EmployeeProfile) => number;
}

export const EmployeeDetailModals: React.FC<EmployeeDetailModalsProps> = ({
  selectedCalendarProfile,
  setSelectedCalendarProfile,
  selectedAdminEmpCalendarDayData,
  setSelectedAdminEmpCalendarDayData,
  adminAttendanceViewMode,
  setAdminAttendanceViewMode,
  selectedCalendarLogs,
  setSelectedCalendarLogs,
  getRawLogs,
  adminViewMonth,
  setAdminViewMonth,
  adminViewYear,
  setAdminViewYear,
  getEmployeeCalendarData,
  exportOtMode: _exportOtMode,
  holidaysList,
  leaveRequests,
  handleAdminEmpCalendarDayClick,
  formatSalary,
  viewingProfileDetails,
  setViewingProfileDetails,
  showDetailsPassword,
  setShowDetailsPassword,
  getEmployeeShiftTimingHelper,
  handleEditTransferClick,
  setEmployeeModalTab,
  setIsAddEmployeeModalOpen,
  handleEditProfileClick,
  selectedCalendarDayData,
  setSelectedCalendarDayData,
  handleDeleteHoliday,
  setSelectedHolidayDate,
  setIsHolidayModalOpen,
  shiftTimings,
  employeeLoansList
}) => {
  return (
    <>
      {/* Admin View Employee Attendance Calendar Modal */}
      {selectedCalendarProfile && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setSelectedCalendarProfile(null);
              setSelectedAdminEmpCalendarDayData(null);
            }
          }} 
          style={getModalOverlayStyle(11000)}
        >
          <div 
            className="custom-dialog-card glass-panel" 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
            style={{ padding: '24px', width: adminAttendanceViewMode === 'table' ? '1480px' : '1100px', maxWidth: '98vw', height: adminAttendanceViewMode === 'table' ? '88vh' : 'auto', maxHeight: '92vh', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Attendance Calendar</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Employee: <strong>{selectedCalendarProfile.full_name} (PIN: {selectedCalendarProfile.pin})</strong> | Raw Logs: {selectedCalendarLogs.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  onClick={async () => {
                    window.showLoading('Refreshing...');
                    try {
                      const l = await getRawLogs(selectedCalendarProfile.pin);
                      setSelectedCalendarLogs(l.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
                    } catch (e) { /* console removed */ }
                    finally { window.hideLoading(); }
                  }}
                  className="btn btn-secondary mobile-icon-only-btn"
                  style={{ padding: '6px 10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  title="Refresh from database"
                >
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>⟳</span>
                  <span className="hide-on-mobile"> Refresh</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => { setSelectedCalendarProfile(null); setSelectedAdminEmpCalendarDayData(null); }} 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Navigation & Selectors */}
            <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className={`btn ${adminAttendanceViewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}
                  onClick={() => setAdminAttendanceViewMode('calendar')}
                >
                  Monthly View (Calendar)
                </button>
                <button
                  type="button"
                  className={`btn ${adminAttendanceViewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600 }}
                  onClick={() => setAdminAttendanceViewMode('table')}
                >
                  Table View
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select 
                  value={adminViewMonth} 
                  onChange={e => { setAdminViewMonth(Number(e.target.value)); setSelectedAdminEmpCalendarDayData(null); }} 
                  style={{ width: 'auto', padding: '6px 10px', height: '36px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
                  className="custom-select"
                >
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select 
                  value={adminViewYear} 
                  onChange={e => { setAdminViewYear(Number(e.target.value)); setSelectedAdminEmpCalendarDayData(null); }} 
                  style={{ width: 'auto', padding: '6px 10px', height: '36px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
                  className="custom-select"
                >
                  {[2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Attendance Content: Table vs Calendar */}
            {adminAttendanceViewMode === 'table' ? (
              (() => {
                const summaries = getEmployeeCalendarData();
                const baseSalary = selectedCalendarProfile.base_salary || 0;
                let effectiveTax = selectedCalendarProfile.income_tax || 0;
                let loanDeduction = 0;

                const currentMonthKey = `${adminViewYear}-${String(adminViewMonth + 1).padStart(2, '0')}`;
                if (employeeLoansList && employeeLoansList.length > 0) {
                  const activeLoans = employeeLoansList.filter(l =>
                    l.status === 'Approved' && l.remaining_balance > 0 &&
                    (l.employee_id === selectedCalendarProfile.id || l.employee_pin === selectedCalendarProfile.pin)
                  );
                  activeLoans.forEach(l => {
                    let isDeducting = true;
                    if (l.skipped_months && l.skipped_months.includes(currentMonthKey)) isDeducting = false;
                    if (l.selected_months && l.selected_months.length > 0 && !l.selected_months.includes(currentMonthKey)) isDeducting = false;
                    if (isDeducting) {
                      loanDeduction += (l.monthly_deduction || 0);
                      if (l.loan_tax_mode === 'custom' && l.loan_tax_amount !== undefined) {
                        effectiveTax = l.loan_tax_amount;
                      }
                    }
                  });
                }

                const effectiveBase = Math.max(0, baseSalary - loanDeduction);
                const dailyBase = Math.max(0, effectiveBase - effectiveTax) / 30;

                let totalWorkedHoursSum = 0;
                let totalOvertimeHoursSum = 0;
                let totalCompensatedHoursSum = 0;
                let totalOvertimePayoutSum = 0;
                let totalLateDeductionsSum = 0;
                let totalAbsenceDeductionsSum = 0;

                summaries.forEach(s => {
                  totalWorkedHoursSum += s.workingHours || 0;
                  totalOvertimeHoursSum += s.overtimeHours || 0;
                  totalCompensatedHoursSum += s.compensatedOvertimeHours || 0;
                  totalOvertimePayoutSum += s.overtimePayout || 0;
                  totalLateDeductionsSum += s.lateDeduction || 0;
                  totalAbsenceDeductionsSum += s.absenceDeduction || 0;
                });

                const totalMonthAmountSum = summaries.reduce((sum, summary) => {
                  let dayTotal = 0;
                  if (summary.status === 'Absent' || summary.status === 'Uninformed Absent') {
                    dayTotal = Math.max(0, dailyBase - (summary.absenceDeduction || 0));
                  } else if (summary.status === 'Unprocessed') {
                    dayTotal = 0;
                  } else {
                    dayTotal = Math.max(0, dailyBase + (summary.overtimePayout || 0) - (summary.lateDeduction || 0));
                  }
                  return sum + dayTotal;
                }, 0);

                return (
                  <div style={{ width: '100%', flex: 1, maxHeight: 'calc(88vh - 160px)', minHeight: '450px', overflowY: 'auto', overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-surface-hover)', textAlign: 'left', position: 'sticky', top: 0, zIndex: 5 }}>
                          <th style={{ padding: '10px 12px' }}>Date</th>
                          <th style={{ padding: '10px 12px' }}>Day</th>
                          <th style={{ padding: '10px 12px' }}>Check-In</th>
                          <th style={{ padding: '10px 12px' }}>Check-Out</th>
                          <th style={{ padding: '10px 12px' }}>Working Hours</th>
                          <th style={{ padding: '10px 12px' }}>Overtime</th>
                          <th style={{ padding: '10px 12px' }}>Comp Time</th>
                          <th style={{ padding: '10px 12px' }}>OT Earned</th>
                          <th style={{ padding: '10px 12px', color: 'var(--danger)' }}>Deduction</th>
                          <th style={{ padding: '10px 12px' }}>Day Total Amount</th>
                          <th style={{ padding: '10px 12px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaries.map(summary => {
                          let dayTotal = 0;
                          if (summary.status === 'Absent' || summary.status === 'Uninformed Absent') {
                            dayTotal = Math.max(0, dailyBase - (summary.absenceDeduction || 0));
                          } else if (summary.status === 'Unprocessed') {
                            dayTotal = 0;
                          } else {
                            dayTotal = Math.max(0, dailyBase + (summary.overtimePayout || 0) - (summary.lateDeduction || 0));
                          }

                          const dayDed = (summary.absenceDeduction || 0) + (summary.lateDeduction || 0);

                          return (
                            <tr key={summary.date} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px 12px' }}>{summary.date}</td>
                              <td style={{ padding: '8px 12px' }}>{summary.dayName}</td>
                              <td style={{ padding: '8px 12px' }}>{summary.checkIn || '-'}</td>
                              <td style={{ padding: '8px 12px' }}>{summary.checkOut || '-'}</td>
                              <td style={{ padding: '8px 12px' }}>{summary.workingHours > 0 ? formatClockDuration(summary.workingHours) : '-'}</td>
                              <td style={{ padding: '8px 12px' }}>{summary.overtimeHours > 0 ? formatOvertimeDuration(summary.overtimeHours) : '-'}</td>
                              <td style={{ padding: '8px 12px', color: '#8b5cf6' }}>{summary.compensatedOvertimeHours > 0 ? formatOvertimeDuration(summary.compensatedOvertimeHours) : '-'}</td>
                              <td style={{ padding: '8px 12px' }}>{formatSalary(summary.overtimePayout)}</td>
                              <td style={{ padding: '8px 12px', color: dayDed > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: dayDed > 0 ? '700' : '400' }}>
                                {dayDed > 0 ? `- ${formatSalary(dayDed)}` : '-'}
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: '700', color: 'var(--success)' }}>
                                {dayTotal > 0 ? formatSalary(dayTotal) : '-'}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600,
                                  background: summary.status === 'Present' ? 'rgba(16, 185, 129, 0.15)' :
                                              (summary.status === 'Absent' || summary.status === 'Uninformed Absent') ? 'rgba(239, 68, 68, 0.15)' :
                                              summary.status === 'Holiday' ? 'rgba(239, 68, 68, 0.15)' :
                                              summary.status.includes('Leave') ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-surface-hover)',
                                  color: summary.status === 'Present' ? '#059669' :
                                         (summary.status === 'Absent' || summary.status === 'Uninformed Absent') ? '#dc2626' :
                                         summary.status === 'Holiday' ? '#dc2626' :
                                         summary.status.includes('Leave') ? '#7c3aed' : 'var(--text-muted)'
                                }}>
                                  {summary.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot style={{ position: 'sticky', bottom: 0, background: 'var(--bg-surface)', borderTop: '2px solid var(--border-color)', fontWeight: '700' }}>
                        <tr>
                          <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)' }}>MONTHLY TOTALS:</td>
                          <td style={{ padding: '10px 12px', color: 'var(--primary)' }}>{formatClockDuration(totalWorkedHoursSum)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--warning)' }}>{totalOvertimeHoursSum > 0 ? formatOvertimeDuration(totalOvertimeHoursSum) : '-'}</td>
                          <td style={{ padding: '10px 12px', color: '#8b5cf6' }}>{totalCompensatedHoursSum > 0 ? formatOvertimeDuration(totalCompensatedHoursSum) : '-'}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--success)' }}>{formatSalary(totalOvertimePayoutSum)}</td>
                          <td style={{ padding: '10px 12px', color: 'var(--danger)', fontWeight: '700' }}>
                            {(totalLateDeductionsSum + totalAbsenceDeductionsSum) > 0 ? `- ${formatSalary(totalLateDeductionsSum + totalAbsenceDeductionsSum)}` : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', color: 'var(--success)', fontSize: '0.92rem' }}>{formatSalary(totalMonthAmountSum)}</td>
                          <td style={{ padding: '10px 12px' }}>-</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()
            ) : (
              /* Calendar Days */
              (() => {
                const firstDayIndex = new Date(adminViewYear, adminViewMonth, 1).getDay();
                const startShift = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
                const daysInMonth = new Date(adminViewYear, adminViewMonth + 1, 0).getDate();
                const summaries = getEmployeeCalendarData();

                // Monthly OT stats
                let totalOvertimeMins = 0;
                let totalOvertimePayout = 0;
                let missingEntryDates = 0;
                summaries.forEach(s => {
                  if (s.overtimeHours > 0) {
                    totalOvertimeMins += Math.round(s.overtimeHours * 60);
                    totalOvertimePayout += s.overtimePayout || 0;
                  }
                  if (!s.checkIn || !s.checkOut) {
                    if (s.status === 'Present' || s.isLate) missingEntryDates++;
                  }
                });

                const cells: React.ReactNode[] = [];

                for (let i = 0; i < startShift; i++) {
                  cells.push(<div key={`empty-${i}`} className="calendar-empty-cell" style={{ minHeight: '75px' }}></div>);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                  const pad = (num: number) => num.toString().padStart(2, '0');
                  const dateStr = `${adminViewYear}-${pad(adminViewMonth + 1)}-${pad(day)}`;
                  const daySummary = summaries.find(s => s.date === dateStr);

                  let bgColor = 'var(--bg-surface)';
                  let textColor = 'var(--text-primary)';
                  let border = '1px solid var(--border-color)';
                  let label = '';

                  const holiday = holidaysList.find(h => h.date === dateStr);
                  const isBirthday = selectedCalendarProfile.date_of_birth ? (() => {
                    const dob = new Date(selectedCalendarProfile.date_of_birth + 'T00:00:00');
                    const cellDate = new Date(dateStr + 'T00:00:00');
                    return dob.getMonth() === cellDate.getMonth() && dob.getDate() === cellDate.getDate();
                  })() : false;

                  const ownLeave = leaveRequests.find(lr => {
                    if (lr.status !== 'Approved') return false;
                    return lr.employee_id === selectedCalendarProfile.id && dateStr >= lr.start_date && dateStr <= lr.end_date;
                  });

                  if (holiday) {
                    bgColor = 'rgba(239, 68, 68, 0.15)';
                    textColor = '#ef4444';
                    border = '1px solid rgba(239, 68, 68, 0.3)';
                    label = 'Holiday';
                  } else if (daySummary) {
                    const hasMissingEntry = (!daySummary.checkIn || !daySummary.checkOut) && (daySummary.status === 'Present' || daySummary.isLate);
                    if (daySummary.status === 'Sunday' || daySummary.status === 'Off Saturday' || String(daySummary.status || '').startsWith('Off')) {
                      bgColor = 'rgba(255, 255, 255, 0.04)';
                      textColor = 'var(--text-muted)';
                      label = daySummary.status === 'Sunday' ? 'Sunday' : 'Off';
                    } else if (hasMissingEntry) {
                      bgColor = 'rgba(239, 68, 68, 0.12)';
                      textColor = '#ef4444';
                      border = '2px solid rgba(239, 68, 68, 0.6)';
                      label = daySummary.checkIn ? 'No Check-Out' : daySummary.checkOut ? 'No Check-In' : 'Missing Entry';
                    } else if (daySummary.isAbsent) {
                      bgColor = 'rgba(239, 68, 68, 0.08)';
                      textColor = '#ef4444';
                      border = '1px solid rgba(239, 68, 68, 0.2)';
                      label = 'Uninformed Absent';
                    } else if (daySummary.isLate) {
                      bgColor = 'rgba(245, 158, 11, 0.08)';
                      textColor = '#f59e0b';
                      border = '1px solid rgba(245, 158, 11, 0.2)';
                      label = 'Late';
                    } else if (daySummary.status === 'Short Time') {
                      bgColor = 'rgba(59, 130, 246, 0.12)';
                      textColor = '#3b82f6';
                      border = '1px solid rgba(59, 130, 246, 0.35)';
                      label = 'Short Time';
                    } else if (daySummary.status === 'Present') {
                      bgColor = 'rgba(16, 185, 129, 0.08)';
                      textColor = '#10b981';
                      border = '1px solid rgba(16, 185, 129, 0.2)';
                      label = 'Present';
                    }
                  }

                  const currentSummary = daySummary || { date: dateStr, status: label || 'Uninformed Absent', isAbsent: !holiday && !ownLeave, workingHours: 0, overtimeHours: 0, overtimePayout: 0, checkIn: null, checkOut: null, dayName: '' } as DailySummary;

                  cells.push(
                    <div
                      key={day}
                      onClick={() => handleAdminEmpCalendarDayClick(currentSummary)}
                      style={{
                        minHeight: '75px',
                        background: bgColor,
                        border,
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                      className="dropdown-item-hover calendar-day-cell"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{day}</span>
                        <div className="calendar-dots-row">
                          {holiday && <span className="calendar-dot red" title={holiday.title}></span>}
                          {isBirthday && <span className="calendar-dot yellow" title="Birthday"></span>}
                          {label && <span className="calendar-dot green" title={label}></span>}
                        </div>
                      </div>
                      <div className="calendar-details-container" style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                        {isBirthday && (
                          <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: '700', textAlign: 'left', whiteSpace: 'nowrap' }}>Birthday</span>
                        )}
                        {label && (
                          <span style={{ 
                            fontSize: '0.68rem', 
                            fontWeight: 700, 
                            color: textColor, 
                            textAlign: 'right', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.01em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: '1.2'
                          }}>
                            {label === 'Uninformed Absent' ? 'Absent' : label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    {/* Standalone Monthly OT Summary bar */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Total OT: <strong style={{ color: 'var(--text-primary)' }}>{totalOvertimeMins > 0 ? formatClockDuration(totalOvertimeMins / 60) : '-'}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        OT Payout: <strong style={{ color: 'var(--text-primary)' }}>{totalOvertimePayout > 0 ? formatSalary(totalOvertimePayout) : '-'}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Missing Entries: <strong style={{ color: missingEntryDates > 0 ? 'var(--danger)' : 'var(--success)' }}>{missingEntryDates}</strong>
                      </div>
                    </div>

                    {/* Days Header */}
                    <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                        <div key={d} style={{ textAlign: 'center', padding: '4px', fontWeight: '700', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d}</div>
                      ))}
                    </div>

                    {/* 7-Column Day Cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', width: '100%' }}>
                      {cells}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Modal: Employee Details Popup (on row click) */}
      {viewingProfileDetails && (() => {
        const isTransfer = viewingProfileDetails.department === 'Finance / Transfers';
        const getEmploymentDuration = (joiningDate: string) => {
          if (!joiningDate) return 'N/A';
          const start = new Date(joiningDate + 'T00:00:00');
          const end = new Date();
          
          let years = end.getFullYear() - start.getFullYear();
          let months = end.getMonth() - start.getMonth();
          let days = end.getDate() - start.getDate();
          
          if (days < 0) {
            months--;
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days += prevMonth.getDate();
          }
          if (months < 0) {
            years--;
            months += 12;
          }
          
          let durationStr = '';
          if (years > 0) {
            durationStr += `${years} yr${years > 1 ? 's' : ''} `;
          }
          if (months > 0) {
            durationStr += `${months} mo${months > 1 ? 's' : ''} `;
          }
          if (days > 0 || durationStr === '') {
            durationStr += `${days} day${days !== 1 ? 's' : ''}`;
          }
          return durationStr;
        };

        return (
          <div 
            className="custom-overlay" 
            onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
            onClick={e => {
              if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
                setViewingProfileDetails(null);
                setShowDetailsPassword(false);
              }
            }} 
            style={getModalOverlayStyle(10500)}
          >
            <div 
              className="custom-dialog-card glass-panel" 
              onMouseDown={e => e.stopPropagation()} 
              onClick={e => e.stopPropagation()} 
              style={{ padding: '28px', width: '680px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  {isTransfer ? 'Transfer Record Details' : 'Employee Details'}
                </h3>
                <button 
                  type="button" 
                  onClick={() => { setViewingProfileDetails(null); setShowDetailsPassword(false); }} 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                {isTransfer ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Payee Name:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.1rem' }}>{viewingProfileDetails.full_name}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Purpose:</span>
                      <span style={{
                        color: viewingProfileDetails.designation === 'Charity' ? '#3b82f6' : '#f59e0b',
                        fontWeight: '700'
                      }}>{viewingProfileDetails.designation}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Date:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.joining_date}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Amount:</span>
                      <span style={{ color: 'var(--success)', fontWeight: '700' }}>Rs. {viewingProfileDetails.base_salary.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Payment Method:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{(viewingProfileDetails as any).payment_method || 'Bank'}</span>
                    </div>
                    {((viewingProfileDetails as any).payment_method || 'Bank') === 'Bank' ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Bank Name:</span>
                          <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.bank_name || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Account Title:</span>
                          <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.bank_account_title || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Account No:</span>
                          <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{viewingProfileDetails.bank_account_no || 'N/A'}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Details:</span>
                        <span style={{ color: '#10b981', fontWeight: '600' }}>Cash Payment</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>PIN:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{viewingProfileDetails.pin}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Full Name:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.1rem' }}>{viewingProfileDetails.full_name}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Email:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.email || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Password:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-primary)', fontFamily: showDetailsPassword ? 'monospace' : 'inherit' }}>
                          {showDetailsPassword ? (viewingProfileDetails.password || 'N/A') : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowDetailsPassword(!showDetailsPassword)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                          title={showDetailsPassword ? "Hide Password" : "Show Password"}
                        >
                          <img src={showDetailsPassword ? "/icons/eye-off.png" : "/icons/eye.png"} alt="view" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>NIC Number:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{(viewingProfileDetails as any).nic_no || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Payment Method:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{(viewingProfileDetails as any).payment_method || 'Bank'}</span>
                    </div>
                    {((viewingProfileDetails as any).payment_method || 'Bank') === 'Bank' ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Bank Name:</span>
                          <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.bank_name || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Account Title:</span>
                          <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.bank_account_title || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Account No:</span>
                          <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{viewingProfileDetails.bank_account_no || 'N/A'}</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Details:</span>
                        <span style={{ color: '#10b981', fontWeight: '600' }}>Cash Payment</span>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Department:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.department || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Designation:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.designation || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Shift Timing:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                        {(() => {
                          const t = getEmployeeShiftTimingHelper(viewingProfileDetails);
                          return t.isFixedHours 
                            ? `Fixed Hours (${t.startTime} - ${t.endTime}, ${t.totalHours}h Target)`
                            : `Flexible Hours (${t.startTime} - ${t.endTime}, ${t.totalHours}h Target)`;
                        })()}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Joining Date:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.joining_date}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Birth Date:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.date_of_birth || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Base Salary:</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Rs. {viewingProfileDetails.base_salary.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Hourly Rate:</span>
                      <span style={{ color: 'var(--text-primary)' }}>Rs. {(viewingProfileDetails.base_salary ? Math.round(Math.max(0, viewingProfileDetails.base_salary - (viewingProfileDetails.income_tax || 0)) / (30 * (getEmployeeShiftTimingHelper(viewingProfileDetails).totalHours || 9))) : (viewingProfileDetails.hourly_rate || 0)).toLocaleString()}/hr (After Tax)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Income Tax:</span>
                      <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Rs. {(viewingProfileDetails.income_tax || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Net Payable:</span>
                      <span style={{ color: 'var(--success)', fontWeight: '700', fontSize: '1.05rem' }}>Rs. {(viewingProfileDetails.base_salary - (viewingProfileDetails.income_tax || 0)).toLocaleString()}</span>
                    </div>

                    {/* Emergency Contacts List */}
                    {((viewingProfileDetails as any).emergency_contacts || []).length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Emergency Contacts:</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {((viewingProfileDetails as any).emergency_contacts).map((contact: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', padding: '6px 10px', background: 'var(--bg-surface-hover)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                              <strong>{contact.name}</strong> ({contact.relation}) - {contact.phone}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Employment periods list &computed duration */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Employment periods:</span>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                        Total Computed Duration: <strong>{getEmploymentDuration(viewingProfileDetails.joining_date)}</strong>
                      </div>
                      {((viewingProfileDetails as any).timeline_periods || []).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {((viewingProfileDetails as any).timeline_periods).map((period: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', padding: '6px 10px', background: 'var(--bg-surface-hover)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                              <div style={{ fontWeight: '600' }}>{period.heading}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{period.startDate} to {period.endDate}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No other periods defined.</div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {isTransfer ? (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      handleEditTransferClick(viewingProfileDetails);
                      setViewingProfileDetails(null);
                      setEmployeeModalTab('direct_transfer');
                      setIsAddEmployeeModalOpen(true);
                    }}
                    style={{ flex: 1, padding: '10px 16px', border: '1px solid var(--border-color)' }}
                  >
                    Edit Record
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedCalendarProfile(viewingProfileDetails);
                      setAdminViewYear(new Date().getFullYear());
                      setAdminViewMonth(new Date().getMonth());
                      setSelectedAdminEmpCalendarDayData(null);
                    }}
                    style={{ flex: 1, padding: '10px 16px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600 }}
                  >
                    Monthly View (Calendar)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      handleEditProfileClick(viewingProfileDetails);
                      setViewingProfileDetails(null);
                      setIsAddEmployeeModalOpen(true);
                    }}
                    style={{ flex: 1, padding: '10px 16px', border: '1px solid var(--border-color)' }}
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Modal: Office Calendar Day Details Dialog */}
      {selectedCalendarDayData && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setSelectedCalendarDayData(null);
            }
          }} 
          style={getModalOverlayStyle(10050)}
        >
          <div 
            className="custom-dialog-card glass-panel" 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
            style={{ padding: '24px', width: '460px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                Details for {new Date(selectedCalendarDayData.dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <button 
                type="button" 
                onClick={() => setSelectedCalendarDayData(null)} 
                className="btn btn-secondary" 
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              {/* Holiday Info */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Holiday Status</h4>
                {selectedCalendarDayData.holiday ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#ef4444' }}>{selectedCalendarDayData.holiday.title}</strong>
                      {selectedCalendarDayData.holiday.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedCalendarDayData.holiday.description}</div>}
                    </div>
                    <button
                      onClick={() => {
                        handleDeleteHoliday(selectedCalendarDayData.holiday!.id!);
                        setSelectedCalendarDayData(null);
                      }}
                      className="btn btn-danger"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No holiday declared on this day.</span>
                    <button
                      onClick={() => {
                        setSelectedHolidayDate(selectedCalendarDayData.dateStr);
                        setIsHolidayModalOpen(true);
                        setSelectedCalendarDayData(null);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Declare Holiday
                    </button>
                  </div>
                )}
              </div>

              {/* Birthdays Info */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Birthdays</h4>
                {selectedCalendarDayData.birthdays.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#f59e0b' }}>
                    {selectedCalendarDayData.birthdays.map((p: any) => (
                      <li key={p.id} style={{ fontWeight: '600' }}>Happy Birthday: {p.full_name} ({p.department || 'Staff'})</li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No employee birthdays on this day.</span>
                )}
              </div>

              {/* Leaves Info */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Active Leaves</h4>
                {selectedCalendarDayData.leaves.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedCalendarDayData.leaves.map((lr: any) => (
                      <div key={lr.id} style={{ fontSize: '0.8rem', padding: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{lr.employeeName}</strong>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600,
                            background: lr.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: lr.status === 'Approved' ? '#10b981' : '#f59e0b'
                          }}>{lr.status}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>Type: {lr.leave_type}</div>
                        {lr.reason && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>Reason: "{lr.reason}"</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No employees on leave on this day.</span>
                )}
              </div>

              {/* Employee Attendance List */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Employee Attendance</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {selectedCalendarDayData.attendanceList.map((att: any) => {
                    const statusColor = att.status === 'Present' ? '#10b981' :
                                        att.status === 'Late' ? '#f59e0b' :
                                        att.status.includes('Leave') ? '#8b5cf6' :
                                        att.status === 'Holiday' ? '#ef4444' : '#ef4444';
                    const statusBg = att.status === 'Present' ? 'rgba(16, 185, 129, 0.1)' :
                                     att.status === 'Late' ? 'rgba(245, 158, 11, 0.1)' :
                                     att.status.includes('Leave') ? 'rgba(139, 92, 246, 0.1)' :
                                     att.status === 'Holiday' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)';

                    return (
                      <div key={att.pin} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                          <strong>{att.employeeName}</strong>{' '}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>({att.pin})</span>
                          {(att.checkIn || att.checkOut) && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Punches: {att.checkIn || '-'} to {att.checkOut || '-'}
                            </div>
                          )}
                        </div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: '700',
                          color: statusColor, background: statusBg, border: `1px solid ${statusColor}33`
                        }}>
                          {att.status === 'Uninformed Absent' ? 'Absent' : att.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Employee Specific Calendar Day Details Dialog */}
      {selectedAdminEmpCalendarDayData && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setSelectedAdminEmpCalendarDayData(null);
            }
          }} 
          style={getModalOverlayStyle(12050)}
        >
          <div 
            className="custom-dialog-card glass-panel" 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
            style={{ padding: '24px', width: '400px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                Day Details: {selectedAdminEmpCalendarDayData.dateStr}
              </h3>
              <button 
                type="button" 
                onClick={() => setSelectedAdminEmpCalendarDayData(null)} 
                className="btn btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', fontSize: '0.85rem' }}>
              <div>
                <strong>Status:</strong>{' '}
                <span style={{
                  fontWeight: '700',
                  color: selectedAdminEmpCalendarDayData.holiday ? '#ef4444' :
                         selectedAdminEmpCalendarDayData.ownLeave ? '#10b981' :
                         selectedAdminEmpCalendarDayData.daySummary?.isAbsent ? '#ef4444' :
                         selectedAdminEmpCalendarDayData.daySummary?.isLate ? '#f59e0b' : '#10b981'
                }}>
                  {selectedAdminEmpCalendarDayData.holiday ? `Holiday (${selectedAdminEmpCalendarDayData.holiday.title})` :
                   selectedAdminEmpCalendarDayData.ownLeave ? `On Leave (${selectedAdminEmpCalendarDayData.ownLeave.leave_type})` :
                   selectedAdminEmpCalendarDayData.daySummary?.status || 'Uninformed Absent'}
                </span>
              </div>

              {selectedAdminEmpCalendarDayData.isBirthday && (
                <div style={{ color: '#f59e0b', fontWeight: '600' }}>
                  Today is this employee's birthday!
                </div>
              )}

              {selectedAdminEmpCalendarDayData.ownLeave && (
                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontWeight: '600', color: '#10b981' }}>Leave Request Details:</div>
                  <div>Status: {selectedAdminEmpCalendarDayData.ownLeave.status}</div>
                  {selectedAdminEmpCalendarDayData.ownLeave.reason && (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Reason: "{selectedAdminEmpCalendarDayData.ownLeave.reason}"</div>
                  )}
                </div>
              )}

              {selectedAdminEmpCalendarDayData.daySummary && !selectedAdminEmpCalendarDayData.holiday && !selectedAdminEmpCalendarDayData.ownLeave && (
                <>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><strong>Check In:</strong> {selectedAdminEmpCalendarDayData.daySummary.checkIn || '-'}</div>
                    <div><strong>Check Out:</strong> {selectedAdminEmpCalendarDayData.daySummary.checkOut || '-'}</div>
                    <div><strong>Working Hours:</strong> {selectedAdminEmpCalendarDayData.daySummary.workingHours > 0 ? formatClockDuration(selectedAdminEmpCalendarDayData.daySummary.workingHours) : '-'}</div>
                    {(() => {
                      const empObj = selectedCalendarProfile;
                      const empTiming = empObj ? getEmployeeShiftTiming(empObj, shiftTimings) : null;
                      const isModalComp = empTiming ? (empTiming.isFixedHours && !empTiming.allowRegularOvertime) : false;
                      const ds = selectedAdminEmpCalendarDayData.daySummary;

                      if (isModalComp) {
                        return (
                          <>
                            <div><strong>Compensation Time:</strong> {ds.compensatedOvertimeHours > 0 ? formatOvertimeDuration(ds.compensatedOvertimeHours) : '-'}</div>
                            <div><strong>Comp Payout:</strong> {ds.overtimePayout > 0 ? formatSalary(ds.overtimePayout) : '-'}</div>
                          </>
                        );
                      }
                      return (
                        <>
                          <div><strong>Overtime Hours:</strong> {ds.overtimeHours > 0 ? formatOvertimeDuration(ds.overtimeHours) : '-'}</div>
                          <div><strong>Overtime Payout:</strong> {ds.overtimePayout > 0 ? formatSalary(ds.overtimePayout) : '-'}</div>
                        </>
                      );
                    })()}
                    {(() => {
                      const ds = selectedAdminEmpCalendarDayData.daySummary;
                      const ded = (ds.absenceDeduction || 0) + (ds.lateDeduction || 0);
                      if (ded <= 0) return null;
                      const label = ds.absenceDeduction > 0 ? 'Absent' : (ds.isLate ? 'Late Arrival' : 'Short Time');
                      return (
                        <div>
                          <strong>Deduction ({label}):</strong>{' '}
                          <span style={{ color: 'var(--danger)', fontWeight: '700' }}>
                            - {formatSalary(ded)}
                          </span>
                        </div>
                      );
                    })()}
                    {(() => {
                      const emp = selectedCalendarProfile;
                      if (!emp) return null;
                      let effectiveTax = emp.income_tax || 0;
                      let loanDeduction = 0;
                      const currentMonthKey = `${adminViewYear}-${String(adminViewMonth + 1).padStart(2, '0')}`;
                      if (employeeLoansList && employeeLoansList.length > 0) {
                        const activeLoans = employeeLoansList.filter(l =>
                          l.status === 'Approved' && l.remaining_balance > 0 &&
                          (l.employee_id === emp.id || l.employee_pin === emp.pin)
                        );
                        activeLoans.forEach(l => {
                          let isDeducting = true;
                          if (l.skipped_months && l.skipped_months.includes(currentMonthKey)) isDeducting = false;
                          if (l.selected_months && l.selected_months.length > 0 && !l.selected_months.includes(currentMonthKey)) isDeducting = false;
                          if (isDeducting) {
                            loanDeduction += (l.monthly_deduction || 0);
                            if (l.loan_tax_mode === 'custom' && l.loan_tax_amount !== undefined) {
                              effectiveTax = l.loan_tax_amount;
                            }
                          }
                        });
                      }
                      const effectiveBase = Math.max(0, (emp.base_salary || 0) - loanDeduction);
                      const dailyBase = Math.max(0, effectiveBase - effectiveTax) / 30;
                      const ds = selectedAdminEmpCalendarDayData.daySummary;
                      let dayTotal = 0;
                      if (ds.status === 'Absent' || ds.status === 'Uninformed Absent') {
                        dayTotal = Math.max(0, dailyBase - (ds.absenceDeduction || 0));
                      } else if (ds.status === 'Unprocessed') {
                        dayTotal = 0;
                      } else {
                        dayTotal = Math.max(0, dailyBase + (ds.overtimePayout || 0) - (ds.lateDeduction || 0));
                      }
                      return (
                        <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }}>
                          <strong>Particular Day Total Amount:</strong> <span style={{ color: 'var(--success)', fontWeight: '700' }}>{formatSalary(dayTotal)}</span>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeDetailModals;
