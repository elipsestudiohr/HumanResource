import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  getProfiles, 
  saveProfile, 
  deleteProfile, 
  getLeaveRequests, 
  updateLeaveRequestStatus,
  approveAndSplitLeaveRequest,
  deleteLeaveRequest,
  getLeaveBalances,
  updateLeaveBalance,
  getRawLogs, 
  uploadRawLogs,
  getDepartments,
  addDepartment,
  getDesignations,
  addDesignation,
  getShiftTimings,
  saveShiftTiming,
  deleteShiftTiming,
  setLocalShiftTimingBackup,
  getComplaints,
  updateComplaintStatus,
  deleteComplaint,
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  getNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getHolidays,
  createHoliday,
  deleteHoliday,
  checkAndTriggerBirthdayNotifications,
  getDeviceSettings,
  updateDeviceSettings,
  getPurposeTransfers,
  createPurposeTransfer,
  updatePurposeTransfer,
  deletePurposeTransfer,
  getApprovedAttendanceCorrections,
  saveApprovedAttendanceCorrection,
  deleteApprovedAttendanceCorrection,
  getEmployeeLoans,
  recordLoanPayment,
  updateEmployeeLoan,
  deleteEmployeeLoan
} from '../lib/dbHelper';
import type { ShiftTiming, Complaint, Announcement, Notification, Holiday, DeviceSettings, PurposeTransfer, ApprovedCorrection, EmployeeLoan } from '../lib/dbHelper';
import { processAttendanceLogs, calculateEmployeePayrollSummary, getEmployeeShiftTiming, isFixedHoursTiming, resolveTotalHours, getLateAfterTimeStr, getGracePeriodForDate, matchPin, roundSalary } from '../utils/attendanceProcessor';
import { fetchTrustedDeviceFromDb, registerBiometricDevice, disableBiometricDevice } from '../utils/biometricAuth';
import type { TrustedDeviceRecord } from '../utils/biometricAuth';
import type { EmployeeProfile, LeaveRequest, RawLog, DailySummary } from '../utils/attendanceProcessor';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } from 'docx';
import { downloadBlobFile, downloadExcelWorkbook } from '../utils/downloadHelper';
import { supabase } from '../lib/supabase';
import styles, { getModalOverlayStyle } from './admin/AdminStyles';
import OverviewTab from './admin/tabs/OverviewTab';
import EmployeesTab from './admin/tabs/EmployeesTab';
import AttendanceTab from './admin/tabs/AttendanceTab';
import PayrollTab from './admin/tabs/PayrollTab';
import TimingsTab from './admin/tabs/TimingsTab';
import ApprovalsTab from './admin/tabs/ApprovalsTab';
import AnnouncementsTab from './admin/tabs/AnnouncementsTab';
import CalendarTab from './admin/tabs/CalendarTab';
import DeviceTab from './admin/tabs/DeviceTab';
import ConverterTab from './admin/tabs/ConverterTab';
import SalaryExportModal from './admin/modals/SalaryExportModal';
import EmployeeFormModal from './admin/modals/EmployeeFormModal';
import LeaveAndWarningModals from './admin/modals/LeaveAndWarningModals';
import ShiftTimingModal from './admin/modals/ShiftTimingModal';
import AnnouncementModal from './admin/modals/AnnouncementModal';
import EmployeeDetailModals from './admin/modals/EmployeeDetailModals';
import LoanModals, { type LoanScheduleMonth } from './admin/modals/LoanModals';
import AttendanceStatsModals from './admin/modals/AttendanceStatsModals';
import ExportReportModal from './admin/modals/ExportReportModal';
import MiscAdminModals from './admin/modals/MiscAdminModals';

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onSwitchPortal?: (portal: 'admin' | 'employee') => void;
  hasEmployeePortalAccess?: boolean;
}

type TabType = 'overview' | 'employees' | 'attendance' | 'leaves' | 'payroll' | 'timings' | 'complaints' | 'announcements' | 'calendar' | 'device' | 'approvals' | 'converter';

export default function AdminDashboard({ 
  user: _user, 
  onLogout, 
  theme, 
  toggleTheme,
  onSwitchPortal,
  hasEmployeePortalAccess = true
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [rawLogs, setRawLogs] = useState<RawLog[]>([]);
  const [rawLogsSearch, setRawLogsSearch] = useState('');
  const [rawLogsEmpFilter, setRawLogsEmpFilter] = useState('');
  const [rawLogsDateFilter, setRawLogsDateFilter] = useState('');
  const [rawLogsStatusFilter, setRawLogsStatusFilter] = useState('');
  const [selectedCalendarLogs, setSelectedCalendarLogs] = useState<RawLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Complaints, Announcements & Notifications states
  const [complaintsList, setComplaintsList] = useState<Complaint[]>([]);
  const [approvedCorrectionsList, setApprovedCorrectionsList] = useState<ApprovedCorrection[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [isPostAnnouncementModalOpen, setIsPostAnnouncementModalOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // New announcement form states
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceTargetType, setAnnounceTargetType] = useState<'all' | 'department' | 'designation' | 'employee'>('all');
  const [announceTargetValue, setAnnounceTargetValue] = useState('');
  const [announceColor, setAnnounceColor] = useState('#ff3b57');

  // Profile Form State
  const [isEditingProfile, setIsEditingProfile] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminName, setAdminName] = useState('HR Administrator');

  // Extra Profile Form States
  const [employeePhone, setEmployeePhone] = useState('');
  const [nicNo, setNicNo] = useState('');
  const [isRoleAdmin, setIsRoleAdmin] = useState(false);
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [bankName, setBankName] = useState('Meezan Bank');
  const [bankAccountTitle, setBankAccountTitle] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Bank' | 'Cash'>('Bank');
  const [emergencyContacts, setEmergencyContacts] = useState<{ name: string; phone: string; relation: string; }[]>([]);
  const [timelinePeriods, setTimelinePeriods] = useState<{ heading: string; startDate: string; endDate: string; }[]>([]);

  // Permissions & Tab RBAC Access Control
  const userAllowedTabs: string[] = useMemo(() => {
    if (_user?.allowed_tabs && Array.isArray(_user.allowed_tabs) && _user.allowed_tabs.length > 0) {
      return _user.allowed_tabs;
    }
    const myProfile = profiles.find(p => p.id === _user?.id || (p.email && p.email.toLowerCase() === _user?.email?.toLowerCase()));
    if (myProfile?.allowed_tabs && Array.isArray(myProfile.allowed_tabs) && myProfile.allowed_tabs.length > 0) {
      return myProfile.allowed_tabs;
    }
    // Fallback: any admin with no restrictive tabs has full access to all admin tabs
    return [
      'admin:overview', 'admin:calendar', 'admin:employees', 'admin:attendance',
      'admin:approvals', 'admin:payroll', 'admin:timings', 'admin:announcements',
      'admin:device', 'admin:converter'
    ];
  }, [_user, profiles]);

  const isTabAllowed = (tabKey: TabType) => {
    if (userAllowedTabs.includes('*')) return true;
    if (tabKey === 'leaves' || tabKey === 'complaints') {
      return userAllowedTabs.includes('admin:approvals') || userAllowedTabs.includes(`admin:${tabKey}`);
    }
    return userAllowedTabs.includes(`admin:${tabKey}`);
  };

  // Automatically switch to first allowed tab if current activeTab is not allowed
  useEffect(() => {
    if (!loading && !isTabAllowed(activeTab)) {
      const allowedAdminKeys: TabType[] = ['overview', 'calendar', 'employees', 'attendance', 'approvals', 'payroll', 'timings', 'announcements', 'device', 'converter'];
      const firstAllowed = allowedAdminKeys.find(k => isTabAllowed(k));
      if (firstAllowed) {
        setActiveTab(firstAllowed);
      }
    }
  }, [userAllowedTabs, activeTab, loading]);
  
  // Emergency contacts inputs
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('Father');

  // Timeline inputs
  const [newPeriodHeading, setNewPeriodHeading] = useState('');
  const [newPeriodStartDate, setNewPeriodStartDate] = useState('');
  const [newPeriodEndDate, setNewPeriodEndDate] = useState('');
  const [newPeriodIsPresent, setNewPeriodIsPresent] = useState(false);

  // Direct Purpose Transfer / Charity states
  const [employeeModalTab, setEmployeeModalTab] = useState<'standard' | 'direct_transfer'>('standard');
  const [transferPurpose, setTransferPurpose] = useState('Charity');
  const [transferPurposeOptions, setTransferPurposeOptions] = useState<string[]>([
    'Charity',
    'Bonus / Reward',
    'Loan Disbursement',
    'Expense Reimbursement',
    'Gift',
    'Vendor Payment',
    'Advance Salary'
  ]);
  const [showAddCustomPurpose, setShowAddCustomPurpose] = useState(false);
  const [newCustomPurposeInput, setNewCustomPurposeInput] = useState('');
  const [purposeTransfersList, setPurposeTransfersList] = useState<PurposeTransfer[]>([]);
  const [purposeSearchQuery, setPurposeSearchQuery] = useState('');
  const [payrollSearchQuery, setPayrollSearchQuery] = useState('');

  // Warnings modal state
  const [warningTargetEmployee, setWarningTargetEmployee] = useState<EmployeeProfile | null>(null);
  const [warningText, setWarningText] = useState('');
  const [warningExpiry, setWarningExpiry] = useState('');
  const [warningColor, setWarningColor] = useState('#ff3b57');

  // WhatsApp launch choice modal state
  const [whatsAppModalEmployee, setWhatsAppModalEmployee] = useState<EmployeeProfile | null>(null);
  const [whatsAppModalPhone, setWhatsAppModalPhone] = useState<string>('');

  // Drag and drop state for department section reordering
  const [draggedDept, setDraggedDept] = useState<string | null>(null);
  const [dragOverDept, setDragOverDept] = useState<string | null>(null);
  const [customDeptOrder, setCustomDeptOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('custom_department_order');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Drag & drop handlers for Department section headers
  const handleDeptDragStart = (e: React.DragEvent, deptName: string) => {
    e.stopPropagation();
    setDraggedDept(deptName);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `dept:${deptName}`);
  };

  const handleDeptDragOver = (e: React.DragEvent, deptName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedDept && draggedDept !== deptName) {
      setDragOverDept(deptName);
    }
  };

  const handleDeptDrop = (e: React.DragEvent, targetDeptName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverDept(null);

    if (draggedDept && draggedDept !== targetDeptName) {
      // Build full master department list currently visible across active view or all data
      const masterList = Array.from(new Set([
        ...groupedProfilesByDept.map(g => g.department),
        ...customDeptOrder,
        ...departmentsList,
        ...profiles.map(p => p.department ? p.department.trim() : ''),
        ...payrollSummary.map(r => r.department ? r.department.trim() : '')
      ])).filter(d => d && d.trim() && !d.toLowerCase().includes('unassigned') && !d.toLowerCase().includes('general'));

      const fromIdx = masterList.indexOf(draggedDept);
      const toIdx = masterList.indexOf(targetDeptName);

      if (fromIdx !== -1 && toIdx !== -1) {
        const updated = [...masterList];
        const [moved] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, moved);

        setCustomDeptOrder(updated);
        setDraggedDept(null);
        try {
          localStorage.setItem('custom_department_order', JSON.stringify(updated));
        } catch (ex) {
          /* ignore */
        }
      }
    }
  };

