import React from 'react';
import {
  convertExcelToPdf,
  convertPdfToExcel,
  convertWordToPdf,
  convertWordToExcel,
  convertPdfToWord
} from '../../../utils/fileConverter';
import styles from '../AdminStyles';

interface ConverterTabProps {
  conversionMode: 'excel-to-pdf' | 'pdf-to-excel' | 'word-to-pdf' | 'word-to-excel' | 'pdf-to-word';
  setConversionMode: (mode: 'excel-to-pdf' | 'pdf-to-excel' | 'word-to-pdf' | 'word-to-excel' | 'pdf-to-word') => void;
  converterSelectedFile: File | null;
  setConverterSelectedFile: (file: File | null) => void;
  converterIsDragging: boolean;
  setConverterIsDragging: (isDragging: boolean) => void;
  converterFileInputRef: React.RefObject<HTMLInputElement | null>;
  exportUseLetterhead: boolean;
  setExportUseLetterhead: (val: boolean) => void;
  exportEmployeesPerPage: string;
  setExportEmployeesPerPage: (val: string) => void;
}

export const ConverterTab: React.FC<ConverterTabProps> = ({
  conversionMode,
  setConversionMode,
  converterSelectedFile,
  setConverterSelectedFile,
  converterIsDragging,
  setConverterIsDragging,
  converterFileInputRef,
  exportUseLetterhead,
  setExportUseLetterhead,
  exportEmployeesPerPage,
  setExportEmployeesPerPage
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      <div className="glass-panel" style={styles.panel}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            File Format Conversion Utility
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Upload your files (Excel, PDF, Word) and convert them seamlessly into your desired target format.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { mode: 'excel-to-pdf', title: 'Excel to PDF', from: 'Excel (.xlsx, .csv)', to: 'PDF Document (.pdf)' },
            { mode: 'pdf-to-excel', title: 'PDF to Excel', from: 'PDF Document (.pdf)', to: 'Excel Spreadsheet (.xlsx)' },
            { mode: 'word-to-pdf', title: 'Word to PDF', from: 'Word / Text (.docx, .txt)', to: 'PDF Document (.pdf)' },
            { mode: 'word-to-excel', title: 'Word to Excel', from: 'Word / Text (.docx, .txt)', to: 'Excel Spreadsheet (.xlsx)' },
            { mode: 'pdf-to-word', title: 'PDF to Word', from: 'PDF Document (.pdf)', to: 'Word Document (.docx)' }
          ].map(item => (
            <div
              key={item.mode}
              onClick={() => setConversionMode(item.mode as any)}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                border: conversionMode === item.mode ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                background: conversionMode === item.mode ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-surface-hover)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>{item.title}</h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                From <strong>{item.from}</strong> to <strong>{item.to}</strong>
              </div>
            </div>
          ))}
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setConverterIsDragging(true); }}
          onDragLeave={() => setConverterIsDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setConverterIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              setConverterSelectedFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => converterFileInputRef.current?.click()}
          style={{
            border: converterIsDragging ? '2px dashed var(--primary)' : '2px dashed var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '40px 20px',
            textAlign: 'center',
            background: converterIsDragging ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface-hover)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '20px'
          }}
        >
          <input
            type="file"
            ref={converterFileInputRef as any}
            style={{ display: 'none' }}
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                setConverterSelectedFile(e.target.files[0]);
              }
            }}
          />
          {converterSelectedFile ? (
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)' }}>
                Selected File: {converterSelectedFile.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Size: {(converterSelectedFile.size / 1024).toFixed(1)} KB | Ready to convert
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Drag & Drop your file here or click to browse
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Supports Excel (.xlsx, .xls, .csv), PDF (.pdf), and Word (.docx, .doc, .txt)
              </div>
            </div>
          )}
        </div>

        {/* PDF Conversion Settings (Letterhead & Items Per Page) */}
        {conversionMode.endsWith('-to-pdf') && (
          <div style={{ background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox" 
                id="chkConverterUseLetterhead"
                checked={exportUseLetterhead}
                onChange={e => setExportUseLetterhead(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="chkConverterUseLetterhead" style={{ margin: 0, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Print on Official Letterhead (Salry.png)
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Items / Employees Per Page:
              </label>
              <select
                value={exportEmployeesPerPage}
                onChange={e => setExportEmployeesPerPage(e.target.value)}
                className="custom-select"
                style={{ cursor: 'pointer', maxWidth: '240px', padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <option value="1">1 Item per page (Single Record)</option>
                <option value="2">2 Items per page</option>
                <option value="5">5 Items per page</option>
                <option value="10">10 Items per page</option>
                <option value="15">15 Items per page</option>
                <option value="18">18 Items per page (Standard)</option>
                <option value="20">20 Items per page</option>
                <option value="25">25 Items per page</option>
                <option value="auto">All (Fit on Single Page)</option>
              </select>
            </div>
          </div>
        )}

        {/* Convert Button */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {converterSelectedFile && (
            <button
              onClick={() => setConverterSelectedFile(null)}
              className="btn btn-secondary"
              style={{ padding: '10px 18px' }}
            >
              Clear File
            </button>
          )}
          <button
            disabled={!converterSelectedFile}
            onClick={async () => {
              if (!converterSelectedFile) return;
              window.showLoading(`Converting ${converterSelectedFile.name}...`);
              try {
                const pdfOpts = { useLetterhead: exportUseLetterhead, itemsPerPage: exportEmployeesPerPage };
                if (conversionMode === 'excel-to-pdf') {
                  await convertExcelToPdf(converterSelectedFile, pdfOpts);
                } else if (conversionMode === 'pdf-to-excel') {
                  await convertPdfToExcel(converterSelectedFile);
                } else if (conversionMode === 'word-to-pdf') {
                  await convertWordToPdf(converterSelectedFile, pdfOpts);
                } else if (conversionMode === 'word-to-excel') {
                  await convertWordToExcel(converterSelectedFile);
                } else if (conversionMode === 'pdf-to-word') {
                  await convertPdfToWord(converterSelectedFile);
                }
                window.customAlert('File converted and downloaded successfully!');
              } catch (err: any) {
                window.customAlert(`Conversion failed: ${err.message || 'Unknown error'}`);
              } finally {
                window.hideLoading();
              }
            }}
            className="btn btn-primary"
            style={{ padding: '10px 24px', fontWeight: 600, opacity: converterSelectedFile ? 1 : 0.5 }}
          >
            Convert & Download File
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConverterTab;
