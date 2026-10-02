import React, { useMemo } from 'react';

export interface MonthlyHistoryFilterProps {
  value: string;
  onChange: (monthKey: string) => void;
  label?: string;
  placeholder?: string;
  style?: React.CSSProperties;
  customDates?: (string | undefined | null)[];
}

export const getCurrentMonthKey = (): string => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
};

export const matchesMonthKey = (
  dateCandidates: (string | undefined | null)[],
  selectedMonthKey: string
): boolean => {
  if (!selectedMonthKey || selectedMonthKey === 'ALL') return true;
  return dateCandidates.some(d => {
    if (!d) return false;
    const str = String(d).trim();
    // Direct string prefix match for YYYY-MM
    if (str.startsWith(selectedMonthKey)) return true;
    
    // Parse localized Date to handle timezone conversions
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const localKey = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}`;
      return localKey === selectedMonthKey;
    }
    return false;
  });
};

export const MonthlyHistoryFilter: React.FC<MonthlyHistoryFilterProps> = ({
  value,
  onChange,
  label = 'Filter Month:',
  placeholder = 'All Months',
  style = {},
  customDates = []
}) => {
  const monthOptions = useMemo(() => {
    const opts: { key: string; label: string }[] = [];
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const pad = (n: number) => n.toString().padStart(2, '0');

    // Upcoming 2 months (for advance leaves/requests)
    for (let i = 2; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      opts.push({
        key,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()} (Upcoming)`
      });
    }

    // Current month
    const curKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    opts.push({
      key: curKey,
      label: `${monthNames[now.getMonth()]} ${now.getFullYear()} (Current Month)`
    });

    // Past 24 months
    for (let i = 1; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      opts.push({
        key,
        label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      });
    }

    // Also include any custom months present in historical dates if not already present
    if (customDates && customDates.length > 0) {
      customDates.forEach(cd => {
        if (!cd) return;
        const parsed = new Date(cd);
        if (!isNaN(parsed.getTime())) {
          const k = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}`;
          if (!opts.some(o => o.key === k)) {
            opts.push({
              key: k,
              label: `${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`
            });
          }
        }
      });
    }

    return opts;
  }, [customDates]);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'nowrap',
        ...style
      }}
      className="monthly-history-filter-container"
    >
      {label && (
        <span
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            fontWeight: 500,
            whiteSpace: 'nowrap'
          }}
        >
          {label}
        </span>
      )}

      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <img
          src="/icons/calendar.png"
          alt="calendar"
          className="theme-icon"
          style={{
            position: 'absolute',
            left: '10px',
            width: '13px',
            height: '13px',
            opacity: 0.6,
            pointerEvents: 'none'
          }}
        />
        <select
          value={value || 'ALL'}
          onChange={e => onChange(e.target.value)}
          className="custom-select"
          style={{
            padding: '6px 12px 6px 30px',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            cursor: 'pointer',
            minWidth: '150px',
            outline: 'none',
            height: '34px',
            lineHeight: '1.2'
          }}
        >
          <option value="ALL">{placeholder}</option>
          {monthOptions.map(opt => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {value && value !== 'ALL' ? (
        <button
          type="button"
          onClick={() => onChange('ALL')}
          className="btn btn-secondary"
          style={{
            padding: '4px 8px',
            fontSize: '0.74rem',
            height: '34px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Show records from all months"
        >
          <span>Show All</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onChange(getCurrentMonthKey())}
          className="btn btn-secondary"
          style={{
            padding: '4px 8px',
            fontSize: '0.74rem',
            height: '34px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Switch back to current month"
        >
          <span>This Month</span>
        </button>
      )}
    </div>
  );
};

export default MonthlyHistoryFilter;
