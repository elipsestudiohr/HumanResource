import React from 'react';

interface TodayDonutProps {
  activeCount: number;
  completedCount: number;
  leaveCount: number;
  absentCount: number;
  totalEmployees: number;
}

export const TodayAttendanceDonutChart: React.FC<TodayDonutProps> = ({
  activeCount,
  completedCount,
  leaveCount,
  absentCount,
  totalEmployees
}) => {
  const presentTotal = activeCount + completedCount;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentage ratios
  const totalTracked = Math.max(1, totalEmployees);
  const activeRatio = activeCount / totalTracked;
  const completedRatio = completedCount / totalTracked;
  const leaveRatio = leaveCount / totalTracked;
  const absentRatio = absentCount / totalTracked;

  // Calculate dash offsets for SVG ring segments
  const activeLength = activeRatio * circumference;
  const completedLength = completedRatio * circumference;
  const leaveLength = leaveRatio * circumference;
  const absentLength = absentRatio * circumference;

  const activeOffset = 0;
  const completedOffset = -activeLength;
  const leaveOffset = -(activeLength + completedLength);
  const absentOffset = -(activeLength + completedLength + leaveLength);

  return (
    <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: 'var(--radius-md)', flex: 1, minWidth: '300px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Today's Attendance Real-Time Status</h4>
        <span style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
          Live Device Sync
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* SVG Donut Ring */}
        <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
            
            {/* Active Checked In (Emerald) */}
            {activeCount > 0 && (
              <circle
                cx="50" cy="50" r={radius} fill="none"
                stroke="#10b981" strokeWidth="12"
                strokeDasharray={`${activeLength} ${circumference}`}
                strokeDashoffset={activeOffset}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            )}

            {/* Completed Shift (Cyan) */}
            {completedCount > 0 && (
              <circle
                cx="50" cy="50" r={radius} fill="none"
                stroke="#06b6d4" strokeWidth="12"
                strokeDasharray={`${completedLength} ${circumference}`}
                strokeDashoffset={completedOffset}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            )}

            {/* On Leave (Purple) */}
            {leaveCount > 0 && (
              <circle
                cx="50" cy="50" r={radius} fill="none"
                stroke="#8b5cf6" strokeWidth="12"
                strokeDasharray={`${leaveLength} ${circumference}`}
                strokeDashoffset={leaveOffset}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            )}

            {/* Absent (Red) */}
            {absentCount > 0 && (
              <circle
                cx="50" cy="50" r={radius} fill="none"
                stroke="#ef4444" strokeWidth="12"
                strokeDasharray={`${absentLength} ${circumference}`}
                strokeDashoffset={absentOffset}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            )}
          </svg>

          {/* Centered Total Text */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: '1' }}>{presentTotal}</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>Present</span>
          </div>
        </div>

        {/* Legend List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '160px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
              Active Checked In:
            </span>
            <strong style={{ color: '#10b981' }}>{activeCount}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4', display: 'inline-block' }}></span>
              Shift Completed:
            </span>
            <strong style={{ color: '#06b6d4' }}>{completedCount}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }}></span>
              On Leave:
            </span>
            <strong style={{ color: '#8b5cf6' }}>{leaveCount}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
              Absent:
            </span>
            <strong style={{ color: '#ef4444' }}>{absentCount}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MonthlyBreakdownProps {
  presentCount: number;
  lateCount: number;
  missingCheckoutCount: number;
  leaveCount: number;
  absentCount: number;
  title?: string;
}

export const MonthlyBreakdownBarChart: React.FC<MonthlyBreakdownProps> = ({
  presentCount,
  lateCount,
  missingCheckoutCount,
  leaveCount,
  absentCount,
  title = 'Monthly Attendance Statistics'
}) => {
  const total = Math.max(1, presentCount + lateCount + missingCheckoutCount + leaveCount + absentCount);
  const presentPct = Math.round((presentCount / total) * 100);
  const latePct = Math.round((lateCount / total) * 100);
  const missingPct = Math.round((missingCheckoutCount / total) * 100);
  const leavePct = Math.round((leaveCount / total) * 100);
  const absentPct = Math.round((absentCount / total) * 100);

  return (
    <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: 'var(--radius-md)', flex: 1, minWidth: '300px' }}>
      <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{title}</h4>

      {/* Segmented Bar */}
      <div style={{ width: '100%', height: '14px', borderRadius: '7px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex' }}>
        {presentCount > 0 && <div style={{ width: `${presentPct}%`, background: '#10b981', height: '100%' }} title={`On-Time Present: ${presentCount}`} />}
        {lateCount > 0 && <div style={{ width: `${latePct}%`, background: '#f59e0b', height: '100%' }} title={`Late: ${lateCount}`} />}
        {missingCheckoutCount > 0 && <div style={{ width: `${missingPct}%`, background: '#f43f5e', height: '100%' }} title={`Missing Checkout: ${missingCheckoutCount}`} />}
        {leaveCount > 0 && <div style={{ width: `${leavePct}%`, background: '#8b5cf6', height: '100%' }} title={`Approved Leave: ${leaveCount}`} />}
        {absentCount > 0 && <div style={{ width: `${absentPct}%`, background: '#ef4444', height: '100%' }} title={`Absent: ${absentCount}`} />}
      </div>

      {/* Grid Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
        <div style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>On-Time</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10b981' }}>{presentCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({presentPct}%)</span></div>
        </div>

        <div style={{ padding: '8px 10px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Late Arrivals</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f59e0b' }}>{lateCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({latePct}%)</span></div>
        </div>

        <div style={{ padding: '8px 10px', background: 'rgba(244, 63, 94, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>No Check-Out</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f43f5e' }}>{missingCheckoutCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({missingPct}%)</span></div>
        </div>

        <div style={{ padding: '8px 10px', background: 'rgba(139, 92, 246, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Leaves</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8b5cf6' }}>{leaveCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({leavePct}%)</span></div>
        </div>

        <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Absents</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>{absentCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({absentPct}%)</span></div>
        </div>
      </div>
    </div>
  );
};
