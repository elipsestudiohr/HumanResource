import React from 'react';
import type { ShiftTiming, DeviceSettings } from '../../../lib/dbHelper';
import { updateDeviceSettings, getDeviceSettings } from '../../../lib/dbHelper';
import { formatTo12h } from './OverviewTab';
import styles from '../AdminStyles';

interface TimingsTabProps {
  setIsAddTimingModalOpen: (open: boolean) => void;
  graceTargetScopeType: string;
  setGraceTargetScopeType: (scope: string) => void;
  calendarYear: number;
  calendarMonth: number;
  graceTargetMonth: string;
  setGraceTargetMonth: (val: string) => void;
  graceStartDate: string;
  setGraceStartDate: (val: string) => void;
  graceEndDate: string;
  setGraceEndDate: (val: string) => void;
  defaultShiftStart: string;
  setDefaultShiftStart: (val: string) => void;
  defaultShiftEnd: string;
  setDefaultShiftEnd: (val: string) => void;
  defaultShiftHours: number;
  setDefaultShiftHours: (val: number) => void;
  graceTimeMinsSetting: number;
  setGraceTimeMinsSetting: (val: number) => void;
  monthlyGraceSettings: Record<string, number>;
  setMonthlyGraceSettings: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  deviceSettings: DeviceSettings;
  setDeviceSettings: (settings: DeviceSettings) => void;
  fetchData: () => void;
  shiftTimings: ShiftTiming[];
  handleEditShiftTimingClick: (timing: ShiftTiming) => void;
  handleDeleteShiftTimingClick: (id: number) => void;
}

