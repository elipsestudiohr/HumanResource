import React from 'react';
import type { RawLog, EmployeeProfile } from '../../../utils/attendanceProcessor';
import { getLocalDateStr } from '../../../utils/attendanceProcessor';
import styles from '../EmployeeStyles';

interface LogsTabProps {
  userRawLogs: RawLog[];
  empLogSearch: string;
  setEmpLogSearch: (val: string) => void;
  empLogDateFilter: string;
  setEmpLogDateFilter: (val: string) => void;
  empLogStatusFilter: string;
  setEmpLogStatusFilter: (val: string) => void;
  profile: EmployeeProfile | null;
  user: any;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  userRawLogs,
  empLogSearch,
  setEmpLogSearch,
  empLogDateFilter,
  setEmpLogDateFilter,
  empLogStatusFilter,
  setEmpLogStatusFilter,
  profile,
  user
}) => {
  const filteredUserLogs = userRawLogs.filter(l => {
    if (empLogSearch.trim()) {
      const q = empLogSearch.trim().toLowerCase();
      const pin = String(l.employee_pin || '').toLowerCase();
      const dateStr = new Date(l.timestamp).toLocaleString().toLowerCase();
      if (!pin.includes(q) && !dateStr.includes(q)) return false;
    }

    if (empLogDateFilter) {
      const logDateStr = getLocalDateStr(l.timestamp);
      if (logDateStr !== empLogDateFilter) return false;
    }

    if (empLogStatusFilter !== '') {
      const statusVal = parseInt(empLogStatusFilter, 10);
      if (l.status_type !== statusVal) return false;
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Top Filter Bar */}
      <div className="glass-panel" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'center' }} className="filters-scroll-container">
          <h3 style={{ margin: 0, marginRight: '16px', fontSize: '1.25rem' }}>My Punch Logs</h3>
          
          {/* Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Search:</span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <img 
                src="/icons/search.png" 
                alt="search" 
                className="theme-icon" 
                style={{ position: 'absolute', left: '10px', width: '12px', height: '12px', opacity: 0.5 }} 
              />
              <input
                type="text"
                placeholder="Search date, time..."
                value={empLogSearch}
                onChange={e => setEmpLogSearch(e.target.value)}
                style={{
                  padding: '8px 12px 8px 30px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  width: '170px',
                  outline: 'none',
                  height: '38px'
                }}
              />
            </div>
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Date:</span>
            <input
              type="date"
              value={empLogDateFilter}
              onChange={e => setEmpLogDateFilter(e.target.value)}
              className="custom-select"
              style={{
                padding: '8px 12px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                height: '38px'
              }}
              title="Filter by Date"
            />
          </div>

          {/* Status Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status:</span>
            <select
              value={empLogStatusFilter}
              onChange={e => setEmpLogStatusFilter(e.target.value)}
              className="custom-select"
              style={{ width: '140px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
            >
              <option value="">All Statuses</option>
              <option value="0">Check-In</option>
              <option value="1">Check-Out</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(empLogSearch || empLogDateFilter || empLogStatusFilter) && (
            <button
              onClick={() => {
                setEmpLogSearch('');
                setEmpLogDateFilter('');
                setEmpLogStatusFilter('');
              }}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', height: '38px' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Raw punches list panel */}
      <div className="glass-panel" style={{...styles.panel, width: '100%'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0 }}>My Biometric Punch Logs (PIN: {profile?.pin || user?.pin || '-'})</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredUserLogs.length} of {userRawLogs.length} total biometric punch logs
            </span>
          </div>
        </div>

        <div style={styles.tableContainer} className="table-slider-container">
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Log ID</th>
                <th>PIN ID</th>
                <th>Employee Name</th>
                <th>Timestamp</th>
                <th>Status Type</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {filteredUserLogs.length > 0 ? (
                filteredUserLogs.map(l => (
                  <tr key={l.id || `${l.employee_pin}-${l.timestamp}-${Math.random()}`} style={styles.tableRow}>
                    <td style={styles.tableCell}>#{l.id || '-'}</td>
                    <td style={styles.tableCell}><strong>{l.employee_pin}</strong></td>
                    <td style={styles.tableCell}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {profile?.full_name || user?.full_name || 'Me'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>{new Date(l.timestamp).toLocaleString()}</td>
                    <td style={styles.tableCell}>
                      {l.status_type === 0 ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>Check-In</span>
                      ) : (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>Check-Out</span>
                      )}
                    </td>
                    <td style={styles.tableCell}>
                      {l.verify_type === 1 ? 'Fingerprint' : 'Card / Face'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No biometric punch logs found for your PIN ({profile?.pin || user?.pin || '-'}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LogsTab;
