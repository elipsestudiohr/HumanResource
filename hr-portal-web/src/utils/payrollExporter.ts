import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType } from 'docx';
import { downloadBlobFile, downloadExcelWorkbook } from './downloadHelper';
import { roundSalary } from './attendanceProcessor';

export interface PayrollExportRow {
  pin: string;
  name: string;
  department: string;
  designation: string;
  totalWorkingDays: number;
  presentDays: number;
  lateArrivals: number;
  totalLateMinutes: number;
  absences: number;
  totalOvertimeHours: number;
  totalCompensatedOvertimeHours: number;
  overtimePayout: number;
  totalLateDeduction: number;
  totalAbsenceDeduction: number;
  loanDeduction: number;
  baseSalary: number;
  totalPayable: number;
}

export function exportPayrollToPdf(rows: PayrollExportRow[], monthYear: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Title
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(`ELIPSE HR - Payroll Statement (${monthYear})`, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleString()} | Total Employees: ${rows.length}`, 14, 22);

  // Summary statistics
  const totalBase = rows.reduce((s, r) => s + roundSalary(r.baseSalary || 0), 0);
  const totalPayable = rows.reduce((s, r) => s + roundSalary(r.totalPayable || 0), 0);
  const totalOvertime = rows.reduce((s, r) => s + roundSalary(r.overtimePayout || 0), 0);
  const totalLateDed = rows.reduce((s, r) => s + roundSalary(r.totalLateDeduction || 0), 0);
  const totalAbsDed = rows.reduce((s, r) => s + roundSalary(r.totalAbsenceDeduction || 0), 0);
  const totalLoanDed = rows.reduce((s, r) => s + roundSalary(r.loanDeduction || 0), 0);

  doc.setFillColor(241, 245, 249);
  doc.rect(14, 26, 269, 14, 'F');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Base Salary: PKR ${totalBase.toLocaleString('en-PK')}   |   Overtime: +PKR ${totalOvertime.toLocaleString('en-PK')}   |   Late Ded: -PKR ${totalLateDed.toLocaleString('en-PK')}   |   Absence Ded: -PKR ${totalAbsDed.toLocaleString('en-PK')}   |   Loan Ded: -PKR ${totalLoanDed.toLocaleString('en-PK')}   |   Net Payable: PKR ${totalPayable.toLocaleString('en-PK')}`,
    18,
    35
  );

  const tableColumn = [
    'PIN',
    'Employee',
    'Department',
    'Present/Total',
    'Late Mins',
    'Absences',
    'Overtime (+PKR)',
    'Late Ded (-PKR)',
    'Abs Ded (-PKR)',
    'Loan Ded (-PKR)',
    'Base Salary',
    'Net Payable'
  ];

  const tableRows = rows.map(r => [
    r.pin,
    r.name,
    r.department || '-',
    `${r.presentDays}/${r.totalWorkingDays}`,
    `${r.totalLateMinutes}m (${r.lateArrivals}d)`,
    `${r.absences}d`,
    `PKR ${roundSalary(r.overtimePayout).toLocaleString('en-PK')}`,
    `PKR ${roundSalary(r.totalLateDeduction).toLocaleString('en-PK')}`,
    `PKR ${roundSalary(r.totalAbsenceDeduction).toLocaleString('en-PK')}`,
    `PKR ${roundSalary(r.loanDeduction || 0).toLocaleString('en-PK')}`,
    `PKR ${roundSalary(r.baseSalary).toLocaleString('en-PK')}`,
    `PKR ${roundSalary(r.totalPayable).toLocaleString('en-PK')}`
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 44,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`Payroll_Statement_${monthYear.replace(/ /g, '_')}.pdf`);
}

