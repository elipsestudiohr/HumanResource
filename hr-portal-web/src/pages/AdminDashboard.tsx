import React, { useState, useEffect, useRef } from 'react';
import { 
  getProfiles, 
  saveProfile, 
  deleteProfile, 
  getLeaveRequests, 
  updateLeaveRequestStatus,
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
  getComplaints,
  updateComplaintStatus,
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
  updateDeviceSettings
} from '../lib/dbHelper';
import type { ShiftTiming, Complaint, Announcement, Notification, Holiday, DeviceSettings } from '../lib/dbHelper';
import { processAttendanceLogs, isOffSaturday, getLateAfterTimeStr, getGracePeriodForDate, getLocalDateStr, matchPin } from '../utils/attendanceProcessor';
import type { EmployeeProfile, LeaveRequest, RawLog, DailySummary } from '../utils/attendanceProcessor';
import * as XLSX from 'xlsx';
import SearchableDropdown from '../components/SearchableDropdown';
import ConfettiCanvas from '../components/ConfettiCanvas';
import { TodayAttendanceDonutChart, MonthlyBreakdownBarChart } from '../components/AttendanceCharts';
import { supabase } from '../lib/supabase';

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

type TabType = 'overview' | 'employees' | 'attendance' | 'leaves' | 'payroll' | 'timings' | 'complaints' | 'announcements' | 'calendar' | 'device';

