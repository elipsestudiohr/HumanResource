import React from 'react';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import CollapsibleCard from '../../../components/CollapsibleCard';
import styles from '../AdminStyles';

interface EmployeesTabProps {
  deptFilter: string;
  setDeptFilter: (dept: string) => void;
  sortedDepartmentsList: string[];
  desigFilter: string;
  setDesigFilter: (desig: string) => void;
  designationsList: string[];
  employeeSearchQuery: string;
  setEmployeeSearchQuery: (q: string) => void;
  employeeSortKey: string;
  setEmployeeSortKey: (k: any) => void;
  customDeptOrder: string[];
  setCustomDeptOrder: (order: string[]) => void;
  adminEmpMonth: number;
  setAdminEmpMonth: (m: number) => void;
  adminEmpYear: number;
  setAdminEmpYear: (y: number) => void;
  exportSalariesPDF: () => void;
  setIsAddEmployeeModalOpen: (open: boolean) => void;
  showAdminPasswords: Record<string, boolean>;
  setShowAdminPasswords: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showAdminSalariesMap: Record<string, boolean>;
  setShowAdminSalariesMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  groupedProfilesByDept: { department: string; profiles: EmployeeProfile[] }[];
  draggedDept: string | null;
  dragOverDept: string | null;
  setDragOverDept: (dept: string | null) => void;
  handleDeptDragStart: (e: React.DragEvent, deptName: string) => void;
  handleDeptDragOver: (e: React.DragEvent, deptName: string) => void;
  handleDeptDrop: (e: React.DragEvent, targetDeptName: string) => void;
  getEmployeeNetSalary: (p: EmployeeProfile) => number;
  setViewingProfileDetails: (p: any) => void;
  setSelectedCalendarProfile: (p: EmployeeProfile | null) => void;
  setAdminViewYear: (y: number) => void;
  setAdminViewMonth: (m: number) => void;
  setSelectedAdminEmpCalendarDayData: (data: any) => void;
  setWarningTargetEmployee: (p: EmployeeProfile | null) => void;
  setWarningText: (t: string) => void;
  setWarningExpiry: (e: string) => void;
  setWarningColor: (c: string) => void;
  handleEditProfileClick: (p: EmployeeProfile) => void;
  handleDeleteProfileClick: (id: string) => void;
  handleOpenWhatsApp: (p: EmployeeProfile) => void;
  purposeSearchQuery: string;
  setPurposeSearchQuery: (q: string) => void;
  purposeTransfersList: any[];
  handleEditTransferClick: (mockP: any) => void;
  setEmployeeModalTab: (tab: any) => void;
  handleDeleteTransfer: (id: number) => void;
  employeeLoansList?: any[];
}

