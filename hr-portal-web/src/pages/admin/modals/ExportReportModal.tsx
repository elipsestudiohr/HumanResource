import React from 'react';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import styles from '../AdminStyles';

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
  getEmployeeNetSalary: (emp: EmployeeProfile) => number;
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
  getEmployeeNetSalary,
  handleExportPrint
}) => {
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

  const calculatedExportBaseSum = exportFilteredCandidates.reduce((acc, p) => acc + (p.base_salary || 0), 0);
  const calculatedExportNetSum = exportFilteredCandidates.reduce((acc, p) => {
    const isTransfer = String(p.id).startsWith('transfer-');
    return acc + (isTransfer ? (p.base_salary || 0) : getEmployeeNetSalary(p));
  }, 0);

  return (
    <div 
      className="custom-overlay" 
      onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
      onClick={e => {
        if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
          setIsExportModalOpen(false);
        }
      }} 
      style={{ zIndex: 11000 }}
    >
      <div 
        className="custom-dialog-card glass-panel" 
        onMouseDown={e => e.stopPropagation()} 
        onClick={e => e.stopPropagation()} 
        style={{ padding: '24px', width: '640px', maxWidth: '95vw', textAlign: 'left', alignItems: 'stretch', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          Export Salaries Options
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {/* Target Selector */}
          <div style={styles.formGroup}>
            <label>Export Target Scope</label>
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

          {/* Sub-Selector for Department Target */}
          {exportTarget === 'department' && (
            <div style={styles.formGroup}>
              <label>Select Department *</label>
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

          {/* Sub-Selector for Specific Employee Target */}
          {exportTarget === 'employee' && (
            <div style={styles.formGroup}>
              <label>Select Specific Employee *</label>
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

          {/* Employees Per Page Selector */}
          <div style={styles.formGroup}>
            <label style={{ fontWeight: 600 }}>Employees Per Page</label>
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

          {/* Payment Method Filter */}
          <div style={styles.formGroup}>
            <label>Filter by Payment Method</label>
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

          {/* Net Salary Overtime Mode Dropdown */}
          <div style={styles.formGroup}>
            <label>Net Salary Overtime Mode</label>
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

          {/* Include Recorded Purpose Payee Option */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(139,92,246,0.06)', padding: '10px 14px', borderRadius: '6px', border: '1px solid rgba(139,92,246,0.2)' }}>
            <input 
              type="checkbox" 
              id="chkIncludePurposePayee"
              checked={exportIncludePurposePayee}
              onChange={e => {
                const val = e.target.checked;
                setExportIncludePurposePayee(val);
                setExportCols((prev: any) => ({ ...prev, net_payee: val }));
              }}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="chkIncludePurposePayee" style={{ margin: 0, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Include All Recorded Purpose Payees (Net Payee Amount Column)
            </label>
          </div>

          {/* WhatsApp-Style Member Inclusion / Exclusion Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                Member Selection ({fullCandidatePool.length - exportExcludedIds.length} / {fullCandidatePool.length} Included)
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

            {/* Excluded Members Chips / Badges (WhatsApp Style) */}
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

            {/* Search Input */}
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

            {/* Scrollable Candidate Checklist */}
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
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: isExcluded ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: isExcluded ? 'line-through' : 'none' }}>
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

          {/* Column Selection Checkboxes */}
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Columns to Include:</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.pin} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, pin: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Employee PIN</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.name} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, name: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Employee Name</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.dept} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, dept: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Department</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.designation} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, designation: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Designation</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.base_salary} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, base_salary: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Base Salary</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.income_tax} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, income_tax: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Income Tax</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.net_salary} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, net_salary: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Net Salary</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.payment_method} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, payment_method: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Payment Method</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.bank_name} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, bank_name: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Bank Name</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.bank_account_title} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, bank_account_title: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Account Title</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                <input 
                  type="checkbox" 
                  checked={exportCols.bank_account_no} 
                  onChange={e => setExportCols((prev: any) => ({ ...prev, bank_account_no: e.target.checked }))} 
                  style={{ width: '16px', height: '16px', margin: 0 }}
                />
                <span>Account No</span>
              </label>
            </div>
          </div>

          {/* Template Style Choice */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <input 
              type="checkbox" 
              id="chkUseLetterhead"
              checked={exportUseLetterhead}
              onChange={e => setExportUseLetterhead(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="chkUseLetterhead" style={{ margin: 0, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
              Print on Official Letterhead (Salry.png)
            </label>
          </div>

          {/* Format Choice Selector */}
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border-color)' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
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
        </div>

        {/* Actions Footer with Dynamic Sum Summary Box in Bottom-Left */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
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
              Export Selection Total ({exportFilteredCandidates.length} Members):
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
