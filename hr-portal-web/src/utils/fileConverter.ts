import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import { downloadBlobFile, downloadExcelWorkbook } from './downloadHelper';

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

  downloadExcelWorkbook(workbook, `${file.name.replace(/\.[^/.]+$/, '')}_converted.xlsx`);
}

/**
 * Converts Word (.docx) or Text file to PDF
 */
export async function convertWordToPdf(file: File): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  let text = '';

  try {
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    text = textResult.value || '';
  } catch (e) {
    text = await file.text();
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(`Converted Document: ${file.name.replace(/\.[^/.]+$/, '')}`, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Converted on: ${new Date().toLocaleString()}`, 14, 22);

  const cleanLines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

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
  const arrayBuffer = await file.arrayBuffer();
  let extractedRows: string[][] = [];

  try {
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const html = htmlResult.value;

    if (html && html.includes('<table')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const tables = doc.querySelectorAll('table');

      tables.forEach(table => {
        const trs = table.querySelectorAll('tr');
        trs.forEach(tr => {
          const rowCells: string[] = [];
          const tds = tr.querySelectorAll('td, th');
          tds.forEach(cell => {
            rowCells.push((cell.textContent || '').trim());
          });
          if (rowCells.some(c => c.length > 0)) {
            extractedRows.push(rowCells);
          }
        });
      });
    }
  } catch (e) {
    console.warn('Mammoth HTML conversion fallback:', e);
  }

  // Fallback if no HTML table exists or file is plain text
  if (extractedRows.length === 0) {
    try {
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const rawText = textResult.value || '';
      const lines = rawText.split('\n').filter(l => l.trim().length > 0);
      extractedRows = lines.map(line => {
        if (line.includes('\t')) return line.split('\t').map(s => s.trim());
        if (line.includes(',')) return line.split(',').map(s => s.trim());
        return [line.trim()];
      });
    } catch (e) {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      extractedRows = lines.map(line => [line.trim()]);
    }
  }

  if (extractedRows.length === 0) {
    throw new Error('No readable text or table content found in the Word file.');
  }

  const worksheet = XLSX.utils.aoa_to_sheet(extractedRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Converted Word Data');

  downloadExcelWorkbook(workbook, `${file.name.replace(/\.[^/.]+$/, '')}_converted.xlsx`);
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
  downloadBlobFile(blob, `${file.name.replace(/\.[^/.]+$/, '')}_converted.docx`);
}
