import React from 'react';
import type { EmployeeProfile } from '../../../utils/attendanceProcessor';
import SearchableDropdown from '../../../components/SearchableDropdown';
import styles, { getModalOverlayStyle } from '../AdminStyles';

export const PAKISTAN_BANKS = [
  'Meezan Bank',
  'Habib Bank Limited (HBL)',
  'United Bank Limited (UBL)',
  'MCB Bank',
  'National Bank of Pakistan (NBP)',
  'Allied Bank Limited (ABL)',
  'Bank Alfalah',
  'Faysal Bank',
  'Standard Chartered Bank',
  'Askari Bank',
  'Bank of Punjab (BOP)',
  'Bank Al Habib',
  'Soneri Bank',
  'JS Bank',
  'Silkbank',
  'Summit Bank',
  'Al Baraka Bank',
  'Dubai Islamic Bank',
  'BankIslami Pakistan',
  'First Women Bank',
  'Samba Bank',
  'Sindh Bank',
  'Bank of Khyber (BOK)',
  'Khushhali Microfinance Bank',
  'Mobilink Microfinance Bank (JazzCash)',
  'Telenor Microfinance Bank (Easypaisa)',
  'U Microfinance Bank (UPaisa)',
  'SadaPay',
  'NayaPay'
];

interface EmployeeFormModalProps {
  isAddEmployeeModalOpen: boolean;
  setIsAddEmployeeModalOpen: (open: boolean) => void;
  isEditingProfile: string | null;
  setIsEditingProfile: (id: string | null) => void;
  employeeModalTab: 'standard' | 'direct_transfer';
  setEmployeeModalTab: (tab: 'standard' | 'direct_transfer') => void;
  handleSaveProfile: (e: React.FormEvent) => void;
  fullName: string;
  setFullName: (name: string) => void;
  showAddCustomPurpose: boolean;
  setShowAddCustomPurpose: (show: boolean) => void;
  newCustomPurposeInput: string;
  setNewCustomPurposeInput: (input: string) => void;
  transferPurposeOptions: string[];
  setTransferPurposeOptions: React.Dispatch<React.SetStateAction<string[]>>;
  transferPurpose: string;
  setTransferPurpose: (p: string) => void;
  setDesignation: (d: string) => void;
  designation: string;
  baseSalary: string;
  setBaseSalary: (s: string) => void;
  paymentMethod: 'Bank' | 'Cash';
  setPaymentMethod: (m: 'Bank' | 'Cash') => void;
  bankName: string;
  setBankName: (b: string) => void;
  bankAccountTitle: string;
  setBankAccountTitle: (t: string) => void;
  bankAccountNo: string;
  setBankAccountNo: (no: string) => void;
  handleCloseFormModal: () => void;
  pin: string;
  setPin: (p: string) => void;
  joiningDate: string;
  setJoiningDate: (d: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (d: string) => void;
  employeeEmail: string;
  setEmployeeEmail: (e: string) => void;
  employeePhone: string;
  setEmployeePhone: (p: string) => void;
  employeePassword: string;
  setEmployeePassword: (p: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  department: string;
  setDepartment: (d: string) => void;
  departmentsList: string[];
  setShowAddDeptModal: (show: boolean) => void;
  isRoleAdmin: boolean;
  setIsRoleAdmin: (admin: boolean) => void;
  designationsList: string[];
  setShowAddDesigModal: (show: boolean) => void;
  incomeTax: string;
  setIncomeTax: (tax: string) => void;
  profiles: EmployeeProfile[];
  getEmployeeShiftTimingHelper: (emp: EmployeeProfile) => { startTime: string; endTime: string; graceMins?: number; isFixedHours?: boolean; totalHours?: number };
  nicNo: string;
  handleNicChange: (val: string) => void;
  emergencyContacts: any[];
  setEmergencyContacts: React.Dispatch<React.SetStateAction<any[]>>;
  newContactName: string;
  setNewContactName: (n: string) => void;
  newContactPhone: string;
  setNewContactPhone: (p: string) => void;
  newContactRelation: string;
  setNewContactRelation: (r: string) => void;
  timelinePeriods: any[];
  setTimelinePeriods: React.Dispatch<React.SetStateAction<any[]>>;
  newPeriodHeading: string;
  setNewPeriodHeading: (h: string) => void;
  newPeriodStartDate: string;
  setNewPeriodStartDate: (d: string) => void;
  newPeriodEndDate: string;
  setNewPeriodEndDate: (d: string) => void;
  newPeriodIsPresent: boolean;
  setNewPeriodIsPresent: (present: boolean) => void;
  showAddDeptModal: boolean;
  newDeptName: string;
  setNewDeptName: (n: string) => void;
  handleAddDepartment: (e: React.FormEvent) => void;
  showAddDesigModal: boolean;
  newDesigName: string;
  setNewDesigName: (n: string) => void;
  handleAddDesignation: (e: React.FormEvent) => void;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isAddEmployeeModalOpen,
  setIsAddEmployeeModalOpen,
  isEditingProfile,
  setIsEditingProfile,
  employeeModalTab,
  setEmployeeModalTab,
  handleSaveProfile,
  fullName,
  setFullName,
  showAddCustomPurpose,
  setShowAddCustomPurpose,
  newCustomPurposeInput,
  setNewCustomPurposeInput,
  transferPurposeOptions,
  setTransferPurposeOptions,
  transferPurpose,
  setTransferPurpose,
  setDesignation,
  designation,
  baseSalary,
  setBaseSalary,
  paymentMethod,
  setPaymentMethod,
  bankName,
  setBankName,
  bankAccountTitle,
  setBankAccountTitle,
  bankAccountNo,
  setBankAccountNo,
  handleCloseFormModal,
  pin,
  setPin,
  joiningDate,
  setJoiningDate,
  dateOfBirth,
  setDateOfBirth,
  employeeEmail,
  setEmployeeEmail,
  employeePhone,
  setEmployeePhone,
  employeePassword,
  setEmployeePassword,
  showPassword,
  setShowPassword,
  department,
  setDepartment,
  departmentsList,
  setShowAddDeptModal,
  isRoleAdmin,
  setIsRoleAdmin,
  designationsList,
  setShowAddDesigModal,
  incomeTax,
  setIncomeTax,
  profiles,
  getEmployeeShiftTimingHelper,
  nicNo,
  handleNicChange,
  emergencyContacts,
  setEmergencyContacts,
  newContactName,
  setNewContactName,
  newContactPhone,
  setNewContactPhone,
  newContactRelation,
  setNewContactRelation,
  timelinePeriods,
  setTimelinePeriods,
  newPeriodHeading,
  setNewPeriodHeading,
  newPeriodStartDate,
  setNewPeriodStartDate,
  newPeriodEndDate,
  setNewPeriodEndDate,
  newPeriodIsPresent,
  setNewPeriodIsPresent,
  showAddDeptModal,
  newDeptName,
  setNewDeptName,
  handleAddDepartment,
  showAddDesigModal,
  newDesigName,
  setNewDesigName,
  handleAddDesignation
}) => {
  return (
    <>
      {/* Employee Add/Edit & Purpose Transfer Modal */}
      {(isAddEmployeeModalOpen || isEditingProfile !== null) && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setIsAddEmployeeModalOpen(false);
              setIsEditingProfile(null);
            }
          }} 
          style={getModalOverlayStyle(10000)}
        >
          <div 
            className="custom-dialog-card glass-panel" 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', alignItems: 'stretch', padding: '24px' }}
          >
            
