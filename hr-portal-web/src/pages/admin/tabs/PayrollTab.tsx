import React from 'react';
import type { EmployeeProfile, ShiftTiming } from '../../../utils/attendanceProcessor';
import { getEmployeeShiftTiming, formatClockDuration, roundSalary } from '../../../utils/attendanceProcessor';
import styles from '../AdminStyles';

interface PayrollTabProps {
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  payrollSearchQuery: string;
  setPayrollSearchQuery: (q: string) => void;
  showAdminSalariesMap: Record<string, boolean>;
  setShowAdminSalariesMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  customDeptOrder: string[];
  setCustomDeptOrder: (order: string[]) => void;
  setIsSalaryExportModalOpen: (open: boolean) => void;
  payrollSummary: any[];
  draggedDept: string | null;
  dragOverDept: string | null;
  setDragOverDept: (dept: string | null) => void;
  handleDeptDragStart: (e: React.DragEvent, deptName: string) => void;
  handleDeptDragOver: (e: React.DragEvent, deptName: string) => void;
  handleDeptDrop: (e: React.DragEvent, targetDeptName: string) => void;
  profiles: EmployeeProfile[];
  shiftTimings: ShiftTiming[];
  formatSalary: (amount: number) => string;
}

export const PayrollTab: React.FC<PayrollTabProps> = ({
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  payrollSearchQuery,
  setPayrollSearchQuery,
  showAdminSalariesMap,
  setShowAdminSalariesMap,
  customDeptOrder,
  setCustomDeptOrder,
  setIsSalaryExportModalOpen,
  payrollSummary,
  draggedDept,
  dragOverDept,
  setDragOverDept,
  handleDeptDragStart,
  handleDeptDragOver,
  handleDeptDrop,
  profiles,
  shiftTimings,
  formatSalary
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Top Filter and Actions Row */}
      <div className="glass-panel" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'center' }} className="filters-scroll-container">
          <h3 style={{ margin: 0, marginRight: '16px', fontSize: '1.25rem', whiteSpace: 'nowrap' }}>Payroll & Overtime</h3>

          {/* From Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>From:</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...styles.input, height: '38px' }} />
          </div>

          {/* To Date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>To:</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...styles.input, height: '38px' }} />
          </div>

          {/* Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Search:</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <img 
                src="/icons/search.png" 
                alt="search" 
                className="theme-icon" 
                style={{ position: 'absolute', left: '10px', width: '12px', height: '12px', opacity: 0.5 }} 
              />
              <input
                type="text"
                placeholder="Search PIN, name, dept..."
                value={payrollSearchQuery}
                onChange={e => setPayrollSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 30px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  width: '200px',
                  outline: 'none',
                  height: '38px'
                }}
              />
              {payrollSearchQuery && (
                <button
                  type="button"
                  onClick={() => setPayrollSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 700
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Reveal/Hide Button */}
          <button 
            type="button"
            onClick={() => setShowAdminSalariesMap(prev => ({ ...prev, all: !prev.all }))}
            className="btn btn-secondary mobile-icon-only"
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', height: '38px' }}
            title={showAdminSalariesMap['all'] ? "Hide Salary details" : "Show Salary details"}
          >
            <img 
              src={showAdminSalariesMap['all'] ? "/icons/eye-off.png" : "/icons/eye.png"} 
              alt="toggle" 
              className="theme-icon" 
              style={{ width: '12px', height: '12px' }} 
            />
            <span>{showAdminSalariesMap['all'] ? "Hide" : "Reveal"}</span>
          </button>

          {/* Reset Custom Department Order */}
          {customDeptOrder.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCustomDeptOrder([]);
                try {
                  localStorage.removeItem('custom_department_order');
                } catch (e) { /* ignore */ }
                if (window.customAlert) {
                  window.customAlert('Department order reset to default layout.');
                }
              }}
              className="btn btn-secondary mobile-icon-only"
              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', height: '38px' }}
              title="Reset custom department section order to default alphabetical layout"
            >
              <span>Reset Dept Order</span>
            </button>
          )}
        </div>

        {/* Export Salary Button on Right */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setIsSalaryExportModalOpen(true)} 
            className="btn btn-primary mobile-icon-only" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', height: '38px' }}
          >
            <img 
              src="/icons/download.png" 
              alt="Export" 
              className="theme-icon" 
              style={{ width: '14px', height: '14px' }} 
            /> 
            <span>Export Salary</span>
          </button>
        </div>
      </div>

      <div style={styles.tableContainer} className="table-slider-container">
        <table style={styles.table}>
          <thead>
            <tr>
              <th>PIN</th>
              <th>Name</th>
              <th>Hourly / Min Rate</th>
              <th>Overtime Earnings</th>
              <th>Late Penalties</th>
              <th>Absence Deductions</th>
              <th>Loan Deduction</th>
              <th>Base Salary</th>
              <th>Net Payable</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const q = payrollSearchQuery.toLowerCase().trim();
              const filteredList = !q ? payrollSummary : payrollSummary.filter(row => {
                const pin = (row.pin || '').toLowerCase();
                const name = (row.name || '').toLowerCase();
                const dept = (row.department || '').toLowerCase();
                const net = (row.totalPayable || 0).toString();
                const otHours = (row.totalOvertimeHours || 0).toString();
                const compHours = (row.totalCompensatedOvertimeHours || 0).toString();
                const otPayout = (row.totalOvertimePayout || 0).toString();
                return pin.includes(q) || name.includes(q) || dept.includes(q) || net.includes(q) || otHours.includes(q) || compHours.includes(q) || otPayout.includes(q);
              });

              if (filteredList.length === 0) {
                return (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {payrollSearchQuery ? `No payroll entries found matching "${payrollSearchQuery}".` : 'No payroll records calculated for selected period.'}
                    </td>
                  </tr>
                );
              }

              // Group filteredList by department (with General / Unassigned at the end)
              const map: Record<string, typeof payrollSummary> = {};
              filteredList.forEach(row => {
                const dept = (row.department && row.department.trim()) ? row.department.trim() : 'General / Unassigned';
                if (!map[dept]) map[dept] = [];
                map[dept].push(row);
              });

              const grouped = Object.keys(map)
                .sort((a, b) => {
                  const isAUnassigned = a.toLowerCase().includes('unassigned') || a.toLowerCase().includes('general');
                  const isBUnassigned = b.toLowerCase().includes('unassigned') || b.toLowerCase().includes('general');
                  if (isAUnassigned && !isBUnassigned) return 1;
                  if (!isAUnassigned && isBUnassigned) return -1;

                  const idxA = customDeptOrder.indexOf(a);
                  const idxB = customDeptOrder.indexOf(b);

                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                  if (idxA !== -1) return -1;
                  if (idxB !== -1) return 1;

                  return a.localeCompare(b);
                })
                .map(dept => ({
                  department: dept,
                  rows: map[dept]
                }));

              return grouped.flatMap(group => {
                const isDeptDragging = draggedDept === group.department;
                const isDeptDragOver = dragOverDept === group.department;

                const deptPayrollBaseSum = group.rows.reduce((acc, r) => acc + roundSalary(r.baseSalary || 0), 0);
                const deptPayrollNetSum = group.rows.reduce((acc, r) => acc + roundSalary(r.totalPayable || 0), 0);

                const deptHeader = (
                  <tr 
                    key={`payroll-dept-header-${group.department}`} 
                    draggable={true}
                    onDragStart={(e) => handleDeptDragStart(e, group.department)}
                    onDragOver={(e) => handleDeptDragOver(e, group.department)}
                    onDragLeave={() => setDragOverDept(null)}
                    onDrop={(e) => handleDeptDrop(e, group.department)}
                    style={{ 
                      background: isDeptDragOver ? 'rgba(59, 130, 246, 0.25)' : 'var(--bg-surface-hover)', 
                      borderTop: isDeptDragOver ? '3px solid #3b82f6' : '2px solid var(--border-color)',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'grab',
                      opacity: isDeptDragging ? 0.4 : 1,
                      transition: 'all 0.15s ease'
                    }}
                    title="Click and drag anywhere on this header to relocate department"
                  >
                    <td colSpan={3} style={{ padding: '10px 16px', background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04))' }}></td>
                    <td style={{ padding: '10px 16px', background: 'rgba(59, 130, 246, 0.06)', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                          {group.department}
                        </span>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          background: 'rgba(59, 130, 246, 0.2)', 
                          color: '#3b82f6', 
                          border: '1px solid rgba(59, 130, 246, 0.4)',
                          padding: '3px 10px', 
                          borderRadius: '12px', 
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          {group.rows.length} {group.rows.length === 1 ? 'Employee' : 'Employees'}
                        </span>
                      </div>
                    </td>
                    <td colSpan={2} style={{ padding: '10px 16px', background: 'rgba(59, 130, 246, 0.04)' }}></td>
                    <td style={{ padding: '10px 16px', background: 'rgba(59, 130, 246, 0.06)', verticalAlign: 'middle' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        Base: <strong style={{ color: 'var(--success)', fontWeight: 700 }}>{showAdminSalariesMap['all'] ? `Rs. ${deptPayrollBaseSum.toLocaleString()}` : '••••••••'}</strong>
                      </span>
                    </td>
                    <td colSpan={2} style={{ padding: '10px 16px', background: 'rgba(59, 130, 246, 0.06)', verticalAlign: 'middle' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        Net: <strong style={{ color: '#10b981', fontWeight: 800 }}>{showAdminSalariesMap['all'] ? `Rs. ${deptPayrollNetSum.toLocaleString()}` : '••••••••'}</strong>
                      </span>
                    </td>
                  </tr>
                );

                const rows = group.rows.map(row => {
                  const isVisible = showAdminSalariesMap['all'] || showAdminSalariesMap[row.id];
                  const toggleRowVisibility = () => {
                    setShowAdminSalariesMap(prev => ({ ...prev, [row.id]: !prev[row.id] }));
                  };
                  const rowEmp = profiles.find(p => p.id === row.id || String(p.pin) === String(row.pin));

                  return (
                    <tr key={row.id} style={styles.tableRow}>
                      <td style={styles.tableCell}><strong>{row.pin}</strong></td>
                      <td style={styles.tableCell}>
                        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {row.name}
                        </div>
                        {rowEmp && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {rowEmp.designation || 'Staff'}
                          </div>
                        )}
                      </td>
                      <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                        <div>{isVisible ? `${formatSalary(row.hourlyRate)}/hr` : 'PKR ••••••/hr'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {isVisible ? `Rs. ${row.perMinRate.toFixed(2)}/min` : 'Rs. ••••/min'}
                        </div>
                      </td>
                      <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                        {(() => {
                          const rowTiming = rowEmp ? getEmployeeShiftTiming(rowEmp, shiftTimings) : null;
                          const isRowComp = rowTiming ? (rowTiming.isFixedHours && !rowTiming.allowRegularOvertime) : false;

                          if (row.totalOvertimePayout > 0) {
                            return (
                              <div>
                                <strong style={{ color: isRowComp ? '#3b82f6' : 'var(--text-primary)' }}>
                                  {isVisible ? formatSalary(row.totalOvertimePayout) : 'PKR ••••••'}
                                </strong>
                                <div style={{ fontSize: '0.75rem', color: isRowComp ? '#3b82f6' : 'var(--text-secondary)' }}>
                                  {isRowComp 
                                    ? `+${formatClockDuration(row.totalCompensatedOvertimeHours || 0)} Comp Time`
                                    : `+${formatClockDuration(row.totalOvertimeHours || 0)} OT`}
                                </div>
                              </div>
                            );
                          }
                          return '-';
                        })()}
                      </td>
                      <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                        {row.totalLateDeduction > 0 ? (
                          <div>
                            <strong style={{color: 'var(--danger)'}}>
                              -{isVisible ? formatSalary(row.totalLateDeduction) : 'PKR ••••••'}
                            </strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.totalLateMinutes} mins ({row.lateArrivals} days)</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                        {row.totalAbsenceDeduction > 0 ? (
                          <div>
                            <strong style={{color: 'var(--danger)'}}>
                              -{isVisible ? formatSalary(row.totalAbsenceDeduction) : 'PKR ••••••'}
                            </strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.absences} day(s)</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                        {(row.loanDeduction || 0) > 0 ? (
                          <div>
                            <strong style={{color: '#f59e0b'}}>
                              -{isVisible ? formatSalary(row.loanDeduction || 0) : 'PKR ••••••'}
                            </strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Loan EMI</div>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                        {isVisible ? formatSalary(row.baseSalary) : 'PKR ••••••'}
                      </td>
                      <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                        <strong style={{color: 'var(--text-primary)', fontSize: '1rem'}}>
                          {isVisible ? formatSalary(row.totalPayable) : 'PKR ••••••'}
                        </strong>
                      </td>
                    </tr>
                  );
                });

                return [deptHeader, ...rows];
              });
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayrollTab;
