import React from 'react';

interface AttendanceStatsModalsProps {
  showPresentsModal: boolean;
  setShowPresentsModal: (show: boolean) => void;
  totalPresentsToday: number;
  activeCheckedInCount: number;
  completedShiftCount: number;
  presentsByDept: Record<string, any[]>;

  showAbsentsModal: boolean;
  setShowAbsentsModal: (show: boolean) => void;
  absentsTodayCount: number;
  absentsByDept: Record<string, any[]>;
  setSelectedCalendarProfile: (p: any) => void;
  setAdminViewYear: (y: number) => void;
  setAdminViewMonth: (m: number) => void;
  calendarYear: number;
  calendarMonth: number;
}

export const AttendanceStatsModals: React.FC<AttendanceStatsModalsProps> = ({
  showPresentsModal,
  setShowPresentsModal,
  totalPresentsToday,
  activeCheckedInCount,
  completedShiftCount,
  presentsByDept,
  showAbsentsModal,
  setShowAbsentsModal,
  absentsTodayCount,
  absentsByDept,
  setSelectedCalendarProfile,
  setAdminViewYear,
  setAdminViewMonth,
  calendarYear,
  calendarMonth
}) => {
  return (
    <>
      {/* Presents Today Popup Modal */}
      {showPresentsModal && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setShowPresentsModal(false);
            }
          }} 
          style={{ zIndex: 11500 }}
        >
          <div 
            className="custom-dialog-card glass-panel" 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
            style={{ padding: '24px', width: '640px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '85vh' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Presents Today Breakdown</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Total Present: <strong>{totalPresentsToday}</strong> ({activeCheckedInCount} Active | {completedShiftCount} Completed)
                </span>
              </div>
              <button onClick={() => setShowPresentsModal(false)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                Close
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
              {Object.keys(presentsByDept).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No employees present today yet.</div>
              ) : (
                Object.entries(presentsByDept).map(([dept, items]) => (
                  <div key={dept} style={{ background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '14px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{dept}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{items.length} Present</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {items.map(({ emp, checkIn, checkOut, status, isLate, shiftTiming }: any) => (
                        <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)' }}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700 }}>{emp.full_name}</strong>{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({emp.pin})</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shift: {shiftTiming}</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isLate && (
                              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
                                Late Arrival
                              </span>
                            )}
                            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 'var(--radius-full)', background: status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)', color: status === 'Active' ? '#10b981' : '#06b6d4', fontWeight: 600 }}>
                              {status === 'Active' ? 'Active On Duty' : 'Shift Completed'}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, marginLeft: '4px' }}>
                              In: {checkIn} {checkOut ? `| Out: ${checkOut}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Absents Today Popup Modal */}
      {showAbsentsModal && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setShowAbsentsModal(false);
            }
          }} 
          style={{ zIndex: 11500 }}
        >
          <div 
            className="custom-dialog-card glass-panel" 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
            style={{ padding: '24px', width: '640px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '85vh' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Absents Today Breakdown</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Total Absent Today: <strong style={{ color: 'var(--danger)' }}>{absentsTodayCount}</strong>
                </span>
              </div>
              <button onClick={() => setShowAbsentsModal(false)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                Close
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
              {Object.keys(absentsByDept).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No unexcused absents today! Everyone is present or on approved leave.</div>
              ) : (
                Object.entries(absentsByDept).map(([dept, items]) => (
                  <div key={dept} style={{ background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '14px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{dept}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{items.length} Absent</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {items.map(({ emp, monthLeaves, monthAbsences }: any) => (
                        <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)' }}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 700 }}>{emp.full_name}</strong>{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({emp.pin})</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.designation || 'Staff'}</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              This Month: <strong style={{ color: '#8b5cf6' }}>{monthLeaves} Leaves</strong> | <strong style={{ color: '#ef4444' }}>{monthAbsences} Absences</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAbsentsModal(false);
                                setSelectedCalendarProfile(emp);
                                setAdminViewYear(calendarYear);
                                setAdminViewMonth(calendarMonth);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                            >
                              Calendar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AttendanceStatsModals;
