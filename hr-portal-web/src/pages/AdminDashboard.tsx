import React, { useState, useEffect, useRef } from 'react';
import { 
  getProfiles, 
  saveProfile, 
  deleteProfile, 
  getLeaveRequests, 
  updateLeaveRequestStatus,
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
import { processAttendanceLogs } from '../utils/attendanceProcessor';
import { isOffSaturday } from '../utils/attendanceProcessor';
import type { EmployeeProfile, LeaveRequest, RawLog, DailySummary } from '../utils/attendanceProcessor';
import * as XLSX from 'xlsx';
import SearchableDropdown from '../components/SearchableDropdown';
import ConfettiCanvas from '../components/ConfettiCanvas';
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
  const [announceTargetType, setAnnounceTargetType] = useState<'all' | 'department' | 'designation'>('all');
  const [announceTargetValue, setAnnounceTargetValue] = useState('');

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
  const [timingTargetType, setTimingTargetType] = useState<'designation' | 'department' | 'employee'>('designation');
  const [timingTargetId, setTimingTargetId] = useState('');
  const [timingStartTime, setTimingStartTime] = useState('09:00');
  const [timingEndTime, setTimingEndTime] = useState('18:00');
  const [timingDays, setTimingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

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
        target_value: announceTargetType === 'all' ? undefined : announceTargetValue
      });

      // Create broadcast notification for all employees
      try {
        await createNotification({
          user_id: null,
          title: 'New Announcement',
          message: `${announceTitle.trim()}: ${announceMessage.trim().substring(0, 60)}${announceMessage.trim().length > 60 ? '...' : ''}`
        });
      } catch (e) {
        /* console removed */
      }

      // Clear draft on success
      localStorage.removeItem('draft_announcement');

      setAnnounceTitle('');
      setAnnounceMessage('');
      setAnnounceTargetValue('');

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
        income_tax: parseFloat(incomeTax) || 0
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.customAlert('Please allow popups to export the PDF.');
      return;
    }

    const title = 'Employee Salaries Report';
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let rowsHtml = '';
    profiles.filter(p => p.role !== 'admin').forEach(p => {
      const netSalary = p.base_salary - (p.income_tax || 0);
      rowsHtml += `
        <tr>
          <td>${p.pin}</td>
          <td>${p.full_name}</td>
          <td>${p.department || '-'}</td>
          <td>${p.designation || '-'}</td>
          <td style="text-align: right;">Rs. ${p.base_salary.toLocaleString()}</td>
          <td style="text-align: right; color: #ef4444;">Rs. ${(p.income_tax || 0).toLocaleString()}</td>
          <td style="text-align: right; font-weight: 700; color: #10b981;">Rs. ${netSalary.toLocaleString()}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Outfit', sans-serif;
            color: #1f2937;
            margin: 40px;
            background: #ffffff;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
            position: relative;
          }
          .logo {
            height: 60px;
            width: auto;
            max-width: 200px;
            display: block;
            margin: 0 auto 10px auto;
            filter: invert(1);
            object-fit: contain;
          }
          h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 700;
            color: #111827;
          }
          .date {
            font-size: 0.85rem;
            color: #6b7280;
            margin-top: 5px;
          }
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
          tr:nth-child(even) {
            background-color: #fafafa;
          }
          .summary {
            margin-top: 30px;
            text-align: right;
            font-size: 0.9rem;
            color: #4b5563;
          }
          @media print {
            body { margin: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/icons/logo.png" alt="logo" class="logo" onerror="this.style.display='none'" />
          <h1>Elipse HR Portal</h1>
          <div style="font-weight: 600; font-size: 1.1rem; color: #4b5563; margin-top: 4px;">Employee Salaries & Net Payables</div>
          <div class="date">Report generated on ${dateStr}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>PIN</th>
              <th>Name</th>
              <th>Department</th>
              <th>Designation</th>
              <th style="text-align: right;">Base Salary</th>
              <th style="text-align: right;">Income Tax</th>
              <th style="text-align: right;">Net Salary</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary">
          Total Employees: <strong>${profiles.filter(p => p.role !== 'admin').length}</strong>
        </div>

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

    window.showLoading('Saving shift timings...');
    try {
      await saveShiftTiming({
        target_type: timingTargetType,
        target_id: timingTargetId,
        target_name: targetName,
        start_time: timingStartTime + ':00',
        end_time: timingEndTime + ':00',
        days: timingDays
      });
      setIsAddTimingModalOpen(false);
      setTimingTargetId('');
      setTimingStartTime('09:00');
      setTimingEndTime('18:00');
      setTimingDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
      fetchData();
      window.customAlert('Shift timings saved successfully.');
    } catch (err: any) {
      /* console removed */
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
    window.showLoading(`Setting leave request to ${status.toLowerCase()}...`);
    try {
      await updateLeaveRequestStatus(id, status);
      
      const req = leaveRequests.find(r => r.id === id);
      if (req) {
        try {
          await createNotification({
            user_id: req.employee_id,
            title: `Leave Request ${status}`,
            message: `Your leave request for ${req.leave_type} (${req.start_date} to ${req.end_date}) has been ${status.toLowerCase()}.`
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

  const getEmployeeShiftTiming = (emp: EmployeeProfile) => {
    const empRule = shiftTimings.find(t => t.target_type === 'employee' && t.target_id === emp.id);
    if (empRule) return { startTime: empRule.start_time, endTime: empRule.end_time };
    
    if (emp.designation) {
      const desigRule = shiftTimings.find(t => t.target_type === 'designation' && t.target_id === emp.designation);
      if (desigRule) return { startTime: desigRule.start_time, endTime: desigRule.end_time };
    }
    
    if (emp.department) {
      const deptRule = shiftTimings.find(t => t.target_type === 'department' && t.target_id === emp.department);
      if (deptRule) return { startTime: deptRule.start_time, endTime: deptRule.end_time };
    }
    
    return { startTime: '11:00', endTime: '20:00' };
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

  const getEmployeeCalendarData = () => {
    if (!selectedCalendarProfile) return [];
    
    const pad = (num: number) => num.toString().padStart(2, '0');
    const lastDay = new Date(adminViewYear, adminViewMonth + 1, 0).getDate();
    const startStr = `${adminViewYear}-${pad(adminViewMonth + 1)}-01`;
    const endStr = `${adminViewYear}-${pad(adminViewMonth + 1)}-${pad(lastDay)}`;
    
    const holidayDates = holidaysList.map(h => h.date);
    const employeeLeaves = leaveRequests.filter(lr => lr.employee_id === selectedCalendarProfile.id);
    const timing = getEmployeeShiftTiming(selectedCalendarProfile);
    
    return processAttendanceLogs(
      selectedCalendarProfile,
      selectedCalendarLogs,
      employeeLeaves,
      startStr,
      endStr,
      holidayDates,
      graceTimeMinsSetting,
      timing.startTime,
      timing.endTime
    );
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
  const activeLeavesToday = leaveRequests.filter(l => {
    const today = new Date().toLocaleDateString('en-CA');
    return l.status === 'Approved' && today >= l.start_date && today <= l.end_date;
  }).length;

  const totalRawLogsCount = rawLogs.length;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const checkedInTodayCount = new Set(
    rawLogs
      .filter(l => {
        const logDateStr = new Date(l.timestamp).toLocaleDateString('en-CA');
        return logDateStr === todayStr;
      })
      .map(l => l.employee_pin)
  ).size;

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
            <div className="glass-panel" style={styles.metricCard}>
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

            <div className="glass-panel" style={styles.metricCard}>
              <img 
                src="/icons/calendar.png" 
                alt="attendance" 
                className="theme-icon" 
                style={{ width: '32px', height: '32px' }} 
              />
              <div>
                <h2>{checkedInTodayCount}</h2>
                <span>Presents Today</span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <img 
                src="/icons/file-text.png" 
                alt="leaves" 
                className="theme-icon" 
                style={{ width: '32px', height: '32px' }} 
              />
              <div>
                <h2>{activeLeavesToday}</h2>
                <span>Employees on Leave Today</span>
              </div>
            </div>

            <div className="glass-panel" style={styles.metricCard}>
              <img 
                src="/icons/clock.png" 
                alt="raw" 
                className="theme-icon" 
                style={{ width: '32px', height: '32px' }} 
              />
              <div>
                <h2>{totalRawLogsCount}</h2>
                <span>Raw Sync Punches</span>
              </div>
            </div>
          </div>

          {/* Quick Info & Guidelines */}
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Office Policies Summary</h3>
            <div style={{ ...styles.policySummary, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div><strong>Office Hours:</strong> 11:00 AM - 08:00 PM (9 hrs)</div>
              <div><strong>Grace Period:</strong> 5 mins (Late after 11:05 AM)</div>
              <div><strong>Saturdays:</strong> Alternate Saturdays off (2nd & 4th)</div>
              <div><strong>Overtime:</strong> Starts after 08:00 PM (Paid at 50% rate)</div>
            </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dept:</span>
                <select
                  value={deptFilter}
                  onChange={e => setDeptFilter(e.target.value)}
                  style={{ width: '170px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <option value="">All Departments</option>
                  {departmentsList.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Designation Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Designation:</span>
                <select
                  value={desigFilter}
                  onChange={e => setDesigFilter(e.target.value)}
                  style={{ width: '170px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  <option value="">All Designations</option>
                  {designationsList.map((d, idx) => (
                    <option key={idx} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Employee Search Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Period:</span>
                <select
                  value={adminEmpMonth}
                  onChange={e => setAdminEmpMonth(parseInt(e.target.value))}
                  style={{ width: '110px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <option key={i} value={i}>{m}</option>
                  ))}
                </select>
                <select
                  value={adminEmpYear}
                  onChange={e => setAdminEmpYear(parseInt(e.target.value))}
                  style={{ width: '90px', padding: '8px 12px', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer' }}
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
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px', borderRadius: 'var(--radius-md)' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Global Shift Settings</h4>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Adjustable Grace Time (Minutes)</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    value={graceTimeMinsSetting} 
                    onChange={e => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setGraceTimeMinsSetting(val);
                      localStorage.setItem('office_grace_time_mins', val.toString());
                    }} 
                    style={{ ...styles.input, width: '80px', height: '36px', padding: '6px 10px', textAlign: 'center' }} 
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>minutes</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px', lineHeight: '1.4' }}>
                Shift starts are flexible after 6:00 AM. Any checkout after 9 completed hours is paid overtime. Grace time cutoff is applied at 11:00 AM (11:00 AM + grace time). Late check-ins can recover lateness via overtime sitting at a 2:1 ratio.
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
                          <strong>{t.start_time.substring(0, 5)}</strong> to <strong>{t.end_time.substring(0, 5)}</strong>
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
                          <button onClick={() => handleDeleteShiftTimingClick(t.id!)} style={styles.iconBtn} title="Delete Timing Rule">
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
                    <th style={{ textAlign: 'right' }}>Actions</th>
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
                              backgroundColor: c.status === 'Resolved' ? 'rgba(16, 185, 129, 0.08)' : c.status === 'In Progress' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                              color: c.status === 'Resolved' ? '#10b981' : c.status === 'In Progress' ? '#f59e0b' : '#ef4444',
                              border: c.status === 'Resolved' ? '1px solid rgba(16, 185, 129, 0.2)' : c.status === 'In Progress' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                              {c.status}
                            </span>
                          </td>
                          <td style={{ ...styles.tableCell, textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {c.title === 'Check In/Out Entry Correction' && c.status !== 'Resolved' && (
                              <>
                                <button 
                                  onClick={() => handleApproveAttendanceCorrection(c)}
                                  className="btn btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.85rem', background: 'var(--success)', color: 'white', border: 'none' }}
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
                                  style={{ padding: '4px 8px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}
                                >
                                  Edit & Approve
                                </button>
                              </>
                            )}
                            {c.status !== 'In Progress' && c.status !== 'Resolved' && (
                              <button 
                                onClick={() => handleUpdateComplaintStatus(c.id!, 'In Progress')}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}
                              >
                                In Progress
                              </button>
                            )}
                            {c.status !== 'Resolved' && (
                              <button 
                                onClick={() => handleUpdateComplaintStatus(c.id!, 'Resolved')}
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.85rem', background: 'var(--primary)', color: 'var(--btn-primary-text)' }}
                              >
                                Resolve
                              </button>
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
                        <td style={styles.tableCell}><strong>{ann.title}</strong></td>
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
                </select>
              </div>

              {announceTargetType !== 'all' && (
                <div style={styles.formGroup}>
                  <label>Select {announceTargetType === 'department' ? 'Department' : 'Designation'} *</label>
                  <select
                    value={announceTargetValue}
                    onChange={e => setAnnounceTargetValue(e.target.value)}
                    className="custom-select"
                    required
                  >
                    <option value="">-- Choose {announceTargetType === 'department' ? 'Department' : 'Designation'} --</option>
                    {(announceTargetType === 'department' ? departmentsList : designationsList).map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontWeight: 600 }}>
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
        <div className="custom-overlay">
          <div className="custom-dialog-card" style={{ maxWidth: '540px', textAlign: 'left', alignItems: 'stretch' }}>
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
              Add Shift Timing Rule
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
                  Save Timing
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddTimingModalOpen(false);
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
                  Employee: <strong>{selectedCalendarProfile.full_name} (PIN: {selectedCalendarProfile.pin})</strong>
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
      {viewingProfileDetails && (
        <div className="custom-overlay" style={{ zIndex: 10500 }}>
          <div className="custom-dialog-card glass-panel" style={{ padding: '28px', width: '460px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Employee Details</h3>
              <button 
                type="button" 
                onClick={() => setViewingProfileDetails(null)} 
                className="btn btn-secondary" 
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>PIN:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{viewingProfileDetails.pin}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Full Name:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{viewingProfileDetails.full_name}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Email:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.email || 'N/A'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Department:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.department || 'N/A'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Designation:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.designation || 'N/A'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Joining Date:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.joining_date}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Birth Date:</span>
                <span style={{ color: 'var(--text-primary)' }}>{viewingProfileDetails.date_of_birth || 'N/A'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Base Salary:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Rs. {viewingProfileDetails.base_salary.toLocaleString()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Hourly Rate:</span>
                <span style={{ color: 'var(--text-primary)' }}>Rs. {viewingProfileDetails.hourly_rate.toLocaleString()}/hr</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Income Tax:</span>
                <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Rs. {(viewingProfileDetails.income_tax || 0).toLocaleString()}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Net Payable:</span>
                <span style={{ color: 'var(--success)', fontWeight: '700', fontSize: '1.05rem' }}>Rs. {(viewingProfileDetails.base_salary - (viewingProfileDetails.income_tax || 0)).toLocaleString()}</span>
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
      )}

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
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', background: 'var(--success)', border: 'none', color: 'white' }}>
                  Approve & Save
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
