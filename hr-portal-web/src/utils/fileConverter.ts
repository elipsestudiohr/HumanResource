import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Initialize local PDF.js worker via Vite URL bundler
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Converts an uploaded Excel (.xlsx, .xls, .csv) file to a PDF report
 */
export async function convertExcelToPdf(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('The uploaded Excel file contains no readable data.');
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`Converted Document: ${file.name.replace(/\.[^/.]+$/, '')}`, 14, 16);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Original File: ${file.name} | Sheet: ${sheetName} | Converted on: ${new Date().toLocaleString()}`, 14, 22);

  const head = jsonData[0] ? jsonData[0].map(c => String(c ?? '')) : [];
  const body = jsonData.slice(1).map(row => row.map(cell => String(cell ?? '')));

  autoTable(doc, {
    head: [head],
    body: body,
    startY: 28,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`${file.name.replace(/\.[^/.]+$/, '')}_converted.pdf`);
}

/**
 * Converts an uploaded PDF file into an Excel (.xlsx) spreadsheet
 */
export async function convertPdfToExcel(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const extractedRows: string[][] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by their vertical Y position to recreate lines/rows
    const lineMap: { [y: number]: { x: number; text: string }[] } = {};

    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      // Round Y coordinate to group items on roughly the same text line
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      if (!lineMap[y]) lineMap[y] = [];
      lineMap[y].push({ x, text: item.str });
    }

    // Sort lines from top to bottom
    const sortedY = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
    for (const y of sortedY) {
      const lineItems = lineMap[y].sort((a, b) => a.x - b.x);
      const rowText = lineItems.map(i => i.text.trim());
      if (rowText.length > 0) {
        extractedRows.push(rowText);
      }
    }
  }

  if (extractedRows.length === 0) {
    throw new Error('Could not extract tabular text from the PDF file.');
  }

  const worksheet = XLSX.utils.aoa_to_sheet(extractedRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Converted PDF Data');

  XLSX.writeFile(workbook, `${file.name.replace(/\.[^/.]+$/, '')}_converted.xlsx`);
}

/**
 * Converts Word (.docx) or Text file to PDF
 */
export async function convertWordToPdf(file: File): Promise<void> {
  const text = await file.text();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`Converted Document: ${file.name.replace(/\.[^/.]+$/, '')}`, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Converted on: ${new Date().toLocaleString()}`, 14, 22);

  // Clean raw printable text into lines
  const cleanLines = text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .split('\n')
    .filter(l => l.trim().length > 0);

  let y = 30;
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  for (const line of cleanLines) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line.substring(0, 110), 14, y);
    y += 6;
  }

  doc.save(`${file.name.replace(/\.[^/.]+$/, '')}_converted.pdf`);
}

/**
 * Converts Word (.docx) or Text file to Excel (.xlsx)
 */
export async function convertWordToExcel(file: File): Promise<void> {
  const text = await file.text();
  const cleanLines = text
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .split('\n')
    .filter(l => l.trim().length > 0);

  const rows = cleanLines.map(line => {
    if (line.includes('\t')) return line.split('\t');
    if (line.includes(',')) return line.split(',');
    return [line];
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Converted Word Data');

  XLSX.writeFile(workbook, `${file.name.replace(/\.[^/.]+$/, '')}_converted.xlsx`);
}

/**
 * Converts PDF file to Word (.docx)
 */
export async function convertPdfToWord(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const paragraphs: Paragraph[] = [];

  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: `Converted Document: ${file.name.replace(/\.[^/.]+$/, '')}`, bold: true, size: 28, color: '1E293B' })]
  }));
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: `Converted on: ${new Date().toLocaleString()}`, size: 18, color: '64748B' })]
  }));
  paragraphs.push(new Paragraph({ text: '' }));

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const lineMap: { [y: number]: string[] } = {};
    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap[y]) lineMap[y] = [];
      lineMap[y].push(item.str.trim());
    }

    const sortedY = Object.keys(lineMap).map(Number).sort((a, b) => b - a);
    for (const y of sortedY) {
      const lineText = lineMap[y].join(' ');
      if (lineText) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: lineText, size: 20 })]
        }));
      }
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${file.name.replace(/\.[^/.]+$/, '')}_converted.docx`;
  link.click();
  URL.revokeObjectURL(url);
}
