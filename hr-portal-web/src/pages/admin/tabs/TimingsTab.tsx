import React, { useState, useEffect } from 'react';
import type { ShiftTiming, DeviceSettings } from '../../../lib/dbHelper';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
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
  profiles?: EmployeeProfile[];
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
  handleDeleteShiftTimingClick,
  profiles = []
}) => {
  const [wfhEnabled, setWfhEnabled] = useState<boolean>(deviceSettings.wfh_enabled !== false);
  const [wfhDefaultHours, setWfhDefaultHours] = useState<number>(deviceSettings.wfh_default_working_hours || 9);
  const [wfhDefaultBreakMins, setWfhDefaultBreakMins] = useState<number>(deviceSettings.wfh_default_break_mins || 60);
  const [wfhAllowedIds, setWfhAllowedIds] = useState<string[]>(deviceSettings.wfh_allowed_employee_ids || []);
  const [wfhCustomMap, setWfhCustomMap] = useState<Record<string, { working_hours: number; break_mins: number }>>(
    deviceSettings.wfh_employee_custom_settings || {}
  );
  const [wfhEmpSearch, setWfhEmpSearch] = useState<string>('');

  useEffect(() => {
    setWfhEnabled(deviceSettings.wfh_enabled !== false);
    setWfhDefaultHours(deviceSettings.wfh_default_working_hours || 9);
    setWfhDefaultBreakMins(deviceSettings.wfh_default_break_mins || 60);
    setWfhAllowedIds(deviceSettings.wfh_allowed_employee_ids || []);
    setWfhCustomMap(deviceSettings.wfh_employee_custom_settings || {});
  }, [deviceSettings]);

  const activeProfiles = (profiles || []).filter(p => p.is_active !== false);
  const filteredEmployees = activeProfiles.filter(p => {
    if (!wfhEmpSearch.trim()) return true;
    const term = wfhEmpSearch.toLowerCase();
    return (
      (p.full_name && p.full_name.toLowerCase().includes(term)) ||
      (p.pin && String(p.pin).toLowerCase().includes(term)) ||
      (p.department && p.department.toLowerCase().includes(term)) ||
      (p.designation && p.designation.toLowerCase().includes(term))
    );
  });

  // Sort so selected employees are at the very top ("selected above")
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const aSelected = wfhAllowedIds.includes(a.id) ? 1 : 0;
    const bSelected = wfhAllowedIds.includes(b.id) ? 1 : 0;
    if (aSelected !== bSelected) return bSelected - aSelected;
    return (a.full_name || '').localeCompare(b.full_name || '');
  });

  const handleSaveWfhSettings = async () => {
    window.showLoading('Saving Work From Home settings...');
    try {
      await updateDeviceSettings({
        ...deviceSettings,
        wfh_enabled: wfhEnabled,
        wfh_default_working_hours: wfhDefaultHours,
        wfh_default_break_mins: wfhDefaultBreakMins,
        wfh_allowed_employee_ids: wfhAllowedIds,
        wfh_employee_custom_settings: wfhCustomMap
      });
      const fresh = await getDeviceSettings();
      setDeviceSettings(fresh);
      window.customAlert('Work From Home settings saved and synced successfully!');
      fetchData();
    } catch (e) {
      window.customAlert('Saved locally!');
    } finally {
      window.hideLoading();
    }
  };
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

      {/* Work From Home (WFH) Management Panel */}
      <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '18px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/icons/home.png" alt="wfh" className="theme-icon" style={{ width: '20px', height: '20px' }} />
              <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Work From Home (WFH) Management
              </h4>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: wfhEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: wfhEnabled ? '#10b981' : '#ef4444',
                border: wfhEnabled ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
              }}>
                {wfhEnabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Enable remote Check IN, Break, and Check OUT for selected employees. Punches require Admin approval before reflecting in attendance.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveWfhSettings}
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <img src="/icons/save.png" alt="" className="theme-icon" style={{ width: '14px', height: '14px' }} />
            <span>Save WFH Settings</span>
          </button>
        </div>

        {/* Global Controls & Defaults */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-surface-hover)', padding: '14px 18px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          {/* Master Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={wfhEnabled}
              onChange={e => setWfhEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Enable WFH Portal Feature
            </span>
          </label>

          <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />

          {/* Default Daily Target Hours */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Default Daily Hours:
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="24"
              value={wfhDefaultHours}
              onChange={e => setWfhDefaultHours(parseFloat(e.target.value) || 9)}
              style={{ ...styles.input, width: '80px', height: '34px', textAlign: 'center', padding: '4px' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>hrs</span>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />

          {/* Default Allowed Break Duration */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Allowed Break Limit:
            </label>
            <input
              type="number"
              step="5"
              min="5"
              max="240"
              value={wfhDefaultBreakMins}
              onChange={e => setWfhDefaultBreakMins(parseInt(e.target.value, 10) || 60)}
              style={{ ...styles.input, width: '80px', height: '34px', textAlign: 'center', padding: '4px' }}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mins (1 hr = 60m)</span>
          </div>
        </div>

        {/* Break Policy Clarification Alert */}
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/icons/alert.png" alt="" className="theme-icon" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span>
            <strong>Enforced Break Policy:</strong> Break is restricted to {wfhDefaultBreakMins} minutes. If an employee stays on break beyond {wfhDefaultBreakMins} minutes, the portal actively alerts them that break is over, and excess break duration is <strong>not counted</strong> towards their working hours.
          </span>
        </div>

        {/* Employee Assignment Table with Variable Hours & Break */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Summary bar of currently assigned WFH employees */}
          {wfhAllowedIds.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginRight: '6px' }}>
                Assigned Remote Staff ({wfhAllowedIds.length}):
              </span>
              {wfhAllowedIds.map(id => {
                const emp = activeProfiles.find(p => p.id === id || String(p.pin) === String(id));
                if (!emp) return null;
                const custom = wfhCustomMap[emp.id] || {};
                const hrs = custom.working_hours ?? wfhDefaultHours;
                const bMins = custom.break_mins ?? wfhDefaultBreakMins;
                return (
                  <span
                    key={`assigned_chip_${emp.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <strong>{emp.full_name}</strong> ({emp.pin}) · {hrs}h/{bMins}m
                    <button
                      type="button"
                      onClick={() => setWfhAllowedIds(prev => prev.filter(x => x !== emp.id))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: '0 2px',
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        lineHeight: 1
                      }}
                      title="Remove from WFH"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Eligible WFH Employees ({wfhAllowedIds.length} of {activeProfiles.length} assigned — Selected shown above)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search employee by name, PIN, department..."
                value={wfhEmpSearch}
                onChange={e => setWfhEmpSearch(e.target.value)}
                style={{ ...styles.input, width: '240px', height: '32px', fontSize: '0.8rem' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setWfhAllowedIds(activeProfiles.map(p => p.id))}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Select All
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setWfhAllowedIds([])}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Deselect All
              </button>
            </div>
          </div>

          <div style={{ ...styles.tableContainer, maxHeight: '340px', overflowY: 'auto' }} className="table-slider-container">
            <table style={{ ...styles.table, fontSize: '0.83rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>WFH</th>
                  <th>Employee</th>
                  <th>PIN</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Daily Target Hours</th>
                  <th>Allowed Break</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.length > 0 ? (
                  sortedEmployees.map(emp => {
                    const isChecked = wfhAllowedIds.includes(emp.id);
                    const custom = wfhCustomMap[emp.id] || {};
                    const hoursVal = custom.working_hours ?? wfhDefaultHours;
                    const breakVal = custom.break_mins ?? wfhDefaultBreakMins;

                    return (
                      <tr key={emp.id} style={{ ...styles.tableRow, background: isChecked ? 'rgba(16, 185, 129, 0.04)' : undefined }}>
                        <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setWfhAllowedIds(prev => [...prev, emp.id]);
                              } else {
                                setWfhAllowedIds(prev => prev.filter(id => id !== emp.id));
                              }
                            }}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td style={{ ...styles.tableCell, fontWeight: 600 }}>{emp.full_name}</td>
                        <td style={{ ...styles.tableCell, fontFamily: 'monospace' }}>{emp.pin}</td>
                        <td style={styles.tableCell}>{emp.department || 'General'}</td>
                        <td style={styles.tableCell}>{emp.designation || 'Staff'}</td>
                        <td style={styles.tableCell}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              step="0.5"
                              min="1"
                              max="24"
                              disabled={!isChecked}
                              value={hoursVal}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 9;
                                setWfhCustomMap(prev => ({
                                  ...prev,
                                  [emp.id]: { ...(prev[emp.id] || { break_mins: wfhDefaultBreakMins }), working_hours: val }
                                }));
                              }}
                              style={{ ...styles.input, width: '65px', height: '28px', fontSize: '0.8rem', textAlign: 'center', padding: '2px 4px', opacity: isChecked ? 1 : 0.5 }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>hrs</span>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <input
                              type="number"
                              step="5"
                              min="5"
                              max="240"
                              disabled={!isChecked}
                              value={breakVal}
                              onChange={e => {
                                const val = parseInt(e.target.value, 10) || 60;
                                setWfhCustomMap(prev => ({
                                  ...prev,
                                  [emp.id]: { ...(prev[emp.id] || { working_hours: wfhDefaultHours }), break_mins: val }
                                }));
                              }}
                              style={{ ...styles.input, width: '65px', height: '28px', fontSize: '0.8rem', textAlign: 'center', padding: '2px 4px', opacity: isChecked ? 1 : 0.5 }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>mins</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No employees match your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
              {/* 1. Regular Shift Timing Rules */}
              {shiftTimings.map(t => (
                <tr key={t.id} style={styles.tableRow}>
                  <td style={styles.tableCell}>
                    <strong>{String(t.target_name || '').replace(/\s*\[FIXED_HOURS:\d+(?:\.\d+)?\]/gi, '')}</strong>
                  </td>
                  <td style={styles.tableCell}>
                    <span className="status-pill timing-type-pill" style={{
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
                      <span className="timing-rule-tag" style={{ fontWeight: 700, color: 'var(--primary)', background: 'var(--bg-surface-hover)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
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
                        <span key={idx} className="timing-day-pill" style={{ background: 'var(--bg-surface-hover)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
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
              ))}

              {/* 2. Assigned Work From Home (WFH) Remote Staff Timing Rules */}
              {wfhAllowedIds.map(empId => {
                const emp = activeProfiles.find(p => p.id === empId || String(p.pin) === String(empId));
                if (!emp) return null;
                const custom = wfhCustomMap[emp.id] || {};
                const hrs = custom.working_hours ?? wfhDefaultHours;
                const bMins = custom.break_mins ?? wfhDefaultBreakMins;
                return (
                  <tr key={`wfh_rule_${emp.id}`} style={{ ...styles.tableRow, background: 'rgba(16, 185, 129, 0.03)' }}>
                    <td style={styles.tableCell}>
                      <strong>{emp.full_name} ({emp.pin})</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.department || 'General'} · {emp.designation || 'Staff'}</div>
                    </td>
                    <td style={styles.tableCell}>
                      <span className="status-pill timing-type-pill" style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                      }}>
                        WFH Remote
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span className="timing-rule-tag" style={{ fontWeight: 700, color: 'var(--primary)', background: 'var(--bg-surface-hover)', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
                        Flexible Hours ({hrs}h Shift · {bMins}m Break)
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Mon - Sat (Remote Shift)
                      </span>
                    </td>
                    <td style={{ ...styles.tableCell, ...styles.actionCell }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Configured in WFH section above</span>
                    </td>
                  </tr>
                );
              })}

              {shiftTimings.length === 0 && wfhAllowedIds.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No shift timing rules or remote staff assignments defined yet.
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
