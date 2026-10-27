import { useState } from 'react';
import { createPortal } from 'react-dom';

interface ExpandableTextProps {
  text?: string;
  maxLength?: number;
  title?: string;
}

export const ExpandableText = ({ text, maxLength = 35, title }: ExpandableTextProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!text || !text.trim()) return <span style={{ color: 'var(--text-muted)' }}>—</span>;

  if (text.length <= maxLength) {
    return <span>"{text}"</span>;
  }

  return (
    <>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        style={{
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.82rem',
          userSelect: 'none'
        }}
        title="Click to view full details in popup"
      >
        <span>"{text.substring(0, maxLength)}..."</span>
        <span
          style={{
            color: 'var(--primary)',
            fontWeight: 600,
            fontSize: '0.72rem',
            padding: '1px 6px',
            borderRadius: '4px',
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          more
        </span>
      </span>

      {isOpen && createPortal(
        <div
          className="custom-overlay animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 100000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="custom-dialog-card glass-panel animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '520px',
              maxWidth: '92vw',
              padding: '24px',
              borderRadius: '14px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 45px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {title || 'Details & Remarks'}
              </h4>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '4px 8px'
                }}
                title="Close"
              >
                &times;
              </button>
            </div>

            <div
              style={{
                background: 'var(--bg-surface-hover)',
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.88rem',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                maxHeight: '55vh',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {text}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '6px 18px', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ExpandableText;