export function exportPayrollToExcel(rows: PayrollExportRow[], monthYear: string) {
  const excelData = rows.map(r => ({
    'Employee PIN': r.pin,
    'Employee Name': r.name,
    'Department': r.department || '-',
    'Designation': r.designation || '-',
    'Total Working Days': r.totalWorkingDays,
    'Present Days': r.presentDays,
    'Late Arrivals (Days)': r.lateArrivals,
    'Total Late (Minutes)': r.totalLateMinutes,
    'Absence (Days)': r.absences,
    'Overtime (Hours)': r.totalOvertimeHours,
    'Compensated OT (Hours)': r.totalCompensatedOvertimeHours,
    'Overtime Payout (PKR)': r.overtimePayout,
    'Late Deduction (PKR)': r.totalLateDeduction,
    'Absence Deduction (PKR)': r.totalAbsenceDeduction,
    'Loan Deduction (PKR)': r.loanDeduction || 0,
    'Base Salary (PKR)': r.baseSalary,
    'Net Payable (PKR)': r.totalPayable
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Summary');

  downloadExcelWorkbook(workbook, `Payroll_Summary_${monthYear.replace(/ /g, '_')}.xlsx`);
}

export async function exportPayrollToWord(rows: PayrollExportRow[], monthYear: string) {
  const headerRow = new TableRow({
    children: [
      'PIN', 'Name', 'Dept', 'Present', 'Late (m)', 'Abs', 'OT Payout', 'Late Ded', 'Abs Ded', 'Loan Ded', 'Net Payable'
    ].map(text => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 16 })] })],
      shading: { fill: '1E293B' },
      width: { size: 9, type: WidthType.PERCENTAGE }
    }))
  });

  const dataRows = rows.map(r => new TableRow({
    children: [
      r.pin,
      r.name,
      r.department || '-',
      `${r.presentDays}/${r.totalWorkingDays}`,
      `${r.totalLateMinutes}m`,
      `${r.absences}d`,
      `PKR ${r.overtimePayout.toLocaleString('en-PK')}`,
      `PKR ${r.totalLateDeduction.toLocaleString('en-PK')}`,
      `PKR ${r.totalAbsenceDeduction.toLocaleString('en-PK')}`,
      `PKR ${(r.loanDeduction || 0).toLocaleString('en-PK')}`,
      `PKR ${r.totalPayable.toLocaleString('en-PK')}`
    ].map(text => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, size: 16 })] })],
      width: { size: 9, type: WidthType.PERCENTAGE }
    }))
  }));

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: `ELIPSE HR - Payroll Statement (${monthYear})`, bold: true, size: 28, color: '1E293B' })],
          alignment: AlignmentType.LEFT
        }),
        new Paragraph({
          children: [new TextRun({ text: `Generated on: ${new Date().toLocaleString()} | Total Employees: ${rows.length}`, size: 18, color: '64748B' })]
        }),
        new Paragraph({ text: '' }),
        new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 100, type: WidthType.PERCENTAGE }
        })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  downloadBlobFile(blob, `Payroll_Statement_${monthYear.replace(/ /g, '_')}.docx`);
}

export function exportPayrollToCsv(rows: PayrollExportRow[], monthYear: string) {
  const headers = [
    'Employee PIN', 'Employee Name', 'Department', 'Designation', 'Total Working Days', 'Present Days',
    'Late Arrivals (Days)', 'Total Late Minutes', 'Absence (Days)', 'Overtime Hours', 'Compensated OT Hours',
    'Overtime Payout (PKR)', 'Late Deduction (PKR)', 'Absence Deduction (PKR)', 'Loan Deduction (PKR)',
    'Base Salary (PKR)', 'Net Payable (PKR)'
  ];

  const csvRows = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.pin}"`, `"${r.name}"`, `"${r.department || '-'}"`, `"${r.designation || '-'}"`,
      r.totalWorkingDays, r.presentDays, r.lateArrivals, r.totalLateMinutes, r.absences,
      r.totalOvertimeHours, r.totalCompensatedOvertimeHours, r.overtimePayout,
      r.totalLateDeduction, r.totalAbsenceDeduction, r.loanDeduction || 0,
      r.baseSalary, r.totalPayable
    ].join(','))
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlobFile(blob, `Payroll_Summary_${monthYear.replace(/ /g, '_')}.csv`);
}