export default function AdminDashboard({ user: _user, onLogout, theme, toggleTheme }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [profiles, setProfiles] = useState<EmployeeProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [rawLogs, setRawLogs] = useState<RawLog[]>([]);
  const [selectedCalendarLogs, setSelectedCalendarLogs] = useState<RawLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Complaints, Announcements & Notifications states
  const [complaintsList, setComplaintsList] = useState<Complaint[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
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
  const [nicNo, setNicNo] = useState('');
  const [bankName, setBankName] = useState('Meezan Bank');
  const [bankAccountTitle, setBankAccountTitle] = useState('');
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Bank' | 'Cash'>('Bank');
  const [emergencyContacts, setEmergencyContacts] = useState<{ name: string; phone: string; relation: string; }[]>([]);
  const [timelinePeriods, setTimelinePeriods] = useState<{ heading: string; startDate: string; endDate: string; }[]>([]);
  
  // Emergency contacts inputs
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('Father');

  // Timeline inputs
  const [newPeriodHeading, setNewPeriodHeading] = useState('');
  const [newPeriodStartDate, setNewPeriodStartDate] = useState('');
  const [newPeriodEndDate, setNewPeriodEndDate] = useState('');
  const [newPeriodIsPresent, setNewPeriodIsPresent] = useState(false);

  // Warnings modal state
  const [warningTargetEmployee, setWarningTargetEmployee] = useState<EmployeeProfile | null>(null);
  const [warningText, setWarningText] = useState('');
  const [warningExpiry, setWarningExpiry] = useState('');
  const [warningColor, setWarningColor] = useState('#ff3b57');

  // Leave approval states
  const [selectedLeaveForApproval, setSelectedLeaveForApproval] = useState<LeaveRequest | null>(null);
  const [chosenLeaveTypeForApproval, setChosenLeaveTypeForApproval] = useState<'Casual' | 'Medical' | 'Annual'>('Casual');
  const [leaveBalancesList, setLeaveBalancesList] = useState<any[]>([]);

  // Export Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTarget, setExportTarget] = useState<'all' | 'department' | 'employee'>('all');
  const [exportSelectedDept, setExportSelectedDept] = useState('');
  const [exportSelectedEmployeeId, setExportSelectedEmployeeId] = useState('');
  const [exportPaymentFilter, setExportPaymentFilter] = useState<'all' | 'Bank' | 'Cash'>('all');
  const [exportCols, setExportCols] = useState({
    pin: true,
    name: true,
    dept: true,
    designation: true,
    base_salary: true,
    income_tax: true,
    net_salary: true,
    bank_name: false,
    bank_account_title: false,
    bank_account_no: false
  });
  const [exportUseLetterhead, setExportUseLetterhead] = useState(true);

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
  const [timingDays, setTimingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [graceTargetScopeType, setGraceTargetScopeType] = useState<string>('global');
  const [graceStartDate, setGraceStartDate] = useState<string>('');
  const [graceEndDate, setGraceEndDate] = useState<string>('');

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Date Range for report calculation
  const [startDate, setStartDate] = useState('2026-07-01');
  const [endDate, setEndDate] = useState('2026-07-15');

  // Calendar & Holidays states
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [holidaysList, setHolidaysList] = useState<Holiday[]>([]);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [selectedHolidayDate, setSelectedHolidayDate] = useState('');
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayDescription, setHolidayDescription] = useState('');

  // DOB field for employee form
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showBirthdayEffect, setShowBirthdayEffect] = useState(false);
  const [showAdminSalariesMap, setShowAdminSalariesMap] = useState<Record<string, boolean>>({});
  const [showAdminPasswords, setShowAdminPasswords] = useState<Record<string, boolean>>({});
  const [selectedCalendarProfile, setSelectedCalendarProfile] = useState<EmployeeProfile | null>(null);
  const [adminViewYear, setAdminViewYear] = useState(new Date().getFullYear());
  const [adminViewMonth, setAdminViewMonth] = useState(new Date().getMonth());
  const [adminEmpYear, setAdminEmpYear] = useState(new Date().getFullYear());
  const [adminEmpMonth, setAdminEmpMonth] = useState(new Date().getMonth());
  const [graceTimeMinsSetting, setGraceTimeMinsSetting] = useState<number>(() => parseInt(localStorage.getItem('office_grace_time_mins') || '20', 10));
  const [monthlyGraceSettings, setMonthlyGraceSettings] = useState<Record<string, number>>({});
  const [graceTargetMonth, setGraceTargetMonth] = useState<string>('global');
  const [showPresentsModal, setShowPresentsModal] = useState(false);
  const [showAbsentsModal, setShowAbsentsModal] = useState(false);
  const netSalaryCacheRef = useRef<Record<string, number>>({});

  // Edit attendance correction states
  const [editingCorrectionComplaint, setEditingCorrectionComplaint] = useState<Complaint | null>(null);
  const [editCorrectionDate, setEditCorrectionDate] = useState('');
  const [editCorrectionCheckIn, setEditCorrectionCheckIn] = useState('');
  const [editCorrectionCheckOut, setEditCorrectionCheckOut] = useState('');

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
    sync_interval: 30,
    status: 'Offline',
    last_connection_state: 'Unknown'
  });
  const [editDeviceIp, setEditDeviceIp] = useState('192.168.1.201');
  const [editDevicePort, setEditDevicePort] = useState(4370);
  const [editDeviceInterval, setEditDeviceInterval] = useState(30);

  useEffect(() => {
    fetchData(true);
  }, []);

  useEffect(() => {
    if (baseSalary) {
      const salaryVal = parseFloat(baseSalary);
      if (!isNaN(salaryVal) && salaryVal > 0) {
        // 24 working days shift, 9 hours shift per day = 216 hours per month
        setHourlyRate((salaryVal / 216).toFixed(2));
      } else {
        setHourlyRate('');
      }
    } else {
      setHourlyRate('');
    }
  }, [baseSalary]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddEmployeeModalOpen || isEditingProfile !== null) {
          handleCloseFormModal();
        } else if (isHolidayModalOpen) {
          setIsHolidayModalOpen(false);
          setHolidayTitle('');
          setHolidayDescription('');
        } else if (isExportModalOpen) {
          setIsExportModalOpen(false);
        } else if (isAdminChangePasswordModalOpen) {
          setIsAdminChangePasswordModalOpen(false);
          setAdminNewPassword('');
          setAdminConfirmPassword('');
        } else if (warningTargetEmployee) {
          setWarningTargetEmployee(null);
          setWarningText('');
          setWarningExpiry('');
        } else if (selectedLeaveForApproval) {
          setSelectedLeaveForApproval(null);
        } else if (editingLeaveBalanceEmp) {
          setEditingLeaveBalanceEmp(null);
        } else if (viewingProfileDetails) {
          setViewingProfileDetails(null);
          setShowDetailsPassword(false);
        } else if (editingCorrectionComplaint) {
          setEditingCorrectionComplaint(null);
        }
      } else if (e.key === 'Enter') {
        if (document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }
        if (isAddEmployeeModalOpen || isEditingProfile !== null) {
          e.preventDefault();
          handleSaveProfile(new Event('submit') as any);
        } else if (isHolidayModalOpen) {
          e.preventDefault();
          handleDeclareHoliday(new Event('submit') as any);
        } else if (isExportModalOpen) {
          e.preventDefault();
          handleExportPrint();
        } else if (isAdminChangePasswordModalOpen) {
          e.preventDefault();
          handleAdminChangePassword(new Event('submit') as any);
        } else if (warningTargetEmployee) {
          e.preventDefault();
          handleSaveWarning(new Event('submit') as any);
        } else if (selectedLeaveForApproval) {
          e.preventDefault();
          handleApproveLeaveWithDetails();
        } else if (editingLeaveBalanceEmp) {
          e.preventDefault();
          handleSaveLeaveBalanceAdjustment(new Event('submit') as any);
        } else if (editingCorrectionComplaint) {
          e.preventDefault();
          handleSaveAndApproveCorrection(new Event('submit') as any);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isAddEmployeeModalOpen, isEditingProfile, isHolidayModalOpen, isExportModalOpen, isAdminChangePasswordModalOpen,
    warningTargetEmployee, selectedLeaveForApproval, editingLeaveBalanceEmp, viewingProfileDetails, editingCorrectionComplaint,
    fullName, pin, baseSalary, hourlyRate, employeeEmail, employeePassword, dateOfBirth, incomeTax, nicNo, bankName, bankAccountTitle, bankAccountNo, emergencyContacts, timelinePeriods,
    holidayTitle, selectedHolidayDate, holidayDescription,
    adminNewPassword, adminConfirmPassword,
    warningText, warningExpiry, warningColor,
    adjCasualTotal, adjCasualUsed, adjMedicalTotal, adjMedicalUsed, adjAnnualTotal, adjAnnualUsed,
    chosenLeaveTypeForApproval,
    editCorrectionDate, editCorrectionCheckIn, editCorrectionCheckOut
  ]);

  const fetchData = async (silent = false) => {
    if (silent) {
      setLoading(true);
    } else {
      window.showLoading('is in the process');
    }
    try {
      const p = await getProfiles();
      setProfiles(p);

      const currentAdmin = p.find(prof => prof.id === _user.id);
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

      // Fetch announcements (table may not exist yet)
      try {
        const announcements = await getAnnouncements();
        setAnnouncementsList(announcements);
      } catch (e) { /* console removed */ }

      // Fetch notifications (table may not exist yet)
      try {
        const notifications = await getNotifications(_user.id, false);
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

      // Fetch device settings
      try {
        const settings = await getDeviceSettings();
        setDeviceSettings(settings);
        setEditDeviceIp(settings.ip_address);
        setEditDevicePort(settings.port);
        setEditDeviceInterval(settings.sync_interval);
        if (settings.grace_time_mins) setGraceTimeMinsSetting(settings.grace_time_mins);
        if (settings.monthly_grace_settings) setMonthlyGraceSettings(settings.monthly_grace_settings);
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
      if (lr.status === 'Rejected') return false;
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
      const timing = getEmployeeShiftTiming(emp);
      
      const processed = processAttendanceLogs(
        emp,
        rawLogs,
        empLeaves,
        dateStr,
        dateStr,
        holidayDates,
        graceTimeMinsSetting,
        timing.startTime,
        timing.endTime
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
      if (lr.status === 'Rejected') return false;
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
        sync_interval: editDeviceInterval
      });
      const settings = await getDeviceSettings();
      setDeviceSettings(settings);
      window.customAlert('Device settings updated successfully!');
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to update device settings.');
    } finally {
      window.hideLoading();
    }
  };

  // Helper to format currency (Pakistani Rupee formatting)
  const formatSalary = (amount: number) => {
    return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)}`;
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
        if (announceTargetType === 'all') {
          await createNotification({
            user_id: null,
            title: 'New Announcement',
            message: `${announceTitle.trim()}: ${announceMessage.trim().substring(0, 60)}${announceMessage.trim().length > 60 ? '...' : ''}`
          });
        } else if (announceTargetType === 'employee') {
          await createNotification({
            user_id: announceTargetValue,
            title: 'New Announcement',
            message: `${announceTitle.trim()}: ${announceMessage.trim().substring(0, 60)}${announceMessage.trim().length > 60 ? '...' : ''}`
          });
        } else if (announceTargetType === 'department') {
          const targetedEmployees = profiles.filter(p => p.department === announceTargetValue && p.role !== 'admin');
          for (const emp of targetedEmployees) {
            await createNotification({
              user_id: emp.id,
              title: 'New Announcement',
              message: `${announceTitle.trim()}: ${announceMessage.trim().substring(0, 60)}${announceMessage.trim().length > 60 ? '...' : ''}`
            });
          }
        } else if (announceTargetType === 'designation') {
          const targetedEmployees = profiles.filter(p => p.designation === announceTargetValue && p.role !== 'admin');
          for (const emp of targetedEmployees) {
            await createNotification({
              user_id: emp.id,
              title: 'New Announcement',
              message: `${announceTitle.trim()}: ${announceMessage.trim().substring(0, 60)}${announceMessage.trim().length > 60 ? '...' : ''}`
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

  const handleUpdateComplaintStatus = async (id: number, status: 'Open' | 'In Progress' | 'Resolved') => {
    window.showLoading('Updating complaint status...');
    try {
      await updateComplaintStatus(id, status);
      
      const comp = complaintsList.find(c => c.id === id);
      if (comp) {
        try {
          await createNotification({
            user_id: comp.employee_id,
            title: 'Helpdesk Update',
            message: `Your complaint "${comp.title}" has been marked as ${status}.`
          });
        } catch (e) {
          /* console removed */
        }
      }

      const complaints = await getComplaints();
      setComplaintsList(complaints);
      window.customAlert(`Complaint marked as "${status}" successfully.`);
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to update complaint status.');
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

      // Create raw attendance log entries
      const logs: RawLog[] = [];
      if (safeCheckIn) {
        logs.push({
          employee_pin: emp.pin,
          timestamp: new Date(`${date}T${safeCheckIn}:00`).toISOString(),
          verify_type: 1,
          status_type: 0
        });
      }
      if (safeCheckOut) {
        logs.push({
          employee_pin: emp.pin,
          timestamp: new Date(`${date}T${safeCheckOut}:00`).toISOString(),
          verify_type: 1,
          status_type: 1
        });
      }

      // Delete any existing raw logs for this employee on the requested date to prevent duplicate/overlapping session issues
      const startOfDay = new Date(`${date}T00:00:00`).toISOString();
      const endOfDay = new Date(`${date}T23:59:59`).toISOString();
      await supabase
        .from('raw_attendance_logs')
        .delete()
        .eq('employee_pin', emp.pin)
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay);

      if (logs.length > 0) {
        await uploadRawLogs(logs);
      }

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

      window.customAlert(`Correction approved! ${logs.length} log entry(s) added.`);
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

      // Create raw attendance log entries
      const logs: RawLog[] = [];
      if (safeCheckIn) {
        logs.push({
          employee_pin: emp.pin,
          timestamp: new Date(`${editCorrectionDate}T${safeCheckIn}:00`).toISOString(),
          verify_type: 1,
          status_type: 0
        });
      }
      if (safeCheckOut) {
        logs.push({
          employee_pin: emp.pin,
          timestamp: new Date(`${editCorrectionDate}T${safeCheckOut}:00`).toISOString(),
          verify_type: 1,
          status_type: 1
        });
      }

      // Delete any existing raw logs for this employee on the requested date to prevent duplicate/overlapping session issues
      const startOfDay = new Date(`${editCorrectionDate}T00:00:00`).toISOString();
      const endOfDay = new Date(`${editCorrectionDate}T23:59:59`).toISOString();
      await supabase
        .from('raw_attendance_logs')
        .delete()
        .eq('employee_pin', emp.pin)
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay);

      if (logs.length > 0) {
        await uploadRawLogs(logs);
      }

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

      setEditingCorrectionComplaint(null);
      window.customAlert(`Correction approved! ${logs.length} log entry(s) added.`);
    } catch (err) {
      window.customAlert('Failed to approve correction. Invalid time format.');
    } finally {
      window.hideLoading();
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead(_user.id);
      const notifications = await getNotifications(_user.id, false);
      setNotificationsList(notifications);
    } catch (err) {
      /* console removed */
    }
  };

  const handleMarkNotificationRead = async (id: number, notification?: Notification) => {
    try {
      await markNotificationRead(id);
      const notifications = await getNotifications(_user.id, false);
      setNotificationsList(notifications);
      
      // Redirect to relevant tab based on notification title
      if (notification) {
        setShowNotificationsDropdown(false);
        const title = notification.title.toLowerCase();
        if (title.includes('leave')) {
          setActiveTab('leaves');
        } else if (title.includes('complaint') || title.includes('helpdesk')) {
          setActiveTab('complaints');
        } else if (title.includes('announce')) {
          setActiveTab('announcements');
        } else if (title.includes('holiday')) {
          setActiveTab('calendar');
        } else if (title.includes('birthday')) {
          setActiveTab('calendar');
        } else if (title.includes('attendance')) {
          setActiveTab('attendance');
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

  const formatTo12h = (time24: string): string => {
    if (!time24) return '';
    const parts = time24.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1] || '00';
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = hours < 10 ? '0' + hours : hours.toString();
    return `${strHours}:${minutes} ${ampm}`;
  };

  // Handle Profile Creation or Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

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
        hourly_rate: parseFloat(hourlyRate),
        role: 'employee',
        is_active: true,
        date_of_birth: dateOfBirth || undefined,
        income_tax: parseFloat(incomeTax) || 0,
        nic_no: nicNo.trim() || undefined,
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
      /* console removed */
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.customAlert('Please allow popups to export the PDF.');
      return;
    }

    let targetProfiles = profiles.filter(p => p.role !== 'admin');
    let targetLabel = 'All Employees';

    if (exportTarget === 'department') {
      if (!exportSelectedDept) {
        window.customAlert('Please select a department.');
        printWindow.close();
        return;
      }
      targetProfiles = targetProfiles.filter(p => p.department === exportSelectedDept);
      targetLabel = `${exportSelectedDept} Department`;
    } else if (exportTarget === 'employee') {
      if (!exportSelectedEmployeeId) {
        window.customAlert('Please select an employee.');
        printWindow.close();
        return;
      }
      targetProfiles = targetProfiles.filter(p => p.id === exportSelectedEmployeeId);
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
      printWindow.close();
      return;
    }

    const title = exportTarget === 'employee' ? `Salary Certificate - ${targetLabel}` : `Disbursement Advice - ${targetLabel}`;

    let mainContentHtml = '';

    if (exportTarget === 'employee') {
      const emp = targetProfiles[0];
      const netSalary = emp.base_salary - (emp.income_tax || 0);
      const isCash = (emp as any).payment_method === 'Cash' || emp.bank_name === 'Cash' || !emp.bank_name || !emp.bank_account_no;
      mainContentHtml = `
        <div class="page-container">
          <div class="letterhead-bg"></div>
          <div class="letter-content">
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
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; text-align: right; font-weight: 600;">Rs. ${emp.base_salary.toLocaleString()}</td>
              </tr>` : ''}
              ${exportCols.income_tax ? `
              <tr>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 600; background-color: #f9fafb; color: #ef4444;">Income Tax</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; text-align: right; color: #ef4444; font-weight: 600;">Rs. ${(emp.income_tax || 0).toLocaleString()}</td>
              </tr>` : ''}
              ${exportCols.net_salary ? `
              <tr style="background-color: #f3f4f6;">
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; font-weight: 700; color: #10b981;">Net Payable Salary</td>
                <td style="border: 1px solid #e5e7eb; padding: 12px 16px; text-align: right; font-weight: 700; color: #10b981; font-size: 1.05rem;">Rs. ${netSalary.toLocaleString()}</td>
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
      const CHUNK_SIZE = 12;
      const pagesHtml: string[] = [];
      for (let i = 0; i < targetProfiles.length; i += CHUNK_SIZE) {
        const chunk = targetProfiles.slice(i, i + CHUNK_SIZE);
        let rowsHtml = '';
        chunk.forEach(p => {
          const netSalary = p.base_salary - (p.income_tax || 0);
          const isCash = (p as any).payment_method === 'Cash' || p.bank_name === 'Cash' || !p.bank_name || !p.bank_account_no;
          rowsHtml += `
            <tr>
              ${exportCols.pin ? `<td style="font-family: monospace;">${p.pin}</td>` : ''}
              ${exportCols.name ? `<td><strong>${p.full_name}</strong></td>` : ''}
              ${exportCols.dept ? `<td>${p.department || '-'}</td>` : ''}
              ${exportCols.designation ? `<td>${p.designation || '-'}</td>` : ''}
              ${exportCols.bank_name ? `<td>${isCash ? 'Cash' : (p.bank_name || '-')}</td>` : ''}
              ${exportCols.bank_account_title ? `<td>${isCash ? 'Cash Payment' : (p.bank_account_title || '-')}</td>` : ''}
              ${exportCols.bank_account_no ? `<td style="font-family: monospace;">${isCash ? 'Cash Payment' : (p.bank_account_no || '-')}</td>` : ''}
              ${exportCols.base_salary ? `<td style="text-align: right;">Rs. ${p.base_salary.toLocaleString()}</td>` : ''}
              ${exportCols.income_tax ? `<td style="text-align: right; color: #ef4444;">Rs. ${(p.income_tax || 0).toLocaleString()}</td>` : ''}
              ${exportCols.net_salary ? `<td style="text-align: right; font-weight: 700; color: #10b981;">Rs. ${netSalary.toLocaleString()}</td>` : ''}
            </tr>
          `;
        });

        pagesHtml.push(`
          <div class="page-container">
            <div class="letterhead-bg"></div>
            <div class="letter-content">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr>
                    ${exportCols.pin ? `<th style="text-align: left;">PIN</th>` : ''}
                    ${exportCols.name ? `<th style="text-align: left;">Name</th>` : ''}
                    ${exportCols.dept ? `<th style="text-align: left;">Department</th>` : ''}
                    ${exportCols.designation ? `<th style="text-align: left;">Designation</th>` : ''}
                    ${exportCols.bank_name ? `<th style="text-align: left;">Bank Name</th>` : ''}
                    ${exportCols.bank_account_title ? `<th style="text-align: left;">Account Title</th>` : ''}
                    ${exportCols.bank_account_no ? `<th style="text-align: left;">Account No</th>` : ''}
                    ${exportCols.base_salary ? `<th style="text-align: right;">Base Salary</th>` : ''}
                    ${exportCols.income_tax ? `<th style="text-align: right;">Income Tax</th>` : ''}
                    ${exportCols.net_salary ? `<th style="text-align: right;">Net Salary</th>` : ''}
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
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
              padding: 240px 60px 180px 60px !important;
              margin-top: 0 !important;
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
              padding: 240px 60px 180px 60px;
              margin-top: 0 !important;
            }
          }
          ` : `
          @page {
            margin: 40px;
          }
          .letter-content {
            padding: 20px;
            margin-top: 0 !important;
          }
          `}
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 12px 10px;
            border-bottom: 2px solid #e5e7eb;
            text-align: left;
          }
          td {
            padding: 12px 10px;
            font-size: 0.9rem;
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
    
    return matchDept && matchDesig && matchSearch && p.role !== 'admin';
  });

  const handleEditProfileClick = (p: EmployeeProfile) => {
    setIsEditingProfile(p.id);
    setFullName(p.full_name);
    setPin(p.pin);
    setDesignation(p.designation || '');
    setDepartment(p.department || '');
    setJoiningDate(p.joining_date);
    setBaseSalary(p.base_salary.toString());
    setHourlyRate(p.hourly_rate.toString());
    setEmployeeEmail(p.email || '');
    setEmployeePassword(p.password || ''); // Pre-fill with the plaintext password!
    setDateOfBirth(p.date_of_birth || '');
    setIncomeTax(p.income_tax ? p.income_tax.toString() : '');
    setNicNo((p as any).nic_no || '');
    setBankName(p.bank_name || 'Meezan Bank');
    setBankAccountTitle(p.bank_account_title || '');
    setBankAccountNo(p.bank_account_no || '');
    setPaymentMethod((p as any).payment_method || 'Bank');
    setEmergencyContacts((p as any).emergency_contacts || []);
    setTimelinePeriods((p as any).timeline_periods || []);
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
    setTimingTargetType(rule.target_type);
    setTimingTargetId(rule.target_id);
    setTimingStartTime(rule.start_time.substring(0, 5));
    setTimingEndTime(rule.end_time.substring(0, 5));
    setTimingGraceMins(rule.grace_mins || 20);
    setTimingDays(rule.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
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

    window.showLoading(editingTimingRule ? 'Updating shift timings...' : 'Saving shift timings...');
    try {
      const payload: any = {
        target_type: timingTargetType,
        target_id: timingTargetId,
        target_name: targetName,
        start_time: timingStartTime + ':00',
        end_time: timingEndTime + ':00',
        days: timingDays
      };
      if (timingGraceMins !== undefined) {
        payload.grace_mins = timingGraceMins;
      }

      if (editingTimingRule?.id) {
        let { error } = await supabase
          .from('shift_timings')
          .update(payload)
          .eq('id', editingTimingRule.id);

        if (error && error.message && error.message.includes('grace_mins')) {
          delete payload.grace_mins;
          const retry = await supabase
            .from('shift_timings')
            .update(payload)
            .eq('id', editingTimingRule.id);
          error = retry.error;
        }

        if (error) throw error;
      } else {
        try {
          await saveShiftTiming(payload);
        } catch (err: any) {
          if (err && err.message && err.message.includes('grace_mins')) {
            delete payload.grace_mins;
            await saveShiftTiming(payload);
          } else {
            throw err;
          }
        }
      }

      setIsAddTimingModalOpen(false);
      setEditingTimingRule(null);
      setTimingTargetId('');
      setTimingStartTime('09:00');
      setTimingEndTime('18:00');
      setTimingGraceMins(20);
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

              if (pinIdx === -1 || dateIdx === -1) {
                throw new Error('Required columns ("No." and "Date/Time") not found.');
              }

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
                  fileLogs.push({
                    employee_pin,
                    timestamp: timestamp.toISOString(),
                    verify_type: isNaN(verifyCodeVal) ? 1 : verifyCodeVal,
                    status_type: 0
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

                if (pinIdx === -1 || dateIdx === -1) {
                  throw new Error('Required columns ("No." and "Date/Time") not found.');
                }

                for (let i = 1; i < lines.length; i++) {
                  const fields = lines[i].split(delimiter).map(f => f.trim().replace(/^["']|["']$/g, ''));
                  if (fields.length > Math.max(pinIdx, dateIdx)) {
                    const employee_pin = fields[pinIdx];
                    const dateTimeStr = fields[dateIdx];
                    const timestamp = new Date(dateTimeStr.trim());
                    
                    if (!isNaN(timestamp.getTime()) && employee_pin) {
                      const verifyCodeVal = verifyIdx !== -1 ? parseInt(fields[verifyIdx] || '1', 10) : 1;
                      fileLogs.push({
                        employee_pin,
                        timestamp: timestamp.toISOString(),
                        verify_type: isNaN(verifyCodeVal) ? 1 : verifyCodeVal,
                        status_type: 0
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

  // Approve/Reject leaves
  const handleLeaveStatusChange = async (id: number, status: 'Approved' | 'Rejected') => {
    const req = leaveRequests.find(r => r.id === id);
    if (status === 'Approved' && req) {
      setSelectedLeaveForApproval(req);
      setChosenLeaveTypeForApproval('Casual');
      return;
    }

    window.showLoading(`Setting leave request to ${status.toLowerCase()}...`);
    try {
      await updateLeaveRequestStatus(id, status);
      
      if (req) {
        try {
          await createNotification({
            user_id: req.employee_id,
            title: `Leave Request ${status}`,
            message: `Your leave request (${req.start_date} to ${req.end_date}) has been ${status.toLowerCase()}.`
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
    window.showLoading('Approving leave and updating balances...');
    try {
      await updateLeaveRequestStatus(req.id, 'Approved', chosenLeaveTypeForApproval);
      try {
        await createNotification({
          user_id: req.employee_id,
          title: 'Leave Request Approved',
          message: `Your leave request (${req.start_date} to ${req.end_date}) was approved as ${chosenLeaveTypeForApproval} Leave.`
        });
      } catch (e) { /* ignore */ }
      
      setSelectedLeaveForApproval(null);
      fetchData();
      window.customAlert('Leave request approved and balance deducted successfully!');
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
          title: 'Disciplinary Warning Notice',
          message: `A warning has been issued: "${warningText.trim()}" active until ${new Date(warningExpiry + 'T00:00:00').toLocaleDateString()}.`
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
      fetchData();
      window.customAlert('Warning cleared successfully!');
    } catch (err) {
      window.customAlert('Failed to clear warning.');
    } finally {
      window.hideLoading();
    }
  };

  const getEmployeeShiftTiming = (emp: EmployeeProfile): { startTime: string; endTime: string; graceMins?: number } => {
    const empRule = shiftTimings.find(t => t.target_type === 'employee' && t.target_id === emp.id);
    if (empRule) return { startTime: empRule.start_time, endTime: empRule.end_time, graceMins: empRule.grace_mins };
    
    if (emp.designation) {
      const desigRule = shiftTimings.find(t => t.target_type === 'designation' && t.target_id === emp.designation);
      if (desigRule) return { startTime: desigRule.start_time, endTime: desigRule.end_time, graceMins: desigRule.grace_mins };
    }
    
    if (emp.department) {
      const deptRule = shiftTimings.find(t => t.target_type === 'department' && t.target_id === emp.department);
      if (deptRule) return { startTime: deptRule.start_time, endTime: deptRule.end_time, graceMins: deptRule.grace_mins };
    }
    
    return { startTime: '11:00', endTime: '20:00', graceMins: undefined };
  };

  // Compile monthly payroll report calculations
  const calculatePayrollSummary = () => {
    return profiles.map(profile => {
      const timing = getEmployeeShiftTiming(profile);
      const processed = processAttendanceLogs(
        profile,
        rawLogs,
        leaveRequests,
        startDate,
        endDate,
        holidaysList.map(h => h.date),
        graceTimeMinsSetting,
        timing.startTime,
        timing.endTime
      );

      const totalWorkedHours = processed.reduce((sum, s) => sum + s.workingHours, 0);
      const totalOvertimeHours = processed.reduce((sum, s) => sum + s.overtimeHours, 0);
      const totalOvertimePayout = processed.reduce((sum, s) => sum + s.overtimePayout, 0);
      const lateArrivals = processed.filter(s => s.isLate).length;
      const totalLateMinutes = processed.reduce((sum, s) => sum + s.lateMinutes, 0);
      const totalLateDeduction = processed.reduce((sum, s) => sum + s.lateDeduction, 0);
      const absences = processed.filter(s => s.isAbsent).length;
      const totalAbsenceDeduction = processed.reduce((sum, s) => sum + s.absenceDeduction, 0);
      const leavesTaken = processed.filter(s => s.status.startsWith('Leave')).length;

      // Net salary = baseSalary + Overtime payout - Late deduction - Absence deduction
      const netPayable = profile.base_salary + totalOvertimePayout - totalLateDeduction - totalAbsenceDeduction;

      return {
        id: profile.id,
        pin: profile.pin,
        name: profile.full_name,
        department: profile.department || 'N/A',
        baseSalary: profile.base_salary,
        hourlyRate: profile.hourly_rate,
        perMinRate: parseFloat((profile.hourly_rate / 60).toFixed(4)),
        totalWorkedHours,
        totalOvertimeHours,
        totalOvertimePayout,
        lateArrivals,
        totalLateMinutes,
        totalLateDeduction,
        absences,
        totalAbsenceDeduction,
        leavesTaken,
        totalPayable: Math.max(0, parseFloat(netPayable.toFixed(2)))
      };
    });
  };

  const payrollSummary = calculatePayrollSummary();

  // Export Summary to CSV
  const exportToCSV = () => {
    const headers = [
      'Pin', 'Name', 'Department', 'Base Salary', 'Hourly Rate', 'Per Min Rate',
      'Hours Worked', 'Overtime Hours', 'Overtime Payout', 
      'Late Arrivals', 'Late Minutes', 'Late Deductions',
      'Absences', 'Absence Deductions', 'Leaves Taken', 'Net Payable'
    ];
    
    const rows = payrollSummary.map(row => [
      row.pin,
      row.name,
      row.department,
      row.baseSalary,
      row.hourlyRate.toFixed(2),
      row.perMinRate.toFixed(4),
      row.totalWorkedHours.toFixed(1),
      row.totalOvertimeHours.toFixed(1),
      row.totalOvertimePayout.toFixed(0),
      row.lateArrivals,
      row.totalLateMinutes,
      row.totalLateDeduction.toFixed(0),
      row.absences,
      row.totalAbsenceDeduction.toFixed(0),
      row.leavesTaken,
      row.totalPayable.toFixed(0)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Elipse_HR_Payroll_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getEmployeeCalendarSummaryForMonth = (emp: EmployeeProfile, year: number, month: number) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    const startStr = `${year}-${pad(month + 1)}-01`;
    const endStr = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
    
    const holidayDates = holidaysList.map(h => h.date);
    const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === emp.id);
    const timing = getEmployeeShiftTiming(emp);
    const effectiveGrace = timing.graceMins ?? graceTimeMinsSetting;
    
    const targetLogs = (selectedCalendarProfile && emp.id === selectedCalendarProfile.id && selectedCalendarLogs.length > 0)
      ? selectedCalendarLogs
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
      timing.endTime
    );
  };

  const getEmployeeCalendarData = () => {
    if (!selectedCalendarProfile) return [];
    return getEmployeeCalendarSummaryForMonth(selectedCalendarProfile, adminViewYear, adminViewMonth);
  };

  const getEmployeeNetSalary = (emp: EmployeeProfile) => {
    const cacheKey = `${emp.id}-${adminEmpYear}-${adminEmpMonth}`;
    const cache = netSalaryCacheRef.current;
    if (cache[cacheKey] !== undefined) return cache[cacheKey];
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    const lastDay = new Date(adminEmpYear, adminEmpMonth + 1, 0).getDate();
    const startStr = `${adminEmpYear}-${pad(adminEmpMonth + 1)}-01`;
    const endStr = `${adminEmpYear}-${pad(adminEmpMonth + 1)}-${pad(lastDay)}`;
    
    const holidayDates = holidaysList.map(h => h.date);
    const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === emp.id);
    const timing = getEmployeeShiftTiming(emp);
    
    const processed = processAttendanceLogs(
      emp, rawLogs, employeeLeaves, startStr, endStr,
      holidayDates, graceTimeMinsSetting, timing.startTime, timing.endTime
    );
    
    const totalOvertimePayout = processed.reduce((sum, s) => sum + s.overtimePayout, 0);
    const totalLateDeduction = processed.reduce((sum, s) => sum + s.lateDeduction, 0);
    const totalAbsenceDeduction = processed.reduce((sum, s) => sum + s.absenceDeduction, 0);
    const net = emp.base_salary + totalOvertimePayout - totalLateDeduction - totalAbsenceDeduction - (emp.income_tax || 0);
    const result = Math.max(0, parseFloat(net.toFixed(2)));
    cache[cacheKey] = result;
    return result;
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

  const holidayDates = holidaysList.map(h => h.date);

  profiles.forEach(emp => {
    const dept = emp.department || 'Administration';
    const timing = getEmployeeShiftTiming(emp);
    const shiftTimingStr = `${timing.startTime} - ${timing.endTime}`;
    const empLeaves = leaveRequests.filter(lr => lr.employee_id === emp.id);

    // Get exact same calendar summary for the employee for TODAY's actual month & year
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const monthProcessed = getEmployeeCalendarSummaryForMonth(emp, todayYear, todayMonth);
    const todaySummary = monthProcessed.find(s => s.date === todayStr);

    // Combine all available log sources to ensure zero punches are missed
    const allMatchingTodayLogs = [...rawLogs, ...selectedCalendarLogs].filter(l => {
      const isPinMatch = matchPin(l.employee_pin, emp.pin) || matchPin(l.employee_pin, emp.id) || String(l.employee_pin).trim() === String(emp.pin).trim() || String(l.employee_pin).trim() === String(emp.id).trim();
      const logDateStr = getLocalDateStr(l.timestamp);
      return isPinMatch && (logDateStr === todayStr || String(l.timestamp).includes(todayStr));
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const hasPunchToday = Boolean(todaySummary?.checkIn) || (todaySummary?.status === 'Present') || (todaySummary?.isLate) || allMatchingTodayLogs.length > 0;
    const isLeave = todaySummary?.status?.startsWith('Leave');
    const isHoliday = todaySummary?.status === 'Holiday';

    if (hasPunchToday) {
      const firstPunch = allMatchingTodayLogs[0];
      const lastPunch = allMatchingTodayLogs[allMatchingTodayLogs.length - 1];
      const checkInTime = todaySummary?.checkIn || (firstPunch ? new Date(firstPunch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Checked In');
      const timeDiffMins = (firstPunch && lastPunch) ? (new Date(lastPunch.timestamp).getTime() - new Date(firstPunch.timestamp).getTime()) / (1000 * 60) : 0;
      const checkOutTime = todaySummary?.checkOut || (allMatchingTodayLogs.length > 1 && timeDiffMins >= 2 ? new Date(lastPunch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : null);

      const status: 'Active' | 'Completed' = checkOutTime ? 'Completed' : 'Active';
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
      const monthProcessed = processAttendanceLogs(emp, rawLogs, empLeaves, startOfMonthStr, lastDayStr, holidayDates, monthlyGraceSettings || graceTimeMinsSetting, timing.startTime, timing.endTime);

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
  const lateAfterTimeStr = getLateAfterTimeStr(activeGraceMins, '11:00');

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
    <div style={styles.page}>
      {/* Top Navbar */}
      <nav style={styles.navbar} className="glass-panel">
        <div style={styles.navBrand}>
          <img 
            src="/icons/logo.png" 
            alt="logo" 
            className="logo-icon" 
            style={{ width: '65px', height: 'auto', objectFit: 'contain', marginRight: '6px' }} 
          />
          <span style={styles.navTitle}>ELIPSE HR</span>
          <span style={styles.badge}>HR / Admin Portal</span>
        </div>
        <div style={styles.navUser}>
          <span style={styles.navUsername}>{adminName} (HR)</span>

          {/* Notifications Bell Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)} 
              className="btn btn-secondary" 
              style={{ padding: '6px 10px', position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              title="Notifications"
            >
              <img 
                src={notificationsList.filter(n => !n.is_read).length > 0 ? '/icons/bell.png' : '/icons/check-circle bell.png'} 
                alt="notifications" 
                className="theme-icon" 
                style={{ width: '16px', height: '16px', display: 'block' }} 
              />
              {notificationsList.filter(n => !n.is_read).length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'var(--danger)',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--danger-glow)'
                }}>
                  {notificationsList.filter(n => !n.is_read).length}
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

          <button onClick={onLogout} style={styles.logoutBtn} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </nav>

      {/* Tabs Selection */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
        <div style={styles.tabsRow}>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'overview' ? '3px solid var(--primary)' : 'none', color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('calendar')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'calendar' ? '3px solid var(--primary)' : 'none', color: activeTab === 'calendar' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Calendar
          </button>
          <button 
            onClick={() => setActiveTab('employees')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'employees' ? '3px solid var(--primary)' : 'none', color: activeTab === 'employees' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Employees
          </button>
          <button 
            onClick={() => setActiveTab('attendance')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'attendance' ? '3px solid var(--primary)' : 'none', color: activeTab === 'attendance' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Attendance logs
          </button>
          <button 
            onClick={() => setActiveTab('leaves')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'leaves' ? '3px solid var(--primary)' : 'none', color: activeTab === 'leaves' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Leave approvals
          </button>
          <button 
            onClick={() => setActiveTab('payroll')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'payroll' ? '3px solid var(--primary)' : 'none', color: activeTab === 'payroll' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Overtime & Salary
          </button>
          <button 
            onClick={() => setActiveTab('timings')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'timings' ? '3px solid var(--primary)' : 'none', color: activeTab === 'timings' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Time Manager
          </button>
          <button 
            onClick={() => setActiveTab('complaints')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'complaints' ? '3px solid var(--primary)' : 'none', color: activeTab === 'complaints' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Helpdesk Complaints
          </button>
          <button 
            onClick={() => setActiveTab('announcements')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'announcements' ? '3px solid var(--primary)' : 'none', color: activeTab === 'announcements' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Announcements
          </button>
          <button 
            onClick={() => setActiveTab('device')} 
            style={{...styles.tabBtn, borderBottom: activeTab === 'device' ? '3px solid var(--primary)' : 'none', color: activeTab === 'device' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Device settings
          </button>
        </div>
        <button onClick={() => fetchData()} title="Refresh from database" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ⟳ Refresh
        </button>
      </div>

      {/* TAB CONTENTS */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div style={styles.overviewContainer} className="animate-fade-in">
          {/* Dashboard Metric Cards */}
          <div style={styles.metricCards}>
            <div className="glass-panel" style={{ ...styles.metricCard, cursor: 'pointer' }} onClick={() => setActiveTab('employees')} title="Click to open Employees Panel">
              <img 
                src="/icons/users.png" 
                alt="employees" 
                className="theme-icon" 
                style={{ width: '32px', height: '32px' }} 
              />
              <div>
                <h2>{totalEmployees}</h2>
                <span>Total Employees</span>
              </div>
            </div>

            <div className="glass-panel" style={{ ...styles.metricCard, cursor: 'pointer' }} onClick={() => setShowPresentsModal(true)} title="Click to view Presents by Department">
              <img 
                src="/icons/calendar.png" 
                alt="attendance" 
                className="theme-icon" 
                style={{ width: '32px', height: '32px' }} 
              />
              <div>
                <h2>{totalPresentsToday}</h2>
                <span style={{ fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>Presents Today</span>
                <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>
                  {activeCheckedInCount} Active | {completedShiftCount} Completed
                </span>
              </div>
            </div>

            <div className="glass-panel" style={{ ...styles.metricCard, cursor: 'pointer' }} onClick={() => setActiveTab('leaves')} title="Click to open Leave Approval Panel">
              <img 
                src="/icons/file-text.png" 
                alt="leaves" 
                className="theme-icon" 
                style={{ width: '32px', height: '32px' }} 
              />
              <div>
                <h2>{activeLeavesToday}</h2>
                <span>On Leave Today</span>
              </div>
            </div>

            <div className="glass-panel" style={{ ...styles.metricCard, cursor: 'pointer' }} onClick={() => setShowAbsentsModal(true)} title="Click to view Absents by Department">
              <img 
                src="/icons/clock.png" 
                alt="raw" 
                className="theme-icon" 
                style={{ width: '32px', height: '32px' }} 
              />
              <div>
                <h2>{absentsTodayCount}</h2>
                <span>Absents Today</span>
              </div>
            </div>
          </div>

          {/* Real-time Statistical Charts Row */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', width: '100%' }}>
            <TodayAttendanceDonutChart
              activeCount={activeCheckedInCount}
              completedCount={completedShiftCount}
              leaveCount={activeLeavesToday}
              absentCount={absentsTodayCount}
              totalEmployees={totalEmployees}
            />
            <MonthlyBreakdownBarChart
              presentCount={totalPresentsToday}
              lateCount={monthlyLateCount}
              missingCheckoutCount={0}
              leaveCount={monthlyLeaveCount}
              absentCount={monthlyAbsentCount}
              title={`Monthly Attendance Statistics (${currentMonthKey})`}
            />
          </div>

          {/* Quick Info & Guidelines */}
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Office Policies & Shift Rules Summary</h3>
            <div style={{ ...styles.policySummary, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div><strong>Default Office Hours:</strong> 11:00 AM - 08:00 PM (9 hrs)</div>
              <div><strong>Active Grace Period:</strong> {activeGraceMins} mins (Late after {lateAfterTimeStr})</div>
              <div><strong>Saturdays:</strong> Alternate Saturdays off (2nd & 4th)</div>
              <div><strong>Overtime Rules:</strong> Starts after 08:00 PM (Paid at 50% rate)</div>
            </div>

            {shiftTimings.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--primary)' }}>Configured Custom Shift Timing Rules ({shiftTimings.length})</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  {shiftTimings.map(t => {
                    const targetLabel = t.target_type === 'employee'
                      ? `Employee: ${profiles.find(p => p.id === t.target_id)?.full_name || 'Staff'}`
                      : (t.target_type === 'department' ? `Department: ${t.target_id}` : (t.target_type === 'designation' ? `Designation: ${t.target_id}` : 'Global Rule'));
                    return (
                      <div key={t.id} style={{ background: 'var(--bg-surface-hover)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{targetLabel}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Shift: <strong>{t.start_time} - {t.end_time}</strong> | Days: {t.days?.join(', ') || 'Mon-Fri'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
          {/* Top Filter and Add Row */}
          <div className="glass-panel" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', flex: 1, alignItems: 'center' }}>
              <h3 style={{ margin: 0, marginRight: '16px', fontSize: '1.25rem' }}>Employees</h3>
              
              {/* Department Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dept:</span>
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  className="custom-select"
                  style={{ width: '170px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
                >
                  <option value="">All Departments</option>
                  {departmentsList.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Designation Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Designation:</span>
                <select
                  value={desigFilter}
                  onChange={e => setDesigFilter(e.target.value)}
                  className="custom-select"
                  style={{ width: '170px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
                >
                  <option value="">All Designations</option>
                  {designationsList.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Employee Search Bar */}
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
                    value={employeeSearchQuery}
                    onChange={e => setEmployeeSearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px 8px 30px',
                      background: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      width: '200px',
                      outline: 'none',
                      height: '38px'
                    }}
                  />
                </div>
              </div>

              {/* Month/Year Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 10 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Period:</span>
                <select
                  value={adminEmpMonth}
                  onChange={e => setAdminEmpMonth(parseInt(e.target.value))}
                  className="custom-select"
                  style={{ width: '110px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
                >
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  value={adminEmpYear}
                  onChange={e => setAdminEmpYear(parseInt(e.target.value))}
                  className="custom-select"
                  style={{ width: '90px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative', zIndex: 10, pointerEvents: 'auto' }}
                >
                  {[2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={exportSalariesPDF}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer' }}
              >
                <img src="/icons/info.png" alt="PDF" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                Export Salaries
              </button>
              <button
                onClick={() => setIsAddEmployeeModalOpen(true)}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, cursor: 'pointer', border: 'none' }}
              >
                + Add Employee
              </button>
            </div>
          </div>

          {/* Employee list container (full-width) */}
          <div className="glass-panel" style={{...styles.panel, width: '100%', borderRadius: 'var(--radius-md)'}}>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>PIN</th>
                    <th>Name</th>
                    <th style={{ minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Credentials</span>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newShow = !showAdminPasswords['all'];
                            setShowAdminPasswords(prev => ({ ...prev, all: newShow }));
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                          title={showAdminPasswords['all'] ? "Hide all passwords" : "Show all passwords"}
                        >
                          <img 
                            src={showAdminPasswords['all'] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                            alt="toggle" 
                            className="theme-icon" 
                            style={{ width: '10px', height: '10px' }} 
                          />
                        </button>
                      </div>
                    </th>
                    <th>Dept / Designation</th>
                    <th>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Salary / Rate</span>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAdminSalariesMap(prev => ({ ...prev, all: !prev.all }));
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '2px 6px', fontSize: '0.7rem', height: '22px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                          title={showAdminSalariesMap['all'] ? "Hide all salaries" : "Show all salaries"}
                        >
                          <img 
                            src={showAdminSalariesMap['all'] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                            alt="toggle" 
                            className="theme-icon" 
                            style={{ width: '10px', height: '10px' }} 
                          />
                        </button>
                      </div>
                    </th>
                    <th>Net Salary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProfiles.length > 0 ? (
                    filteredProfiles.map(p => (
                      <tr 
                        key={p.id} 
                        onClick={() => setViewingProfileDetails(p)}
                        style={{ ...styles.tableRow, cursor: 'pointer' }}
                        className="dropdown-item-hover"
                      >
                        <td style={styles.tableCell}><strong>{p.pin}</strong></td>
                        <td style={styles.tableCell}>{p.full_name}</td>
                        <td style={styles.tableCell}>
                          <div style={{ fontSize: '0.85rem' }}>{p.email || 'N/A'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>Pass: {showAdminPasswords['all'] || showAdminPasswords[p.id] ? (p.password || 'N/A') : '••••••••'}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newShow = !showAdminPasswords[p.id];
                                setShowAdminPasswords(prev => ({ ...prev, [p.id]: newShow }));
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center' }}
                              title={showAdminPasswords[p.id] ? "Hide password" : "Show password"}
                            >
                              <img 
                                src={showAdminPasswords[p.id] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                                alt="toggle" 
                                className="theme-icon" 
                                style={{ width: '12px', height: '12px' }} 
                              />
                            </button>
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <div>{p.department || 'N/A'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.designation || 'N/A'}</div>
                        </td>
                        <td style={styles.tableCell}>
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAdminSalariesMap(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                            }}
                            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            title={showAdminSalariesMap[p.id] ? "Hide salary" : "Reveal salary"}
                          >
                            <span>{showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? formatSalary(p.base_salary) : 'PKR ••••••'}</span>
                            <img 
                              src={showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                              alt="toggle" 
                              className="theme-icon" 
                              style={{ width: '12px', height: '12px', opacity: 0.5 }} 
                            />
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? `${formatSalary(p.hourly_rate)}/hr` : 'PKR ••••••/hr'}
                          </div>
                        </td>
                        <td style={styles.tableCell}>
                          <strong style={{ color: 'var(--success)' }}>
                            {showAdminSalariesMap['all'] || showAdminSalariesMap[p.id] ? formatSalary(getEmployeeNetSalary(p)) : 'PKR ••••••'}
                          </strong>
                          {(p.income_tax || 0) > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>
                              (Tax: -{formatSalary(p.income_tax || 0)})
                            </div>
                          )}
                        </td>
                        <td style={{...styles.tableCell, ...styles.actionCell}}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCalendarProfile(p);
                              setAdminViewYear(new Date().getFullYear());
                              setAdminViewMonth(new Date().getMonth());
                              setSelectedAdminEmpCalendarDayData(null);
                            }} 
                            style={styles.iconBtn} 
                            title="View Attendance Calendar"
                          >
                            <img 
                              src="/icons/calendar.png" 
                              alt="Calendar" 
                              className="theme-icon" 
                              style={{ width: '16px', height: '16px' }} 
                            />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setWarningTargetEmployee(p);
                              setWarningText(p.warning_text || '');
                              setWarningExpiry(p.warning_expiry || '');
                              setWarningColor(p.warning_color || '#ff3b57');
                            }} 
                            style={{
                              ...styles.iconBtn,
                              backgroundColor: p.warning_active ? 'rgba(239, 68, 68, 0.15)' : 'none'
                            }} 
                            title={p.warning_active ? "Warning Active (Click to edit)" : "Issue Warning"}
                          >
                            <img 
                              src="/icons/alert.png" 
                              alt="Warning" 
                              className="theme-icon" 
                              style={{ width: '16px', height: '16px' }} 
                            />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProfileClick(p);
                            }} 
                            style={styles.iconBtn} 
                            title="Edit"
                          >
                            <img 
                              src="/icons/edit.png" 
                              alt="Edit" 
                              className="theme-icon" 
                              style={{ width: '16px', height: '16px' }} 
                            />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProfileClick(p.id);
                            }} 
                            style={styles.iconBtn} 
                            title="Delete"
                          >
                            <img 
                              src="/icons/trash.png" 
                              alt="Delete" 
                              className="theme-icon" 
                              style={{ width: '16px', height: '16px' }} 
                            />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No profiles match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
          {/* Raw punches list */}
          <div className="glass-panel" style={{...styles.panel, width: '100%'}}>
            <h3>Synced Raw Punch Logs</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>PIN ID</th>
                    <th>Timestamp</th>
                    <th>Status Type</th>
                    <th>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {rawLogs.map(l => (
                    <tr key={l.id || Math.random()} style={styles.tableRow}>
                      <td style={styles.tableCell}>#{l.id || '-'}</td>
                      <td style={styles.tableCell}><strong>{l.employee_pin}</strong></td>
                      <td style={styles.tableCell}>{new Date(l.timestamp).toLocaleString()}</td>
                      <td style={styles.tableCell}>
                        {l.status_type === 0 ? (
                          <span style={{color: 'var(--success)'}}>Check-In</span>
                        ) : (
                          <span style={{color: 'var(--danger)'}}>Check-Out</span>
                        )}
                      </td>
                      <td style={styles.tableCell}>
                        {l.verify_type === 1 ? 'Fingerprint' : 'Card'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. LEAVES APPROVAL TAB */}
      {activeTab === 'leaves' && (
        <div style={styles.overviewContainer} className="animate-fade-in">
          {/* Pending Requests */}
          <div className="glass-panel" style={styles.panel}>
            <h3>Pending Leave Applications</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Date Range</th>
                    <th>Requested Days</th>
                    <th>Reason</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.filter(l => l.status === 'Pending').length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{...styles.tableCell, textAlign: 'center', color: '#6b7280'}}>
                        No pending leave requests.
                      </td>
                    </tr>
                  ) : (
                    leaveRequests.filter(l => l.status === 'Pending').map(l => {
                      const emp = profiles.find(p => p.id === l.employee_id);
                      const start = new Date(l.start_date);
                      const end = new Date(l.end_date);
                      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                      return (
                        <tr key={l.id} style={styles.tableRow}>
                          <td style={styles.tableCell}><strong>{emp?.full_name}</strong> (PIN: {emp?.pin})</td>
                          <td style={styles.tableCell}>{l.leave_type}</td>
                          <td style={styles.tableCell}>{l.start_date} to {l.end_date}</td>
                          <td style={styles.tableCell}>{days} day(s)</td>
                          <td style={styles.tableCell}>"{l.reason}"</td>
                          <td style={{...styles.tableCell, ...styles.actionCell}}>
                            <button 
                              onClick={() => handleLeaveStatusChange(l.id, 'Approved')} 
                              className="btn" 
                              style={{...styles.actionBtn, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981'}}
                            >
                              <img 
                                src="/icons/check.png" 
                                alt="Approve" 
                                className="theme-icon" 
                                style={{ width: '12px', height: '12px', marginRight: '4px' }} 
                              /> Approve
                            </button>
                            <button 
                              onClick={() => handleLeaveStatusChange(l.id, 'Rejected')} 
                              className="btn" 
                              style={{...styles.actionBtn, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444'}}
                            >
                              <img 
                                src="/icons/x.png" 
                                alt="Reject" 
                                className="theme-icon" 
                                style={{ width: '12px', height: '12px', marginRight: '4px' }} 
                              /> Reject
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* History / All Requests */}
          <div className="glass-panel" style={styles.panel}>
            <h3>Leave Request Archives</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.filter(l => l.status !== 'Pending').map(l => {
                    const emp = profiles.find(p => p.id === l.employee_id);
                    return (
                      <tr key={l.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{emp?.full_name}</td>
                        <td style={styles.tableCell}>{l.leave_type}</td>
                        <td style={styles.tableCell}>{l.start_date}</td>
                        <td style={styles.tableCell}>{l.end_date}</td>
                        <td style={styles.tableCell}>"{l.reason}"</td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.statusTag,
                            backgroundColor: l.status === 'Approved' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                            color: l.status === 'Approved' ? '#10b981' : '#ef4444',
                            border: l.status === 'Approved' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                          }}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Employee Leave Balances & Adjustments */}
          <div className="glass-panel" style={styles.panel}>
            <h3>Employee Leave Balances & Adjustments</h3>
            <p style={{ margin: '4px 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              HR has full control to view and manually adjust leave quotas and consumed days for all employees.
            </p>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Casual Leave (Used/Total)</th>
                    <th>Medical Leave (Used/Total)</th>
                    <th>Annual Leave (Used/Total)</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.filter(p => p.role !== 'admin').length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{...styles.tableCell, textAlign: 'center', color: '#6b7280'}}>
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    profiles.filter(p => p.role !== 'admin').map(emp => {
                      const bal = leaveBalancesList.find(b => b.employee_id === emp.id) || {
                        casual_total: 10, casual_used: 0,
                        medical_total: 10, medical_used: 0,
                        annual_total: 10, annual_used: 0
                      };
                      return (
                        <tr key={emp.id} style={styles.tableRow}>
                          <td style={styles.tableCell}><strong>{emp.full_name}</strong> (PIN: {emp.pin})</td>
                          <td style={styles.tableCell}>{bal.casual_used} / {bal.casual_total}</td>
                          <td style={styles.tableCell}>{bal.medical_used} / {bal.medical_total}</td>
                          <td style={styles.tableCell}>{bal.annual_used} / {bal.annual_total}</td>
                          <td style={{...styles.tableCell, ...styles.actionCell}}>
                            <button
                              onClick={() => handleOpenLeaveBalanceAdjustment(emp)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            >
                              Adjust Quota
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. PAYROLL & OVERTIME TAB */}
      {activeTab === 'payroll' && (
        <div style={styles.overviewContainer} className="animate-fade-in">
          <div className="glass-panel" style={styles.panel}>
            <div style={styles.payrollHeader}>
              <div style={styles.payrollDates}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0 }}>Payroll & Overtime calculations</h3>
                  <button 
                    type="button"
                    onClick={() => setShowAdminSalariesMap(prev => ({ ...prev, all: !prev.all }))}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', height: '28px' }}
                    title={showAdminSalariesMap['all'] ? "Hide Salary details" : "Show Salary details"}
                  >
                    <img 
                      src={showAdminSalariesMap['all'] ? "/icons/eye-off.png" : "/icons/eye.png"} 
                      alt="toggle" 
                      className="theme-icon" 
                      style={{ width: '12px', height: '12px' }} 
                    />
                    <span>{showAdminSalariesMap['all'] ? "Hide" : "Reveal"}</span>
                  </button>
                </div>
                <div style={styles.dateInputs}>
                  <div style={styles.dateGroup}>
                    <label>From</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </div>
                  <div style={styles.dateGroup}>
                    <label>To</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={styles.payrollActions}>
                <button onClick={exportToCSV} className="btn btn-secondary">
                  <img 
                    src="/icons/download.png" 
                    alt="Export" 
                    className="theme-icon" 
                    style={{ width: '14px', height: '14px', marginRight: '6px' }} 
                  /> Export CSV
                </button>
              </div>
            </div>

            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>PIN</th>
                    <th>Name</th>
                    <th>Base Salary</th>
                    <th>Hourly / Min Rate</th>
                    <th>Overtime Earnings</th>
                    <th>Late Penalties</th>
                    <th>Absence Deductions</th>
                    <th>Net Payable</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollSummary.map(row => {
                    const isVisible = showAdminSalariesMap['all'] || showAdminSalariesMap[row.id];
                    const toggleRowVisibility = () => {
                      setShowAdminSalariesMap(prev => ({ ...prev, [row.id]: !prev[row.id] }));
                    };
                    return (
                      <tr key={row.id} style={styles.tableRow}>
                        <td style={styles.tableCell}><strong>{row.pin}</strong></td>
                        <td style={styles.tableCell}>{row.name}</td>
                        <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                          {isVisible ? formatSalary(row.baseSalary) : 'PKR ••••••'}
                        </td>
                        <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                          <div>{isVisible ? `${formatSalary(row.hourlyRate)}/hr` : 'PKR ••••••/hr'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {isVisible ? `Rs. ${row.perMinRate.toFixed(2)}/min` : 'Rs. ••••/min'}
                          </div>
                        </td>
                        <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                          {row.totalOvertimePayout > 0 ? (
                            <div>
                              <strong style={{color: 'var(--text-primary)'}}>
                                {isVisible ? formatSalary(row.totalOvertimePayout) : 'PKR ••••••'}
                              </strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>+{row.totalOvertimeHours.toFixed(1)} hrs</div>
                            </div>
                          ) : '-'}
                        </td>
                        <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                          {row.totalLateDeduction > 0 ? (
                            <div>
                              <strong style={{color: 'var(--danger)'}}>
                                -{isVisible ? formatSalary(row.totalLateDeduction) : 'PKR ••••••'}
                              </strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.totalLateMinutes} mins ({row.lateArrivals} days)</div>
                            </div>
                          ) : '-'}
                        </td>
                        <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                          {row.totalAbsenceDeduction > 0 ? (
                            <div>
                              <strong style={{color: 'var(--danger)'}}>
                                -{isVisible ? formatSalary(row.totalAbsenceDeduction) : 'PKR ••••••'}
                              </strong>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.absences} day(s)</div>
                            </div>
                          ) : '-'}
                        </td>
                        <td style={{ ...styles.tableCell, cursor: 'pointer' }} onClick={toggleRowVisibility} title={isVisible ? "Click to mask" : "Click to reveal"}>
                          <strong style={{color: 'var(--text-primary)', fontSize: '1rem'}}>
                            {isVisible ? formatSalary(row.totalPayable) : 'PKR ••••••'}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TIME MANAGER TAB */}
      {activeTab === 'timings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
          {/* Top Panel Header */}
          <div className="glass-panel" style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderRadius: 'var(--radius-md)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Time Manager</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Define shift timing rules for designations, departments, or individual employees.</p>
            </div>
            <button
              onClick={() => setIsAddTimingModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, cursor: 'pointer', border: 'none' }}
            >
              + Add Timing Rule
            </button>
          </div>

          {/* Shift Settings Panel */}
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Grace Period & Shift Settings</h4>
            
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {/* Target Scope */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Target Scope</label>
                <select
                  value={graceTargetScopeType}
                  onChange={e => {
                    const mode = e.target.value;
                    setGraceTargetScopeType(mode);
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const now = new Date();
                    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
                    if (mode === 'global') {
                      setGraceTargetMonth('global');
                    } else if (mode === 'month') {
                      setGraceTargetMonth(`${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`);
                    } else if (mode === 'date') {
                      setGraceTargetMonth(todayStr);
                    } else if (mode === 'date_range') {
                      setGraceStartDate(todayStr);
                      setGraceEndDate(todayStr);
                      setGraceTargetMonth(`${todayStr}:${todayStr}`);
                    }
                  }}
                  style={{ ...styles.input, width: '220px', height: '38px', padding: '6px 10px' }}
                >
                  <option value="global">All Months (Global Default)</option>
                  <option value="month">Specific Month (YYYY-MM)</option>
                  <option value="date">Single Specific Date</option>
                  <option value="date_range">Specific Date Range (Start to End)</option>
                </select>
              </div>

              {graceTargetScopeType === 'month' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Month</label>
                  <select
                    value={graceTargetMonth}
                    onChange={e => setGraceTargetMonth(e.target.value)}
                    style={{ ...styles.input, width: '160px', height: '38px', padding: '6px 10px' }}
                  >
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, idx) => {
                      const monthKey = `${calendarYear}-${m}`;
                      const mName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx];
                      return <option key={monthKey} value={monthKey}>{mName} {calendarYear}</option>;
                    })}
                  </select>
                </div>
              )}

              {graceTargetScopeType === 'date' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    value={graceTargetMonth.length === 10 ? graceTargetMonth : `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-01`}
                    onChange={e => setGraceTargetMonth(e.target.value)}
                    style={{ ...styles.input, width: '160px', height: '38px', padding: '6px 10px' }}
                  />
                </div>
              )}

              {graceTargetScopeType === 'date_range' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Start Date</label>
                    <input
                      type="date"
                      value={graceStartDate}
                      onChange={e => {
                        const s = e.target.value;
                        setGraceStartDate(s);
                        setGraceTargetMonth(`${s}:${graceEndDate || s}`);
                      }}
                      style={{ ...styles.input, width: '150px', height: '38px', padding: '6px 10px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>End Date</label>
                    <input
                      type="date"
                      value={graceEndDate}
                      onChange={e => {
                        const end = e.target.value;
                        setGraceEndDate(end);
                        setGraceTargetMonth(`${graceStartDate || end}:${end}`);
                      }}
                      style={{ ...styles.input, width: '150px', height: '38px', padding: '6px 10px' }}
                    />
                  </div>
                </>
              )}

              {/* Grace Time Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Grace Period (Minutes)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    value={graceTargetMonth === 'global' ? graceTimeMinsSetting : (monthlyGraceSettings[graceTargetMonth] ?? graceTimeMinsSetting)} 
                    onChange={e => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      if (graceTargetMonth === 'global') {
                        setGraceTimeMinsSetting(val);
                      } else {
                        setMonthlyGraceSettings(prev => ({ ...prev, [graceTargetMonth]: val }));
                      }
                    }} 
                    style={{ ...styles.input, width: '90px', height: '38px', padding: '6px 10px', textAlign: 'center' }} 
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mins</span>
                </div>
              </div>

              {/* Save Grace Setting Button */}
              <button
                type="button"
                onClick={async () => {
                  const targetVal = graceTargetMonth === 'global' 
                    ? graceTimeMinsSetting 
                    : (monthlyGraceSettings[graceTargetMonth] ?? graceTimeMinsSetting);

                  const newMonthly = { ...monthlyGraceSettings, [graceTargetMonth]: targetVal };
                  setGraceTimeMinsSetting(targetVal);
                  setMonthlyGraceSettings(newMonthly);
                  localStorage.setItem('office_grace_time_mins', targetVal.toString());

                  window.showLoading('Saving Grace Period setting...');
                  try {
                    await updateDeviceSettings({
                      ...deviceSettings,
                      grace_time_mins: targetVal,
                      monthly_grace_settings: newMonthly
                    });
                    window.customAlert(`Grace Period setting updated successfully for ${graceTargetMonth === 'global' ? 'All Months' : graceTargetMonth}!`);
                    fetchData();
                  } catch (e) {
                    window.customAlert('Updated locally!');
                  } finally {
                    window.hideLoading();
                  }
                }}
                className="btn btn-primary"
                style={{ padding: '8px 16px', height: '38px', fontSize: '0.85rem' }}
              >
                Save Grace Setting
              </button>

              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '380px', lineHeight: '1.4' }}>
                Shift starts are flexible after 6:00 AM. Any checkout after 9 completed hours is paid overtime. Grace cutoff applies at 11:00 AM + grace period. Late check-ins recover debt at a 2:1 ratio.
              </p>
            </div>
          </div>

          {/* Timing Rules Table */}
          <div className="glass-panel" style={{...styles.panel, width: '100%', borderRadius: 'var(--radius-md)'}}>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Rule Target</th>
                    <th>Target Type</th>
                    <th>Shift Timing</th>
                    <th>Active Days</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftTimings.length > 0 ? (
                    shiftTimings.map(t => (
                      <tr key={t.id} style={styles.tableRow}>
                        <td style={styles.tableCell}><strong>{t.target_name}</strong></td>
                        <td style={styles.tableCell}>
                          <span style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: t.target_type === 'employee' ? 'rgba(59, 130, 246, 0.1)' : t.target_type === 'department' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: t.target_type === 'employee' ? '#3b82f6' : t.target_type === 'department' ? '#10b981' : '#f59e0b'
                          }}>
                            {t.target_type}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          <strong>{formatTo12h(t.start_time)}</strong> to <strong>{formatTo12h(t.end_time)}</strong>
                        </td>
                        <td style={styles.tableCell}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {t.days.map((day, idx) => (
                              <span key={idx} style={{ background: 'var(--bg-surface-hover)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {day.substring(0, 3)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{...styles.tableCell, ...styles.actionCell}}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleEditShiftTimingClick(t)} 
                              style={styles.iconBtn} 
                              className="btn btn-secondary" 
                              title="Edit Timing Rule"
                            >
                              <img 
                                src="/icons/edit.png" 
                                alt="Edit" 
                                className="theme-icon" 
                                style={{ width: '14px', height: '14px' }} 
                              />
                            </button>
                            <button 
                              onClick={() => handleDeleteShiftTimingClick(t.id!)} 
                              style={styles.iconBtn} 
                              className="btn btn-secondary" 
                              title="Delete Timing Rule"
                            >
                              <img 
                                src="/icons/trash.png" 
                                alt="Delete" 
                                className="theme-icon" 
                                style={{ width: '14px', height: '14px' }} 
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No shift timing rules defined yet. Click "+ Add Timing Rule" to set one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 8. COMPLAINTS TAB */}
      {activeTab === 'complaints' && (
        <div style={{ ...styles.dashboardContent, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
            <h3 style={{ margin: 0, marginBottom: '16px' }}>Helpdesk / Complaints Reviewer</h3>
            
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Created At</th>
                    <th>Employee Name (PIN)</th>
                    <th>Ticket Title</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {complaintsList.length > 0 ? (
                    complaintsList.map(c => {
                      const empProfile = profiles.find(p => p.id === c.employee_id);
                      
                      // Nice display for correction requests description
                      let displayDescription = c.description;
                      let parsedDetails: any = null;
                      if (c.title === 'Check In/Out Entry Correction') {
                        try {
                          parsedDetails = JSON.parse(c.description);
                          displayDescription = `Date: ${parsedDetails.date} | In: ${parsedDetails.check_in || '-'} | Out: ${parsedDetails.check_out || '-'} | Reason: ${parsedDetails.reason || '-'}`;
                        } catch (e) {
                          displayDescription = c.description;
                        }
                      }

                      return (
                        <tr key={c.id} style={styles.tableRow}>
                          <td style={styles.tableCell}>{new Date(c.created_at || '').toLocaleDateString()}</td>
                          <td style={styles.tableCell}>
                            <strong>{empProfile?.full_name || 'Unknown'}</strong>{' '}
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>({empProfile?.pin || '-'})</span>
                          </td>
                          <td style={styles.tableCell}><strong>{c.title}</strong></td>
                          <td style={styles.tableCell}>{displayDescription}</td>
                          <td style={styles.tableCell}>
                            <span style={{
                              ...styles.statusTag,
                              backgroundColor: c.status === 'Resolved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: c.status === 'Resolved' ? '#10b981' : '#f59e0b',
                              border: c.status === 'Resolved' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                              {c.status}
                            </span>
                          </td>
                          <td style={{ ...styles.tableCell, textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            {c.status === 'Resolved' ? (
                              <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>Resolved</span>
                            ) : (
                              <>
                                {c.title === 'Check In/Out Entry Correction' ? (
                                  <>
                                    <button 
                                      onClick={() => handleApproveAttendanceCorrection(c)}
                                      className="btn btn-success"
                                      style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                                    >
                                      Approve
                                    </button>
                                    <button 
                                      onClick={() => {
                                        try {
                                          const parsed = JSON.parse(c.description);
                                          setEditingCorrectionComplaint(c);
                                          setEditCorrectionDate(parsed.date || '');
                                          setEditCorrectionCheckIn(parsed.check_in || '');
                                          setEditCorrectionCheckOut(parsed.check_out || '');
                                        } catch (err) {
                                          window.customAlert('Failed to parse correction data.');
                                        }
                                      }}
                                      className="btn btn-secondary"
                                      style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                                    >
                                      Edit & Approve
                                    </button>
                                  </>
                                ) : (
                                  <button 
                                    onClick={() => handleUpdateComplaintStatus(c.id!, 'Resolved')}
                                    className="btn btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                                  >
                                    Resolve
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No complaints submitted by employees.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 9. ANNOUNCEMENTS TAB */}
      {activeTab === 'announcements' && (
        <div style={{ ...styles.dashboardContent, display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start', width: '100%' }} className="animate-fade-in">
          {/* Active announcements list */}
          <div className="glass-panel" style={{ ...styles.panel, flex: 2, padding: '24px' }}>
            <h3 style={{ margin: 0, marginBottom: '16px' }}>Published Announcements</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Announcement Title</th>
                    <th>Message</th>
                    <th>Target Audience</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {announcementsList.length > 0 ? (
                    announcementsList.map(ann => (
                      <tr key={ann.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{new Date(ann.created_at || '').toLocaleDateString()}</td>
                        <td style={styles.tableCell}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: ann.color || '#ff3b57',
                              display: 'inline-block',
                              boxShadow: `0 0 8px ${ann.color || '#ff3b57'}`
                            }} />
                            <strong>{ann.title}</strong>
                          </div>
                        </td>
                        <td style={styles.tableCell}>{ann.message}</td>
                        <td style={styles.tableCell}>
                          <span style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            background: ann.target_type === 'all' ? 'rgba(255,255,255,0.06)' : ann.target_type === 'department' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: ann.target_type === 'all' ? 'var(--text-primary)' : ann.target_type === 'department' ? '#10b981' : '#f59e0b'
                          }}>
                            {ann.target_type === 'all' ? 'All Employees' : `${ann.target_type}: ${ann.target_value}`}
                          </span>
                        </td>
                        <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                          <button 
                            onClick={() => handleDeleteAnnouncement(ann.id!)} 
                            className="btn btn-secondary"
                            style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Delete Announcement"
                          >
                            <img 
                              src="/icons/trash.png" 
                              alt="delete" 
                              className="theme-icon" 
                              style={{ width: '16px', height: '16px' }} 
                            />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No announcements posted yet. Use the form on the right to post one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Post announcement form */}
          <div className="glass-panel" style={{ ...styles.panel, flex: 1, padding: '24px' }}>
            <h3 style={{ margin: 0, marginBottom: '16px' }}>Post New Announcement</h3>

            {/* Local Draft Status */}
            {(announceTitle || announceMessage || announceTargetValue) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Draft recovered</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('draft_announcement');
                    setAnnounceTitle('');
                    setAnnounceMessage('');
                    setAnnounceTargetValue('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Clear Draft
                </button>
              </div>
            )}

            <form onSubmit={handleCreateAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label>Announcement Title *</label>
                <input
                  type="text"
                  value={announceTitle}
                  onChange={e => setAnnounceTitle(e.target.value)}
                  placeholder="e.g. Eid Holidays Office Closure"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>Message Content *</label>
                <textarea
                  value={announceMessage}
                  onChange={e => setAnnounceMessage(e.target.value)}
                  placeholder="Type the message for employees..."
                  rows={5}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>Target Audience</label>
                <select
                  value={announceTargetType}
                  onChange={e => {
                    setAnnounceTargetType(e.target.value as any);
                    setAnnounceTargetValue('');
                  }}
                  className="custom-select"
                >
                  <option value="all">All Employees</option>
                  <option value="department">Specific Department</option>
                  <option value="designation">Specific Designation</option>
                  <option value="employee">Specific Employee</option>
                </select>
              </div>

              {announceTargetType !== 'all' && (
                <div style={styles.formGroup}>
                  <label>
                    Select {
                      announceTargetType === 'department' ? 'Department' : 
                      announceTargetType === 'designation' ? 'Designation' : 'Employee'
                    } *
                  </label>
                  <select
                    value={announceTargetValue}
                    onChange={e => setAnnounceTargetValue(e.target.value)}
                    className="custom-select"
                    required
                  >
                    <option value="">
                      -- Choose {
                        announceTargetType === 'department' ? 'Department' : 
                        announceTargetType === 'designation' ? 'Designation' : 'Employee'
                      } --
                    </option>
                    {announceTargetType === 'department' && departmentsList.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                    {announceTargetType === 'designation' && designationsList.map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                    {announceTargetType === 'employee' && profiles.filter(p => p.role !== 'admin').map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.pin})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={styles.formGroup}>
                <label>Theme Color Palette *</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {['#ff3b57', '#ff8f00', '#00b8ff', '#7000ff', '#ff00a0'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAnnounceColor(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: announceColor === color ? '3px solid var(--text-primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transform: announceColor === color ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.1s'
                      }}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontWeight: 600, backgroundColor: announceColor }}>
                Publish Announcement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 10. CALENDAR TAB */}
      {activeTab === 'calendar' && (
        <div style={{ ...styles.dashboardContent, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Office Calendar</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select value={calendarMonth} onChange={e => setCalendarMonth(Number(e.target.value))} style={styles.input}>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select value={calendarYear} onChange={e => setCalendarYear(Number(e.target.value))} style={styles.input}>
                  {[2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calendar Day Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} style={{ textAlign: 'center', padding: '8px', fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{d}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            {(() => {
              const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
              const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
              const firstDayAdj = firstDay === 0 ? 6 : firstDay - 1;
              const cells: React.ReactNode[] = [];

              for (let i = 0; i < firstDayAdj; i++) {
                cells.push(<div key={`empty-${i}`} style={{ padding: '8px', minHeight: '80px' }}></div>);
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dateObj = new Date(calendarYear, calendarMonth, day);
                const isSun = dateObj.getDay() === 0;
                const offSat = isOffSaturday(dateObj);

                const holiday = holidaysList.find(h => h.date === dateStr);
                const birthdayEmployees = profiles.filter(p => {
                  if (!p.date_of_birth) return false;
                  const dob = new Date(p.date_of_birth + 'T00:00:00');
                  return dob.getMonth() === calendarMonth && dob.getDate() === day;
                });
                const dayLeaves = leaveRequests.filter(lr => {
                  if (lr.status === 'Rejected') return false;
                  return dateStr >= lr.start_date && dateStr <= lr.end_date;
                });

                let bgColor = 'var(--bg-surface)';
                let borderColor = 'var(--border-color)';
                if (holiday) { bgColor = 'rgba(239, 68, 68, 0.15)'; borderColor = 'rgba(239, 68, 68, 0.5)'; }
                else if (dayLeaves.length > 0) { bgColor = 'rgba(16, 185, 129, 0.08)'; borderColor = 'rgba(16, 185, 129, 0.3)'; }
                else if (isSun) { bgColor = 'var(--bg-surface-hover)'; }
                else if (offSat) { bgColor = 'var(--bg-surface-hover)'; }

                cells.push(
                  <div
                    key={day}
                    onClick={() => handleCalendarDayClick(dateStr)}
                    style={{
                      padding: '8px', minHeight: '80px', background: bgColor,
                      border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', transition: 'background 0.2s',
                      display: 'flex', flexDirection: 'column', gap: '4px'
                    }}
                    className="dropdown-item-hover"
                  >
                    <span style={{ fontWeight: '600', fontSize: '0.85rem', color: isSun ? 'var(--text-muted)' : 'var(--text-primary)' }}>{day}</span>
                    {holiday && (
                      <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: '600', lineHeight: '1.2' }}>
                        {holiday.title}
                      </span>
                    )}
                    {birthdayEmployees.map(emp => (
                      <span key={emp.id} style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: '500', lineHeight: '1.2' }}>
                        Birthday: {emp.full_name}
                      </span>
                    ))}
                    {dayLeaves.map(lr => {
                      const emp = profiles.find(p => p.id === lr.employee_id);
                      const empName = emp ? emp.full_name : 'Employee';
                      return (
                        <span key={lr.id} style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: '500', lineHeight: '1.2' }}>
                          Leave ({lr.status === 'Pending' ? 'P' : 'A'}): {empName}
                        </span>
                      );
                    })}
                    {isSun && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Sunday</span>}
                    {offSat && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Off Saturday</span>}
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {cells}
                </div>
              );
            })()}
          </div>

          {/* Holidays List */}
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
            <h3 style={{ margin: 0, marginBottom: '16px' }}>Declared Holidays</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Description</th>
                    <th style={{ width: '80px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holidaysList.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No holidays declared yet. Click on a date above to declare one.</td></tr>
                  ) : (
                    holidaysList.map(h => (
                      <tr key={h.id}>
                        <td>{new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                        <td style={{ fontWeight: '600' }}>{h.title}</td>
                        <td>{h.description || '-'}</td>
                        <td>
                          <button onClick={() => handleDeleteHoliday(h.id!)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                            <img src="/icons/trash.png" alt="delete" className="theme-icon" style={{ width: '12px', height: '12px' }} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upcoming Birthdays This Month */}
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
            <h3 style={{ margin: 0, marginBottom: '16px' }}>Birthdays This Month</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Date of Birth</th>
                    <th>Birthday</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const bdayEmployees = profiles.filter(p => {
                      if (!p.date_of_birth) return false;
                      const dob = new Date(p.date_of_birth + 'T00:00:00');
                      return dob.getMonth() === calendarMonth;
                    }).sort((a, b) => {
                      const da = new Date(a.date_of_birth! + 'T00:00:00').getDate();
                      const db = new Date(b.date_of_birth! + 'T00:00:00').getDate();
                      return da - db;
                    });
                    if (bdayEmployees.length === 0) {
                      return <tr><td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No employee birthdays this month.</td></tr>;
                    }
                    return bdayEmployees.map(emp => {
                      const dob = new Date(emp.date_of_birth! + 'T00:00:00');
                      const bdayStr = dob.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
                      return (
                        <tr key={emp.id}>
                          <td style={{ fontWeight: '600' }}>{emp.full_name}</td>
                          <td>{emp.department || '-'}</td>
                          <td>{emp.date_of_birth}</td>
                          <td>{bdayStr}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Holiday Declaration Modal */}
      {isHolidayModalOpen && (
        <div className="custom-overlay" style={{ display: 'flex', zIndex: 10001 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Declare Holiday</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Date: {selectedHolidayDate && new Date(selectedHolidayDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <form onSubmit={handleDeclareHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label>Holiday Title *</label>
                <input type="text" value={holidayTitle} onChange={e => setHolidayTitle(e.target.value)} placeholder="e.g. Independence Day" style={styles.input} required />
              </div>
              <div style={styles.formGroup}>
                <label>Description (Optional)</label>
                <textarea value={holidayDescription} onChange={e => setHolidayDescription(e.target.value)} placeholder="Optional description..." style={{ ...styles.input, minHeight: '60px', resize: 'vertical' } as React.CSSProperties} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsHolidayModalOpen(false); setHolidayTitle(''); setHolidayDescription(''); }} style={{ padding: '8px 16px' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>Declare Holiday</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. DEVICE TAB */}
      {activeTab === 'device' && (
        <div style={styles.splitLayout} className="animate-fade-in">
          {/* Left panel: Edit settings and status */}
          <div className="glass-panel" style={{...styles.panel, flex: 2, padding: '24px'}}>
            <h3>ZKTeco K40 Device Settings</h3>
            
            {/* Status section */}
            <div style={{...styles.syncInfoBox, marginBottom: '24px'}}>
              <div style={styles.syncIndicator}>
                <div style={{
                  ...styles.activeDot,
                  background: deviceSettings.status === 'Online' || deviceSettings.status === 'System Online' ? 'var(--success)' : '#9ca3af'
                }}></div>
                <strong>Device Status: {deviceSettings.status || 'Offline'}</strong>
              </div>
              <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px'}}>
                The Node.js synchronization agent connects locally to the reader over TCP/IP and writes new punches to Supabase.
              </p>
              
              <div style={{...styles.infoBullets, marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '20px'}}>
                <div>
                  <img src="/icons/info.png" alt="info" className="theme-icon" style={{ width: '16px', height: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                  Last Connection State: <code>{deviceSettings.last_connection_state || 'Unknown'}</code>
                </div>
                <div>
                  <img src="/icons/info.png" alt="info" className="theme-icon" style={{ width: '16px', height: '16px', marginRight: '6px', verticalAlign: 'middle' }} />
                  Last Successful Sync: <code>{deviceSettings.last_sync ? new Date(deviceSettings.last_sync).toLocaleString() : 'Never'}</code>
                </div>
              </div>
            </div>

            {/* Edit settings form */}
            <form onSubmit={handleSaveDeviceSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
              <div style={styles.formGroup}>
                <label>Device IP Address *</label>
                <input 
                  type="text" 
                  value={editDeviceIp} 
                  onChange={e => setEditDeviceIp(e.target.value)} 
                  placeholder="e.g. 192.168.1.201" 
                  style={styles.input}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={styles.formGroup}>
                  <label>Device TCP Port *</label>
                  <input 
                    type="number" 
                    value={editDevicePort} 
                    onChange={e => setEditDevicePort(Number(e.target.value))} 
                    placeholder="4370" 
                    style={styles.input}
                    required 
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Sync Interval (Seconds) *</label>
                  <input 
                    type="number" 
                    value={editDeviceInterval} 
                    onChange={e => setEditDeviceInterval(Number(e.target.value))} 
                    placeholder="30" 
                    style={styles.input}
                    required 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                style={{ padding: '10px 20px', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, border: 'none', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '8px' }}
              >
                Save Device Configuration
              </button>
            </form>
          </div>

          {/* Right panel: File upload fallback */}
          <div className="glass-panel" style={{...styles.panel, flex: 1}}>
            <h3>Manual File Upload (USB Fallback)</h3>
            <div style={styles.uploadBox}>
              <p style={{fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4'}}>
                If the direct network sync agent is offline, you can manually upload the raw Excel sheet (<strong>.xls / .xlsx</strong>), <strong>attlog.dat</strong> file, or <strong>CSV / Tab-delimited Text</strong>.
              </p>

              <div 
                onClick={() => fileInputRef.current?.click()} 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files) {
                    processMultipleFiles(e.dataTransfer.files);
                  }
                }}
                style={styles.dropzone}
              >
                <img 
                  src="/icons/upload.png" 
                  alt="Upload" 
                  className="theme-icon" 
                  style={{ width: '36px', height: '36px', marginBottom: '10px' }} 
                />
                <span>Drag & Drop or Click to Select File</span>
                <small>Accepts Excel (.xls, .xlsx), attlog.dat, CSV, or Text</small>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                style={{display: 'none'}} 
                accept=".xls,.xlsx,.dat,.txt,.csv"
                multiple
              />

              {uploadStatus && (
                <div style={styles.statusBox}>
                  <img 
                    src="/icons/info.png" 
                    alt="info" 
                    className="theme-icon" 
                    style={{ width: '16px', height: '16px', marginRight: '6px' }} 
                  />
                  <span>{uploadStatus}</span>
                </div>
              )}

              <div style={styles.alertBox}>
                <img 
                  src="/icons/alert.png" 
                  alt="Warning" 
                  className="theme-icon" 
                  style={{ width: '18px', height: '18px', marginRight: '6px' }} 
                />
                <span>Ensure employee IDs in the machine match PIN IDs in the profile settings.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Add/Edit Modal */}
      {(isAddEmployeeModalOpen || isEditingProfile !== null) && (
        <div className="custom-overlay" style={{ zIndex: 10000 }}>
          <div className="custom-dialog-card glass-panel" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left', alignItems: 'stretch', padding: '28px' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              {isEditingProfile ? 'Edit Employee Profile' : 'Add New Employee'}
            </h3>
            
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

              <div style={styles.formGroup}>
                <label>Login Email Address *</label>
                <input 
                  type="email" 
                  value={employeeEmail} 
                  onChange={e => setEmployeeEmail(e.target.value)} 
                  placeholder="employee@company.com"
                  required
                />
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
                
                <SearchableDropdown
                  label="Designation"
                  placeholder="Search/Select designation..."
                  value={designation}
                  onChange={setDesignation}
                  options={designationsList}
                  onAddClick={() => setShowAddDesigModal(true)}
                />
              </div>

              <div style={styles.dateRow}>
                <div style={{...styles.formGroup, flex: 1}}>
                  <label>Monthly Salary (PKR) *</label>
                  <input 
                    type="number" 
                    value={baseSalary} 
                    onChange={e => {
                      setBaseSalary(e.target.value);
                      setIncomeTax(''); // blank automatically if salary changes
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
                    Hourly Rate: <strong>Rs. {(parseFloat(baseSalary) / 216).toFixed(1)}/hr</strong> (Per-min: Rs. {(parseFloat(baseSalary) / 12960).toFixed(2)}/min)
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Net Salary: <strong style={{ color: 'var(--success)' }}>Rs. {((parseFloat(baseSalary) || 0) - (parseFloat(incomeTax) || 0)).toLocaleString()}</strong>
                  </div>
                </div>
              )}

              {/* NIC No (Pakistani Format) */}
              <div style={styles.formGroup}>
                <label>NIC Number (Pakistani Format: xxxxx-xxxxxxx-x)</label>
                <input 
                  type="text" 
                  value={nicNo} 
                  onChange={e => handleNicChange(e.target.value)} 
                  placeholder="e.g. 61101-1234567-1"
                  style={styles.input}
                />
              </div>

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
                          <option value="Meezan Bank">Meezan Bank</option>
                          <option value="Habib Bank Limited (HBL)">Habib Bank Limited (HBL)</option>
                          <option value="United Bank Limited (UBL)">United Bank Limited (UBL)</option>
                          <option value="National Bank of Pakistan (NBP)">National Bank of Pakistan (NBP)</option>
                          <option value="MCB Bank Limited (MCB)">MCB Bank Limited (MCB)</option>
                          <option value="Allied Bank Limited (ABL)">Allied Bank Limited (ABL)</option>
                          <option value="Bank Alfalah">Bank Alfalah</option>
                          <option value="Bank Al Habib">Bank Al Habib</option>
                          <option value="Faysal Bank">Faysal Bank</option>
                          <option value="Askari Bank">Askari Bank</option>
                          <option value="JS Bank">JS Bank</option>
                          <option value="Dubai Islamic Bank">Dubai Islamic Bank</option>
                          <option value="Al Baraka Bank">Al Baraka Bank</option>
                          <option value="MCB Islamic Bank">MCB Islamic Bank</option>
                          <option value="Standard Chartered Bank (SCB)">Standard Chartered Bank (SCB)</option>
                          <option value="Bank of Punjab (BOP)">Bank of Punjab (BOP)</option>
                          <option value="Bank of Sindh">Bank of Sindh</option>
                          <option value="Bank of Khyber">Bank of Khyber</option>
                          <option value="Habib Metropolitan Bank">Habib Metropolitan Bank</option>
                          <option value="Soneri Bank">Soneri Bank</option>
                          <option value="Summit Bank">Summit Bank</option>
                          <option value="Silkbank">Silkbank</option>
                          <option value="Samba Bank">Samba Bank</option>
                          <option value="Mobilink Microfinance Bank (JazzCash)">Mobilink Microfinance Bank (JazzCash)</option>
                          <option value="Telenor Microfinance Bank (Easypaisa)">Telenor Microfinance Bank (Easypaisa)</option>
                          <option value="U Microfinance Bank">U Microfinance Bank</option>
                          <option value="FINCA Microfinance Bank">FINCA Microfinance Bank</option>
                          <option value="Khushhali Microfinance Bank">Khushhali Microfinance Bank</option>
                          <option value="APNA Microfinance Bank">APNA Microfinance Bank</option>
                          <option value="NRSP Microfinance Bank">NRSP Microfinance Bank</option>
                          <option value="First Microfinance Bank">First Microfinance Bank</option>
                          <option value="HBL Microfinance Bank">HBL Microfinance Bank</option>
                        </select>
                      </div>
                      <div style={{ ...styles.formGroup, flex: 1 }}>
                        <label>Account Title</label>
                        <input 
                          type="text" 
                          value={bankAccountTitle} 
                          onChange={e => setBankAccountTitle(e.target.value)} 
                          placeholder="Account Title Name"
                          style={styles.input}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label>Account Number / IBAN</label>
                      <input 
                        type="text" 
                        value={bankAccountNo} 
                        onChange={e => setBankAccountNo(e.target.value)} 
                        placeholder="Account Number or IBAN"
                        style={styles.input}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', marginBottom: '14px' }}>
                    Cash Payment Mode Enabled (Account details bypassed)
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
                    + Add
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
                    + Add
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
          </div>
        </div>
      )}

      {/* Leave Approval type classification modal */}
      {selectedLeaveForApproval && (
        <div className="custom-overlay" style={{ zIndex: 10010 }}>
          <div className="custom-dialog-card glass-panel" style={{ maxWidth: '420px', padding: '28px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Classify Approved Leave
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '10px 0 16px 0', lineHeight: 1.4 }}>
              Select which leave category should be charged for <strong>{profiles.find(p => p.id === selectedLeaveForApproval.employee_id)?.full_name}</strong>'s request ({selectedLeaveForApproval.start_date} to {selectedLeaveForApproval.end_date}).
            </p>
            <div style={styles.formGroup}>
              <label>Leave Category *</label>
              <select
                value={chosenLeaveTypeForApproval}
                onChange={e => setChosenLeaveTypeForApproval(e.target.value as any)}
                style={styles.input}
              >
                <option value="Casual">Casual Leave</option>
                <option value="Medical">Medical Leave</option>
                <option value="Annual">Annual Leave</option>
              </select>
            </div>
            <div style={{ ...styles.btnGroup, marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedLeaveForApproval(null)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApproveLeaveWithDetails}
                style={{ flex: 1 }}
              >
                Approve Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Leave Balance Adjustment Editor modal */}
      {editingLeaveBalanceEmp && (
        <div className="custom-overlay" style={{ zIndex: 10010 }}>
          <div className="custom-dialog-card glass-panel" style={{ maxWidth: '460px', padding: '28px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Adjust Leave Quotas: {editingLeaveBalanceEmp.full_name}
            </h3>
            <form onSubmit={handleSaveLeaveBalanceAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Casual Used</label>
                  <input
                    type="number"
                    value={adjCasualUsed}
                    onChange={e => setAdjCasualUsed(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Casual Total</label>
                  <input
                    type="number"
                    value={adjCasualTotal}
                    onChange={e => setAdjCasualTotal(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Medical Used</label>
                  <input
                    type="number"
                    value={adjMedicalUsed}
                    onChange={e => setAdjMedicalUsed(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Medical Total</label>
                  <input
                    type="number"
                    value={adjMedicalTotal}
                    onChange={e => setAdjMedicalTotal(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Annual Used</label>
                  <input
                    type="number"
                    value={adjAnnualUsed}
                    onChange={e => setAdjAnnualUsed(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Annual Total</label>
                  <input
                    type="number"
                    value={adjAnnualTotal}
                    onChange={e => setAdjAnnualTotal(parseInt(e.target.value) || 0)}
                    style={styles.input}
                    min={0}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingLeaveBalanceEmp(null)}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Save Adjustments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disciplinary warning modal */}
      {warningTargetEmployee && (
        <div className="custom-overlay" style={{ zIndex: 10010 }}>
          <div className="custom-dialog-card glass-panel" style={{ maxWidth: '440px', padding: '28px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Disciplinary Warning: {warningTargetEmployee.full_name}
            </h3>
            
            {warningTargetEmployee.warning_active && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', marginTop: '10px', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>Current active warning exists.</span>
                <button 
                  type="button" 
                  onClick={() => handleClearWarning(warningTargetEmployee.id)}
                  className="btn btn-danger"
                  style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                >
                  Clear Active Warning
                </button>
              </div>
            )}

            <form onSubmit={handleSaveWarning} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div style={styles.formGroup}>
                <label>Warning Reason *</label>
                <textarea
                  value={warningText}
                  onChange={e => setWarningText(e.target.value)}
                  placeholder="State the reason/details of the disciplinary warning..."
                  rows={3}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>Warning Expiry Date *</label>
                <input
                  type="date"
                  value={warningExpiry}
                  onChange={e => setWarningExpiry(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label>Theme Color Palette *</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  {['#ff3b57', '#ff8f00', '#00b8ff', '#7000ff', '#ff00a0'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setWarningColor(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border: warningColor === color ? '3px solid var(--text-primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transform: warningColor === color ? 'scale(1.1)' : 'scale(1)',
                        transition: 'transform 0.1s'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setWarningTargetEmployee(null);
                    setWarningText('');
                    setWarningExpiry('');
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 16px', backgroundColor: warningColor }}
                >
                  Send Warning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal: Add New Department */}
      {showAddDeptModal && (
        <div className="custom-overlay" style={{ zIndex: 10005 }}>
          <div className="custom-dialog-card" style={{ maxWidth: '360px', alignItems: 'stretch' }}>
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
        <div className="custom-overlay" style={{ zIndex: 10005 }}>
          <div className="custom-dialog-card" style={{ maxWidth: '360px', alignItems: 'stretch' }}>
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
      {/* Add Shift Timing Rule Modal */}
      {isAddTimingModalOpen && (
        <div className="custom-overlay">
          <div className="custom-dialog-card" style={{ maxWidth: '480px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              {editingTimingRule ? 'Edit Shift Timing Rule' : 'Add Shift Timing Rule'}
            </h3>

            <form onSubmit={handleSaveShiftTiming} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
              <div style={styles.formGroup}>
                <label>Rule Target Type</label>
                <select
                  value={timingTargetType}
                  onChange={e => {
                    setTimingTargetType(e.target.value as any);
                    setTimingTargetId('');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="designation">By Designation</option>
                  <option value="department">By Department</option>
                  <option value="employee">By Specific Employee</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label>Select Target Option</label>
                <select
                  value={timingTargetId}
                  onChange={e => setTimingTargetId(e.target.value)}
                  style={{ cursor: 'pointer' }}
                  required
                >
                  <option value="">-- Choose Option --</option>
                  {timingTargetType === 'designation' && designationsList.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                  {timingTargetType === 'department' && departmentsList.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                  {timingTargetType === 'employee' && profiles.filter(p => p.role !== 'admin').map((p, idx) => (
                    <option key={idx} value={p.id}>{p.full_name} (PIN: {p.pin})</option>
                  ))}
                </select>
              </div>

              <div style={styles.dateRow}>
                <div style={{...styles.formGroup, flex: 1}}>
                  <label>Shift Start Time</label>
                  <input
                    type="time"
                    value={timingStartTime}
                    onChange={e => setTimingStartTime(e.target.value)}
                    required
                  />
                </div>
                <div style={{...styles.formGroup, flex: 1}}>
                  <label>Shift End Time</label>
                  <input
                    type="time"
                    value={timingEndTime}
                    onChange={e => setTimingEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>Rule Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={timingGraceMins}
                  onChange={e => setTimingGraceMins(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="e.g. 20 (minutes allowed after start time)"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ margin: 0 }}>Active Days</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      if (timingDays.length === 7) {
                        setTimingDays([]);
                      } else {
                        setTimingDays(allWeek);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
                    }}
                  >
                    {timingDays.length === 7 ? 'Deselect All' : 'Select All Days'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={timingDays.includes(day)}
                        style={{ width: 'auto' }}
                        onChange={e => {
                          if (e.target.checked) {
                            setTimingDays(prev => [...prev, day]);
                          } else {
                            setTimingDays(prev => prev.filter(d => d !== day));
                          }
                        }}
                      />
                      {day.substring(0, 3)}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{...styles.btnGroup, marginTop: '12px'}}>
                <button type="submit" className="btn btn-primary" style={{flex: 1, background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600}}>
                  {editingTimingRule ? 'Update Rule' : 'Save Timing'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddTimingModalOpen(false);
                    setEditingTimingRule(null);
                    setTimingTargetId('');
                    setTimingStartTime('09:00');
                    setTimingEndTime('18:00');
                    setTimingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
                  }}
                  className="btn btn-secondary"
                  style={{flex: 1, border: '1px solid var(--border-color)', background: 'var(--bg-surface-hover)'}}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin View Employee Attendance Calendar Modal */}
      {selectedCalendarProfile && (
        <div className="custom-overlay" style={{ zIndex: 11000 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '24px', width: '560px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Attendance Calendar</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Employee: <strong>{selectedCalendarProfile.full_name} (PIN: {selectedCalendarProfile.pin})</strong> | Raw Logs: {selectedCalendarLogs.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  onClick={async () => {
                    window.showLoading('Refreshing...');
                    try {
                      const l = await getRawLogs(selectedCalendarProfile.pin);
                      setSelectedCalendarLogs(l.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
                    } catch (e) { /* console removed */ }
                    finally { window.hideLoading(); }
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  ⟳ Refresh
                </button>
                <button 
                  type="button" 
                  onClick={() => { setSelectedCalendarProfile(null); setSelectedAdminEmpCalendarDayData(null); }} 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Navigation & Selectors */}
            <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-start', alignItems: 'center' }}>
              <select 
                value={adminViewMonth} 
                onChange={e => { setAdminViewMonth(Number(e.target.value)); setSelectedAdminEmpCalendarDayData(null); }} 
                style={{ width: 'auto', padding: '6px 10px', height: '36px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
              >
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select 
                value={adminViewYear} 
                onChange={e => { setAdminViewYear(Number(e.target.value)); setSelectedAdminEmpCalendarDayData(null); }} 
                style={{ width: 'auto', padding: '6px 10px', height: '36px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Calendar Grid wrapper */}
            <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} style={{ textAlign: 'center', padding: '6px', fontWeight: '700', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d}</div>
              ))}
            </div>

            {/* Calendar Days */}
            {(() => {
              const firstDayIndex = new Date(adminViewYear, adminViewMonth, 1).getDay();
              const startShift = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
              const daysInMonth = new Date(adminViewYear, adminViewMonth + 1, 0).getDate();
              const summaries = getEmployeeCalendarData();

              // Monthly OT stats
              let totalCompMins = 0;
              let totalNormalOvertimeMins = 0;
              let missingEntryDates = 0;
              summaries.forEach(s => {
                if (s.overtimeHours > 0) {
                  const totalOvertimeMins = s.overtimeHours * 60;
                  const lateMins = s.lateMinutes;
                  if (lateMins > 0) {
                    const compMins = Math.min(totalOvertimeMins, lateMins * 2);
                    totalCompMins += compMins;
                    totalNormalOvertimeMins += totalOvertimeMins - compMins;
                  } else {
                    totalNormalOvertimeMins += totalOvertimeMins;
                  }
                }
                if (!s.checkIn || !s.checkOut) {
                  if (s.status === 'Present' || s.isLate) missingEntryDates++;
                }
              });

              const cells: React.ReactNode[] = [];

              // Monthly OT Summary bar
              cells.push(
                <div key="monthly-stats" style={{ gridColumn: '1 / -1', display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '8px 12px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '4px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Comp OT: <strong style={{ color: 'var(--text-primary)' }}>{totalCompMins > 0 ? `${(totalCompMins / 60).toFixed(1)} hrs` : '-'}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Normal OT: <strong style={{ color: 'var(--text-primary)' }}>{totalNormalOvertimeMins > 0 ? `${(totalNormalOvertimeMins / 60).toFixed(1)} hrs` : '-'}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Missing Entries: <strong style={{ color: missingEntryDates > 0 ? 'var(--danger)' : 'var(--success)' }}>{missingEntryDates}</strong>
                  </div>
                </div>
              );

              for (let i = 0; i < startShift; i++) {
                cells.push(<div key={`empty-${i}`} style={{ minHeight: '85px' }}></div>);
              }

              for (let day = 1; day <= daysInMonth; day++) {
                const pad = (num: number) => num.toString().padStart(2, '0');
                const dateStr = `${adminViewYear}-${pad(adminViewMonth + 1)}-${pad(day)}`;
                const daySummary = summaries.find(s => s.date === dateStr);

                let bgColor = 'var(--bg-surface)';
                let textColor = 'var(--text-primary)';
                let border = '1px solid var(--border-color)';
                let label = '';

                const holiday = holidaysList.find(h => h.date === dateStr);
                const isBirthday = selectedCalendarProfile.date_of_birth ? (() => {
                  const dob = new Date(selectedCalendarProfile.date_of_birth + 'T00:00:00');
                  const cellDate = new Date(dateStr + 'T00:00:00');
                  return dob.getMonth() === cellDate.getMonth() && dob.getDate() === cellDate.getDate();
                })() : false;

                const ownLeave = leaveRequests.find(lr => {
                  if (lr.status === 'Rejected') return false;
                  return lr.employee_id === selectedCalendarProfile.id && dateStr >= lr.start_date && dateStr <= lr.end_date;
                });

                if (holiday) {
                  bgColor = 'rgba(239, 68, 68, 0.15)';
                  textColor = '#ef4444';
                  border = '1px solid rgba(239, 68, 68, 0.3)';
                  label = 'Holiday';
                } else if (ownLeave) {
                  bgColor = 'rgba(16, 185, 129, 0.15)';
                  textColor = '#10b981';
                  border = '1px solid rgba(16, 185, 129, 0.3)';
                  label = `Leave (${ownLeave.status === 'Pending' ? 'P' : 'A'})`;
                } else if (daySummary) {
                  const hasMissingEntry = (!daySummary.checkIn || !daySummary.checkOut) && (daySummary.status === 'Present' || daySummary.isLate);
                  if (hasMissingEntry) {
                    bgColor = 'rgba(239, 68, 68, 0.12)';
                    textColor = '#ef4444';
                    border = '2px solid rgba(239, 68, 68, 0.6)';
                    label = daySummary.checkIn ? 'No Check-Out' : daySummary.checkOut ? 'No Check-In' : 'Missing Entry';
                  } else if (daySummary.isAbsent) {
                    bgColor = 'rgba(239, 68, 68, 0.08)';
                    textColor = '#ef4444';
                    border = '1px solid rgba(239, 68, 68, 0.2)';
                    label = 'Uninformed Absent';
                  } else if (daySummary.isLate) {
                    bgColor = 'rgba(245, 158, 11, 0.08)';
                    textColor = '#f59e0b';
                    border = '1px solid rgba(245, 158, 11, 0.2)';
                    label = 'Late';
                  } else if (daySummary.status === 'Present') {
                    bgColor = 'rgba(16, 185, 129, 0.08)';
                    textColor = '#10b981';
                    border = '1px solid rgba(16, 185, 129, 0.2)';
                    label = 'Present';
                  } else if (daySummary.status === 'Sunday' || daySummary.status === 'Off Saturday') {
                    bgColor = 'rgba(255, 255, 255, 0.04)';
                    textColor = 'var(--text-muted)';
                    label = daySummary.status === 'Sunday' ? 'Sunday' : 'Off';
                  }
                }

                const currentSummary = daySummary || { date: dateStr, status: label || 'Uninformed Absent', isAbsent: !holiday && !ownLeave, workingHours: 0, overtimeHours: 0, overtimePayout: 0, checkIn: null, checkOut: null, dayName: '' } as DailySummary;

                cells.push(
                  <div
                    key={day}
                    onClick={() => handleAdminEmpCalendarDayClick(currentSummary)}
                    style={{
                      minHeight: '85px',
                      background: bgColor,
                      border,
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    className="dropdown-item-hover"
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{day}</span>
                    {isBirthday && (
                      <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: '700', textAlign: 'left' }}>🎂 Birthday</span>
                    )}
                    {label && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: textColor, 
                        textAlign: 'right', 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.02em' 
                      }}>
                        {label === 'Uninformed Absent' ? 'Absent' : label}
                      </span>
                    )}
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', width: '100%' }}>
                  {cells}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal: Employee Details Popup (on row click) */}
      {viewingProfileDetails && (() => {
        const getEmploymentDuration = (joiningDate: string) => {
          if (!joiningDate) return 'N/A';
          const start = new Date(joiningDate + 'T00:00:00');
          const end = new Date();
          
          let years = end.getFullYear() - start.getFullYear();
          let months = end.getMonth() - start.getMonth();
          let days = end.getDate() - start.getDate();
          
          if (days < 0) {
            months--;
            const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
            days += prevMonth.getDate();
          }
          if (months < 0) {
            years--;
            months += 12;
          }
          
          let durationStr = '';
          if (years > 0) {
            durationStr += `${years} yr${years > 1 ? 's' : ''} `;
          }
          if (months > 0) {
            durationStr += `${months} mo${months > 1 ? 's' : ''} `;
          }
          if (days > 0 || durationStr === '') {
            durationStr += `${days} day${days !== 1 ? 's' : ''}`;
          }
          return durationStr;
        };

        return (
          <div className="custom-overlay" style={{ zIndex: 10500 }}>
            <div className="custom-dialog-card glass-panel" style={{ padding: '28px', width: '500px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Employee Details</h3>
                <button 
                  type="button" 
                  onClick={() => { setViewingProfileDetails(null); setShowDetailsPassword(false); }} 
                  className="btn btn-secondary" 
                  style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>PIN:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{viewingProfileDetails.pin}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Full Name:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{viewingProfileDetails.full_name}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Email:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.email || 'N/A'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Password:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-primary)', fontFamily: showDetailsPassword ? 'monospace' : 'inherit' }}>
                      {showDetailsPassword ? (viewingProfileDetails.password || 'N/A') : '••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDetailsPassword(!showDetailsPassword)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      title={showDetailsPassword ? "Hide Password" : "Show Password"}
                    >
                      <img src={showDetailsPassword ? "/icons/eye-off.png" : "/icons/eye.png"} alt="view" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>NIC Number:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{(viewingProfileDetails as any).nic_no || 'N/A'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Payment Method:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{(viewingProfileDetails as any).payment_method || 'Bank'}</span>
                </div>
                {((viewingProfileDetails as any).payment_method || 'Bank') === 'Bank' ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Bank Name:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.bank_name || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Account Title:</span>
                      <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.bank_account_title || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Account No:</span>
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{viewingProfileDetails.bank_account_no || 'N/A'}</span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Details:</span>
                    <span style={{ color: '#10b981', fontWeight: '600' }}>Cash Payment</span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Department:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.department || 'N/A'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Designation:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.designation || 'N/A'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Joining Date:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.joining_date}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Birth Date:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.date_of_birth || 'N/A'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Base Salary:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Rs. {viewingProfileDetails.base_salary.toLocaleString()}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Hourly Rate:</span>
                  <span style={{ color: 'var(--text-primary)' }}>Rs. {viewingProfileDetails.hourly_rate.toLocaleString()}/hr</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Income Tax:</span>
                  <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Rs. {(viewingProfileDetails.income_tax || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Net Payable:</span>
                  <span style={{ color: 'var(--success)', fontWeight: '700', fontSize: '1.05rem' }}>Rs. {(viewingProfileDetails.base_salary - (viewingProfileDetails.income_tax || 0)).toLocaleString()}</span>
                </div>

                {/* Emergency Contacts List */}
                {((viewingProfileDetails as any).emergency_contacts || []).length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Emergency Contacts:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {((viewingProfileDetails as any).emergency_contacts).map((contact: any, i: number) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', padding: '6px 10px', background: 'var(--bg-surface-hover)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <strong>{contact.name}</strong> ({contact.relation}) - {contact.phone}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employment periods list &computed duration */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Employment periods:</span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Total Computed Duration: <strong>{getEmploymentDuration(viewingProfileDetails.joining_date)}</strong>
                  </div>
                  {((viewingProfileDetails as any).timeline_periods || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {((viewingProfileDetails as any).timeline_periods).map((period: any, i: number) => (
                        <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-primary)', padding: '6px 10px', background: 'var(--bg-surface-hover)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontWeight: '600' }}>{period.heading}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{period.startDate} to {period.endDate}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No other periods defined.</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setSelectedCalendarProfile(viewingProfileDetails);
                    setAdminViewYear(new Date().getFullYear());
                    setAdminViewMonth(new Date().getMonth());
                    setSelectedAdminEmpCalendarDayData(null);
                  }}
                  style={{ flex: 1, padding: '10px 16px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600 }}
                >
                  Monthly View (Calendar)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    handleEditProfileClick(viewingProfileDetails);
                    setViewingProfileDetails(null);
                    setIsAddEmployeeModalOpen(true);
                  }}
                  style={{ flex: 1, padding: '10px 16px', border: '1px solid var(--border-color)' }}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal: Office Calendar Day Details Dialog */}
      {selectedCalendarDayData && (
        <div className="custom-overlay" style={{ zIndex: 10050 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '24px', width: '460px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                Details for {new Date(selectedCalendarDayData.dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h3>
              <button 
                type="button" 
                onClick={() => setSelectedCalendarDayData(null)} 
                className="btn btn-secondary" 
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              {/* Holiday Info */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Holiday Status</h4>
                {selectedCalendarDayData.holiday ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#ef4444' }}>{selectedCalendarDayData.holiday.title}</strong>
                      {selectedCalendarDayData.holiday.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedCalendarDayData.holiday.description}</div>}
                    </div>
                    <button
                      onClick={() => {
                        handleDeleteHoliday(selectedCalendarDayData.holiday!.id!);
                        setSelectedCalendarDayData(null);
                      }}
                      className="btn btn-danger"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No holiday declared on this day.</span>
                    <button
                      onClick={() => {
                        setSelectedHolidayDate(selectedCalendarDayData.dateStr);
                        setIsHolidayModalOpen(true);
                        setSelectedCalendarDayData(null);
                      }}
                      className="btn btn-primary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Declare Holiday
                    </button>
                  </div>
                )}
              </div>

              {/* Birthdays Info */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Birthdays</h4>
                {selectedCalendarDayData.birthdays.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#f59e0b' }}>
                    {selectedCalendarDayData.birthdays.map(p => (
                      <li key={p.id} style={{ fontWeight: '600' }}>🎂 Happy Birthday: {p.full_name} ({p.department || 'Staff'})</li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No employee birthdays on this day.</span>
                )}
              </div>

              {/* Leaves Info */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Active Leaves</h4>
                {selectedCalendarDayData.leaves.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedCalendarDayData.leaves.map(lr => (
                      <div key={lr.id} style={{ fontSize: '0.8rem', padding: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{lr.employeeName}</strong>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600,
                            background: lr.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: lr.status === 'Approved' ? '#10b981' : '#f59e0b'
                          }}>{lr.status}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>Type: {lr.leave_type}</div>
                        {lr.reason && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>Reason: "{lr.reason}"</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No employees on leave on this day.</span>
                )}
              </div>

              {/* Employee Attendance List */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>Employee Attendance</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {selectedCalendarDayData.attendanceList.map(att => {
                    const statusColor = att.status === 'Present' ? '#10b981' :
                                        att.status === 'Late' ? '#f59e0b' :
                                        att.status.includes('Leave') ? '#8b5cf6' :
                                        att.status === 'Holiday' ? '#ef4444' : '#ef4444';
                    const statusBg = att.status === 'Present' ? 'rgba(16, 185, 129, 0.1)' :
                                     att.status === 'Late' ? 'rgba(245, 158, 11, 0.1)' :
                                     att.status.includes('Leave') ? 'rgba(139, 92, 246, 0.1)' :
                                     att.status === 'Holiday' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)';

                    return (
                      <div key={att.pin} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                          <strong>{att.employeeName}</strong>{' '}
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>({att.pin})</span>
                          {(att.checkIn || att.checkOut) && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Punches: {att.checkIn || '-'} to {att.checkOut || '-'}
                            </div>
                          )}
                        </div>
                        <span style={{
                          padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: '700',
                          color: statusColor, background: statusBg, border: `1px solid ${statusColor}33`
                        }}>
                          {att.status === 'Uninformed Absent' ? 'Absent' : att.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Employee Specific Calendar Day Details Dialog */}
      {selectedAdminEmpCalendarDayData && (
        <div className="custom-overlay" style={{ zIndex: 12050 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '24px', width: '400px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                Day Details: {selectedAdminEmpCalendarDayData.dateStr}
              </h3>
              <button 
                type="button" 
                onClick={() => setSelectedAdminEmpCalendarDayData(null)} 
                className="btn btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left', fontSize: '0.85rem' }}>
              <div>
                <strong>Status:</strong>{' '}
                <span style={{
                  fontWeight: '700',
                  color: selectedAdminEmpCalendarDayData.holiday ? '#ef4444' :
                         selectedAdminEmpCalendarDayData.ownLeave ? '#10b981' :
                         selectedAdminEmpCalendarDayData.daySummary?.isAbsent ? '#ef4444' :
                         selectedAdminEmpCalendarDayData.daySummary?.isLate ? '#f59e0b' : '#10b981'
                }}>
                  {selectedAdminEmpCalendarDayData.holiday ? `Holiday (${selectedAdminEmpCalendarDayData.holiday.title})` :
                   selectedAdminEmpCalendarDayData.ownLeave ? `On Leave (${selectedAdminEmpCalendarDayData.ownLeave.leave_type})` :
                   selectedAdminEmpCalendarDayData.daySummary?.status || 'Uninformed Absent'}
                </span>
              </div>

              {selectedAdminEmpCalendarDayData.isBirthday && (
                <div style={{ color: '#f59e0b', fontWeight: '600' }}>
                  🎂 Today is this employee's birthday!
                </div>
              )}

              {selectedAdminEmpCalendarDayData.ownLeave && (
                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontWeight: '600', color: '#10b981' }}>Leave Request Details:</div>
                  <div>Status: {selectedAdminEmpCalendarDayData.ownLeave.status}</div>
                  {selectedAdminEmpCalendarDayData.ownLeave.reason && (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Reason: "{selectedAdminEmpCalendarDayData.ownLeave.reason}"</div>
                  )}
                </div>
              )}

              {selectedAdminEmpCalendarDayData.daySummary && !selectedAdminEmpCalendarDayData.holiday && !selectedAdminEmpCalendarDayData.ownLeave && (
                <>
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><strong>Check In:</strong> {selectedAdminEmpCalendarDayData.daySummary.checkIn || '-'}</div>
                    <div><strong>Check Out:</strong> {selectedAdminEmpCalendarDayData.daySummary.checkOut || '-'}</div>
                    <div><strong>Working Hours:</strong> {selectedAdminEmpCalendarDayData.daySummary.workingHours > 0 ? `${selectedAdminEmpCalendarDayData.daySummary.workingHours} hrs` : '-'}</div>
                    <div><strong>Overtime Hours:</strong> {selectedAdminEmpCalendarDayData.daySummary.overtimeHours > 0 ? `${selectedAdminEmpCalendarDayData.daySummary.overtimeHours} hrs` : '-'}</div>
                    <div><strong>Overtime Payout:</strong> {selectedAdminEmpCalendarDayData.daySummary.overtimePayout > 0 ? formatSalary(selectedAdminEmpCalendarDayData.daySummary.overtimePayout) : '-'}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showBirthdayEffect && (
        <>
          <ConfettiCanvas />
          <div className="custom-overlay" style={{ zIndex: 99998 }}>
            <div className="custom-dialog-card glass-panel" style={{ padding: '32px', width: '380px', textAlign: 'center', alignItems: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12"></polyline>
                  <rect x="2" y="7" width="20" height="5"></rect>
                  <line x1="12" y1="22" x2="12" y2="7"></line>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Happy Birthday!</h3>
              <p style={{ margin: '12px 0 24px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                Happy Birthday! Wishing you a wonderful day filled with joy, health, and success.
              </p>
              <button 
                onClick={() => setShowBirthdayEffect(false)} 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '10px' }}
              >
                Thank You
              </button>
            </div>
          </div>
        </>
      )}
      {/* Edit Attendance Correction Dialog Modal */}
      {editingCorrectionComplaint && (
        <div className="custom-overlay" style={{ zIndex: 12000 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Edit & Approve Correction</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Employee: <strong>{profiles.find(p => p.id === editingCorrectionComplaint.employee_id)?.full_name || 'Unknown'}</strong>
            </p>
            <form onSubmit={handleSaveAndApproveCorrection} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={styles.formGroup}>
                <label>Date *</label>
                <input
                  type="date"
                  value={editCorrectionDate}
                  onChange={e => setEditCorrectionDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Requested Check-In (e.g. 11:30 AM or 11:30)</label>
                <input
                  type="text"
                  value={editCorrectionCheckIn}
                  onChange={e => setEditCorrectionCheckIn(e.target.value)}
                  placeholder="e.g. 11:00 AM"
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label>Requested Check-Out (e.g. 08:00 PM or 20:00)</label>
                <input
                  type="text"
                  value={editCorrectionCheckOut}
                  onChange={e => setEditCorrectionCheckOut(e.target.value)}
                  placeholder="e.g. 08:00 PM"
                  style={styles.input}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCorrectionComplaint(null)} style={{ padding: '8px 16px' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" style={{ padding: '8px 18px', fontSize: '0.85rem', fontWeight: 600 }}>
                  Approve & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Presents Today Popup Modal */}
      {showPresentsModal && (
        <div className="custom-overlay" style={{ zIndex: 11500 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '24px', width: '640px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '85vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Presents Today Breakdown</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Total Present: <strong>{totalPresentsToday}</strong> ({activeCheckedInCount} Active | {completedShiftCount} Completed)
                </span>
              </div>
              <button onClick={() => setShowPresentsModal(false)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                Close
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
              {Object.keys(presentsByDept).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No employees present today yet.</div>
              ) : (
                Object.entries(presentsByDept).map(([dept, items]) => (
                  <div key={dept} style={{ background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '14px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{dept}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{items.length} Present</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {items.map(({ emp, checkIn, checkOut, status, isLate, shiftTiming }) => (
                        <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)' }}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{emp.full_name}</strong>{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({emp.pin})</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Shift: {shiftTiming}</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isLate && (
                              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontWeight: 600 }}>
                                Late Arrival
                              </span>
                            )}
                            <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 'var(--radius-full)', background: status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(6, 182, 212, 0.15)', color: status === 'Active' ? '#10b981' : '#06b6d4', fontWeight: 600 }}>
                              {status === 'Active' ? 'Active On Duty' : 'Shift Completed'}
                            </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, marginLeft: '4px' }}>
                              In: {checkIn} {checkOut ? `| Out: ${checkOut}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Absents Today Popup Modal */}
      {showAbsentsModal && (
        <div className="custom-overlay" style={{ zIndex: 11500 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '24px', width: '640px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '85vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>Absents Today Breakdown</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Total Absent Today: <strong style={{ color: 'var(--danger)' }}>{absentsTodayCount}</strong>
                </span>
              </div>
              <button onClick={() => setShowAbsentsModal(false)} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
                Close
              </button>
            </div>

            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
              {Object.keys(absentsByDept).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No unexcused absents today! Everyone is present or on approved leave.</div>
              ) : (
                Object.entries(absentsByDept).map(([dept, items]) => (
                  <div key={dept} style={{ background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '14px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{dept}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{items.length} Absent</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {items.map(({ emp, monthLeaves, monthAbsences }) => (
                        <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '10px 14px', borderRadius: 'var(--radius-xs)', background: 'var(--bg-surface)' }}>
                          <div>
                            <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>{emp.full_name}</strong>{' '}
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({emp.pin})</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.designation || 'Staff'}</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              This Month: <strong style={{ color: '#8b5cf6' }}>{monthLeaves} Leaves</strong> | <strong style={{ color: '#ef4444' }}>{monthAbsences} Absences</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAbsentsModal(false);
                                setSelectedCalendarProfile(emp);
                                setAdminViewYear(calendarYear);
                                setAdminViewMonth(calendarMonth);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                            >
                              Calendar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Salaries & PDF Options Modal */}
      {isExportModalOpen && (
        <div className="custom-overlay" style={{ zIndex: 11000 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '28px', width: '480px', maxWidth: '90vw', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Export Salaries Options
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {/* Target Selector */}
              <div style={styles.formGroup}>
                <label>Export Target Scope</label>
                <select 
                  value={exportTarget} 
                  onChange={e => setExportTarget(e.target.value as any)}
                  className="custom-select"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="all">All Employees</option>
                  <option value="department">By Department</option>
                  <option value="employee">Specific Employee</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div style={styles.formGroup}>
                <label>Filter by Payment Method</label>
                <select 
                  value={exportPaymentFilter} 
                  onChange={e => setExportPaymentFilter(e.target.value as any)}
                  className="custom-select"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="all">All Payment Methods</option>
                  <option value="Bank">Bank Transfer Only</option>
                  <option value="Cash">Cash Payment Only</option>
                </select>
              </div>

              {/* Department Dropdown (conditional) */}
              {exportTarget === 'department' && (
                <div style={styles.formGroup} className="animate-fade-in">
                  <label>Select Department</label>
                  <select 
                    value={exportSelectedDept} 
                    onChange={e => setExportSelectedDept(e.target.value)}
                    className="custom-select"
                    style={{ cursor: 'pointer' }}
                  >
                    {departmentsList.map((d, idx) => (
                      <option key={idx} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Employee Dropdown (conditional) */}
              {exportTarget === 'employee' && (
                <div style={styles.formGroup} className="animate-fade-in">
                  <label>Select Employee</label>
                  <select 
                    value={exportSelectedEmployeeId} 
                    onChange={e => setExportSelectedEmployeeId(e.target.value)}
                    className="custom-select"
                    style={{ cursor: 'pointer' }}
                  >
                    {profiles.filter(p => p.role !== 'admin').map(p => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.pin})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Column Selection Checkboxes */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Columns to Include:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.pin} 
                      onChange={e => setExportCols(prev => ({ ...prev, pin: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Employee PIN</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.name} 
                      onChange={e => setExportCols(prev => ({ ...prev, name: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Employee Name</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.dept} 
                      onChange={e => setExportCols(prev => ({ ...prev, dept: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Department</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.designation} 
                      onChange={e => setExportCols(prev => ({ ...prev, designation: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Designation</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.base_salary} 
                      onChange={e => setExportCols(prev => ({ ...prev, base_salary: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Base Salary</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.income_tax} 
                      onChange={e => setExportCols(prev => ({ ...prev, income_tax: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Income Tax</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.net_salary} 
                      onChange={e => setExportCols(prev => ({ ...prev, net_salary: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Net Salary</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.bank_name} 
                      onChange={e => setExportCols(prev => ({ ...prev, bank_name: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Bank Name</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.bank_account_title} 
                      onChange={e => setExportCols(prev => ({ ...prev, bank_account_title: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Account Title</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontSize: '0.85rem' }}>
                    <input 
                      type="checkbox" 
                      checked={exportCols.bank_account_no} 
                      onChange={e => setExportCols(prev => ({ ...prev, bank_account_no: e.target.checked }))} 
                      style={{ width: '16px', height: '16px', margin: 0 }}
                    />
                    <span>Account No</span>
                  </label>
                </div>
              </div>

              {/* Template Style Choice */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                <input 
                  type="checkbox" 
                  id="chkUseLetterhead"
                  checked={exportUseLetterhead}
                  onChange={e => setExportUseLetterhead(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="chkUseLetterhead" style={{ margin: 0, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                  Print on Official Letterhead (Salry.png)
                </label>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsExportModalOpen(false)}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleExportPrint}
                  style={{ padding: '8px 24px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 'bold' }}
                >
                  Export & Print
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Admin Change Password Modal */}
      {isAdminChangePasswordModalOpen && (
        <div className="custom-overlay" style={{ zIndex: 11000 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '24px', width: '420px', maxWidth: '90vw', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Change Admin Password
            </h3>
            <form onSubmit={handleAdminChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div style={styles.formGroup}>
                <label>New Password *</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={adminNewPassword}
                  onChange={e => setAdminNewPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Confirm Password *</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={adminConfirmPassword}
                  onChange={e => setAdminConfirmPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsAdminChangePasswordModalOpen(false);
                    setAdminNewPassword('');
                    setAdminConfirmPassword('');
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminPasswordChangeLoading}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sliding Notifications Drawer (Root-level to avoid z-index stacking issues) */}
      {showNotificationsDropdown && (
        <>
          {/* Backdrop Overlay */}
          <div 
            onClick={() => setShowNotificationsDropdown(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 99999,
              animation: 'overlayFadeIn 0.2s ease-out'
            }}
          />
          
          {/* Sliding Drawer */}
          <div className="glass-panel animate-slide-in-right" style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '380px',
            maxWidth: '90vw',
            height: '100vh',
            overflowY: 'auto',
            zIndex: 100000,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: '0',
            borderLeft: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img src="/icons/bell.png" alt="bell" className="theme-icon" style={{ width: '18px', height: '18px' }} />
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: '700' }}>Notifications</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {notificationsList.filter(n => !n.is_read).length > 0 && (
                  <button 
                    onClick={handleMarkAllNotificationsRead}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Mark all read
                  </button>
                )}
                <button 
                  onClick={() => setShowNotificationsDropdown(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                >
                  <img src="/icons/x.png" alt="close" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
              {notificationsList.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: '12px', color: 'var(--text-muted)' }}>
                  <img src="/icons/check-circle.png" alt="empty" className="theme-icon" style={{ width: '36px', height: '36px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>
                    All caught up! No notifications.
                  </p>
                </div>
              ) : (
                notificationsList.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => handleMarkNotificationRead(n.id!, n)}
                    style={{
                      background: n.is_read ? 'rgba(255, 255, 255, 0.01)' : 'var(--bg-surface-hover)',
                      border: `1px solid ${n.is_read ? 'var(--border-color)' : 'var(--border-color-glow)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      position: 'relative',
                      transition: 'all var(--transition-fast)'
                    }}
                    className="dropdown-item-hover"
                  >
                    {!n.is_read && (
                      <span style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#ef4444'
                      }} />
                    )}
                    <div style={{ fontWeight: n.is_read ? '500' : '700', fontSize: '0.85rem', color: 'var(--text-primary)', paddingRight: '12px' }}>{n.title}</div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{n.message}</p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '8px' }}>
                      {new Date(n.created_at || '').toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
    color: 'var(--text-secondary)'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid var(--border-color)',
    borderTopColor: 'var(--primary)',
    borderRadius: '50%',
  },
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    gap: '24px'
  },
  navbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderRadius: 'var(--radius-md)'
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  navTitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    letterSpacing: '0.05em',
    color: 'var(--text-primary)'
  },
  badge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    backgroundColor: 'var(--badge-bg)',
    border: '1px solid var(--badge-border)',
    color: 'var(--badge-text)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-full)',
    marginLeft: '6px'
  },
  navUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  navUsername: {
    fontWeight: '500',
    color: 'var(--text-primary)'
  },
  toggleBtn: {
    padding: '6px 10px',
    fontSize: '0.9rem',
    borderRadius: '8px',
  },
  logoutBtn: {
    padding: '6px 12px',
    fontSize: '0.85rem'
  },
  tabsRow: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    paddingBottom: '2px'
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all var(--transition-fast)',
  },
  overviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  metricCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px'
  },
  metricCard: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  dashboardSplit: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap'
  },
  splitCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  syncInfoBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    padding: '16px',
    borderRadius: 'var(--radius-sm)'
  },
  syncIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#10b981',
    fontSize: '0.9rem'
  },
  activeDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 10px #10b981'
  },
  infoBullets: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginTop: '6px'
  },
  policySummary: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)'
  },
  splitLayout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    alignItems: 'flex-start'
  },
  panel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: '300px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  tableRow: {
    borderBottom: '1px solid var(--border-color)',
    transition: 'background-color 0.2s ease',
  },
  tableCell: {
    padding: '14px 10px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)'
  },
  actionCell: {
    display: 'flex',
    gap: '8px'
  },
  iconBtn: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  dateRow: {
    display: 'flex',
    gap: '12px'
  },
  btnGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '6px'
  },
  formAlert: {
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    border: '1px solid'
  },
  uploadBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px'
  },
  dropzone: {
    border: '2px dashed rgba(139, 92, 246, 0.3)',
    borderRadius: 'var(--radius-md)',
    padding: '30px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    background: 'rgba(139, 92, 246, 0.02)',
    transition: 'all 0.3s ease',
    textAlign: 'center'
  },
  statusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(6, 182, 212, 0.08)',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    color: '#06b6d4',
    fontSize: '0.85rem'
  },
  alertBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
    color: '#f59e0b',
    fontSize: '0.85rem'
  },
  actionBtn: {
    padding: '4px 10px',
    fontSize: '0.85rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  statusTag: {
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block'
  },
  payrollHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '8px'
  },
  payrollDates: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  dateInputs: {
    display: 'flex',
    gap: '12px'
  },
  dateGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  payrollActions: {
    display: 'flex',
    gap: '12px'
  }
};
