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
  bonusAmount?: number;
  totalPayable: number;
}

export function exportPayrollToPdf(rows: PayrollExportRow[], monthYear: string, options?: { isBonusOnly?: boolean }) {
  const isBonusOnly = options?.isBonusOnly || false;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  if (isBonusOnly) {
    // Bonus & Expense Statement Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(`ELIPSE HR - Bonus & Expense Statement (${monthYear})`, 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Employees: ${rows.length}`, 14, 22);

    const totalBonus = rows.reduce((s, r) => s + roundSalary(r.bonusAmount || 0), 0);
    const totalBase = rows.reduce((s, r) => s + roundSalary(r.baseSalary || 0), 0);

    doc.setFillColor(241, 245, 249);
    doc.rect(14, 26, 269, 12, 'F');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Total Employees: ${rows.length}   |   Total Base Salary: PKR ${totalBase.toLocaleString('en-PK')}   |   Total Bonus / Expenses: PKR ${totalBonus.toLocaleString('en-PK')}`,
      18,
      34
    );

    const tableColumn = [
      'PIN',
      'Employee Name',
      'Department',
      'Designation',
      'Base Salary (PKR)',
      'Bonus / Expense (+PKR)',
      'Remarks / Status'
    ];

    const tableRows = rows.map(r => [
      r.pin,
      r.name,
      r.department || '-',
      r.designation || '-',
      `PKR ${roundSalary(r.baseSalary).toLocaleString('en-PK')}`,
      `PKR ${roundSalary(r.bonusAmount || 0).toLocaleString('en-PK')}`,
      'Approved for Payout'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Bonus_Expense_Statement_${monthYear.replace(/ /g, '_')}.pdf`);
    return;
  }

  // Full Payroll Statement Header
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
  const totalBonus = rows.reduce((s, r) => s + roundSalary(r.bonusAmount || 0), 0);
  const totalLateDed = rows.reduce((s, r) => s + roundSalary(r.totalLateDeduction || 0), 0);
  const totalAbsDed = rows.reduce((s, r) => s + roundSalary(r.totalAbsenceDeduction || 0), 0);
  const totalLoanDed = rows.reduce((s, r) => s + roundSalary(r.loanDeduction || 0), 0);

  doc.setFillColor(241, 245, 249);
  doc.rect(14, 26, 269, 14, 'F');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Base Salary: PKR ${totalBase.toLocaleString('en-PK')}  |  OT: +PKR ${totalOvertime.toLocaleString('en-PK')}  |  Bonus: +PKR ${totalBonus.toLocaleString('en-PK')}  |  Late: -PKR ${totalLateDed.toLocaleString('en-PK')}  |  Abs: -PKR ${totalAbsDed.toLocaleString('en-PK')}  |  Loan: -PKR ${totalLoanDed.toLocaleString('en-PK')}  |  Net: PKR ${totalPayable.toLocaleString('en-PK')}`,
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
    'Bonus (+PKR)',
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
    `PKR ${roundSalary(r.bonusAmount || 0).toLocaleString('en-PK')}`,
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
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`Payroll_Statement_${monthYear.replace(/ /g, '_')}.pdf`);
}

export function exportPayrollToExcel(rows: PayrollExportRow[], monthYear: string, options?: { isBonusOnly?: boolean }) {
  const isBonusOnly = options?.isBonusOnly || false;

  const excelData = isBonusOnly
    ? rows.map(r => ({
        'Employee PIN': r.pin,
        'Employee Name': r.name,
        'Department': r.department || '-',
        'Designation': r.designation || '-',
        'Base Salary (PKR)': roundSalary(r.baseSalary),
        'Bonus / Expense Amount (PKR)': roundSalary(r.bonusAmount || 0),
        'Status': 'Approved'
      }))
    : rows.map(r => ({
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
        'Overtime Payout (PKR)': roundSalary(r.overtimePayout),
        'Bonus / Expense (PKR)': roundSalary(r.bonusAmount || 0),
        'Late Deduction (PKR)': roundSalary(r.totalLateDeduction),
        'Absence Deduction (PKR)': roundSalary(r.totalAbsenceDeduction),
        'Loan Deduction (PKR)': roundSalary(r.loanDeduction || 0),
        'Base Salary (PKR)': roundSalary(r.baseSalary),
        'Net Payable (PKR)': roundSalary(r.totalPayable)
      }));

  const sheetName = isBonusOnly ? 'Bonus & Expenses' : 'Payroll Summary';
  const fileName = isBonusOnly ? `Bonus_Expense_Summary_${monthYear.replace(/ /g, '_')}.xlsx` : `Payroll_Summary_${monthYear.replace(/ /g, '_')}.xlsx`;

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  downloadExcelWorkbook(workbook, fileName);
}

export async function exportPayrollToWord(rows: PayrollExportRow[], monthYear: string, options?: { isBonusOnly?: boolean }) {
  const isBonusOnly = options?.isBonusOnly || false;

  const titleText = isBonusOnly ? `ELIPSE HR - Bonus & Expense Statement (${monthYear})` : `ELIPSE HR - Payroll Statement (${monthYear})`;
  const fileName = isBonusOnly ? `Bonus_Expense_Statement_${monthYear.replace(/ /g, '_')}.docx` : `Payroll_Statement_${monthYear.replace(/ /g, '_')}.docx`;

  const headers = isBonusOnly
    ? ['PIN', 'Name', 'Department', 'Designation', 'Base Salary', 'Bonus / Expense', 'Status']
    : ['PIN', 'Name', 'Dept', 'Present', 'Late (m)', 'Abs', 'OT Payout', 'Bonus', 'Late Ded', 'Abs Ded', 'Loan Ded', 'Net Payable'];

  const headerRow = new TableRow({
    children: headers.map(text => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 16 })] })],
      shading: { fill: '1E293B' },
      width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE }
    }))
  });

  const dataRows = rows.map(r => new TableRow({
    children: (isBonusOnly ? [
      r.pin,
      r.name,
      r.department || '-',
      r.designation || '-',
      `PKR ${roundSalary(r.baseSalary).toLocaleString('en-PK')}`,
      `PKR ${roundSalary(r.bonusAmount || 0).toLocaleString('en-PK')}`,
      'Approved'
    ] : [
      r.pin,
      r.name,
      r.department || '-',
      `${r.presentDays}/${r.totalWorkingDays}`,
      `${r.totalLateMinutes}m`,
      `${r.absences}d`,
      `PKR ${roundSalary(r.overtimePayout).toLocaleString('en-PK')}`,
      `PKR ${roundSalary(r.bonusAmount || 0).toLocaleString('en-PK')}`,
      `PKR ${roundSalary(r.totalLateDeduction).toLocaleString('en-PK')}`,
      `PKR ${roundSalary(r.totalAbsenceDeduction).toLocaleString('en-PK')}`,
      `PKR ${(r.loanDeduction || 0).toLocaleString('en-PK')}`,
      `PKR ${roundSalary(r.totalPayable).toLocaleString('en-PK')}`
    ]).map(text => new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, size: 16 })] })],
      width: { size: Math.floor(100 / headers.length), type: WidthType.PERCENTAGE }
    }))
  }));

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: titleText, bold: true, size: 28, color: '1E293B' })],
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
  downloadBlobFile(blob, fileName);
}

export function exportPayrollToCsv(rows: PayrollExportRow[], monthYear: string, options?: { isBonusOnly?: boolean }) {
  const isBonusOnly = options?.isBonusOnly || false;

  if (isBonusOnly) {
    const headers = [
      'Employee PIN', 'Employee Name', 'Department', 'Designation', 'Base Salary (PKR)', 'Bonus / Expense Amount (PKR)', 'Status'
    ];

    const csvRows = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.pin}"`, `"${r.name}"`, `"${r.department || '-'}"`, `"${r.designation || '-'}"`,
        roundSalary(r.baseSalary), roundSalary(r.bonusAmount || 0), '"Approved"'
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlobFile(blob, `Bonus_Expense_Summary_${monthYear.replace(/ /g, '_')}.csv`);
    return;
  }

  const headers = [
    'Employee PIN', 'Employee Name', 'Department', 'Designation', 'Total Working Days', 'Present Days',
    'Late Arrivals (Days)', 'Total Late Minutes', 'Absence (Days)', 'Overtime Hours', 'Compensated OT Hours',
    'Overtime Payout (PKR)', 'Bonus / Expense (PKR)', 'Late Deduction (PKR)', 'Absence Deduction (PKR)', 'Loan Deduction (PKR)',
    'Base Salary (PKR)', 'Net Payable (PKR)'
  ];

  const csvRows = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.pin}"`, `"${r.name}"`, `"${r.department || '-'}"`, `"${r.designation || '-'}"`,
      r.totalWorkingDays, r.presentDays, r.lateArrivals, r.totalLateMinutes, r.absences,
      r.totalOvertimeHours, r.totalCompensatedOvertimeHours, roundSalary(r.overtimePayout),
      roundSalary(r.bonusAmount || 0), roundSalary(r.totalLateDeduction), roundSalary(r.totalAbsenceDeduction),
      roundSalary(r.loanDeduction || 0), roundSalary(r.baseSalary), roundSalary(r.totalPayable)
    ].join(','))
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  downloadBlobFile(blob, `Payroll_Summary_${monthYear.replace(/ /g, '_')}.csv`);
}
