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
        <span style={{ background: 'var(--bg-surface-hover)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', display: 'inline-block', maxWidth: '320px', whiteSpace: 'normal', border: '1px solid var(--border-color)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
          "{text}" <small style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '4px', cursor: 'pointer' }}>▲ collapse</small>
        </span>
      ) : (
        <span>
          "{text.substring(0, maxLength)}..." <small style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '4px' }}>more</small>
        </span>
      )}
    </span>
  );
};

export default ExpandableText;