            {/* Modal Header Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                {employeeModalTab === 'direct_transfer' ? 'Record Purpose Transfer' : isEditingProfile ? 'Edit Employee Profile' : 'Add New Employee'}
              </h3>
              
              {!isEditingProfile && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setEmployeeModalTab('standard')}
                    style={{
                      background: employeeModalTab === 'standard' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: employeeModalTab === 'standard' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Employee Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeModalTab('direct_transfer')}
                    style={{
                      background: employeeModalTab === 'direct_transfer' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: employeeModalTab === 'direct_transfer' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Record Purpose / Charity Transfer"
                  >
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Purpose Transfer
                  </button>
                </div>
              )}
            </div>

            {employeeModalTab === 'direct_transfer' ? (
              /* Direct Purpose / Charity Payment Form */
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label>Payee / Recipient Name *</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    placeholder="e.g. Edhi Foundation / Vendor Name / Employee Bonus"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ margin: 0 }}>Purpose of Transfer *</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCustomPurpose(!showAddCustomPurpose)}
                      className="btn btn-secondary"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>+</span> Custom Purpose
                    </button>
                  </div>

                  {showAddCustomPurpose && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', background: 'var(--bg-surface-hover)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                      <input
                        type="text"
                        value={newCustomPurposeInput}
                        onChange={e => setNewCustomPurposeInput(e.target.value)}
                        placeholder="Type custom purpose (e.g. CSR, Emergency Relief)..."
                        style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
                        onClick={() => {
                          if (newCustomPurposeInput.trim()) {
                            const updated = [...transferPurposeOptions, newCustomPurposeInput.trim()];
                            setTransferPurposeOptions(updated);
                            setTransferPurpose(newCustomPurposeInput.trim());
                            setDesignation(newCustomPurposeInput.trim());
                            setNewCustomPurposeInput('');
                            setShowAddCustomPurpose(false);
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                  )}

                  <select
                    value={transferPurpose}
                    onChange={e => {
                      setTransferPurpose(e.target.value);
                      setDesignation(e.target.value);
                    }}
                    className="custom-select"
                    style={styles.input}
                    required
                  >
                    {transferPurposeOptions.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label>Transfer Amount (PKR) *</label>
                  <input 
                    type="number" 
                    value={baseSalary} 
                    onChange={e => setBaseSalary(e.target.value)} 
                    placeholder="e.g. 50000"
                    required
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Payment Method *</label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="radio"
                        name="transferPaymentMethod"
                        checked={paymentMethod === 'Bank'}
                        onChange={() => { setPaymentMethod('Bank'); setBankName('Meezan Bank'); }}
                      />
                      <span>Bank Transfer</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="radio"
                        name="transferPaymentMethod"
                        checked={paymentMethod === 'Cash'}
                        onChange={() => { setPaymentMethod('Cash'); setBankName('Cash'); setBankAccountTitle('Cash Payment'); setBankAccountNo('Cash Payment'); }}
                      />
                      <span>Cash Payment</span>
                    </label>
                  </div>

                  {paymentMethod === 'Bank' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                      <SearchableDropdown
                        label="Bank Name"
                        placeholder="Select Bank..."
                        value={bankName}
                        onChange={setBankName}
                        options={PAKISTAN_BANKS}
                      />
                      <div style={styles.dateRow}>
                        <div style={{ ...styles.formGroup, flex: 1 }}>
                          <label>Account Title</label>
                          <input type="text" value={bankAccountTitle} onChange={e => setBankAccountTitle(e.target.value)} placeholder="Account Title" style={styles.input} />
                        </div>
                        <div style={{ ...styles.formGroup, flex: 1 }}>
                          <label>Account No / IBAN</label>
                          <input type="text" value={bankAccountNo} onChange={e => setBankAccountNo(e.target.value)} placeholder="Account Number or IBAN" style={styles.input} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={handleCloseFormModal} style={{ padding: '10px 20px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 600 }}>
                    Record Transfer
                  </button>
                </div>
              </form>
            ) : (
              /* Fixed Salary Standard Employee Form */
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                <div style={styles.formGroup}>
                  <label>Full Name *</label>
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    placeholder="e.g. Zayn Malik"
                    required
                  />
                </div>

                <div style={styles.dateRow}>
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label>ZKTeco PIN *</label>
                    <input 
                      type="text" 
                      value={pin} 
                      onChange={e => setPin(e.target.value)} 
                      placeholder="e.g. 1001"
                      required
                    />
                  </div>
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label>Joining Date</label>
                    <input 
                      type="date" 
                      value={joiningDate} 
                      onChange={e => setJoiningDate(e.target.value)}
                    />
                  </div>
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label>Date of Birth</label>
                    <input 
                      type="date" 
                      value={dateOfBirth} 
                      onChange={e => setDateOfBirth(e.target.value)}
                    />
                  </div>
                </div>

                <div style={styles.dateRow}>
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label>Login Email Address *</label>
                    <input 
                      type="email" 
                      value={employeeEmail} 
                      onChange={e => setEmployeeEmail(e.target.value)} 
                      placeholder="employee@company.com"
                      required
                    />
                  </div>
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label>Contact Number</label>
                    <input 
                      type="tel" 
                      value={employeePhone} 
                      onChange={e => setEmployeePhone(e.target.value)} 
                      placeholder="e.g. 0300-1234567"
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label>{isEditingProfile ? 'Login Password (Leave blank to keep unchanged)' : 'Login Password *'}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={employeePassword} 
                      onChange={e => setEmployeePassword(e.target.value)} 
                      placeholder={isEditingProfile ? 'Enter new password or leave blank' : 'Choose password (min 6 chars)'}
                      required={!isEditingProfile}
                      style={{ paddingRight: '40px', width: '100%' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <img 
                        src={showPassword ? '/icons/eye-off.png' : '/icons/eye.png'} 
                        alt="reveal" 
                        className="theme-icon" 
                        style={{ width: '16px', height: '16px' }} 
                      />
                    </button>
                  </div>
                </div>

                <div style={styles.dateRow}>
                  <SearchableDropdown
                    label="Department"
                    placeholder="Search/Select department..."
                    value={department}
                    onChange={setDepartment}
                    options={departmentsList}
                    onAddClick={() => setShowAddDeptModal(true)}
                  />
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        Designation
                      </label>
                      <label style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.75rem', 
                        cursor: 'pointer', 
                        userSelect: 'none', 
                        color: isRoleAdmin ? '#ef4444' : 'var(--text-secondary)', 
                        fontWeight: isRoleAdmin ? 700 : 500,
                        background: isRoleAdmin ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.04)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: isRoleAdmin ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-color)',
                        transition: 'all 0.2s'
                      }}>
                        <input 
                          type="checkbox"
                          checked={isRoleAdmin}
                          onChange={e => setIsRoleAdmin(e.target.checked)}
                          style={{ accentColor: '#ef4444', width: '14px', height: '14px', cursor: 'pointer', margin: 0 }}
                        />
                        Admin Access
                      </label>
                    </div>
                    <SearchableDropdown
                      label=""
                      placeholder="Search/Select designation..."
                      value={designation}
                      onChange={setDesignation}
                      options={designationsList}
                      onAddClick={() => setShowAddDesigModal(true)}
                    />
                  </div>
                </div>

                <div style={styles.dateRow}>
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label>Monthly Salary (PKR) *</label>
                    <input 
                      type="number" 
                      value={baseSalary} 
                      onChange={e => {
                        setBaseSalary(e.target.value);
                        setIncomeTax('');
                      }} 
                      placeholder="e.g. 100000"
                      required
                    />
                  </div>
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label>Income Tax (PKR)</label>
                    <input 
                      type="number" 
                      value={incomeTax} 
                      onChange={e => setIncomeTax(e.target.value)} 
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>

                {baseSalary && (
                  <div className="glass-panel" style={{ padding: '12px 16px', marginBottom: '14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Hourly Rate (After Tax): <strong style={{ color: 'var(--text-primary)' }}>Rs. {(Math.max(0, parseFloat(baseSalary) - (parseFloat(incomeTax) || 0)) / (30 * (isEditingProfile ? (getEmployeeShiftTimingHelper(profiles.find(p => p.id === isEditingProfile) || ({} as any)).totalHours || 9) : 9))).toFixed(1)}/hr</strong> (Per-min: Rs. {(Math.max(0, parseFloat(baseSalary) - (parseFloat(incomeTax) || 0)) / (1800 * (isEditingProfile ? (getEmployeeShiftTimingHelper(profiles.find(p => p.id === isEditingProfile) || ({} as any)).totalHours || 9) : 9))).toFixed(2)}/min)
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Net Salary: <strong style={{ color: 'var(--success)' }}>Rs. {((parseFloat(baseSalary) || 0) - (parseFloat(incomeTax) || 0)).toLocaleString()}</strong>
                    </div>
                  </div>
                )}

                {/* Bank/Payment Details Section */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>Payment Method & Details</h4>
                  <div style={styles.formGroup}>
                    <label>Payment Method</label>
                    <select 
                      value={paymentMethod} 
                      onChange={e => setPaymentMethod(e.target.value as 'Bank' | 'Cash')}
                      style={styles.input}
                    >
                      <option value="Bank">Bank Transfer</option>
                      <option value="Cash">Cash Payment</option>
                    </select>
                  </div>

                  {paymentMethod === 'Bank' ? (
                    <>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ ...styles.formGroup, flex: 1 }}>
                          <label>Bank Name</label>
                          <select 
                            value={bankName} 
                            onChange={e => setBankName(e.target.value)} 
                            style={styles.input}
                          >
                            {PAKISTAN_BANKS.map(bank => (
                              <option key={bank} value={bank}>{bank}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ ...styles.formGroup, flex: 1 }}>
                          <label>CNIC / NIC No</label>
                          <input 
                            type="text" 
                            value={nicNo} 
                            onChange={e => handleNicChange(e.target.value)} 
                            placeholder="42101-XXXXXXX-X" 
                            style={styles.input} 
                          />
                        </div>
                      </div>

                      <div style={styles.dateRow}>
                        <div style={{ ...styles.formGroup, flex: 1 }}>
                          <label>Account Title</label>
                          <input type="text" value={bankAccountTitle} onChange={e => setBankAccountTitle(e.target.value)} placeholder="Account Title" style={styles.input} />
                        </div>
                        <div style={{ ...styles.formGroup, flex: 1 }}>
                          <label>Account No / IBAN</label>
                          <input type="text" value={bankAccountNo} onChange={e => setBankAccountNo(e.target.value)} placeholder="Account Number or IBAN" style={styles.input} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', color: '#10b981', fontSize: '0.85rem', fontWeight: 600, marginBottom: '14px' }}>
                      ✓ Cash Payment selected. Salary export PDF will list this employee as Cash Payment without bank fields.
                    </div>
                  )}
                </div>

              {/* Emergency Contacts Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>Emergency Contacts</h4>
                
                {/* Contact List */}
                {emergencyContacts.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {emergencyContacts.map((contact, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-hover)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-primary)' }}>
                          <strong>{contact.name}</strong> ({contact.relation}) - {contact.phone}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setEmergencyContacts(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Contact Row */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                  <div style={{ ...styles.formGroup, flex: 1, minWidth: '110px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Name</label>
                    <input 
                      type="text" 
                      value={newContactName} 
                      onChange={e => setNewContactName(e.target.value)} 
                      placeholder="Name" 
                      style={{ ...styles.input, height: '32px', fontSize: '0.8rem', padding: '4px 8px' }}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1, minWidth: '110px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Phone</label>
                    <input 
                      type="text" 
                      value={newContactPhone} 
                      onChange={e => setNewContactPhone(e.target.value)} 
                      placeholder="Phone" 
                      style={{ ...styles.input, height: '32px', fontSize: '0.8rem', padding: '4px 8px' }}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1, minWidth: '90px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Relation</label>
                    <select 
                      value={newContactRelation} 
                      onChange={e => setNewContactRelation(e.target.value)}
                      style={{ ...styles.input, height: '32px', fontSize: '0.8rem', padding: '4px 8px', width: '100%' }}
                    >
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Child">Child</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      if (!newContactName.trim() || !newContactPhone.trim()) {
                        window.customAlert('Please fill in both name and phone.');
                        return;
                      }
                      setEmergencyContacts(prev => [...prev, { name: newContactName.trim(), phone: newContactPhone.trim(), relation: newContactRelation }]);
                      setNewContactName('');
                      setNewContactPhone('');
                    }}
                    style={{ height: '32px', padding: '0 12px', fontSize: '0.8rem' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Timeline Periods Section */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px', marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>Employment Periods & Milestones</h4>
                
                {/* Periods List */}
                {timelinePeriods.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {timelinePeriods.map((period, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-hover)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-primary)' }}>
                          <strong>{period.heading}</strong>: {period.startDate} to {period.endDate}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => setTimelinePeriods(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Period Row */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                  <div style={{ ...styles.formGroup, flex: 1.5, minWidth: '120px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Period Heading (e.g. Probation)</label>
                    <input 
                      type="text" 
                      value={newPeriodHeading} 
                      onChange={e => setNewPeriodHeading(e.target.value)} 
                      placeholder="e.g. Probation period" 
                      style={{ ...styles.input, height: '32px', fontSize: '0.8rem', padding: '4px 8px' }}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1, minWidth: '100px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Start Date</label>
                    <input 
                      type="date" 
                      value={newPeriodStartDate} 
                      onChange={e => setNewPeriodStartDate(e.target.value)} 
                      style={{ ...styles.input, height: '32px', fontSize: '0.8rem', padding: '4px 8px' }}
                    />
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1, minWidth: '100px', marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>End Date</label>
                    {newPeriodIsPresent ? (
                      <input 
                        type="text" 
                        value="Present" 
                        readOnly 
                        style={{ 
                          ...styles.input, 
                          height: '32px', 
                          fontSize: '0.8rem', 
                          padding: '4px 8px', 
                          color: '#10b981', 
                          fontWeight: '600', 
                          backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                          borderColor: 'rgba(16, 185, 129, 0.3)' 
                        }}
                      />
                    ) : (
                      <input 
                        type="date" 
                        value={newPeriodEndDate} 
                        onChange={e => setNewPeriodEndDate(e.target.value)} 
                        style={{ ...styles.input, height: '32px', fontSize: '0.8rem', padding: '4px 8px' }}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', height: '32px', paddingBottom: '4px', minWidth: '80px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', userSelect: 'none', color: 'var(--text-primary)', margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={newPeriodIsPresent} 
                        onChange={e => {
                          setNewPeriodIsPresent(e.target.checked);
                          if (e.target.checked) setNewPeriodEndDate('');
                        }} 
                      />
                      Present
                    </label>
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      const finalEndDate = newPeriodIsPresent ? 'Present' : newPeriodEndDate;

                      if (!newPeriodHeading.trim() || !newPeriodStartDate || (!newPeriodIsPresent && !newPeriodEndDate)) {
                        window.customAlert('Please fill in heading, start date, and end date.');
                        return;
                      }
                      if (!newPeriodIsPresent && new Date(newPeriodEndDate) < new Date(newPeriodStartDate)) {
                        window.customAlert('End date cannot be before start date.');
                        return;
                      }
                      setTimelinePeriods(prev => [...prev, { heading: newPeriodHeading.trim(), startDate: newPeriodStartDate, endDate: finalEndDate }]);
                      setNewPeriodHeading('');
                      setNewPeriodStartDate('');
                      setNewPeriodEndDate('');
                      setNewPeriodIsPresent(false);
                    }}
                    style={{ height: '32px', padding: '0 12px', fontSize: '0.8rem' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div style={{...styles.btnGroup, marginTop: '12px'}}>
                <button type="submit" className="btn btn-primary" style={{flex: 1, background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600}}>
                  {isEditingProfile ? 'Update Profile' : 'Add Employee'}
                </button>
                <button 
                  type="button" 
                  onClick={handleCloseFormModal}
                  className="btn btn-secondary"
                  style={{flex: 1, border: '1px solid var(--border-color)', background: 'var(--bg-surface-hover)'}}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}

    {/* Sub-modal: Add New Department */}
    {showAddDeptModal && (
      <div 
        className="custom-overlay" 
        onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
        onClick={e => {
          if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
            setShowAddDeptModal(false);
            setNewDeptName('');
          }
        }} 
        style={getModalOverlayStyle(10005)}
      >
        <div 
          className="custom-dialog-card" 
          onMouseDown={e => e.stopPropagation()} 
          onClick={e => e.stopPropagation()} 
          style={{ maxWidth: '360px', alignItems: 'stretch' }}
        >
          <h3 style={{ margin: 0, fontSize: '1.15rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Add Department</h3>
          <form onSubmit={handleAddDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            <div style={styles.formGroup}>
              <label>Department Name</label>
              <input 
                type="text" 
                value={newDeptName} 
                onChange={e => setNewDeptName(e.target.value)} 
                placeholder="e.g. Marketing"
                required
                autoFocus
              />
            </div>
            <div style={styles.btnGroup}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--primary)', color: 'var(--btn-primary-text)' }}>Save</button>
              <button type="button" onClick={() => { setShowAddDeptModal(false); setNewDeptName(''); }} className="btn btn-secondary" style={{ flex: 1, border: '1px solid var(--border-color)' }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Sub-modal: Add New Designation */}
    {showAddDesigModal && (
      <div 
        className="custom-overlay" 
        onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
        onClick={e => {
          if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
            setShowAddDesigModal(false);
            setNewDesigName('');
          }
        }} 
        style={getModalOverlayStyle(10005)}
      >
        <div 
          className="custom-dialog-card" 
          onMouseDown={e => e.stopPropagation()} 
          onClick={e => e.stopPropagation()} 
          style={{ maxWidth: '360px', alignItems: 'stretch' }}
        >
          <h3 style={{ margin: 0, fontSize: '1.15rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Add Designation</h3>
          <form onSubmit={handleAddDesignation} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
            <div style={styles.formGroup}>
              <label>Designation Name</label>
              <input 
                type="text" 
                value={newDesigName} 
                onChange={e => setNewDesigName(e.target.value)} 
                placeholder="e.g. QA Manager"
                required
                autoFocus
              />
            </div>
            <div style={styles.btnGroup}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--primary)', color: 'var(--btn-primary-text)' }}>Save</button>
              <button type="button" onClick={() => { setShowAddDesigModal(false); setNewDesigName(''); }} className="btn btn-secondary" style={{ flex: 1, border: '1px solid var(--border-color)' }}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
  );
};

export default EmployeeFormModal;
