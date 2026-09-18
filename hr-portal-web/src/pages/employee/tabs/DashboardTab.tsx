import React, { useState, useEffect } from 'react';
import type { EmployeeProfile, DailySummary, EmployeePayrollSummary, LeaveRequest } from '../../../utils/attendanceProcessor';
import { getEmployeeShiftTiming } from '../../../utils/attendanceProcessor';
import type { Announcement, Holiday, ShiftTiming, EmployeeLoan } from '../../../lib/dbHelper';
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
  employeeLoans?: EmployeeLoan[];
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
  liveLateMins?: number;
  liveTargetCheckoutTime?: string;
  liveRemainingTimeToSitStr?: string;
  liveIsFullDayCleared?: boolean;
  totalOvertimeHours: number;
  totalOvertimeEarnings: number;
  lateCount: number;
  absentCount: number;
  netSalaryForMonth: number;
  monthNames: string[];
  setSelectedCalendarDay: (day: DailySummary | null) => void;
  getStatusTagStyle: (status: DailySummary['status'], isLate: boolean) => React.CSSProperties;
  fetchData: () => Promise<void>;
  employeeNomineeRank?: { rank: number; totalEmployees: number; monthKey?: string } | null;
  employeeNomineePrevRank?: { rank: number; totalEmployees: number; monthKey?: string } | null;
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
  empShiftTiming,
  officeGraceTime: _officeGraceTime,
  payrollSummary,
  employeeLoans = [],
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
  liveLateMins = 0,
  liveTargetCheckoutTime = '',
  liveRemainingTimeToSitStr = '',
  liveIsFullDayCleared = false,
  totalOvertimeHours,
  totalOvertimeEarnings,
  lateCount,
  absentCount,
  netSalaryForMonth,
  monthNames,
  setSelectedCalendarDay,
  getStatusTagStyle: _getStatusTagStyle,
  fetchData,
  employeeNomineeRank,
  employeeNomineePrevRank
}) => {
  // Rotate paired cards and salary metrics synchronously (calm 3.5s interval, pause on hover)
  const [pairFlipIndex, setPairFlipIndex] = useState<0 | 1>(0);
  const [salarySlideIndex, setSalarySlideIndex] = useState(0);
  const [isFlipPaused, setIsFlipPaused] = useState(false);

  useEffect(() => {
    if (isFlipPaused) return;
    const timer = setInterval(() => {
      setPairFlipIndex(prev => (prev === 0 ? 1 : 0));
      setSalarySlideIndex(prev => prev + 1);
    }, 3500); // 3.5s interval for comfortable reading
    return () => clearInterval(timer);
  }, [isFlipPaused]);

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
                    flexDirection: 'column',
                    gap: '10px',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-md, 12px)',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
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
                            {liveLateMins > 0 && (
                              <span style={{ marginLeft: '6px', color: '#f59e0b', fontWeight: 700, background: 'rgba(245, 158, 11, 0.15)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.70rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <img src="/icons/alert.png" alt="alert" className="theme-icon" style={{ width: '10px', height: '10px' }} />
                                <span>{liveLateMins}m Late In</span>
                              </span>
                            )}
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

                    {/* Compensatory Sitting Goal (Supports both Compensation 1X Mode & 0.5x Late Compensation Mode) */}
                    {(liveIsCompMode || liveLateMins > 0) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: liveIsFullDayCleared ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        border: liveIsFullDayCleared ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        <img 
                          src={liveIsFullDayCleared ? "/icons/check-circle.png" : "/icons/clock.png"} 
                          alt="status" 
                          className="theme-icon" 
                          style={{ width: '18px', height: '18px', flexShrink: 0 }} 
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: liveIsFullDayCleared ? '#10b981' : '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                              {liveIsFullDayCleared 
                                ? 'Full Day Amount Cleared' 
                                : (liveIsCompMode 
                                    ? `Compensation 1X Goal (${empShiftTiming?.totalHours || 9}h Target)` 
                                    : `Late Compensation Goal (${liveLateMins}m Late)`)}
                            </span>
                            {liveIsFullDayCleared ? (
                              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                {liveIsCompMode ? `${empShiftTiming?.totalHours || 9}-Hour shift completed (Compensation 1X)!` : 'Late arrival fully compensated!'}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700 }}>
                                Sit until: <strong style={{ color: '#fbbf24' }}>{liveTargetCheckoutTime}</strong>
                              </span>
                            )}
                          </div>
                          {!liveIsFullDayCleared && (
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                              {liveIsCompMode ? (
                                <>
                                  Time left to complete {empShiftTiming?.totalHours || 9}h shift & get full day pay: <strong style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.80rem' }}>{liveRemainingTimeToSitStr}</strong>
                                  <span style={{ marginLeft: '6px', fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                    (1X rate: 1 hour worked = 1 hour pay)
                                  </span>
                                </>
                              ) : (
                                <>
                                  Time left to sit to avoid late deduction & get full day pay: <strong style={{ fontFamily: 'monospace', color: '#38bdf8', fontSize: '0.80rem' }}>{liveRemainingTimeToSitStr}</strong>
                                  <span style={{ marginLeft: '6px', fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                                    ({liveLateMins}m comp @ 0.5x + {Math.round(liveLateMins * 0.5)}m OT @ 1.0x)
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : liveCheckInTime && liveCheckOutTime ? (
                  /* Shift Completed Today */
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md, 12px)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                    {(liveIsCompMode || liveLateMins > 0) && (
                      <div style={{
                        fontSize: '0.73rem',
                        color: liveIsFullDayCleared ? '#10b981' : '#f59e0b',
                        fontWeight: 600,
                        background: liveIsFullDayCleared ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <img 
                          src={liveIsFullDayCleared ? "/icons/check.png" : "/icons/alert.png"} 
                          alt="status" 
                          className="theme-icon" 
                          style={{ width: '12px', height: '12px' }} 
                        />
                        <span>
                          {liveIsFullDayCleared 
                            ? (liveIsCompMode 
                                ? `Full ${empShiftTiming?.totalHours || 9}-hour shift completed (Compensation 1X) — Full day amount earned!` 
                                : `Late arrival (${liveLateMins}m) was fully compensated — Full day amount earned!`) 
                            : (liveIsCompMode 
                                ? `Left before completing full ${empShiftTiming?.totalHours || 9}-hour shift.` 
                                : `Late In (${liveLateMins}m) — Left before full compensation.`)}
                        </span>
                      </div>
                    )}
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
              <CollapsibleCard 
                title="Profile Details" 
                style={styles.profileCard}
                bodyStyle={{ display: 'flex', flexDirection: 'column', flex: 1 }}
                actionButton={
                  <button 
                    onClick={() => setShowEmployeeSalary(!showEmployeeSalary)}
                    className="btn btn-secondary mobile-icon-only"
                    style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px', height: '28px', borderRadius: '6px' }}
                    title={showEmployeeSalary ? "Hide Salary Info" : "Show Salary Info"}
                  >
                    <img 
                      src={showEmployeeSalary ? "/icons/eye-off.png" : "/icons/eye.png"} 
                      alt="toggle" 
                      className="theme-icon" 
                      style={{ width: '13px', height: '13px' }} 
                    />
                    <span>{showEmployeeSalary ? "Hide" : "Reveal"}</span>
                  </button>
                }
              >
                {(() => {
                  const empTiming = getEmployeeShiftTiming(profile || ({} as any), timingsList);
                  const baseSalary = profile?.base_salary || 0;
                  const realTax = profile?.income_tax || 0;
                  const shiftHrs = empTiming.totalHours || 9;
                  const monthlyHours = 30 * shiftHrs;
                  const realHourly = baseSalary 
                    ? Math.round(Math.max(0, baseSalary - realTax) / monthlyHours) 
                    : (profile?.hourly_rate || 0);

                  const activeLoan = (employeeLoans || []).find(l => 
                    l.status === 'Approved' && (l.remaining_balance === undefined || l.remaining_balance > 0)
                  );
                  const loanDed = payrollSummary?.loanDeduction || (activeLoan?.monthly_deduction || 0);
                  const isLoanEmployee = loanDed > 0 || !!activeLoan;
                  const monthlyLoanAmt = loanDed > 0 ? loanDed : (activeLoan?.monthly_deduction || 0);
                  const effectiveTax = payrollSummary?.incomeTax ?? realTax;
                  const afterTax = Math.max(0, baseSalary - effectiveTax);
                  const afterLoanAndTax = Math.max(0, baseSalary - monthlyLoanAmt - effectiveTax);
                  const loanHourly = baseSalary 
                    ? Math.round(Math.max(0, afterLoanAndTax) / monthlyHours) 
                    : (profile?.hourly_rate || 0);

                  // Define slides for Card 4 (Base Salary Slide Show)
                  interface SalarySlideItem {
                    id: string;
                    label: string;
                    displayValue: string;
                    rawValue: number;
                    color: string;
                    iconSrc: string;
                    badge?: string;
                    badgeTooltip?: string;
                  }

                  const salarySlides: SalarySlideItem[] = [
                    {
                      id: 'base',
                      label: 'Base Salary',
                      displayValue: showEmployeeSalary ? formatSalary(baseSalary) : '••••••',
                      rawValue: baseSalary,
                      color: '#10b981',
                      iconSrc: '/icons/check-circle.png',
                      badge: isLoanEmployee ? 'Loan Active' : undefined,
                      badgeTooltip: isLoanEmployee ? 'Active loan registered on profile' : undefined
                    },
                    {
                      id: 'hourly',
                      label: isLoanEmployee ? 'Base Hourly Rate' : 'Hourly Rate',
                      displayValue: showEmployeeSalary ? `${formatSalary(realHourly)}/hr` : '••••••/hr',
                      rawValue: realHourly,
                      color: '#3b82f6',
                      iconSrc: '/icons/clock.png',
                      badge: isLoanEmployee ? 'Contract' : (empTiming.isFixedHours ? `${empTiming.totalHours || 9}h` : undefined),
                      badgeTooltip: isLoanEmployee ? `Contracted base hourly rate before loan: Rs. ${realHourly}/hr` : `Calculated from ${shiftHrs}h daily shift`
                    }
                  ];

                  if (isLoanEmployee) {
                    salarySlides.push({
                      id: 'loan-hourly',
                      label: 'Loan Hourly Rate',
                      displayValue: showEmployeeSalary ? `${formatSalary(loanHourly)}/hr` : '••••••/hr',
                      rawValue: loanHourly,
                      color: '#0284c7',
                      iconSrc: '/icons/clock.png',
                      badge: 'After Loan',
                      badgeTooltip: `Effective hourly rate after loan deduction: Rs. ${loanHourly}/hr`
                    });
                  }

                  salarySlides.push(
                    {
                      id: 'tax',
                      label: 'Tax Amount',
                      displayValue: showEmployeeSalary ? formatSalary(effectiveTax) : '••••••',
                      rawValue: effectiveTax,
                      color: '#ef4444',
                      iconSrc: '/icons/file-text.png',
                      badge: 'Tax',
                      badgeTooltip: 'Income tax deduction'
                    },
                    {
                      id: 'after-tax',
                      label: 'After-Tax Salary',
                      displayValue: showEmployeeSalary ? formatSalary(afterTax) : '••••••',
                      rawValue: afterTax,
                      color: '#06b6d4',
                      iconSrc: '/icons/Salry.png',
                      badge: 'Base - Tax',
                      badgeTooltip: 'Salary after income tax deduction'
                    }
                  );

                  if (isLoanEmployee) {
                    salarySlides.push(
                      {
                        id: 'loan-monthly',
                        label: 'Monthly Loan',
                        displayValue: showEmployeeSalary ? formatSalary(monthlyLoanAmt) : '••••••',
                        rawValue: monthlyLoanAmt,
                        color: '#f59e0b',
                        iconSrc: '/icons/revert.png',
                        badge: 'Per Month',
                        badgeTooltip: 'Monthly loan installment deduction'
                      },
                      {
                        id: 'after-loan-tax',
                        label: 'After Loan & Tax',
                        displayValue: showEmployeeSalary ? formatSalary(afterLoanAndTax) : '••••••',
                        rawValue: afterLoanAndTax,
                        color: '#8b5cf6',
                        iconSrc: '/icons/check.png',
                        badge: 'Base - Loan - Tax',
                        badgeTooltip: 'Net base salary remaining after loan and tax deductions'
                      }
                    );
                  }

                  const currentSalarySlideIndex = salarySlides.length > 0 ? (salarySlideIndex % salarySlides.length) : 0;
                  const activeSalarySlide = salarySlides[currentSalarySlideIndex] || salarySlides[0];

                  return (
                    <div 
                      onMouseEnter={() => setIsFlipPaused(true)}
                      onMouseLeave={() => setIsFlipPaused(false)}
                      style={{
                        ...styles.profileGrid,
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '10px',
                        width: '100%',
                        flex: 1,
                        display: 'grid',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* 1. Pin ID (Full-Height Card) */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md, 10px)',
                        background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)',
                        border: '1px solid var(--border-color)',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        boxShadow: 'var(--shadow-sm)',
                        height: '100%',
                        minHeight: '120px'
                      }}>
                        {/* Top Row: Icon badge + Tag */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            borderRadius: '9px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(14, 165, 233, 0.12)',
                            border: '1px solid rgba(14, 165, 233, 0.25)',
                            flexShrink: 0
                          }}>
                            <img 
                              src="/icons/user.png" 
                              alt="pin" 
                              className="theme-icon" 
                              style={{ width: '18px', height: '18px' }} 
                            />
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color: 'var(--text-muted)',
                            background: 'var(--bg-surface-hover)',
                            border: '1px solid var(--border-color)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            letterSpacing: '0.04em'
                          }}>
                            PIN
                          </span>
                        </div>

                        {/* Bottom: Value + Label */}
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, marginTop: '12px' }}>
                          <h4 style={{ 
                            margin: 0,
                            fontSize: '1.15rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                            color: 'var(--text-primary)'
                          }} title={profile?.pin || ''}>
                            {profile?.pin || '—'}
                          </h4>
                          <span style={{ 
                            fontSize: '0.74rem',
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                            marginTop: '4px'
                          }}>
                            Pin ID
                          </span>
                        </div>
                      </div>

                      {/* 2. Department & Designation Combined (Full-Height Paired Slider) */}
                      <div 
                        onClick={() => setPairFlipIndex(prev => prev === 0 ? 1 : 0)}
                        onMouseEnter={() => setIsFlipPaused(true)}
                        onMouseLeave={() => setIsFlipPaused(false)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md, 10px)',
                          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)',
                          border: '1px solid var(--border-color)',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                          userSelect: 'none',
                          height: '100%',
                          minHeight: '120px'
                        }}
                        title="Click to toggle or hover to pause"
                      >
                        {/* Top Row: Morphing Icon + Status Indicator Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            borderRadius: '9px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: pairFlipIndex === 0 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                            border: pairFlipIndex === 0 ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                            flexShrink: 0,
                            transition: 'background 0.4s ease, border-color 0.4s ease',
                            overflow: 'hidden'
                          }}>
                            <img 
                              src="/icons/app.png" 
                              alt="department" 
                              className="theme-icon" 
                              style={{ 
                                position: 'absolute',
                                width: '18px', 
                                height: '18px', 
                                opacity: pairFlipIndex === 0 ? 1 : 0,
                                transform: pairFlipIndex === 0 ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.7)',
                                transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' 
                              }} 
                            />
                            <img 
                              src="/icons/file-text.png" 
                              alt="designation" 
                              className="theme-icon" 
                              style={{ 
                                position: 'absolute',
                                width: '18px', 
                                height: '18px', 
                                opacity: pairFlipIndex === 1 ? 1 : 0,
                                transform: pairFlipIndex === 1 ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.7)',
                                transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' 
                              }} 
                            />
                          </div>

                          {/* Modern Indicator Capsules */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 7px',
                            borderRadius: '12px',
                            background: 'var(--bg-surface-hover)',
                            border: '1px solid var(--border-color)'
                          }} title={`Showing ${pairFlipIndex === 0 ? 'Department' : 'Designation'}`}>
                            <span style={{
                              width: pairFlipIndex === 0 ? '14px' : '5px',
                              height: '5px',
                              borderRadius: '3px',
                              background: pairFlipIndex === 0 ? '#6366f1' : 'var(--text-muted)',
                              boxShadow: pairFlipIndex === 0 ? '0 0 6px rgba(99, 102, 241, 0.6)' : 'none',
                              transition: 'all 0.3s ease'
                            }} />
                            <span style={{
                              width: pairFlipIndex === 1 ? '14px' : '5px',
                              height: '5px',
                              borderRadius: '3px',
                              background: pairFlipIndex === 1 ? '#f59e0b' : 'var(--text-muted)',
                              boxShadow: pairFlipIndex === 1 ? '0 0 6px rgba(245, 158, 11, 0.6)' : 'none',
                              transition: 'all 0.3s ease'
                            }} />
                          </div>
                        </div>

                        {/* Bottom Row: Sliding Value & Label */}
                        <div style={{
                          height: '46px',
                          position: 'relative',
                          overflow: 'hidden',
                          width: '100%',
                          marginTop: '12px'
                        }}>
                          <div style={{
                            transform: pairFlipIndex === 0 ? 'translateY(0px)' : 'translateY(-46px)',
                            transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                            willChange: 'transform'
                          }}>
                            {/* Slide 0: Department */}
                            <div style={{
                              height: '46px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              minWidth: 0,
                              opacity: pairFlipIndex === 0 ? 1 : 0,
                              filter: pairFlipIndex === 0 ? 'none' : 'blur(1px)',
                              transition: 'opacity 0.35s ease, filter 0.35s ease'
                            }}>
                              <h4 style={{ 
                                margin: 0,
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                                color: 'var(--text-primary)'
                              }} title={profile?.department || 'N/A'}>
                                {profile?.department || 'N/A'}
                              </h4>
                              <span style={{ 
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                color: '#6366f1',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                                marginTop: '3px'
                              }}>
                                Department
                              </span>
                            </div>

                            {/* Slide 1: Designation */}
                            <div style={{
                              height: '46px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              minWidth: 0,
                              opacity: pairFlipIndex === 1 ? 1 : 0,
                              filter: pairFlipIndex === 1 ? 'none' : 'blur(1px)',
                              transition: 'opacity 0.35s ease, filter 0.35s ease'
                            }}>
                              <h4 style={{ 
                                margin: 0,
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                                color: 'var(--text-primary)'
                              }} title={profile?.designation || 'N/A'}>
                                {profile?.designation || 'N/A'}
                              </h4>
                              <span style={{ 
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                color: '#f59e0b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                                marginTop: '3px'
                              }}>
                                Designation
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3. Joining Date & Shift Timing Combined (Full-Height Paired Slider) */}
                      <div 
                        onClick={() => setPairFlipIndex(prev => prev === 0 ? 1 : 0)}
                        onMouseEnter={() => setIsFlipPaused(true)}
                        onMouseLeave={() => setIsFlipPaused(false)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md, 10px)',
                          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)',
                          border: '1px solid var(--border-color)',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                          userSelect: 'none',
                          height: '100%',
                          minHeight: '120px'
                        }}
                        title="Click to toggle or hover to pause"
                      >
                        {/* Top Row: Morphing Icon + Status Indicator Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            borderRadius: '9px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: pairFlipIndex === 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                            border: pairFlipIndex === 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(139, 92, 246, 0.3)',
                            flexShrink: 0,
                            transition: 'background 0.4s ease, border-color 0.4s ease',
                            overflow: 'hidden'
                          }}>
                            <img 
                              src="/icons/calendar.png" 
                              alt="joining" 
                              className="theme-icon" 
                              style={{ 
                                position: 'absolute',
                                width: '18px', 
                                height: '18px', 
                                opacity: pairFlipIndex === 0 ? 1 : 0,
                                transform: pairFlipIndex === 0 ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.7)',
                                transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' 
                              }} 
                            />
                            <img 
                              src="/icons/clock.png" 
                              alt="shift" 
                              className="theme-icon" 
                              style={{ 
                                position: 'absolute',
                                width: '18px', 
                                height: '18px', 
                                opacity: pairFlipIndex === 1 ? 1 : 0,
                                transform: pairFlipIndex === 1 ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.7)',
                                transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' 
                              }} 
                            />
                          </div>

                          {/* Modern Indicator Capsules */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 7px',
                            borderRadius: '12px',
                            background: 'var(--bg-surface-hover)',
                            border: '1px solid var(--border-color)'
                          }} title={`Showing ${pairFlipIndex === 0 ? 'Joining Date' : 'Shift Timing'}`}>
                            <span style={{
                              width: pairFlipIndex === 0 ? '14px' : '5px',
                              height: '5px',
                              borderRadius: '3px',
                              background: pairFlipIndex === 0 ? '#10b981' : 'var(--text-muted)',
                              boxShadow: pairFlipIndex === 0 ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                              transition: 'all 0.3s ease'
                            }} />
                            <span style={{
                              width: pairFlipIndex === 1 ? '14px' : '5px',
                              height: '5px',
                              borderRadius: '3px',
                              background: pairFlipIndex === 1 ? '#8b5cf6' : 'var(--text-muted)',
                              boxShadow: pairFlipIndex === 1 ? '0 0 6px rgba(139, 92, 246, 0.6)' : 'none',
                              transition: 'all 0.3s ease'
                            }} />
                          </div>
                        </div>

                        {/* Bottom Row: Sliding Value & Label */}
                        <div style={{
                          height: '46px',
                          position: 'relative',
                          overflow: 'hidden',
                          width: '100%',
                          marginTop: '12px'
                        }}>
                          <div style={{
                            transform: pairFlipIndex === 0 ? 'translateY(0px)' : 'translateY(-46px)',
                            transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                            willChange: 'transform'
                          }}>
                            {/* Slide 0: Joining Date */}
                            <div style={{
                              height: '46px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              minWidth: 0,
                              opacity: pairFlipIndex === 0 ? 1 : 0,
                              filter: pairFlipIndex === 0 ? 'none' : 'blur(1px)',
                              transition: 'opacity 0.35s ease, filter 0.35s ease'
                            }}>
                              <h4 style={{ 
                                margin: 0,
                                fontSize: '1.05rem',
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                                color: 'var(--text-primary)',
                                fontVariantNumeric: 'tabular-nums'
                              }} title={profile?.joining_date || 'N/A'}>
                                {profile?.joining_date || 'N/A'}
                              </h4>
                              <span style={{ 
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                color: '#10b981',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                                marginTop: '3px'
                              }}>
                                Joining Date
                              </span>
                            </div>

                            {/* Slide 1: Shift Timing */}
                            <div style={{
                              height: '46px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              minWidth: 0,
                              opacity: pairFlipIndex === 1 ? 1 : 0,
                              filter: pairFlipIndex === 1 ? 'none' : 'blur(1px)',
                              transition: 'opacity 0.35s ease, filter 0.35s ease'
                            }}>
                              <h4 style={{ 
                                margin: 0,
                                fontSize: '0.98rem',
                                fontWeight: 800,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.01em',
                                fontVariantNumeric: 'tabular-nums'
                              }} title={empTiming.isFixedHours ? `Fix Hours (${empTiming.totalHours || 9}h Shift)` : `${empTiming.startTime} to ${empTiming.endTime}`}>
                                {empTiming.isFixedHours ? `Fix Hours (${empTiming.totalHours || 9}h)` : `${empTiming.startTime} - ${empTiming.endTime}`}
                              </h4>
                              <span style={{ 
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                color: '#8b5cf6',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.2,
                                marginTop: '3px'
                              }}>
                                Shift Timing
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. Base Salary Slide Show (Multi-Slide Carousel) */}
                      <div 
                        onClick={() => setSalarySlideIndex(prev => prev + 1)}
                        onMouseEnter={() => setIsFlipPaused(true)}
                        onMouseLeave={() => setIsFlipPaused(false)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md, 10px)',
                          background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)',
                          border: '1px solid var(--border-color)',
                          minWidth: 0,
                          boxSizing: 'border-box',
                          overflow: 'hidden',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                          userSelect: 'none',
                          height: '100%',
                          minHeight: '120px'
                        }}
                        title="Click to view next metric or hover to pause"
                      >
                        {/* Top Row: Morphing Icon + Indicator Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            minWidth: '36px',
                            borderRadius: '9px',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: `${activeSalarySlide.color}1e`,
                            border: `1px solid ${activeSalarySlide.color}4d`,
                            flexShrink: 0,
                            transition: 'background 0.4s ease, border-color 0.4s ease',
                            overflow: 'hidden'
                          }}>
                            {salarySlides.map((slide, idx) => {
                              const isCurrent = currentSalarySlideIndex === idx;
                              return (
                                <img 
                                  key={slide.id}
                                  src={slide.iconSrc} 
                                  alt={slide.label} 
                                  className="theme-icon" 
                                  style={{ 
                                    position: 'absolute',
                                    width: '18px', 
                                    height: '18px', 
                                    opacity: isCurrent ? 1 : 0,
                                    transform: isCurrent ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.7)',
                                    transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' 
                                  }} 
                                />
                              );
                            })}
                          </div>

                          {/* Modern Indicator Capsules */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 6px',
                            borderRadius: '12px',
                            background: 'var(--bg-surface-hover)',
                            border: '1px solid var(--border-color)'
                          }} title={`Showing ${activeSalarySlide.label} (${currentSalarySlideIndex + 1}/${salarySlides.length})`}>
                            {salarySlides.map((slide, idx) => {
                              const isCurrent = currentSalarySlideIndex === idx;
                              return (
                                <span 
                                  key={slide.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSalarySlideIndex(idx);
                                  }}
                                  style={{
                                    width: isCurrent ? '10px' : '4px',
                                    height: '4px',
                                    borderRadius: '2px',
                                    background: isCurrent ? slide.color : 'var(--text-muted)',
                                    boxShadow: isCurrent ? `0 0 6px ${slide.color}99` : 'none',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                  }} 
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Bottom Row: Sliding Value & Label */}
                        <div style={{
                          height: '46px',
                          position: 'relative',
                          overflow: 'hidden',
                          width: '100%',
                          marginTop: '12px'
                        }}>
                          <div style={{
                            transform: `translateY(-${currentSalarySlideIndex * 46}px)`,
                            transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                            willChange: 'transform'
                          }}>
                            {salarySlides.map((slide, idx) => {
                              const isCurrent = currentSalarySlideIndex === idx;
                              return (
                                <div 
                                  key={slide.id}
                                  style={{
                                    height: '46px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    minWidth: 0,
                                    opacity: isCurrent ? 1 : 0,
                                    filter: isCurrent ? 'none' : 'blur(1px)',
                                    transition: 'opacity 0.35s ease, filter 0.35s ease'
                                  }}
                                >
                                  <h4 
                                    onClick={(e) => { e.stopPropagation(); setShowEmployeeSalary(!showEmployeeSalary); }} 
                                    style={{ 
                                      margin: 0,
                                      cursor: 'pointer',
                                      fontSize: '1.05rem',
                                      fontWeight: 800,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: 1.2,
                                      color: 'var(--text-primary)',
                                      fontVariantNumeric: 'tabular-nums'
                                    }} 
                                    title="Click to toggle reveal"
                                  >
                                    {slide.displayValue}
                                  </h4>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '4px',
                                    marginTop: '3px',
                                    overflow: 'hidden'
                                  }}>
                                    <span style={{ 
                                      fontSize: '0.74rem',
                                      fontWeight: 600,
                                      color: slide.color,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      lineHeight: 1.2
                                    }}>
                                      {slide.label}
                                    </span>
                                    {slide.badge && (
                                      <span style={{ 
                                        fontSize: '0.60rem', 
                                        fontWeight: 700, 
                                        color: slide.color, 
                                        background: `${slide.color}1e`, 
                                        padding: '1px 5px', 
                                        borderRadius: '4px',
                                        border: `1px solid ${slide.color}4d`,
                                        flexShrink: 0,
                                        lineHeight: 1.1,
                                        whiteSpace: 'nowrap'
                                      }} title={slide.badgeTooltip || slide.badge}>
                                        {slide.badge}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CollapsibleCard>

              <CollapsibleCard 
                title={`${monthNames[calendarMonth]} Summary`} 
                style={styles.statsCard}
                bodyStyle={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}
              >
                <div 
                  onMouseEnter={() => setIsFlipPaused(true)}
                  onMouseLeave={() => setIsFlipPaused(false)}
                  style={{
                    ...styles.statsGrid,
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '10px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* 1. Overtime & OT Payout Paired Card */}
                  <div 
                    onClick={() => setPairFlipIndex(prev => prev === 0 ? 1 : 0)}
                    onMouseEnter={() => setIsFlipPaused(true)}
                    onMouseLeave={() => setIsFlipPaused(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md, 10px)',
                      background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)',
                      border: '1px solid var(--border-color)',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      userSelect: 'none'
                    }}
                    title="Click to toggle or hover to pause"
                  >
                    {/* Smooth morphing icon badge */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      borderRadius: '8px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: pairFlipIndex === 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                      border: pairFlipIndex === 0 ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                      flexShrink: 0,
                      transition: 'background 0.4s ease, border-color 0.4s ease',
                      overflow: 'hidden'
                    }}>
                      <img 
                        src="/icons/clock.png" 
                        alt="overtime" 
                        className="theme-icon" 
                        style={{ 
                          position: 'absolute',
                          width: '16px', 
                          height: '16px', 
                          opacity: pairFlipIndex === 0 ? 1 : 0,
                          transform: pairFlipIndex === 0 ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.7)',
                          transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }} 
                      />
                      <img 
                        src="/icons/check-circle.png" 
                        alt="earnings" 
                        className="theme-icon" 
                        style={{ 
                          position: 'absolute',
                          width: '16px', 
                          height: '16px', 
                          opacity: pairFlipIndex === 1 ? 1 : 0,
                          transform: pairFlipIndex === 1 ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.7)',
                          transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }} 
                      />
                    </div>

                    {/* Smooth sliding text container */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      overflow: 'hidden',
                      flex: '1 1 auto',
                      height: '36px',
                      position: 'relative'
                    }}>
                      <div style={{
                        transform: pairFlipIndex === 0 ? 'translateY(0px)' : 'translateY(-36px)',
                        transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                        willChange: 'transform'
                      }}>
                        {/* Slide 0: Overtime Duration */}
                        <div style={{
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          minWidth: 0,
                          opacity: pairFlipIndex === 0 ? 1 : 0,
                          filter: pairFlipIndex === 0 ? 'none' : 'blur(1px)',
                          transition: 'opacity 0.35s ease, filter 0.35s ease'
                        }}>
                          <h4 style={{ 
                            margin: 0,
                            fontSize: '0.90rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                            color: 'var(--text-primary)',
                            fontVariantNumeric: 'tabular-nums'
                          }} title={formatOvertimeDuration(totalOvertimeHours)}>
                            {formatOvertimeDuration(totalOvertimeHours)}
                          </h4>
                          <span style={{ 
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#3b82f6',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                            marginTop: '2px'
                          }}>
                            {isCompensationMode ? 'Comp Time' : 'Overtime'}
                          </span>
                        </div>

                        {/* Slide 1: OT Payout */}
                        <div style={{
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          minWidth: 0,
                          opacity: pairFlipIndex === 1 ? 1 : 0,
                          filter: pairFlipIndex === 1 ? 'none' : 'blur(1px)',
                          transition: 'opacity 0.35s ease, filter 0.35s ease'
                        }}>
                          <h4 
                            onClick={(e) => { e.stopPropagation(); setShowEmployeeSalary(!showEmployeeSalary); }} 
                            style={{ 
                              margin: 0,
                              cursor: 'pointer',
                              fontSize: '0.90rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              lineHeight: 1.2,
                              color: 'var(--text-primary)',
                              fontVariantNumeric: 'tabular-nums'
                            }} 
                            title="Click to toggle reveal"
                          >
                            {showEmployeeSalary ? formatSalary(totalOvertimeEarnings) : '••••••'}
                          </h4>
                          <span style={{ 
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: '#10b981',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                            marginTop: '2px'
                          }}>
                            {isCompensationMode ? 'Comp Payout' : 'OT Payout'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status dots */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      paddingLeft: '4px'
                    }} title={`Showing ${pairFlipIndex === 0 ? 'Overtime' : 'OT Payout'}`}>
                      <span style={{
                        width: pairFlipIndex === 0 ? '6px' : '4px',
                        height: pairFlipIndex === 0 ? '6px' : '4px',
                        borderRadius: '50%',
                        background: pairFlipIndex === 0 ? '#3b82f6' : 'var(--border-color)',
                        boxShadow: pairFlipIndex === 0 ? '0 0 6px rgba(59, 130, 246, 0.6)' : 'none',
                        transition: 'all 0.3s ease'
                      }} />
                      <span style={{
                        width: pairFlipIndex === 1 ? '6px' : '4px',
                        height: pairFlipIndex === 1 ? '6px' : '4px',
                        borderRadius: '50%',
                        background: pairFlipIndex === 1 ? '#10b981' : 'var(--border-color)',
                        boxShadow: pairFlipIndex === 1 ? '0 0 6px rgba(16, 185, 129, 0.6)' : 'none',
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* 2. Late Arrivals & Absences Paired Card */}
                  <div 
                    onClick={() => setPairFlipIndex(prev => prev === 0 ? 1 : 0)}
                    onMouseEnter={() => setIsFlipPaused(true)}
                    onMouseLeave={() => setIsFlipPaused(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md, 10px)',
                      background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)',
                      border: '1px solid var(--border-color)',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-sm)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      userSelect: 'none'
                    }}
                    title="Click to toggle or hover to pause"
                  >
                    {/* Smooth morphing icon badge */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      borderRadius: '8px',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: pairFlipIndex === 0 
                        ? (lateCount > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)')
                        : (absentCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'),
                      border: pairFlipIndex === 0
                        ? (lateCount > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)')
                        : (absentCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)'),
                      flexShrink: 0,
                      transition: 'background 0.4s ease, border-color 0.4s ease',
                      overflow: 'hidden'
                    }}>
                      <img 
                        src="/icons/clock.png" 
                        alt="late" 
                        className="theme-icon" 
                        style={{ 
                          position: 'absolute',
                          width: '16px', 
                          height: '16px', 
                          opacity: pairFlipIndex === 0 ? 1 : 0,
                          transform: pairFlipIndex === 0 ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.7)',
                          transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }} 
                      />
                      <img 
                        src="/icons/alert.png" 
                        alt="absent" 
                        className="theme-icon" 
                        style={{ 
                          position: 'absolute',
                          width: '16px', 
                          height: '16px', 
                          opacity: pairFlipIndex === 1 ? 1 : 0,
                          transform: pairFlipIndex === 1 ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.7)',
                          transition: 'opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }} 
                      />
                    </div>

                    {/* Smooth sliding text container */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      overflow: 'hidden',
                      flex: '1 1 auto',
                      height: '36px',
                      position: 'relative'
                    }}>
                      <div style={{
                        transform: pairFlipIndex === 0 ? 'translateY(0px)' : 'translateY(-36px)',
                        transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                        willChange: 'transform'
                      }}>
                        {/* Slide 0: Late Arrivals */}
                        <div style={{
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          minWidth: 0,
                          opacity: pairFlipIndex === 0 ? 1 : 0,
                          filter: pairFlipIndex === 0 ? 'none' : 'blur(1px)',
                          transition: 'opacity 0.35s ease, filter 0.35s ease'
                        }}>
                          <h4 style={{ 
                            margin: 0,
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                            color: lateCount > 0 ? '#f59e0b' : '#10b981'
                          }}>
                            {lateCount}
                          </h4>
                          <span style={{ 
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: lateCount > 0 ? '#f59e0b' : 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                            marginTop: '2px'
                          }}>
                            Late Arrivals
                          </span>
                        </div>

                        {/* Slide 1: Absences */}
                        <div style={{
                          height: '36px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          minWidth: 0,
                          opacity: pairFlipIndex === 1 ? 1 : 0,
                          filter: pairFlipIndex === 1 ? 'none' : 'blur(1px)',
                          transition: 'opacity 0.35s ease, filter 0.35s ease'
                        }}>
                          <h4 style={{ 
                            margin: 0,
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                            color: absentCount > 0 ? '#ef4444' : '#10b981'
                          }}>
                            {absentCount}
                          </h4>
                          <span style={{ 
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: absentCount > 0 ? '#ef4444' : 'var(--text-secondary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                            marginTop: '2px'
                          }}>
                            Absences
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status dots */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      paddingLeft: '4px'
                    }} title={`Showing ${pairFlipIndex === 0 ? 'Late Arrivals' : 'Absences'}`}>
                      <span style={{
                        width: pairFlipIndex === 0 ? '6px' : '4px',
                        height: pairFlipIndex === 0 ? '6px' : '4px',
                        borderRadius: '50%',
                        background: pairFlipIndex === 0 ? '#f59e0b' : 'var(--border-color)',
                        boxShadow: pairFlipIndex === 0 ? '0 0 6px rgba(245, 158, 11, 0.6)' : 'none',
                        transition: 'all 0.3s ease'
                      }} />
                      <span style={{
                        width: pairFlipIndex === 1 ? '6px' : '4px',
                        height: pairFlipIndex === 1 ? '6px' : '4px',
                        borderRadius: '50%',
                        background: pairFlipIndex === 1 ? '#ef4444' : 'var(--border-color)',
                        boxShadow: pairFlipIndex === 1 ? '0 0 6px rgba(239, 68, 68, 0.6)' : 'none',
                        transition: 'all 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* 3. Net Salary Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md, 10px)',
                    background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)',
                    border: '1px solid var(--border-color)',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-color)',
                      flexShrink: 0
                    }}>
                      <img 
                        src="/icons/check-circle.png" 
                        alt="net" 
                        className="theme-icon" 
                        style={{ width: '16px', height: '16px' }} 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', flex: '1 1 auto' }}>
                      <h4 onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ 
                        margin: 0,
                        cursor: 'pointer',
                        fontSize: '0.92rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                        color: 'var(--text-primary)'
                      }} title="Click to toggle reveal">
                        {showEmployeeSalary ? formatSalary(netSalaryForMonth) : '••••••'}
                      </h4>
                      <span style={{ 
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                        marginTop: '2px'
                      }}>
                        Net Salary
                      </span>
                    </div>
                  </div>

                  {/* 4. Nominee Live Rank Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md, 10px)',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    background: employeeNomineeRank?.rank === 1 
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(217, 119, 6, 0.06) 100%)' 
                      : (employeeNomineeRank?.rank === 2
                        ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.16) 0%, rgba(100, 116, 139, 0.06) 100%)'
                        : (employeeNomineeRank?.rank === 3
                          ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.16) 0%, rgba(180, 83, 9, 0.06) 100%)'
                          : 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)')),
                    border: employeeNomineeRank?.rank === 1 
                      ? '1.5px solid rgba(245, 158, 11, 0.45)' 
                      : (employeeNomineeRank?.rank === 2
                        ? '1.5px solid rgba(148, 163, 184, 0.45)'
                        : (employeeNomineeRank?.rank === 3
                          ? '1.5px solid rgba(217, 119, 6, 0.45)'
                          : '1px solid var(--border-color-glow, rgba(255, 255, 255, 0.12))')),
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      minWidth: '32px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: employeeNomineeRank?.rank === 1 
                        ? 'rgba(245, 158, 11, 0.2)' 
                        : (employeeNomineeRank?.rank === 2
                          ? 'rgba(148, 163, 184, 0.2)'
                          : (employeeNomineeRank?.rank === 3
                            ? 'rgba(217, 119, 6, 0.2)'
                            : 'rgba(255, 255, 255, 0.08)')),
                      border: employeeNomineeRank?.rank === 1 
                        ? '1px solid rgba(245, 158, 11, 0.4)' 
                        : (employeeNomineeRank?.rank === 2
                          ? '1px solid rgba(148, 163, 184, 0.4)'
                          : (employeeNomineeRank?.rank === 3
                            ? '1px solid rgba(217, 119, 6, 0.4)'
                            : '1px solid var(--border-color)')),
                      flexShrink: 0
                    }}>
                      <img 
                        src="/icons/users.png" 
                        alt="rank" 
                        className="theme-icon" 
                        style={{ width: '16px', height: '16px' }} 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', flex: '1 1 auto' }}>
                      <h4 style={{ 
                        margin: 0,
                        fontSize: '1.05rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                        color: employeeNomineeRank?.rank === 1 
                          ? '#f59e0b' 
                          : (employeeNomineeRank?.rank === 2
                            ? '#cbd5e1'
                            : (employeeNomineeRank?.rank === 3 ? '#d97706' : 'var(--text-primary)')) 
                      }}>
                        {employeeNomineeRank ? `#${employeeNomineeRank.rank}` : '—'}
                      </h4>
                      <span style={{ 
                        fontSize: '0.72rem',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        lineHeight: 1.2,
                        marginTop: '2px'
                      }}>
                        {employeeNomineeRank ? `Rank (of ${employeeNomineeRank.totalEmployees})` : 'Live Rank'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nominee Rank Status Banner (Shows last completed month finalized rank) */}
                {(() => {
                  const bannerRank = employeeNomineePrevRank || employeeNomineeRank;
                  if (!bannerRank) {
                    return (
                      <div style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm, 8px)',
                        background: 'var(--bg-surface-hover)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        Employee of the Month Nominee rank is calculated from monthly attendance performance (punctuality, short time, overtime).
                      </div>
                    );
                  }

                  const isTop1 = bannerRank.rank === 1;
                  const isTop2 = bannerRank.rank === 2;
                  const isTop3 = bannerRank.rank === 3;
                  const isPodium = isTop1 || isTop2 || isTop3;

                  // Month label
                  let monthLabel = '';
                  if (bannerRank.monthKey) {
                    const [y, m] = bannerRank.monthKey.split('-');
                    const mi = parseInt(m, 10) - 1;
                    monthLabel = `${monthNames[mi] || m} ${y}`;
                  }

                  // Theme-aware card background & border
                  const cardBg = isTop1 
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.04) 100%)' 
                    : (isTop2
                      ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.12) 0%, rgba(100, 116, 139, 0.04) 100%)'
                      : (isTop3
                        ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(180, 83, 9, 0.04) 100%)'
                        : 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-surface-hover) 100%)'));

                  const cardBorder = isTop1 
                    ? '1.5px solid rgba(245, 158, 11, 0.45)' 
                    : (isTop2
                      ? '1.5px solid rgba(148, 163, 184, 0.45)'
                      : (isTop3
                        ? '1.5px solid rgba(217, 119, 6, 0.45)'
                        : '1px solid var(--border-color-glow, rgba(255, 255, 255, 0.12))'));

                  const badgeBg = isTop1 
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                    : (isTop2
                      ? 'linear-gradient(135deg, #64748b, #475569)'
                      : (isTop3
                        ? 'linear-gradient(135deg, #d97706, #b45309)'
                        : (theme === 'dark' 
                          ? 'linear-gradient(135deg, #27272a, #18181b)' 
                          : 'linear-gradient(135deg, #f4f4f5, #e4e4e7)')));

                  const badgeBorder = isTop1 
                    ? '1px solid #fbbf24' 
                    : (isTop2
                      ? '1px solid #94a3b8'
                      : (isTop3
                        ? '1px solid #f59e0b'
                        : (theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(9, 9, 11, 0.18)')));

                  const badgeColor = (!isPodium && theme === 'light') ? '#09090b' : '#ffffff';
                  const rankNumberColor = isTop1 
                    ? '#f59e0b' 
                    : (isTop2 
                      ? (theme === 'dark' ? '#cbd5e1' : '#475569') 
                      : (isTop3 ? '#d97706' : 'var(--text-primary)'));

                  return (
                    <div style={{
                      marginTop: '14px',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md, 12px)',
                      background: cardBg,
                      border: cardBorder,
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      width: '100%',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                        minWidth: 0,
                        flex: '1 1 auto'
                      }}>
                        {/* High-visibility prominent Rank Badge */}
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          background: badgeBg,
                          color: badgeColor,
                          border: badgeBorder,
                          boxShadow: isTop1 
                            ? '0 2px 10px rgba(245, 158, 11, 0.3)' 
                            : (isTop2 
                              ? '0 2px 10px rgba(100, 116, 139, 0.25)' 
                              : (isTop3 
                                ? '0 2px 10px rgba(217, 119, 6, 0.25)' 
                                : '0 2px 8px rgba(0, 0, 0, 0.2)')),
                          userSelect: 'none',
                          flexShrink: 0
                        }}>
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 800, 
                            letterSpacing: '0.06em', 
                            opacity: 0.95,
                            textTransform: 'uppercase'
                          }}>
                            {isTop1 ? 'TOP NOMINEE' : 'NOMINEE'}
                          </span>
                          <span style={{ 
                            fontSize: '1.18rem', 
                            fontWeight: 900, 
                            letterSpacing: '-0.02em', 
                            paddingLeft: '10px', 
                            borderLeft: `1.5px solid ${(!isPodium && theme === 'light') ? 'rgba(9, 9, 11, 0.2)' : 'rgba(255, 255, 255, 0.3)'}`,
                            lineHeight: 1
                          }}>
                            RANK #{bannerRank.rank}
                          </span>
                        </div>

                        {/* Nominee details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                          }}>
                            <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem', fontWeight: 700 }}>
                              Employee of the Month Nominee Standing
                            </span>
                            {monthLabel && (
                              <span style={{
                                fontSize: '0.74rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: isTop1 ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-surface-hover)',
                                border: isTop1 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
                                color: isTop1 ? '#f59e0b' : 'var(--text-secondary)'
                              }}>
                                {monthLabel}
                              </span>
                            )}
                          </div>
                          <div style={{
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap'
                          }}>
                            <span>
                              Ranked <strong style={{ color: rankNumberColor, fontWeight: 800, fontSize: '0.86rem' }}>#{bannerRank.rank}</strong> out of <strong style={{ color: 'var(--text-primary)' }}>{bannerRank.totalEmployees}</strong> active employees
                            </span>
                            <span style={{ opacity: 0.5 }}>•</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                              Punctuality, short time & overtime
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right indicator pill */}
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.74rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        <img 
                          src="/icons/users.png" 
                          alt="standing" 
                          className="theme-icon" 
                          style={{ width: '12px', height: '12px', opacity: 0.7 }} 
                        />
                        <span>Finalized</span>
                      </div>
                    </div>
                  );
                })()}
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
                {/* Top Row: Heading + Reveal Button on Left, View Toggle Buttons on Right */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                      Attendance & Overtime
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowEmployeeSalary(!showEmployeeSalary)}
                      className="btn btn-secondary mobile-icon-only-btn"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 600,
                        height: '28px'
                      }}
                      title={showEmployeeSalary ? "Hide Salary Figures" : "Reveal Salary Figures"}
                    >
                      <img 
                        src={showEmployeeSalary ? "/icons/eye-off.png" : "/icons/eye.png"} 
                        alt="toggle" 
                        className="theme-icon" 
                        style={{ width: '13px', height: '13px' }} 
                      />
                      <span>{showEmployeeSalary ? "Hide Figures" : "Reveal Figures"}</span>
                    </button>
                  </div>

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

                    let runningNetSalarySum = 0;
                    return (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Working Hours</th>
                            <th>Overtime</th>
                            <th>Comp Time</th>
                            <th>OT Earned</th>
                            <th style={{ color: 'var(--danger)' }}>Deduction</th>
                            <th>Day Total Amount</th>
                            <th style={{ color: '#10b981' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Net Salary</span>
                                <button
                                  type="button"
                                  onClick={() => setShowEmployeeSalary(!showEmployeeSalary)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                                  title={showEmployeeSalary ? "Hide Salary" : "Reveal Salary"}
                                >
                                  <img src={showEmployeeSalary ? "/icons/eye-off.png" : "/icons/eye.png"} alt="toggle" className="theme-icon" style={{ width: '11px', height: '11px' }} />
                                </button>
                              </div>
                            </th>
                            <th style={{ color: 'var(--primary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>Net Payable</span>
                                <button
                                  type="button"
                                  onClick={() => setShowEmployeeSalary(!showEmployeeSalary)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                                  title={showEmployeeSalary ? "Hide Payable" : "Reveal Payable"}
                                >
                                  <img src={showEmployeeSalary ? "/icons/eye-off.png" : "/icons/eye.png"} alt="toggle" className="theme-icon" style={{ width: '11px', height: '11px' }} />
                                </button>
                              </div>
                            </th>
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

                            if (summary.status !== 'Unprocessed') {
                              runningNetSalarySum += dayTotal;
                            }

                            const dayDed = (summary.absenceDeduction || 0) + (summary.lateDeduction || 0);

                            return (
                              <tr key={summary.date} style={styles.tableRow}>
                                <td style={styles.tableCell}>{summary.date}</td>
                                <td style={styles.tableCell}>{summary.dayName}</td>
                                <td style={styles.tableCell}>{summary.checkIn || '-'}</td>
                                <td style={styles.tableCell}>{summary.checkOut || '-'}</td>
                                <td style={styles.tableCell}>{summary.workingHours > 0 ? formatClockDuration(summary.workingHours) : '-'}</td>
                                <td style={styles.tableCell}>{summary.overtimeHours > 0 ? formatOvertimeDuration(summary.overtimeHours) : '-'}</td>
                                <td style={{ ...styles.tableCell, color: '#8b5cf6' }}>{summary.compensatedOvertimeHours > 0 ? formatOvertimeDuration(summary.compensatedOvertimeHours) : '-'}</td>
                                <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">
                                  {showEmployeeSalary ? formatSalary(summary.overtimePayout) : '••••••'}
                                </td>
                                <td style={{ ...styles.tableCell, color: dayDed > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: dayDed > 0 ? '700' : '400', cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">
                                  {showEmployeeSalary ? (dayDed > 0 ? `- ${formatSalary(dayDed)}` : '-') : (dayDed > 0 ? '- ••••••' : '-')}
                                </td>
                                <td style={{ ...styles.tableCell, fontWeight: '700', color: 'var(--success)', cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">
                                  {showEmployeeSalary ? (dayTotal > 0 ? formatSalary(dayTotal) : (summary.status === 'Unprocessed' ? '-' : formatSalary(0))) : (summary.status === 'Unprocessed' ? '-' : '••••••')}
                                </td>
                                <td style={{ ...styles.tableCell, fontWeight: '700', color: '#10b981', cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">
                                  {summary.status !== 'Unprocessed' ? (showEmployeeSalary ? formatSalary(dailyBase) : '••••••') : '-'}
                                </td>
                                <td style={{ ...styles.tableCell, fontWeight: '800', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">
                                  {summary.status !== 'Unprocessed' ? (showEmployeeSalary ? formatSalary(runningNetSalarySum) : '••••••') : '-'}
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
                            <td style={{ padding: '10px 12px', color: 'var(--warning)' }}>{totalOvertimeHoursSum > 0 ? formatOvertimeDuration(totalOvertimeHoursSum) : '-'}</td>
                            <td style={{ padding: '10px 12px', color: '#8b5cf6' }}>{totalCompensatedHoursSum > 0 ? formatOvertimeDuration(totalCompensatedHoursSum) : '-'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--success)', cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">{showEmployeeSalary ? formatSalary(totalOvertimePayoutSum) : '••••••'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--danger)', fontWeight: '700', cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">
                              {showEmployeeSalary ? (totalDeductionSum > 0 ? `- ${formatSalary(totalDeductionSum)}` : '-') : (totalDeductionSum > 0 ? '- ••••••' : '-')}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--success)', fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">{showEmployeeSalary ? formatSalary(totalMonthAmountSum) : '••••••'}</td>
                            <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">{showEmployeeSalary ? formatSalary(Math.max(0, effectiveBase - incomeTax)) : '••••••'}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--primary)', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }} onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} title="Click to toggle reveal">{showEmployeeSalary ? formatSalary(totalMonthAmountSum) : '••••••'}</td>
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
