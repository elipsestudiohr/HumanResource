import React, { useState, useMemo } from 'react';
import { getModalOverlayStyle } from '../AdminStyles';

export interface PermissionTabItem {
  id: string; // e.g. 'admin:overview', 'admin:employees', 'employee:dashboard'
  panelId: 'admin' | 'employee';
  panelName: string;
  tabKey: string;
  name: string;
  icon?: string;
  description: string;
}

export const ALL_SYSTEM_TABS: PermissionTabItem[] = [
  // Admin Portal Tabs
  { id: 'admin:overview', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'overview', name: 'Overview', icon: '/icons/layout-grid.png', description: 'Real-time company stats, present breakdown & monthly analytics' },
  { id: 'admin:calendar', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'calendar', name: 'Calendar & Holidays', icon: '/icons/calendar.png', description: 'Company calendar, official holidays & monthly schedules' },
  { id: 'admin:employees', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'employees', name: 'Employees & Salaries', icon: '/icons/users.png', description: 'Employee records, salaries, documents & profile management' },
  { id: 'admin:attendance', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'attendance', name: 'Attendance Logs', icon: '/icons/clock.png', description: 'Raw biometric punches & device attendance records' },
  { id: 'admin:approvals', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'approvals', name: 'Requests & Approvals', icon: '/icons/check-circle.png', description: 'Leave requests, attendance corrections & helpdesk complaints' },
  { id: 'admin:payroll', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'payroll', name: 'Overtime & Salary (Payroll)', icon: '/icons/dollar-sign.png', description: 'Salary calculations, overtime, deductions & bank export' },
  { id: 'admin:timings', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'timings', name: 'Time Manager (Shifts)', icon: '/icons/timer.png', description: 'Shift rules, grace times & custom schedule assignments' },
  { id: 'admin:announcements', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'announcements', name: 'Announcements', icon: '/icons/megaphone.png', description: 'Post and manage company-wide announcements' },
  { id: 'admin:device', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'device', name: 'Device & Backup Settings', icon: '/icons/settings.png', description: 'ZKTeco device IP, database backup & system settings' },
  { id: 'admin:converter', panelId: 'admin', panelName: 'Admin Dashboard', tabKey: 'converter', name: 'File Converter', icon: '/icons/file.png', description: 'Word, Excel, PDF & Document conversion tools' },

  // Employee Portal Tabs
  { id: 'employee:dashboard', panelId: 'employee', panelName: 'Employee Portal', tabKey: 'dashboard', name: 'Dashboard & Live Clock', icon: '/icons/layout-grid.png', description: 'Employee live shift timer, attendance status & quick summary' },
  { id: 'employee:logs', panelId: 'employee', panelName: 'Employee Portal', tabKey: 'logs', name: 'Attendance History', icon: '/icons/clock.png', description: 'Personal punch history, calendar days & working hours' },
  { id: 'employee:requests', panelId: 'employee', panelName: 'Employee Portal', tabKey: 'requests', name: 'Requests & Helpdesk', icon: '/icons/check-circle.png', description: 'Apply for leaves, loan requests & submit complaints' },
  { id: 'employee:device', panelId: 'employee', panelName: 'Employee Portal', tabKey: 'device', name: 'Device Settings', icon: '/icons/settings.png', description: 'Biometric fingerprint/face login setup & device settings' }
];

interface AdminPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  allowedTabs: string[];
  onSave: (tabs: string[]) => void;
}

