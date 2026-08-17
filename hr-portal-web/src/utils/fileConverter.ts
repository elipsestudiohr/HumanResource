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

export interface PdfExportOptions {
  useLetterhead?: boolean;
  itemsPerPage?: string; // '1' | '2' | '5' | '10' | '15' | '18' | '20' | '25' | 'auto'
}

/**
 * Converts an uploaded Excel (.xlsx, .xls, .csv) file to a PDF report
 */
export async function convertExcelToPdf(file: File, options?: PdfExportOptions): Promise<void> {
  const useLetterhead = options?.useLetterhead ?? true;
  const itemsPerPageStr = options?.itemsPerPage || '18';

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('The uploaded Excel file contains no readable data.');
  }

  const head = jsonData[0] ? jsonData[0].map(c => String(c ?? '')) : [];
  const bodyRows = jsonData.slice(1).filter(r => r.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''));

  if (!useLetterhead) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    autoTable(doc, {
      head: [head],
      body: bodyRows.map(row => row.map(cell => String(cell ?? ''))),
      startY: 15,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });
    doc.save(`${file.name.replace(/\.[^/.]+$/, '')}_converted.pdf`);
    return;
  }

  // Official Letterhead (Salry.png) Print Preview Mode
  let chunkSize = 18;
  if (itemsPerPageStr === 'auto') {
    chunkSize = bodyRows.length > 0 ? bodyRows.length : 1;
  } else {
    chunkSize = parseInt(itemsPerPageStr, 10) || 18;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to open the PDF print preview window.');
  }

  const pagesHtml: string[] = [];

  for (let i = 0; i < bodyRows.length; i += chunkSize) {
    const chunk = bodyRows.slice(i, i + chunkSize);
    const count = chunk.length;

    let cPad = '6px 8px';
    let fSize = '0.80rem';
    let hPad = '8px 8px';
    let hFSize = '0.78rem';

    if (count <= 2) {
      cPad = '16px 12px'; fSize = '0.95rem'; hPad = '12px 12px'; hFSize = '0.88rem';
    } else if (count <= 6) {
      cPad = '12px 10px'; fSize = '0.88rem'; hPad = '10px 10px'; hFSize = '0.82rem';
    } else if (count <= 10) {
      cPad = '9px 8px'; fSize = '0.84rem'; hPad = '8px 8px'; hFSize = '0.80rem';
    } else if (count <= 15) {
      cPad = '6px 8px'; fSize = '0.79rem'; hPad = '7px 8px'; hFSize = '0.77rem';
    } else {
      cPad = '4px 6px'; fSize = '0.74rem'; hPad = '5px 6px'; hFSize = '0.73rem';
    }

    const thsHtml = head.map(h => `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; border-bottom: 2px solid #1e293b; background: #f8fafc;">${h}</th>`).join('');

    const trsHtml = chunk.map(row => {
      const tds = row.map(cell => `<td style="padding: ${cPad}; font-size: ${fSize}; border-bottom: 1px solid #e2e8f0;">${String(cell ?? '')}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    pagesHtml.push(`
      <div class="page-container">
        <div class="letterhead-bg"></div>
        <div class="letter-content" style="padding: 260px 45px 210px 45px !important; box-sizing: border-box !important; height: 1120px !important; overflow: hidden !important;">
          <div style="height: 650px !important; min-height: 650px !important; max-height: 650px !important; display: flex; flex-direction: column; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 0; table-layout: auto;">
              <thead>
                <tr>${thsHtml}</tr>
              </thead>
              <tbody>
                ${trsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PDF Export - ${file.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Outfit', sans-serif;
          color: #1f2937;
          margin: 0;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .letterhead-bg { display: none; }
        @page { size: A4; margin: 0; }
        @media print {
          body { margin: 0; padding: 0; background-color: #ffffff; }
          .page-container {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }
          .letterhead-bg {
            display: block;
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-image: url('/icons/Salry.png');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 1;
            pointer-events: none;
          }
          .letter-content {
            position: relative;
            z-index: 2;
            padding: 260px 45px 210px 45px !important;
            margin-top: 0 !important;
            height: 1120px !important;
            box-sizing: border-box !important;
          }
        }
        @media screen {
          body {
            background-color: #f3f4f6;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            padding: 20px;
          }
          .page-container {
            width: 790px;
            height: 1120px;
            position: relative;
            background: #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            box-sizing: border-box;
            margin-bottom: 20px;
            overflow: hidden;
          }
          .letterhead-bg {
            display: block;
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-image: url('/icons/Salry.png');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 1;
            pointer-events: none;
          }
          .letter-content {
            position: relative;
            z-index: 2;
            padding: 260px 45px 210px 45px;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHtml.join('')}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
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
    
    const lineMap: { [y: number]: { x: number; text: string }[] } = {};

    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = Math.round(item.transform[4]);
      if (!lineMap[y]) lineMap[y] = [];
      lineMap[y].push({ x, text: item.str });
    }

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
export async function convertWordToPdf(file: File, options?: PdfExportOptions): Promise<void> {
  const useLetterhead = options?.useLetterhead ?? true;
  const itemsPerPageStr = options?.itemsPerPage || '18';

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

  if (extractedRows.length === 0) {
    try {
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const rawText = textResult.value || '';
      const lines = rawText.split('\n').filter(l => l.trim().length > 0);
      extractedRows = lines.map(line => [line.trim()]);
    } catch (e) {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim().length > 0);
      extractedRows = lines.map(line => [line.trim()]);
    }
  }

  if (extractedRows.length === 0) {
    throw new Error('No readable text or table content found in the Word file.');
  }

  const head = extractedRows[0] || [];
  const bodyRows = extractedRows.slice(1);

  if (!useLetterhead) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    autoTable(doc, {
      head: [head],
      body: bodyRows,
      startY: 15,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 }
    });
    doc.save(`${file.name.replace(/\.[^/.]+$/, '')}_converted.pdf`);
    return;
  }

  // Official Letterhead (Salry.png) Print Preview Mode
  let chunkSize = 18;
  if (itemsPerPageStr === 'auto') {
    chunkSize = bodyRows.length > 0 ? bodyRows.length : 1;
  } else {
    chunkSize = parseInt(itemsPerPageStr, 10) || 18;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Please allow popups to open the PDF print preview window.');
  }

  const pagesHtml: string[] = [];

  for (let i = 0; i < bodyRows.length; i += chunkSize) {
    const chunk = bodyRows.slice(i, i + chunkSize);
    const count = chunk.length;

    let cPad = '6px 8px';
    let fSize = '0.80rem';
    let hPad = '8px 8px';
    let hFSize = '0.78rem';

    if (count <= 2) {
      cPad = '16px 12px'; fSize = '0.95rem'; hPad = '12px 12px'; hFSize = '0.88rem';
    } else if (count <= 6) {
      cPad = '12px 10px'; fSize = '0.88rem'; hPad = '10px 10px'; hFSize = '0.82rem';
    } else if (count <= 10) {
      cPad = '9px 8px'; fSize = '0.84rem'; hPad = '8px 8px'; hFSize = '0.80rem';
    } else if (count <= 15) {
      cPad = '6px 8px'; fSize = '0.79rem'; hPad = '7px 8px'; hFSize = '0.77rem';
    } else {
      cPad = '4px 6px'; fSize = '0.74rem'; hPad = '5px 6px'; hFSize = '0.73rem';
    }

    const thsHtml = head.map(h => `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; border-bottom: 2px solid #1e293b; background: #f8fafc;">${h}</th>`).join('');

    const trsHtml = chunk.map(row => {
      const tds = row.map(cell => `<td style="padding: ${cPad}; font-size: ${fSize}; border-bottom: 1px solid #e2e8f0;">${String(cell ?? '')}</td>`).join('');
      return `<tr>${tds}</tr>`;
    }).join('');

    pagesHtml.push(`
      <div class="page-container">
        <div class="letterhead-bg"></div>
        <div class="letter-content" style="padding: 260px 45px 210px 45px !important; box-sizing: border-box !important; height: 1120px !important; overflow: hidden !important;">
          <div style="height: 650px !important; min-height: 650px !important; max-height: 650px !important; display: flex; flex-direction: column; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 0; table-layout: auto;">
              <thead>
                <tr>${thsHtml}</tr>
              </thead>
              <tbody>
                ${trsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `);
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PDF Export - ${file.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Outfit', sans-serif;
          color: #1f2937;
          margin: 0;
          padding: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .letterhead-bg { display: none; }
        @page { size: A4; margin: 0; }
        @media print {
          body { margin: 0; padding: 0; background-color: #ffffff; }
          .page-container {
            width: 210mm;
            height: 297mm;
            page-break-after: always;
            position: relative;
            box-sizing: border-box;
            overflow: hidden;
          }
          .letterhead-bg {
            display: block;
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-image: url('/icons/Salry.png');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 1;
            pointer-events: none;
          }
          .letter-content {
            position: relative;
            z-index: 2;
            padding: 260px 45px 210px 45px !important;
            margin-top: 0 !important;
            height: 1120px !important;
            box-sizing: border-box !important;
          }
        }
        @media screen {
          body {
            background-color: #f3f4f6;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            padding: 20px;
          }
          .page-container {
            width: 790px;
            height: 1120px;
            position: relative;
            background: #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            box-sizing: border-box;
            margin-bottom: 20px;
            overflow: hidden;
          }
          .letterhead-bg {
            display: block;
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-image: url('/icons/Salry.png');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            background-position: center;
            z-index: 1;
            pointer-events: none;
          }
          .letter-content {
            position: relative;
            z-index: 2;
            padding: 260px 45px 210px 45px;
          }
        }
      </style>
    </head>
    <body>
      ${pagesHtml.join('')}
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
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
