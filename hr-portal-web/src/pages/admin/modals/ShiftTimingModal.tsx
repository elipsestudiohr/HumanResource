import React from 'react';
import type { ShiftTiming } from '../../../lib/dbHelper';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import styles from '../AdminStyles';

interface ShiftTimingModalProps {
  isAddTimingModalOpen: boolean;
  setIsAddTimingModalOpen: (open: boolean) => void;
  editingTimingRule: ShiftTiming | null;
  setEditingTimingRule: (rule: ShiftTiming | null) => void;
  handleSaveShiftTiming: (e: React.FormEvent) => void;
  timingTargetType: 'designation' | 'department' | 'employee';
  setTimingTargetType: (t: 'designation' | 'department' | 'employee') => void;
  timingTargetId: string;
  setTimingTargetId: (id: string) => void;
  designationsList: string[];
  sortedDepartmentsList: string[];
  profiles: EmployeeProfile[];
  timingIsFixedHours: boolean;
  setTimingIsFixedHours: (fixed: boolean) => void;
  timingTotalHours: number;
  setTimingTotalHours: (h: number) => void;
  timingStartTime: string;
  setTimingStartTime: (t: string) => void;
  timingEndTime: string;
  setTimingEndTime: (t: string) => void;
  timingAllowRegularOvertime: boolean;
  setTimingAllowRegularOvertime: (allow: boolean) => void;
  timingGraceMins: number;
  setTimingGraceMins: (m: number) => void;
  timingDays: string[];
  setTimingDays: React.Dispatch<React.SetStateAction<string[]>>;
  saturdayOption: 'alternate' | 'all_off' | 'all_working';
  setSaturdayOption: (opt: 'alternate' | 'all_off' | 'all_working') => void;
}

