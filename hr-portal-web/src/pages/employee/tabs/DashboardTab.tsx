import React from 'react';
import type { EmployeeProfile, DailySummary, EmployeePayrollSummary, LeaveRequest } from '../../../utils/attendanceProcessor';
import { getEmployeeShiftTiming } from '../../../utils/attendanceProcessor';
import type { Announcement, Holiday, ShiftTiming } from '../../../lib/dbHelper';
import { MonthlyBreakdownBarChart } from '../../../components/AttendanceCharts';
import CollapsibleCard from '../../../components/CollapsibleCard';
import styles from '../EmployeeStyles';

interface DashboardTabProps {
  theme: 'light' | 'dark';
  activeAnnouncements: Announcement[];
  isAnnouncementsExpanded: boolean;
  setIsAnnouncementsExpanded: (val: boolean) => void;
  calendarMonth: number;
  setCalendarMonth: (m: number) => void;
  calendarYear: number;
  setCalendarYear: (y: number) => void;
  calendarView: 'calendar' | 'table';
  setCalendarView: (v: 'calendar' | 'table') => void;
  profile: EmployeeProfile | null;
  user: any;
  empShiftTiming: any;
  officeGraceTime: number;
  payrollSummary: EmployeePayrollSummary | null;
  showEmployeeSalary: boolean;
  setShowEmployeeSalary: (val: boolean) => void;
  isCompensationMode: boolean;
  formatSalary: (amt: number) => string;
  formatClockDuration: (hrs: number) => string;
  formatOvertimeDuration: (hrs: number) => string;
  formatTo12h: (time24?: string) => string;
  attendanceSummaries: DailySummary[];
  holidaysList: Holiday[];
  allProfiles: EmployeeProfile[];
  leaveHistory: LeaveRequest[];
  leaveBalance: any | null;
  timingsList: ShiftTiming[];
  liveCurrentTime: string;
  liveDateString: string;
  liveElapsed: string;
  liveOvertime: string;
  liveCompensatedOvertime: string;
  liveIsCompMode: boolean;
  liveCheckInTime: string | null;
  liveCheckOutTime: string | null;
  totalOvertimeHours: number;
  totalOvertimeEarnings: number;
  lateCount: number;
  absentCount: number;
  netSalaryForMonth: number;
  monthNames: string[];
  setSelectedCalendarDay: (day: DailySummary | null) => void;
  getStatusTagStyle: (status: DailySummary['status'], isLate: boolean) => React.CSSProperties;
  fetchData: () => Promise<void>;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  theme,
  activeAnnouncements,
  isAnnouncementsExpanded,
  setIsAnnouncementsExpanded,
  calendarMonth,
  setCalendarMonth,
  calendarYear,
  setCalendarYear,
  calendarView,
  setCalendarView,
  profile,
  user: _user,
  empShiftTiming: _empShiftTiming,
  officeGraceTime: _officeGraceTime,
  payrollSummary,
  showEmployeeSalary,
  setShowEmployeeSalary,
  isCompensationMode,
  formatSalary,
  formatClockDuration,
  formatOvertimeDuration,
  formatTo12h: _formatTo12h,
  attendanceSummaries,
  holidaysList,
  allProfiles,
  leaveHistory: _leaveHistory,
  leaveBalance,
  timingsList,
  liveCurrentTime,
  liveDateString,
  liveElapsed,
  liveOvertime,
  liveCompensatedOvertime,
  liveIsCompMode,
  liveCheckInTime,
  liveCheckOutTime,
  totalOvertimeHours,
  totalOvertimeEarnings,
  lateCount,
  absentCount,
  netSalaryForMonth,
  monthNames,
  setSelectedCalendarDay,
  getStatusTagStyle: _getStatusTagStyle,
  fetchData
}) => {
  return (
        <div style={styles.dashboardContent} className="animate-fade-in">
          {/* Expandable Targeted Announcements (At TOP of Dashboard) */}
          {activeAnnouncements.length > 0 && (
            <div className="glass-panel" style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', boxSizing: 'border-box', marginBottom: '4px' }}>
              <div 
                onClick={() => setIsAnnouncementsExpanded(!isAnnouncementsExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                title={isAnnouncementsExpanded ? "Click to collapse announcements" : "Click to expand announcements"}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src="/icons/info.png" alt="announcement" className="theme-icon" style={{ width: '16px', height: '16px' }} />
                  <strong style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    Company Announcements
                  </strong>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {activeAnnouncements.length}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '0.75rem' }}>{isAnnouncementsExpanded ? 'Collapse' : 'Expand'}</span>
                  <span style={{ fontSize: '0.75rem', display: 'inline-block', transform: isAnnouncementsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                    ▼
                  </span>
                </div>
              </div>

              {isAnnouncementsExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', width: '100%' }} className="animate-fade-in">
                  {activeAnnouncements.map(ann => (
                    <div key={ann.id} className="glass-panel-glow" style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `4px solid ${ann.color || '#ff3b57'}`,
                      borderTop: '1px solid var(--border-color-glow)',
                      borderRight: '1px solid var(--border-color-glow)',
                      borderBottom: '1px solid var(--border-color-glow)',
                      background: `linear-gradient(90deg, ${ann.color || '#ff3b57'}0e 0%, rgba(255, 255, 255, 0.02) 100%)`,
                      textAlign: 'left',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{ann.title}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(ann.created_at || '').toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.45', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {ann.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Month/Year Filter Row */}
          <div className="glass-panel filters-scroll-container responsive-filter-bar" style={{
            padding: '10px 12px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '6px', width: '100%', flexWrap: 'wrap', boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <img src="/icons/clock.png" alt="period" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>Period:</strong>
              </div>
              <select
                value={calendarMonth}
                onChange={e => { setCalendarMonth(parseInt(e.target.value)); }}
                style={{ width: 'auto', minWidth: '85px', padding: '4px 8px', fontSize: '0.8rem' }}
                className="custom-select"
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
              <select
                value={calendarYear}
                onChange={e => setCalendarYear(parseInt(e.target.value))}
                style={{ width: 'auto', minWidth: '70px', padding: '4px 8px', fontSize: '0.8rem' }}
                className="custom-select"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} className="hide-on-mobile">
                {attendanceSummaries.length} days
              </span>
              <button onClick={fetchData} title="Refresh from database" className="btn btn-secondary mobile-icon-only-btn" style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>⟳</span>
                <span className="hide-on-mobile"> Refresh</span>
              </button>
            </div>
          </div>

          {/* Main Panel (Full Width) */}
          <div style={{ ...styles.mainPanel, flex: '1 1 100%' }}>
            
            {/* Always Visible Live Dynamic Clock & Real-Time Shift Tracker Card */}
            <div className="glass-panel responsive-live-clock-card" style={{
              width: '100%',
              padding: '16px 20px',
              marginBottom: '16px',
              borderRadius: 'var(--radius-lg, 16px)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              boxSizing: 'border-box'
            }}>
              {/* Left Column: Live Real-Time Clock & Today's Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <img src="/icons/clock.png" alt="clock" className="theme-icon" style={{ width: '22px', height: '22px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontFamily: "'Courier New', 'Fira Code', monospace",
                      fontSize: '1.65rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      letterSpacing: '0.05em',
                      lineHeight: 1
                    }}>
                      {liveCurrentTime || '--:--:--'}
                    </span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      LIVE
                    </span>
                  </div>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {liveDateString}
                  </span>
                </div>
              </div>

              {/* Right Column: Shift Status & Dynamic Elapsed Timer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {liveCheckInTime && !liveCheckOutTime ? (
                  /* Checked In & Active Shift */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md, 12px)',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                        animation: 'pulse-dot 1.5s ease-in-out infinite',
                        flexShrink: 0
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Active Shift (Checked In)
                        </span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          Check In: <strong style={{ color: 'var(--text-primary)' }}>{liveCheckInTime}</strong>
                        </span>
                      </div>
                    </div>

                    {liveElapsed && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid rgba(16, 185, 129, 0.25)', paddingLeft: '16px', flexWrap: 'wrap' }}>
                        {/* Total Work Elapsed */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{
                            fontFamily: "'Courier New', 'Fira Code', monospace",
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: '#10b981',
                            letterSpacing: '0.05em'
                          }}>
                            {liveElapsed}
                          </span>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                            WORK ELAPSED
                          </span>
                        </div>

                        {liveIsCompMode ? (
                          /* Compensation 1X Mode (Fixed Hours without Overtime) */
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{
                              fontFamily: "'Courier New', 'Fira Code', monospace",
                              fontSize: '1.15rem',
                              fontWeight: 800,
                              color: liveCompensatedOvertime !== '00:00:00' ? '#3b82f6' : 'var(--text-secondary)',
                              letterSpacing: '0.05em'
                            }}>
                              {liveCompensatedOvertime}
                            </span>
                            <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                              COMPENSATION 1X
                            </span>
                          </div>
                        ) : (
                          /* Overtime Allowed Mode */
                          <>
                            {/* Overtime */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{
                                fontFamily: "'Courier New', 'Fira Code', monospace",
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                color: liveOvertime !== '00:00:00' ? '#f59e0b' : 'var(--text-secondary)',
                                letterSpacing: '0.05em'
                              }}>
                                {liveOvertime}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                                OVERTIME
                              </span>
                            </div>

                            {/* Compensation Time */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{
                                fontFamily: "'Courier New', 'Fira Code', monospace",
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                color: liveCompensatedOvertime !== '00:00:00' ? '#3b82f6' : 'var(--text-secondary)',
                                letterSpacing: '0.05em'
                              }}>
                                {liveCompensatedOvertime}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                                COMPENSATION TIME
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : liveCheckInTime && liveCheckOutTime ? (
                  /* Shift Completed Today */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md, 12px)'
                  }}>
                    <img src="/icons/check-circle.png" alt="completed" className="theme-icon" style={{ width: '18px', height: '18px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                        Shift Completed Today
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        In: <strong style={{ color: 'var(--text-primary)' }}>{liveCheckInTime}</strong> | Out: <strong style={{ color: 'var(--text-primary)' }}>{liveCheckOutTime}</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Pending Check-In */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md, 12px)'
                  }}>
                    <img src="/icons/clock.png" alt="pending" className="theme-icon" style={{ width: '18px', height: '18px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Today's Attendance Status
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Pending Check-In Punch
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.welcomeRow}>
              <CollapsibleCard title="Profile Details" style={styles.profileCard}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button 
                    onClick={() => setShowEmployeeSalary(!showEmployeeSalary)}
                    className="btn btn-secondary mobile-icon-only"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', height: '28px' }}
                    title={showEmployeeSalary ? "Hide Salary Info" : "Show Salary Info"}
                  >
                    <img 
                      src={showEmployeeSalary ? "/icons/eye-off.png" : "/icons/eye.png"} 
                      alt="toggle" 
                      className="theme-icon" 
                      style={{ width: '12px', height: '12px' }} 
                    />
                    <span>{showEmployeeSalary ? "Hide" : "Reveal"}</span>
                  </button>
                </div>
                <div style={styles.profileGrid}>
                  <div><strong>Pin ID:</strong> {profile?.pin}</div>
                  <div><strong>Department:</strong> {profile?.department || 'N/A'}</div>
                  <div><strong>Designation:</strong> {profile?.designation || 'N/A'}</div>
                  <div><strong>Joining Date:</strong> {profile?.joining_date}</div>
                  <div>
                    <strong>Shift Timing:</strong>{' '}
                    {(() => {
                      const empTiming = getEmployeeShiftTiming(profile || ({} as any), timingsList);
                      if (empTiming.isFixedHours) {
                        return (
                          <span style={{ fontWeight: 700, color: 'var(--primary)', background: 'var(--bg-surface-hover)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-block', whiteSpace: 'nowrap' }}>
                            Fix Hours ({empTiming.totalHours || 9}h Shift)
                          </span>
                        );
                      }
                      return <span style={{ whiteSpace: 'nowrap' }}>{empTiming.startTime} to {empTiming.endTime}</span>;
                    })()}
                  </div>
                  {(() => {
                    const baseSalary = profile?.base_salary || 0;
                    const realTax = profile?.income_tax || 0;
                    const shiftHrs = getEmployeeShiftTiming(profile || ({} as any), timingsList).totalHours || 9;
                    const monthlyHours = 30 * shiftHrs;
                    const realHourly = baseSalary 
                      ? Math.round(Math.max(0, baseSalary - realTax) / monthlyHours) 
                      : (profile?.hourly_rate || 0);

                    const loanDed = payrollSummary?.loanDeduction || 0;
                    const effectiveBase = Math.max(0, baseSalary - loanDed);
                    const effectiveTax = payrollSummary?.incomeTax ?? realTax;
                    const loanHourly = baseSalary 
                      ? Math.round(Math.max(0, effectiveBase - effectiveTax) / monthlyHours) 
                      : (profile?.hourly_rate || 0);

                    return (
                      <>
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal">
                          <strong>Base Salary:</strong> {showEmployeeSalary ? `${formatSalary(baseSalary)}/mo` : '••••••/mo'}
                          {loanDed > 0 && (
                            <span 
                              style={{ 
                                fontWeight: 700, 
                                color: '#f59e0b', 
                                fontSize: '0.82rem', 
                                marginLeft: '8px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                display: 'inline-block'
                              }}
                              title={`Contract: Rs. ${baseSalary.toLocaleString()} - Loan: Rs. ${loanDed.toLocaleString()}`}
                            >
                              {showEmployeeSalary ? `Rs. ${effectiveBase.toLocaleString()} (Loan Base)` : '••••••'}
                            </span>
                          )}
                        </div>
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal">
                          <strong>Hourly Rate:</strong> {showEmployeeSalary ? `${formatSalary(realHourly)}/hr (After Tax)` : '••••••/hr'}
                          {loanDed > 0 && (
                            <span 
                              style={{ 
                                fontWeight: 700, 
                                color: '#f59e0b', 
                                fontSize: '0.82rem', 
                                marginLeft: '8px',
                                background: 'rgba(245, 158, 11, 0.12)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                display: 'inline-block'
                              }}
                              title={`Effective hourly rate during active loan deduction month`}
                            >
                              {showEmployeeSalary ? `Rs. ${loanHourly}/hr (Loan Rate)` : '••••••'}
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CollapsibleCard>

              <CollapsibleCard title={`${monthNames[calendarMonth]} Summary`} style={styles.statsCard}>
                <div style={styles.statsGrid}>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/clock.png" 
                      alt="clock" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4 style={{ whiteSpace: 'nowrap' }}>{formatOvertimeDuration(totalOvertimeHours)}</h4>
                      <span style={{ whiteSpace: 'nowrap' }}>{isCompensationMode ? 'Comp Time' : 'Overtime'}</span>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/check-circle.png" 
                      alt="earnings" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4 onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} title="Click to toggle reveal">{showEmployeeSalary ? formatSalary(totalOvertimeEarnings) : '••••••'}</h4>
                      <span style={{ whiteSpace: 'nowrap' }}>{isCompensationMode ? 'Comp Payout' : 'OT Payout'}</span>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/clock.png" 
                      alt="late" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4>{lateCount}</h4>
                      <span>Late Arrivals</span>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/alert.png" 
                      alt="absent" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4>{absentCount}</h4>
                      <span>Absences</span>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/check-circle.png" 
                      alt="net" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4 onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal">
                        {showEmployeeSalary ? formatSalary(netSalaryForMonth) : '••••••'}
                      </h4>
                      <span>Net Salary</span>
                    </div>
                  </div>
                </div>
              </CollapsibleCard>
            </div>

            {/* Personal Monthly Attendance Statistics Chart */}
            <div style={{ width: '100%' }}>
              <MonthlyBreakdownBarChart 
                presentCount={attendanceSummaries.filter(s => s.status === 'Present' && s.checkIn && s.checkOut && !s.isLate).length}
                lateCount={attendanceSummaries.filter(s => s.isLate).length}
                missingCheckoutCount={attendanceSummaries.filter(s => (!s.checkIn || !s.checkOut) && (s.status === 'Present' || s.isLate)).length}
                leaveCount={attendanceSummaries.filter(s => s.status.includes('Leave')).length}
                absentCount={attendanceSummaries.filter(s => s.isAbsent).length}
                title={`Personal Attendance Statistics (${monthNames[calendarMonth]} ${calendarYear})`}
              />
            </div>

            {/* Leave Balances Display (Without Apply Button) */}
            <div style={styles.balancesSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={styles.sectionTitle}>Available Leave Balances</h2>
              </div>
              <div style={styles.balancesGrid}>
                <div className="glass-panel" style={styles.balanceCard}>
                  <div style={styles.balanceHeader}>
                    <span style={styles.balanceType}>Casual Leaves</span>
                    <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.casual_total - leaveBalance.casual_used : 10} Left</span>
                  </div>
                  <div style={styles.balanceProgressBg}>
                    <div 
                      style={{
                        ...styles.balanceProgressBar, 
                        backgroundColor: 'var(--primary)',
                        width: `${leaveBalance ? ((leaveBalance.casual_total - leaveBalance.casual_used) / leaveBalance.casual_total) * 100 : 100}%`
                      }}
                    ></div>
                  </div>
                  <small style={styles.balanceSub}>Used: {leaveBalance?.casual_used || 0} / Total: {leaveBalance?.casual_total || 10}</small>
                </div>

                <div className="glass-panel" style={styles.balanceCard}>
                  <div style={styles.balanceHeader}>
                    <span style={styles.balanceType}>Medical Leaves</span>
                    <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.medical_total - leaveBalance.medical_used : 10} Left</span>
                  </div>
                  <div style={styles.balanceProgressBg}>
                    <div 
                      style={{
                        ...styles.balanceProgressBar, 
                        backgroundColor: 'var(--accent)',
                        width: `${leaveBalance ? ((leaveBalance.medical_total - leaveBalance.medical_used) / leaveBalance.medical_total) * 100 : 100}%`
                      }}
                    ></div>
                  </div>
                  <small style={styles.balanceSub}>Used: {leaveBalance?.medical_used || 0} / Total: {leaveBalance?.medical_total || 10}</small>
                </div>

                <div className="glass-panel" style={styles.balanceCard}>
                  <div style={styles.balanceHeader}>
                    <span style={styles.balanceType}>Annual Leaves</span>
                    <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.annual_total - leaveBalance.annual_used : 10} Left</span>
                  </div>
                  <div style={styles.balanceProgressBg}>
                    <div 
                      style={{
                        ...styles.balanceProgressBar, 
                        backgroundColor: 'var(--success)',
                        width: `${leaveBalance ? ((leaveBalance.annual_total - leaveBalance.annual_used) / leaveBalance.annual_total) * 100 : 100}%`
                      }}
                    ></div>
                  </div>
                  <small style={styles.balanceSub}>Used: {leaveBalance?.annual_used || 0} / Total: {leaveBalance?.annual_total || 10}</small>
                </div>
              </div>
            </div>

            {/* Attendance View (Calendar or Table) */}
            <div className="glass-panel" style={{ ...styles.tablePanel, padding: '16px 20px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '16px' }}>
                {/* Top Row: Heading on Left, View Toggle Buttons UP at TOP RIGHT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    Attendance & Overtime
                  </h2>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}>
                    <button 
                      onClick={() => setCalendarView('calendar')} 
                      className="btn mobile-icon-only-btn" 
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: calendarView === 'calendar' ? 'var(--primary)' : 'var(--bg-surface-hover)',
                        color: calendarView === 'calendar' ? 'var(--btn-primary-text, #ffffff)' : 'var(--text-secondary)',
                        border: `1px solid ${calendarView === 'calendar' ? 'var(--primary)' : 'var(--border-color)'}`,
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Calendar View"
                    >
                      <img 
                        src="/icons/calendar.png" 
                        alt="Calendar" 
                        className="theme-icon" 
                        style={{ 
                          width: '14px', 
                          height: '14px',
                          filter: theme === 'dark' ? (calendarView === 'calendar' ? 'brightness(0)' : 'brightness(0) invert(1)') : (calendarView === 'calendar' ? 'brightness(0) invert(1)' : 'brightness(0)')
                        }} 
                      />
                      <span className="hide-on-mobile">Calendar</span>
                    </button>
                    <button 
                      onClick={() => setCalendarView('table')} 
                      className="btn mobile-icon-only-btn" 
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: calendarView === 'table' ? 'var(--primary)' : 'var(--bg-surface-hover)',
                        color: calendarView === 'table' ? 'var(--btn-primary-text, #ffffff)' : 'var(--text-secondary)',
                        border: `1px solid ${calendarView === 'table' ? 'var(--primary)' : 'var(--border-color)'}`,
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Table View"
                    >
                      <img 
                        src="/icons/file-text.png" 
                        alt="Table" 
                        className="theme-icon" 
                        style={{ 
                          width: '14px', 
                          height: '14px',
                          filter: theme === 'dark' ? (calendarView === 'table' ? 'brightness(0)' : 'brightness(0) invert(1)') : (calendarView === 'table' ? 'brightness(0) invert(1)' : 'brightness(0)')
                        }} 
                      />
                      <span className="hide-on-mobile">Table</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Month & Year Select Dropdowns */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={calendarMonth}
                    onChange={e => setCalendarMonth(parseInt(e.target.value))}
                    className="custom-select"
                    style={{ width: 'auto', minWidth: '110px', padding: '6px 10px', fontSize: '0.82rem' }}
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx} value={idx}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={calendarYear}
                    onChange={e => setCalendarYear(parseInt(e.target.value))}
                    className="custom-select"
                    style={{ width: 'auto', minWidth: '80px', padding: '6px 10px', fontSize: '0.82rem' }}
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              {calendarView === 'table' ? (
                <div style={{ padding: '16px', overflowX: 'auto' }}>
                  {(() => {
                    const baseSalary = profile?.base_salary || 0;
                    const loanDed = payrollSummary?.loanDeduction || 0;
                    const incomeTax = payrollSummary?.incomeTax ?? (profile?.income_tax || 0);
                    const effectiveBase = Math.max(0, baseSalary - loanDed);
                    const dailyBase = Math.max(0, effectiveBase - incomeTax) / 30;

                    let totalWorkedHoursSum = 0;
                    let totalOvertimeHoursSum = 0;
                    let totalCompensatedHoursSum = 0;
                    let totalOvertimePayoutSum = 0;

                    let totalDeductionSum = 0;
                    attendanceSummaries.forEach(s => {
                      totalWorkedHoursSum += s.workingHours || 0;
                      totalOvertimeHoursSum += s.overtimeHours || 0;
                      totalCompensatedHoursSum += s.compensatedOvertimeHours || 0;
                      totalOvertimePayoutSum += s.overtimePayout || 0;
                      totalDeductionSum += (s.lateDeduction || 0) + (s.absenceDeduction || 0);
                    });

                    const totalMonthAmountSum = attendanceSummaries.reduce((sum, summary) => {
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
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Working Hours</th>
                            {isCompensationMode ? (
                              <>
                                <th>Comp Time</th>
                                <th>Comp Earned</th>
                              </>
                            ) : (
                              <>
                                <th>Overtime</th>
                                <th>OT Earned</th>
                              </>
                            )}
                            <th style={{ color: 'var(--danger)' }}>Deduction</th>
                            <th>Day Total Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceSummaries.map((summary) => {
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
                              <tr key={summary.date} style={styles.tableRow}>
                                <td style={styles.tableCell}>{summary.date}</td>
                                <td style={styles.tableCell}>{summary.dayName}</td>
                                <td style={styles.tableCell}>{summary.checkIn || '-'}</td>
                                <td style={styles.tableCell}>{summary.checkOut || '-'}</td>
                                <td style={styles.tableCell}>{summary.workingHours > 0 ? formatClockDuration(summary.workingHours) : '-'}</td>
                                {isCompensationMode ? (
                                  <>
                                    <td style={{ ...styles.tableCell, color: '#3b82f6', fontWeight: 600 }}>{summary.compensatedOvertimeHours > 0 ? formatOvertimeDuration(summary.compensatedOvertimeHours) : '-'}</td>
                                    <td style={styles.tableCell}>{formatSalary(summary.overtimePayout)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td style={styles.tableCell}>{summary.overtimeHours > 0 ? formatOvertimeDuration(summary.overtimeHours) : '-'}</td>
                                    <td style={styles.tableCell}>{formatSalary(summary.overtimePayout)}</td>
                                  </>
                                )}
                                <td style={{ ...styles.tableCell, color: dayDed > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: dayDed > 0 ? '700' : '400' }}>
                                  {dayDed > 0 ? `- ${formatSalary(dayDed)}` : '-'}
                                </td>
                                <td style={{ ...styles.tableCell, fontWeight: '700', color: 'var(--success)' }}>
                                  {dayTotal > 0 ? formatSalary(dayTotal) : '-'}
                                </td>
                                <td style={styles.tableCell}>
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
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
                            {isCompensationMode ? (
                              <>
                                <td style={{ padding: '10px 12px', color: '#3b82f6' }}>{totalCompensatedHoursSum > 0 ? formatOvertimeDuration(totalCompensatedHoursSum) : '-'}</td>
                                <td style={{ padding: '10px 12px', color: 'var(--success)' }}>{formatSalary(totalOvertimePayoutSum)}</td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '10px 12px', color: 'var(--warning)' }}>{totalOvertimeHoursSum > 0 ? formatOvertimeDuration(totalOvertimeHoursSum) : '-'}</td>
                                <td style={{ padding: '10px 12px', color: 'var(--success)' }}>{formatSalary(totalOvertimePayoutSum)}</td>
                              </>
                            )}
                            <td style={{ padding: '10px 12px', color: 'var(--danger)', fontWeight: '700' }}>
                              {totalDeductionSum > 0 ? `- ${formatSalary(totalDeductionSum)}` : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--success)', fontSize: '0.95rem' }}>{formatSalary(totalMonthAmountSum)}</td>
                            <td style={{ padding: '10px 12px' }}>-</td>
                          </tr>
                        </tfoot>
                      </table>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{day}</div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {(() => {
                      const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                      const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
                      const adjustedStart = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

                      const cells = [];
                      for (let i = 0; i < adjustedStart; i++) {
                        cells.push({ type: 'empty', key: i });
                      }
                      for (let i = 1; i <= daysInMonth; i++) {
                        cells.push({ type: 'day', dayNum: i, key: i });
                      }

                      return cells.map((cell, idx) => {
                        if (cell.type === 'empty') {
                          return <div key={`empty-${idx}`} className="calendar-empty-cell" />;
                        }

                        const dayNum = cell.dayNum!;
                        const padNum = (n: number) => n.toString().padStart(2, '0');
                        const cellDateStr = `${calendarYear}-${padNum(calendarMonth + 1)}-${padNum(dayNum)}`;
                        const daySummary = attendanceSummaries.find(s => s.date === cellDateStr);

                        let cellBg = 'var(--bg-surface)';
                        let cellBorder = '1px solid var(--border-color)';
                        let statusText = '';
                        let statusColor = 'var(--text-muted)';
                        const holiday = holidaysList.find(h => h.date === cellDateStr);

                        if (daySummary) {
                          const hasMissingEntry = (!daySummary.checkIn || !daySummary.checkOut) && (daySummary.status === 'Present' || daySummary.isLate);

                          if (daySummary.status === 'Sunday' || daySummary.status === 'Off Saturday' || String(daySummary.status || '').startsWith('Off')) {
                            cellBg = 'var(--bg-surface-hover)';
                            statusText = daySummary.status === 'Sunday' ? 'Sun' : 'Sat Off';
                          } else if (daySummary.status === 'Holiday') {
                            const hCol = holiday?.color || '#3b82f6';
                            cellBg = `${hCol}18`;
                            cellBorder = `1px solid ${hCol}80`;
                            statusText = 'Holiday';
                            statusColor = hCol;
                          } else if (hasMissingEntry) {
                            cellBg = 'rgba(239, 68, 68, 0.12)';
                            cellBorder = '2px solid rgba(239, 68, 68, 0.6)';
                            statusText = daySummary.checkIn ? 'No Check-Out' : daySummary.checkOut ? 'No Check-In' : 'Missing Entry';
                            statusColor = '#ef4444';
                          } else if (daySummary.isAbsent) {
                            cellBg = 'rgba(239, 68, 68, 0.05)';
                            cellBorder = '1px solid rgba(239, 68, 68, 0.2)';
                            statusText = 'Absent';
                            statusColor = '#dc2626';
                          } else if (daySummary.isLate) {
                            cellBg = 'rgba(245, 158, 11, 0.05)';
                            cellBorder = '1px solid rgba(245, 158, 11, 0.2)';
                            statusText = 'Late';
                            statusColor = '#d97706';
                          } else if (daySummary.status.includes('Leave')) {
                            cellBg = 'rgba(139, 92, 246, 0.05)';
                            cellBorder = '1px solid rgba(139, 92, 246, 0.2)';
                            statusText = daySummary.status.split(' ')[0] || 'Leave';
                            statusColor = '#7c3aed';
                          } else if (daySummary.status === 'Short Time') {
                            cellBg = 'rgba(59, 130, 246, 0.12)';
                            cellBorder = '1px solid rgba(59, 130, 246, 0.35)';
                            statusText = 'Short Time';
                            statusColor = '#3b82f6';
                          } else if (daySummary.status === 'Present') {
                            cellBg = 'rgba(16, 185, 129, 0.05)';
                            cellBorder = '1px solid rgba(16, 185, 129, 0.2)';
                            statusText = 'Present';
                            statusColor = '#059669';
                          }
                        }

                        const birthdayEmployees = allProfiles.filter(p => {
                          if (!p.date_of_birth) return false;
                          const dob = new Date(p.date_of_birth + 'T00:00:00');
                          return dob.getMonth() === calendarMonth && dob.getDate() === dayNum;
                        });

                        const finalSummary = daySummary || {
                          date: cellDateStr,
                          status: holiday ? 'Holiday' : 'Absent',
                          isAbsent: !holiday,
                          workingHours: 0,
                          overtimeHours: 0,
                          overtimePayout: 0,
                          checkIn: null,
                          checkOut: null,
                          dayName: new Date(cellDateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
                        } as DailySummary;

                        return (
                          <div
                            key={`day-${dayNum}`}
                            onClick={() => setSelectedCalendarDay(finalSummary)}
                            style={{
                              minHeight: '85px',
                              padding: '8px',
                              borderRadius: 'var(--radius-sm)',
                              background: cellBg,
                              border: cellBorder,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all var(--transition-fast)'
                            }}
                            className="dropdown-item-hover calendar-day-cell"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {dayNum}
                              </span>
                              <div className="calendar-dots-row">
                                {holiday && <span className="calendar-dot red" title={holiday.title}></span>}
                                {birthdayEmployees.map(emp => (
                                  <span key={emp.id} className="calendar-dot yellow" title={`Birthday: ${emp.full_name}`}></span>
                                ))}
                                {statusText && !holiday && (
                                  <span className="calendar-dot green" title={statusText}></span>
                                )}
                              </div>
                            </div>

                            <div className="calendar-details-container">
                              {holiday && (
                                <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: '600', textAlign: 'left', lineHeight: '1.2' }}>
                                  {holiday.title}
                                </span>
                              )}
                              {birthdayEmployees.map(emp => (
                                <span key={emp.id} style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: '500', lineHeight: '1.2', textAlign: 'left' }}>
                                  Birthday: {emp.full_name}
                                </span>
                              ))}
                              {statusText && !holiday && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: statusColor,
                                  textAlign: 'right',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em'
                                }}>
                                  {statusText}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    );
};

export default DashboardTab;
