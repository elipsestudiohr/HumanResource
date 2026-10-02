import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import { matchPin } from '../../../utils/attendanceProcessor';
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
  handleOpenEmployeeMonthlyReport?: (p: EmployeeProfile) => void;
  leftProfiles?: EmployeeProfile[];
  employeeStatusFilter?: 'active' | 'left';
  setEmployeeStatusFilter?: (status: 'active' | 'left') => void;
  handleMarkEmployeeLeft?: (p: EmployeeProfile) => void;
  handleReactivateEmployee?: (p: EmployeeProfile) => void;
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
  employeeLoansList = [],
  handleOpenEmployeeMonthlyReport,
  leftProfiles = [],
  employeeStatusFilter = 'active',
  setEmployeeStatusFilter,
  handleMarkEmployeeLeft,
  handleReactivateEmployee
}) => {
  const leftProfilesList = leftProfiles || [];
  const filteredLeftProfiles = useMemo(() => {
    return leftProfilesList.filter(p => {
      const matchDept = deptFilter ? p.department === deptFilter : true;
      const matchDesig = desigFilter ? p.designation === desigFilter : true;
      let matchSearch = true;
      if (employeeSearchQuery.trim()) {
        const q = employeeSearchQuery.toLowerCase();
        matchSearch = 
          p.full_name.toLowerCase().includes(q) ||
          p.pin.toLowerCase().includes(q) ||
          (p.department ? p.department.toLowerCase().includes(q) : false) ||
          (p.designation ? p.designation.toLowerCase().includes(q) : false) ||
          (p.email ? p.email.toLowerCase().includes(q) : false);
      }
      return matchDept && matchDesig && matchSearch;
    }).sort((a, b) => {
      if (employeeSortKey === 'name_asc') return a.full_name.localeCompare(b.full_name);
      if (employeeSortKey === 'name_desc') return b.full_name.localeCompare(a.full_name);
      return a.pin.localeCompare(b.pin, undefined, { numeric: true });
    });
  }, [leftProfilesList, deptFilter, desigFilter, employeeSearchQuery, employeeSortKey]);

  const displayedGroups = useMemo(() => {
    if (employeeStatusFilter === 'left') {
      const map: Record<string, EmployeeProfile[]> = {};
      filteredLeftProfiles.forEach(p => {
        const dept = (p.department && p.department.trim()) ? p.department.trim() : 'General / Unassigned';
        if (!map[dept]) map[dept] = [];
        map[dept].push(p);
      });
      return Object.keys(map).sort().map(dept => ({
        department: dept,
        profiles: map[dept]
      }));
    }
    return groupedProfilesByDept;
  }, [employeeStatusFilter, filteredLeftProfiles, groupedProfilesByDept]);

  const activeCount = useMemo(() => {
    return groupedProfilesByDept.reduce((sum, g) => sum + g.profiles.length, 0);
  }, [groupedProfilesByDept]);

  const [activeActionEmployeeId, setActiveActionEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveActionEmployeeId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const empDropdownItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    fontSize: '0.82rem',
    fontWeight: 500,
    color: 'var(--text-primary)',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    transition: 'background-color 0.15s ease',
    lineHeight: 1.3
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Top Filter and Add Row */}
      <div className="glass-panel" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'center' }} className="filters-scroll-container">
          <h3 style={{ margin: 0, marginRight: '8px', fontSize: '1.25rem' }}>Employees</h3>

          {/* Status Filter Toggle: Active vs Left */}
          {setEmployeeStatusFilter && (
            <div style={{ display: 'inline-flex', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '2px', height: '38px', alignItems: 'center', marginRight: '8px' }}>
              <button
                type="button"
                onClick={() => setEmployeeStatusFilter('active')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: employeeStatusFilter === 'active' ? 'var(--primary)' : 'transparent',
                  color: employeeStatusFilter === 'active' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Active ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setEmployeeStatusFilter('left')}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: employeeStatusFilter === 'left' ? '#ef4444' : 'transparent',
                  color: employeeStatusFilter === 'left' ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Left ({leftProfilesList.length})
              </button>
            </div>
          )}
          
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
            title="Export Salaries PDF (with Base x Overtime x Bonus Mode)"
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
        <div style={{ ...styles.tableContainer, paddingBottom: '90px' }} className="table-slider-container">
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
              {displayedGroups.length > 0 ? (
                displayedGroups.flatMap((group: { department: string; profiles: EmployeeProfile[] }) => {
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

                  const rows = group.profiles.map((p: EmployeeProfile, pIdx: number) => {
                    const isNearBottom = pIdx >= group.profiles.length - 2 && group.profiles.length > 2;
                    const isCash = p.payment_method === 'Cash' || (!p.payment_method && p.bank_name === 'Cash');
                    const hasMissingBank = !isCash && (!p.bank_name || p.bank_name === 'Cash' || !p.bank_account_title || !p.bank_account_no || !p.bank_name.trim() || !p.bank_account_title.trim() || !p.bank_account_no.trim());
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
                          {(p.is_active === false || employeeStatusFilter === 'left') && (
                            <span style={{ 
                              fontSize: '0.65rem', 
                              fontWeight: 700, 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              background: 'rgba(239, 68, 68, 0.18)', 
                              color: '#ef4444', 
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              letterSpacing: '0.5px' 
                            }}>
                              LEFT
                            </span>
                          )}
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
                          let activeLoanCustomTax: number | null = null;
                          if (employeeLoansList && employeeLoansList.length > 0) {
                            for (const l of employeeLoansList) {
                              if (
                                l.status === 'Approved' &&
                                (l.remaining_balance === undefined || l.remaining_balance > 0) &&
                                (l.employee_id === p.id || matchPin(l.employee_pin, p.pin))
                              ) {
                                let isDeducting = true;
                                if (l.skipped_months && l.skipped_months.includes(currentMonthKey)) isDeducting = false;
                                if (l.selected_months && l.selected_months.length > 0 && !l.selected_months.includes(currentMonthKey)) isDeducting = false;
                                if (isDeducting) {
                                  activeLoanDed += (l.monthly_deduction || 0);
                                  if (l.loan_tax_mode === 'custom' && l.loan_tax_amount !== undefined && l.loan_tax_amount !== null) {
                                    const parsedTax = Number(l.loan_tax_amount);
                                    activeLoanCustomTax = isNaN(parsedTax) ? 0 : parsedTax;
                                  }
                                }
                              }
                            }
                          }
                          const effectiveBase = Math.max(0, p.base_salary - activeLoanDed);
                          const effectiveTax: number = activeLoanCustomTax !== null ? activeLoanCustomTax : (p.income_tax || 0);
                          const taxDisplay = activeLoanCustomTax !== null
                            ? ` - Custom Tax: Rs. ${activeLoanCustomTax.toLocaleString()}`
                            : ` - Tax: Rs. ${(p.income_tax || 0).toLocaleString()}`;

                          return (
                            <>
                              {activeLoanDed > 0 ? (
                                <>
                                  <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                                    {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${p.base_salary.toLocaleString()}` : '••••••••'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${p.hourly_rate.toFixed(2)}/hr` : '••••••••'}
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
                                    title={`Contract: Rs. ${p.base_salary.toLocaleString()} - Loan: Rs. ${activeLoanDed.toLocaleString()}${taxDisplay}`}
                                  >
                                    {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${effectiveBase.toLocaleString()} (Loan Base)` : '••••••••'}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '2px', fontWeight: 600 }}>
                                    {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `Rs. ${(Math.max(0, effectiveBase - effectiveTax) / (30 * 9)).toFixed(2)}/hr (Loan Rate)` : '••••••••'}
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
                    <td style={{ ...styles.tableCell, textAlign: 'center', position: 'relative', overflow: 'visible', width: '70px' }}>
                      {/* 3-Dots Action Menu Trigger Button */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionEmployeeId((prev: string | null) => prev === p.id ? null : p.id);
                        }} 
                        style={{
                          ...styles.iconBtn,
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: activeActionEmployeeId === p.id ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                          padding: 0
                        }} 
                        title="More Options (more-vertical)"
                      >
                        <img 
                          src="/icons/more-vertical.svg" 
                          alt="Actions" 
                          className="theme-icon" 
                          style={{ width: '16px', height: '16px', display: 'block', pointerEvents: 'none' }} 
                        />
                      </button>

                      {/* Floating Action Menu Popover */}
                      {activeActionEmployeeId === p.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            ...(isNearBottom ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.35), 0 8px 10px -6px rgba(0,0,0,0.25)',
                            zIndex: 1000,
                            minWidth: '220px',
                            padding: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            textAlign: 'left'
                          }}
                          className="animate-fade-in"
                        >
                          {/* 1. View Calendar & Attendance */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveActionEmployeeId(null);
                              setSelectedCalendarProfile(p);
                              setAdminViewYear(new Date().getFullYear());
                              setAdminViewMonth(new Date().getMonth());
                              setSelectedAdminEmpCalendarDayData(null);
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            style={empDropdownItemStyle}
                          >
                            <img src="/icons/calendar.png" alt="Calendar" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                            <span>Attendance & Calendar</span>
                          </button>

                          {/* 2. Export Monthly Report */}
                          {handleOpenEmployeeMonthlyReport && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveActionEmployeeId(null);
                                handleOpenEmployeeMonthlyReport(p);
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                              style={empDropdownItemStyle}
                            >
                              <img src="/icons/download.png" alt="Report" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                              <span>Monthly Report</span>
                            </button>
                          )}

                          {(p.is_active === false || employeeStatusFilter === 'left') ? (
                            <>
                              {/* Reactivate Employee */}
                              {handleReactivateEmployee && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionEmployeeId(null);
                                    handleReactivateEmployee(p);
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  style={{ ...empDropdownItemStyle, color: '#10b981' }}
                                >
                                  <img src="/icons/revert.png" alt="Reactivate" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                                  <span>Reactivate Employee</span>
                                </button>
                              )}

                              {/* Permanently Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionEmployeeId(null);
                                  handleDeleteProfileClick(p.id);
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={{ ...empDropdownItemStyle, color: '#ef4444' }}
                              >
                                <img src="/icons/trash.png" alt="Delete" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                                <span>Delete Permanently</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Warning Notice */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionEmployeeId(null);
                                  setWarningTargetEmployee(p);
                                  setWarningText(p.warning_text || '');
                                  setWarningExpiry(p.warning_expiry || '');
                                  setWarningColor(p.warning_color || '#ff3b57');
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = p.warning_active ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-surface-hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={{ ...empDropdownItemStyle, color: p.warning_active ? '#ef4444' : 'var(--text-primary)' }}
                              >
                                <img src="/icons/alert.png" alt="Warning" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                                <span>{p.warning_active ? "Warning Active (Edit)" : "Issue Warning"}</span>
                              </button>

                              {/* Edit Profile */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionEmployeeId(null);
                                  handleEditProfileClick(p);
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={empDropdownItemStyle}
                              >
                                <img src="/icons/edit.png" alt="Edit" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                                <span>Edit Profile</span>
                              </button>

                              {/* WhatsApp Chat */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionEmployeeId(null);
                                  handleOpenWhatsApp(p);
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(37, 211, 102, 0.1)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={{ ...empDropdownItemStyle, color: '#25D366' }}
                              >
                                <img src="/icons/whatsapp.png" alt="WhatsApp" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                                <span>Chat on WhatsApp</span>
                              </button>

                              {/* Mark as Left */}
                              {handleMarkEmployeeLeft && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionEmployeeId(null);
                                    handleMarkEmployeeLeft(p);
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  style={{ ...empDropdownItemStyle, color: '#ef4444' }}
                                >
                                  <img src="/icons/logout.png" alt="Mark Left" className="theme-icon" style={{ width: '15px', height: '15px', filter: 'invert(35%) sepia(85%) saturate(3000%) hue-rotate(345deg)' }} />
                                  <span>Mark as Left</span>
                                </button>
                              )}

                              {/* Delete Employee */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveActionEmployeeId(null);
                                  handleDeleteProfileClick(p.id);
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                style={{ ...empDropdownItemStyle, color: '#ef4444' }}
                              >
                                <img src="/icons/trash.png" alt="Delete" className="theme-icon" style={{ width: '15px', height: '15px' }} />
                                <span>Delete Employee</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              });
              return [deptHeader, ...rows];
            })
          ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {employeeStatusFilter === 'left' ? 'No left / inactive employee records found.' : 'No profiles match your filters.'}
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
          <div id="admin-recorded-payee-table" style={{ width: '100%', scrollMarginTop: '80px' }}>
            <CollapsibleCard 
              title="Recorded Purpose & Payee Transfers" 
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
          </div>
          );
        })()}

      {/* Floating Action Button: Fixed to Screen Viewport via createPortal */}
      {typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            right: '28px',
            zIndex: 99990,
            pointerEvents: 'auto'
          }}
        >
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('admin-recorded-payee-table');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="mac-floating-down-fab"
            data-mac-tooltip="Scroll Down to Recorded Purpose & Payee Transfers"
            aria-label="Scroll to Recorded Payee Table"
          >
            <img
              src="/icons/down-arrows.png"
              alt="Scroll down"
              className="fab-icon"
            />
          </button>
        </div>,
        document.body
      )}
    </div>
    );
};

export default EmployeesTab;