function calculateLeaveWorkingDays(startDateStr: string, endDateStr: string, holidayDates: string[] = []): number {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  let diffDays = 0;
  const loop = new Date(start);
  while (loop <= end) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const curStr = `${loop.getFullYear()}-${pad(loop.getMonth() + 1)}-${pad(loop.getDate())}`;
    const dayOfWeek = loop.getDay();
    const isSun = dayOfWeek === 0;
    const dayOfMonth = loop.getDate();
    const weekNum = Math.ceil(dayOfMonth / 7);
    const offSat = dayOfWeek === 6 && (weekNum === 1 || weekNum === 3 || weekNum === 5);
    const isHoliday = holidayDates.includes(curStr);
    
    if (!isSun && !offSat && !isHoliday) {
      diffDays++;
    }
    loop.setDate(loop.getDate() + 1);
  }
  return diffDays;
}

  // Leave approval & distribution states
  const [selectedLeaveForApproval, setSelectedLeaveForApproval] = useState<LeaveRequest | null>(null);
  const [chosenLeaveTypeForApproval, setChosenLeaveTypeForApproval] = useState<'Casual' | 'Medical' | 'Annual'>('Annual');
  const [primaryLeaveDaysAllocated, setPrimaryLeaveDaysAllocated] = useState<number>(1);
  const [secondaryLeaveTypeForApproval, setSecondaryLeaveTypeForApproval] = useState<'Casual' | 'Medical' | 'Annual'>('Casual');
  const [leaveBalancesList, setLeaveBalancesList] = useState<any[]>([]);

  // Admin multi-select checkbox states
  const [selectedAdminLeaveIds, setSelectedAdminLeaveIds] = useState<number[]>([]);
  const [selectedAdminComplaintIds, setSelectedAdminComplaintIds] = useState<number[]>([]);

  // Salary Export Modal state
  const [isSalaryExportModalOpen, setIsSalaryExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'word' | 'csv'>('pdf');

  // File Converter state
  const [conversionMode, setConversionMode] = useState<'excel-to-pdf' | 'pdf-to-excel' | 'word-to-pdf' | 'word-to-excel' | 'pdf-to-word'>('excel-to-pdf');
  const [converterSelectedFile, setConverterSelectedFile] = useState<File | null>(null);
  const [converterIsDragging, setConverterIsDragging] = useState(false);
  const converterFileInputRef = useRef<HTMLInputElement | null>(null);
  const [customExportFormat, setCustomExportFormat] = useState<'pdf' | 'excel' | 'word'>('pdf');

  const handleAdminDeleteLeaveRequests = async (idsToDelete: number[]) => {
    if (idsToDelete.length === 0) return;
    const approved = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        `Are you sure you want to delete ${idsToDelete.length} selected leave request(s)?`,
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!approved) return;

    window.showLoading('Deleting leave requests...');
    try {
      for (const id of idsToDelete) {
        await deleteLeaveRequest(id);
      }
      setSelectedAdminLeaveIds([]);
      fetchData();
      window.customAlert('Selected leave requests deleted successfully.');
    } catch (err) {
      window.customAlert('Failed to delete leave requests.');
    } finally {
      window.hideLoading();
    }
  };

  const handleAdminDeleteComplaints = async (idsToDelete: number[]) => {
    if (idsToDelete.length === 0) return;
    const approved = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        `Are you sure you want to delete ${idsToDelete.length} selected request(s)?`,
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!approved) return;

    window.showLoading('Deleting requests...');
    try {
      for (const id of idsToDelete) {
        const comp = complaintsList.find(c => c.id === id);
        if (comp && (comp.title === 'Check In/Out Entry Correction' || comp.title.includes('Correction'))) {
          try {
            const parsed = typeof comp.description === 'string' ? JSON.parse(comp.description) : comp.description;
            const correctionDate = parsed?.date;
            if (correctionDate) {
              const emp = profiles.find(p => p.id === comp.employee_id);
              const pinToUse = emp?.pin ? String(emp.pin).trim() : (comp.employee_id || '');
              
              // Delete from approved_attendance_corrections
              await deleteApprovedAttendanceCorrection(comp.employee_id, correctionDate, pinToUse);

              // Delete injected raw logs for that date
              const startOfDay = new Date(`${correctionDate}T00:00:00`).toISOString();
              const nextDay = new Date(new Date(`${correctionDate}T00:00:00`).getTime() + 36 * 60 * 60 * 1000).toISOString();
              if (pinToUse) {
                await supabase
                  .from('raw_attendance_logs')
                  .delete()
                  .eq('employee_pin', pinToUse)
                  .gte('timestamp', startOfDay)
                  .lte('timestamp', nextDay);
              }
            }
          } catch (e) {}
        }
        await deleteComplaint(id);
      }
      setSelectedAdminComplaintIds([]);
      netSalaryCacheRef.current = {};
      const complaints = await getComplaints();
      setComplaintsList(complaints);
      const appCorrs = await getApprovedAttendanceCorrections();
      setApprovedCorrectionsList(appCorrs);
      const newRawLogs = await getRawLogs();
      setRawLogs(newRawLogs);
      fetchData();
      window.customAlert('Selected requests deleted successfully.');
    } catch (err) {
      window.customAlert('Failed to delete requests.');
    } finally {
      window.hideLoading();
    }
  };

  // Export Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<'all' | 'department' | 'employee'>('all');
  const [exportSelectedDept, setExportSelectedDept] = useState('');
  const [exportSelectedEmployeeId, setExportSelectedEmployeeId] = useState('');
  const [exportPaymentFilter, setExportPaymentFilter] = useState<'all' | 'Bank' | 'Cash'>('Bank');
  const [exportCols, setExportCols] = useState({
    pin: false,
    name: true,
    dept: false,
    designation: false,
    base_salary: false,
    income_tax: false,
    net_salary: true,
    payment_method: false,
    bank_name: false,
    bank_account_title: true,
    bank_account_no: false
  });
  const [exportOtMode, setExportOtMode] = useState<'with_ot' | 'without_ot' | 'base_x_ot'>('base_x_ot');
  const [exportIncludePurposePayee, setExportIncludePurposePayee] = useState<boolean>(true);
  const [exportUseLetterhead, setExportUseLetterhead] = useState(true);
  const [exportExcludedIds, setExportExcludedIds] = useState<string[]>([]);
  const [exportSearchQuery, setExportSearchQuery] = useState('');
  const [exportEmployeesPerPage, setExportEmployeesPerPage] = useState<string>('18');

  // Admin Change Password states
  const [isAdminChangePasswordModalOpen, setIsAdminChangePasswordModalOpen] = useState(false);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminPasswordChangeLoading, setAdminPasswordChangeLoading] = useState(false);
  
  // Direct leave balance editor states
  const [editingLeaveBalanceEmp, setEditingLeaveBalanceEmp] = useState<EmployeeProfile | null>(null);
  const [adjCasualTotal, setAdjCasualTotal] = useState(10);
  const [adjCasualUsed, setAdjCasualUsed] = useState(0);
  const [adjMedicalTotal, setAdjMedicalTotal] = useState(10);
  const [adjMedicalUsed, setAdjMedicalUsed] = useState(0);
  const [adjAnnualTotal, setAdjAnnualTotal] = useState(10);
  const [adjAnnualUsed, setAdjAnnualUsed] = useState(0);

  const [showDetailsPassword, setShowDetailsPassword] = useState(false);

  // Modal and custom dropdown/combobox lists
  const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);
  const [departmentsList, setDepartmentsList] = useState<string[]>([]);
  const [designationsList, setDesignationsList] = useState<string[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [desigFilter, setDesigFilter] = useState('');
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [leaveBalanceSearchQuery, setLeaveBalanceSearchQuery] = useState('');
  const [employeeSortKey, setEmployeeSortKey] = useState<'pin_asc' | 'name_asc' | 'name_desc'>('pin_asc');

  // Sorted departments list synchronized with custom drag & drop ordering
  const sortedDepartmentsList = useMemo(() => {
    return [...departmentsList].sort((a, b) => {
      const isAUnassigned = a.toLowerCase().includes('unassigned') || a.toLowerCase().includes('general');
      const isBUnassigned = b.toLowerCase().includes('unassigned') || b.toLowerCase().includes('general');
      if (isAUnassigned && !isBUnassigned) return 1;
      if (!isAUnassigned && isBUnassigned) return -1;

      const idxA = customDeptOrder.indexOf(a);
      const idxB = customDeptOrder.indexOf(b);

      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;

      return a.localeCompare(b);
    });
  }, [departmentsList, customDeptOrder]);

  // Sub-modal states for adding inline departments & designations
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [showAddDesigModal, setShowAddDesigModal] = useState(false);
  const [newDesigName, setNewDesigName] = useState('');

  // Timings Manager states
  const [shiftTimings, setShiftTimings] = useState<ShiftTiming[]>([]);
  const [isAddTimingModalOpen, setIsAddTimingModalOpen] = useState(false);
  const [editingTimingRule, setEditingTimingRule] = useState<ShiftTiming | null>(null);
  const [timingTargetType, setTimingTargetType] = useState<'designation' | 'department' | 'employee'>('designation');
  const [timingTargetId, setTimingTargetId] = useState('');
  const [timingStartTime, setTimingStartTime] = useState('09:00');
  const [timingEndTime, setTimingEndTime] = useState('18:00');
  const [timingGraceMins, setTimingGraceMins] = useState<number>(20);
  const [timingIsFixedHours, setTimingIsFixedHours] = useState<boolean>(false);
  const [timingAllowRegularOvertime, setTimingAllowRegularOvertime] = useState<boolean>(false);
  const [timingTotalHours, setTimingTotalHours] = useState<number>(9);
  const [timingDays, setTimingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [saturdayOption, setSaturdayOption] = useState<'alternate' | 'all_off' | 'all_working'>('alternate');
  const [graceTargetScopeType, setGraceTargetScopeType] = useState<string>('global');
  const [graceStartDate, setGraceStartDate] = useState<string>('');
  const [graceEndDate, setGraceEndDate] = useState<string>('');

  const [defaultShiftStart, setDefaultShiftStart] = useState<string>('11:00');
  const [defaultShiftEnd, setDefaultShiftEnd] = useState<string>('20:00');
  const [defaultShiftHours, setDefaultShiftHours] = useState<number>(9);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Date Range for report calculation (auto-synced with adminEmpMonth/adminEmpYear)
  const padD = (n: number) => n.toString().padStart(2, '0');
  const initMonth = new Date().getMonth();
  const initYear = new Date().getFullYear();
  const initLastDay = new Date(initYear, initMonth + 1, 0).getDate();
  const [startDate, setStartDate] = useState(`${initYear}-${padD(initMonth + 1)}-01`);
  const [endDate, setEndDate] = useState(`${initYear}-${padD(initMonth + 1)}-${padD(initLastDay)}`);

  // Calendar & Holidays states
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [holidaysList, setHolidaysList] = useState<Holiday[]>([]);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [selectedHolidayDate, setSelectedHolidayDate] = useState('');
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');
  const [holidayColor, setHolidayColor] = useState('#3b82f6');

  // DOB field for employee form
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showBirthdayEffect, setShowBirthdayEffect] = useState(false);
  const [showAdminSalariesMap, setShowAdminSalariesMap] = useState<Record<string, boolean>>({});
  const [showAdminPasswords, setShowAdminPasswords] = useState<Record<string, boolean>>({});
  const [selectedCalendarProfile, setSelectedCalendarProfile] = useState<EmployeeProfile | null>(null);
  const [adminTrustedDevice, setAdminTrustedDevice] = useState<TrustedDeviceRecord | null>(null);

  useEffect(() => {
    if (_user && _user.email) {
      fetchTrustedDeviceFromDb(_user.email).then(rec => setAdminTrustedDevice(rec));
    }
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [_user]);

  const handleRegisterAdminBiometric = async () => {
    if (!_user || !_user.email) return;
    window.showLoading('Registering Fingerprint / Face ID for this device...');
    try {
      const success = await registerBiometricDevice(_user.email, _user.password, _user, 'admin');
      if (success) {
        const fresh = await fetchTrustedDeviceFromDb(_user.email);
        setAdminTrustedDevice(fresh);
        window.customAlert(`Device trusted successfully for ${_user.email}! Fingerprint & Face ID login enabled on this device.`);
      } else {
        window.customAlert('Failed to register biometric device.');
      }
    } catch (e: any) {
      window.customAlert('Error registering biometrics.');
    } finally {
      window.hideLoading();
    }
  };

  const handleDisableAdminBiometric = async () => {
    if (!_user || !_user.email) return;
    await disableBiometricDevice(_user.email);
    setAdminTrustedDevice(null);
    window.customAlert(`Biometric login disabled for ${_user.email} on this device.`);
  };
  const [adminViewYear, setAdminViewYear] = useState(new Date().getFullYear());
  const [adminViewMonth, setAdminViewMonth] = useState(new Date().getMonth());
  const [adminEmpYear, setAdminEmpYear] = useState(new Date().getFullYear());
  const [adminEmpMonth, setAdminEmpMonth] = useState(new Date().getMonth());
  const [adminAttendanceViewMode, setAdminAttendanceViewMode] = useState<'calendar' | 'table'>('calendar');

  // Auto-sync startDate & endDate whenever Period selector (adminEmpMonth / adminEmpYear) changes
  useEffect(() => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const lastDay = new Date(adminEmpYear, adminEmpMonth + 1, 0).getDate();
    const newStart = `${adminEmpYear}-${pad(adminEmpMonth + 1)}-01`;
    const newEnd = `${adminEmpYear}-${pad(adminEmpMonth + 1)}-${pad(lastDay)}`;
    setStartDate(newStart);
    setEndDate(newEnd);
  }, [adminEmpMonth, adminEmpYear]);

  const [graceTimeMinsSetting, setGraceTimeMinsSetting] = useState<number>(() => parseInt(localStorage.getItem('office_grace_time_mins') || '20', 10));
  const [monthlyGraceSettings, setMonthlyGraceSettings] = useState<Record<string, number>>({});
  const [graceTargetMonth, setGraceTargetMonth] = useState<string>('global');
  const [showPresentsModal, setShowPresentsModal] = useState(false);
  const [showAbsentsModal, setShowAbsentsModal] = useState(false);
  const [showLeavesModal, setShowLeavesModal] = useState(false);
  const netSalaryCacheRef = useRef<Record<string, number>>({});

  // Edit attendance correction states
  const [editingCorrectionComplaint, setEditingCorrectionComplaint] = useState<Complaint | null>(null);
  const [editCorrectionDate, setEditCorrectionDate] = useState('');
  const [editCorrectionCheckIn, setEditCorrectionCheckIn] = useState('');
  const [editCorrectionCheckOut, setEditCorrectionCheckOut] = useState('');
  const [approvalsSubTab, setApprovalsSubTab] = useState<'leaves' | 'complaints' | 'loans'>('leaves');
  const [employeeLoansList, setEmployeeLoansList] = useState<EmployeeLoan[]>([]);
  const [scheduleModalLoan, setScheduleModalLoan] = useState<EmployeeLoan | null>(null);
  const [scheduleModalMode, setScheduleModalMode] = useState<'approve' | 'modify'>('approve');
  const [scheduleLoanName, setScheduleLoanName] = useState('');
  const [scheduleLoanAmount, setScheduleLoanAmount] = useState('');
  const [scheduleDuration, setScheduleDuration] = useState(10);
  const [scheduleMonths, setScheduleMonths] = useState<LoanScheduleMonth[]>([]);
  const [paymentLoan, setPaymentLoan] = useState<EmployeeLoan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [skipModalLoan, setSkipModalLoan] = useState<EmployeeLoan | null>(null);
  const [selectedMonthToSkip, setSelectedMonthToSkip] = useState('');
  const [scheduleLoanTaxMode, setScheduleLoanTaxMode] = useState<'same' | 'custom'>('same');
  const [scheduleLoanTaxAmount, setScheduleLoanTaxAmount] = useState('0');
  const [scheduleLoanDeductionBasis, setScheduleLoanDeductionBasis] = useState<'base_salary' | 'net_salary'>('net_salary');

  // Salary, Tax, and Dialog detail states
  const [incomeTax, setIncomeTax] = useState('');
  const [selectedCalendarDayData, setSelectedCalendarDayData] = useState<{ 
    dateStr: string; 
    holiday?: Holiday; 
    birthdays: EmployeeProfile[]; 
    leaves: (LeaveRequest & { employeeName: string })[];
    attendanceList: {
      employeeName: string;
      pin: string;
      status: string;
      checkIn: string | null;
      checkOut: string | null;
      workingHours: number;
      overtimeHours: number;
      isAbsent: boolean;
      isLate: boolean;
    }[];
  } | null>(null);
  const [selectedAdminEmpCalendarDayData, setSelectedAdminEmpCalendarDayData] = useState<{ dateStr: string; daySummary?: DailySummary; holiday?: Holiday; isBirthday: boolean; ownLeave?: LeaveRequest } | null>(null);
  const [viewingProfileDetails, setViewingProfileDetails] = useState<EmployeeProfile | null>(null);

  // Device settings states
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings>({
    ip_address: '192.168.1.201',
    port: 4370,
    sync_interval: 1,
    status: 'Offline',
    last_connection_state: 'Unknown'
  });
  const [editDeviceIp, setEditDeviceIp] = useState('192.168.1.201');
  const [editDevicePort, setEditDevicePort] = useState(4370);
  const [editDeviceInterval, setEditDeviceInterval] = useState(1);
  const [editAutoBackupEnabled, setEditAutoBackupEnabled] = useState(false);
  const [editBackupDirectory, setEditBackupDirectory] = useState('D:\\Elipse\\HRPortal\\backups');

  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    fetchData(true);

    let debounceTimer: any = null;
    const channel = supabase
      .channel('admin-realtime-all-tables')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (document.visibilityState === 'visible') {
            fetchData(true);
          }
        }, 600);
      })
      .subscribe();

    // Optimized background heartbeat (30s interval, active only when tab is visible)
    const telemetryInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    }, 30000);

    const handleLiveSyncNotification = () => {
      fetchData(true);
    };
    window.addEventListener('app-refresh-notifications', handleLiveSyncNotification);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('app-refresh-notifications', handleLiveSyncNotification);
      supabase.removeChannel(channel);
      clearInterval(telemetryInterval);
    };
  }, []);

  // Global ESC Key Listener to gracefully close open modals
  useEffect(() => {
    const handleAdminEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showNotificationsDropdown) {
          setShowNotificationsDropdown(false);
        } else if (selectedAdminEmpCalendarDayData) {
          setSelectedAdminEmpCalendarDayData(null);
        } else if (selectedCalendarProfile) {
          setSelectedCalendarProfile(null);
        } else if (selectedCalendarDayData) {
          setSelectedCalendarDayData(null);
        } else if (viewingProfileDetails) {
          setViewingProfileDetails(null);
        } else if (showAddDeptModal) {
          setShowAddDeptModal(false);
        } else if (showAddDesigModal) {
          setShowAddDesigModal(false);
        } else if (isAddEmployeeModalOpen || isEditingProfile !== null) {
          setIsAddEmployeeModalOpen(false);
          setIsEditingProfile(null);
        } else if (selectedLeaveForApproval) {
          setSelectedLeaveForApproval(null);
        } else if (editingLeaveBalanceEmp) {
          setEditingLeaveBalanceEmp(null);
        } else if (warningTargetEmployee) {
          setWarningTargetEmployee(null);
        } else if (editingCorrectionComplaint) {
          setEditingCorrectionComplaint(null);
        } else if (isHolidayModalOpen) {
          setIsHolidayModalOpen(false);
        } else if (isAddTimingModalOpen) {
          setIsAddTimingModalOpen(false);
          setEditingTimingRule(null);
        } else if (whatsAppModalEmployee) {
          setWhatsAppModalEmployee(null);
        } else if (isAdminChangePasswordModalOpen) {
          setIsAdminChangePasswordModalOpen(false);
        } else if (scheduleModalLoan) {
          setScheduleModalLoan(null);
        } else if (paymentLoan) {
          setPaymentLoan(null);
        } else if (skipModalLoan) {
          setSkipModalLoan(null);
        } else if (isSalaryExportModalOpen) {
          setIsSalaryExportModalOpen(false);
        } else if (isExportModalOpen) {
          setIsExportModalOpen(false);
        } else if (showPresentsModal) {
          setShowPresentsModal(false);
        } else if (showAbsentsModal) {
          setShowAbsentsModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleAdminEscape);
    return () => window.removeEventListener('keydown', handleAdminEscape);
  }, [
    showNotificationsDropdown,
    selectedAdminEmpCalendarDayData,
    selectedCalendarProfile,
    selectedCalendarDayData,
    viewingProfileDetails,
    showAddDeptModal,
    showAddDesigModal,
    isAddEmployeeModalOpen,
    isEditingProfile,
    selectedLeaveForApproval,
    editingLeaveBalanceEmp,
    warningTargetEmployee,
    editingCorrectionComplaint,
    isHolidayModalOpen,
    isAddTimingModalOpen,
    whatsAppModalEmployee,
    isAdminChangePasswordModalOpen,
    scheduleModalLoan,
    paymentLoan,
    skipModalLoan,
    isSalaryExportModalOpen,
    isExportModalOpen,
    showPresentsModal,
    showAbsentsModal
  ]);

  const fetchData = async (silent = false) => {
    netSalaryCacheRef.current = {};
    if (isFirstLoadRef.current) {
      setLoading(true);
      isFirstLoadRef.current = false;
    }
    try {
      const p = await getProfiles();
      setProfiles(p);

      const cleanAdminTarget = String(_user?.id || _user?.email || '').trim().toLowerCase();
      const currentAdmin = p.find(prof => 
        (prof.id && String(prof.id).trim().toLowerCase() === cleanAdminTarget) ||
        (prof.email && prof.email.trim().toLowerCase() === cleanAdminTarget) ||
        (prof.pin && String(prof.pin).trim().toLowerCase() === cleanAdminTarget)
      );
      if (currentAdmin) {
        setAdminName(currentAdmin.full_name);
        if (currentAdmin.date_of_birth) {
          const dob = new Date(currentAdmin.date_of_birth + 'T00:00:00');
          const today = new Date();
          if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
            setShowBirthdayEffect(true);
          }
        }
      }
      
      const r = await getLeaveRequests();
      setLeaveRequests(r);

      try {
        const bal = await getLeaveBalances();
        setLeaveBalancesList(bal);
      } catch (ex) { /* ignore */ }

      const l = await getRawLogs();
      setRawLogs(l.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

      if (selectedCalendarProfile) {
        try {
          const cl = await getRawLogs(selectedCalendarProfile.pin);
          setSelectedCalendarLogs(cl.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (e) { /* ignore */ }
      }

      // Fetch departments & designations lists
      const depts = await getDepartments();
      setDepartmentsList(depts);

      const desigs = await getDesignations();
      setDesignationsList(desigs);

      // Fetch shift timings
      const timings = await getShiftTimings();
      setShiftTimings(timings);

      // Fetch complaints (table may not exist yet)
      try {
        const complaints = await getComplaints();
        setComplaintsList(complaints);
      } catch (e) { /* console removed */ }

      // Fetch approved corrections (table may not exist yet)
      try {
        const appCorrs = await getApprovedAttendanceCorrections();
        setApprovedCorrectionsList(appCorrs);
      } catch (e) { /* ignore */ }

      // Fetch employee loans
      try {
        const loans = await getEmployeeLoans();
        setEmployeeLoansList(loans);
      } catch (e) { /* ignore */ }

      // Fetch announcements (table may not exist yet)
      try {
        const announcements = await getAnnouncements();
        setAnnouncementsList(announcements);
      } catch (e) { /* console removed */ }

      // Fetch notifications (table may not exist yet)
      try {
        const adminIdForNotif = currentAdmin?.id || _user?.id || _user?.email;
        const notifications = await getNotifications(adminIdForNotif, true);
        setNotificationsList(notifications);
      } catch (e) { /* console removed */ }

      // Fetch holidays (table may not exist yet)
      try {
        const holidays = await getHolidays();
        setHolidaysList(holidays);
      } catch (e) { /* console removed */ }

      // Check and trigger birthday notifications
      try {
        await checkAndTriggerBirthdayNotifications();
      } catch (e) { /* console removed */ }

      // Fetch purpose/charity transfers
      try {
        const transfers = await getPurposeTransfers();
        setPurposeTransfersList(transfers);
      } catch (e) { /* ignore */ }

      // Fetch device settings
      try {
        const settings = await getDeviceSettings();
        setDeviceSettings(settings);
        setEditDeviceIp(settings.ip_address);
        setEditDevicePort(settings.port);
        setEditDeviceInterval(settings.sync_interval);
        if (settings.auto_backup_enabled !== undefined) setEditAutoBackupEnabled(!!settings.auto_backup_enabled);
        if (settings.backup_directory) setEditBackupDirectory(settings.backup_directory);
        if (settings.grace_time_mins) setGraceTimeMinsSetting(settings.grace_time_mins);
        if (settings.monthly_grace_settings) setMonthlyGraceSettings(settings.monthly_grace_settings);
        if (settings.default_shift_start_time) setDefaultShiftStart(settings.default_shift_start_time);
        if (settings.default_shift_end_time) setDefaultShiftEnd(settings.default_shift_end_time);
        if (settings.default_shift_total_hours !== undefined) setDefaultShiftHours(settings.default_shift_total_hours);
      } catch (e) { /* console removed */ }
    } catch (err) {
      /* console removed */
    } finally {
      if (silent) {
        setLoading(false);
      } else {
        window.hideLoading();
      }
    }
  };

  const handleCalendarDayClick = (dateStr: string) => {
    const holiday = holidaysList.find(h => h.date === dateStr);
    const birthdays = profiles.filter(p => {
      if (!p.date_of_birth) return false;
      const dob = new Date(p.date_of_birth + 'T00:00:00');
      const day = new Date(dateStr + 'T00:00:00');
      return dob.getMonth() === day.getMonth() && dob.getDate() === day.getDate();
    });
    const leaves = leaveRequests.filter(lr => {
      if (lr.status !== 'Approved') return false;
      return dateStr >= lr.start_date && dateStr <= lr.end_date;
    }).map(lr => {
      const emp = profiles.find(p => p.id === lr.employee_id);
      return {
        ...lr,
        employeeName: emp ? emp.full_name : 'Unknown'
      };
    });

    const holidayDates = holidaysList.map(h => h.date);
    const attendanceList = profiles.map(emp => {
      const empLeaves = leaveRequests.filter(lr => lr.employee_id === emp.id);
      const timing = getEmployeeShiftTimingHelper(emp);
      const graceParam = timing.graceMins !== undefined ? timing.graceMins : (monthlyGraceSettings && Object.keys(monthlyGraceSettings).length > 0 ? monthlyGraceSettings : graceTimeMinsSetting);
      
      const processed = processAttendanceLogs(
        emp,
        rawLogs,
        empLeaves,
        dateStr,
        dateStr,
        holidayDates,
        graceParam,
        timing.startTime,
        timing.endTime,
        complaintsList,
        approvedCorrectionsList,
        timing.isFixedHours,
        timing.totalHours,
        shiftTimings,
        employeeLoansList
      );
      
      const summary = processed[0] || {
        status: holiday ? 'Holiday' : 'Uninformed Absent',
        checkIn: null,
        checkOut: null,
        workingHours: 0,
        overtimeHours: 0,
        isAbsent: !holiday,
        isLate: false
      };
      
      return {
        employeeName: emp.full_name,
        pin: emp.pin,
        status: summary.status,
        checkIn: summary.checkIn,
        checkOut: summary.checkOut,
        workingHours: summary.workingHours,
        overtimeHours: summary.overtimeHours,
        isAbsent: summary.isAbsent,
        isLate: summary.isLate
      };
    });

    setSelectedCalendarDayData({
      dateStr,
      holiday,
      birthdays,
      leaves,
      attendanceList
    });
  };

  const handleAdminEmpCalendarDayClick = (daySummary: DailySummary) => {
    if (!selectedCalendarProfile) return;
    const dateStr = daySummary.date;
    const holiday = holidaysList.find(h => h.date === dateStr);
    
    let isBirthday = false;
    if (selectedCalendarProfile.date_of_birth) {
      const dob = new Date(selectedCalendarProfile.date_of_birth + 'T00:00:00');
      const day = new Date(dateStr + 'T00:00:00');
      isBirthday = dob.getMonth() === day.getMonth() && dob.getDate() === day.getDate();
    }

    const ownLeave = leaveRequests.find(lr => {
      if (lr.status !== 'Approved') return false;
      return lr.employee_id === selectedCalendarProfile.id && dateStr >= lr.start_date && dateStr <= lr.end_date;
    });

    setSelectedAdminEmpCalendarDayData({
      dateStr,
      daySummary,
      holiday,
      isBirthday,
      ownLeave
    });
  };

  const handleSaveDeviceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    window.showLoading('Saving device settings...');
    try {
      await updateDeviceSettings({
        ip_address: editDeviceIp,
        port: editDevicePort,
        sync_interval: editDeviceInterval,
        auto_backup_enabled: editAutoBackupEnabled,
        backup_directory: editBackupDirectory
      });
      const settings = await getDeviceSettings();
      setDeviceSettings(settings);
      window.customAlert('Device & Backup settings updated successfully!');
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to update device settings.');
    } finally {
      window.hideLoading();
    }
  };

  const handleToggleMuteNotifications = async () => {
    const newMuteState = !deviceSettings.is_notifications_muted;
    const actionLabel = newMuteState ? 'Muting all system notifications...' : 'Unmuting system notifications...';
    window.showLoading(actionLabel);
    try {
      await updateDeviceSettings({
        is_notifications_muted: newMuteState
      });
      setDeviceSettings(prev => ({ ...prev, is_notifications_muted: newMuteState }));
      if (newMuteState) {
        window.customAlert('System Notifications Muted.\n\nAll real-time push alerts, sound chimes, and banners are now silenced across all devices.', 'Notifications Muted');
      } else {
        window.customAlert('System Notifications Unmuted.\n\nReal-time push alerts and banners are now active normally.', 'Notifications Active');
      }
    } catch (err) {
      window.customAlert('Failed to update notification mute state.');
    } finally {
      window.hideLoading();
    }
  };

  // Helper to format currency (Pakistani Rupee formatting)
  const formatSalary = (amount: number) => {
    const rounded = roundSalary(amount);
    return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(rounded)}`;
  };

  // Holiday handlers
  const handleDeclareHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayTitle.trim() || !selectedHolidayDate) {
      window.customAlert('Please provide a holiday title and date.');
      return;
    }
    window.showLoading('Declaring holiday...');
    try {
      await createHoliday({
        date: selectedHolidayDate,
        title: holidayTitle.trim(),
        description: holidayDescription.trim() || undefined,
        color: holidayColor || '#3b82f6',
        created_by: _user.id
      });
      await createNotification({
        user_id: null,
        title: 'Holiday Declared',
        message: `${holidayTitle.trim()} on ${new Date(selectedHolidayDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
      });
      const holidays = await getHolidays();
      setHolidaysList(holidays);
      setIsHolidayModalOpen(false);
      setHolidayTitle('');
      setHolidayDescription('');
      setHolidayColor('#3b82f6');
      setSelectedHolidayDate('');
      window.customAlert('Holiday declared successfully!');
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to declare holiday.');
    } finally {
      window.hideLoading();
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    const approved = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        'Are you sure you want to remove this holiday?',
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!approved) return;
    window.showLoading('Removing holiday...');
    try {
      await deleteHoliday(id);
      const holidays = await getHolidays();
      setHolidaysList(holidays);
      window.customAlert('Holiday removed.');
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to remove holiday.');
    } finally {
      window.hideLoading();
    }
  };

  // Load draft announcement on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('draft_announcement');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setAnnounceTitle(parsed.title);
        if (parsed.message) setAnnounceMessage(parsed.message);
        if (parsed.targetType) setAnnounceTargetType(parsed.targetType);
        if (parsed.targetValue) setAnnounceTargetValue(parsed.targetValue);
      }
    } catch (e) {
      /* console removed */
    }
  }, []);

  // Save draft announcement on change
  useEffect(() => {
    const draft = {
      title: announceTitle,
      message: announceMessage,
      targetType: announceTargetType,
      targetValue: announceTargetValue
    };
    if (announceTitle || announceMessage || announceTargetValue) {
      localStorage.setItem('draft_announcement', JSON.stringify(draft));
    }
  }, [announceTitle, announceMessage, announceTargetType, announceTargetValue]);

  // Refresh raw logs whenever an employee calendar is opened or month/year changes
  useEffect(() => {
    if (selectedCalendarProfile) {
      const loadLiveLogs = async () => {
        try {
          const l = await getRawLogs(selectedCalendarProfile.pin);
          setSelectedCalendarLogs(l.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (e) {
          /* console removed */
        }
      };
      loadLiveLogs();
    }
  }, [selectedCalendarProfile, adminViewMonth, adminViewYear]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle.trim() || !announceMessage.trim()) {
      window.customAlert('Please fill in announcement title and message.');
      return;
    }

    window.showLoading('Publishing announcement...');
    try {
      await createAnnouncement({
        title: announceTitle.trim(),
        message: announceMessage.trim(),
        target_type: announceTargetType,
        target_value: announceTargetType === 'all' ? undefined : announceTargetValue,
        color: announceColor
      });

      // Create targeted notifications based on audience selection
      try {
        const notifTitle = `Announcement: ${announceTitle.trim()}`;
        const notifMsg = announceMessage.trim();
        if (announceTargetType === 'all') {
          await createNotification({
            user_id: null,
            title: notifTitle,
            message: notifMsg
          });
        } else if (announceTargetType === 'employee') {
          await createNotification({
            user_id: announceTargetValue,
            title: notifTitle,
            message: notifMsg
          });
        } else if (announceTargetType === 'department') {
          const targetedEmployees = profiles.filter(p => p.department === announceTargetValue && p.role !== 'admin');
          for (const emp of targetedEmployees) {
            await createNotification({
              user_id: emp.id,
              title: `${notifTitle} (${announceTargetValue} Dept)`,
              message: notifMsg
            });
          }
        } else if (announceTargetType === 'designation') {
          const targetedEmployees = profiles.filter(p => p.designation === announceTargetValue && p.role !== 'admin');
          for (const emp of targetedEmployees) {
            await createNotification({
              user_id: emp.id,
              title: `${notifTitle} (${announceTargetValue})`,
              message: notifMsg
            });
          }
        }
      } catch (e) {
        /* console removed */
      }

      // Clear draft on success
      localStorage.removeItem('draft_announcement');

      setAnnounceTitle('');
      setAnnounceMessage('');
      setAnnounceTargetValue('');
      setAnnounceColor('#ff3b57');

      const announcements = await getAnnouncements();
      setAnnouncementsList(announcements);

      window.customAlert('Announcement published and sent successfully to targeted audience!');
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to publish announcement. Please try again.');
    } finally {
      window.hideLoading();
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    const approved = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        'Are you sure you want to delete this announcement?',
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!approved) return;

    window.showLoading('Deleting announcement...');
    try {
      await deleteAnnouncement(id);
      const announcements = await getAnnouncements();
      setAnnouncementsList(announcements);
      window.customAlert('Announcement deleted successfully.');
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to delete announcement.');
    } finally {
      window.hideLoading();
    }
  };

  const handleUpdateComplaintStatus = async (id: number, status: 'Open' | 'In Progress' | 'Resolved' | 'Ignored' | 'Rejected') => {
    window.showLoading('Updating request status...');
    try {
      const comp = complaintsList.find(c => c.id === id);
      await updateComplaintStatus(id, status as any);

      // If status is changed away from Resolved (e.g. reverted to Open, or marked as Ignored/Rejected), and this is an Attendance Correction:
      if (comp && (comp.title === 'Check In/Out Entry Correction' || comp.title.includes('Correction')) && status !== 'Resolved') {
        try {
          const parsed = typeof comp.description === 'string' ? JSON.parse(comp.description) : comp.description;
          const correctionDate = parsed?.date;
          if (correctionDate) {
            const emp = profiles.find(p => p.id === comp.employee_id);
            const pinToUse = emp?.pin ? String(emp.pin).trim() : (comp.employee_id || '');
            
            // 1. Delete from approved_attendance_corrections
            await deleteApprovedAttendanceCorrection(comp.employee_id, correctionDate, pinToUse);

            // 2. Remove injected raw logs for that date
            const startOfDay = new Date(`${correctionDate}T00:00:00`).toISOString();
            const nextDay = new Date(new Date(`${correctionDate}T00:00:00`).getTime() + 36 * 60 * 60 * 1000).toISOString();
            if (pinToUse) {
              await supabase
                .from('raw_attendance_logs')
                .delete()
                .eq('employee_pin', pinToUse)
                .gte('timestamp', startOfDay)
                .lte('timestamp', nextDay);
            }
          }
        } catch (e) {}
      }
      
      if (comp) {
        try {
          await createNotification({
            user_id: comp.employee_id,
            title: 'Helpdesk Update',
            message: `Your request "${comp.title}" has been marked as ${status}.`
          });
        } catch (e) {
          /* console removed */
        }
      }

      netSalaryCacheRef.current = {};
      const complaints = await getComplaints();
      setComplaintsList(complaints);
      const appCorrs = await getApprovedAttendanceCorrections();
      setApprovedCorrectionsList(appCorrs);
      const newRawLogs = await getRawLogs();
      setRawLogs(newRawLogs);
      fetchData();

      window.customAlert(`Request marked as "${status}" successfully.`);
    } catch (err: any) {
      console.error('Failed to update complaint status:', err);
      const errMsg = err?.message || err?.details || 'Failed to update request status.';
      window.customAlert(`Failed to update request status: ${errMsg}`);
    } finally {
      window.hideLoading();
    }
  };

  const handleApproveAttendanceCorrection = async (complaint: Complaint) => {
    if (complaint.title !== 'Check In/Out Entry Correction') return;

    window.showLoading('Approving correction...');
    try {
      const data = JSON.parse(complaint.description);
      const { date, check_in, check_out } = data;

      if (!date) {
        window.customAlert('Invalid correction data: date missing.');
        return;
      }

      // Find employee by ID
      const emp = profiles.find(p => p.id === complaint.employee_id);
      if (!emp) {
        window.customAlert('Employee not found.');
        return;
      }

      // Parse time safely - handles both "10:00" and "10:00 AM" formats
      const parseTime = (t: string): string | null => {
        if (!t) return null;
        if (/^\d{2}:\d{2}$/.test(t)) return t;
        const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!m) return null;
        let h = Number(m[1]);
        if (/pm/i.test(m[3]) && h !== 12) h += 12;
        if (/am/i.test(m[3]) && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m[2]}`;
      };

      const safeCheckIn = parseTime(check_in);
      const safeCheckOut = parseTime(check_out);

      let inDateObj = safeCheckIn ? new Date(`${date}T${safeCheckIn}:00`) : null;
      let outDateObj = safeCheckOut ? new Date(`${date}T${safeCheckOut}:00`) : null;

      // Auto-correct 12:xx AM typo for afternoon check-in when check-out is in evening/night (e.g. 12:33 AM to 11:55 PM -> 12:33 PM to 11:55 PM)
      if (inDateObj && outDateObj) {
        const diffHrs = (outDateObj.getTime() - inDateObj.getTime()) / (1000 * 60 * 60);
        if (diffHrs > 12 && inDateObj.getHours() === 0) {
          inDateObj.setHours(12);
        }
      }

      // Handle overnight / night shift checkout (e.g. check-in at 5:45 PM, check-out at 3:45 AM next morning)
      if (inDateObj && outDateObj && outDateObj < inDateObj) {
        outDateObj.setDate(outDateObj.getDate() + 1);
      }

      const pinToUse = String(emp.pin || emp.id).trim();

      // Create raw attendance log entries
      const logs: RawLog[] = [];
      if (inDateObj) {
        logs.push({
          employee_pin: pinToUse,
          timestamp: inDateObj.toISOString(),
          verify_type: 1,
          status_type: 0
        });
      }
      if (outDateObj) {
        logs.push({
          employee_pin: pinToUse,
          timestamp: outDateObj.toISOString(),
          verify_type: 1,
          status_type: 1
        });
      }

      // Delete any existing raw logs for this employee for the shift period to cleanly overwrite device logs
      const startOfDay = new Date(`${date}T00:00:00`).toISOString();
      const endOfDay = outDateObj 
        ? new Date(outDateObj.getTime() + 60 * 60 * 1000).toISOString()
        : new Date(`${date}T23:59:59`).toISOString();

      if (pinToUse) {
        await supabase
          .from('raw_attendance_logs')
          .delete()
          .eq('employee_pin', pinToUse)
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay);
      }

      if (logs.length > 0) {
        await uploadRawLogs(logs);
      }

      const formattedInStr = inDateObj ? inDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (check_in || null);
      const formattedOutStr = outDateObj ? outDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (check_out || null);

      // Save persistent approved correction record
      await saveApprovedAttendanceCorrection({
        employee_id: emp.id,
        employee_pin: pinToUse,
        date,
        check_in: formattedInStr,
        check_out: formattedOutStr,
        status: 'Approved'
      });

      // Mark complaint as Resolved
      await updateComplaintStatus(complaint.id!, 'Resolved');

      // Notify employee
      try {
        await createNotification({
          user_id: complaint.employee_id,
          title: 'Attendance Correction Approved',
          message: `Your check-in/out correction for ${date} has been approved and updated.`
        });
      } catch (e) {
        /* console removed */
      }

      // Refresh data
      const newRawLogs = await getRawLogs();
      setRawLogs(newRawLogs);
      const complaints = await getComplaints();
      setComplaintsList(complaints);
      const appCorrs = await getApprovedAttendanceCorrections();
      setApprovedCorrectionsList(appCorrs);

      if (logs.length === 0) {
        window.customAlert('Correction approved! Day recorded as Uninformed Absent.');
      } else {
        window.customAlert(`Correction approved! ${logs.length} log entry(s) added.`);
      }
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to approve correction. Invalid data format.');
    } finally {
      window.hideLoading();
    }
  };

  const handleSaveAndApproveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCorrectionComplaint) return;

    window.showLoading('Approving correction...');
    try {
      const emp = profiles.find(p => p.id === editingCorrectionComplaint.employee_id);
      if (!emp) {
        window.customAlert('Employee not found.');
        return;
      }

      // Parse time safely - handles both "10:00" and "10:00 AM" formats
      const parseTime = (t: string): string | null => {
        if (!t) return null;
        if (/^\d{2}:\d{2}$/.test(t)) return t;
        const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!m) return null;
        let h = Number(m[1]);
        if (/pm/i.test(m[3]) && h !== 12) h += 12;
        if (/am/i.test(m[3]) && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m[2]}`;
      };

      const safeCheckIn = parseTime(editCorrectionCheckIn);
      const safeCheckOut = parseTime(editCorrectionCheckOut);

      let inDateObj = safeCheckIn ? new Date(`${editCorrectionDate}T${safeCheckIn}:00`) : null;
      let outDateObj = safeCheckOut ? new Date(`${editCorrectionDate}T${safeCheckOut}:00`) : null;

      // Auto-correct 12:xx AM typo for afternoon check-in when check-out is in evening/night (e.g. 12:33 AM to 11:55 PM -> 12:33 PM to 11:55 PM)
      if (inDateObj && outDateObj) {
        const diffHrs = (outDateObj.getTime() - inDateObj.getTime()) / (1000 * 60 * 60);
        if (diffHrs > 12 && inDateObj.getHours() === 0) {
          inDateObj.setHours(12);
        }
      }

      // Handle overnight / night shift checkout (e.g. check-in at 5:45 PM, check-out at 3:45 AM next morning)
      if (inDateObj && outDateObj && outDateObj < inDateObj) {
        outDateObj.setDate(outDateObj.getDate() + 1);
      }

      const pinToUse = String(emp.pin || emp.id).trim();

      // Create raw attendance log entries
      const logs: RawLog[] = [];
      if (inDateObj) {
        logs.push({
          employee_pin: pinToUse,
          timestamp: inDateObj.toISOString(),
          verify_type: 1,
          status_type: 0
        });
      }
      if (outDateObj) {
        logs.push({
          employee_pin: pinToUse,
          timestamp: outDateObj.toISOString(),
          verify_type: 1,
          status_type: 1
        });
      }

      // Delete any existing raw logs for this employee for the shift period to cleanly overwrite device logs
      const startOfDay = new Date(`${editCorrectionDate}T00:00:00`).toISOString();
      const endOfDay = outDateObj 
        ? new Date(outDateObj.getTime() + 60 * 60 * 1000).toISOString()
        : new Date(`${editCorrectionDate}T23:59:59`).toISOString();

      if (pinToUse) {
        await supabase
          .from('raw_attendance_logs')
          .delete()
          .eq('employee_pin', pinToUse)
          .gte('timestamp', startOfDay)
          .lte('timestamp', endOfDay);
      }

      if (logs.length > 0) {
        await uploadRawLogs(logs);
      }

      const formattedInStr = inDateObj ? inDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (editCorrectionCheckIn || null);
      const formattedOutStr = outDateObj ? outDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : (editCorrectionCheckOut || null);

      // Save persistent approved correction record
      await saveApprovedAttendanceCorrection({
        employee_id: emp.id,
        employee_pin: pinToUse,
        date: editCorrectionDate,
        check_in: formattedInStr,
        check_out: formattedOutStr,
        status: 'Approved'
      });

      // Update complaint description with newly edited correction details
      const existingData = JSON.parse(editingCorrectionComplaint.description || '{}');
      const updatedDescription = JSON.stringify({
        date: editCorrectionDate,
        check_in: editCorrectionCheckIn,
        check_out: editCorrectionCheckOut,
        reason: existingData.reason || ''
      });
      await supabase
        .from('complaints')
        .update({ description: updatedDescription })
        .eq('id', editingCorrectionComplaint.id);

      // Mark complaint as Resolved
      await updateComplaintStatus(editingCorrectionComplaint.id!, 'Resolved');

      // Notify employee
      try {
        await createNotification({
          user_id: editingCorrectionComplaint.employee_id,
          title: 'Attendance Correction Approved',
          message: `Your check-in/out correction for ${editCorrectionDate} has been approved and updated.`
        });
      } catch (e) {
        /* console removed */
      }

      // Refresh data
      const newRawLogs = await getRawLogs();
      setRawLogs(newRawLogs);
      const complaints = await getComplaints();
      setComplaintsList(complaints);
      const appCorrs = await getApprovedAttendanceCorrections();
      setApprovedCorrectionsList(appCorrs);

      setEditingCorrectionComplaint(null);
      if (logs.length === 0) {
        window.customAlert('Correction approved! Day recorded as Uninformed Absent.');
      } else {
        window.customAlert(`Correction approved! ${logs.length} log entry(s) added.`);
      }
    } catch (err) {
      window.customAlert('Failed to approve correction. Invalid time format.');
    } finally {
      window.hideLoading();
    }
  };

  // Helper to generate loan deduction schedule months
  const generateLoanScheduleMonths = (startD: Date, durationMonths: number, previouslySelected?: string[], previouslySkipped?: string[]): LoanScheduleMonth[] => {
    const list: LoanScheduleMonth[] = [];
    const base = new Date(startD);
    const pad = (n: number) => n.toString().padStart(2, '0');

    // If previous selection exists, use it
    if (previouslySelected && previouslySelected.length > 0) {
      const allKeys = Array.from(new Set([...previouslySelected, ...(previouslySkipped || [])])).sort();
      for (const k of allKeys) {
        const [yrStr, moStr] = k.split('-');
        const d = new Date(parseInt(yrStr, 10), parseInt(moStr, 10) - 1, 1);
        list.push({
          key: k,
          label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          isSelected: previouslySelected.includes(k)
        });
      }
      return list;
    }

    // Default: generate consecutive active months starting from next month (or start month)
    let addedMonths = 0;
    let loopDate = new Date(base.getFullYear(), base.getMonth(), 1);
    while (addedMonths < Math.max(1, durationMonths)) {
      const yr = loopDate.getFullYear();
      const mo = loopDate.getMonth() + 1;
      const key = `${yr}-${pad(mo)}`;
      const label = loopDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      list.push({
        key,
        label,
        isSelected: true
      });
      addedMonths++;
      loopDate.setMonth(loopDate.getMonth() + 1);
    }
    return list;
  };

  const handleOpenApproveLoanModal = (loan: EmployeeLoan) => {
    setScheduleModalLoan(loan);
    setScheduleModalMode('approve');
    setScheduleLoanName(loan.loan_name || 'Loan Request');
    setScheduleLoanAmount(loan.loan_amount.toString());
    setScheduleDuration(loan.months_duration || 10);
    setScheduleLoanTaxMode(loan.loan_tax_mode || 'same');
    setScheduleLoanTaxAmount(loan.loan_tax_amount !== undefined ? String(loan.loan_tax_amount) : '0');
    setScheduleLoanDeductionBasis(loan.deduction_basis || 'net_salary');
    const months = generateLoanScheduleMonths(new Date(), loan.months_duration || 10);
    setScheduleMonths(months);
  };

  const handleOpenModifyLoanModal = (loan: EmployeeLoan) => {
    setScheduleModalLoan(loan);
    setScheduleModalMode('modify');
    setScheduleLoanName(loan.loan_name || 'Loan Request');
    setScheduleLoanAmount(loan.loan_amount.toString());
    setScheduleDuration(loan.months_duration || 10);
    setScheduleLoanTaxMode(loan.loan_tax_mode || 'same');
    setScheduleLoanTaxAmount(loan.loan_tax_amount !== undefined ? String(loan.loan_tax_amount) : '0');
    setScheduleLoanDeductionBasis(loan.deduction_basis || 'net_salary');
    const startD = loan.start_date ? new Date(loan.start_date) : new Date();
    const months = generateLoanScheduleMonths(startD, loan.months_duration || 10, loan.selected_months, loan.skipped_months);
    setScheduleMonths(months);
  };

  const handleConfirmLoanSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalLoan) return;

    const amt = parseFloat(scheduleLoanAmount);
    const activeMonths = scheduleMonths.filter(m => m.isSelected);
    const skippedMonths = scheduleMonths.filter(m => !m.isSelected);

    if (!scheduleLoanName.trim() || isNaN(amt) || amt <= 0 || activeMonths.length === 0) {
      window.customAlert('Please enter valid loan details and ensure at least one active month is selected for deduction.');
      return;
    }

    const perMonthDeduction = Math.round(amt / activeMonths.length);
    const startDate = activeMonths[0] ? `${activeMonths[0].key}-01T00:00:00.000Z` : new Date().toISOString();
    const lastActiveMonth = activeMonths[activeMonths.length - 1];
    const [endYr, endMo] = lastActiveMonth.key.split('-');
    const endDate = new Date(parseInt(endYr, 10), parseInt(endMo, 10), 0).toISOString();

    const isApproveMode = scheduleModalMode === 'approve';
    const actionLabel = isApproveMode ? 'Approving loan & activating schedule...' : 'Saving loan schedule changes...';

    window.showLoading(actionLabel);
    try {
      const customTaxNum = scheduleLoanTaxMode === 'custom' ? parseFloat(scheduleLoanTaxAmount) || 0 : undefined;

      const payload: Partial<EmployeeLoan> = {
        loan_name: scheduleLoanName.trim(),
        loan_amount: amt,
        monthly_deduction: perMonthDeduction,
        months_duration: scheduleMonths.length,
        selected_months: activeMonths.map(m => m.key),
        skipped_months: skippedMonths.map(m => m.key),
        start_date: startDate,
        end_date: endDate,
        loan_tax_mode: scheduleLoanTaxMode,
        loan_tax_amount: customTaxNum,
        deduction_basis: scheduleLoanDeductionBasis,
        remaining_balance: Math.max(0, amt - (scheduleModalLoan.total_repaid || 0))
      };

      if (isApproveMode) {
        payload.status = 'Approved';
      }

      await updateEmployeeLoan(scheduleModalLoan.id!, payload);

      await createNotification({
        user_id: scheduleModalLoan.employee_id,
        title: isApproveMode ? 'Loan Approved & Scheduled' : 'Loan Schedule Updated',
        message: isApproveMode
          ? `Your loan request for PKR ${amt.toLocaleString()} (${scheduleLoanName.trim()}) has been APPROVED with a monthly deduction of PKR ${perMonthDeduction.toLocaleString()} across ${activeMonths.length} active months.`
          : `Your loan schedule for PKR ${amt.toLocaleString()} (${scheduleLoanName.trim()}) has been updated by Admin to PKR ${perMonthDeduction.toLocaleString()}/month.`
      });

      const loans = await getEmployeeLoans();
      setEmployeeLoansList(loans);
      setScheduleModalLoan(null);
      window.customAlert(isApproveMode ? 'Loan approved and schedule activated successfully.' : 'Loan schedule updated successfully.');
    } catch (err) {
      window.customAlert('Failed to save loan schedule.');
    } finally {
      window.hideLoading();
    }
  };

  const handleRevertLoan = async (loan: EmployeeLoan) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        `Revert approval for "${loan.loan_name}" (${loan.employee_name || loan.employee_pin}) back to Pending?`,
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!confirmed) return;

    window.showLoading('Reverting loan status to Pending...');
    try {
      await updateEmployeeLoan(loan.id!, {
        status: 'Pending',
        start_date: undefined,
        end_date: undefined,
        total_repaid: 0,
        remaining_balance: loan.loan_amount
      });
      const loans = await getEmployeeLoans();
      setEmployeeLoansList(loans);
      window.customAlert('Loan status reverted back to Pending.');
    } catch (e) {
      window.customAlert('Failed to revert loan status.');
    } finally {
      window.hideLoading();
    }
  };

  const handleRejectLoan = async (loan: EmployeeLoan) => {
    const rejected = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        `Reject/Ignore loan request of PKR ${loan.loan_amount.toLocaleString()} for ${loan.employee_name || loan.employee_pin}?`,
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!rejected) return;

    window.showLoading('Rejecting loan request...');
    try {
      await updateEmployeeLoan(loan.id!, { status: 'Rejected' });
      await createNotification({
        user_id: loan.employee_id,
        title: 'Loan Request Status',
        message: `Your loan request for PKR ${loan.loan_amount.toLocaleString()} (${loan.loan_name}) was not approved.`
      });
      const loans = await getEmployeeLoans();
      setEmployeeLoansList(loans);
      window.customAlert('Loan request rejected.');
    } catch (e) {
      window.customAlert('Failed to reject loan request.');
    } finally {
      window.hideLoading();
    }
  };

  const handleDeleteLoanRecord = async (id: number) => {
    const approved = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        'Are you sure you want to delete this loan record permanently?',
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!approved) return;

    window.showLoading('Deleting loan record...');
    try {
      await deleteEmployeeLoan(id);
      const loans = await getEmployeeLoans();
      setEmployeeLoansList(loans);
      window.customAlert('Loan record deleted.');
    } catch (e) {
      window.customAlert('Failed to delete loan record.');
    } finally {
      window.hideLoading();
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentLoan) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      window.customAlert('Please enter a valid payment amount.');
      return;
    }
    window.showLoading('Recording payment...');
    try {
      await recordLoanPayment(paymentLoan.id!, amt, paymentLoan);
      await createNotification({
        user_id: paymentLoan.employee_id,
        title: 'Loan Payment Recorded',
        message: `A payment of PKR ${amt.toLocaleString()} has been recorded for your loan (${paymentLoan.loan_name}). Remaining: PKR ${Math.max(0, paymentLoan.remaining_balance - amt).toLocaleString()}`
      });
      const loans = await getEmployeeLoans();
      setEmployeeLoansList(loans);
      setPaymentLoan(null);
      setPaymentAmount('');
      window.customAlert('Payment recorded successfully.');
    } catch (e) {
      window.customAlert('Failed to record payment.');
    } finally {
      window.hideLoading();
    }
  };

  const handleOpenSkipMonthModal = (loan: EmployeeLoan) => {
    setSkipModalLoan(loan);
    const activeMonths = (loan.selected_months && loan.selected_months.length > 0)
      ? loan.selected_months
      : generateLoanScheduleMonths(loan.start_date ? new Date(loan.start_date) : new Date(), loan.months_duration || 1).map(m => m.key);
    setSelectedMonthToSkip(activeMonths[0] || '');
  };

  const handleConfirmSkipMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skipModalLoan || !selectedMonthToSkip) return;

    window.showLoading('Skipping selected month & extending schedule...');
    try {
      const currentSelected = (skipModalLoan.selected_months && skipModalLoan.selected_months.length > 0)
        ? [...skipModalLoan.selected_months]
        : generateLoanScheduleMonths(skipModalLoan.start_date ? new Date(skipModalLoan.start_date) : new Date(), skipModalLoan.months_duration || 1).map(m => m.key);

      const currentSkipped = skipModalLoan.skipped_months ? [...skipModalLoan.skipped_months] : [];

      // Remove selected month to skip from active selected, add to skipped
      const newSelected = currentSelected.filter(k => k !== selectedMonthToSkip);
      if (!currentSkipped.includes(selectedMonthToSkip)) {
        currentSkipped.push(selectedMonthToSkip);
      }

      // Automatically append next month at the end
      const lastMonthKey = currentSelected[currentSelected.length - 1] || selectedMonthToSkip;
      const [yrStr, moStr] = lastMonthKey.split('-');
      let yr = parseInt(yrStr, 10);
      let mo = parseInt(moStr, 10);
      mo += 1;
      if (mo > 12) { mo = 1; yr += 1; }
      const pad = (n: number) => n.toString().padStart(2, '0');
      const nextKey = `${yr}-${pad(mo)}`;
      newSelected.push(nextKey);

      // Compute new end date
      const [lastYr, lastMo] = nextKey.split('-');
      const newEndDate = new Date(parseInt(lastYr, 10), parseInt(lastMo, 10), 0).toISOString();

      await updateEmployeeLoan(skipModalLoan.id!, {
        selected_months: newSelected,
        skipped_months: currentSkipped,
        months_skipped: (skipModalLoan.months_skipped || 0) + 1,
        end_date: newEndDate
      });

      const [sYr, sMo] = selectedMonthToSkip.split('-');
      const sDate = new Date(parseInt(sYr, 10), parseInt(sMo, 10) - 1, 1);
      const sLabel = sDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      await createNotification({
        user_id: skipModalLoan.employee_id,
        title: 'Loan Month Skipped',
        message: `Your loan deduction for ${sLabel} (${skipModalLoan.loan_name}) has been skipped. Your repayment timeline has been extended.`
      });

      const loans = await getEmployeeLoans();
      setEmployeeLoansList(loans);
      setSkipModalLoan(null);
      window.customAlert(`Month ${sLabel} skipped successfully. Repayment schedule extended.`);
    } catch (e) {
      window.customAlert('Failed to skip month deduction.');
    } finally {
      window.hideLoading();
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const unreadIds = notificationsList.filter(n => !n.is_read && n.id).map(n => n.id!);
      setNotificationsList(prev => prev.map(n => ({ ...n, is_read: true })));
      await markAllNotificationsRead(_user.id, true, unreadIds);
    } catch (err) {
      /* console removed */
    }
  };

  const handleMarkNotificationRead = async (id: number, notification?: Notification) => {
    try {
      setNotificationsList(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      await markNotificationRead(id);
      
      // Redirect to relevant tab based on notification title/content
      if (notification) {
        setShowNotificationsDropdown(false);
        const fullText = (notification.title + ' ' + (notification.message || '')).toLowerCase();
        if (fullText.includes('leave')) {
          setActiveTab('approvals');
          setApprovalsSubTab('leaves');
        } else if (fullText.includes('complaint') || fullText.includes('helpdesk') || fullText.includes('ticket') || fullText.includes('correction') || fullText.includes('feedback')) {
          setActiveTab('approvals');
          setApprovalsSubTab('complaints');
        } else if (fullText.includes('loan')) {
          setActiveTab('approvals');
          setApprovalsSubTab('loans');
        } else if (fullText.includes('announce')) {
          setActiveTab('announcements');
        } else if (fullText.includes('holiday') || fullText.includes('birthday')) {
          setActiveTab('calendar');
        } else if (fullText.includes('attendance')) {
          setActiveTab('attendance');
        } else {
          setActiveTab('overview');
        }
      }
    } catch (err) {
      /* console removed */
    }
  };

  const handleNicChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').substring(0, 13);
    let formatted = '';
    if (cleaned.length > 0) {
      formatted += cleaned.substring(0, 5);
    }
    if (cleaned.length > 5) {
      formatted += '-' + cleaned.substring(5, 12);
    }
    if (cleaned.length > 12) {
      formatted += '-' + cleaned.substring(12, 13);
    }
    setNicNo(formatted);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (employeeModalTab === 'direct_transfer') {
      if (!fullName || !baseSalary) {
        window.customAlert('Please fill in recipient name and transfer amount.');
        return;
      }
      const isEditingTransfer = isEditingProfile && isEditingProfile.toString().startsWith('transfer-');
      window.showLoading(isEditingTransfer ? 'Updating purpose transfer...' : 'Recording purpose transfer...');
      try {
        const transferData: PurposeTransfer = {
          payee_name: fullName.trim(),
          purpose: transferPurpose.trim(),
          amount: parseFloat(baseSalary),
          payment_method: paymentMethod,
          bank_name: paymentMethod === 'Cash' ? 'Cash' : bankName.trim(),
          bank_account_title: paymentMethod === 'Cash' ? 'Cash Payment' : bankAccountTitle.trim(),
          bank_account_no: paymentMethod === 'Cash' ? 'Cash Payment' : bankAccountNo.trim()
        };
        if (isEditingTransfer) {
          const transferId = parseInt(isEditingProfile.replace('transfer-', ''), 10);
          await updatePurposeTransfer(transferId, transferData);
          window.customAlert('Transfer updated successfully!');
        } else {
          await createPurposeTransfer(transferData);
          window.customAlert('Transfer recorded successfully!');
        }
        handleCloseFormModal();
        fetchData();
      } catch (err: any) {
        window.customAlert(err.message || 'Failed to save purpose transfer.');
      } finally {
        window.hideLoading();
      }
      return;
    }

    if (!fullName || !pin || !baseSalary || (!isEditingProfile && (!employeeEmail || !employeePassword))) {
      window.customAlert('Please fill in all required fields.');
      return;
    }

    window.showLoading(isEditingProfile ? 'Updating employee profile...' : 'Creating new employee profile...');
    try {
      const profileData: any = {
        pin: pin.trim(),
        full_name: fullName.trim(),
        designation: designation.trim() || undefined,
        department: department.trim() || undefined,
        joining_date: joiningDate || new Date().toLocaleDateString('en-CA'),
        base_salary: parseFloat(baseSalary),
        hourly_rate: parseFloat(baseSalary) ? parseFloat((parseFloat(baseSalary) / 270).toFixed(2)) : (parseFloat(hourlyRate) || 0),
        role: isRoleAdmin ? 'admin' : 'employee',
        allowed_tabs: isRoleAdmin 
          ? (allowedTabs && allowedTabs.length > 0 ? allowedTabs : [
              'admin:overview', 'admin:calendar', 'admin:employees', 'admin:attendance',
              'admin:approvals', 'admin:payroll', 'admin:timings', 'admin:announcements',
              'admin:device', 'admin:converter'
            ])
          : [],
        is_active: true,
        date_of_birth: dateOfBirth || undefined,
        income_tax: parseFloat(incomeTax) || 0,
        nic_no: nicNo.trim() || undefined,
        phone: employeePhone.trim() || undefined,
        payment_method: paymentMethod,
        bank_name: paymentMethod === 'Cash' ? 'Cash' : (bankName.trim() || undefined),
        bank_account_title: paymentMethod === 'Cash' ? undefined : (bankAccountTitle.trim() || undefined),
        bank_account_no: paymentMethod === 'Cash' ? undefined : (bankAccountNo.trim() || undefined),
        emergency_contacts: newContactName.trim() && newContactPhone.trim() 
          ? [...emergencyContacts, { name: newContactName.trim(), phone: newContactPhone.trim(), relation: newContactRelation }]
          : emergencyContacts,
        timeline_periods: newPeriodHeading.trim() && newPeriodStartDate && newPeriodEndDate
          ? [...timelinePeriods, { heading: newPeriodHeading.trim(), startDate: newPeriodStartDate, endDate: newPeriodEndDate }]
          : timelinePeriods
      };

      if (isEditingProfile) {
        profileData.id = isEditingProfile;
      }

      await saveProfile(profileData, employeeEmail, employeePassword);
      window.customAlert(isEditingProfile ? 'Employee profile updated successfully!' : 'Employee profile created successfully!');

      handleCloseFormModal();
      fetchData();
    } catch (err: any) {
      window.customAlert(err.message || 'Failed to save employee profile.');
    } finally {
      window.hideLoading();
    }
  };

  const exportSalariesPDF = () => {
    setIsExportModalOpen(true);
    if (departmentsList.length > 0 && !exportSelectedDept) {
      setExportSelectedDept(departmentsList[0]);
    }
    const nonAdmin = profiles.filter(p => p.role !== 'admin');
    if (nonAdmin.length > 0 && !exportSelectedEmployeeId) {
      setExportSelectedEmployeeId(nonAdmin[0].id);
    }
  };

  const handleExportPrint = () => {
    const mockTransferProfiles = purposeTransfersList.map(t => ({
      id: `transfer-${t.id}`,
      pin: `TR-${t.id}`,
      full_name: t.payee_name || 'Recorded Purpose Payee',
      designation: t.purpose || 'Recorded Purpose',
      department: 'Recorded Purpose',
      base_salary: Number(t.amount) || 0,
      hourly_rate: 0,
      joining_date: t.created_at ? new Date(t.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : new Date().toLocaleDateString(),
      role: 'employee',
      payment_method: t.payment_method || 'Bank',
      bank_name: t.bank_name || '-',
      bank_account_title: t.bank_account_title || t.payee_name || '-',
      bank_account_no: t.bank_account_no || '-',
      emergency_contacts: [],
      timeline_periods: [],
      income_tax: 0
    })) as any[];

    let allProfilesAndTransfers = [
      ...profiles.filter(p => p.role !== 'admin'),
      ...(exportIncludePurposePayee ? mockTransferProfiles : [])
    ];

    if (exportExcludedIds.length > 0) {
      allProfilesAndTransfers = allProfilesAndTransfers.filter(p => !exportExcludedIds.includes(String(p.id)));
    }

    let targetProfiles = allProfilesAndTransfers;
    let targetLabel = 'All Employees';

    if (exportTarget === 'department') {
      if (!exportSelectedDept) {
        window.customAlert('Please select a department.');
        return;
      }
      targetProfiles = allProfilesAndTransfers.filter(p => p.department === exportSelectedDept || (exportIncludePurposePayee && String(p.id).startsWith('transfer-')));
      targetLabel = `${exportSelectedDept} Department`;
    } else if (exportTarget === 'employee') {
      if (!exportSelectedEmployeeId) {
        window.customAlert('Please select an employee.');
        return;
      }
      targetProfiles = allProfilesAndTransfers.filter(p => p.id === exportSelectedEmployeeId);
      const emp = targetProfiles[0];
      targetLabel = emp ? emp.full_name : 'Specific Employee';
    }
    if (exportPaymentFilter !== 'all') {
      targetProfiles = targetProfiles.filter(p => {
        const isCash = (p as any).payment_method === 'Cash' || p.bank_name === 'Cash' || !p.bank_name || !p.bank_account_no;
        const method = isCash ? 'Cash' : 'Bank';
        return method === exportPaymentFilter;
      });
      targetLabel += ` (${exportPaymentFilter} Payments)`;
    }

    if (targetProfiles.length === 0) {
      window.customAlert('No employee records found for the selected criteria.');
      return;
    }

    const title = exportTarget === 'employee' ? `Salary Certificate - ${targetLabel}` : `Disbursement Advice - ${targetLabel}`;

    const freshPayrollSummary = calculatePayrollSummary();

    const getNetSalary = (p: any) => {
      if (String(p.id).startsWith('transfer-')) {
        return p.base_salary || 0;
      }
      const payrollRow = freshPayrollSummary.find(row => row.id === p.id || (row.pin && p.pin && matchPin(row.pin, p.pin)));
      let baseSalary = Number(p.base_salary) || 0;
      let incomeTax = Number(p.income_tax) || 0;
      let loanDeduction = 0;

      if (payrollRow) {
        loanDeduction = Number(payrollRow.loanDeduction) || 0;
        if (payrollRow.incomeTax !== undefined) incomeTax = Number(payrollRow.incomeTax) || 0;
        baseSalary = Number(payrollRow.baseSalary) || baseSalary;
      }
      const effectiveBase = Math.max(0, baseSalary - loanDeduction);
      const salaryAfterTax = Math.max(0, effectiveBase - incomeTax);

      if (payrollRow) {
        const withOtNet = Number(payrollRow.totalPayable) || 0;
        const otAmount = Number(payrollRow.totalOvertimePayout) || 0;

        if (exportOtMode === 'without_ot') {
          return Math.max(0, withOtNet - otAmount);
        } else if (exportOtMode === 'base_x_ot') {
          return Math.min(salaryAfterTax, withOtNet);
        }
        return withOtNet;
      }

      if (exportOtMode === 'base_x_ot') {
        return salaryAfterTax;
      }
      return salaryAfterTax;
    };

    if (customExportFormat === 'excel') {
      const excelRows = targetProfiles.map(p => {
        const rowData: any = {};
        if (exportCols.pin) rowData['PIN'] = p.pin;
        if (exportCols.name) rowData['Employee Name'] = p.full_name;
        if (exportCols.dept) rowData['Department'] = p.department || '-';
        if (exportCols.designation) rowData['Designation'] = p.designation || '-';
        if (exportCols.base_salary) rowData['Base Salary (PKR)'] = roundSalary(p.base_salary || 0);
        if (exportCols.net_salary) rowData['Net Salary (PKR)'] = roundSalary(getNetSalary(p));
        if (exportCols.payment_method) rowData['Payment Method'] = p.payment_method || 'Bank';
        if (exportCols.bank_name) rowData['Bank Name'] = p.bank_name || '-';
        if (exportCols.bank_account_title) rowData['Account Title'] = p.bank_account_title || '-';
        if (exportCols.bank_account_no) rowData['Account No'] = p.bank_account_no || '-';
        return rowData;
      });

      const worksheet = XLSX.utils.json_to_sheet(excelRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Export Data');
      downloadExcelWorkbook(workbook, `Export_${targetLabel.replace(/ /g, '_')}.xlsx`);
      setIsExportModalOpen(false);
      return;
    }

    if (customExportFormat === 'word') {
      const selectedColKeys = Object.keys(exportCols).filter(k => (exportCols as any)[k]);
      const colTitleMap: any = {
        pin: 'PIN', name: 'Name', department: 'Dept', designation: 'Designation',
        base_salary: 'Base Salary', net_salary: 'Net Salary', payment_method: 'Method',
        bank_name: 'Bank', bank_account_title: 'Title', bank_account_no: 'Account No'
      };

      const headerRow = new TableRow({
        children: selectedColKeys.map(k => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: colTitleMap[k] || k, bold: true, color: 'FFFFFF', size: 16 })] })],
          shading: { fill: '1E293B' }
        }))
      });

      const dataRows = targetProfiles.map(p => new TableRow({
        children: selectedColKeys.map(k => {
          let val = '';
          if (k === 'pin') val = p.pin;
          else if (k === 'name') val = p.full_name;
          else if (k === 'department') val = p.department || '-';
          else if (k === 'designation') val = p.designation || '-';
          else if (k === 'base_salary') val = `PKR ${roundSalary(p.base_salary || 0).toLocaleString('en-PK')}`;
          else if (k === 'net_salary') val = `PKR ${roundSalary(getNetSalary(p)).toLocaleString('en-PK')}`;
          else if (k === 'payment_method') val = p.payment_method || 'Bank';
          else if (k === 'bank_name') val = p.bank_name || '-';
          else if (k === 'bank_account_title') val = p.bank_account_title || '-';
          else if (k === 'bank_account_no') val = p.bank_account_no || '-';

          return new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: val, size: 16 })] })]
          });
        })
      }));

      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 28, color: '1E293B' })] }),
            new Paragraph({ children: [new TextRun({ text: `Generated on: ${new Date().toLocaleString()}`, size: 18, color: '64748B' })] }),
            new Paragraph({ text: '' }),
            new Table({ rows: [headerRow, ...dataRows] })
          ]
        }]
      });

      Packer.toBlob(doc).then((blob: Blob) => {
        downloadBlobFile(blob, `Export_${targetLabel.replace(/ /g, '_')}.docx`);
      });
      setIsExportModalOpen(false);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.customAlert('Please allow popups to export the PDF.');
      return;
    }

    let mainContentHtml = '';

    if (exportTarget === 'employee') {
      const emp = targetProfiles[0];
      const netSalary = roundSalary(getNetSalary(emp));
      const isCash = (emp as any).payment_method === 'Cash' || emp.bank_name === 'Cash' || !emp.bank_name || !emp.bank_account_no;
      mainContentHtml = `
        <div class="page-container">
          <div class="letterhead-bg"></div>
          <div class="letter-content" style="padding-top: 140px;">
            <table style="width: 100%; border-collapse: collapse; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              ${exportCols.pin ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb; width: 45%;">Employee PIN</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-family: monospace; font-size: 0.95rem;">${emp.pin}</td>
              </tr>` : ''}
              ${exportCols.name ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb;">Employee Name</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600;">${emp.full_name}</td>
              </tr>` : ''}
              ${exportCols.dept ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb;">Department</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px;">${emp.department || '-'}</td>
              </tr>` : ''}
              ${exportCols.designation ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb;">Designation</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px;">${emp.designation || '-'}</td>
              </tr>` : ''}
              ${exportCols.base_salary ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb;">Base Salary</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; text-align: right; font-weight: 600;">Rs. ${roundSalary(emp.base_salary).toLocaleString('en-PK')}</td>
              </tr>` : ''}
              ${exportCols.income_tax ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb; color: #ef4444;">Income Tax</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; text-align: right; color: #ef4444; font-weight: 600;">Rs. ${roundSalary(emp.income_tax || 0).toLocaleString('en-PK')}</td>
              </tr>` : ''}
              ${exportCols.net_salary ? `
              <tr style="background-color: #f3f4f6;">
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 700; color: #10b981;">Net Payable Salary</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; text-align: right; font-weight: 700; color: #10b981; font-size: 1.05rem;">Rs. ${netSalary.toLocaleString('en-PK')}</td>
              </tr>` : ''}
              ${exportCols.payment_method ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb;">Payment Method</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600;">${isCash ? 'Cash Payment' : 'Bank Transfer'}</td>
              </tr>` : ''}
              ${exportCols.bank_name ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb;">Bank Name</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px;">${isCash ? 'Cash' : (emp.bank_name || '-')}</td>
              </tr>` : ''}
              ${exportCols.bank_account_title ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb;">Account Title</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px;">${isCash ? 'Cash Payment' : (emp.bank_account_title || '-')}</td>
              </tr>` : ''}
              ${exportCols.bank_account_no ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb;">Account Number</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-family: monospace; font-size: 0.95rem;">${isCash ? 'Cash Payment' : (emp.bank_account_no || '-')}</td>
              </tr>` : ''}
            </table>
          </div>
        </div>
      `;
    } else {
      let CHUNK_SIZE = 18;
      if (exportEmployeesPerPage === 'auto') {
        CHUNK_SIZE = targetProfiles.length > 0 ? targetProfiles.length : 1;
      } else {
        CHUNK_SIZE = parseInt(exportEmployeesPerPage, 10) || 18;
      }

      const pagesHtml: string[] = [];
      const totalBaseSalary = roundSalary(targetProfiles.reduce((sum, p) => sum + (p.base_salary || 0), 0));
      const totalIncomeTax = roundSalary(targetProfiles.reduce((sum, p) => sum + (p.income_tax || 0), 0));
      const totalNetPayable = roundSalary(targetProfiles.reduce((sum, p) => sum + getNetSalary(p), 0));

      let nonAmountColsCount = 0;
      if (exportCols.pin) nonAmountColsCount++;
      if (exportCols.name) nonAmountColsCount++;
      if (exportCols.dept) nonAmountColsCount++;
      if (exportCols.designation) nonAmountColsCount++;
      if (exportCols.payment_method) nonAmountColsCount++;
      if (exportCols.bank_name) nonAmountColsCount++;
      if (exportCols.bank_account_title) nonAmountColsCount++;
      if (exportCols.bank_account_no) nonAmountColsCount++;

      for (let i = 0; i < targetProfiles.length; i += CHUNK_SIZE) {
        const chunk = targetProfiles.slice(i, i + CHUNK_SIZE);
        const isLastChunk = (i + CHUNK_SIZE) >= targetProfiles.length;

        const count = chunk.length;
        let cPad = '5px 8px';
        let fSize = '0.80rem';
        let hPad = '6px 8px';
        let hFSize = '0.76rem';

        if (count <= 6) {
          cPad = '12px 10px'; fSize = '0.88rem'; hPad = '10px 10px'; hFSize = '0.82rem';
        } else if (count <= 10) {
          cPad = '9px 8px'; fSize = '0.84rem'; hPad = '8px 8px'; hFSize = '0.80rem';
        } else if (count <= 15) {
          cPad = '6px 8px'; fSize = '0.79rem'; hPad = '7px 8px'; hFSize = '0.77rem';
        } else if (count <= 20) {
          cPad = '4px 6px'; fSize = '0.74rem'; hPad = '5px 6px'; hFSize = '0.73rem';
        } else if (count <= 25) {
          cPad = '3px 5px'; fSize = '0.69rem'; hPad = '4px 5px'; hFSize = '0.69rem';
        } else if (count <= 32) {
          cPad = '2px 4px'; fSize = '0.62rem'; hPad = '3px 4px'; hFSize = '0.63rem';
        } else if (count <= 40) {
          cPad = '1px 3px'; fSize = '0.54rem'; hPad = '2px 3px'; hFSize = '0.55rem';
        } else {
          cPad = '1px 2px'; fSize = '0.48rem'; hPad = '1px 2px'; hFSize = '0.50rem';
        }

        const chunkTfootHtml = `
          <tfoot>
            <tr style="background-color: #f3f4f6; font-weight: 700; border-top: 2px solid #111827; border-bottom: 2px solid #111827;">
              ${nonAmountColsCount > 0 ? `<td colspan="${nonAmountColsCount}" style="padding: ${cPad}; font-size: ${fSize}; text-align: left; line-height: 1.1;">TOTAL (${targetProfiles.length} Records)</td>` : ''}
              ${exportCols.base_salary ? `<td style="text-align: right; padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">Rs. ${totalBaseSalary.toLocaleString('en-PK')}</td>` : ''}
              ${exportCols.income_tax ? `<td style="text-align: right; padding: ${cPad}; color: #ef4444; font-size: ${fSize}; line-height: 1.1;">Rs. ${(totalIncomeTax || 0).toLocaleString('en-PK')}</td>` : ''}
              ${exportCols.net_salary ? `<td style="text-align: right; padding: ${cPad}; color: #10b981; font-size: ${fSize}; font-weight: 800; line-height: 1.1;">Rs. ${totalNetPayable.toLocaleString('en-PK')}</td>` : ''}
            </tr>
          </tfoot>
        `;

        let rowsHtml = '';
        chunk.forEach(p => {
          const netSalary = roundSalary(getNetSalary(p));
          const isCash = (p as any).payment_method === 'Cash' || p.bank_name === 'Cash' || !p.bank_name || !p.bank_account_no;
          rowsHtml += `
            <tr>
              ${exportCols.pin ? `<td style="font-family: monospace; padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">${p.pin}</td>` : ''}
              ${exportCols.name ? `<td style="padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;"><strong>${p.full_name}</strong></td>` : ''}
              ${exportCols.dept ? `<td style="padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">${p.department || '-'}</td>` : ''}
              ${exportCols.designation ? `<td style="padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">${p.designation || '-'}</td>` : ''}
              ${exportCols.payment_method ? `<td style="padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">${isCash ? 'Cash' : 'Bank Transfer'}</td>` : ''}
              ${exportCols.bank_name ? `<td style="padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">${isCash ? 'Cash' : (p.bank_name || '-')}</td>` : ''}
              ${exportCols.bank_account_title ? `<td style="padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">${isCash ? 'Cash Payment' : (p.bank_account_title || '-')}</td>` : ''}
              ${exportCols.bank_account_no ? `<td style="font-family: monospace; padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">${isCash ? 'Cash Payment' : (p.bank_account_no || '-')}</td>` : ''}
              ${exportCols.base_salary ? `<td style="text-align: right; padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">Rs. ${roundSalary(p.base_salary).toLocaleString('en-PK')}</td>` : ''}
              ${exportCols.income_tax ? `<td style="text-align: right; color: #ef4444; padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">Rs. ${roundSalary(p.income_tax || 0).toLocaleString('en-PK')}</td>` : ''}
              ${exportCols.net_salary ? `<td style="text-align: right; font-weight: 700; color: #10b981; padding: ${cPad}; font-size: ${fSize}; line-height: 1.1;">Rs. ${netSalary.toLocaleString('en-PK')}</td>` : ''}
            </tr>
          `;
        });

        pagesHtml.push(`
          <div class="page-container">
            <div class="letterhead-bg"></div>
            <div class="letter-content" style="padding: 260px 45px 210px 45px !important; box-sizing: border-box !important; height: 1120px !important; overflow: hidden !important;">
              <div style="height: 650px !important; min-height: 650px !important; max-height: 650px !important; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
                <table style="width: 100%; height: 100%; border-collapse: collapse; margin-top: 0; table-layout: auto;">
                  <thead>
                    <tr>
                      ${exportCols.pin ? `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">PIN</th>` : ''}
                      ${exportCols.name ? `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Name</th>` : ''}
                      ${exportCols.dept ? `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Department</th>` : ''}
                      ${exportCols.designation ? `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Designation</th>` : ''}
                      ${exportCols.payment_method ? `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Payment Method</th>` : ''}
                      ${exportCols.bank_name ? `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Bank Name</th>` : ''}
                      ${exportCols.bank_account_title ? `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Account Title</th>` : ''}
                      ${exportCols.bank_account_no ? `<th style="text-align: left; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Account No</th>` : ''}
                      ${exportCols.base_salary ? `<th style="text-align: right; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Base Salary</th>` : ''}
                      ${exportCols.income_tax ? `<th style="text-align: right; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Income Tax</th>` : ''}
                      ${exportCols.net_salary ? `<th style="text-align: right; padding: ${hPad}; font-size: ${hFSize}; line-height: 1.1; vertical-align: middle;">Net Salary</th>` : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                  ${isLastChunk ? chunkTfootHtml : ''}
                </table>
              </div>
            </div>
          </div>
        `);
      }
      mainContentHtml = pagesHtml.join('');
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Outfit', sans-serif;
            color: #1f2937;
            margin: 0;
            padding: 0;
            background: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .letterhead-bg {
            display: none;
          }
          ${exportUseLetterhead ? `
          @page {
            size: A4;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
            }
            .page-container {
              width: 210mm;
              height: 297mm;
              page-break-after: always;
              position: relative;
              box-sizing: border-box;
              overflow: hidden;
            }
            .letterhead-bg {
              display: block;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: url('/icons/Salry.png');
              background-size: 100% 100%;
              background-repeat: no-repeat;
              background-position: center;
              z-index: 1;
              pointer-events: none;
            }
            .letter-content {
              position: relative;
              z-index: 2;
              padding: 260px 45px 210px 45px !important;
              margin-top: 0 !important;
              height: 1120px !important;
              box-sizing: border-box !important;
            }
          }
          @media screen {
            body {
              background-color: #f3f4f6;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 20px;
              padding: 20px;
            }
            .page-container {
              width: 790px;
              height: 1120px;
              position: relative;
              background: #ffffff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.15);
              box-sizing: border-box;
              margin-bottom: 20px;
              overflow: hidden;
            }
            .letterhead-bg {
              display: block;
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: url('/icons/Salry.png');
              background-size: 100% 100%;
              background-repeat: no-repeat;
              background-position: center;
              z-index: 1;
              pointer-events: none;
            }
            .letter-content {
              position: relative;
              z-index: 2;
              padding: 260px 45px 210px 45px;
              margin-top: 0 !important;
              height: 1120px !important;
              box-sizing: border-box !important;
            }
          }
          ` : `
          @page {
            margin: 30px;
          }
          .letter-content {
            padding: 15px;
            margin-top: 0 !important;
          }
          `}
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 0;
          }
          th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: 600;
            border-bottom: 2px solid #e5e7eb;
            text-align: left;
          }
          td {
            border-bottom: 1px solid #e5e7eb;
          }
          tr:nth-child(even) td {
            background-color: rgba(0,0,0,0.01);
          }
          @media print {
            .no-print { display: none; }
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        <div class="letterhead-bg"></div>
        ${mainContentHtml}

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setIsExportModalOpen(false);
  };

  const handleAdminChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminNewPassword.length < 6) {
      window.customAlert('Password must be at least 6 characters.');
      return;
    }
    if (adminNewPassword !== adminConfirmPassword) {
      window.customAlert('Passwords do not match.');
      return;
    }

    setAdminPasswordChangeLoading(true);
    window.showLoading('Updating admin password...');
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: adminNewPassword });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          password: adminNewPassword,
          is_first_login: false
        })
        .eq('id', _user.id);
      if (profileError) throw profileError;

      try {
        await createNotification({
          user_id: null,
          title: 'Admin Password Changed',
          message: `Admin has updated their password.`
        });
      } catch (ex) { /* ignore */ }

      setAdminNewPassword('');
      setAdminConfirmPassword('');
      setIsAdminChangePasswordModalOpen(false);
      window.customAlert('Admin password updated successfully!');
    } catch (err: any) {
      window.customAlert(err.message || 'Failed to update admin password.');
    } finally {
      setAdminPasswordChangeLoading(false);
      window.hideLoading();
    }
  };

  const handleCloseFormModal = () => {
    setIsAddEmployeeModalOpen(false);
    setIsEditingProfile(null);
    setFullName('');
    setPin('');
    setDesignation('');
    setDepartment('');
    setJoiningDate('');
    setBaseSalary('');
    setHourlyRate('');
    setEmployeeEmail('');
    setEmployeePassword('');
    setDateOfBirth('');
    setIncomeTax('');
    setNicNo('');
    setEmployeePhone('');
    setIsRoleAdmin(false);
    setAllowedTabs([]);
    setIsPermissionsModalOpen(false);
    setBankName('Meezan Bank');
    setBankAccountTitle('');
    setBankAccountNo('');
    setPaymentMethod('Bank');
    setEmergencyContacts([]);
    setTimelinePeriods([]);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactRelation('Father');
    setNewPeriodHeading('');
    setNewPeriodStartDate('');
    setNewPeriodEndDate('');
    setNewPeriodIsPresent(false);
    setEmployeeModalTab('standard');
    setTransferPurpose('Charity');
    setShowAddCustomPurpose(false);
    setNewCustomPurposeInput('');
  };

  const filteredProfiles = profiles.filter(p => {
    const matchDept = deptFilter ? p.department === deptFilter : true;
    const matchDesig = desigFilter ? p.designation === desigFilter : true;
    
    let matchSearch = true;
    if (employeeSearchQuery.trim()) {
      const q = employeeSearchQuery.toLowerCase();
      matchSearch = 
        p.full_name.toLowerCase().includes(q) ||
        p.pin.toLowerCase().includes(q) ||
        (p.department ? p.department.toLowerCase().includes(q) : false) ||
        (p.designation ? p.designation.toLowerCase().includes(q) : false) ||
        (p.email ? p.email.toLowerCase().includes(q) : false);
    }
    
    return matchDept && matchDesig && matchSearch && p.id !== _user.id;
  }).sort((a, b) => {
    if (employeeSortKey === 'name_asc') {
      return a.full_name.localeCompare(b.full_name);
    } else if (employeeSortKey === 'name_desc') {
      return b.full_name.localeCompare(a.full_name);
    } else {
      return a.pin.localeCompare(b.pin, undefined, { numeric: true });
    }
  });

  // Group filteredProfiles by department for structured multi-table / sectioned department display
  const groupedProfilesByDept = useMemo(() => {
    const map: Record<string, EmployeeProfile[]> = {};
    filteredProfiles.forEach(p => {
      const dept = (p.department && p.department.trim()) ? p.department.trim() : 'General / Unassigned';
      if (!map[dept]) map[dept] = [];
      map[dept].push(p);
    });

    return Object.keys(map)
      .sort((a, b) => {
        const isAUnassigned = a.toLowerCase().includes('unassigned') || a.toLowerCase().includes('general');
        const isBUnassigned = b.toLowerCase().includes('unassigned') || b.toLowerCase().includes('general');
        if (isAUnassigned && !isBUnassigned) return 1;
        if (!isAUnassigned && isBUnassigned) return -1;

        const idxA = customDeptOrder.indexOf(a);
        const idxB = customDeptOrder.indexOf(b);

        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;

        return a.localeCompare(b);
      })
      .map(dept => ({
        department: dept,
        profiles: map[dept]
      }));
  }, [filteredProfiles, customDeptOrder]);

  const handleEditProfileClick = (p: EmployeeProfile) => {
    setIsEditingProfile(p.id);
    setFullName(p.full_name);
    setPin(p.pin);
    setDesignation(p.designation || '');
    setDepartment(p.department || '');
    setJoiningDate(p.joining_date);
    setBaseSalary(p.base_salary.toString());
    setHourlyRate(p.base_salary ? (p.base_salary / (30 * (getEmployeeShiftTimingHelper(p).totalHours || 9))).toFixed(2) : (p.hourly_rate ? p.hourly_rate.toString() : ''));
    setEmployeeEmail(p.email || '');
    setEmployeePassword(p.password || ''); // Pre-fill with the plaintext password!
    setDateOfBirth(p.date_of_birth || '');
    setIncomeTax(p.income_tax ? p.income_tax.toString() : '');
    setNicNo((p as any).nic_no || '');
    setEmployeePhone(p.phone || '');
    setIsRoleAdmin(p.role === 'admin');
    
    const defaultAllAdminTabs = [
      'admin:overview', 'admin:calendar', 'admin:employees', 'admin:attendance',
      'admin:approvals', 'admin:payroll', 'admin:timings', 'admin:announcements',
      'admin:device', 'admin:converter'
    ];
    setAllowedTabs(p.allowed_tabs && p.allowed_tabs.length > 0 ? p.allowed_tabs : (p.role === 'admin' ? defaultAllAdminTabs : []));
    setIsPermissionsModalOpen(false);

    setBankName(p.bank_name || 'Meezan Bank');
    setBankAccountTitle(p.bank_account_title || '');
    setBankAccountNo(p.bank_account_no || '');
    setPaymentMethod((p as any).payment_method || 'Bank');
    setEmergencyContacts((p as any).emergency_contacts || []);
    setTimelinePeriods((p as any).timeline_periods || []);
  };

  const handleEditTransferClick = (mockP: EmployeeProfile) => {
    setIsEditingProfile(mockP.id);
    setFullName(mockP.full_name);
    
    const purposeVal = mockP.designation || '';
    if (purposeVal && !transferPurposeOptions.includes(purposeVal)) {
      setTransferPurposeOptions(prev => [...prev, purposeVal]);
    }
    setTransferPurpose(purposeVal);
    
    setBaseSalary(mockP.base_salary.toString());
    setPaymentMethod(mockP.payment_method || 'Bank');
    setBankName(mockP.bank_name || 'Meezan Bank');
    setBankAccountTitle(mockP.bank_account_title || '');
    setBankAccountNo(mockP.bank_account_no || '');
  };

  const handleDeleteProfileClick = (id: string) => {
    window.customConfirm(
      'Are you sure you want to delete this employee? This will permanently erase their credentials, identity, and profile.',
      async () => {
        window.showLoading('Deleting employee...');
        try {
          await deleteProfile(id);
          fetchData();
          window.customAlert('Employee profile deleted successfully.');
        } catch (err) {
          /* console removed */
          window.customAlert('Failed to delete employee profile.');
        } finally {
          window.hideLoading();
        }
      }
    );
  };

  const handleDeleteTransfer = async (id: number) => {
    const approved = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        'Are you sure you want to delete this recorded transfer?',
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!approved) return;

    window.showLoading('Deleting transfer...');
    try {
      await deletePurposeTransfer(id);
      fetchData();
      window.customAlert('Transfer deleted successfully.');
    } catch (err: any) {
      window.customAlert(err.message || 'Failed to delete transfer.');
    } finally {
      window.hideLoading();
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    window.showLoading('Adding department...');
    try {
      const added = await addDepartment(newDeptName.trim());
      setDepartmentsList(prev => [...prev, added].sort());
      setDepartment(added);
      setNewDeptName('');
      setShowAddDeptModal(false);
      window.customAlert('Department added successfully.');
    } catch (err: any) {
      /* console removed */
      window.customAlert(err.message || 'Failed to add department.');
    } finally {
      window.hideLoading();
    }
  };

  const handleAddDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesigName.trim()) return;
    window.showLoading('Adding designation...');
    try {
      const added = await addDesignation(newDesigName.trim());
      setDesignationsList(prev => [...prev, added].sort());
      setDesignation(added);
      setNewDesigName('');
      setShowAddDesigModal(false);
      window.customAlert('Designation added successfully.');
    } catch (err: any) {
      /* console removed */
      window.customAlert(err.message || 'Failed to add designation.');
    } finally {
      window.hideLoading();
    }
  };

  const handleEditShiftTimingClick = (rule: ShiftTiming) => {
    setEditingTimingRule(rule);
    setTimingTargetType(rule.target_type as any);
    setTimingTargetId(rule.target_id);
    const isFix = isFixedHoursTiming(rule);
    setTimingStartTime(rule.start_time ? rule.start_time.substring(0, 5) : '09:00');
    setTimingEndTime(rule.end_time ? rule.end_time.substring(0, 5) : '18:00');
    setTimingGraceMins(rule.grace_mins || 20);
    setTimingIsFixedHours(isFix);
    const isOtTag = String(rule.target_name || '').includes('[ALLOW_OT:1]');
    setTimingAllowRegularOvertime(rule.allow_regular_overtime === true || isOtTag);
    setTimingTotalHours(resolveTotalHours(rule) || rule.total_hours || 9);
    setTimingDays(rule.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    setSaturdayOption(rule.saturday_option || (rule.days?.includes('Saturday') ? 'all_working' : 'all_off'));
    setIsAddTimingModalOpen(true);
  };

  const handleSaveShiftTiming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timingTargetId) {
      window.customAlert('Please select a target designation, department, or employee.');
      return;
    }
    if (timingDays.length === 0) {
      window.customAlert('Please select at least one day of the week.');
      return;
    }

    let targetName = timingTargetId;
    if (timingTargetType === 'employee') {
      const selectedEmp = profiles.find(p => p.id === timingTargetId);
      targetName = selectedEmp ? `${selectedEmp.full_name} (${selectedEmp.pin})` : timingTargetId;
    }

    if (timingIsFixedHours) {
      const cleanName = targetName.replace(/\s*\[FIXED_HOURS:\d+(?:\.\d+)?\]/gi, '').replace(/\s*\[ALLOW_OT:\d+\]/gi, '');
      const otTag = timingAllowRegularOvertime ? ' [ALLOW_OT:1]' : '';
      targetName = `${cleanName} [FIXED_HOURS:${Math.round(timingTotalHours || 9)}]${otTag}`;
    }

    window.showLoading(editingTimingRule ? 'Updating shift timings...' : 'Saving shift timings...');
    try {
      const startH = timingStartTime ? (timingStartTime.length === 5 ? timingStartTime + ':00' : timingStartTime) : '09:00:00';
      const endH = timingEndTime ? (timingEndTime.length === 5 ? timingEndTime + ':00' : timingEndTime) : '18:00:00';

      const payload: any = {
        target_type: timingTargetType,
        target_id: timingTargetId,
        target_name: targetName,
        start_time: startH,
        end_time: endH,
        days: timingDays,
        is_fixed_hours: timingIsFixedHours,
        allow_regular_overtime: timingAllowRegularOvertime,
        total_hours: timingTotalHours || 9,
        saturday_option: saturdayOption
      };
      if (timingGraceMins !== undefined) {
        payload.grace_mins = timingGraceMins;
      }

      // Always persist to local backup first
      setLocalShiftTimingBackup(payload);

      if (editingTimingRule?.id) {
        payload.id = editingTimingRule.id;
        setLocalShiftTimingBackup(payload);

        const cleanUpdatePayload: any = {
          target_type: timingTargetType,
          target_id: timingTargetId,
          target_name: targetName,
          start_time: startH,
          end_time: endH,
          days: timingDays,
          is_fixed_hours: timingIsFixedHours,
          allow_regular_overtime: timingAllowRegularOvertime,
          total_hours: timingTotalHours || 9,
          saturday_option: saturdayOption,
          grace_mins: timingGraceMins
        };

        const { error } = await supabase
          .from('shift_timings')
          .update(cleanUpdatePayload)
          .eq('id', editingTimingRule.id);

        if (error) {
          await supabase
            .from('shift_timings')
            .update({
              target_type: timingTargetType,
              target_id: timingTargetId,
              target_name: targetName,
              start_time: startH,
              end_time: endH,
              days: timingDays
            })
            .eq('id', editingTimingRule.id);
        }
      } else {
        await saveShiftTiming(payload);
      }

      // Send notification to affected users
      try {
        const timeDesc = timingIsFixedHours 
          ? `Fixed ${Math.round(timingTotalHours || 9)} Hours Shift`
          : `Shift Hours: ${timingStartTime} to ${timingEndTime}`;
        
        if (timingTargetType === 'employee') {
          await createNotification({
            user_id: timingTargetId,
            title: 'Shift Timings Updated',
            message: `Your shift schedule has been updated to: ${timeDesc} (${timingDays.join(', ')}).`
          });
        } else if (timingTargetType === 'department') {
          const targetedEmployees = profiles.filter(p => p.department === timingTargetId && p.role !== 'admin');
          for (const emp of targetedEmployees) {
            await createNotification({
              user_id: emp.id,
              title: 'Department Shift Timings Updated',
              message: `Shift timings for ${timingTargetId} department updated to: ${timeDesc}.`
            });
          }
        } else if (timingTargetType === 'designation') {
          const targetedEmployees = profiles.filter(p => p.designation === timingTargetId && p.role !== 'admin');
          for (const emp of targetedEmployees) {
            await createNotification({
              user_id: emp.id,
              title: 'Designation Shift Timings Updated',
              message: `Shift timings for ${timingTargetId} updated to: ${timeDesc}.`
            });
          }
        }
      } catch (notifErr) {
        /* console removed */
      }

      setIsAddTimingModalOpen(false);
      setEditingTimingRule(null);
      setTimingTargetId('');
      setTimingStartTime('09:00');
      setTimingEndTime('18:00');
      setTimingGraceMins(20);
      setTimingIsFixedHours(false);
      setTimingTotalHours(9);
      setTimingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      fetchData();
      window.customAlert(editingTimingRule ? 'Shift timing rule updated successfully.' : 'Shift timings saved successfully.');
    } catch (err: any) {
      window.customAlert(err.message || 'Failed to save shift timings.');
    } finally {
      window.hideLoading();
    }
  };

  const handleDeleteShiftTimingClick = async (id: number) => {
    window.customConfirm('Are you sure you want to delete this shift timing assignment?', async () => {
      window.showLoading('Deleting shift timing...');
      try {
        await deleteShiftTiming(id);
        fetchData();
        window.customAlert('Shift timing deleted successfully.');
      } catch (err: any) {
        /* console removed */
        window.customAlert(err.message || 'Failed to delete shift timing.');
      } finally {
        window.hideLoading();
      }
    });
  };

  // Parse ZKTeco logs (attlog.dat, CSV, Text, or direct .xls/.xlsx Excel sheets)
  const processMultipleFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    
    window.showLoading(`Processing ${files.length} file(s) and syncing logs...`);
    setUploadStatus(`Processing ${files.length} file(s)...`);
    
    let allParsedLogs: RawLog[] = [];
    let processedCount = 0;
    let failedCount = 0;
    let errors: string[] = [];

    const parseFilePromise = (file: File): Promise<RawLog[]> => {
      return new Promise((resolve, reject) => {
        const isExcel = file.name.endsWith('.xls') || file.name.endsWith('.xlsx');
        const reader = new FileReader();

        reader.onload = async (event) => {
          try {
            let fileLogs: RawLog[] = [];

            if (isExcel) {
              const arrayBuffer = event.target?.result as ArrayBuffer;
              const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              
              const sheetData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
              if (sheetData.length === 0) throw new Error('Excel sheet is empty');

              const headers = (sheetData[0] || []).map((h: any) => String(h || '').trim());
              const pinIdx = headers.findIndex(h => h === 'No.' || h === 'No' || h === 'PIN' || h === 'ID Number' || h === 'CardNo');
              const dateIdx = headers.findIndex(h => h === 'Date/Time' || h === 'Time' || h === 'DateTime');
              const verifyIdx = headers.findIndex(h => h === 'VerifyCode' || h === 'Verification' || h === 'Verify');
              const statusIdx = headers.findIndex(h => h === 'Status' || h === 'State' || h === 'StatusType' || h === 'InOut' || h === 'In/Out' || h === 'Type' || h === 'Status Code');

              if (pinIdx === -1 || dateIdx === -1) {
                throw new Error('Required columns ("No." and "Date/Time") not found.');
              }

              const parseStatusVal = (raw: any): number => {
                if (raw === undefined || raw === null || raw === '') return 0;
                const s = String(raw).trim().toLowerCase();
                if (s === '1' || s.includes('out') || s.includes('exit')) return 1;
                if (s === '0' || s.includes('in') || s.includes('entry')) return 0;
                const num = parseInt(s, 10);
                return isNaN(num) ? 0 : num;
              };

              for (let i = 1; i < sheetData.length; i++) {
                const row = sheetData[i];
                if (!row || row.length === 0) continue;

                const employee_pin = String(row[pinIdx] || '').trim();
                const dateTimeVal = row[dateIdx];
                if (!employee_pin || dateTimeVal === undefined || dateTimeVal === '') continue;

                let timestamp: Date;
                if (dateTimeVal instanceof Date) {
                  timestamp = dateTimeVal;
                } else if (typeof dateTimeVal === 'number') {
                  timestamp = new Date(Math.round((dateTimeVal - 25569) * 86400 * 1000));
                } else {
                  timestamp = new Date(String(dateTimeVal).trim());
                }

                if (!isNaN(timestamp.getTime())) {
                  const verifyCodeVal = verifyIdx !== -1 ? parseInt(String(row[verifyIdx] || '1'), 10) : 1;
                  const statusCodeVal = statusIdx !== -1 ? parseStatusVal(row[statusIdx]) : 0;
                  fileLogs.push({
                    employee_pin,
                    timestamp: timestamp.toISOString(),
                    verify_type: isNaN(verifyCodeVal) ? 1 : verifyCodeVal,
                    status_type: statusCodeVal
                  });
                }
              }
            } else {
              const text = event.target?.result as string;
              if (!text) throw new Error('Empty file content');

              const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
              if (lines.length === 0) throw new Error('Empty file');

              const firstLine = lines[0];
              const isCsv = file.name.endsWith('.csv') || firstLine.includes(',');
              const isTabTxt = file.name.endsWith('.txt') && firstLine.includes('\t');

              if (isCsv || isTabTxt) {
                const delimiter = isCsv ? ',' : '\t';
                const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
                const pinIdx = headers.findIndex(h => h === 'No.' || h === 'No' || h === 'PIN' || h === 'ID Number' || h === 'CardNo');
                const dateIdx = headers.findIndex(h => h === 'Date/Time' || h === 'Time' || h === 'DateTime');
                const verifyIdx = headers.findIndex(h => h === 'VerifyCode' || h === 'Verification' || h === 'Verify');
                const statusIdx = headers.findIndex(h => h === 'Status' || h === 'State' || h === 'StatusType' || h === 'InOut' || h === 'In/Out' || h === 'Type' || h === 'Status Code');

                if (pinIdx === -1 || dateIdx === -1) {
                  throw new Error('Required columns ("No." and "Date/Time") not found.');
                }

                const parseStatusVal = (raw: any): number => {
                  if (raw === undefined || raw === null || raw === '') return 0;
                  const s = String(raw).trim().toLowerCase();
                  if (s === '1' || s.includes('out') || s.includes('exit')) return 1;
                  if (s === '0' || s.includes('in') || s.includes('entry')) return 0;
                  const num = parseInt(s, 10);
                  return isNaN(num) ? 0 : num;
                };

                for (let i = 1; i < lines.length; i++) {
                  const fields = lines[i].split(delimiter).map(f => f.trim().replace(/^["']|["']$/g, ''));
                  if (fields.length > Math.max(pinIdx, dateIdx)) {
                    const employee_pin = fields[pinIdx];
                    const dateTimeStr = fields[dateIdx];
                    const timestamp = new Date(dateTimeStr.trim());
                    
                    if (!isNaN(timestamp.getTime()) && employee_pin) {
                      const verifyCodeVal = verifyIdx !== -1 ? parseInt(fields[verifyIdx] || '1', 10) : 1;
                      const statusCodeVal = statusIdx !== -1 ? parseStatusVal(fields[statusIdx]) : 0;
                      fileLogs.push({
                        employee_pin,
                        timestamp: timestamp.toISOString(),
                        verify_type: isNaN(verifyCodeVal) ? 1 : verifyCodeVal,
                        status_type: statusCodeVal
                      });
                    }
                  }
                }
              } else {
                lines.forEach((line) => {
                  const fields = line.split(/\s+/);
                  if (fields.length >= 2) {
                    const employee_pin = fields[0];
                    const dateStr = fields[1];
                    const timeStr = fields[2];
                    const timestampStr = `${dateStr}T${timeStr}`;
                    const timestamp = new Date(timestampStr);

                    if (!isNaN(timestamp.getTime()) && employee_pin) {
                      fileLogs.push({
                        employee_pin,
                        timestamp: timestamp.toISOString(),
                        verify_type: parseInt(fields[3] || '1', 10),
                        status_type: parseInt(fields[4] || '0', 10)
                      });
                    }
                  }
                });
              }
            }

            resolve(fileLogs);
          } catch (err: any) {
            reject(new Error(`${file.name}: ${err.message || 'Unknown error'}`));
          }
        };

        reader.onerror = () => reject(new Error(`${file.name}: Failed to read file`));

        if (isExcel) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }
      });
    };

    // Sequentially process each file
    for (let i = 0; i < files.length; i++) {
      try {
        const fileLogs = await parseFilePromise(files[i]);
        allParsedLogs = [...allParsedLogs, ...fileLogs];
        processedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(err.message);
      }
    }

    try {
      if (allParsedLogs.length === 0) {
        throw new Error('No valid attendance records found in any of the selected files.');
      }

      await uploadRawLogs(allParsedLogs);

      let statusMsg = `Success! Synced ${allParsedLogs.length} logs from ${processedCount} file(s).`;
      if (failedCount > 0) {
        statusMsg += ` (${failedCount} file(s) failed: ${errors.join(', ')})`;
      }

      setUploadStatus(statusMsg);
      window.customAlert(statusMsg);
      fetchData();
    } catch (err: any) {
      setUploadStatus(`Upload failed: ${err.message}`);
      window.customAlert(err.message || 'Upload failed');
    } finally {
      window.hideLoading();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processMultipleFiles(e.target.files);
    }
  };

  // Approve/Reject/Revert leaves
  const handleLeaveStatusChange = async (id: number, status: 'Approved' | 'Rejected' | 'Pending') => {
    const req = leaveRequests.find(r => r.id === id);
    if (status === 'Approved' && req) {
      const holidayDates = holidaysList.map(h => h.date);
      const totalWorkingDays = calculateLeaveWorkingDays(req.start_date, req.end_date, holidayDates);
      const initialType = (req.leave_type as any) || 'Annual';
      
      const bal = leaveBalancesList.find(b => b.employee_id === req.employee_id);
      const casRem = Math.max(0, (bal?.casual_total ?? 10) - (bal?.casual_used ?? 0));
      const medRem = Math.max(0, (bal?.medical_total ?? 10) - (bal?.medical_used ?? 0));
      const annRem = Math.max(0, (bal?.annual_total ?? 10) - (bal?.annual_used ?? 0));

      let rem = 10;
      let defaultSecondaryType: 'Casual' | 'Medical' | 'Annual' = 'Casual';
      if (initialType === 'Annual') {
        rem = annRem;
        defaultSecondaryType = casRem >= medRem ? 'Casual' : 'Medical';
      } else if (initialType === 'Casual') {
        rem = casRem;
        defaultSecondaryType = annRem >= medRem ? 'Annual' : 'Medical';
      } else if (initialType === 'Medical') {
        rem = medRem;
        defaultSecondaryType = annRem >= casRem ? 'Annual' : 'Casual';
      }

      const defaultPrimaryDays = Math.min(totalWorkingDays, rem > 0 ? rem : totalWorkingDays);

      setSelectedLeaveForApproval(req);
      setChosenLeaveTypeForApproval(initialType);
      setPrimaryLeaveDaysAllocated(defaultPrimaryDays);
      setSecondaryLeaveTypeForApproval(defaultSecondaryType);
      return;
    }

    window.showLoading(`Setting leave request to ${status.toLowerCase()}...`);
    try {
      await updateLeaveRequestStatus(id, status);
      
      if (req) {
        try {
          await createNotification({
            user_id: req.employee_id,
            title: `Leave Request ${status} - ${req.leave_type || 'Leave'}`,
            message: `Your leave request for ${req.start_date} to ${req.end_date} has been ${status.toLowerCase()} by Management.`
          });
        } catch (e) {
          /* console removed */
        }
      }

      fetchData();
      window.customAlert(`Leave request has been successfully ${status.toLowerCase()}.`);
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to update leave request status.');
    } finally {
      window.hideLoading();
    }
  };

  const handleApproveLeaveWithDetails = async () => {
    if (!selectedLeaveForApproval) return;
    const req = selectedLeaveForApproval;
    const holidayDates = holidaysList.map(h => h.date);
    const totalWorkingDays = calculateLeaveWorkingDays(req.start_date, req.end_date, holidayDates);

    window.showLoading('Approving leave and deducting balances...');
    try {
      if (primaryLeaveDaysAllocated >= totalWorkingDays) {
        // All days allocated to primary category
        await updateLeaveRequestStatus(req.id, 'Approved', chosenLeaveTypeForApproval);
      } else {
        // Split days across primary and secondary categories
        await approveAndSplitLeaveRequest(
          req.id,
          chosenLeaveTypeForApproval,
          primaryLeaveDaysAllocated,
          secondaryLeaveTypeForApproval,
          holidayDates
        );
      }

      try {
        await createNotification({
          user_id: req.employee_id,
          title: `Leave Request Approved - ${chosenLeaveTypeForApproval || 'Leave'}`,
          message: `Your leave request for ${req.start_date} to ${req.end_date} (${totalWorkingDays} working day(s)) has been approved and deducted from your balances.`
        });
      } catch (e) { /* ignore */ }
      
      setSelectedLeaveForApproval(null);
      fetchData();
      window.customAlert('Leave request approved and balances updated successfully!');
    } catch (err) {
      window.customAlert('Failed to approve leave request.');
    } finally {
      window.hideLoading();
    }
  };

  const handleSaveLeaveBalanceAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeaveBalanceEmp) return;
    window.showLoading('Updating leave balances...');
    try {
      await updateLeaveBalance(editingLeaveBalanceEmp.id, {
        casual_total: adjCasualTotal,
        casual_used: adjCasualUsed,
        medical_total: adjMedicalTotal,
        medical_used: adjMedicalUsed,
        annual_total: adjAnnualTotal,
        annual_used: adjAnnualUsed
      });
      setEditingLeaveBalanceEmp(null);
      fetchData();
      window.customAlert('Leave balances adjusted successfully!');
    } catch (err) {
      window.customAlert('Failed to update leave balances.');
    } finally {
      window.hideLoading();
    }
  };

  const handleOpenLeaveBalanceAdjustment = (emp: EmployeeProfile) => {
    const bal = leaveBalancesList.find(b => b.employee_id === emp.id) || {
      casual_total: 10, casual_used: 0,
      medical_total: 10, medical_used: 0,
      annual_total: 10, annual_used: 0
    };
    setEditingLeaveBalanceEmp(emp);
    setAdjCasualTotal(bal.casual_total);
    setAdjCasualUsed(bal.casual_used);
    setAdjMedicalTotal(bal.medical_total);
    setAdjMedicalUsed(bal.medical_used);
    setAdjAnnualTotal(bal.annual_total);
    setAdjAnnualUsed(bal.annual_used);
  };

  const handleSaveWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningTargetEmployee) return;
    window.showLoading('Issuing warning...');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          warning_text: warningText.trim(),
          warning_expiry: warningExpiry,
          warning_color: warningColor,
          warning_active: true
        })
        .eq('id', warningTargetEmployee.id);

      if (error) throw error;

      try {
        await createNotification({
          user_id: warningTargetEmployee.id,
          title: 'Disciplinary Warning Notice - Management',
          message: `A formal notice has been issued: "${warningText.trim()}" (Effective until ${new Date(warningExpiry + 'T00:00:00').toLocaleDateString()}).`
        });
      } catch (ex) { /* ignore */ }

      setWarningTargetEmployee(null);
      setWarningText('');
      setWarningExpiry('');
      fetchData();
      window.customAlert('Warning notice sent to employee successfully!');
    } catch (err) {
      window.customAlert('Failed to save warning.');
    } finally {
      window.hideLoading();
    }
  };

  const handleClearWarning = async (empId: string) => {
    window.showLoading('Clearing warning...');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          warning_text: null,
          warning_expiry: null,
          warning_color: null,
          warning_active: false
        })
        .eq('id', empId);

      if (error) throw error;

      try {
        await createNotification({
          user_id: empId,
          title: 'Disciplinary Warning Cleared',
          message: 'Your active warning notice has been officially cleared by Management.'
        });
      } catch (ex) {}

      fetchData();
      window.customAlert('Warning cleared successfully!');
    } catch (err) {
      window.customAlert('Failed to clear warning.');
    } finally {
      window.hideLoading();
    }
  };

  const getEmployeeShiftTimingHelper = (emp: EmployeeProfile): { startTime: string; endTime: string; graceMins?: number; isFixedHours?: boolean; totalHours?: number } => {
    return getEmployeeShiftTiming(emp, shiftTimings);
  };

  // Compile monthly payroll report calculations
  const calculatePayrollSummary = () => {
    return profiles.map(profile => {
      const timing = getEmployeeShiftTimingHelper(profile);
      const graceParam = timing.graceMins !== undefined ? timing.graceMins : (monthlyGraceSettings && Object.keys(monthlyGraceSettings).length > 0 ? monthlyGraceSettings : graceTimeMinsSetting);
      const summary = calculateEmployeePayrollSummary(
        profile,
        rawLogs,
        leaveRequests,
        startDate,
        endDate,
        holidaysList.map(h => h.date),
        graceParam,
        timing.startTime,
        timing.endTime,
        complaintsList,
        approvedCorrectionsList,
        timing.isFixedHours,
        timing.totalHours,
        shiftTimings,
        employeeLoansList
      );

      return {
        id: profile.id,
        pin: profile.pin,
        name: profile.full_name,
        department: profile.department || 'N/A',
        baseSalary: profile.base_salary,
        incomeTax: summary.incomeTax,
        hourlyRate: summary.hourlyRate,
        perMinRate: summary.perMinRate,
        totalWorkedHours: summary.totalWorkedHours,
        totalOvertimeHours: summary.totalOvertimeHours,
        totalCompensatedOvertimeHours: summary.totalCompensatedOvertimeHours,
        totalOvertimePayout: summary.totalOvertimePayout,
        lateArrivals: summary.lateArrivals,
        totalLateMinutes: summary.totalLateMinutes,
        totalLateDeduction: summary.totalLateDeduction,
        absences: summary.absences,
        totalAbsenceDeduction: summary.totalAbsenceDeduction,
        leavesTaken: summary.leavesTaken,
        loanDeduction: summary.loanDeduction,
        totalPayable: summary.netPayable
      };
    });
  };

  const payrollSummary = calculatePayrollSummary();



  const getEmployeeCalendarSummaryForMonth = (emp: EmployeeProfile, year: number, month: number) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startStr = `${year}-${pad(month + 1)}-01`;
    const endStr = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
    
    const holidayDates = holidaysList.map(h => h.date);
    const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === emp.id);
    const timing = getEmployeeShiftTimingHelper(emp);
    const effectiveGrace = timing.graceMins !== undefined ? timing.graceMins : (monthlyGraceSettings && Object.keys(monthlyGraceSettings).length > 0 ? monthlyGraceSettings : graceTimeMinsSetting);
    
    const targetLogs = (selectedCalendarProfile && emp.id === selectedCalendarProfile.id && selectedCalendarLogs.length > 0)
      ? Array.from(new Map([...rawLogs, ...selectedCalendarLogs].map(l => [`${l.employee_pin}-${l.timestamp}`, l])).values())
      : rawLogs;

    return processAttendanceLogs(
      emp,
      targetLogs,
      employeeLeaves,
      startStr,
      endStr,
      holidayDates,
      effectiveGrace,
      timing.startTime,
      timing.endTime,
      complaintsList,
      approvedCorrectionsList,
      timing.isFixedHours,
      timing.totalHours,
      shiftTimings,
      employeeLoansList
    );
  };

  const getEmployeeCalendarData = () => {
    if (!selectedCalendarProfile) return [];
    return getEmployeeCalendarSummaryForMonth(selectedCalendarProfile, adminViewYear, adminViewMonth);
  };

  const getEmployeeNetSalary = (emp: EmployeeProfile) => {
    const cacheKey = `${emp.id}-${startDate}-${endDate}-${rawLogs.length}-${shiftTimings.length}-${approvedCorrectionsList.length}-${leaveRequests.length}-${employeeLoansList.length}`;
    const cache = netSalaryCacheRef.current;
    if (cache[cacheKey] !== undefined) return cache[cacheKey];
    
    const holidayDates = holidaysList.map(h => h.date);
    const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === emp.id);
    const timing = getEmployeeShiftTimingHelper(emp);
    const effectiveGrace = timing.graceMins !== undefined ? timing.graceMins : (monthlyGraceSettings && Object.keys(monthlyGraceSettings).length > 0 ? monthlyGraceSettings : graceTimeMinsSetting);
    
    const summary = calculateEmployeePayrollSummary(
      emp,
      rawLogs,
      employeeLeaves,
      startDate,
      endDate,
      holidayDates,
      effectiveGrace,
      timing.startTime,
      timing.endTime,
      complaintsList,
      approvedCorrectionsList,
      timing.isFixedHours,
      timing.totalHours,
      shiftTimings,
      employeeLoansList
    );
    
    cache[cacheKey] = summary.netPayable;
    return summary.netPayable;
  };

  const handleOpenWhatsApp = (p: EmployeeProfile) => {
    let rawPhone = p.phone || (p as any).contact || (p as any).contact_number || (p as any).mobile || '';
    if (!rawPhone && p.emergency_contacts && p.emergency_contacts.length > 0) {
      rawPhone = p.emergency_contacts[0].phone || '';
    }
    
    if (!rawPhone) {
      alert(`No contact number found for ${p.full_name}. Please add a contact number in their profile.`);
      return;
    }

    let cleaned = rawPhone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    if (/^03\d{9}$/.test(cleaned)) {
      cleaned = '92' + cleaned.substring(1);
    }

    setWhatsAppModalEmployee(p);
    setWhatsAppModalPhone(cleaned);
  };

  const sendAdminContactNotification = async (emp: EmployeeProfile, channel: 'WhatsApp' | 'Email') => {
    try {
      window.showLoading(`Sending ${channel} notification...`);
      await createNotification({
        user_id: emp.id,
        title: `HR Notification (${channel})`,
        message: `HR reached out to you via ${channel}. Please check your phone/email.`
      });
      window.customAlert(`${channel} notification sent to ${emp.full_name}!`);
    } catch (e: any) {
      window.customAlert(`Failed to send notification: ${e.message}`);
    } finally {
      window.hideLoading();
    }
  };

  // Stats calculation for Overview
  const totalEmployees = profiles.length;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const activeLeavesToday = leaveRequests.filter(l => {
    return l.status === 'Approved' && todayStr >= l.start_date && todayStr <= l.end_date;
  }).length;

  // Calculate today's real-time active vs completed shifts grouped by Department using processAttendanceLogs for 100% parity
  let activeCheckedInCount = 0;
  let completedShiftCount = 0;

  const presentsByDept: Record<string, {
    emp: EmployeeProfile;
    checkIn: string | null;
    checkOut: string | null;
    status: 'Active' | 'Completed';
    isLate: boolean;
    shiftTiming: string;
  }[]> = {};

  const absentsByDept: Record<string, {
    emp: EmployeeProfile;
    monthLeaves: number;
    monthAbsences: number;
  }[]> = {};

  const leavesTodayByDept: Record<string, {
    emp: EmployeeProfile;
    leaveType: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }[]> = {};

  const holidayDates = holidaysList.map(h => h.date);

  profiles.forEach(emp => {
    const dept = emp.department || 'Administration';
    const timing = getEmployeeShiftTimingHelper(emp);
    const shiftTimingStr = timing.isFixedHours ? `Fix Hours (${timing.totalHours || 9}h Shift)` : `${timing.startTime} - ${timing.endTime}`;
    const empLeaves = leaveRequests.filter(lr => lr.employee_id === emp.id);

    // Active approved leave for today
    const activeLeave = empLeaves.find(l => l.status === 'Approved' && todayStr >= l.start_date && todayStr <= l.end_date);
    if (activeLeave) {
      if (!leavesTodayByDept[dept]) leavesTodayByDept[dept] = [];
      leavesTodayByDept[dept].push({
        emp,
        leaveType: activeLeave.leave_type,
        startDate: activeLeave.start_date,
        endDate: activeLeave.end_date,
        reason: activeLeave.reason
      });
    }

    // Get exact same calendar summary for the employee for TODAY's actual month & year
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const monthProcessed = getEmployeeCalendarSummaryForMonth(emp, todayYear, todayMonth);
    const todaySummary = monthProcessed.find(s => s.date === todayStr);

    const hasPunchToday = Boolean(todaySummary?.checkIn) || (todaySummary?.status === 'Present') || (todaySummary?.isLate);
    const isLeave = Boolean(activeLeave) || Boolean(todaySummary?.status?.startsWith('Leave'));
    const isHoliday = todaySummary?.status === 'Holiday';

    if (hasPunchToday) {
      const checkInTime = todaySummary?.checkIn || 'Checked In';
      let checkOutTime = todaySummary?.checkOut || null;

      // If check-in and check-out are identical or check-out is missing, the shift is still Active (Checked In)
      if (checkOutTime && checkOutTime === checkInTime) {
        checkOutTime = null;
      }

      const status: 'Active' | 'Completed' = (checkOutTime && checkOutTime !== checkInTime) ? 'Completed' : 'Active';
      if (status === 'Active') activeCheckedInCount++;
      else completedShiftCount++;

      if (!presentsByDept[dept]) presentsByDept[dept] = [];
      presentsByDept[dept].push({
        emp,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        status,
        isLate: todaySummary?.isLate || false,
        shiftTiming: shiftTimingStr
      });
    } else if (!isLeave && !isHoliday) {
      // Calculate month leave & absence counts for absent popup
      const startOfMonthStr = `${calendarYear}-${pad(calendarMonth + 1)}-01`;
      const lastDayStr = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(new Date(calendarYear, calendarMonth + 1, 0).getDate())}`;
      const graceParam = timing.graceMins !== undefined ? timing.graceMins : (monthlyGraceSettings && Object.keys(monthlyGraceSettings).length > 0 ? monthlyGraceSettings : graceTimeMinsSetting);
      const monthProcessed = processAttendanceLogs(emp, rawLogs, empLeaves, startOfMonthStr, lastDayStr, holidayDates, graceParam, timing.startTime, timing.endTime, complaintsList, approvedCorrectionsList, timing.isFixedHours, timing.totalHours, shiftTimings);

      const monthLeaves = monthProcessed.filter(s => s.status.startsWith('Leave')).length;
      const monthAbsences = monthProcessed.filter(s => s.isAbsent).length;

      if (!absentsByDept[dept]) absentsByDept[dept] = [];
      absentsByDept[dept].push({
        emp,
        monthLeaves,
        monthAbsences
      });
    }
  });

  const totalPresentsToday = activeCheckedInCount + completedShiftCount;
  const absentsTodayCount = Math.max(0, totalEmployees - totalPresentsToday - activeLeavesToday);

  // Compute stats for monthly breakdown chart
  const currentMonthKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
  const activeGraceMins = getGracePeriodForDate(currentMonthKey, monthlyGraceSettings || graceTimeMinsSetting);
  const lateAfterTimeStr = getLateAfterTimeStr(activeGraceMins, defaultShiftStart || '11:00');

  let monthlyLateCount = 0;
  let monthlyAbsentCount = 0;
  let monthlyLeaveCount = 0;

  payrollSummary.forEach(row => {
    monthlyLateCount += row.lateArrivals;
    monthlyAbsentCount += row.absences;
    monthlyLeaveCount += row.leavesTaken;
  });

  if (loading) {
    return (
      <div className="cool-loading-screen">
        <div className="cool-spinner-container">
          <div className="cool-spinner-ring-outer"></div>
          <div className="cool-spinner-ring-inner"></div>
          <img src="/icons/logo.png" alt="logo" className="cool-spinner-logo" />
        </div>
        <div className="cool-loading-text">
          <span>Elipse HR</span>
          <span className="cool-loading-subtext">Initializing secure admin session...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page} className="app-page">
      {/* Top Navbar */}
      <nav style={styles.navbar} className="glass-panel responsive-navbar">
        <div className="responsive-nav-top-row">
          <div style={styles.navBrand}>
            <img 
              src="/icons/logo.png" 
              alt="logo" 
              className="logo-icon" 
              style={{ width: '60px', height: 'auto', objectFit: 'contain', marginRight: '6px' }} 
            />
            <span style={styles.navTitle} className="hide-on-mobile">ELIPSE HR</span>
            <span style={styles.badge} className="hide-on-mobile">HR / Admin Portal</span>
          </div>

          <div className="responsive-nav-actions">
            {/* Notifications Bell Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} 
                className="btn btn-secondary" 
                style={{ padding: '6px 10px', position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                title="Notifications"
              >
                <img 
                  src="/icons/bell.png" 
                  alt="notifications" 
                  className="theme-icon" 
                  style={{ width: '16px', height: '16px', display: 'block' }} 
                />
                {notificationsList.filter(n => !n.is_read).length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-5px',
                    background: 'var(--danger)',
                    color: 'white',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    borderRadius: '10px',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: '1',
                    boxShadow: 'var(--danger-glow)'
                  }}>
                    {notificationsList.filter(n => !n.is_read).length > 99 ? '99+' : notificationsList.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>
            </div>
            
            {/* Change Password settings toggle */}
            <button 
              onClick={() => setIsAdminChangePasswordModalOpen(true)} 
              style={styles.toggleBtn} 
              className="btn btn-secondary" 
              title="Change Account Password"
            >
              <img 
                src="/icons/lock.png" 
                alt="Change Password" 
                className="theme-icon" 
                style={{ width: '16px', height: '16px', display: 'block' }} 
              />
            </button>

            {/* Theme Switcher Button */}
            <button onClick={toggleTheme} style={styles.toggleBtn} className="btn btn-secondary" title="Toggle Theme">
              <img 
                src={theme === 'dark' ? '/icons/sun.png' : '/icons/moon.png'} 
                alt="Theme" 
                className="theme-icon" 
                style={{ width: '16px', height: '16px', display: 'block' }} 
              />
            </button>

            {/* Switch to Employee Portal Button */}
            {hasEmployeePortalAccess && (
              <button 
                type="button"
                onClick={() => onSwitchPortal && onSwitchPortal('employee')} 
                className="btn btn-secondary" 
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#10b981',
                  cursor: 'pointer'
                }}
                title="Switch to Personal Employee Portal (Live Clock, Punch History, My Requests)"
              >
                <img src="/icons/user.png" alt="Employee Portal" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                <span className="hide-on-mobile">Employee Portal</span>
              </button>
            )}

            <button onClick={onLogout} style={styles.logoutBtn} className="btn btn-secondary mobile-icon-only-btn" title="Sign Out">
              <img 
                src="/icons/logout.png" 
                alt="logout" 
                className="theme-icon" 
                style={{ width: '14px', height: '14px' }} 
              /> 
              <span className="hide-on-mobile" style={{ marginLeft: '6px' }}>Sign Out</span>
            </button>
          </div>
        </div>

        <div className="responsive-nav-bottom-row">
          <div className="responsive-nav-username-container">
            <img src="/icons/user.png" alt="user" className="theme-icon" style={{ width: '15px', height: '15px', marginRight: '6px', flexShrink: 0 }} />
            <span className="responsive-nav-username">
              {(adminName || 'HR Administrator').replace(/\s+/g, ' ').trim()} (HR)
            </span>
          </div>
        </div>
      </nav>

      {/* Tabs Selection */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', overflowX: 'auto' }}>
        <div style={styles.tabsRow} className="tabs-scroll-container">
          {/* Quick link to personal Employee Portal */}
          {hasEmployeePortalAccess && (
            <button 
              type="button"
              onClick={() => onSwitchPortal && onSwitchPortal('employee')} 
              style={{
                ...styles.tabBtn,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#10b981',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              title="Open your personal Employee Portal (Clock In/Out, Leave Requests, Personal Logs)"
            >
              <img src="/icons/user.png" alt="user" className="theme-icon" style={{ width: '13px', height: '13px' }} />
              <span>Employee Portal ({userAllowedTabs.filter(t => t.startsWith('employee:')).length || 4} Tabs) ↗</span>
            </button>
          )}

          {isTabAllowed('overview') && (
            <button 
              onClick={() => setActiveTab('overview')} 
              style={{...styles.tabBtn, borderBottom: activeTab === 'overview' ? '3px solid var(--primary)' : 'none', color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
            >
              Overview
            </button>
          )}
          {isTabAllowed('calendar') && (
            <button 
              onClick={() => setActiveTab('calendar')} 
              style={{...styles.tabBtn, borderBottom: activeTab === 'calendar' ? '3px solid var(--primary)' : 'none', color: activeTab === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
            >
              Calendar
            </button>
          )}
          {isTabAllowed('employees') && (
            <button 
              onClick={() => setActiveTab('employees')} 
              style={{...styles.tabBtn, borderBottom: activeTab === 'employees' ? '3px solid var(--primary)' : 'none', color: activeTab === 'employees' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
            >
              Employees
            </button>
          )}
          {isTabAllowed('attendance') && (
            <button 
              onClick={() => setActiveTab('attendance')} 
              style={{...styles.tabBtn, borderBottom: activeTab === 'attendance' ? '3px solid var(--primary)' : 'none', color: activeTab === 'attendance' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
            >
              Attendance logs
            </button>
          )}
          {isTabAllowed('approvals') && (
            <button 
              onClick={() => setActiveTab('approvals')} 
              style={{
                ...styles.tabBtn, 
                borderBottom: (activeTab === 'approvals' || activeTab === 'leaves' || activeTab === 'complaints') ? '3px solid var(--primary)' : 'none', 
                color: (activeTab === 'approvals' || activeTab === 'leaves' || activeTab === 'complaints') ? 'var(--text-primary)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Approvals Panel</span>
              {(leaveRequests.filter(l => l.status === 'Pending').length + complaintsList.filter(c => c.status !== 'Resolved' && c.status !== 'Ignored' && c.status !== 'Rejected' && c.status !== 'Closed').length) > 0 && (
                <span style={{
                  background: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  padding: '2px 7px',
                  borderRadius: '10px'
                }}>
                  {leaveRequests.filter(l => l.status === 'Pending').length + complaintsList.filter(c => c.status !== 'Resolved' && c.status !== 'Ignored' && c.status !== 'Rejected' && c.status !== 'Closed').length}
                </span>
              )}
            </button>
          )}
          {isTabAllowed('payroll') && (
            <button 
              onClick={() => setActiveTab('payroll')} 
              style={{...styles.tabBtn, borderBottom: activeTab === 'payroll' ? '3px solid var(--primary)' : 'none', color: activeTab === 'payroll' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
            >
              Overtime & Salary
            </button>
          )}
          {isTabAllowed('timings') && (
            <button 
              onClick={() => setActiveTab('timings')} 
              style={{...styles.tabBtn, borderBottom: activeTab === 'timings' ? '3px solid var(--primary)' : 'none', color: activeTab === 'timings' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
            >
              Time Manager
            </button>
          )}
          {isTabAllowed('announcements') && (
            <button 
              onClick={() => setActiveTab('announcements')} 
              style={{...styles.tabBtn, borderBottom: activeTab === 'announcements' ? '3px solid var(--primary)' : 'none', color: activeTab === 'announcements' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
            >
              Announcements
            </button>
          )}
          {isTabAllowed('device') && (
            <button 
              onClick={() => setActiveTab('device')} 
              style={{...styles.tabBtn, borderBottom: activeTab === 'device' ? '3px solid var(--primary)' : 'none', color: activeTab === 'device' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
            >
              Device settings
            </button>
          )}
          {isTabAllowed('converter') && (
            <button 
              onClick={() => setActiveTab('converter')} 
              style={{...styles.tabBtn, borderBottom: activeTab === 'converter' ? '3px solid var(--primary)' : 'none', color: activeTab === 'converter' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
            >
              File Converter
            </button>
          )}
        </div>
        <button onClick={() => fetchData()} title="Refresh from database" className="btn btn-secondary mobile-icon-only-btn" style={{ marginLeft: 'auto', padding: '6px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>⟳</span>
          <span className="hide-on-mobile"> Refresh</span>
        </button>
      </div>

                  {/* TAB CONTENTS */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <OverviewTab
          setActiveTab={setActiveTab}
          totalEmployees={totalEmployees}
          setShowPresentsModal={setShowPresentsModal}
          totalPresentsToday={totalPresentsToday}
          activeCheckedInCount={activeCheckedInCount}
          completedShiftCount={completedShiftCount}
          activeLeavesToday={activeLeavesToday}
          setShowLeavesModal={setShowLeavesModal}
          setShowAbsentsModal={setShowAbsentsModal}
          absentsTodayCount={absentsTodayCount}
          monthlyLateCount={monthlyLateCount}
          monthlyLeaveCount={monthlyLeaveCount}
          monthlyAbsentCount={monthlyAbsentCount}
          currentMonthKey={currentMonthKey}
          defaultShiftStart={defaultShiftStart}
          defaultShiftEnd={defaultShiftEnd}
          defaultShiftHours={defaultShiftHours}
          activeGraceMins={activeGraceMins}
          lateAfterTimeStr={lateAfterTimeStr}
          shiftTimings={shiftTimings}
          profiles={profiles}
        />
      )}

      {/* 2. CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <CalendarTab
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          calendarYear={calendarYear}
          setCalendarYear={setCalendarYear}
          holidaysList={holidaysList}
          profiles={profiles}
          leaveRequests={leaveRequests}
          handleCalendarDayClick={handleCalendarDayClick}
          handleDeleteHoliday={handleDeleteHoliday}
        />
      )}

      {/* 3. EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <EmployeesTab
          deptFilter={deptFilter}
          setDeptFilter={setDeptFilter}
          sortedDepartmentsList={sortedDepartmentsList}
          desigFilter={desigFilter}
          setDesigFilter={setDesigFilter}
          designationsList={designationsList}
          employeeSearchQuery={employeeSearchQuery}
          setEmployeeSearchQuery={setEmployeeSearchQuery}
          employeeSortKey={employeeSortKey}
          setEmployeeSortKey={setEmployeeSortKey}
          customDeptOrder={customDeptOrder}
          setCustomDeptOrder={setCustomDeptOrder}
          adminEmpMonth={adminEmpMonth}
          setAdminEmpMonth={setAdminEmpMonth}
          adminEmpYear={adminEmpYear}
          setAdminEmpYear={setAdminEmpYear}
          exportSalariesPDF={exportSalariesPDF}
          setIsAddEmployeeModalOpen={setIsAddEmployeeModalOpen}
          showAdminPasswords={showAdminPasswords}
          setShowAdminPasswords={setShowAdminPasswords}
          showAdminSalariesMap={showAdminSalariesMap}
          setShowAdminSalariesMap={setShowAdminSalariesMap}
          groupedProfilesByDept={groupedProfilesByDept}
          draggedDept={draggedDept}
          dragOverDept={dragOverDept}
          setDragOverDept={setDragOverDept}
          handleDeptDragStart={handleDeptDragStart}
          handleDeptDragOver={handleDeptDragOver}
          handleDeptDrop={handleDeptDrop}
          getEmployeeNetSalary={getEmployeeNetSalary}
          setViewingProfileDetails={setViewingProfileDetails}
          setSelectedCalendarProfile={setSelectedCalendarProfile}
          setAdminViewYear={setAdminViewYear}
          setAdminViewMonth={setAdminViewMonth}
          setSelectedAdminEmpCalendarDayData={setSelectedAdminEmpCalendarDayData}
          setWarningTargetEmployee={setWarningTargetEmployee}
          setWarningText={setWarningText}
          setWarningExpiry={setWarningExpiry}
          setWarningColor={setWarningColor}
          handleEditProfileClick={handleEditProfileClick}
          handleDeleteProfileClick={handleDeleteProfileClick}
          handleOpenWhatsApp={handleOpenWhatsApp}
          purposeSearchQuery={purposeSearchQuery}
          setPurposeSearchQuery={setPurposeSearchQuery}
          purposeTransfersList={purposeTransfersList}
          handleEditTransferClick={handleEditTransferClick}
          setEmployeeModalTab={setEmployeeModalTab}
          handleDeleteTransfer={handleDeleteTransfer}
          employeeLoansList={employeeLoansList}
        />
      )}

      {/* 4. ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <AttendanceTab
          rawLogs={rawLogs}
          profiles={profiles}
          rawLogsSearch={rawLogsSearch}
          setRawLogsSearch={setRawLogsSearch}
          rawLogsEmpFilter={rawLogsEmpFilter}
          setRawLogsEmpFilter={setRawLogsEmpFilter}
          rawLogsDateFilter={rawLogsDateFilter}
          setRawLogsDateFilter={setRawLogsDateFilter}
          rawLogsStatusFilter={rawLogsStatusFilter}
          setRawLogsStatusFilter={setRawLogsStatusFilter}
        />
      )}

      {/* 5. APPROVALS PANEL */}
      {(activeTab === 'approvals' || activeTab === 'leaves' || activeTab === 'complaints') && (
        <ApprovalsTab
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          approvalsSubTab={approvalsSubTab}
          setApprovalsSubTab={setApprovalsSubTab}
          leaveRequests={leaveRequests}
          complaintsList={complaintsList}
          employeeLoansList={employeeLoansList}
          selectedAdminLeaveIds={selectedAdminLeaveIds}
          setSelectedAdminLeaveIds={setSelectedAdminLeaveIds}
          handleAdminDeleteLeaveRequests={handleAdminDeleteLeaveRequests}
          handleLeaveStatusChange={handleLeaveStatusChange}
          profiles={profiles}
          holidaysList={holidaysList}
          leaveBalanceSearchQuery={leaveBalanceSearchQuery}
          setLeaveBalanceSearchQuery={setLeaveBalanceSearchQuery}
          leaveBalancesList={leaveBalancesList}
          handleOpenLeaveBalanceAdjustment={handleOpenLeaveBalanceAdjustment}
          selectedAdminComplaintIds={selectedAdminComplaintIds}
          setSelectedAdminComplaintIds={setSelectedAdminComplaintIds}
          handleAdminDeleteComplaints={handleAdminDeleteComplaints}
          handleUpdateComplaintStatus={handleUpdateComplaintStatus}
          handleApproveAttendanceCorrection={handleApproveAttendanceCorrection}
          setEditingCorrectionComplaint={setEditingCorrectionComplaint}
          setEditCorrectionDate={setEditCorrectionDate}
          setEditCorrectionCheckIn={setEditCorrectionCheckIn}
          setEditCorrectionCheckOut={setEditCorrectionCheckOut}
          handleOpenApproveLoanModal={handleOpenApproveLoanModal}
          handleOpenModifyLoanModal={handleOpenModifyLoanModal}
          handleRevertLoan={handleRevertLoan}
          handleRejectLoan={handleRejectLoan}
          handleDeleteLoanRecord={handleDeleteLoanRecord}
          setPaymentLoan={setPaymentLoan}
          setPaymentAmount={setPaymentAmount}
          handleSkipMonth={handleOpenSkipMonthModal}
          handleOpenWhatsApp={handleOpenWhatsApp}
        />
      )}

      {/* 6. PAYROLL TAB */}
      {activeTab === 'payroll' && (
        <PayrollTab
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          payrollSearchQuery={payrollSearchQuery}
          setPayrollSearchQuery={setPayrollSearchQuery}
          showAdminSalariesMap={showAdminSalariesMap}
          setShowAdminSalariesMap={setShowAdminSalariesMap}
          customDeptOrder={customDeptOrder}
          setCustomDeptOrder={setCustomDeptOrder}
          setIsSalaryExportModalOpen={setIsSalaryExportModalOpen}
          payrollSummary={payrollSummary}
          draggedDept={draggedDept}
          dragOverDept={dragOverDept}
          setDragOverDept={setDragOverDept}
          handleDeptDragStart={handleDeptDragStart}
          handleDeptDragOver={handleDeptDragOver}
          handleDeptDrop={handleDeptDrop}
          profiles={profiles}
          shiftTimings={shiftTimings}
          formatSalary={formatSalary}
        />
      )}

      {/* 7. TIMINGS TAB */}
      {activeTab === 'timings' && (
        <TimingsTab
          setIsAddTimingModalOpen={setIsAddTimingModalOpen}
          graceTargetScopeType={graceTargetScopeType}
          setGraceTargetScopeType={setGraceTargetScopeType}
          calendarYear={calendarYear}
          calendarMonth={calendarMonth}
          graceTargetMonth={graceTargetMonth}
          setGraceTargetMonth={setGraceTargetMonth}
          graceStartDate={graceStartDate}
          setGraceStartDate={setGraceStartDate}
          graceEndDate={graceEndDate}
          setGraceEndDate={setGraceEndDate}
          defaultShiftStart={defaultShiftStart}
          setDefaultShiftStart={setDefaultShiftStart}
          defaultShiftEnd={defaultShiftEnd}
          setDefaultShiftEnd={setDefaultShiftEnd}
          defaultShiftHours={defaultShiftHours}
          setDefaultShiftHours={setDefaultShiftHours}
          graceTimeMinsSetting={graceTimeMinsSetting}
          setGraceTimeMinsSetting={setGraceTimeMinsSetting}
          monthlyGraceSettings={monthlyGraceSettings}
          setMonthlyGraceSettings={setMonthlyGraceSettings}
          deviceSettings={deviceSettings}
          setDeviceSettings={setDeviceSettings}
          fetchData={fetchData}
          shiftTimings={shiftTimings}
          handleEditShiftTimingClick={handleEditShiftTimingClick}
          handleDeleteShiftTimingClick={handleDeleteShiftTimingClick}
        />
      )}

      {/* 8. ANNOUNCEMENTS TAB */}
      {activeTab === 'announcements' && (
        <AnnouncementsTab
          announcementsList={announcementsList}
          handleDeleteAnnouncement={handleDeleteAnnouncement}
          setIsPostAnnouncementModalOpen={setIsPostAnnouncementModalOpen}
          profiles={profiles}
        />
      )}

      {/* 9. SYSTEM & DEVICE SETTINGS TAB */}
      {activeTab === 'device' && (
        <DeviceTab
          deviceSettings={deviceSettings}
          handleSaveDeviceSettings={handleSaveDeviceSettings}
          handleToggleMuteNotifications={handleToggleMuteNotifications}
          editDeviceIp={editDeviceIp}
          setEditDeviceIp={setEditDeviceIp}
          editDevicePort={editDevicePort}
          setEditDevicePort={setEditDevicePort}
          editDeviceInterval={editDeviceInterval}
          setEditDeviceInterval={setEditDeviceInterval}
          editAutoBackupEnabled={editAutoBackupEnabled}
          setEditAutoBackupEnabled={setEditAutoBackupEnabled}
          editBackupDirectory={editBackupDirectory}
          setEditBackupDirectory={setEditBackupDirectory}
          adminTrustedDevice={adminTrustedDevice}
          handleDisableAdminBiometric={handleDisableAdminBiometric}
          handleRegisterAdminBiometric={handleRegisterAdminBiometric}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          processMultipleFiles={processMultipleFiles}
          uploadStatus={uploadStatus}
        />
      )}

      {/* 11. ADVANCED FILE CONVERTER TAB */}
      {activeTab === 'converter' && (
        <ConverterTab
          conversionMode={conversionMode}
          setConversionMode={setConversionMode}
          converterSelectedFile={converterSelectedFile}
          setConverterSelectedFile={setConverterSelectedFile}
          converterIsDragging={converterIsDragging}
          setConverterIsDragging={setConverterIsDragging}
          converterFileInputRef={converterFileInputRef}
          exportUseLetterhead={exportUseLetterhead}
          setExportUseLetterhead={setExportUseLetterhead}
          exportEmployeesPerPage={exportEmployeesPerPage}
          setExportEmployeesPerPage={setExportEmployeesPerPage}
        />
      )}

      {/* Fallback Access Restricted Notice if activeTab is forbidden */}
      {!loading && !isTabAllowed(activeTab) && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg, 16px)',
          margin: '20px 0'
        }}>
          <img src="/icons/lock.png" alt="restricted" className="theme-icon" style={{ width: '48px', height: '48px', marginBottom: '16px', opacity: 0.8 }} />
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.25rem' }}>
            Access Restricted
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px auto' }}>
            You do not have permission to view this tab. Please select an authorized tab from the navigation bar above or contact your administrator.
          </p>
        </div>
      )}

      {/* ALL MODALS & DIALOGS */}
      <SalaryExportModal
        isSalaryExportModalOpen={isSalaryExportModalOpen}
        setIsSalaryExportModalOpen={setIsSalaryExportModalOpen}
        startDate={startDate}
        endDate={endDate}
        exportFormat={exportFormat}
        setExportFormat={setExportFormat}
        payrollSummary={payrollSummary}
      />

      <EmployeeFormModal
        isAddEmployeeModalOpen={isAddEmployeeModalOpen}
        setIsAddEmployeeModalOpen={setIsAddEmployeeModalOpen}
        isEditingProfile={isEditingProfile}
        setIsEditingProfile={setIsEditingProfile}
        employeeModalTab={employeeModalTab}
        setEmployeeModalTab={setEmployeeModalTab}
        handleSaveProfile={handleSaveProfile}
        fullName={fullName}
        setFullName={setFullName}
        showAddCustomPurpose={showAddCustomPurpose}
        setShowAddCustomPurpose={setShowAddCustomPurpose}
        newCustomPurposeInput={newCustomPurposeInput}
        setNewCustomPurposeInput={setNewCustomPurposeInput}
        transferPurposeOptions={transferPurposeOptions}
        setTransferPurposeOptions={setTransferPurposeOptions}
        transferPurpose={transferPurpose}
        setTransferPurpose={setTransferPurpose}
        setDesignation={setDesignation}
        designation={designation}
        baseSalary={baseSalary}
        setBaseSalary={setBaseSalary}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        bankName={bankName}
        setBankName={setBankName}
        bankAccountTitle={bankAccountTitle}
        setBankAccountTitle={setBankAccountTitle}
        bankAccountNo={bankAccountNo}
        setBankAccountNo={setBankAccountNo}
        handleCloseFormModal={handleCloseFormModal}
        pin={pin}
        setPin={setPin}
        joiningDate={joiningDate}
        setJoiningDate={setJoiningDate}
        dateOfBirth={dateOfBirth}
        setDateOfBirth={setDateOfBirth}
        employeeEmail={employeeEmail}
        setEmployeeEmail={setEmployeeEmail}
        employeePhone={employeePhone}
        setEmployeePhone={setEmployeePhone}
        employeePassword={employeePassword}
        setEmployeePassword={setEmployeePassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        department={department}
        setDepartment={setDepartment}
        departmentsList={sortedDepartmentsList}
        setShowAddDeptModal={setShowAddDeptModal}
        isRoleAdmin={isRoleAdmin}
        setIsRoleAdmin={setIsRoleAdmin}
        designationsList={designationsList}
        setShowAddDesigModal={setShowAddDesigModal}
        incomeTax={incomeTax}
        setIncomeTax={setIncomeTax}
        profiles={profiles}
        getEmployeeShiftTimingHelper={getEmployeeShiftTimingHelper}
        nicNo={nicNo}
        handleNicChange={handleNicChange}
        emergencyContacts={emergencyContacts}
        setEmergencyContacts={setEmergencyContacts}
        newContactName={newContactName}
        setNewContactName={setNewContactName}
        newContactPhone={newContactPhone}
        setNewContactPhone={setNewContactPhone}
        newContactRelation={newContactRelation}
        setNewContactRelation={setNewContactRelation}
        timelinePeriods={timelinePeriods}
        setTimelinePeriods={setTimelinePeriods}
        newPeriodHeading={newPeriodHeading}
        setNewPeriodHeading={setNewPeriodHeading}
        newPeriodStartDate={newPeriodStartDate}
        setNewPeriodStartDate={setNewPeriodStartDate}
        newPeriodEndDate={newPeriodEndDate}
        setNewPeriodEndDate={setNewPeriodEndDate}
        newPeriodIsPresent={newPeriodIsPresent}
        setNewPeriodIsPresent={setNewPeriodIsPresent}
        showAddDeptModal={showAddDeptModal}
        newDeptName={newDeptName}
        setNewDeptName={setNewDeptName}
        handleAddDepartment={handleAddDepartment}
        showAddDesigModal={showAddDesigModal}
        newDesigName={newDesigName}
        setNewDesigName={setNewDesigName}
        handleAddDesignation={handleAddDesignation}
        allowedTabs={allowedTabs}
        setAllowedTabs={setAllowedTabs}
        isPermissionsModalOpen={isPermissionsModalOpen}
        setIsPermissionsModalOpen={setIsPermissionsModalOpen}
      />

      <LeaveAndWarningModals
        selectedLeaveForApproval={selectedLeaveForApproval}
        setSelectedLeaveForApproval={setSelectedLeaveForApproval}
        holidaysList={holidaysList}
        profiles={profiles}
        leaveBalancesList={leaveBalancesList}
        primaryLeaveDaysAllocated={primaryLeaveDaysAllocated}
        setPrimaryLeaveDaysAllocated={setPrimaryLeaveDaysAllocated}
        chosenLeaveTypeForApproval={chosenLeaveTypeForApproval}
        setChosenLeaveTypeForApproval={setChosenLeaveTypeForApproval}
        secondaryLeaveTypeForApproval={secondaryLeaveTypeForApproval}
        setSecondaryLeaveTypeForApproval={setSecondaryLeaveTypeForApproval}
        handleApproveLeaveWithDetails={handleApproveLeaveWithDetails}
        editingLeaveBalanceEmp={editingLeaveBalanceEmp}
        setEditingLeaveBalanceEmp={setEditingLeaveBalanceEmp}
        adjCasualUsed={adjCasualUsed}
        setAdjCasualUsed={setAdjCasualUsed}
        adjCasualTotal={adjCasualTotal}
        setAdjCasualTotal={setAdjCasualTotal}
        adjMedicalUsed={adjMedicalUsed}
        setAdjMedicalUsed={setAdjMedicalUsed}
        adjMedicalTotal={adjMedicalTotal}
        setAdjMedicalTotal={setAdjMedicalTotal}
        adjAnnualUsed={adjAnnualUsed}
        setAdjAnnualUsed={setAdjAnnualUsed}
        adjAnnualTotal={adjAnnualTotal}
        setAdjAnnualTotal={setAdjAnnualTotal}
        handleSaveLeaveBalanceAdjustment={handleSaveLeaveBalanceAdjustment}
        warningTargetEmployee={warningTargetEmployee}
        setWarningTargetEmployee={setWarningTargetEmployee}
        handleClearWarning={handleClearWarning}
        handleSaveWarning={handleSaveWarning}
        warningText={warningText}
        setWarningText={setWarningText}
        warningExpiry={warningExpiry}
        setWarningExpiry={setWarningExpiry}
        warningColor={warningColor}
        setWarningColor={setWarningColor}
        editingCorrectionComplaint={editingCorrectionComplaint}
        setEditingCorrectionComplaint={setEditingCorrectionComplaint}
        handleSaveAndApproveCorrection={handleSaveAndApproveCorrection}
        editCorrectionDate={editCorrectionDate}
        setEditCorrectionDate={setEditCorrectionDate}
        editCorrectionCheckIn={editCorrectionCheckIn}
        setEditCorrectionCheckIn={setEditCorrectionCheckIn}
        editCorrectionCheckOut={editCorrectionCheckOut}
        setEditCorrectionCheckOut={setEditCorrectionCheckOut}
      />

      <ShiftTimingModal
        isAddTimingModalOpen={isAddTimingModalOpen}
        setIsAddTimingModalOpen={setIsAddTimingModalOpen}
        editingTimingRule={editingTimingRule}
        setEditingTimingRule={setEditingTimingRule}
        handleSaveShiftTiming={handleSaveShiftTiming}
        timingTargetType={timingTargetType}
        setTimingTargetType={setTimingTargetType}
        timingTargetId={timingTargetId}
        setTimingTargetId={setTimingTargetId}
        designationsList={designationsList}
        sortedDepartmentsList={sortedDepartmentsList}
        profiles={profiles}
        timingIsFixedHours={timingIsFixedHours}
        setTimingIsFixedHours={setTimingIsFixedHours}
        timingTotalHours={timingTotalHours}
        setTimingTotalHours={setTimingTotalHours}
        timingStartTime={timingStartTime}
        setTimingStartTime={setTimingStartTime}
        timingEndTime={timingEndTime}
        setTimingEndTime={setTimingEndTime}
        timingAllowRegularOvertime={timingAllowRegularOvertime}
        setTimingAllowRegularOvertime={setTimingAllowRegularOvertime}
        timingGraceMins={timingGraceMins}
        setTimingGraceMins={setTimingGraceMins}
        timingDays={timingDays}
        setTimingDays={setTimingDays}
        saturdayOption={saturdayOption}
        setSaturdayOption={setSaturdayOption}
      />

      <AnnouncementModal
        isPostAnnouncementModalOpen={isPostAnnouncementModalOpen}
        setIsPostAnnouncementModalOpen={setIsPostAnnouncementModalOpen}
        announceTitle={announceTitle}
        setAnnounceTitle={setAnnounceTitle}
        announceMessage={announceMessage}
        setAnnounceMessage={setAnnounceMessage}
        announceTargetType={announceTargetType}
        setAnnounceTargetType={setAnnounceTargetType}
        announceTargetValue={announceTargetValue}
        setAnnounceTargetValue={setAnnounceTargetValue}
        announceColor={announceColor}
        setAnnounceColor={setAnnounceColor}
        handleCreateAnnouncement={handleCreateAnnouncement}
        sortedDepartmentsList={sortedDepartmentsList}
        designationsList={designationsList}
        profiles={profiles}
      />

      <EmployeeDetailModals
        selectedCalendarProfile={selectedCalendarProfile}
        setSelectedCalendarProfile={setSelectedCalendarProfile}
        selectedAdminEmpCalendarDayData={selectedAdminEmpCalendarDayData}
        setSelectedAdminEmpCalendarDayData={setSelectedAdminEmpCalendarDayData}
        adminAttendanceViewMode={adminAttendanceViewMode}
        setAdminAttendanceViewMode={setAdminAttendanceViewMode}
        selectedCalendarLogs={selectedCalendarLogs}
        setSelectedCalendarLogs={setSelectedCalendarLogs}
        getRawLogs={getRawLogs}
        adminViewMonth={adminViewMonth}
        setAdminViewMonth={setAdminViewMonth}
        adminViewYear={adminViewYear}
        setAdminViewYear={setAdminViewYear}
        getEmployeeCalendarData={getEmployeeCalendarData}
        exportOtMode={exportOtMode}
        holidaysList={holidaysList}
        leaveRequests={leaveRequests}
        handleAdminEmpCalendarDayClick={handleAdminEmpCalendarDayClick}
        formatSalary={formatSalary}
        viewingProfileDetails={viewingProfileDetails}
        setViewingProfileDetails={setViewingProfileDetails}
        showDetailsPassword={showDetailsPassword}
        setShowDetailsPassword={setShowDetailsPassword}
        getEmployeeShiftTimingHelper={getEmployeeShiftTimingHelper}
        handleEditTransferClick={handleEditTransferClick}
        setEmployeeModalTab={setEmployeeModalTab}
        setIsAddEmployeeModalOpen={setIsAddEmployeeModalOpen}
        handleEditProfileClick={handleEditProfileClick}
        selectedCalendarDayData={selectedCalendarDayData}
        setSelectedCalendarDayData={setSelectedCalendarDayData}
        handleDeleteHoliday={handleDeleteHoliday}
        setSelectedHolidayDate={setSelectedHolidayDate}
        setIsHolidayModalOpen={setIsHolidayModalOpen}
        shiftTimings={shiftTimings}
        employeeLoansList={employeeLoansList}
        getEmployeeNetSalary={getEmployeeNetSalary}
      />

      <LoanModals
        scheduleModalLoan={scheduleModalLoan}
        setScheduleModalLoan={setScheduleModalLoan}
        scheduleModalMode={scheduleModalMode}
        scheduleLoanName={scheduleLoanName}
        setScheduleLoanName={setScheduleLoanName}
        scheduleLoanAmount={scheduleLoanAmount}
        setScheduleLoanAmount={setScheduleLoanAmount}
        scheduleDuration={scheduleDuration}
        setScheduleDuration={setScheduleDuration}
        scheduleMonths={scheduleMonths}
        setScheduleMonths={setScheduleMonths}
        handleConfirmLoanSchedule={handleConfirmLoanSchedule}
        profiles={profiles}
        paymentLoan={paymentLoan}
        setPaymentLoan={setPaymentLoan}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        handleRecordPayment={handleRecordPayment}
        skipModalLoan={skipModalLoan}
        setSkipModalLoan={setSkipModalLoan}
        selectedMonthToSkip={selectedMonthToSkip}
        setSelectedMonthToSkip={setSelectedMonthToSkip}
        handleConfirmSkipMonth={handleConfirmSkipMonth}
        scheduleLoanTaxMode={scheduleLoanTaxMode}
        setScheduleLoanTaxMode={setScheduleLoanTaxMode}
        scheduleLoanTaxAmount={scheduleLoanTaxAmount}
        setScheduleLoanTaxAmount={setScheduleLoanTaxAmount}
        scheduleLoanDeductionBasis={scheduleLoanDeductionBasis}
        setScheduleLoanDeductionBasis={setScheduleLoanDeductionBasis}
      />

      <AttendanceStatsModals
        showPresentsModal={showPresentsModal}
        setShowPresentsModal={setShowPresentsModal}
        totalPresentsToday={totalPresentsToday}
        activeCheckedInCount={activeCheckedInCount}
        completedShiftCount={completedShiftCount}
        presentsByDept={presentsByDept}
        showAbsentsModal={showAbsentsModal}
        setShowAbsentsModal={setShowAbsentsModal}
        absentsTodayCount={absentsTodayCount}
        absentsByDept={absentsByDept}
        setSelectedCalendarProfile={setSelectedCalendarProfile}
        setAdminViewYear={setAdminViewYear}
        setAdminViewMonth={setAdminViewMonth}
        calendarYear={calendarYear}
        calendarMonth={calendarMonth}
        handleOpenWhatsApp={handleOpenWhatsApp}
        showLeavesModal={showLeavesModal}
        setShowLeavesModal={setShowLeavesModal}
        activeLeavesToday={activeLeavesToday}
        leavesTodayByDept={leavesTodayByDept}
      />

      <ExportReportModal
        isExportModalOpen={isExportModalOpen}
        setIsExportModalOpen={setIsExportModalOpen}
        profiles={profiles}
        purposeTransfersList={purposeTransfersList}
        exportIncludePurposePayee={exportIncludePurposePayee}
        setExportIncludePurposePayee={setExportIncludePurposePayee}
        exportExcludedIds={exportExcludedIds}
        setExportExcludedIds={setExportExcludedIds}
        exportTarget={exportTarget}
        setExportTarget={setExportTarget}
        exportSelectedDept={exportSelectedDept}
        setExportSelectedDept={setExportSelectedDept}
        sortedDepartmentsList={sortedDepartmentsList}
        exportSelectedEmployeeId={exportSelectedEmployeeId}
        setExportSelectedEmployeeId={setExportSelectedEmployeeId}
        exportEmployeesPerPage={exportEmployeesPerPage}
        setExportEmployeesPerPage={setExportEmployeesPerPage}
        exportPaymentFilter={exportPaymentFilter}
        setExportPaymentFilter={setExportPaymentFilter}
        exportOtMode={exportOtMode}
        setExportOtMode={setExportOtMode}
        exportCols={exportCols}
        setExportCols={setExportCols}
        exportSearchQuery={exportSearchQuery}
        setExportSearchQuery={setExportSearchQuery}
        exportUseLetterhead={exportUseLetterhead}
        setExportUseLetterhead={setExportUseLetterhead}
        customExportFormat={customExportFormat}
        setCustomExportFormat={setCustomExportFormat}
        getEmployeeNetSalary={getEmployeeNetSalary}
        handleExportPrint={handleExportPrint}
      />

      <MiscAdminModals
        showBirthdayEffect={showBirthdayEffect}
        setShowBirthdayEffect={setShowBirthdayEffect}
        whatsAppModalEmployee={whatsAppModalEmployee}
        setWhatsAppModalEmployee={setWhatsAppModalEmployee}
        whatsAppModalPhone={whatsAppModalPhone}
        sendAdminContactNotification={sendAdminContactNotification}
        isAdminChangePasswordModalOpen={isAdminChangePasswordModalOpen}
        setIsAdminChangePasswordModalOpen={setIsAdminChangePasswordModalOpen}
        handleAdminChangePassword={handleAdminChangePassword}
        adminNewPassword={adminNewPassword}
        setAdminNewPassword={setAdminNewPassword}
        adminConfirmPassword={adminConfirmPassword}
        setAdminConfirmPassword={setAdminConfirmPassword}
        adminPasswordChangeLoading={adminPasswordChangeLoading}
        showNotificationsDropdown={showNotificationsDropdown}
        setShowNotificationsDropdown={setShowNotificationsDropdown}
        notificationsList={notificationsList}
        handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        handleMarkNotificationRead={handleMarkNotificationRead}
      />

      {/* Holiday Declare Modal */}
      {isHolidayModalOpen && (
        <div 
          className="custom-overlay" 
          onMouseDown={e => { (e.currentTarget as any)._isBackdrop = (e.target === e.currentTarget); }}
          onClick={e => {
            if (e.target === e.currentTarget && (e.currentTarget as any)._isBackdrop) {
              setIsHolidayModalOpen(false);
            }
          }} 
          style={getModalOverlayStyle(12000)}
        >
          <div 
            className="custom-modal glass-panel animate-scale-up" 
            style={{ maxWidth: '480px', width: '90%', padding: '24px' }} 
            onMouseDown={e => e.stopPropagation()} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Declare Public / Official Holiday</h3>
              <button onClick={() => setIsHolidayModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <form onSubmit={handleDeclareHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Holiday Date *</label>
                <input
                  type="date"
                  required
                  value={selectedHolidayDate}
                  onChange={e => setSelectedHolidayDate(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Holiday Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eid-ul-Fitr, Independence Day"
                  value={holidayTitle}
                  onChange={e => setHolidayTitle(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Description (Optional)</label>
                <textarea
                  placeholder="Additional details or office closure notes..."
                  value={holidayDescription}
                  onChange={e => setHolidayDescription(e.target.value)}
                  style={{ ...styles.input, minHeight: '70px', resize: 'vertical' }}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Holiday Badge Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[
                    { name: 'Blue (Default)', hex: '#3b82f6' },
                    { name: 'Emerald Green', hex: '#10b981' },
                    { name: 'Purple', hex: '#8b5cf6' },
                    { name: 'Amber / Gold', hex: '#f59e0b' },
                    { name: 'Crimson Red', hex: '#ef4444' },
                    { name: 'Rose Pink', hex: '#ec4899' },
                    { name: 'Cyan', hex: '#06b6d4' }
                  ].map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setHolidayColor(c.hex)}
                      title={c.name}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: c.hex,
                        border: holidayColor === c.hex ? '3px solid var(--text-primary)' : '2px solid transparent',
                        cursor: 'pointer',
                        transform: holidayColor === c.hex ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.15s ease',
                        boxShadow: holidayColor === c.hex ? `0 0 8px ${c.hex}` : 'none'
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={holidayColor}
                    onChange={e => setHolidayColor(e.target.value)}
                    style={{ width: '32px', height: '28px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                    title="Custom Color Picker"
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{holidayColor}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsHolidayModalOpen(false)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px' }}>
                  Save & Declare Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