export const EmployeesTab: React.FC<EmployeesTabProps> = ({
  deptFilter,
  setDeptFilter,
  sortedDepartmentsList,
  desigFilter,
  setDesigFilter,
  designationsList,
  employeeSearchQuery,
  setEmployeeSearchQuery,
  employeeSortKey,
  setEmployeeSortKey,
  customDeptOrder,
  setCustomDeptOrder,
  adminEmpMonth,
  setAdminEmpMonth,
  adminEmpYear,
  setAdminEmpYear,
  exportSalariesPDF,
  setIsAddEmployeeModalOpen,
  showAdminPasswords,
  setShowAdminPasswords,
  showAdminSalariesMap,
  setShowAdminSalariesMap,
  groupedProfilesByDept,
  draggedDept,
  dragOverDept,
  setDragOverDept,
  handleDeptDragStart,
  handleDeptDragOver,
  handleDeptDrop,
  getEmployeeNetSalary,
  setViewingProfileDetails,
  setSelectedCalendarProfile,
  setAdminViewYear,
  setAdminViewMonth,
  setSelectedAdminEmpCalendarDayData,
  setWarningTargetEmployee,
  setWarningText,
  setWarningExpiry,
  setWarningColor,
  handleEditProfileClick,
  handleDeleteProfileClick,
  handleOpenWhatsApp,
  purposeSearchQuery,
  setPurposeSearchQuery,
  purposeTransfersList,
  handleEditTransferClick,
  setEmployeeModalTab,
  handleDeleteTransfer,
  employeeLoansList = []
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Top Filter and Add Row */}
      <div className="glass-panel" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'center' }} className="filters-scroll-container">
          <h3 style={{ margin: 0, marginRight: '16px', fontSize: '1.25rem' }}>Employees</h3>
          
          {/* Department Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dept:</span>
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="custom-select"
              style={{ width: '170px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
            >
              <option value="">All Departments</option>
              {sortedDepartmentsList.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Designation Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Designation:</span>
            <select
              value={desigFilter}
              onChange={e => setDesigFilter(e.target.value)}
              className="custom-select"
              style={{ width: '170px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
            >
              <option value="">All Designations</option>
              {designationsList.map((d, idx) => (
                <option key={idx} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Employee Search Bar */}
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
                placeholder="Search PIN, name..."
                value={employeeSearchQuery}
                onChange={e => setEmployeeSearchQuery(e.target.value)}
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
            </div>
          </div>

          {/* Sort Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sort:</span>
            <select
              value={employeeSortKey}
              onChange={e => setEmployeeSortKey(e.target.value as any)}
              className="custom-select"
              style={{ width: '135px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
            >
              <option value="pin_asc">PIN (Ascending)</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
            </select>
          </div>

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

          {/* Month/Year Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Period:</span>
            <select
              value={adminEmpMonth}
              onChange={e => setAdminEmpMonth(parseInt(e.target.value))}
              className="custom-select"
              style={{ width: '110px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
            >
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <select
              value={adminEmpYear}
              onChange={e => setAdminEmpYear(parseInt(e.target.value))}
              className="custom-select"
              style={{ width: '90px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
            >
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={exportSalariesPDF}
            className="btn btn-secondary mobile-icon-only"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
            title="Export Salaries PDF"
          >
            <img src="/icons/exportsal.png" alt="PDF" className="theme-icon" style={{ width: '16px', height: '16px' }} />
            <span>Export Salaries</span>
          </button>
          <button
            onClick={() => setIsAddEmployeeModalOpen(true)}
            className="btn btn-primary mobile-icon-only"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, cursor: 'pointer', border: 'none' }}
            title="Add Employee"
          >
            <img src="/icons/user.png" alt="Add" className="theme-icon" style={{ width: '14px', height: '14px' }} />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Employee list container (full-width) */}
      <div className="glass-panel" style={{...styles.panel, width: '100%', borderRadius: 'var(--radius-md)'}}>
        <div style={styles.tableContainer} className="table-slider-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th>PIN</th>
                <th>Name</th>
                <th style={{ minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Credentials</span>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newShow = !showAdminPasswords['all'];
                        setShowAdminPasswords(prev => ({ ...prev, all: newShow }));
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                      title={showAdminPasswords['all'] ? "Hide all passwords" : "Show all passwords"}
                    >
                      <img 
                        src={showAdminPasswords['all'] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                        alt="toggle" 
                        className="theme-icon" 
                        style={{ width: '10px', height: '10px' }} 
                      />
                    </button>
                  </div>
                </th>
                <th>Dept / Designation</th>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Salary / Rate</span>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAdminSalariesMap(prev => ({ ...prev, all: !prev.all }));
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                      title={showAdminSalariesMap['all'] ? "Hide all salaries" : "Show all salaries"}
                    >
                      <img 
                        src={showAdminSalariesMap['all'] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                        alt="toggle" 
                        className="theme-icon" 
                        style={{ width: '10px', height: '10px' }} 
                      />
                    </button>
                  </div>
                </th>
                <th>Net Salary</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groupedProfilesByDept.length > 0 ? (
                groupedProfilesByDept.flatMap((group: { department: string; profiles: EmployeeProfile[] }) => {
                  const isDeptDragging = draggedDept === group.department;
                  const isDeptDragOver = dragOverDept === group.department;

                  const deptBaseSum = group.profiles.reduce((acc, p) => acc + (p.base_salary || 0), 0);
                  const deptNetSum = group.profiles.reduce((acc, p) => acc + getEmployeeNetSalary(p), 0);

                  const deptHeader = (
                    <tr 
                      key={`dept-header-${group.department}`} 
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
                            {group.profiles.length} {group.profiles.length === 1 ? 'Employee' : 'Employees'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', background: 'rgba(59, 130, 246, 0.06)', verticalAlign: 'middle' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          Base: <strong style={{ color: 'var(--success)', fontWeight: 700 }}>{showAdminSalariesMap['all'] ? `Rs. ${deptBaseSum.toLocaleString()}` : '••••••••'}</strong>
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', background: 'rgba(59, 130, 246, 0.06)', verticalAlign: 'middle' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          Net: <strong style={{ color: '#10b981', fontWeight: 800 }}>{showAdminSalariesMap['all'] ? `Rs. ${deptNetSum.toLocaleString()}` : '••••••••'}</strong>
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', background: 'rgba(59, 130, 246, 0.04)' }}></td>
                    </tr>
                  );

                  const rows = group.profiles.map((p: EmployeeProfile) => {
                    const isCash = p.payment_method === 'Cash' || p.bank_name === 'Cash';
                    const hasMissingBank = !isCash && (!p.bank_name || !p.bank_account_title || !p.bank_account_no || !p.bank_name.trim() || !p.bank_account_title.trim() || !p.bank_account_no.trim());
                    const hasMissingCritical = 
                      !p.pin || !p.pin.trim() ||
                      !p.full_name || !p.full_name.trim() ||
                      !p.email || !p.email.trim() ||
                      !p.password || !p.password.trim() ||
                      !p.joining_date ||
                      !p.date_of_birth ||
                      !(p as any).nic_no || !(p as any).nic_no.trim() ||
                      !p.base_salary ||
                      !p.hourly_rate ||
                      !(p as any).emergency_contacts || (p as any).emergency_contacts.length === 0;
                    
                    const isRed = hasMissingBank || hasMissingCritical;
                    
                    const rowColor = isRed 
                      ? 'rgba(239, 68, 68, 0.08)' 
                      : (isCash ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)');
                      
                    const borderLeftColor = isRed 
                      ? '#ef4444' 
                      : (isCash ? '#10b981' : '#f59e0b');

                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => setViewingProfileDetails(p)}
                        style={{ 
                          ...styles.tableRow, 
                          cursor: 'pointer',
                          backgroundColor: rowColor,
                          borderLeft: `4px solid ${borderLeftColor}`,
                          transition: 'background-color 0.2s'
                        }}
                        className="dropdown-item-hover"
                      >
                      <td style={styles.tableCell}><strong>{p.pin}</strong></td>
                      <td style={styles.tableCell}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.full_name}</span>
                          {p.role === 'admin' && (
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 700, 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: 'rgba(239, 68, 68, 0.2)', 
                              color: '#ef4444', 
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              letterSpacing: '0.5px' 
                            }}>
                              ADMIN
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ fontSize: '0.85rem' }}>{p.email || 'N/A'}</div>
                        {p.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: 500 }}>{p.phone}</div>}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Pass: {showAdminPasswords['all'] || showAdminPasswords[p.id] ? (p.password || 'N/A') : '••••••••'}</span>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAdminPasswords(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0 4px', fontSize: '0.65rem', height: '18px', display: 'inline-flex', alignItems: 'center' }}
                          >
                            <img 
                              src={showAdminPasswords[p.id] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                              alt="toggle" 
                              className="theme-icon" 
                              style={{ width: '10px', height: '10px' }} 
                            />
                          </button>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{ fontWeight: 600 }}>{p.department || 'General'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{p.designation || 'Staff'}</div>
                      </td>
                      <td style={styles.tableCell}>
                        {(() => {
                          const currentMonthKey = `${adminEmpYear}-${String(adminEmpMonth + 1).padStart(2, '0')}`;
                          let activeLoanDed = 0;
                          if (employeeLoansList && employeeLoansList.length > 0) {
                            const activeLoans = employeeLoansList.filter((l: any) =>
                              l.status === 'Approved' && l.remaining_balance > 0 &&
                              (l.employee_id === p.id || l.employee_pin === p.pin)
                            );
                            activeLoans.forEach((l: any) => {
                              let isDeducting = true;
                              if (l.skipped_months && l.skipped_months.includes(currentMonthKey)) isDeducting = false;
                              if (l.selected_months && l.selected_months.length > 0 && !l.selected_months.includes(currentMonthKey)) isDeducting = false;
                              if (isDeducting) {
                                activeLoanDed += (l.monthly_deduction || 0);
                              }
                            });
                          }
                          const effectiveBase = Math.max(0, p.base_salary - activeLoanDed);

                          return (
                            <>
                              {activeLoanDed > 0 ? (
                                <>
                                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                                    {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${p.base_salary.toLocaleString()}` : '••••••••'}
                                  </div>
                                  <div 
                                    style={{ 
                                      fontWeight: 700, 
                                      color: '#f59e0b', 
                                      fontSize: '0.8rem', 
                                      marginTop: '3px',
                                      background: 'rgba(245, 158, 11, 0.12)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      display: 'inline-block',
                                      border: '1px solid rgba(245, 158, 11, 0.3)'
                                    }} 
                                    title={`Contract: Rs. ${p.base_salary.toLocaleString()} - Loan: Rs. ${activeLoanDed.toLocaleString()}`}
                                  >
                                    {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${effectiveBase.toLocaleString()} (Loan Base)` : '••••••••'}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '2px', fontWeight: 600 }}>
                                    {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${(effectiveBase / (30 * 9)).toFixed(2)}/hr` : '••••••••'}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                                    {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${p.base_salary.toLocaleString()}` : '••••••••'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${p.hourly_rate.toFixed(2)}/hr` : '••••••••'}
                                  </div>
                                </>
                              )}
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAdminSalariesMap(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0 4px', fontSize: '0.65rem', height: '18px', display: 'inline-flex', alignItems: 'center', marginTop: '4px' }}
                              >
                                <img 
                                  src={showAdminSalariesMap[p.id] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                                  alt="toggle" 
                                  className="theme-icon" 
                                  style={{ width: '10px', height: '10px' }} 
                                />
                              </button>
                            </>
                          );
                        })()}
                      </td>
                      <td style={styles.tableCell}>
                        {(() => {
                          const netSalary = getEmployeeNetSalary(p);
                          return (
                            <div style={{ fontSize: '0.85rem' }}>
                              <div style={{ fontWeight: 800, color: 'var(--primary)' }}>
                                {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${netSalary.toLocaleString()}` : '••••••••'}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    <td style={{...styles.tableCell, ...styles.actionCell}}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCalendarProfile(p);
                          setAdminViewYear(new Date().getFullYear());
                          setAdminViewMonth(new Date().getMonth());
                          setSelectedAdminEmpCalendarDayData(null);
                        }} 
                        className="btn btn-secondary mobile-icon-only-btn" 
                        style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }} 
                        title="View Action (Attendance & Calendar)"
                      >
                        <img 
                          src="/icons/calendar.png" 
                          alt="Calendar" 
                          className="theme-icon" 
                          style={{ width: '14px', height: '14px' }} 
                        />
                        <span>View Action</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setWarningTargetEmployee(p);
                          setWarningText(p.warning_text || '');
                          setWarningExpiry(p.warning_expiry || '');
                          setWarningColor(p.warning_color || '#ff3b57');
                        }} 
                        style={{
                          ...styles.iconBtn,
                          backgroundColor: p.warning_active ? 'rgba(239, 68, 68, 0.15)' : 'none'
                        }} 
                        title={p.warning_active ? "Warning Active (Click to edit)" : "Issue Warning"}
                      >
                        <img 
                          src="/icons/alert.png" 
                          alt="Warning" 
                          className="theme-icon" 
                          style={{ width: '16px', height: '16px' }} 
                        />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProfileClick(p);
                        }} 
                        style={styles.iconBtn} 
                        title="Edit"
                      >
                        <img 
                          src="/icons/edit.png" 
                          alt="Edit" 
                          className="theme-icon" 
                          style={{ width: '16px', height: '16px' }} 
                        />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProfileClick(p.id);
                        }} 
                        style={styles.iconBtn} 
                        title="Delete"
                      >
                        <img 
                          src="/icons/trash.png" 
                          alt="Delete" 
                          className="theme-icon" 
                          style={{ width: '16px', height: '16px' }} 
                        />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenWhatsApp(p);
                        }} 
                        style={styles.iconBtn}
                        title={`Chat with ${p.full_name} on WhatsApp`}
                      >
                        <img 
                          src="/icons/whatsapp.png" 
                          alt="WhatsApp" 
                          className="theme-icon"
                          style={{ width: '16px', height: '16px' }} 
                        />
                      </button>
                    </td>
                  </tr>
                );
              });
              return [deptHeader, ...rows];
            })
          ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No profiles match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purpose Card */}
      {(() => {
        const q = purposeSearchQuery.toLowerCase().trim();
        const filteredList = !q ? purposeTransfersList : purposeTransfersList.filter(t => {
          const payee = (t.payee_name || '').toLowerCase();
          const purpose = (t.purpose || '').toLowerCase();
          const bankName = (t.bank_name || '').toLowerCase();
          const bankTitle = (t.bank_account_title || '').toLowerCase();
          const bankNo = (t.bank_account_no || '').toLowerCase();
          const method = (t.payment_method || '').toLowerCase();
          const amount = (t.amount || '').toString();
          const dateStr = t.created_at ? new Date(t.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).toLowerCase() : '';
          return payee.includes(q) || purpose.includes(q) || bankName.includes(q) || bankTitle.includes(q) || bankNo.includes(q) || method.includes(q) || amount.includes(q) || dateStr.includes(q);
        });

        const totalPurposeAmountSum = filteredList.reduce((sum, t) => sum + (t.amount || 0), 0);

        return (
          <CollapsibleCard 
            title="Recorded Purpose" 
            style={{ width: '100%' }}
            actionButton={
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Header Total Amount Sum Badge */}
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  border: '1px solid rgba(16, 185, 129, 0.3)', 
                  padding: '4px 12px', 
                  borderRadius: '12px', 
                  fontSize: '0.82rem',
                  color: 'var(--text-secondary)'
                }}>
                  <span>Total Amount:</span>
                  <strong style={{ color: '#10b981', fontWeight: 800 }}>
                    {showAdminSalariesMap['all'] ? `Rs. ${totalPurposeAmountSum.toLocaleString()}` : '••••••••'}
                  </strong>
                </div>

                <button 
                  type="button"
                  onClick={() => setShowAdminSalariesMap(prev => ({ ...prev, all: !prev.all }))}
                  className="btn btn-secondary mobile-icon-only"
                  style={{ padding: '4px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px' }}
                  title={showAdminSalariesMap['all'] ? "Hide Amount details" : "Show Amount details"}
                >
                  <img 
                    src={showAdminSalariesMap['all'] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                    alt="toggle" 
                    className="theme-icon" 
                    style={{ width: '12px', height: '12px' }} 
                  />
                  <span>{showAdminSalariesMap['all'] ? "Hide" : "Reveal"}</span>
                </button>

                <div style={{ position: 'relative', width: '320px', maxWidth: '100%', display: 'flex', alignItems: 'center' }}>
                  <img 
                    src="/icons/search.png" 
                    alt="search" 
                    className="theme-icon" 
                    style={{ position: 'absolute', left: '10px', width: '12px', height: '12px', opacity: 0.6, pointerEvents: 'none' }} 
                  />
                  <input
                    type="text"
                    placeholder="Search recipient, bank title, purpose, method..."
                    value={purposeSearchQuery}
                    onChange={e => setPurposeSearchQuery(e.target.value)}
                    style={{
                      ...styles.input,
                      width: '100%',
                      paddingLeft: '28px',
                      paddingRight: purposeSearchQuery ? '30px' : '12px',
                      fontSize: '0.82rem',
                      height: '32px'
                    }}
                  />
                  {purposeSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPurposeSearchQuery('')}
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
            }
          >
            {purposeSearchQuery && (
              <div style={{ padding: '0 0 12px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Found <strong>{filteredList.length}</strong> matching transfer(s)
              </div>
            )}

            <div style={styles.tableContainer} className="table-slider-container">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payee / Recipient</th>
                    <th>Purpose</th>
                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Amount</th>
                    <th style={{ paddingLeft: '24px' }}>Payment Method</th>
                    <th>Bank Details</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                  <tbody>
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {purposeSearchQuery ? `No purpose transfers found matching "${purposeSearchQuery}".` : 'No purpose transfers recorded yet.'}
                        </td>
                      </tr>
                    ) : (
                      filteredList.map(t => {
                        const isCash = t.payment_method === 'Cash';
                        return (
                          <tr 
                            key={t.id} 
                            onClick={() => setViewingProfileDetails({
                              id: `transfer-${t.id}`,
                              pin: `TR-${t.id}`,
                              full_name: t.payee_name,
                              designation: t.purpose,
                              department: 'Finance / Transfers',
                              base_salary: t.amount,
                              hourly_rate: 0,
                              joining_date: t.created_at ? new Date(t.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString(),
                              role: 'employee' as const,
                              payment_method: t.payment_method as any,
                              bank_name: t.bank_name,
                              bank_account_title: t.bank_account_title,
                              bank_account_no: t.bank_account_no,
                              emergency_contacts: [],
                              timeline_periods: []
                            })}
                            style={{ ...styles.tableRow, cursor: 'pointer' }}
                            className="dropdown-item-hover"
                          >
                            <td style={styles.tableCell}>
                              {t.created_at ? new Date(t.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                            </td>
                            <td style={{ ...styles.tableCell, fontWeight: '700' }}>{t.payee_name}</td>
                            <td style={styles.tableCell}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                background: t.purpose === 'Charity' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: t.purpose === 'Charity' ? '#3b82f6' : '#f59e0b',
                                fontSize: '0.8rem',
                                fontWeight: 600
                              }}>
                                {t.purpose}
                              </span>
                            </td>
                            <td style={{ ...styles.tableCell, textAlign: 'right', paddingRight: '24px', fontWeight: '700', color: 'var(--success)' }}>
                              {showAdminSalariesMap['all'] ? `Rs. ${t.amount.toLocaleString()}` : 'PKR ••••••'}
                            </td>
                            <td style={{ ...styles.tableCell, paddingLeft: '24px' }}>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                background: isCash ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: isCash ? '#f59e0b' : '#10b981'
                              }}>
                                {t.payment_method || 'Bank Transfer'}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              {isCash ? (
                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.82rem' }}>Cash Payment</span>
                              ) : (
                                <div style={{ fontSize: '0.82rem', lineHeight: '1.3' }}>
                                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{t.bank_name || 'Bank'}</div>
                                  <div style={{ color: 'var(--text-secondary)' }}>{t.bank_account_title || '-'}</div>
                                  <div style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{t.bank_account_no || '-'}</div>
                                </div>
                              )}
                            </td>
                            <td style={{ ...styles.tableCell, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary action-icon-btn"
                                  onClick={() => {
                                    const mockP: any = {
                                      id: `transfer-${t.id}`,
                                      pin: `TR-${t.id}`,
                                      full_name: t.payee_name,
                                      designation: t.purpose,
                                      department: 'Finance / Transfers',
                                      base_salary: t.amount,
                                      hourly_rate: 0,
                                      joining_date: t.created_at ? new Date(t.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
                                      role: 'employee',
                                      payment_method: t.payment_method,
                                      bank_name: t.bank_name,
                                      bank_account_title: t.bank_account_title,
                                      bank_account_no: t.bank_account_no,
                                      emergency_contacts: [],
                                      timeline_periods: []
                                    };
                                    handleEditTransferClick(mockP);
                                    setEmployeeModalTab('direct_transfer');
                                    setIsAddEmployeeModalOpen(true);
                                  }}
                                  title="Edit Transfer"
                                >
                                  <img
                                    src="/icons/edit.png"
                                    alt="Edit"
                                    className="theme-icon"
                                    style={{ width: '16px', height: '16px' }}
                                  />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary action-icon-btn action-delete-btn"
                                  onClick={() => {
                                    if (t.id) handleDeleteTransfer(t.id);
                                  }}
                                  title="Delete Transfer"
                                >
                                  <img
                                    src="/icons/trash.png"
                                    alt="Delete"
                                    className="theme-icon"
                                    style={{ width: '16px', height: '16px' }}
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleCard>
          );
        })()}
      </div>
    );
};

export default EmployeesTab;
