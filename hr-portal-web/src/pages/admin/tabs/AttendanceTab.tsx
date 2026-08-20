import React from 'react';
import type { EmployeeProfile, RawLog } from '../../../utils/attendanceProcessor';
import { matchPin, getLocalDateStr } from '../../../utils/attendanceProcessor';
import styles from '../AdminStyles';

interface AttendanceTabProps {
  rawLogs: RawLog[];
  profiles: EmployeeProfile[];
  rawLogsSearch: string;
  setRawLogsSearch: (val: string) => void;
  rawLogsEmpFilter: string;
  setRawLogsEmpFilter: (val: string) => void;
  rawLogsDateFilter: string;
  setRawLogsDateFilter: (val: string) => void;
  rawLogsStatusFilter: string;
  setRawLogsStatusFilter: (val: string) => void;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  rawLogs,
  profiles,
  rawLogsSearch,
  setRawLogsSearch,
  rawLogsEmpFilter,
  setRawLogsEmpFilter,
  rawLogsDateFilter,
  setRawLogsDateFilter,
  rawLogsStatusFilter,
  setRawLogsStatusFilter
}) => {
  const filteredRawLogs = rawLogs.filter(l => {
    // Search text filter (Name, PIN, Email)
    if (rawLogsSearch.trim()) {
      const q = rawLogsSearch.trim().toLowerCase();
      const matchedEmp = profiles.find(p => matchPin(p.pin, l.employee_pin) || matchPin(p.id, l.employee_pin));
      const empName = (matchedEmp?.full_name || '').toLowerCase();
      const empEmail = (matchedEmp?.email || '').toLowerCase();
      const pin = String(l.employee_pin || '').toLowerCase();
      if (!pin.includes(q) && !empName.includes(q) && !empEmail.includes(q)) {
        return false;
      }
    }

    // Employee dropdown filter
    if (rawLogsEmpFilter) {
      const target = rawLogsEmpFilter.trim().toLowerCase();
      const matchedEmp = profiles.find(p => matchPin(p.pin, l.employee_pin) || matchPin(p.id, l.employee_pin));
      const empId = (matchedEmp?.id || '').toLowerCase();
      const empPin = (matchedEmp?.pin || '').toLowerCase();
      const pin = String(l.employee_pin || '').toLowerCase();
      if (pin !== target && empPin !== target && empId !== target) {
        return false;
      }
    }

    // Date filter (YYYY-MM-DD)
    if (rawLogsDateFilter) {
      const logDateStr = getLocalDateStr(l.timestamp);
      if (logDateStr !== rawLogsDateFilter) {
        return false;
      }
    }

    // Status Type filter
    if (rawLogsStatusFilter !== '') {
      const statusVal = parseInt(rawLogsStatusFilter, 10);
      if (l.status_type !== statusVal) {
        return false;
      }
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
      {/* Top Filter Bar - Matching Employee Panel */}
      <div className="glass-panel" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'center' }} className="filters-scroll-container">
          <h3 style={{ margin: 0, marginRight: '16px', fontSize: '1.25rem' }}>Attendance</h3>
          
          {/* Employee Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Emp:</span>
            <select
              value={rawLogsEmpFilter}
              onChange={e => setRawLogsEmpFilter(e.target.value)}
              className="custom-select"
              style={{ width: '170px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
            >
              <option value="">All Employees</option>
              {profiles.filter(p => p.role !== 'admin').map(p => (
                <option key={p.id} value={p.pin || p.id}>
                  {p.full_name} (PIN: {p.pin})
                </option>
              ))}
            </select>
          </div>

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
                placeholder="Search PIN, name..."
                value={rawLogsSearch}
                onChange={e => setRawLogsSearch(e.target.value)}
                style={{
                  padding: '8px 12px 8px 30px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  width: '180px',
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
              value={rawLogsDateFilter}
              onChange={e => setRawLogsDateFilter(e.target.value)}
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
              value={rawLogsStatusFilter}
              onChange={e => setRawLogsStatusFilter(e.target.value)}
              className="custom-select"
              style={{ width: '140px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
            >
              <option value="">All Statuses</option>
              <option value="0">Check-In</option>
              <option value="1">Check-Out</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(rawLogsSearch || rawLogsEmpFilter || rawLogsDateFilter || rawLogsStatusFilter) && (
            <button
              onClick={() => {
                setRawLogsSearch('');
                setRawLogsEmpFilter('');
                setRawLogsDateFilter('');
                setRawLogsStatusFilter('');
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
          <h3 style={{ margin: 0 }}>Synced Raw Punch Logs</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {filteredRawLogs.length} of {rawLogs.length} total biometric punch logs
          </span>
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
              {filteredRawLogs.length > 0 ? (
                filteredRawLogs.map(l => {
                  const matchedEmp = profiles.find(p => matchPin(p.pin, l.employee_pin) || matchPin(p.id, l.employee_pin));
                  const empName = matchedEmp ? matchedEmp.full_name : 'Unknown';

                  return (
                    <tr key={l.id || `${l.employee_pin}-${l.timestamp}-${Math.random()}`} style={styles.tableRow}>
                      <td style={styles.tableCell}>#{l.id || '-'}</td>
                      <td style={styles.tableCell}><strong>{l.employee_pin}</strong></td>
                      <td style={styles.tableCell}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{empName}</span>
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No raw punch logs match the selected filters.
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

export default AttendanceTab;
