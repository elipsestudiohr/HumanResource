import React, { useState, useEffect, useMemo } from 'react';
import {
  exportPayrollToPdf,
  exportPayrollToExcel,
  exportPayrollToWord,
  exportPayrollToCsv
} from '../../../utils/payrollExporter';
import type { PayrollExportRow } from '../../../utils/payrollExporter';
import { roundSalary } from '../../../utils/attendanceProcessor';
import { getModalOverlayStyle } from '../AdminStyles';

interface SalaryExportModalProps {
  isSalaryExportModalOpen: boolean;
  setIsSalaryExportModalOpen: (open: boolean) => void;
  startDate: string;
  endDate: string;
  exportFormat: 'pdf' | 'excel' | 'word' | 'csv';
  setExportFormat: (format: 'pdf' | 'excel' | 'word' | 'csv') => void;
  payrollSummary: any[];
}

export const SalaryExportModal: React.FC<SalaryExportModalProps> = ({
  isSalaryExportModalOpen,
  setIsSalaryExportModalOpen,
  startDate,
  endDate,
  exportFormat,
  setExportFormat,
  payrollSummary
}) => {
  // Mode: Full Salary + Bonus vs Only Bonus Amount
  const [exportMode, setExportMode] = useState<'with_salary' | 'only_bonus'>('with_salary');

  // Month & Year selection
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [isOnlySelectedMonth, setIsOnlySelectedMonth] = useState<boolean>(true);

  // Bonus Map: key is employee PIN or ID, value is bonus amount in PKR
  const monthKey = `payroll_bonus_${selectedYear}_${String(selectedMonth + 1).padStart(2, '0')}`;
  const [bonusMap, setBonusMap] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem(monthKey);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  // Re-load stored bonuses when month/year changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(monthKey);
      if (stored) {
        setBonusMap(JSON.parse(stored));
      } else {
        setBonusMap({});
      }
    } catch (e) {
      setBonusMap({});
    }
  }, [monthKey]);

  const [bonusesAdded, setBonusesAdded] = useState(false);
  const [bonusPercent, setBonusPercent] = useState(50);
  const [customPercent, setCustomPercent] = useState('');

  // Save bonuses on change
  const updateBonus = (pin: string, amount: number) => {
    setBonusMap(prev => {
      const updated = { ...prev, [pin]: isNaN(amount) ? 0 : Math.max(0, amount) };
      try {
        localStorage.setItem(monthKey, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Commit and apply all entered bonuses to Net Salary
  const handleAddBonuses = () => {
    try {
      localStorage.setItem(monthKey, JSON.stringify(bonusMap));
    } catch (e) {}

    // Dispatch global event so AdminDashboard, ExportReportModal, etc. refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('payroll_bonus_updated', {
        detail: { monthKey, bonusMap }
      }));
    }

    setBonusesAdded(true);
    setTimeout(() => setBonusesAdded(false), 3500);

    const count = Object.values(bonusMap).filter(v => (v || 0) > 0).length;
    window.customAlert(
      count > 0
        ? `Successfully added bonus amounts (Total: Rs. ${totalBonusSum.toLocaleString()}) to Net Salary for ${count} employee(s)!`
        : 'Please enter bonus amounts in the table or select a percentage, then click Add.'
    );
  };

  // WhatsApp-style filtering & selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPinSet, setSelectedPinSet] = useState<Set<string>>(() => {
    return new Set(payrollSummary.map(r => r.pin || r.id));
  });

  // When modal opens or payrollSummary changes, select all by default
  useEffect(() => {
    if (isSalaryExportModalOpen) {
      setSelectedPinSet(new Set(payrollSummary.map(r => r.pin || r.id)));
    }
  }, [isSalaryExportModalOpen, payrollSummary]);

  // Unique departments from payroll summary
  const departments = useMemo(() => {
    const set = new Set<string>();
    payrollSummary.forEach(r => {
      if (r.department && r.department.trim()) {
        set.add(r.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [payrollSummary]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return payrollSummary.filter(r => {
      const pin = (r.pin || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      const dept = (r.department || '').toLowerCase();
      const matchesSearch = !q || pin.includes(q) || name.includes(q) || dept.includes(q);
      const matchesDept = selectedDepartment === 'all' || (r.department && r.department.trim() === selectedDepartment);
      return matchesSearch && matchesDept;
    });
  }, [payrollSummary, searchQuery, selectedDepartment]);

  // Toggle single employee selection
  const toggleSelectEmployee = (pin: string) => {
    setSelectedPinSet(prev => {
      const next = new Set(prev);
      if (next.has(pin)) {
        next.delete(pin);
      } else {
        next.add(pin);
      }
      return next;
    });
  };

  // Select all visible
  const selectAllVisible = () => {
    setSelectedPinSet(prev => {
      const next = new Set(prev);
      filteredEmployees.forEach(r => next.add(r.pin || r.id));
      return next;
    });
  };

  // Deselect all visible
  const deselectAllVisible = () => {
    setSelectedPinSet(prev => {
      const next = new Set(prev);
      filteredEmployees.forEach(r => next.delete(r.pin || r.id));
      return next;
    });
  };



  // Clear all bonuses
  const clearAllBonuses = () => {
    setBonusMap({});
    try {
      localStorage.removeItem(monthKey);
    } catch (e) {}
  };

  if (!isSalaryExportModalOpen) return null;

  // Selected Month Label for Export
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dateLabel = isOnlySelectedMonth
    ? `${monthNames[selectedMonth]}_${selectedYear}`
    : `${startDate}_to_${endDate}`;

  // Totals for selected employees
  const selectedRows = payrollSummary.filter(r => selectedPinSet.has(r.pin || r.id));
  const totalBaseSum = selectedRows.reduce((s, r) => s + (r.baseSalary || 0), 0);
  const totalBonusSum = selectedRows.reduce((s, r) => s + (bonusMap[r.pin || r.id] || 0), 0);
  const grandTotalPayableSum = selectedRows.reduce((s, r) => {
    const bonus = bonusMap[r.pin || r.id] || 0;
    return s + (r.totalPayable || 0) + bonus;
  }, 0);

  // Handle Export Execution
  const handleExport = async () => {
    if (selectedRows.length === 0) {
      window.customAlert('Please select at least one employee to export.');
      return;
    }

    setIsSalaryExportModalOpen(false);
    const modeLabel = exportMode === 'only_bonus' ? 'Bonus Statement' : 'Payroll Statement';
    window.showLoading(`Exporting ${modeLabel} as ${exportFormat.toUpperCase()}...`);

    try {
      const rowsToExport: PayrollExportRow[] = selectedRows.map(r => {
        const pin = r.pin || r.id || '000';
        const bonus = bonusMap[pin] || 0;
        const totalPayableWithBonus = roundSalary((r.totalPayable || 0) + bonus);

        return {
          pin,
          name: r.name || 'Employee',
          department: r.department || '',
          designation: r.designation || '',
          totalWorkingDays: r.totalWorkingDays || 30,
          presentDays: r.presentDays || (30 - (r.absences || 0)),
          lateArrivals: r.lateArrivals || 0,
          totalLateMinutes: r.totalLateMinutes || 0,
          absences: r.absences || 0,
          totalOvertimeHours: r.totalOvertimeHours || 0,
          totalCompensatedOvertimeHours: r.totalCompensatedOvertimeHours || 0,
          overtimePayout: r.totalOvertimePayout || 0,
          totalLateDeduction: r.totalLateDeduction || 0,
          totalAbsenceDeduction: r.totalAbsenceDeduction || 0,
          loanDeduction: r.loanDeduction || 0,
          baseSalary: r.baseSalary || 0,
          bonusAmount: bonus,
          totalPayable: exportMode === 'only_bonus' ? bonus : totalPayableWithBonus
        };
      });

      const options = { isBonusOnly: exportMode === 'only_bonus' };

      if (exportFormat === 'pdf') {
        exportPayrollToPdf(rowsToExport, dateLabel, options);
      } else if (exportFormat === 'excel') {
        exportPayrollToExcel(rowsToExport, dateLabel, options);
      } else if (exportFormat === 'word') {
        await exportPayrollToWord(rowsToExport, dateLabel, options);
      } else {
        exportPayrollToCsv(rowsToExport, dateLabel, options);
      }

      window.customAlert(`Successfully exported ${rowsToExport.length} employee(s) as ${exportFormat.toUpperCase()}!`);
    } catch (err: any) {
      window.customAlert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      window.hideLoading();
    }
  };

  return (
    <div
      className="custom-overlay"
      onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
      onClick={e => {
        if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
          setIsSalaryExportModalOpen(false);
        }
      }}
      style={getModalOverlayStyle(11000)}
    >
      <div
        className="custom-dialog-card glass-panel"
        style={{
          maxWidth: '1360px',
          width: '96vw',
          height: '92vh',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '22px 28px',
          overflow: 'hidden'
        }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/icons/download.png" alt="export" className="theme-icon" style={{ width: '18px', height: '18px' }} />
              Bonus & Payroll Export Manager
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Add bonuses and expenses, select employees with WhatsApp-style group filters, and export statements.
            </p>
          </div>
          <button
            onClick={() => setIsSalaryExportModalOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.3rem' }}
          >
            ✕
          </button>
        </div>

        {/* Configuration Row: Month, Mode & Format (Full-Width 3-Column Layout) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '16px',
            background: 'var(--bg-surface-hover)',
            border: '1px solid var(--border-color)',
            padding: '14px 18px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '14px',
            alignItems: 'stretch'
          }}
        >
          {/* 1. Month & Scope */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                PAYROLL PERIOD
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  style={{ ...styles.input, height: '36px', fontSize: '0.84rem', padding: '4px 10px', flex: 1 }}
                >
                  {monthNames.map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  style={{ ...styles.input, height: '36px', fontSize: '0.84rem', padding: '4px 10px', width: '95px' }}
                >
                  {[2024, 2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isOnlySelectedMonth}
                onChange={e => setIsOnlySelectedMonth(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer' }}
              />
              <span>Only selected month ({monthNames[selectedMonth]} {selectedYear})</span>
            </label>
          </div>

          {/* 2. Export Mode */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                EXPORT MODE
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setExportMode('with_salary')}
                  className={`btn ${exportMode === 'with_salary' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '6px 12px', fontSize: '0.82rem', height: '36px', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  With Full Salary
                </button>
                <button
                  type="button"
                  onClick={() => setExportMode('only_bonus')}
                  className={`btn ${exportMode === 'only_bonus' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '6px 12px', fontSize: '0.82rem', height: '36px', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  Only Bonus Amount
                </button>
              </div>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              {exportMode === 'with_salary'
                ? 'Adds bonus amount into employee salary statement'
                : 'Exports standalone bonus and expense payout sheet'}
            </div>
          </div>

          {/* 3. Export File Format */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                FILE FORMAT
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['pdf', 'excel', 'word', 'csv'] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setExportFormat(fmt)}
                    className={`btn ${exportFormat === fmt ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      fontSize: '0.80rem',
                      height: '36px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Target output: <strong>{exportFormat.toUpperCase()}</strong> formatted payroll document
            </div>
          </div>
        </div>

        {/* WhatsApp-Style Group Filter & Selection Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          {/* Search and Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
              <img
                src="/icons/search.png"
                alt="search"
                className="theme-icon"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', opacity: 0.5 }}
              />
              <input
                type="text"
                placeholder="Search PIN, employee name, department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  ...styles.input,
                  paddingLeft: '28px',
                  height: '34px',
                  fontSize: '0.82rem',
                  width: '100%'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={selectAllVisible}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.76rem', height: '32px' }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAllVisible}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.76rem', height: '32px' }}
              >
                Deselect All
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }}>
                <select
                  value={bonusPercent}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    setBonusPercent(v);
                    if (v === -1) {
                      setCustomPercent('');
                    } else {
                      setCustomPercent('');
                    }
                  }}
                  style={{
                    ...styles.input,
                    height: '32px',
                    fontSize: '0.76rem',
                    padding: '2px 6px',
                    width: bonusPercent === -1 ? '80px' : '72px',
                    fontWeight: 600,
                    color: '#10b981',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    cursor: 'pointer'
                  }}
                >
                  <option value={50}>50%</option>
                  <option value={25}>25%</option>
                  <option value={15}>15%</option>
                  <option value={-1}>Custom</option>
                </select>
                {bonusPercent === -1 && (
                  <input
                    type="number"
                    value={customPercent}
                    onChange={e => {
                      setCustomPercent(e.target.value);
                      const v = parseInt(e.target.value, 10);
                      if (v > 0 && v <= 100) setBonusPercent(-1);
                    }}
                    placeholder="%"
                    min={1}
                    max={100}
                    style={{
                      ...styles.input,
                      height: '32px',
                      fontSize: '0.76rem',
                      padding: '2px 6px',
                      width: '52px',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    let pct = bonusPercent;
                    if (pct === -1) {
                      pct = parseInt(customPercent, 10);
                      if (isNaN(pct) || pct <= 0 || pct > 100) {
                        window.customAlert('Enter a valid percentage (1-100).');
                        return;
                      }
                    }
                    // Temporarily set bonusPercent to the resolved value for the apply function
                    const resolvedPct = pct;
                    setBonusMap(prev => {
                      const updated = { ...prev };
                      payrollSummary.forEach(r => {
                        const pin = r.pin || r.id;
                        if (selectedPinSet.has(pin)) {
                          updated[pin] = Math.round((r.baseSalary || 0) * resolvedPct / 100);
                        }
                      });
                      try { localStorage.setItem(monthKey, JSON.stringify(updated)); } catch (e) {}
                      return updated;
                    });
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.76rem',
                    height: '32px',
                    fontWeight: 600,
                    color: '#10b981',
                    borderColor: 'rgba(16, 185, 129, 0.4)',
                    whiteSpace: 'nowrap'
                  }}
                  title={`Apply ${bonusPercent === -1 ? (customPercent || '?') : bonusPercent}% of base salary to all selected employees`}
                >
                  Apply {bonusPercent === -1 ? (customPercent ? customPercent + '%' : '%') : bonusPercent + '%'} Base
                </button>
              </div>
              {Object.keys(bonusMap).length > 0 && (
                <button
                  type="button"
                  onClick={clearAllBonuses}
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '0.76rem', height: '32px', color: '#ef4444' }}
                >
                  Clear Bonuses
                </button>
              )}
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  background: 'var(--bg-surface)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}
              >
                Selected: {selectedRows.length} / {payrollSummary.length}
              </span>
            </div>
          </div>

          {/* WhatsApp-Style Department Filter Pills */}
          <div
            className="filters-scroll-container"
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedDepartment('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                borderColor: selectedDepartment === 'all' ? 'var(--primary)' : 'var(--border-color)',
                background: selectedDepartment === 'all' ? 'var(--primary)' : 'var(--bg-surface)',
                color: selectedDepartment === 'all' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              All Departments ({payrollSummary.length})
            </button>
            {departments.map(dept => {
              const count = payrollSummary.filter(r => r.department && r.department.trim() === dept).length;
              const isSelected = selectedDepartment === dept;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDepartment(dept)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)',
                    background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                    color: isSelected ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {dept} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Table of Employees & Bonuses */}
        <div
          className="table-slider-container"
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            minHeight: '380px'
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 5, borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ width: '40px', textAlign: 'center', padding: '10px 8px', whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={filteredEmployees.length > 0 && filteredEmployees.every(r => selectedPinSet.has(r.pin || r.id))}
                    onChange={e => {
                      if (e.target.checked) selectAllVisible();
                      else deselectAllVisible();
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', width: '95px' }}>User ID / PIN</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', minWidth: '160px' }}>Employee Name</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', minWidth: '140px' }}>Department</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '120px' }}>Base Salary</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '150px' }}>Net Salary</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', minWidth: '160px', whiteSpace: 'nowrap' }}>Bonus / Expense (PKR)</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', width: '105px', whiteSpace: 'nowrap' }}>Auto {bonusPercent === -1 ? (customPercent || '—') : bonusPercent}%</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--primary)', whiteSpace: 'nowrap', minWidth: '150px' }}>Net Payable</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No employees matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(r => {
                  const pin = r.pin || r.id || '000';
                  const isChecked = selectedPinSet.has(pin);
                  const bonus = bonusMap[pin] || 0;
                  const finalPayable = roundSalary((r.totalPayable || 0) + bonus);

                  return (
                    <tr
                      key={pin}
                      style={{
                        background: isChecked ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                        borderBottom: '1px solid var(--border-color)',
                        opacity: isChecked ? 1 : 0.55
                      }}
                    >
                      <td style={{ textAlign: 'center', padding: '8px 8px', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectEmployee(pin)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{pin}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, whiteSpace: 'nowrap' }}>{r.name || 'Employee'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.department || 'General'}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        Rs. {(r.baseSalary || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <span style={{ color: bonus > 0 ? '#10b981' : 'var(--text-primary)', fontSize: '0.86rem' }}>
                          Rs. {finalPayable.toLocaleString()}
                        </span>
                        {bonus > 0 && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '2px' }}>
                            Base: Rs. {(r.totalPayable || 0).toLocaleString()} + Bonus: {bonus.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <input
                          type="number"
                          value={bonus === 0 ? '' : bonus}
                          placeholder="0"
                          min={0}
                          onChange={e => updateBonus(pin, parseFloat(e.target.value) || 0)}
                          style={{
                            ...styles.input,
                            width: '120px',
                            height: '30px',
                            padding: '4px 8px',
                            fontSize: '0.82rem',
                            textAlign: 'right',
                            fontWeight: 700,
                            borderColor: bonus > 0 ? 'rgba(16, 185, 129, 0.6)' : 'var(--border-color)',
                            background: bonus > 0 ? 'rgba(16, 185, 129, 0.08)' : 'var(--input-bg)'
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const pct = bonusPercent === -1 ? (parseInt(customPercent, 10) || 50) : bonusPercent;
                              updateBonus(pin, Math.round((r.baseSalary || 0) * pct / 100));
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              height: '26px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap'
                            }}
                            title={`Set bonus to ${bonusPercent === -1 ? (customPercent || '50') : bonusPercent}% of base salary (Rs. ${Math.round((r.baseSalary || 0) * (bonusPercent === -1 ? (parseInt(customPercent, 10) || 50) : bonusPercent) / 100).toLocaleString()})`}
                          >
                            {bonusPercent === -1 ? (customPercent || '50') : bonusPercent}% Base
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                localStorage.setItem(monthKey, JSON.stringify(bonusMap));
                              } catch (e) {}
                              if (typeof window !== 'undefined') {
                                window.dispatchEvent(new CustomEvent('payroll_bonus_updated', { detail: { monthKey, bonusMap } }));
                              }
                              window.customAlert(`Bonus of Rs. ${(bonus || 0).toLocaleString()} added to Net Salary for ${r.name || pin}!`);
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '3px 8px',
                              fontSize: '0.72rem',
                              height: '26px',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              color: '#10b981',
                              borderColor: 'rgba(16, 185, 129, 0.4)'
                            }}
                            title="Add this bonus to Net Salary"
                          >
                            + Add
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                        Rs. {exportMode === 'only_bonus' ? bonus.toLocaleString() : finalPayable.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Summary Bar & Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', gap: '18px', fontSize: '0.82rem', flexWrap: 'wrap' }}>
            <div>Selected Base: <strong>Rs. {totalBaseSum.toLocaleString()}</strong></div>
            <div>Total Bonus: <strong style={{ color: '#10b981' }}>+Rs. {totalBonusSum.toLocaleString()}</strong></div>
            <div>
              {exportMode === 'only_bonus' ? 'Total Payout:' : 'Grand Net Payable:'}{' '}
              <strong style={{ color: 'var(--primary)', fontSize: '0.92rem' }}>
                Rs. {(exportMode === 'only_bonus' ? totalBonusSum : grandTotalPayableSum).toLocaleString()}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setIsSalaryExportModalOpen(false)}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="btn btn-secondary"
              style={{ padding: '8px 24px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              Export {exportFormat.toUpperCase()} ({selectedRows.length} Emps)
            </button>
            <button
              type="button"
              onClick={handleAddBonuses}
              className="btn btn-primary"
              style={{
                background: '#10b981',
                borderColor: '#059669',
                color: '#ffffff',
                padding: '8px 28px',
                fontSize: '0.88rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)'
              }}
              title="Add entered bonuses to employee Net Salary and save"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>{bonusesAdded ? 'Added!' : 'Add'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  input: {
    background: 'var(--input-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    outline: 'none',
    boxSizing: 'border-box' as const
  }
};

export default SalaryExportModal;