export const TimingsTab: React.FC<TimingsTabProps> = ({
  setIsAddTimingModalOpen,
  graceTargetScopeType,
  setGraceTargetScopeType,
  calendarYear,
  calendarMonth,
  graceTargetMonth,
  setGraceTargetMonth,
  graceStartDate,
  setGraceStartDate,
  graceEndDate,
  setGraceEndDate,
  defaultShiftStart,
  setDefaultShiftStart,
  defaultShiftEnd,
  setDefaultShiftEnd,
  defaultShiftHours,
  setDefaultShiftHours,
  graceTimeMinsSetting,
  setGraceTimeMinsSetting,
  monthlyGraceSettings,
  setMonthlyGraceSettings,
  deviceSettings,
  setDeviceSettings,
  fetchData,
  shiftTimings,
  handleEditShiftTimingClick,
  handleDeleteShiftTimingClick
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Top Panel Header */}
      <div className="glass-panel" style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderRadius: 'var(--radius-md)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Time Manager</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Define shift timing rules for designations, departments, or individual employees.</p>
        </div>
        <button
          onClick={() => setIsAddTimingModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, cursor: 'pointer', border: 'none' }}
        >
          <img src="/icons/clock.png" alt="timing" className="theme-icon" style={{ width: '16px', height: '16px' }} />
          <span>Add Timing Rule</span>
        </button>
      </div>

      {/* Shift Settings Panel */}
      <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Grace Period & Shift Settings</h4>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Target Scope */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Target Scope</label>
            <select
              value={graceTargetScopeType}
              onChange={e => {
                const mode = e.target.value;
                setGraceTargetScopeType(mode);
                const pad = (n: number) => n.toString().padStart(2, '0');
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                if (mode === 'global') {
                  setGraceTargetMonth('global');
                } else if (mode === 'month') {
                  setGraceTargetMonth(`${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`);
                } else if (mode === 'date') {
                  setGraceTargetMonth(todayStr);
                } else if (mode === 'date_range') {
                  setGraceStartDate(todayStr);
                  setGraceEndDate(todayStr);
                  setGraceTargetMonth(`${todayStr}:${todayStr}`);
                }
              }}
              style={{ ...styles.input, width: '220px', height: '38px', padding: '6px 10px' }}
            >
              <option value="global">All Months (Global Default)</option>
              <option value="month">Specific Month (YYYY-MM)</option>
              <option value="date">Single Specific Date</option>
              <option value="date_range">Specific Date Range (Start to End)</option>
            </select>
          </div>

          {graceTargetScopeType === 'month' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Month</label>
              <select
                value={graceTargetMonth}
                onChange={e => setGraceTargetMonth(e.target.value)}
                style={{ ...styles.input, width: '160px', height: '38px', padding: '6px 10px' }}
              >
                {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, idx) => {
                  const monthKey = `${calendarYear}-${m}`;
                  const mName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx];
                  return <option key={monthKey} value={monthKey}>{mName} {calendarYear}</option>;
                })}
              </select>
            </div>
          )}

          {graceTargetScopeType === 'date' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Date (YYYY-MM-DD)</label>
              <input
                type="date"
                value={graceTargetMonth.length === 10 ? graceTargetMonth : `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-01`}
                onChange={e => setGraceTargetMonth(e.target.value)}
                style={{ ...styles.input, width: '160px', height: '38px', padding: '6px 10px' }}
              />
            </div>
          )}

          {graceTargetScopeType === 'date_range' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Start Date</label>
                <input
                  type="date"
                  value={graceStartDate}
                  onChange={e => {
                    const s = e.target.value;
                    setGraceStartDate(s);
                    setGraceTargetMonth(`${s}:${graceEndDate || s}`);
                  }}
                  style={{ ...styles.input, width: '150px', height: '38px', padding: '6px 10px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>End Date</label>
                <input
                  type="date"
                  value={graceEndDate}
                  onChange={e => {
                    const end = e.target.value;
                    setGraceEndDate(end);
                    setGraceTargetMonth(`${graceStartDate || end}:${end}`);
                  }}
                  style={{ ...styles.input, width: '150px', height: '38px', padding: '6px 10px' }}
                />
              </div>
            </>
          )}

          {/* Default Shift Start Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Default Shift Start</label>
            <input 
              type="time" 
              value={defaultShiftStart} 
              onChange={e => setDefaultShiftStart(e.target.value)} 
              style={{ ...styles.input, width: '120px', height: '38px', padding: '6px 10px' }} 
            />
          </div>

          {/* Default Shift End Time */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Default Shift End</label>
            <input 
              type="time" 
              value={defaultShiftEnd} 
              onChange={e => setDefaultShiftEnd(e.target.value)} 
              style={{ ...styles.input, width: '120px', height: '38px', padding: '6px 10px' }} 
            />
          </div>

          {/* Default Shift Target Hours */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Default Daily Hours</label>
            <input 
              type="number" 
              step="0.5" 
              min="1" 
              max="24" 
              value={defaultShiftHours} 
              onChange={e => setDefaultShiftHours(parseFloat(e.target.value) || 9)} 
              style={{ ...styles.input, width: '85px', height: '38px', padding: '6px 10px', textAlign: 'center' }} 
            />
          </div>

          {/* Grace Time Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Grace Period (Minutes)</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input 
                type="number" 
                value={graceTargetMonth === 'global' ? graceTimeMinsSetting : (monthlyGraceSettings[graceTargetMonth] ?? graceTimeMinsSetting)} 
                onChange={e => {
                  const val = Math.max(0, parseInt(e.target.value) || 0);
                  if (graceTargetMonth === 'global') {
                    setGraceTimeMinsSetting(val);
                  } else {
                    setMonthlyGraceSettings(prev => ({ ...prev, [graceTargetMonth]: val }));
                  }
                }} 
                style={{ ...styles.input, width: '80px', height: '38px', padding: '6px 10px', textAlign: 'center' }} 
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mins</span>
            </div>
          </div>

          {/* Save Grace & Shift Settings Button */}
          <button
            type="button"
            onClick={async () => {
              const targetVal = graceTargetMonth === 'global' 
                ? graceTimeMinsSetting 
                : (monthlyGraceSettings[graceTargetMonth] ?? graceTimeMinsSetting);

              const newMonthly = { ...monthlyGraceSettings, [graceTargetMonth]: targetVal };
              setGraceTimeMinsSetting(targetVal);
              setMonthlyGraceSettings(newMonthly);
              localStorage.setItem('office_grace_time_mins', targetVal.toString());

              window.showLoading('Saving Grace & Shift Settings...');
              try {
                await updateDeviceSettings({
                  ...deviceSettings,
                  grace_time_mins: targetVal,
                  monthly_grace_settings: newMonthly,
                  default_shift_start_time: defaultShiftStart,
                  default_shift_end_time: defaultShiftEnd,
                  default_shift_total_hours: defaultShiftHours
                });
                const freshSettings = await getDeviceSettings();
                setDeviceSettings(freshSettings);
                setDefaultShiftStart(freshSettings.default_shift_start_time || '11:00');
                setDefaultShiftEnd(freshSettings.default_shift_end_time || '20:00');
                setDefaultShiftHours(freshSettings.default_shift_total_hours || 9);
                window.customAlert('Global Shift & Grace Settings updated & synced successfully!');
                fetchData();
              } catch (e) {
                window.customAlert('Updated locally!');
              } finally {
                window.hideLoading();
              }
            }}
            className="btn btn-primary"
            style={{ padding: '8px 16px', height: '38px', fontSize: '0.85rem' }}
          >
            Save Shift & Grace Settings
          </button>

          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: '1.4' }}>
            Shift starts are flexible after 6:00 AM. Any checkout after 9 completed hours is paid overtime. Grace cutoff applies at 11:00 AM + grace period. Late check-ins recover debt at a 2:1 ratio.
          </p>
        </div>
      </div>

      {/* Timing Rules Table */}
      <div className="glass-panel" style={{...styles.panel, width: '100%', borderRadius: 'var(--radius-md)'}}>
        <div style={styles.tableContainer} className="table-slider-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Rule Target</th>
                <th>Target Type</th>
                <th>Shift Timing</th>
                <th>Active Days</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shiftTimings.length > 0 ? (
                shiftTimings.map(t => (
                  <tr key={t.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <strong>{String(t.target_name || '').replace(/\s*\[FIXED_HOURS:\d+(?:\.\d+)?\]/gi, '')}</strong>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        background: t.target_type === 'employee' ? 'rgba(59, 130, 246, 0.1)' : t.target_type === 'department' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: t.target_type === 'employee' ? '#3b82f6' : t.target_type === 'department' ? '#10b981' : '#f59e0b'
                      }}>
                        {t.target_type}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {t.is_fixed_hours ? (
                        <span style={{ fontWeight: 700, color: 'var(--primary)', background: 'var(--bg-surface-hover)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
                          Fix Hours ({t.total_hours || 9} Hours Shift)
                        </span>
                      ) : (
                        <>
                          <strong>{formatTo12h(t.start_time)}</strong> to <strong>{formatTo12h(t.end_time)}</strong>
                        </>
                      )}
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {t.days.map((day, idx) => (
                          <span key={idx} style={{ background: 'var(--bg-surface-hover)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {day.substring(0, 3)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{...styles.tableCell, ...styles.actionCell}}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleEditShiftTimingClick(t)} 
                          style={styles.iconBtn} 
                          className="btn btn-secondary" 
                          title="Edit Timing Rule"
                        >
                          <img 
                            src="/icons/edit.png" 
                            alt="Edit" 
                            className="theme-icon" 
                            style={{ width: '14px', height: '14px' }} 
                          />
                        </button>
                        <button 
                          onClick={() => handleDeleteShiftTimingClick(t.id!)} 
                          style={styles.iconBtn} 
                          className="btn btn-secondary" 
                          title="Delete Timing Rule"
                        >
                          <img 
                            src="/icons/trash.png" 
                            alt="Delete" 
                            className="theme-icon" 
                            style={{ width: '14px', height: '14px' }} 
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No shift timing rules defined yet. Click "Add Timing Rule" to set one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TimingsTab;
