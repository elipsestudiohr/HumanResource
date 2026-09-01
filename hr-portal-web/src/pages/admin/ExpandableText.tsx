import { useState } from 'react';

export const ExpandableText = ({ text, maxLength = 35 }: { text?: string; maxLength?: number }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text || !text.trim()) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  if (text.length <= maxLength) {
    return <span>"{text}"</span>;
  }
  return (
    <span
      onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
      style={{ cursor: 'pointer', userSelect: 'none', display: 'inline-block' }}
      title={expanded ? 'Click to collapse' : 'Click to expand full details'}
    >
      {expanded ? (
        <span style={{ background: 'var(--bg-surface-hover)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'inline-block', maxWidth: '450px', whiteSpace: 'pre-wrap', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
          "{text}" <small style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '6px', cursor: 'pointer' }}>▲ collapse</small>
        </span>
      ) : (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
          "{text.substring(0, maxLength)}..." <small style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>more</small>
        </span>
      )}
    </span>
  );
};

export default ExpandableText;