export const AdminPermissionsModal: React.FC<AdminPermissionsModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  allowedTabs: initialAllowedTabs,
  onSave
}) => {
  const [selectedTabs, setSelectedTabs] = useState<string[]>(initialAllowedTabs || []);
  const [selectedPanel, setSelectedPanel] = useState<'all' | 'admin' | 'employee'>('admin');
  const [selectedTabToAdd, setSelectedTabToAdd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // Sync initialAllowedTabs when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (!initialAllowedTabs || initialAllowedTabs.length === 0) {
        setSelectedTabs(ALL_SYSTEM_TABS.filter(t => t.panelId === 'admin').map(t => t.id));
      } else {
        setSelectedTabs([...initialAllowedTabs]);
      }
      setSearchQuery('');
      setSelectedTabToAdd('');
    }
  }, [isOpen, initialAllowedTabs]);

  // Filter tabs by selected panel
  const availableTabsForPanel = useMemo(() => {
    let tabs = ALL_SYSTEM_TABS;
    if (selectedPanel !== 'all') {
      tabs = tabs.filter(t => t.panelId === selectedPanel);
    }
    return tabs.filter(t => !selectedTabs.includes(t.id));
  }, [selectedPanel, selectedTabs]);

  // Live search suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return ALL_SYSTEM_TABS.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.panelName.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tabKey.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleAddTab = (tabId: string) => {
    if (!tabId) return;
    if (tabId === '__ALL_PANEL__') {
      const tabsToAdd = ALL_SYSTEM_TABS
        .filter(t => selectedPanel === 'all' || t.panelId === selectedPanel)
        .map(t => t.id);
      setSelectedTabs(prev => Array.from(new Set([...prev, ...tabsToAdd])));
    } else if (!selectedTabs.includes(tabId)) {
      setSelectedTabs(prev => [...prev, tabId]);
    }
    setSelectedTabToAdd('');
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const handleRemoveTab = (tabId: string) => {
    setSelectedTabs(prev => prev.filter(id => id !== tabId));
  };

  const handleApplyPreset = (preset: 'all_admin' | 'standard_hr' | 'all_employee' | 'clear_all') => {
    if (preset === 'all_admin') {
      const adminTabs = ALL_SYSTEM_TABS.filter(t => t.panelId === 'admin').map(t => t.id);
      setSelectedTabs(Array.from(new Set([...selectedTabs.filter(id => id.startsWith('employee:')), ...adminTabs])));
    } else if (preset === 'standard_hr') {
      const hrTabs = ['admin:overview', 'admin:employees', 'admin:attendance', 'admin:approvals'];
      setSelectedTabs(Array.from(new Set([...selectedTabs.filter(id => id.startsWith('employee:')), ...hrTabs])));
    } else if (preset === 'all_employee') {
      const empTabs = ALL_SYSTEM_TABS.filter(t => t.panelId === 'employee').map(t => t.id);
      setSelectedTabs(empTabs);
    } else if (preset === 'clear_all') {
      setSelectedTabs([]);
    }
  };

  const handleConfirm = () => {
    onSave(selectedTabs);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="custom-overlay"
      onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
      onClick={e => {
        if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
          onClose();
        }
      }}
      style={getModalOverlayStyle(11000)}
    >
      <div 
        className="custom-dialog-card glass-panel"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        style={{
          width: '680px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          borderRadius: 'var(--radius-lg, 16px)',
          textAlign: 'left'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/icons/settings.png" alt="settings" className="theme-icon" style={{ width: '22px', height: '22px' }} />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                Configure Portal & Tab Access
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Select permitted panels & tabs for <strong style={{ color: 'var(--primary)' }}>{employeeName || 'Selected Employee'}</strong>. When they log in, only granted tabs will be visible and accessible.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: 'var(--radius-sm)' }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
          
          {/* Quick Presets Bar */}
          <div style={{ background: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md, 10px)', padding: '12px 14px' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Quick Permission Presets
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleApplyPreset('all_admin')}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 600 }}
              >
                Full Admin (All 10 Tabs)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('standard_hr')}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 600 }}
              >
                Standard HR (Overview, Emp, Attn, Approvals)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('all_employee')}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 600 }}
              >
                Employee Portal Only
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('clear_all')}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Panel & Tab Selection Form */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {/* Dropdown 1: Panel Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                1. Select Portal / Panel
              </label>
              <select
                value={selectedPanel}
                onChange={e => {
                  setSelectedPanel(e.target.value as any);
                  setSelectedTabToAdd('');
                }}
                className="custom-select"
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
              >
                <option value="admin">Admin Dashboard (10 Tabs)</option>
                <option value="employee">Employee Portal (4 Tabs)</option>
                <option value="all">All Portals / Panels</option>
              </select>
            </div>

            {/* Dropdown 2: Tab Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
                2. Select Tab to Grant
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={selectedTabToAdd}
                  onChange={e => setSelectedTabToAdd(e.target.value)}
                  className="custom-select"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                >
                  <option value="">-- Choose Tab to Add --</option>
                  <option value="__ALL_PANEL__">Grant All Available Tabs for this Panel</option>
                  {availableTabsForPanel.map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.panelId === 'admin' ? 'Admin' : 'Employee'}] {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAddTab(selectedTabToAdd)}
                  disabled={!selectedTabToAdd}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600, opacity: selectedTabToAdd ? 1 : 0.5 }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Contact-Style Live Search Box */}
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Search & Add Tabs (Instant Contact Style)
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Type to search tabs (e.g. Attendance, Salaries, Time Manager)..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Live Autocomplete List */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                marginTop: '4px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md, 10px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                maxHeight: '220px',
                overflowY: 'auto'
              }}>
                {searchResults.map(t => {
                  const isAlreadySelected = selectedTabs.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (!isAlreadySelected) handleAddTab(t.id);
                      }}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: isAlreadySelected ? 'default' : 'pointer',
                        background: isAlreadySelected ? 'var(--bg-surface-hover)' : 'transparent',
                        borderBottom: '1px solid var(--border-color)',
                        opacity: isAlreadySelected ? 0.6 : 1,
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => { if (!isAlreadySelected) e.currentTarget.style.background = 'var(--bg-surface-hover)'; }}
                      onMouseLeave={e => { if (!isAlreadySelected) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: t.panelId === 'admin' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: t.panelId === 'admin' ? '#3b82f6' : '#10b981'
                        }}>
                          {t.panelId === 'admin' ? 'ADMIN' : 'EMPLOYEE'}
                        </span>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{t.name}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                            {t.description}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isAlreadySelected ? 'var(--text-muted)' : 'var(--primary)' }}>
                        {isAlreadySelected ? 'Already Granted' : '+ Grant Access'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Granted Tabs Chips / Tags Area (Contact Group Style) */}
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md, 10px)',
            background: 'var(--bg-surface)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Granted Access Tabs ({selectedTabs.length} Selected)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Click ✕ on any tag to revoke access
              </span>
            </div>

            {selectedTabs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '24px 12px',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-sm)'
              }}>
                No tabs selected. Use the dropdowns or search above to grant access, or choose a preset.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {selectedTabs.map(tabId => {
                  const item = ALL_SYSTEM_TABS.find(t => t.id === tabId);
                  const isAdmin = item ? item.panelId === 'admin' : tabId.startsWith('admin:');
                  const label = item ? item.name : tabId.replace(/^(admin|employee):/, '');

                  return (
                    <div
                      key={tabId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full, 20px)',
                        background: isAdmin ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                        border: isAdmin ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                        color: isAdmin ? '#3b82f6' : '#10b981',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, opacity: 0.8 }}>
                        {isAdmin ? 'ADMIN:' : 'EMP:'}
                      </span>
                      <span>{label}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTab(tabId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          padding: '0 2px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          lineHeight: 1,
                          opacity: 0.7,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                        title={`Remove ${label}`}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '16px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn btn-primary"
            style={{ padding: '8px 24px', fontSize: '0.85rem', fontWeight: 700 }}
          >
            Apply Permissions ({selectedTabs.length} Tabs)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPermissionsModal;
