import React from 'react';
import type { EmployeeProfile, ShiftTiming } from '../../../utils/attendanceProcessor';
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
  profiles
}) => {
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
                        <span style={{ fontWeight: 700, color: 'var(--primary)', background: 'var(--bg-surface-hover)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
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
