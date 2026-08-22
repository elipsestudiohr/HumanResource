import React from 'react';
import {
  exportPayrollToPdf,
  exportPayrollToExcel,
  exportPayrollToWord,
  exportPayrollToCsv
} from '../../../utils/payrollExporter';

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
  if (!isSalaryExportModalOpen) return null;

  return (
    <div 
      className="custom-overlay" 
      onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
      onClick={e => {
        if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
          setIsSalaryExportModalOpen(false);
        }
      }} 
      style={{ zIndex: 11000 }}
    >
      <div 
        className="custom-dialog-card glass-panel" 
        style={{ maxWidth: '480px', width: '92%', textAlign: 'left', alignItems: 'stretch' }} 
        onMouseDown={e => e.stopPropagation()} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/icons/download.png" alt="export" className="theme-icon" style={{ width: '18px', height: '18px' }} />
            Export Payroll Statements
          </h3>
          <button onClick={() => setIsSalaryExportModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
          Choose your preferred file format to download the complete payroll and salary summary for <strong>{startDate} to {endDate}</strong>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {[
            { id: 'pdf', title: 'PDF Document (.pdf)', desc: 'Formatted document with header logo & totals summary' },
            { id: 'excel', title: 'Excel Spreadsheet (.xlsx)', desc: 'Standard Excel workbook with all employee columns' },
            { id: 'word', title: 'Word Document (.docx)', desc: 'Formatted Microsoft Word table report' },
            { id: 'csv', title: 'CSV Raw Data (.csv)', desc: 'Comma-separated values data file' }
          ].map(opt => (
            <label
              key={opt.id}
              onClick={() => setExportFormat(opt.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: exportFormat === opt.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                background: exportFormat === opt.id ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface-hover)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <input
                type="radio"
                name="exportFormat"
                checked={exportFormat === opt.id}
                onChange={() => setExportFormat(opt.id as any)}
                style={{ cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{opt.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={() => setIsSalaryExportModalOpen(false)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
          <button
            onClick={async () => {
              setIsSalaryExportModalOpen(false);
              window.showLoading(`Exporting payroll as ${exportFormat.toUpperCase()}...`);
              const dateLabel = `${startDate}_to_${endDate}`;
              try {
                const rows = payrollSummary.map((r: any) => ({
                  pin: r.pin || '000',
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
                  totalPayable: r.totalPayable || 0
                }));

                if (exportFormat === 'pdf') {
                  exportPayrollToPdf(rows, dateLabel);
                } else if (exportFormat === 'excel') {
                  exportPayrollToExcel(rows, dateLabel);
                } else if (exportFormat === 'word') {
                  await exportPayrollToWord(rows, dateLabel);
                } else {
                  exportPayrollToCsv(rows, dateLabel);
                }
                window.customAlert(`Payroll successfully exported as ${exportFormat.toUpperCase()}!`);
              } catch (err: any) {
                window.customAlert(`Export failed: ${err.message || 'Unknown error'}`);
              } finally {
                window.hideLoading();
              }
            }}
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontWeight: 600 }}
          >
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalaryExportModal;
