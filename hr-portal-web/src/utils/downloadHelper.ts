import * as XLSX from 'xlsx';

/**
 * Triggers a file download in the browser by appending the temporary link to document.body.
 * This prevents Chrome/Edge/Firefox from silently ignoring the download.
 */
export function downloadBlobFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }, 200);
}

/**
 * Converts an XLSX workbook into a downloadable Blob and triggers browser download.
 */
export function downloadExcelWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlobFile(blob, filename);
}