export const ShiftTimingModal: React.FC<ShiftTimingModalProps> = ({
  isAddTimingModalOpen,
  setIsAddTimingModalOpen,
  editingTimingRule,
  setEditingTimingRule,
  handleSaveShiftTiming,
  timingTargetType,
  setTimingTargetType,
  timingTargetId,
  setTimingTargetId,
  designationsList,
  sortedDepartmentsList,
  profiles,
  timingIsFixedHours,
  setTimingIsFixedHours,
  timingTotalHours,
  setTimingTotalHours,
  timingStartTime,
  setTimingStartTime,
  timingEndTime,
  setTimingEndTime,
  timingAllowRegularOvertime,
  setTimingAllowRegularOvertime,
  timingGraceMins,
  setTimingGraceMins,
  timingDays,
  setTimingDays,
  saturdayOption,
  setSaturdayOption
}) => {
  if (!isAddTimingModalOpen) return null;

  return (
    <div className="custom-overlay" onClick={() => { setIsAddTimingModalOpen(false); setEditingTimingRule(null); }}>
      <div className="custom-dialog-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%', maxHeight: '88vh', overflowY: 'auto', textAlign: 'left', alignItems: 'stretch', padding: '24px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          {editingTimingRule ? 'Edit Shift Timing Rule' : 'Add Shift Timing Rule'}
        </h3>

        <form onSubmit={handleSaveShiftTiming} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
          <div style={styles.formGroup}>
            <label>Rule Target Type</label>
            <select
              value={timingTargetType}
              onChange={e => {
                setTimingTargetType(e.target.value as any);
                setTimingTargetId('');
              }}
              style={{ cursor: 'pointer' }}
            >
              <option value="designation">By Designation</option>
              <option value="department">By Department</option>
              <option value="employee">By Specific Employee</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label>Select Target Option</label>
            <select
              value={timingTargetId}
              onChange={e => setTimingTargetId(e.target.value)}
              style={{ cursor: 'pointer' }}
              required
            >
              <option value="">-- Choose Option --</option>
              {timingTargetType === 'designation' && designationsList.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
              {timingTargetType === 'department' && sortedDepartmentsList.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
              {timingTargetType === 'employee' && profiles.filter(p => p.role !== 'admin').map((p, idx) => (
                <option key={idx} value={p.id}>{p.full_name} (PIN: {p.pin})</option>
              ))}
            </select>
          </div>

          {/* High-Visibility Custom Toggle Switch for Fix Hours */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '12px 16px', 
              background: timingIsFixedHours ? 'var(--bg-surface-hover)' : 'var(--bg-primary)', 
              borderRadius: 'var(--radius-md)', 
              border: `2px solid ${timingIsFixedHours ? 'var(--primary)' : 'var(--border-color)'}`, 
              transition: 'all 0.2s ease', 
              cursor: 'pointer',
              userSelect: 'none'
            }} 
            onClick={() => setTimingIsFixedHours(!timingIsFixedHours)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Fix Hours Shift</span>
                {timingIsFixedHours && <span style={{ fontSize: '0.75rem', background: 'var(--primary)', color: 'var(--btn-primary-text)', padding: '2px 8px', borderRadius: '10px' }}>Active</span>}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Daily target hours (e.g. 9h). Extra hours compensate short days.
              </span>
            </div>

            {/* Custom Toggle Pill Switch */}
            <div style={{
              width: '48px',
              height: '26px',
              background: timingIsFixedHours ? 'var(--primary)' : '#4b5563',
              borderRadius: '13px',
              position: 'relative',
              transition: 'background 0.2s ease',
              flexShrink: 0,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                background: '#ffffff',
                borderRadius: '50%',
                position: 'absolute',
                top: '3px',
                left: timingIsFixedHours ? '25px' : '3px',
                transition: 'left 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
              }} />
            </div>
          </div>

          {timingIsFixedHours && (
            <>
              <div style={styles.formGroup}>
                <label>Total Daily Shift Hours (Target Required *)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  value={timingTotalHours}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 9;
                    setTimingTotalHours(val);
                    if (timingIsFixedHours) {
                      const [sh, sm] = (timingStartTime || '09:00').split(':').map(Number);
                      if (!isNaN(sh)) {
                        const endH = (sh + Math.round(val)) % 24;
                        setTimingEndTime(`${String(endH).padStart(2, '0')}:${String(sm || 0).padStart(2, '0')}`);
                      }
                    }
                  }}
                  placeholder="e.g. 9 (Default: 9 hours)"
                  style={{ ...styles.input, borderColor: 'var(--primary)', fontWeight: 700 }}
                  required
                />
              </div>

              {/* Allow Regular Overtime vs Compensation Mode Switch Button */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 16px', 
                  background: timingAllowRegularOvertime ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                  borderRadius: 'var(--radius-md)', 
                  border: `2px solid ${timingAllowRegularOvertime ? '#10b981' : '#3b82f6'}`, 
                  transition: 'all 0.2s ease', 
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginTop: '4px'
                }} 
                onClick={() => setTimingAllowRegularOvertime(!timingAllowRegularOvertime)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '12px' }}>
                  <div>
                    {timingAllowRegularOvertime ? (
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, background: '#10b981', color: '#ffffff', padding: '3px 10px', borderRadius: '12px', display: 'inline-block' }}>
                        Default Functionality (Regular Overtime 1.0x Rate)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, background: '#3b82f6', color: '#ffffff', padding: '3px 10px', borderRadius: '12px', display: 'inline-block' }}>
                        Compensation Mode (1.0x Rate)
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {timingAllowRegularOvertime 
                      ? 'Default Functionality: Late arrival tracking, grace period, shortage deduction & 1.0x regular overtime for extra hours.' 
                      : 'Compensation Mode: Extra hours offset short-time days in month. Net extra time is paid at 1.0x base rate.'}
                  </span>
                </div>

                <div style={{
                  width: '46px',
                  height: '24px',
                  background: timingAllowRegularOvertime ? '#10b981' : '#3b82f6',
                  borderRadius: '12px',
                  position: 'relative',
                  transition: 'background 0.2s ease',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '18px',
                    height: '18px',
                    background: '#ffffff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '3px',
                    left: timingAllowRegularOvertime ? '23px' : '3px',
                    transition: 'left 0.2s ease'
                  }} />
                </div>
              </div>
            </>
          )}

          <div style={styles.dateRow}>
            <div style={{...styles.formGroup, flex: 1}}>
              <label style={{ color: 'var(--text-primary)' }}>
                Shift Start Time
              </label>
              <input
                type="time"
                value={timingStartTime}
                onChange={e => {
                  const val = e.target.value;
                  setTimingStartTime(val);
                  if (timingIsFixedHours) {
                    const [sh, sm] = (val || '09:00').split(':').map(Number);
                    if (!isNaN(sh)) {
                      const endH = (sh + Math.round(timingTotalHours || 9)) % 24;
                      setTimingEndTime(`${String(endH).padStart(2, '0')}:${String(sm || 0).padStart(2, '0')}`);
                    }
                  }
                }}
                required
              />
            </div>
            <div style={{...styles.formGroup, flex: 1}}>
              <label style={{ color: 'var(--text-primary)' }}>
                Shift End Time {timingIsFixedHours && timingAllowRegularOvertime ? '(Auto-calculated)' : '(Custom Window End *)'}
              </label>
              <input
                type="time"
                value={timingEndTime}
                onChange={e => {
                  if (!timingIsFixedHours || !timingAllowRegularOvertime) {
                    setTimingEndTime(e.target.value);
                  }
                }}
                disabled={timingIsFixedHours && timingAllowRegularOvertime}
                style={{ 
                  ...styles.input, 
                  opacity: timingIsFixedHours && timingAllowRegularOvertime ? 0.7 : 1, 
                  cursor: timingIsFixedHours && timingAllowRegularOvertime ? 'not-allowed' : 'text' 
                }}
                required
              />
            </div>
          </div>

          {(() => {
            const isGraceDisabled = timingIsFixedHours && !timingAllowRegularOvertime;
            return (
              <div style={{ ...styles.formGroup, opacity: isGraceDisabled ? 0.5 : 1, pointerEvents: isGraceDisabled ? 'none' : 'auto' }}>
                <label style={{ color: isGraceDisabled ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                  Rule Grace Period (Minutes) {isGraceDisabled && '(Disabled in Compensation Mode)'}
                </label>
                <input
                  type="number"
                  value={timingGraceMins}
                  onChange={e => setTimingGraceMins(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="e.g. 20 (minutes allowed after start time)"
                  style={styles.input}
                  disabled={isGraceDisabled}
                />
              </div>
            );
          })()}

          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ margin: 0 }}>Active Days</label>
              <button
                type="button"
                onClick={() => {
                  const allWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  if (timingDays.length === 7) {
                    setTimingDays([]);
                  } else {
                    setTimingDays(allWeek);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                {timingDays.length === 7 ? 'Deselect All' : 'Select All Days'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={timingDays.includes(day) || (day === 'Saturday' && saturdayOption === 'alternate')}
                    style={{ width: 'auto' }}
                    onChange={e => {
                      if (day === 'Saturday') {
                        if (e.target.checked) {
                          setSaturdayOption('alternate');
                          if (!timingDays.includes('Saturday')) setTimingDays(prev => [...prev, 'Saturday']);
                        } else {
                          setSaturdayOption('all_off');
                          setTimingDays(prev => prev.filter(d => d !== 'Saturday'));
                        }
                      } else {
                        if (e.target.checked) {
                          setTimingDays(prev => [...prev, day]);
                        } else {
                          setTimingDays(prev => prev.filter(d => d !== day));
                        }
                      }
                    }}
                  />
                  {day.substring(0, 3)}
                </label>
              ))}
            </div>

            {/* Saturday Shift Policy Option */}
            <div style={{ marginTop: '12px', background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                Saturday Shift Policy
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  <input 
                    type="checkbox" 
                    checked={saturdayOption === 'alternate'} 
                    onChange={() => {
                      setSaturdayOption('alternate');
                      if (!timingDays.includes('Saturday')) setTimingDays(prev => [...prev, 'Saturday']);
                    }} 
                  />
                  <span><strong>Alternate Saturdays Off</strong> (1st, 3rd, 5th Off | 2nd, 4th Working)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  <input 
                    type="checkbox" 
                    checked={saturdayOption === 'all_off'} 
                    onChange={() => {
                      setSaturdayOption('all_off');
                      setTimingDays(prev => prev.filter(d => d !== 'Saturday'));
                    }} 
                  />
                  <span><strong>All Saturdays Off</strong> (Every Saturday Off)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  <input 
                    type="checkbox" 
                    checked={saturdayOption === 'all_working'} 
                    onChange={() => {
                      setSaturdayOption('all_working');
                      if (!timingDays.includes('Saturday')) setTimingDays(prev => [...prev, 'Saturday']);
                    }} 
                  />
                  <span><strong>All Saturdays Working</strong> (Regular Working Day)</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{...styles.btnGroup, marginTop: '12px'}}>
            <button type="submit" className="btn btn-primary" style={{flex: 1, background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600}}>
              {editingTimingRule ? 'Update Rule' : 'Save Timing'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setIsAddTimingModalOpen(false);
                setEditingTimingRule(null);
                setTimingTargetId('');
                setTimingStartTime('09:00');
                setTimingEndTime('18:00');
                setTimingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
              }}
              className="btn btn-secondary"
              style={{flex: 1, border: '1px solid var(--border-color)', background: 'var(--bg-surface-hover)'}}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftTimingModal;
