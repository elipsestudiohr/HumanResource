import React, { useState } from 'react';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import styles, { getModalOverlayStyle } from '../AdminStyles';

interface ExportReportModalProps {
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  profiles: EmployeeProfile[];
  purposeTransfersList: any[];
  exportIncludePurposePayee: boolean;
  setExportIncludePurposePayee: (inc: boolean) => void;
  exportExcludedIds: string[];
  setExportExcludedIds: React.Dispatch<React.SetStateAction<string[]>>;
  exportTarget: 'all' | 'department' | 'employee';
  setExportTarget: (t: 'all' | 'department' | 'employee') => void;
  exportSelectedDept: string;
  setExportSelectedDept: (d: string) => void;
  sortedDepartmentsList: string[];
  exportSelectedEmployeeId: string;
  setExportSelectedEmployeeId: (id: string) => void;
  exportEmployeesPerPage: string;
  setExportEmployeesPerPage: (p: string) => void;
  exportPaymentFilter: 'all' | 'Bank' | 'Cash';
  setExportPaymentFilter: (f: 'all' | 'Bank' | 'Cash') => void;
  exportOtMode: 'with_ot' | 'without_ot' | 'base_x_ot';
  setExportOtMode: (mode: 'with_ot' | 'without_ot' | 'base_x_ot') => void;
  exportCols: Record<string, boolean>;
  setExportCols: React.Dispatch<React.SetStateAction<any>>;
  exportSearchQuery: string;
  setExportSearchQuery: (q: string) => void;
  exportUseLetterhead: boolean;
  setExportUseLetterhead: (lh: boolean) => void;
  customExportFormat: 'pdf' | 'excel' | 'word';
  setCustomExportFormat: (f: 'pdf' | 'excel' | 'word') => void;
  exportUseCustomDateRange: boolean;
  setExportUseCustomDateRange: (val: boolean) => void;
  exportStartDate: string;
  setExportStartDate: (d: string) => void;
  exportEndDate: string;
  setExportEndDate: (d: string) => void;
  startDate: string;
  endDate: string;
  getEmployeeNetSalary: (emp: EmployeeProfile, customStart?: string, customEnd?: string) => number;
  handleExportPrint: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isExportModalOpen,
  setIsExportModalOpen,
  profiles,
  purposeTransfersList,
  exportIncludePurposePayee,
  setExportIncludePurposePayee,
  exportExcludedIds,
  setExportExcludedIds,
  exportTarget,
  setExportTarget,
  exportSelectedDept,
  setExportSelectedDept,
  sortedDepartmentsList,
  exportSelectedEmployeeId,
  setExportSelectedEmployeeId,
  exportEmployeesPerPage,
  setExportEmployeesPerPage,
  exportPaymentFilter,
  setExportPaymentFilter,
  exportOtMode,
  setExportOtMode,
  exportCols,
  setExportCols,
  exportSearchQuery,
  setExportSearchQuery,
  exportUseLetterhead,
  setExportUseLetterhead,
  customExportFormat,
  setCustomExportFormat,
  exportUseCustomDateRange,
  setExportUseCustomDateRange,
  exportStartDate,
  setExportStartDate,
  exportEndDate,
  setExportEndDate,
  startDate,
  endDate,
  getEmployeeNetSalary,
  handleExportPrint
}) => {
  // Accordion state: by default ALL dropdown sections are CLOSED
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    target: false,
    dateRange: false,
    salaryMode: false,
    members: false,
    columns: false,
    format: false
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  if (!isExportModalOpen) return null;

  const allEmployeeCandidates = profiles.filter(p => p.role !== 'admin');
  const allPurposeCandidates: EmployeeProfile[] = purposeTransfersList.map(t => ({
    id: `transfer-${t.id}`,
    pin: `TR-${t.id}`,
    full_name: t.payee_name || 'Recorded Purpose Payee',
    designation: t.purpose || 'Recorded Purpose',
    department: 'Recorded Purpose',
    base_salary: Number(t.amount) || 0,
    hourly_rate: 0,
    joining_date: t.created_at ? new Date(t.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
    role: 'employee' as const,
    payment_method: (t.payment_method as any) || 'Bank',
    bank_name: t.bank_name || '-',
    bank_account_title: t.bank_account_title || t.payee_name || '-',
    bank_account_no: t.bank_account_no || '-',
    emergency_contacts: [],
    timeline_periods: [],
    income_tax: 0
  }));

  let fullCandidatePool = [
    ...allEmployeeCandidates,
    ...(exportIncludePurposePayee ? allPurposeCandidates : [])
  ];

  const exportFilteredCandidates = fullCandidatePool.filter(c => {
    // Excluded member check
    if (exportExcludedIds.includes(String(c.id))) return false;

    // Export Target scope check
    if (exportTarget === 'department' && exportSelectedDept) {
      if ((c.department || '').trim() !== exportSelectedDept.trim()) return false;
    }
    if (exportTarget === 'employee' && exportSelectedEmployeeId) {
      if (String(c.id) !== String(exportSelectedEmployeeId)) return false;
    }

    // Payment Method filter check
    if (exportPaymentFilter !== 'all') {
      const isCash = (c as any).payment_method === 'Cash' || c.bank_name === 'Cash' || !c.bank_name || !c.bank_account_no;
      const method = isCash ? 'Cash' : 'Bank';
      if (method !== exportPaymentFilter) return false;
    }

    return true;
  });

  const effStart = exportUseCustomDateRange && exportStartDate ? exportStartDate : startDate;
  const effEnd = exportUseCustomDateRange && exportEndDate ? exportEndDate : endDate;

  const calculatedExportBaseSum = exportFilteredCandidates.reduce((acc, p) => acc + (p.base_salary || 0), 0);
  const calculatedExportNetSum = exportFilteredCandidates.reduce((acc, p) => {
    const isTransfer = String(p.id).startsWith('transfer-');
    return acc + (isTransfer ? (p.base_salary || 0) : getEmployeeNetSalary(p, effStart, effEnd));
  }, 0);

  // Quick date presets
  const handleSetPresetDate = (type: 'month' | 'first_half' | 'second_half' | 'today') => {
    const baseDate = exportStartDate ? new Date(exportStartDate) : new Date();
    const yr = isNaN(baseDate.getFullYear()) ? new Date().getFullYear() : baseDate.getFullYear();
    const mo = isNaN(baseDate.getMonth()) ? new Date().getMonth() : baseDate.getMonth();
    const moStr = String(mo + 1).padStart(2, '0');
    const lastDay = new Date(yr, mo + 1, 0).getDate();

    if (type === 'month') {
      setExportStartDate(`${yr}-${moStr}-01`);
      setExportEndDate(`${yr}-${moStr}-${String(lastDay).padStart(2, '0')}`);
    } else if (type === 'first_half') {
      setExportStartDate(`${yr}-${moStr}-01`);
      setExportEndDate(`${yr}-${moStr}-15`);
    } else if (type === 'second_half') {
      setExportStartDate(`${yr}-${moStr}-16`);
      setExportEndDate(`${yr}-${moStr}-${String(lastDay).padStart(2, '0')}`);
    } else if (type === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      setExportStartDate(todayStr);
      setExportEndDate(todayStr);
    }
  };

  const selectedColCount = Object.values(exportCols).filter(Boolean).length;

  return (
    <div 
      className="custom-overlay" 
      onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
      onClick={e => {
        if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
          setIsExportModalOpen(false);
        }
      }} 
      style={getModalOverlayStyle(11000)}
    >
      <div 
        className="custom-dialog-card glass-panel" 
        onMouseDown={e => e.stopPropagation()} 
        onClick={e => e.stopPropagation()} 
        style={{ padding: '24px', width: '680px', maxWidth: '95vw', textAlign: 'left', alignItems: 'stretch', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Export Salaries & Overtime Advice
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Configure scope, custom tenure calculation, columns, and format
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => setIsExportModalOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem', padding: '4px 8px', borderRadius: '4px' }}
            title="Close"
          >
            ✕
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          
          {/* SECTION 1: Target & Scope Selection */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            <div 
              onClick={() => toggleSection('target')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                background: openSections.target ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                userSelect: 'none',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  1. Target Scope & Layout
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  {exportTarget === 'all' ? 'All Employees' : exportTarget === 'department' ? `Dept: ${exportSelectedDept || 'None'}` : '1 Employee'} · {exportEmployeesPerPage}/page
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {openSections.target ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {openSections.target && (
              <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.015)' }}>
                <div style={styles.formGroup}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Export Target Scope</label>
                  <select 
                    value={exportTarget} 
                    onChange={e => {
                      const val = e.target.value as any;
                      setExportTarget(val);
                      if (val === 'department' && sortedDepartmentsList.length > 0 && !exportSelectedDept) {
                        setExportSelectedDept(sortedDepartmentsList[0]);
                      }
                      if (val === 'employee' && profiles.filter(p => p.role !== 'admin').length > 0 && !exportSelectedEmployeeId) {
                        setExportSelectedEmployeeId(profiles.filter(p => p.role !== 'admin')[0].id);
                      }
                    }}
                    className="custom-select"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="all">All Employees & Purpose Users</option>
                    <option value="department">By Department</option>
                    <option value="employee">Specific Employee</option>
                  </select>
                </div>

                {exportTarget === 'department' && (
                  <div style={styles.formGroup}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Select Department *</label>
                    <select 
                      value={exportSelectedDept} 
                      onChange={e => setExportSelectedDept(e.target.value)}
                      className="custom-select"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">-- Choose Department --</option>
                      {sortedDepartmentsList.map((d, idx) => (
                        <option key={idx} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                {exportTarget === 'employee' && (
                  <div style={styles.formGroup}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Select Specific Employee *</label>
                    <select 
                      value={exportSelectedEmployeeId} 
                      onChange={e => setExportSelectedEmployeeId(e.target.value)}
                      className="custom-select"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">-- Choose Employee --</option>
                      {profiles.filter(p => p.role !== 'admin').map((p, idx) => (
                        <option key={idx} value={p.id}>{p.full_name} (PIN: {p.pin})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Employees Per Page</label>
                  <select 
                    value={exportEmployeesPerPage} 
                    onChange={e => setExportEmployeesPerPage(e.target.value)}
                    className="custom-select"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="1">1 Employee per page (Single Advice Layout)</option>
                    <option value="2">2 Employees per page</option>
                    <option value="5">5 Employees per page</option>
                    <option value="10">10 Employees per page</option>
                    <option value="15">15 Employees per page</option>
                    <option value="18">18 Employees per page (Standard)</option>
                    <option value="20">20 Employees per page</option>
                    <option value="25">25 Employees per page</option>
                    <option value="30">30 Employees per page</option>
                    <option value="auto">All (Auto Fit on Single Page)</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Filter by Payment Method</label>
                  <select 
                    value={exportPaymentFilter} 
                    onChange={e => setExportPaymentFilter(e.target.value as any)}
                    className="custom-select"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="all">All Payment Methods</option>
                    <option value="Bank">Bank Transfer Only</option>
                    <option value="Cash">Cash Payment Only</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Custom Date Range / Tenure (Salaries & Overtime by Date) */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            <div 
              onClick={() => toggleSection('dateRange')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                background: openSections.dateRange ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                userSelect: 'none',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  2. Custom Date Range & Tenure (Salaries & OT by Date)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '0.72rem', 
                  color: exportUseCustomDateRange ? '#10b981' : 'var(--text-secondary)', 
                  background: exportUseCustomDateRange ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.05)', 
                  padding: '2px 8px', 
                  borderRadius: '10px', 
                  border: exportUseCustomDateRange ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                  fontWeight: exportUseCustomDateRange ? 700 : 400
                }}>
                  {exportUseCustomDateRange ? `Custom: ${exportStartDate || startDate} to ${exportEndDate || endDate}` : `Full Period (${startDate} to ${endDate})`}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {openSections.dateRange ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {openSections.dateRange && (
              <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.015)' }}>
                {/* Boolean Toggle for Custom Date System */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '10px 14px', 
                  borderRadius: 'var(--radius-sm)', 
                  background: exportUseCustomDateRange ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface-hover)', 
                  border: exportUseCustomDateRange ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)' 
                }}>
                  <div>
                    <label htmlFor="chkExportCustomDate" style={{ margin: 0, cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', display: 'block' }}>
                      Calculate & Export for Custom Date Tenure
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      When ON, calculates net earnings, overtime hours, payouts, and penalties strictly for the custom date span.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      color: exportUseCustomDateRange ? '#10b981' : 'var(--text-muted)' 
                    }}>
                      {exportUseCustomDateRange ? 'ENABLED' : 'DISABLED'}
                    </span>
                    <input 
                      type="checkbox" 
                      id="chkExportCustomDate"
                      checked={exportUseCustomDateRange}
                      onChange={e => {
                        const val = e.target.checked;
                        setExportUseCustomDateRange(val);
                        if (val && !exportStartDate) setExportStartDate(startDate);
                        if (val && !exportEndDate) setExportEndDate(endDate);
                      }}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                    />
                  </div>
                </div>

                {/* Calendar Date Pickers - Visible ONLY when Boolean is True */}
                {exportUseCustomDateRange && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '10px', 
                    padding: '12px', 
                    borderRadius: 'var(--radius-sm)', 
                    background: 'rgba(59, 130, 246, 0.05)', 
                    border: '1px solid rgba(59, 130, 246, 0.2)' 
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={styles.formGroup}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Tenure Start Date *
                        </label>
                        <input 
                          type="date"
                          value={exportStartDate || startDate}
                          onChange={e => setExportStartDate(e.target.value)}
                          style={{ ...styles.input, fontSize: '0.85rem' }}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Tenure End Date *
                        </label>
                        <input 
                          type="date"
                          value={exportEndDate || endDate}
                          onChange={e => setExportEndDate(e.target.value)}
                          style={{ ...styles.input, fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Quick Presets:</span>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleSetPresetDate('month')}
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      >
                        Full Month
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleSetPresetDate('first_half')}
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      >
                        1st to 15th
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleSetPresetDate('second_half')}
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      >
                        16th to End
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => handleSetPresetDate('today')}
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      >
                        Today
                      </button>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 10px', borderRadius: '4px', marginTop: '2px' }}>
                      Overtime hours, compensation payouts, and daily net salary will be generated exclusively between <strong>{exportStartDate || startDate}</strong> and <strong>{exportEndDate || endDate}</strong>.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: Overtime & Calculation Modes */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            <div 
              onClick={() => toggleSection('salaryMode')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                background: openSections.salaryMode ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                userSelect: 'none',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  3. Overtime & Calculation Modes
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  {exportOtMode === 'base_x_ot' ? 'Base x Overtime' : exportOtMode === 'with_ot' ? 'With OT' : 'Without OT'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {openSections.salaryMode ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {openSections.salaryMode && (
              <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.015)' }}>
                <div style={styles.formGroup}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Net Salary Overtime Mode</label>
                  <select 
                    value={exportOtMode} 
                    onChange={e => setExportOtMode(e.target.value as any)}
                    className="custom-select"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="base_x_ot">Base Salary Cap (Base x Overtime) - Default</option>
                    <option value="with_ot">With Overtime (With OT)</option>
                    <option value="without_ot">Without Overtime (Without OT)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(139,92,246,0.06)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <input 
                    type="checkbox" 
                    id="chkIncludePurposePayee"
                    checked={exportIncludePurposePayee}
                    onChange={e => {
                      const val = e.target.checked;
                      setExportIncludePurposePayee(val);
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="chkIncludePurposePayee" style={{ margin: 0, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Include All Recorded Purpose Payees (Net Payee Amount Column)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4: Member Selection & Filter (WhatsApp Style) */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            <div 
              onClick={() => toggleSection('members')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                background: openSections.members ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                userSelect: 'none',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  4. Member Selection ({exportFilteredCandidates.length} / {fullCandidatePool.length} Included)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: exportExcludedIds.length > 0 ? '#ef4444' : '#10b981', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  {exportExcludedIds.length > 0 ? `${exportExcludedIds.length} Excluded` : 'All Included'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {openSections.members ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {openSections.members && (
              <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ margin: 0, fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                    Filter Employees to Include in Export:
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      onClick={() => setExportExcludedIds([])}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                      onClick={() => setExportExcludedIds(fullCandidatePool.map(c => String(c.id)))}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {exportExcludedIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '75px', overflowY: 'auto', padding: '4px 0' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600, width: '100%' }}>
                      Excluded Members ({exportExcludedIds.length}):
                    </span>
                    {exportExcludedIds.map(id => {
                      const candidate = fullCandidatePool.find(c => String(c.id) === id);
                      if (!candidate) return null;
                      return (
                        <span
                          key={id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          <span>{candidate.full_name} ({candidate.pin})</span>
                          <button
                            type="button"
                            onClick={() => setExportExcludedIds(prev => prev.filter(x => x !== id))}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: 0, lineHeight: 1 }}
                            title="Re-include employee"
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                  <img 
                    src="/icons/search.png" 
                    alt="search" 
                    className="theme-icon" 
                    style={{ position: 'absolute', left: '10px', width: '12px', height: '12px', opacity: 0.6, pointerEvents: 'none' }} 
                  />
                  <input
                    type="text"
                    value={exportSearchQuery}
                    onChange={e => setExportSearchQuery(e.target.value)}
                    placeholder="Search employee name, PIN, or department to include/exclude..."
                    style={{ ...styles.input, fontSize: '0.82rem', padding: '8px 12px 8px 28px', width: '100%' }}
                  />
                </div>

                <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-surface)', padding: '6px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-color)' }}>
                  {fullCandidatePool
                    .filter(c => {
                      if (!exportSearchQuery.trim()) return true;
                      const q = exportSearchQuery.toLowerCase();
                      return (
                        c.full_name?.toLowerCase().includes(q) ||
                        c.pin?.toLowerCase().includes(q) ||
                        c.department?.toLowerCase().includes(q)
                      );
                    })
                    .map(c => {
                      const isExcluded = exportExcludedIds.includes(String(c.id));
                      return (
                        <label
                          key={c.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            background: isExcluded ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-surface-hover)',
                            border: isExcluded ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid transparent',
                            cursor: 'pointer',
                            margin: 0,
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={() => {
                                setExportExcludedIds(prev =>
                                  isExcluded ? prev.filter(x => x !== String(c.id)) : [...prev, String(c.id)]
                                );
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: isExcluded ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isExcluded ? 'line-through' : 'none' }}>
                                {c.full_name}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                PIN: {c.pin} | {c.department || 'Staff'}
                              </span>
                            </div>
                          </div>

                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: isExcluded ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isExcluded ? '#ef4444' : '#10b981'
                          }}>
                            {isExcluded ? 'Excluded' : 'Included'}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 5: Columns to Include */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            <div 
              onClick={() => toggleSection('columns')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                background: openSections.columns ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                userSelect: 'none',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  5. Columns to Include ({selectedColCount} Selected)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  {selectedColCount} Columns
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {openSections.columns ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {openSections.columns && (
              <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  {[
                    { key: 'pin', label: 'Employee PIN' },
                    { key: 'name', label: 'Employee Name' },
                    { key: 'dept', label: 'Department' },
                    { key: 'designation', label: 'Designation' },
                    { key: 'base_salary', label: 'Base Salary' },
                    { key: 'income_tax', label: 'Income Tax' },
                    { key: 'net_salary', label: 'Net Salary (Payable)' },
                    { key: 'overtime_hours', label: 'Overtime / Comp Hours' },
                    { key: 'overtime_payout', label: 'Overtime Payout' },
                    { key: 'late_deduction', label: 'Late Deduction' },
                    { key: 'absence_deduction', label: 'Absence Deduction' },
                    { key: 'payment_method', label: 'Payment Method' },
                    { key: 'bank_name', label: 'Bank Name' },
                    { key: 'bank_account_title', label: 'Account Title' },
                    { key: 'bank_account_no', label: 'Account No' }
                  ].map(col => (
                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.84rem' }}>
                      <input 
                        type="checkbox" 
                        checked={Boolean((exportCols as any)[col.key])} 
                        onChange={e => setExportCols((prev: any) => ({ ...prev, [col.key]: e.target.checked }))} 
                        style={{ width: '16px', height: '16px', margin: 0, cursor: 'pointer' }}
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: Output Format & Letterhead */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg-surface)' }}>
            <div 
              onClick={() => toggleSection('format')}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                cursor: 'pointer',
                background: openSections.format ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                userSelect: 'none',
                transition: 'background 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                  6. Output Format & Letterhead
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  {customExportFormat.toUpperCase()} · {exportUseLetterhead ? 'Letterhead ON' : 'Letterhead OFF'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {openSections.format ? '▲' : '▼'}
                </span>
              </div>
            </div>

            {openSections.format && (
              <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,255,255,0.015)' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                    Select Output Format:
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'pdf', label: 'PDF / Print Preview' },
                      { id: 'excel', label: 'Excel Spreadsheet (.xlsx)' },
                      { id: 'word', label: 'Word Document (.docx)' }
                    ].map(fmt => (
                      <label
                        key={fmt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: customExportFormat === fmt.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: customExportFormat === fmt.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: customExportFormat === fmt.id ? 700 : 400
                        }}
                      >
                        <input
                          type="radio"
                          name="customExportFormat"
                          checked={customExportFormat === fmt.id}
                          onChange={() => setCustomExportFormat(fmt.id as any)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{fmt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <input 
                    type="checkbox" 
                    id="chkUseLetterhead"
                    checked={exportUseLetterhead}
                    onChange={e => setExportUseLetterhead(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="chkUseLetterhead" style={{ margin: 0, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    Print on Official Letterhead (Salry.png)
                  </label>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Actions Footer with Dynamic Sum Summary Box in Bottom-Left */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <div style={{ 
            display: 'inline-flex', 
            flexDirection: 'column', 
            gap: '2px', 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.3)', 
            padding: '6px 14px', 
            borderRadius: '8px', 
            fontSize: '0.82rem'
          }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Export Selection Total ({exportFilteredCandidates.length} Members{exportUseCustomDateRange ? ` · ${effStart} to ${effEnd}` : ''}):
            </span>
            <span style={{ fontWeight: 800, color: '#10b981' }}>
              {exportCols.base_salary && exportCols.net_salary 
                ? `Base: Rs. ${calculatedExportBaseSum.toLocaleString()} | Net: Rs. ${calculatedExportNetSum.toLocaleString()}`
                : exportCols.base_salary 
                  ? `Base Total: Rs. ${calculatedExportBaseSum.toLocaleString()}`
                  : exportCols.net_salary
                    ? `Net Total: Rs. ${calculatedExportNetSum.toLocaleString()}`
                    : `Base: Rs. ${calculatedExportBaseSum.toLocaleString()} | Net: Rs. ${calculatedExportNetSum.toLocaleString()}`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsExportModalOpen(false)}
              style={{ padding: '8px 16px' }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleExportPrint}
              style={{ padding: '8px 24px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 'bold' }}
            >
              Export & Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportReportModal;
