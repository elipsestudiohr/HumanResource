import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType } from 'docx';
import { downloadBlobFile, downloadExcelWorkbook } from '../../../utils/downloadHelper';
import {
  processAttendanceLogs,
  calculateEmployeePayrollSummary,
  getEmployeeShiftTiming,
  formatClockDuration,
  formatOvertimeDuration,
  roundSalary,
  type EmployeeProfile,
  type RawLog,
  type LeaveRequest,
  type ShiftTiming,
  type DailySummary,
  type EmployeePayrollSummary
} from '../../../utils/attendanceProcessor';
import { getModalOverlayStyle } from '../AdminStyles';

interface EmployeeMonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeProfile | null;
  initialMonth: number;
  initialYear: number;
  rawLogs: RawLog[];
  leaveRequests: LeaveRequest[];
  holidaysList: any[];
  monthlyGraceSettings?: any;
  graceTimeMinsSetting: number;
  shiftTimings?: ShiftTiming[];
  complaintsList?: any[];
  approvedCorrectionsList?: any[];
  employeeLoansList?: any[];
  salaryDivisionPlans?: Record<string, any>;
}

export const EmployeeMonthlyReportModal: React.FC<EmployeeMonthlyReportModalProps> = ({
  isOpen,
  onClose,
  employee,
  initialMonth,
  initialYear,
  rawLogs,
  leaveRequests,
  holidaysList,
  monthlyGraceSettings,
  graceTimeMinsSetting,
  shiftTimings = [],
  complaintsList = [],
  approvedCorrectionsList = [],
  employeeLoansList = [],
  salaryDivisionPlans = {}
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('full');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'word'>('pdf');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Sync with initial values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedMonth(initialMonth);
      setSelectedYear(initialYear);
      setSelectedDivisionId('full');
    }
  }, [isOpen, initialMonth, initialYear]);

  // Compute daily summaries and payroll statistics for the selected month / division
  const reportData = useMemo(() => {
    if (!employee) return null;

    const pad = (num: number) => num.toString().padStart(2, '0');
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const curMonthKey = `${selectedYear}-${pad(selectedMonth + 1)}`;
    const plan = salaryDivisionPlans[curMonthKey];

    let startStr = `${selectedYear}-${pad(selectedMonth + 1)}-01`;
    let endStr = `${selectedYear}-${pad(selectedMonth + 1)}-${pad(lastDay)}`;
    let divisionLabel = '';

    if (selectedDivisionId !== 'full' && plan && plan.divisions) {
      const activeDiv = plan.divisions.find((d: any, idx: number) => (d.id || `div-${idx + 1}`) === selectedDivisionId);
      if (activeDiv) {
        startStr = activeDiv.startDate;
        endStr = activeDiv.endDate;
        divisionLabel = activeDiv.name || '';
      }
    }

    const holidayDates = holidaysList.map(h => h.date);
    const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === employee.id);
    const timing = getEmployeeShiftTiming(employee, shiftTimings);
    const effectiveGrace = timing.graceMins !== undefined
      ? timing.graceMins
      : (monthlyGraceSettings && Object.keys(monthlyGraceSettings).length > 0 ? monthlyGraceSettings : graceTimeMinsSetting);

    // Calculate processed daily logs for entire month
    const dailySummaries: DailySummary[] = processAttendanceLogs(
      employee,
      rawLogs,
      employeeLeaves,
      startStr,
      endStr,
      holidayDates,
      effectiveGrace,
      timing.startTime,
      timing.endTime,
      complaintsList,
      approvedCorrectionsList,
      timing.isFixedHours,
      timing.totalHours,
      shiftTimings,
      employeeLoansList
    );

    // Calculate overall payroll summary
    const payrollSummary: EmployeePayrollSummary = calculateEmployeePayrollSummary(
      employee,
      rawLogs,
      employeeLeaves,
      startStr,
      endStr,
      holidayDates,
      effectiveGrace,
      timing.startTime,
      timing.endTime,
      complaintsList,
      approvedCorrectionsList,
      timing.isFixedHours,
      timing.totalHours,
      shiftTimings,
      employeeLoansList
    );

    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' });

    // Round all components
    const baseSalary = roundSalary(employee.base_salary || 0);
    const incomeTax = roundSalary(payrollSummary.incomeTax || 0);
    const loanDed = roundSalary(payrollSummary.loanDeduction || 0);
    const lateDed = roundSalary(payrollSummary.totalLateDeduction || 0);
    const absDed = roundSalary(payrollSummary.totalAbsenceDeduction || 0);
    const otPayout = roundSalary(payrollSummary.totalOvertimePayout || 0);

    // Effective Base & Company Base Cap after Tax & Loan
    const effectiveBase = Math.max(0, baseSalary - loanDed);
    const salaryAfterTax = Math.max(0, effectiveBase - incomeTax);

    // Candidate Earned Net Amount with Overtime (what candidate earned based on hours & OT)
    const earnedNetWithOt = roundSalary(payrollSummary.netPayable);

    // Over-rule: When salary + overtime exceeds base salary - tax, cap company payable at salaryAfterTax
    const companyPayableNet = Math.min(salaryAfterTax, earnedNetWithOt);
    const isOvertimeCapped = earnedNetWithOt > salaryAfterTax;
    const overtimeExcess = isOvertimeCapped ? (earnedNetWithOt - salaryAfterTax) : 0;

    return {
      startStr,
      endStr,
      divisionLabel,
      lastDay,
      monthName,
      dailySummaries,
      payrollSummary,
      timing,
      baseSalary,
      incomeTax,
      loanDed,
      lateDed,
      absDed,
      otPayout,
      effectiveBase,
      salaryAfterTax,
      earnedNetWithOt,
      companyPayableNet,
      isOvertimeCapped,
      overtimeExcess
    };
  }, [
    employee,
    selectedMonth,
    selectedYear,
    selectedDivisionId,
    salaryDivisionPlans,
    rawLogs,
    leaveRequests,
    holidaysList,
    monthlyGraceSettings,
    graceTimeMinsSetting,
    shiftTimings,
    complaintsList,
    approvedCorrectionsList,
    employeeLoansList
  ]);

  if (!isOpen || !employee || !reportData) return null;

  const {
    monthName,
    startStr,
    endStr,
    dailySummaries,
    payrollSummary,
    baseSalary,
    incomeTax,
    loanDed,
    lateDed,
    absDed,
    otPayout,
    salaryAfterTax,
    earnedNetWithOt,
    companyPayableNet,
    isOvertimeCapped,
    overtimeExcess
  } = reportData;

  const isCash = employee.payment_method === 'Cash' || (!employee.payment_method && employee.bank_name === 'Cash');

  // -------------------------------------------------------------
  // 1. PDF EXPORT (Formatted Printable Letterhead)
  // -------------------------------------------------------------
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      if (window.customAlert) window.customAlert('Please allow popups to export the PDF report.');
      return;
    }

    const rowsHtml = dailySummaries.map(d => {
      let badgeBg = '#f1f5f9';
      let badgeColor = '#475569';
      if (d.status === 'Present') {
        if (d.isLate) { badgeBg = 'rgba(245, 158, 11, 0.15)'; badgeColor = '#d97706'; }
        else { badgeBg = 'rgba(16, 185, 129, 0.12)'; badgeColor = '#059669'; }
      }
      else if (d.status === 'Absent' || d.status === 'Uninformed Absent') { badgeBg = 'rgba(239, 68, 68, 0.12)'; badgeColor = '#dc2626'; }
      else if (d.status.startsWith('Leave')) { badgeBg = 'rgba(139, 92, 246, 0.12)'; badgeColor = '#7c3aed'; }
      else if (d.status === 'Holiday') { badgeBg = 'rgba(59, 130, 246, 0.12)'; badgeColor = '#2563eb'; }
      else if (d.status === 'Off Saturday' || d.status === 'Sunday') { badgeBg = '#f3f4f6'; badgeColor = '#6b7280'; }
      else if (d.status === 'Short Time') { badgeBg = 'rgba(245, 158, 11, 0.15)'; badgeColor = '#d97706'; }

      const dateObj = new Date(d.date + 'T00:00:00');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const ded = (d.lateDeduction || 0) + (d.absenceDeduction || 0);

      return `
        <tr style="border-bottom: 1px solid #e5e7eb; font-size: 0.74rem; page-break-inside: avoid;">
          <td style="padding: 4px 6px; font-family: monospace; font-weight: 600;">${d.date}</td>
          <td style="padding: 4px 6px; color: #64748b;">${dayName}</td>
          <td style="padding: 4px 6px;">
            <span style="display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 0.7rem; font-weight: 700; background-color: ${badgeBg}; color: ${badgeColor};">
              ${d.status}
            </span>
          </td>
          <td style="padding: 4px 6px; font-family: monospace;">${d.checkIn || '-'}</td>
          <td style="padding: 4px 6px; font-family: monospace;">${d.checkOut || '-'}</td>
          <td style="padding: 4px 6px; text-align: center;">${d.workingHours > 0 ? formatClockDuration(d.workingHours) : '-'}</td>
          <td style="padding: 4px 6px; text-align: center; color: #8b5cf6;">${d.overtimeHours > 0 ? formatOvertimeDuration(d.overtimeHours) : (d.compensatedOvertimeHours > 0 ? formatOvertimeDuration(d.compensatedOvertimeHours) + ' (Comp)' : '-')}</td>
          <td style="padding: 4px 6px; text-align: center; color: #ef4444;">${d.lateMinutes > 0 ? `${d.lateMinutes}m` : '-'}</td>
          <td style="padding: 4px 6px; text-align: right; color: ${ded > 0 ? '#ef4444' : '#64748b'}; font-weight: ${ded > 0 ? '700' : 'normal'};">
            ${ded > 0 ? `- Rs. ${roundSalary(ded).toLocaleString('en-PK')}` : '-'}
          </td>
          <td style="padding: 4px 6px; text-align: right; color: ${d.overtimePayout > 0 ? '#8b5cf6' : '#64748b'}; font-weight: ${d.overtimePayout > 0 ? '700' : 'normal'};">
            ${d.overtimePayout > 0 ? `+ Rs. ${roundSalary(d.overtimePayout).toLocaleString('en-PK')}` : '-'}
          </td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Report - ${employee.full_name} (${monthName} ${selectedYear})</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
            }
            .header-banner {
              text-align: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .company-name {
              font-size: 1.5rem;
              font-weight: 800;
              letter-spacing: 1px;
              color: #0f172a;
              margin: 0;
            }
            .report-title {
              font-size: 1.05rem;
              font-weight: 600;
              color: #3b82f6;
              margin: 4px 0 0 0;
            }
            .report-subtitle {
              font-size: 0.85rem;
              color: #64748b;
              margin: 2px 0 0 0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 12px 16px;
              margin-bottom: 14px;
              font-size: 0.82rem;
            }
            .info-item {
              display: flex;
              gap: 8px;
            }
            .info-label {
              font-weight: 600;
              color: #64748b;
              min-width: 120px;
            }
            .info-val {
              font-weight: 600;
              color: #0f172a;
            }
            .stats-cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin-bottom: 14px;
            }
            .stat-card {
              background-color: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 10px;
              text-align: center;
            }
            .stat-title {
              font-size: 0.68rem;
              color: #64748b;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .stat-number {
              font-size: 0.95rem;
              font-weight: 800;
              margin-top: 2px;
              color: #0f172a;
            }
            .overrule-banner {
              background-color: #fffbeb;
              border: 1px solid #fde68a;
              border-radius: 6px;
              padding: 8px 12px;
              margin-bottom: 14px;
              font-size: 0.78rem;
              color: #b45309;
              line-height: 1.4;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }
            th {
              background-color: #0f172a;
              color: #ffffff;
              font-size: 0.74rem;
              font-weight: 700;
              padding: 7px 8px;
              text-align: left;
              letter-spacing: 0.3px;
            }
            .footer-note {
              margin-top: 14px;
              padding-top: 10px;
              border-top: 1px dashed #cbd5e1;
              font-size: 0.75rem;
              color: #64748b;
              display: flex;
              justify-content: space-between;
              align-items: center;
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1 class="company-name">ELIPSE STUDIO</h1>
            <div class="report-title">Employee Monthly Attendance & Payroll Report</div>
            <div class="report-subtitle">Period: <strong>${monthName} ${selectedYear}</strong> (${startStr} to ${endStr})</div>
          </div>

          <div class="info-grid">
            <div>
              <div class="info-item">
                <span class="info-label">Employee Name:</span>
                <span class="info-val">${employee.full_name}</span>
              </div>
              <div class="info-item" style="margin-top: 4px;">
                <span class="info-label">Device PIN:</span>
                <span class="info-val">${employee.pin}</span>
              </div>
              <div class="info-item" style="margin-top: 4px;">
                <span class="info-label">Department:</span>
                <span class="info-val">${employee.department || '-'}</span>
              </div>
              <div class="info-item" style="margin-top: 4px;">
                <span class="info-label">Designation:</span>
                <span class="info-val">${employee.designation || '-'}</span>
              </div>
              <div class="info-item" style="margin-top: 4px;">
                <span class="info-label">Payment Method:</span>
                <span class="info-val">${isCash ? 'Cash Payment' : `Bank (${employee.bank_name && employee.bank_name !== 'Cash' ? employee.bank_name : 'Meezan Bank'})`}</span>
              </div>
            </div>
            <div>
              <div class="info-item">
                <span class="info-label">Base Salary:</span>
                <span class="info-val">Rs. ${baseSalary.toLocaleString('en-PK')}</span>
              </div>
              <div class="info-item" style="margin-top: 4px;">
                <span class="info-label">Income Tax:</span>
                <span class="info-val" style="color: #ef4444;">- Rs. ${incomeTax.toLocaleString('en-PK')}</span>
              </div>
              ${loanDed > 0 ? `
              <div class="info-item" style="margin-top: 4px;">
                <span class="info-label">Loan Deduction:</span>
                <span class="info-val" style="color: #f59e0b; font-weight: 700;">- Rs. ${loanDed.toLocaleString('en-PK')}</span>
              </div>` : ''}
              <div class="info-item" style="margin-top: 4px;">
                <span class="info-label">Base After Tax (Cap):</span>
                <span class="info-val" style="color: #3b82f6;">Rs. ${salaryAfterTax.toLocaleString('en-PK')}</span>
              </div>
              <div class="info-item" style="margin-top: 4px;">
                <span class="info-label">Candidate Earned:</span>
                <span class="info-val" style="color: #8b5cf6;">Rs. ${earnedNetWithOt.toLocaleString('en-PK')} (with OT)</span>
              </div>
              <div class="info-item" style="margin-top: 4px;">
                <span class="info-label">What Company Pays:</span>
                <span class="info-val" style="color: #059669; font-size: 0.95rem;">Rs. ${companyPayableNet.toLocaleString('en-PK')}</span>
              </div>
            </div>
          </div>

          ${isOvertimeCapped ? `
          <div class="overrule-banner">
            <strong>ℹ Overtime Policy Cap Notice:</strong> Candidate earned <strong>Rs. ${earnedNetWithOt.toLocaleString('en-PK')}</strong> with overtime. In accordance with company policy, when earnings exceed base salary after tax, company disbursement is capped at <strong>Rs. ${companyPayableNet.toLocaleString('en-PK')}</strong> (Base Salary after Tax). Surplus OT: <strong>Rs. ${overtimeExcess.toLocaleString('en-PK')}</strong>.
          </div>
          ` : ''}

          <div class="stats-cards">
            <div class="stat-card">
              <div class="stat-title">Present / Total Days</div>
              <div class="stat-number" style="color: #059669;">${dailySummaries.filter(d => d.status === 'Present' || d.isLate).length} / ${dailySummaries.length}</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Absences & Leaves</div>
              <div class="stat-number" style="color: #dc2626;">${payrollSummary.absences} Abs / ${payrollSummary.leavesTaken} Lvs</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Late Arrivals</div>
              <div class="stat-number" style="color: #d97706;">${payrollSummary.lateArrivals} days (${payrollSummary.totalLateMinutes}m)</div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Overtime Payout</div>
              <div class="stat-number" style="color: #7c3aed;">${otPayout > 0 ? `+Rs. ${otPayout.toLocaleString('en-PK')}` : 'Rs. 0'}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th style="text-align: center;">Worked</th>
                <th style="text-align: center;">Overtime</th>
                <th style="text-align: center;">Late</th>
                <th style="text-align: right;">Deductions</th>
                <th style="text-align: right;">OT Payout</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; font-weight: 700; border-top: 2px solid #0f172a;">
                <td colspan="5" style="padding: 8px;">TOTAL SUMMARY (${dailySummaries.length} Days)</td>
                <td style="text-align: center; padding: 8px;">${formatClockDuration(payrollSummary.totalWorkedHours)}</td>
                <td style="text-align: center; padding: 8px; color: #7c3aed;">${formatOvertimeDuration(payrollSummary.totalOvertimeHours + payrollSummary.totalCompensatedOvertimeHours)}</td>
                <td style="text-align: center; padding: 8px; color: #ef4444;">${payrollSummary.totalLateMinutes} mins</td>
                <td style="text-align: right; padding: 8px; color: #ef4444;">- Rs. ${(lateDed + absDed + loanDed + incomeTax).toLocaleString('en-PK')}</td>
                <td style="text-align: right; padding: 8px; color: #7c3aed;">+ Rs. ${otPayout.toLocaleString('en-PK')}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer-note">
            <div>Report Generated on: ${new Date().toLocaleString()} | Elipse HR Automation</div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: #64748b;">Candidate Earned (With OT): <strong>Rs. ${earnedNetWithOt.toLocaleString('en-PK')}</strong></div>
              <div style="font-weight: 800; color: #059669; font-size: 0.95rem;">
                Company Disbursed: Rs. ${companyPayableNet.toLocaleString('en-PK')}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // -------------------------------------------------------------
  // 2. EXCEL EXPORT (.xlsx)
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    // Summary Sheet
    const summaryRows = [
      ['ELIPSE STUDIO - EMPLOYEE MONTHLY REPORT', ''],
      ['Report Period', `${monthName} ${selectedYear} (${startStr} to ${endStr})`],
      ['Generated On', new Date().toLocaleString()],
      ['', ''],
      ['EMPLOYEE DETAILS', ''],
      ['Employee Name', employee.full_name],
      ['Device PIN', employee.pin],
      ['Department', employee.department || '-'],
      ['Designation', employee.designation || '-'],
      ['Payment Method', isCash ? 'Cash Payment' : 'Bank Transfer'],
      ['Bank Name', isCash ? '-' : (employee.bank_name && employee.bank_name !== 'Cash' ? employee.bank_name : 'Meezan Bank')],
      ['Account Title', isCash ? '-' : (employee.bank_account_title || '-')],
      ['Account No', isCash ? '-' : (employee.bank_account_no || '-')],
      ['', ''],
      ['MONTHLY PAYROLL BREAKDOWN & COMPANY PAYOUT', ''],
      ['Contract Base Salary (PKR)', baseSalary],
      ['Income Tax (PKR)', incomeTax],
      ['Loan Deduction (PKR)', loanDed],
      ['Base Salary After Tax (Company Cap Limit)', salaryAfterTax],
      ['Total Overtime Hours', parseFloat((payrollSummary.totalOvertimeHours + payrollSummary.totalCompensatedOvertimeHours).toFixed(2))],
      ['Overtime Payout Earned (PKR)', otPayout],
      ['Late Deduction (PKR)', lateDed],
      ['Absence Deduction (PKR)', absDed],
      ['Candidate Total Earned with Overtime (PKR)', earnedNetWithOt],
      ['Overtime Cap Surplus / Over-limit (PKR)', overtimeExcess],
      ['FINAL COMPANY NET PAYABLE / DISBURSED (PKR)', companyPayableNet],
      ['', ''],
      ['ATTENDANCE METRICS', ''],
      ['Total Days in Month', dailySummaries.length],
      ['Present Days', dailySummaries.filter(d => d.status === 'Present' || d.isLate).length],
      ['Absent Days', payrollSummary.absences],
      ['Leaves Taken', payrollSummary.leavesTaken],
      ['Late Arrival Count', payrollSummary.lateArrivals],
      ['Total Late Minutes', payrollSummary.totalLateMinutes],
      ['Total Worked Hours', parseFloat(payrollSummary.totalWorkedHours.toFixed(2))]
    ];

    // Detailed Daily Log Sheet
    const dailyData = dailySummaries.map(d => {
      const dateObj = new Date(d.date + 'T00:00:00');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        'Date': d.date,
        'Day': dayName,
        'Status': d.status,
        'Check In': d.checkIn || '-',
        'Check Out': d.checkOut || '-',
        'Worked Hours': d.workingHours > 0 ? parseFloat(d.workingHours.toFixed(2)) : 0,
        'Overtime Hours': d.overtimeHours > 0 ? parseFloat(d.overtimeHours.toFixed(2)) : 0,
        'Compensated Hours': d.compensatedOvertimeHours > 0 ? parseFloat(d.compensatedOvertimeHours.toFixed(2)) : 0,
        'Late Minutes': d.lateMinutes || 0,
        'Late Deduction (PKR)': roundSalary(d.lateDeduction || 0),
        'Absence Deduction (PKR)': roundSalary(d.absenceDeduction || 0),
        'Overtime Payout (PKR)': roundSalary(d.overtimePayout || 0)
      };
    });

    const workbook = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    const wsDaily = XLSX.utils.json_to_sheet(dailyData);

    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Overview & Payroll');
    XLSX.utils.book_append_sheet(workbook, wsDaily, 'Daily Attendance Logs');

    const cleanName = employee.full_name.replace(/[^a-zA-Z0-9]/g, '_');
    downloadExcelWorkbook(workbook, `Monthly_Report_${cleanName}_PIN${employee.pin}_${monthName}_${selectedYear}.xlsx`);
  };

  // -------------------------------------------------------------
  // 3. WORD EXPORT (.docx)
  // -------------------------------------------------------------
  const handleExportWord = async () => {
    // Summary Table Row Builder
    const makeSummaryRow = (label: string, val: string, isBold: boolean = false, isGreen: boolean = false) => new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: '475569' })] })],
          width: { size: 50, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: val, bold: isBold, size: 18, color: isGreen ? '059669' : '0F172A' })] })],
          width: { size: 50, type: WidthType.PERCENTAGE }
        })
      ]
    });

    const summaryTable = new Table({
      rows: [
        makeSummaryRow('Employee Name', employee.full_name, true),
        makeSummaryRow('Device PIN', employee.pin),
        makeSummaryRow('Department', employee.department || '-'),
        makeSummaryRow('Designation', employee.designation || '-'),
        makeSummaryRow('Base Salary', `PKR ${baseSalary.toLocaleString('en-PK')}`),
        makeSummaryRow('Income Tax', `PKR ${incomeTax.toLocaleString('en-PK')}`),
        makeSummaryRow('Base Salary After Tax (Company Cap)', `PKR ${salaryAfterTax.toLocaleString('en-PK')}`),
        makeSummaryRow('Overtime Payout Earned', `PKR ${otPayout.toLocaleString('en-PK')}`),
        makeSummaryRow('Late Deduction', `PKR ${lateDed.toLocaleString('en-PK')}`),
        makeSummaryRow('Absence Deduction', `PKR ${absDed.toLocaleString('en-PK')}`),
        makeSummaryRow('Loan Deduction', `PKR ${loanDed.toLocaleString('en-PK')}`),
        makeSummaryRow('Candidate Earned (With OT)', `PKR ${earnedNetWithOt.toLocaleString('en-PK')}`, true),
        ...(isOvertimeCapped ? [
          makeSummaryRow('Overtime Cap Adjustment', `- PKR ${overtimeExcess.toLocaleString('en-PK')} (Capped at Base After Tax)`)
        ] : []),
        makeSummaryRow('What Company Pays (Net Disbursed)', `PKR ${companyPayableNet.toLocaleString('en-PK')}`, true, true),
        makeSummaryRow('Present Days / Total Days', `${dailySummaries.filter(d => d.status === 'Present' || d.isLate).length} / ${dailySummaries.length}`),
        makeSummaryRow('Absences & Leaves', `${payrollSummary.absences} Absences, ${payrollSummary.leavesTaken} Leaves`),
        makeSummaryRow('Late Arrivals', `${payrollSummary.lateArrivals} Days (${payrollSummary.totalLateMinutes} mins)`)
      ],
      width: { size: 100, type: WidthType.PERCENTAGE }
    });

    // Daily Table Header
    const dailyHeaders = ['Date', 'Day', 'Status', 'Check In', 'Check Out', 'Worked', 'OT (hrs)', 'Late (m)', 'Deduction'];
    const dailyHeaderRow = new TableRow({
      children: dailyHeaders.map(text => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 16 })] })],
        shading: { fill: '0F172A' }
      }))
    });

    const dailyRows = dailySummaries.map(d => {
      const dateObj = new Date(d.date + 'T00:00:00');
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const ded = (d.lateDeduction || 0) + (d.absenceDeduction || 0);

      return new TableRow({
        children: [
          d.date,
          dayName,
          d.status,
          d.checkIn || '-',
          d.checkOut || '-',
          d.workingHours > 0 ? formatClockDuration(d.workingHours) : '-',
          d.overtimeHours > 0 ? d.overtimeHours.toFixed(1) : '-',
          d.lateMinutes > 0 ? `${d.lateMinutes}` : '-',
          ded > 0 ? `PKR ${roundSalary(ded).toLocaleString('en-PK')}` : '-'
        ].map(text => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, size: 16 })] })]
        }))
      });
    });

    const dailyTable = new Table({
      rows: [dailyHeaderRow, ...dailyRows],
      width: { size: 100, type: WidthType.PERCENTAGE }
    });

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [new TextRun({ text: 'ELIPSE STUDIO (PVT) LTD.', bold: true, size: 30, color: '0F172A' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Monthly Attendance & Payroll Report — ${monthName} ${selectedYear}`, bold: true, size: 22, color: '3B82F6' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({
            children: [new TextRun({ text: `Report Range: ${startStr} to ${endStr} | Generated on: ${new Date().toLocaleString()}`, size: 16, color: '64748B' })],
            alignment: AlignmentType.CENTER
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: 'Employee Summary & Payroll Breakdown', bold: true, size: 20, color: '0F172A' })]
          }),
          summaryTable,
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: 'Daily Attendance Breakdown', bold: true, size: 20, color: '0F172A' })]
          }),
          dailyTable
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const cleanName = employee.full_name.replace(/[^a-zA-Z0-9]/g, '_');
    downloadBlobFile(blob, `Monthly_Report_${cleanName}_PIN${employee.pin}_${monthName}_${selectedYear}.docx`);
  };

  // Main Download Trigger
  const handleDownload = async () => {
    setIsExporting(true);
    if (window.showLoading) window.showLoading(`Exporting report as ${exportFormat.toUpperCase()}...`);
    try {
      if (exportFormat === 'pdf') {
        handleExportPDF();
      } else if (exportFormat === 'excel') {
        handleExportExcel();
      } else if (exportFormat === 'word') {
        await handleExportWord();
      }
      if (window.customAlert) {
        window.customAlert(`Monthly report for ${employee.full_name} (${monthName} ${selectedYear}) generated successfully!`);
      }
      onClose();
    } catch (err: any) {
      if (window.customAlert) window.customAlert(`Failed to generate report: ${err.message || 'Unknown error'}`);
    } finally {
      if (window.hideLoading) window.hideLoading();
      setIsExporting(false);
    }
  };

  return (
    <div
      className="custom-overlay"
      onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
      onClick={e => {
        if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
          onClose();
        }
      }}
      style={getModalOverlayStyle(11500)}
    >
      <div
        className="custom-dialog-card glass-panel"
        style={{ maxWidth: '580px', width: '94%', textAlign: 'left', alignItems: 'stretch', padding: '24px' }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/icons/download.png" alt="export" className="theme-icon" style={{ width: '18px', height: '18px' }} />
            <span>Employee Monthly Report</span>
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Employee Banner */}
        <div style={{ background: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                {employee.full_name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                PIN: <strong>{employee.pin}</strong> · {employee.department || 'General'} · {employee.designation || 'Staff'}
              </div>
              {loanDed > 0 && (
                <div style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  Active Loan Deduction: - Rs. {loanDed.toLocaleString('en-PK')}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Company Payout</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success)' }}>
                Rs. {companyPayableNet.toLocaleString('en-PK')}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Earned with OT: <strong style={{ color: '#8b5cf6' }}>Rs. {earnedNetWithOt.toLocaleString('en-PK')}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Overtime Cap Notice */}
        {isOvertimeCapped && (
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: '14px', fontSize: '0.78rem', color: 'var(--text-primary)' }}>
            <span style={{ color: '#f59e0b', fontWeight: 700 }}>ℹ Overtime Cap Rule Active: </span>
            Candidate earned <strong>Rs. {earnedNetWithOt.toLocaleString()}</strong> with overtime. Company payment is capped at Base Salary after tax (<strong>Rs. {companyPayableNet.toLocaleString()}</strong>).
          </div>
        )}

        {/* Month & Year Selectors */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value, 10))}
              className="custom-select"
              style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>
          <div style={{ width: '120px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Year
            </label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value, 10))}
              className="custom-select"
              style={{ width: '100%', padding: '9px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Saved Division Plan Selector (if active for this month) */}
        {(() => {
          const pad = (num: number) => num.toString().padStart(2, '0');
          const curMonthKey = `${selectedYear}-${pad(selectedMonth + 1)}`;
          const plan = salaryDivisionPlans[curMonthKey];
          const todayStr = new Date().toISOString().split('T')[0];

          if (!plan || !plan.divisions || plan.divisions.length === 0) return null;

          return (
            <div style={{ marginBottom: '14px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', marginBottom: '6px' }}>
                📅 Monthly Division / Advance Tranches:
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDivisionId('full')}
                  className={`btn ${selectedDivisionId === 'full' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '4px 10px', fontSize: '0.74rem', fontWeight: selectedDivisionId === 'full' ? 700 : 500 }}
                >
                  ● Full Month
                </button>
                {plan.divisions.map((d: any, idx: number) => {
                  const isSelected = selectedDivisionId === (d.id || `div-${idx + 1}`);
                  const isFuture = d.endDate > todayStr;

                  return (
                    <button
                      key={d.id || idx}
                      type="button"
                      disabled={isFuture}
                      onClick={() => setSelectedDivisionId(d.id || `div-${idx + 1}`)}
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: isSelected ? 700 : 500,
                        opacity: isFuture ? 0.45 : 1,
                        cursor: isFuture ? 'not-allowed' : 'pointer'
                      }}
                      title={isFuture ? `End date (${d.endDate}) has not arrived yet` : d.name}
                    >
                      <span>{d.name || `Div #${idx + 1}`} ({d.startDate.slice(5)} → {d.endDate.slice(5)})</span>
                      {isFuture && <span style={{ marginLeft: '4px', fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>(Future)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Monthly Quick KPI Badges */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
          <div style={{ padding: '8px 6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 600 }}>Present Days</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {dailySummaries.filter(d => d.status === 'Present' || d.isLate).length} / {dailySummaries.length}
            </div>
          </div>
          <div style={{ padding: '8px 6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 600 }}>Abs / Leaves</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {payrollSummary.absences} / {payrollSummary.leavesTaken}
            </div>
          </div>
          <div style={{ padding: '8px 6px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>Late Minutes</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {payrollSummary.totalLateMinutes}m
            </div>
          </div>
          <div style={{ padding: '8px 6px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: '#8b5cf6', fontWeight: 600 }}>Overtime</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              +Rs. {otPayout.toLocaleString('en-PK')}
            </div>
          </div>
        </div>

        {/* Format Selector */}
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Choose Export Format
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {[
            { id: 'pdf', title: 'PDF Document (.pdf)', desc: 'Printable letterhead statement with company pay vs candidate earned' },
            { id: 'excel', title: 'Excel Spreadsheet (.xlsx)', desc: 'Multi-sheet workbook with full overview breakdown & daily logs' },
            { id: 'word', title: 'Word Document (.docx)', desc: 'Formatted Microsoft Word report with summary & log tables' }
          ].map(opt => (
            <label
              key={opt.id}
              onClick={() => setExportFormat(opt.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: exportFormat === opt.id ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                background: exportFormat === opt.id ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface-hover)',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              <input
                type="radio"
                name="employeeReportFormat"
                checked={exportFormat === opt.id}
                onChange={() => setExportFormat(opt.id as any)}
                style={{ cursor: 'pointer' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{opt.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px 18px' }}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="btn btn-primary"
            style={{ padding: '8px 22px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            disabled={isExporting}
          >
            <img src="/icons/download.png" alt="download" className="theme-icon" style={{ width: '14px', height: '14px' }} />
            <span>Download Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
