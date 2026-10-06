import React, { useState, useEffect } from 'react';
import type { EmployeeProfile, RawLog } from '../../../utils/attendanceProcessor';
import { matchPin, getLocalDateStr } from '../../../utils/attendanceProcessor';
import { getRawLogs } from '../../../lib/dbHelper';
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
  const [dbLogs, setDbLogs] = useState<RawLog[] | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);
  const [hasSearchedDb, setHasSearchedDb] = useState<boolean>(false);

  // Query database directly when user searches specific employee, date, or PIN
  const executeDatabaseSearch = async (empTarget?: string, dateTarget?: string, searchTarget?: string) => {
    setIsLoadingDb(true);
    setHasSearchedDb(true);
    try {
      let targetPin: string | undefined = undefined;
      const empKey = empTarget !== undefined ? empTarget : rawLogsEmpFilter;
      const dateKey = dateTarget !== undefined ? dateTarget : rawLogsDateFilter;
      const queryKey = searchTarget !== undefined ? searchTarget : rawLogsSearch;

      if (empKey) {
        const found = profiles.find(p => p.pin === empKey || p.id === empKey);
        targetPin = found?.pin || empKey;
      } else if (queryKey.trim()) {
        const q = queryKey.trim();
        const found = profiles.find(p => matchPin(p.pin, q) || matchPin(p.id, q) || (p.full_name && p.full_name.toLowerCase().includes(q.toLowerCase())));
        if (found?.pin) targetPin = found.pin;
        else if (/^\d+$/.test(q)) targetPin = q;
      }

      let startDate: string | undefined = undefined;
      let endDate: string | undefined = undefined;
      if (dateKey) {
        startDate = dateKey;
        endDate = dateKey;
      }

      const results = await getRawLogs(targetPin, startDate, endDate);
      const sorted = (results || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setDbLogs(sorted);
    } catch (err) {
      console.error('Failed to query database for attendance logs:', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  // Auto-query database when user selects an employee or date filter
  useEffect(() => {
    if (rawLogsEmpFilter || rawLogsDateFilter) {
      executeDatabaseSearch(rawLogsEmpFilter, rawLogsDateFilter, rawLogsSearch);
    } else if (!rawLogsSearch.trim() && hasSearchedDb) {
      setDbLogs(null);
      setHasSearchedDb(false);
    }
  }, [rawLogsEmpFilter, rawLogsDateFilter]);

  const handleClearFilters = () => {
    setRawLogsSearch('');
    setRawLogsEmpFilter('');
    setRawLogsDateFilter('');
    setRawLogsStatusFilter('');
    setDbLogs(null);
    setHasSearchedDb(false);
  };

  // Determine active log list: use server queried logs if search is active, else default 7-day logs
  const activeLogsList = dbLogs !== null ? dbLogs : rawLogs;

  const filteredRawLogs = activeLogsList.filter(l => {
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
      {/* Top Filter Bar */}
      <div className="glass-panel" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', gap: '16px', flex: 1, alignItems: 'center', flexWrap: 'wrap' }} className="filters-scroll-container">
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

          {/* Search Bar with Enter key / submit button */}
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
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    executeDatabaseSearch(rawLogsEmpFilter, rawLogsDateFilter, rawLogsSearch);
                  }
                }}
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
            <button
              type="button"
              onClick={() => executeDatabaseSearch(rawLogsEmpFilter, rawLogsDateFilter, rawLogsSearch)}
              disabled={isLoadingDb}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.8rem', height: '38px', fontWeight: 600 }}
              title="Query database for this search"
            >
              {isLoadingDb ? 'Loading...' : 'Search in DB'}
            </button>
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
              title="Filter by Date (loads from DB)"
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

          {/* Clear / Reset Filters Button */}
          {(rawLogsSearch || rawLogsEmpFilter || rawLogsDateFilter || rawLogsStatusFilter || hasSearchedDb) && (
            <button
              onClick={handleClearFilters}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem', height: '38px' }}
            >
              Reset to 7 Days
            </button>
          )}
        </div>
      </div>

      {/* Raw punches list panel */}
      <div className="glass-panel" style={{...styles.panel, width: '100%'}}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0 }}>Synced Raw Punch Logs</h3>
            {hasSearchedDb ? (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                Database Query Active
              </span>
            ) : (
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '4px',
                background: 'rgba(59, 130, 246, 0.12)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                Last 7 Days (Default)
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isLoadingDb && (
              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                Querying database...
              </span>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredRawLogs.length} punch logs
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
                    {isLoadingDb ? 'Loading records from database...' : 'No raw punch logs match the selected filters.'}
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
