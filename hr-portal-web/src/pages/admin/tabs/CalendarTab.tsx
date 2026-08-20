import React from 'react';
import type { Holiday } from '../../../lib/dbHelper';
import type { EmployeeProfile, LeaveRequest } from '../../../utils/attendanceProcessor';
import { isOffSaturday } from '../../../utils/attendanceProcessor';
import styles from '../AdminStyles';

interface CalendarTabProps {
  calendarMonth: number;
  setCalendarMonth: (m: number) => void;
  calendarYear: number;
  setCalendarYear: (y: number) => void;
  holidaysList: Holiday[];
  profiles: EmployeeProfile[];
  leaveRequests: LeaveRequest[];
  handleCalendarDayClick: (dateStr: string) => void;
  handleDeleteHoliday: (id: number) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  calendarMonth,
  setCalendarMonth,
  calendarYear,
  setCalendarYear,
  holidaysList,
  profiles,
  leaveRequests,
  handleCalendarDayClick,
  handleDeleteHoliday
}) => {
  return (
    <div style={{ ...styles.dashboardContent, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0 }}>Office Calendar</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select value={calendarMonth} onChange={e => setCalendarMonth(Number(e.target.value))} style={styles.input}>
              {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select value={calendarYear} onChange={e => setCalendarYear(Number(e.target.value))} style={styles.input}>
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar Day Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} style={{ textAlign: 'center', padding: '8px', fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        {(() => {
          const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
          const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
          const firstDayAdj = firstDay === 0 ? 6 : firstDay - 1;
          const cells: React.ReactNode[] = [];

          for (let i = 0; i < firstDayAdj; i++) {
            cells.push(<div key={`empty-${i}`} className="calendar-empty-cell"></div>);
          }

          for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dateObj = new Date(calendarYear, calendarMonth, day);
            const isSun = dateObj.getDay() === 0;
            const offSat = isOffSaturday(dateObj);

            const holiday = holidaysList.find(h => h.date === dateStr);
            const birthdayEmployees = profiles.filter(p => {
              if (!p.date_of_birth) return false;
              const dob = new Date(p.date_of_birth + 'T00:00:00');
              return dob.getMonth() === calendarMonth && dob.getDate() === day;
            });
            const dayLeaves = leaveRequests.filter(lr => {
              if (lr.status !== 'Approved') return false;
              return dateStr >= lr.start_date && dateStr <= lr.end_date;
            });

            let bgColor = 'var(--bg-surface)';
            let borderColor = 'var(--border-color)';
            if (holiday) { 
              const hCol = holiday.color || '#3b82f6';
              bgColor = `${hCol}18`; 
              borderColor = `${hCol}80`; 
            }
            else if (dayLeaves.length > 0) { bgColor = 'rgba(16, 185, 129, 0.08)'; borderColor = 'rgba(16, 185, 129, 0.3)'; }
            else if (isSun) { bgColor = 'var(--bg-surface-hover)'; }
            else if (offSat) { bgColor = 'var(--bg-surface-hover)'; }

            cells.push(
              <div
                key={day}
                onClick={() => handleCalendarDayClick(dateStr)}
                style={{
                  padding: '8px', minHeight: '80px', background: bgColor,
                  border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer', transition: 'background 0.2s',
                  display: 'flex', flexDirection: 'column', gap: '4px'
                }}
                className="dropdown-item-hover calendar-day-cell"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.85rem', color: isSun ? 'var(--text-muted)' : 'var(--text-primary)' }}>{day}</span>
                  <div className="calendar-dots-row">
                    {holiday && <span className="calendar-dot" style={{ backgroundColor: holiday.color || '#3b82f6' }} title={holiday.title}></span>}
                    {birthdayEmployees.map(emp => (
                      <span key={emp.id} className="calendar-dot yellow" title={`Birthday: ${emp.full_name}`}></span>
                    ))}
                    {dayLeaves.map(lr => (
                      <span key={lr.id} className="calendar-dot green" title="Leave"></span>
                    ))}
                    {(isSun || offSat) && !holiday && <span className="calendar-dot gray"></span>}
                  </div>
                </div>

                <div className="calendar-details-container">
                  {holiday && (
                    <span style={{ fontSize: '0.65rem', color: holiday.color || '#3b82f6', fontWeight: '700', lineHeight: '1.2' }}>
                      {holiday.title}
                    </span>
                  )}
                  {birthdayEmployees.map(emp => (
                    <span key={emp.id} style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: '500', lineHeight: '1.2' }}>
                      Birthday: {emp.full_name}
                    </span>
                  ))}
                  {dayLeaves.map(lr => {
                    const emp = profiles.find(p => p.id === lr.employee_id);
                    const empName = emp ? emp.full_name : 'Employee';
                    return (
                      <span key={lr.id} style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: '500', lineHeight: '1.2' }}>
                        Leave ({lr.status === 'Pending' ? 'P' : 'A'}): {empName}
                      </span>
                    );
                  })}
                  {isSun && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Sunday</span>}
                  {offSat && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Off Saturday</span>}
                </div>
              </div>
            );
          }

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {cells}
            </div>
          );
        })()}
      </div>

      {/* Holidays List */}
      <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
        <h3 style={{ margin: 0, marginBottom: '16px' }}>Declared Holidays</h3>
        <div style={styles.tableContainer} className="table-slider-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Description</th>
                <th style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidaysList.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No holidays declared yet. Click on a date above to declare one.</td></tr>
              ) : (
                holidaysList.map(h => (
                  <tr key={h.id}>
                    <td>{new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td style={{ fontWeight: '600' }}>{h.title}</td>
                    <td>{h.description || '-'}</td>
                    <td>
                      <button onClick={() => handleDeleteHoliday(h.id!)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                        <img src="/icons/trash.png" alt="delete" className="theme-icon" style={{ width: '12px', height: '12px' }} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming Birthdays This Month */}
      <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
        <h3 style={{ margin: 0, marginBottom: '16px' }}>Birthdays This Month</h3>
        <div style={styles.tableContainer} className="table-slider-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Date of Birth</th>
                <th>Birthday</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const bdayEmployees = profiles.filter(p => {
                  if (!p.date_of_birth) return false;
                  const dob = new Date(p.date_of_birth + 'T00:00:00');
                  return dob.getMonth() === calendarMonth;
                }).sort((a, b) => {
                  const da = new Date(a.date_of_birth! + 'T00:00:00').getDate();
                  const db = new Date(b.date_of_birth! + 'T00:00:00').getDate();
                  return da - db;
                });
                if (bdayEmployees.length === 0) {
                  return <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No employee birthdays this month.</td></tr>;
                }
                return bdayEmployees.map(emp => {
                  const dob = new Date(emp.date_of_birth! + 'T00:00:00');
                  const bdayStr = dob.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                  return (
                    <tr key={emp.id}>
                      <td style={{ fontWeight: '600' }}>{emp.full_name}</td>
                      <td>{emp.department || '-'}</td>
                      <td>{emp.date_of_birth}</td>
                      <td>{bdayStr}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CalendarTab;
