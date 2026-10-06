import React, { useState, useMemo } from 'react';
import type { EmployeeProfile, ShiftTiming, EmployeeNominee, NomineeCategory } from '../../../utils/attendanceProcessor';
import { TodayAttendanceDonutChart, MonthlyBreakdownBarChart } from '../../../components/AttendanceCharts';
import styles from '../AdminStyles';

export function formatTo12h(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

interface OverviewTabProps {
  setActiveTab: (tab: any) => void;
  totalEmployees: number;
  setShowPresentsModal: (show: boolean) => void;
  totalPresentsToday: number;
  activeCheckedInCount: number;
  completedShiftCount: number;
  activeLeavesToday: number;
  setShowLeavesModal?: (show: boolean) => void;
  setShowAbsentsModal: (show: boolean) => void;
  absentsTodayCount: number;
  monthlyLateCount: number;
  monthlyLeaveCount: number;
  monthlyAbsentCount: number;
  currentMonthKey: string;
  defaultShiftStart: string;
  defaultShiftEnd: string;
  defaultShiftHours: number;
  activeGraceMins: number;
  lateAfterTimeStr: string;
  shiftTimings: ShiftTiming[];
  profiles: EmployeeProfile[];
  nominees?: EmployeeNominee[];
  nomineeMonthKey?: string;
  setNomineeMonthKey?: (key: string) => void;
  prevCompletedMonthKey?: string;
  nomineeCategoryFilter?: NomineeCategory;
  setNomineeCategoryFilter?: (filter: NomineeCategory) => void;
  setSelectedCalendarProfile?: (p: EmployeeProfile | null) => void;
  setAdminViewYear?: (y: number) => void;
  setAdminViewMonth?: (m: number) => void;
  setSelectedAdminEmpCalendarDayData?: (data: any) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  setActiveTab,
  totalEmployees,
  setShowPresentsModal,
  totalPresentsToday,
  activeCheckedInCount,
  completedShiftCount,
  activeLeavesToday,
  setShowLeavesModal,
  setShowAbsentsModal,
  absentsTodayCount,
  monthlyLateCount,
  monthlyLeaveCount,
  monthlyAbsentCount,
  currentMonthKey,
  defaultShiftStart,
  defaultShiftEnd,
  defaultShiftHours,
  activeGraceMins,
  lateAfterTimeStr,
  shiftTimings,
  profiles,
  nominees = [],
  nomineeMonthKey,
  setNomineeMonthKey,
  prevCompletedMonthKey,
  nomineeCategoryFilter = 'except_both',
  setNomineeCategoryFilter,
  setSelectedCalendarProfile,
  setAdminViewYear,
  setAdminViewMonth,
  setSelectedAdminEmpCalendarDayData
}) => {
  const [nomineeSearch, setNomineeSearch] = useState('');

  // Open respective employee calendar modal on the exact nominee month when clicking a row or nominee card
  const handleOpenNomineeCalendar = (n: EmployeeNominee) => {
    const prof = profiles.find(p => p.id === n.id || p.pin === n.pin);
    if (!prof) return;

    let targetYear = new Date().getFullYear();
    let targetMonth = new Date().getMonth();
    if (nomineeMonthKey) {
      const [yStr, mStr] = nomineeMonthKey.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10) - 1;
      if (!isNaN(y) && !isNaN(m)) {
        targetYear = y;
        targetMonth = m;
      }
    }

    if (setAdminViewYear) setAdminViewYear(targetYear);
    if (setAdminViewMonth) setAdminViewMonth(targetMonth);
    if (setSelectedAdminEmpCalendarDayData) setSelectedAdminEmpCalendarDayData(null);
    if (setSelectedCalendarProfile) setSelectedCalendarProfile(prof);
  };

  // Generate month options (defaulting to previous completed month)
  const monthOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [];
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Previous 6 completed months
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const isPrev = i === 1;
      opts.push({
        key,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}${isPrev ? ' (Last Completed Month)' : ''}`
      });
    }

    // Current month in progress
    const pad = (n: number) => n.toString().padStart(2, '0');
    const curKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    opts.unshift({
      key: curKey,
      label: `${monthNames[now.getMonth()]} ${now.getFullYear()} (Current Month in Progress)`
    });

    return opts;
  }, []);

  const activeNomineeMonthKey = nomineeMonthKey || prevCompletedMonthKey || monthOptions[1]?.key || currentMonthKey;

  // Filtered nominees list
  const filteredNominees = useMemo(() => {
    if (!nomineeSearch.trim()) return nominees;
    const q = nomineeSearch.trim().toLowerCase();
    return nominees.filter(n =>
      n.name.toLowerCase().includes(q) ||
      n.pin.toLowerCase().includes(q) ||
      n.department.toLowerCase().includes(q) ||
      (n.designation && n.designation.toLowerCase().includes(q))
    );
  }, [nominees, nomineeSearch]);

  const top3Nominees = nominees.slice(0, 3);

  const selectedMonthLabel = useMemo(() => {
    const matched = monthOptions.find(o => o.key === activeNomineeMonthKey);
    return matched ? matched.label.replace(' (Last Completed Month)', '').replace(' (Current Month in Progress)', '') : activeNomineeMonthKey;
  }, [monthOptions, activeNomineeMonthKey]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }} className="animate-fade-in">
      {/* Dashboard Metric Cards */}
      <div style={styles.metricCards}>
        <div className="glass-panel" style={{ ...styles.metricCard, cursor: 'pointer' }} onClick={() => setActiveTab('employees')} title="Click to open Employees Panel">
          <img 
            src="/icons/users.png" 
            alt="employees" 
            className="theme-icon" 
            style={{ width: '32px', height: '32px' }} 
          />
          <div>
            <h2>{totalEmployees}</h2>
            <span>Total Employees</span>
          </div>
        </div>

        <div className="glass-panel" style={{ ...styles.metricCard, cursor: 'pointer' }} onClick={() => setShowPresentsModal(true)} title="Click to view Presents by Department">
          <img 
            src="/icons/calendar.png" 
            alt="attendance" 
            className="theme-icon" 
            style={{ width: '32px', height: '32px' }} 
          />
          <div>
            <h2>{totalPresentsToday}</h2>
            <span style={{ fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>Presents Today</span>
            <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>
              {activeCheckedInCount} Active | {completedShiftCount} Completed
            </span>
          </div>
        </div>

        <div 
          className="glass-panel" 
          style={{ ...styles.metricCard, cursor: 'pointer' }} 
          onClick={() => {
            if (setShowLeavesModal) {
              setShowLeavesModal(true);
            } else {
              setActiveTab('leaves');
            }
          }} 
          title="Click to view On Leave Today Breakdown"
        >
          <img 
            src="/icons/file-text.png" 
            alt="leaves" 
            className="theme-icon" 
            style={{ width: '32px', height: '32px' }} 
          />
          <div>
            <h2>{activeLeavesToday}</h2>
            <span>On Leave Today</span>
          </div>
        </div>

        <div className="glass-panel" style={{ ...styles.metricCard, cursor: 'pointer' }} onClick={() => setShowAbsentsModal(true)} title="Click to view Absents by Department">
          <img 
            src="/icons/clock.png" 
            alt="raw" 
            className="theme-icon" 
            style={{ width: '32px', height: '32px' }} 
          />
          <div>
            <h2>{absentsTodayCount}</h2>
            <span>Absents Today</span>
          </div>
        </div>
      </div>

      {/* Real-time Statistical Charts Row */}
      <div className="responsive-split-container" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', width: '100%' }}>
        <TodayAttendanceDonutChart
          activeCount={activeCheckedInCount}
          completedCount={completedShiftCount}
          leaveCount={activeLeavesToday}
          absentCount={absentsTodayCount}
          totalEmployees={totalEmployees}
        />
        <MonthlyBreakdownBarChart
          presentCount={totalPresentsToday}
          lateCount={monthlyLateCount}
          missingCheckoutCount={0}
          leaveCount={monthlyLeaveCount}
          absentCount={monthlyAbsentCount}
          title={`Monthly Attendance Statistics (${currentMonthKey})`}
        />
      </div>

      {/* Employee of the Month Nominees (Attendance Performance) */}
      <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img 
                  src="/icons/users.png" 
                  alt="nominees" 
                  className="theme-icon" 
                  style={{ width: '22px', height: '22px' }} 
                />
                <span>Employee of the Month Nominees</span>
              </h3>
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                padding: '3px 8px', 
                borderRadius: '6px', 
                background: 'rgba(59, 130, 246, 0.15)', 
                color: 'var(--primary)',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                {selectedMonthLabel}
              </span>
              {activeNomineeMonthKey === prevCompletedMonthKey && (
                <span style={{ 
                  fontSize: '0.72rem', 
                  fontWeight: 600, 
                  padding: '3px 8px', 
                  borderRadius: '6px', 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)'
                }}>
                  Previous Completed Month
                </span>
              )}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {nomineeCategoryFilter === 'sale'
                ? 'Sales department nominees ranked by attendance performance: fewest absences, fewest late arrivals, least short time, and highest overtime hours.'
                : nomineeCategoryFilter === 'time_rule'
                ? 'Employees with custom time rules ranked by attendance performance: fewest absences, fewest late arrivals, least short time, and highest overtime hours.'
                : nomineeCategoryFilter === 'sale_time_rule'
                ? 'Sales & Time Rule nominees ranked by attendance performance: fewest absences, fewest late arrivals, least short time, and highest overtime hours.'
                : nomineeCategoryFilter === 'all'
                ? 'All active employees ranked by attendance performance: fewest absences, fewest late arrivals, least short time, and highest overtime hours.'
                : 'Nominees ranked by attendance performance (excluding Sales & Time Rule employees): fewest absences, fewest late arrivals, least short time, and highest overtime hours.'
              }
            </p>
          </div>

          {/* Controls: Category Filter + Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Category:</span>
              <select
                value={nomineeCategoryFilter || 'except_both'}
                onChange={(e) => setNomineeCategoryFilter && setNomineeCategoryFilter(e.target.value as any)}
                className="custom-select"
                style={{ padding: '6px 12px', fontSize: '0.82rem', minWidth: '190px' }}
              >
                <option value="except_both">Except Both (Default)</option>
                <option value="sale">Sale</option>
                <option value="time_rule">With Time Rule Employee</option>
                <option value="sale_time_rule">Sale with Time Rule</option>
                <option value="all">All Employees</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Period:</span>
              <select
                value={activeNomineeMonthKey}
                onChange={(e) => setNomineeMonthKey && setNomineeMonthKey(e.target.value)}
                className="custom-select"
                style={{ padding: '6px 12px', fontSize: '0.82rem', minWidth: '180px' }}
              >
                {monthOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Top 3 Nominees Highlight Cards */}
        {top3Nominees.length > 0 && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '16px', 
            marginBottom: '24px' 
          }}>
            {top3Nominees.map((nom, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const rankColor = isFirst ? '#f59e0b' : (isSecond ? '#cbd5e1' : '#d97706');
              const rankBg = isFirst ? 'rgba(245, 158, 11, 0.08)' : (isSecond ? 'rgba(148, 163, 184, 0.08)' : 'rgba(217, 119, 6, 0.08)');
              const rankBorder = isFirst ? 'rgba(245, 158, 11, 0.4)' : (isSecond ? 'rgba(148, 163, 184, 0.4)' : 'rgba(217, 119, 6, 0.4)');
              const badgeTitle = isFirst ? 'Rank #1 - Top Nominee' : (isSecond ? 'Rank #2 - Nominee' : 'Rank #3 - Nominee');

              return (
                <div 
                  key={nom.id || nom.pin}
                  onClick={() => handleOpenNomineeCalendar(nom)}
                  style={{
                    cursor: 'pointer',
                    background: rankBg,
                    border: `1.5px solid ${rankBorder}`,
                    borderRadius: 'var(--radius-md, 12px)',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                  title="Click to view employee attendance calendar for this month"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      fontSize: '0.78rem', 
                      fontWeight: 800, 
                      color: rankColor,
                      background: 'var(--bg-surface)',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      border: `1px solid ${rankBorder}`,
                      letterSpacing: '0.04em'
                    }}>
                      {badgeTitle}
                    </span>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      PIN: <strong style={{ color: 'var(--text-primary)' }}>{nom.pin}</strong>
                    </span>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>{nom.name}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {nom.department} {nom.designation ? `· ${nom.designation}` : ''}
                    </span>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: '6px', 
                    paddingTop: '10px',
                    borderTop: `1px solid ${rankBorder}`,
                    fontSize: '0.78rem'
                  }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Late Arrivals</div>
                      <div style={{ fontWeight: 700, color: nom.lateArrivals === 0 ? '#10b981' : '#f59e0b' }}>
                        {nom.lateArrivals} {nom.lateArrivals > 0 ? `(${nom.totalLateMinutes}m)` : ''}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Short Time</div>
                      <div style={{ fontWeight: 700, color: (nom.shortTimeDays || 0) === 0 ? '#10b981' : '#f59e0b' }}>
                        {nom.shortTimeDays || 0} {(nom.totalShortTimeMinutes || 0) > 0 ? `(${nom.totalShortTimeMinutes}m)` : ''}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Overtime</div>
                      <div style={{ fontWeight: 700, color: (nom.totalCompensatedOvertimeHours || nom.totalOvertimeHours) > 0 ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        {(nom.totalCompensatedOvertimeHours || nom.totalOvertimeHours).toFixed(1)} hrs
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Score</div>
                      <div style={{ fontWeight: 800, color: rankColor }}>
                        {nom.score} pts
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard Table Header & Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Full Nominee Standings ({filteredNominees.length} active employees)
            </span>
            {filteredNominees.length > 10 && (
              <span style={{ 
                fontSize: '0.74rem', 
                color: 'var(--text-muted)', 
                background: 'var(--bg-surface-hover)', 
                padding: '3px 8px', 
                borderRadius: '4px',
                border: '1px solid var(--border-color)'
              }}>
                Showing ~10 per view · Scroll down to view all
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search nominee or PIN..."
                value={nomineeSearch}
                onChange={(e) => setNomineeSearch(e.target.value)}
                style={{ ...styles.input, padding: '6px 12px', fontSize: '0.82rem', width: '200px' }}
              />
              {nomineeSearch && (
                <button
                  type="button"
                  onClick={() => setNomineeSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Nominees Table with max height for ~10 rows and scrollable body */}
        <div style={{ 
          overflowX: 'auto', 
          overflowY: 'auto', 
          maxHeight: '520px', 
          width: '100%',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm, 8px)'
        }}>
          <table style={{ ...styles.table, width: '100%', fontSize: '0.85rem', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: 'var(--bg-surface-hover)', textAlign: 'left' }}>
                <th style={{ ...styles.tableCell, width: '60px', textAlign: 'center', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Rank</th>
                <th style={{ ...styles.tableCell, position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Employee</th>
                <th style={{ ...styles.tableCell, position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Department</th>
                <th style={{ ...styles.tableCell, position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Late Arrivals</th>
                <th style={{ ...styles.tableCell, position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Late Duration</th>
                <th style={{ ...styles.tableCell, position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Short Time</th>
                <th style={{ ...styles.tableCell, position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Overtime</th>
                <th style={{ ...styles.tableCell, position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Absences</th>
                <th style={{ ...styles.tableCell, position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Total Worked</th>
                <th style={{ ...styles.tableCell, textAlign: 'center', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Performance Score</th>
                <th style={{ ...styles.tableCell, textAlign: 'center', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10, borderBottom: '2px solid var(--border-color)' }}>Nominee Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredNominees.length > 0 ? (
                filteredNominees.map((n) => {
                  const isTop1 = n.rank === 1;
                  const isTop2 = n.rank === 2;
                  const isTop3 = n.rank === 3;
                  const isPodium = n.rank <= 3;
                  const rankBadgeBg = isTop1 ? '#f59e0b' : (isTop2 ? '#64748b' : (isTop3 ? '#d97706' : 'var(--bg-surface-hover)'));
                  const rankBadgeColor = isPodium ? '#ffffff' : 'var(--text-secondary)';

                  return (
                    <tr 
                      key={n.id || n.pin}
                      onClick={() => handleOpenNomineeCalendar(n)}
                      title={`Click anywhere to view ${n.name}'s attendance calendar for ${selectedMonthLabel}`}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        background: isTop1 ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ ...styles.tableCell, textAlign: 'center', fontWeight: 700 }}>
                        <span 
                          className={!isPodium ? 'nominee-rank-circle-normal' : undefined}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: rankBadgeBg,
                            color: rankBadgeColor,
                            fontSize: '0.78rem',
                            fontWeight: 800
                          }}
                        >
                          #{n.rank}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{n.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>PIN: {n.pin}</div>
                      </td>
                      <td style={styles.tableCell}>
                        <div>{n.department}</div>
                        {n.designation && <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{n.designation}</div>}
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: n.lateArrivals === 0 ? '#10b981' : '#f59e0b',
                          background: n.lateArrivals === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {n.lateArrivals} {n.lateArrivals === 1 ? 'day' : 'days'}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        {n.totalLateMinutes > 0 ? (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>{n.totalLateMinutes} mins</span>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>0 mins</span>
                        )}
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: (n.shortTimeDays || 0) === 0 ? '#10b981' : '#f59e0b',
                          background: (n.shortTimeDays || 0) === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          {n.shortTimeDays || 0} {(n.shortTimeDays || 0) === 1 ? 'day' : 'days'}
                          {(n.totalShortTimeMinutes || 0) > 0 ? ` (${n.totalShortTimeMinutes}m)` : ''}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{ 
                          fontWeight: 700, 
                          color: (n.totalCompensatedOvertimeHours || n.totalOvertimeHours) > 0 ? 'var(--primary)' : 'var(--text-secondary)' 
                        }}>
                          {(n.totalCompensatedOvertimeHours || n.totalOvertimeHours).toFixed(1)} hrs
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{ color: n.absences === 0 ? '#10b981' : 'var(--danger)', fontWeight: 600 }}>
                          {n.absences}
                        </span>
                      </td>
                      <td style={styles.tableCell}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {n.totalWorkedHours.toFixed(1)} hrs
                        </span>
                      </td>
                      <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                        <span style={{ 
                          fontWeight: 800, 
                          fontSize: '0.88rem',
                          color: isTop1 ? '#f59e0b' : 'var(--text-primary)' 
                        }}>
                          {n.score}
                        </span>
                      </td>
                      <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                        {isTop1 ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 800, 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            background: 'rgba(245, 158, 11, 0.15)', 
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            Top Nominee
                          </span>
                        ) : (n.rank <= 3 ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            background: n.rank === 2 ? 'rgba(148, 163, 184, 0.15)' : 'rgba(217, 119, 6, 0.15)', 
                            color: n.rank === 2 ? '#cbd5e1' : '#d97706',
                            border: n.rank === 2 ? '1px solid rgba(148, 163, 184, 0.3)' : '1px solid rgba(217, 119, 6, 0.3)'
                          }}>
                            Nominee
                          </span>
                        ) : (
                          <span 
                            className="nominee-rank-pill"
                            style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 600, 
                              padding: '3px 6px', 
                              borderRadius: '4px', 
                              background: 'var(--bg-surface-hover)', 
                              color: 'var(--text-muted)' 
                            }}
                          >
                            Ranked #{n.rank}
                          </span>
                        ))}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} style={{ ...styles.tableCell, textAlign: 'center', padding: '28px', color: 'var(--text-muted)' }}>
                    No nominee attendance records found for {selectedMonthLabel}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Info & Guidelines */}
      <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Office Policies & Shift Rules Summary</h3>
        <div style={{ ...styles.policySummary, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div><strong>Default Office Hours:</strong> {formatTo12h(defaultShiftStart || '11:00')} - {formatTo12h(defaultShiftEnd || '20:00')} ({defaultShiftHours || 9} hrs)</div>
          <div><strong>Active Grace Period:</strong> {activeGraceMins} mins (Late after {lateAfterTimeStr})</div>
          <div><strong>Saturdays:</strong> Alternate Saturdays off (2nd & 4th)</div>
          <div><strong>Overtime Rules:</strong> Starts after {formatTo12h(defaultShiftEnd || '20:00')} (Paid at 1.0x rate)</div>
        </div>

        {shiftTimings.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--primary)' }}>Configured Custom Shift Timing Rules ({shiftTimings.length})</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {shiftTimings.map(t => {
                const targetLabel = t.target_type === 'employee'
                  ? `Employee: ${profiles.find(p => p.id === t.target_id)?.full_name || 'Staff'}`
                  : (t.target_type === 'department' ? `Department: ${t.target_id}` : (t.target_type === 'designation' ? `Designation: ${t.target_id}` : 'Global Rule'));
                return (
                  <div key={t.id} style={{ background: 'var(--bg-surface-hover)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{targetLabel}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {t.is_fixed_hours ? (
                        <span className="timing-rule-tag" style={{ fontWeight: 700, color: 'var(--primary)', background: 'var(--bg-surface-hover)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
                          Fix Hours ({t.total_hours || 9} Hours Shift)
                        </span>
                      ) : (
                        <>Shift: <strong>{formatTo12h(t.start_time)} - {formatTo12h(t.end_time)}</strong></>
                      )}
                      {' '}| Days: {t.days?.join(', ') || 'Mon-Fri'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewTab;
