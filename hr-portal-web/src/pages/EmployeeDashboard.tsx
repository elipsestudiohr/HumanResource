import React, { useState, useEffect, useRef } from 'react';
import { 
  getPublicProfiles, 
  getProfileById,
  getLeaveBalances, 
  getLeaveRequests, 
  getRawLogs, 
  createLeaveRequest, 
  deleteLeaveRequest, 
  getComplaints, 
  createComplaint, 
  deleteComplaint, 
  getAnnouncements, 
  getNotifications, 
  createNotification, 
  markNotificationRead, 
  markAllNotificationsRead, 
  getHolidays, 
  checkAndTriggerBirthdayNotifications, 
  getShiftTimings, 
  getDeviceSettings, 
  getApprovedAttendanceCorrections, 
  getEmployeeLoans, 
  createEmployeeLoan, 
  deleteEmployeeLoan 
} from '../lib/dbHelper';
import { supabase } from '../lib/supabase';
import type { Complaint, Announcement, Notification, Holiday, ShiftTiming, ApprovedCorrection, EmployeeLoan } from '../lib/dbHelper';
import { processAttendanceLogs, calculateEmployeePayrollSummary, getEmployeeShiftTiming, formatOvertimeDuration, formatClockDuration } from '../utils/attendanceProcessor';
import { fetchTrustedDeviceFromDb, registerBiometricDevice, disableBiometricDevice } from '../utils/biometricAuth';
import type { TrustedDeviceRecord } from '../utils/biometricAuth';
import type { DailySummary, EmployeeProfile, LeaveRequest, RawLog, EmployeePayrollSummary } from '../utils/attendanceProcessor';
import ConfettiCanvas from '../components/ConfettiCanvas';
import styles, { getStatusTagStyle } from './employee/EmployeeStyles';
import DashboardTab from './employee/tabs/DashboardTab';
import LogsTab from './employee/tabs/LogsTab';
import LeavesTab from './employee/tabs/LeavesTab';
import HelpdeskTab from './employee/tabs/HelpdeskTab';
import EmployeeModals from './employee/modals/EmployeeModals';

interface EmployeeDashboardProps {
  user: any;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const getAdminIds = async (supabase: any): Promise<string[]> => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, role')
      .or('role.eq.admin,email.eq.elipsestudiohr@gmail.com');
    if (data && data.length > 0) {
      const ids = data.map((r: any) => r.id).filter(Boolean);
      return Array.from(new Set(['admin', ...ids]));
    }
  } catch (e) {
    /* console removed */
  }
  return ['admin'];
};



export default function EmployeeDashboard({ user, onLogout, theme, toggleTheme }: EmployeeDashboardProps) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<EmployeeProfile[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

  // Form State
  const [leaveType, setLeaveType] = useState<'Casual' | 'Medical' | 'Annual'>('Casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSingleDayLeave, setIsSingleDayLeave] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Modal and tabs
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<'calendar' | 'table'>('calendar');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<DailySummary | null>(null);
  const [employeeDashboardTab, setEmployeeDashboardTab] = useState<'dashboard' | 'logs' | 'leaves' | 'helpdesk'>('dashboard');
  const [userRawLogs, setUserRawLogs] = useState<RawLog[]>([]);
  const [empLogSearch, setEmpLogSearch] = useState('');
  const [empLogDateFilter, setEmpLogDateFilter] = useState('');
  const [empLogStatusFilter, setEmpLogStatusFilter] = useState('');
  const [holidaysList, setHolidaysList] = useState<Holiday[]>([]);
  // Helpdesk complaints states
  const [complaintsList, setComplaintsList] = useState<Complaint[]>([]);

  // Checkbox selection & history clearing states
  const [selectedLeaveIds, setSelectedLeaveIds] = useState<number[]>([]);
  const [selectedComplaintIds, setSelectedComplaintIds] = useState<number[]>([]);
  const [hiddenLeaveIds, setHiddenLeaveIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(`hidden_leaves_${profile?.id || 'emp'}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  });
  const [hiddenComplaintIds, setHiddenComplaintIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(`hidden_complaints_${profile?.id || 'emp'}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  });

  // Handle deleting selected leave requests
  const handleDeleteLeaveRequests = async (idsToDelete: number[]) => {
    if (idsToDelete.length === 0) return;
    const confirm = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        `Are you sure you want to delete/clear ${idsToDelete.length} selected leave request(s)?`,
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!confirm) return;

    window.showLoading('Deleting leave requests...');
    try {
      const idsArray = [...idsToDelete];
      for (const id of idsArray) {
        await deleteLeaveRequest(id);
      }

      setSelectedLeaveIds([]);

      // Update local state immediately
      setLeaveHistory(prev => prev.filter(l => !idsArray.includes(l.id)));

      // Save hidden array as bulletproof UI fallback
      const updatedHidden = Array.from(new Set([...hiddenLeaveIds, ...idsArray]));
      setHiddenLeaveIds(updatedHidden);
      if (profile?.id) {
        localStorage.setItem(`hidden_leaves_${profile.id}`, JSON.stringify(updatedHidden));
      }

      // Refresh data from DB
      if (profile?.id) {
        const updatedLeaves = await getLeaveRequests(profile.id);
        const filtered = updatedLeaves.filter(l => !updatedHidden.includes(l.id));
        setLeaveHistory(filtered.sort((a, b) => b.id - a.id));
      }
      window.customAlert('Selected leave history updated successfully.');
    } catch (err) {
      window.customAlert('Failed to delete leave requests.');
    } finally {
      window.hideLoading();
    }
  };

  // Handle deleting selected complaints
  const handleDeleteComplaints = async (idsToDelete: number[]) => {
    if (idsToDelete.length === 0) return;
    const confirm = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        `Are you sure you want to delete/clear ${idsToDelete.length} selected complaint(s)?`,
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!confirm) return;

    window.showLoading('Deleting complaints...');
    try {
      const idsArray = [...idsToDelete];
      for (const id of idsArray) {
        await deleteComplaint(id);
      }

      setSelectedComplaintIds([]);

      // Update local state immediately
      setComplaintsList(prev => prev.filter(c => c.id && !idsArray.includes(c.id)));

      // Save hidden array as bulletproof UI fallback
      const updatedHidden = Array.from(new Set([...hiddenComplaintIds, ...idsArray]));
      setHiddenComplaintIds(updatedHidden);
      if (profile?.id) {
        localStorage.setItem(`hidden_complaints_${profile.id}`, JSON.stringify(updatedHidden));
      }

      // Refresh data from DB
      if (profile?.id) {
        const updatedComp = await getComplaints(profile.id);
        const filtered = updatedComp.filter(c => c.id && !updatedHidden.includes(c.id));
        setComplaintsList(filtered);
      }
      window.customAlert('Selected complaints updated successfully.');
    } catch (err) {
      window.customAlert('Failed to delete complaints.');
    } finally {
      window.hideLoading();
    }
  };
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [issueType, setIssueType] = useState('');
  const [correctionDate, setCorrectionDate] = useState('');
  const [correctionCheckIn, setCorrectionCheckIn] = useState('');
  const [correctionCheckOut, setCorrectionCheckOut] = useState('');
  const [existingCheckIn, setExistingCheckIn] = useState('');
  const [existingCheckOut, setExistingCheckOut] = useState('');
  const prevCorrectionDateRef = useRef<string>('');
  const [empTrustedDevice, setEmpTrustedDevice] = useState<TrustedDeviceRecord | null>(null);
  const [liveCurrentTime, setLiveCurrentTime] = useState('');
  const [liveDateString, setLiveDateString] = useState('');
  const [timingsList, setTimingsList] = useState<ShiftTiming[]>([]);
  const [liveElapsed, setLiveElapsed] = useState('');
  const [liveOvertime, setLiveOvertime] = useState('00:00:00');
  const [liveCompensatedOvertime, setLiveCompensatedOvertime] = useState('00:00:00');
  const [liveIsCompMode, setLiveIsCompMode] = useState(false);
  const [liveCheckInTime, setLiveCheckInTime] = useState<string | null>(null);
  const [liveCheckOutTime, setLiveCheckOutTime] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.email) {
      fetchTrustedDeviceFromDb(profile.email).then(rec => setEmpTrustedDevice(rec));
    }
  }, [profile]);

  // Live timer: tick every second for real-time clock and active shift timer (continues past 12 AM midnight until check-out)
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLiveCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setLiveDateString(now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }));

      const pad = (n: number) => n.toString().padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      // Search for any active (unclosed) check-in across attendance summaries starting from most recent date
      const activeSummary = attendanceSummaries
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))
        .find(s => Boolean(s.checkIn) && !s.checkOut);

      if (activeSummary && activeSummary.checkIn && !activeSummary.checkOut) {
        setLiveCheckInTime(activeSummary.checkIn);
        setLiveCheckOutTime(null);

        const parseCheckInWithDate = (dateStr: string, t: string): Date | null => {
          const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
          if (!m) return null;
          let h = parseInt(m[1], 10);
          const min = parseInt(m[2], 10);
          const sec = parseInt(m[3] || '0', 10);
          if (m[4]) {
            if (/pm/i.test(m[4]) && h !== 12) h += 12;
            if (/am/i.test(m[4]) && h === 12) h = 0;
          }
          const [yr, mo, dy] = dateStr.split('-').map(v => parseInt(v, 10));
          if (!yr || !mo || !dy) return null;
          return new Date(yr, mo - 1, dy, h, min, sec, 0);
        };

        const checkInDate = parseCheckInWithDate(activeSummary.date, activeSummary.checkIn);
        if (checkInDate && !isNaN(checkInDate.getTime())) {
          let diffMs = now.getTime() - checkInDate.getTime();
          if (diffMs < 0) diffMs = 0;
          const totalSec = Math.floor(diffMs / 1000);
          
          const formatHms = (sec: number) => {
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
          };

          setLiveElapsed(formatHms(totalSec));

          // Calculate overtime and compensation time individually matching attendanceProcessor rules
          const timingRule = profile ? getEmployeeShiftTiming(profile, timingsList) : null;
          const shiftStartStr = timingRule?.startTime || '11:00';
          const shiftEndStr = timingRule?.endTime || '20:00';
          const graceMins = timingRule?.graceMins !== undefined ? timingRule.graceMins : 20;
          const targetHours = timingRule?.totalHours || 9;
          const targetSecs = targetHours * 3600;

          const shiftStartDate = new Date(activeSummary.date + 'T' + shiftStartStr + ':00');
          const graceCutoffDate = new Date(shiftStartDate.getTime() + (graceMins * 60 + 59) * 1000 + 999);
          const isLate = checkInDate > graceCutoffDate;
          const lateMins = isLate ? Math.ceil((checkInDate.getTime() - shiftStartDate.getTime()) / (1000 * 60)) : 0;

          let shiftEndDate = new Date(activeSummary.date + 'T' + shiftEndStr + ':00');
          if (shiftEndStr <= shiftStartStr) {
            shiftEndDate.setDate(shiftEndDate.getDate() + 1);
          }

          const otSecs = Math.max(0, totalSec - targetSecs);
          const isCompMode = Boolean(timingRule?.isFixedHours && !timingRule?.allowRegularOvertime);
          setLiveIsCompMode(isCompMode);

          if (isCompMode) {
            setLiveCompensatedOvertime(formatHms(otSecs));
            setLiveOvertime('00:00:00');
          } else if (isLate && lateMins > 0) {
            const afterShiftMs = now.getTime() - shiftEndDate.getTime();
            const afterShiftSecs = afterShiftMs > 0 ? Math.floor(afterShiftMs / 1000) : 0;
            const compSecs = Math.max(0, Math.min(lateMins * 60, afterShiftSecs));
            setLiveCompensatedOvertime(formatHms(compSecs));
            setLiveOvertime(formatHms(otSecs));
          } else {
            setLiveCompensatedOvertime('00:00:00');
            setLiveOvertime(formatHms(otSecs));
          }
        } else {
          setLiveElapsed('');
          setLiveOvertime('00:00:00');
          setLiveCompensatedOvertime('00:00:00');
          setLiveIsCompMode(false);
        }
      } else {
        const todaySummary = attendanceSummaries.find(s => s.date === todayStr);
        const checkInStr = todaySummary?.checkIn || null;
        const checkOutStr = todaySummary?.checkOut || null;

        setLiveCheckInTime(checkInStr);
        setLiveCheckOutTime(checkOutStr);
        setLiveElapsed('');
        setLiveOvertime('00:00:00');
        setLiveCompensatedOvertime('00:00:00');
        setLiveIsCompMode(false);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attendanceSummaries, profile, timingsList]);

  const handleRegisterEmpBiometric = async () => {
    if (!profile || !profile.email) return;
    window.showLoading('Registering Fingerprint / Face ID for this account on this device...');
    try {
      const success = await registerBiometricDevice(profile.email, profile.password, profile, 'employee');
      if (success) {
        const fresh = await fetchTrustedDeviceFromDb(profile.email);
        setEmpTrustedDevice(fresh);
        window.customAlert(`Device trusted successfully for ${profile.email}! Fingerprint & Face ID login enabled on this device.`);
      } else {
        window.customAlert('Failed to register biometric device.');
      }
    } catch (e: any) {
      window.customAlert('Error registering biometrics.');
    } finally {
      window.hideLoading();
    }
  };

  const handleDisableEmpBiometric = async () => {
    if (!profile || !profile.email) return;
    await disableBiometricDevice(profile.email);
    setEmpTrustedDevice(null);
    window.customAlert(`Biometric login disabled for ${profile.email} on this device.`);
  };

  // Announcements & Notifications states
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [isAnnouncementsExpanded, setIsAnnouncementsExpanded] = useState<boolean>(true);
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Calendar navigation
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [showBirthdayEffect, setShowBirthdayEffect] = useState(false);
  const [showEmployeeSalary, setShowEmployeeSalary] = useState(false);
  const [monthlyPayrollSummary, setMonthlyPayrollSummary] = useState<EmployeePayrollSummary | null>(null);

  const [employeeLoansList, setEmployeeLoansList] = useState<EmployeeLoan[]>([]);
  const [loanName, setLoanName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDurationMonths, setLoanDurationMonths] = useState('10');
  const [loanContact, setLoanContact] = useState('');
  const isFirstLoadRef = useRef(true);

  const issueTypes = [
    'Network / Internet Issue',
    'Hardware Issue (PC, Printer, etc.)',
    'Software / Application Issue',
    'Email / Account Issue',
    'Check In/Out Entry Correction',
    'Loan Request',
    'Other'
  ];

  // When correction date changes, look up existing attendance data
  useEffect(() => {
    const to24h = (t: string): string => {
      if (!t) return '';
      const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (!m) {
        if (/^\d{2}:\d{2}$/.test(t)) return t;
        return '';
      }
      let h = Number(m[1]);
      if (/pm/i.test(m[3]) && h !== 12) h += 12;
      if (/am/i.test(m[3]) && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m[2]}`;
    };

    if (!correctionDate) {
      setExistingCheckIn('');
      setExistingCheckOut('');
      setCorrectionCheckIn('');
      setCorrectionCheckOut('');
      prevCorrectionDateRef.current = '';
      return;
    }
    const daySummary = attendanceSummaries.find(s => s.date === correctionDate);
    if (daySummary) {
      setExistingCheckIn(daySummary.checkIn || '');
      setExistingCheckOut(daySummary.checkOut || '');
      // Only set initial correction inputs when switching to a new correction date
      if (prevCorrectionDateRef.current !== correctionDate) {
        setCorrectionCheckIn(to24h(daySummary.checkIn || ''));
        setCorrectionCheckOut(to24h(daySummary.checkOut || ''));
        prevCorrectionDateRef.current = correctionDate;
      }
    } else {
      setExistingCheckIn('');
      setExistingCheckOut('');
      if (prevCorrectionDateRef.current !== correctionDate) {
        setCorrectionCheckIn('');
        setCorrectionCheckOut('');
        prevCorrectionDateRef.current = correctionDate;
      }
    }
  }, [correctionDate, attendanceSummaries]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLeaveModalOpen) {
          setIsLeaveModalOpen(false);
          setStartDate('');
          setEndDate('');
          setReason('');
        }
        else if (isChangePasswordModalOpen) {
          setIsChangePasswordModalOpen(false);
          setNewPassword('');
          setConfirmPassword('');
        }
        else if (selectedCalendarDay) {
          setSelectedCalendarDay(null);
        }
      } else if (e.key === 'Enter') {
        if (document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }
        if (isLeaveModalOpen) {
          e.preventDefault();
          handleRequestLeave(new Event('submit') as any);
        } else if (isChangePasswordModalOpen) {
          e.preventDefault();
          handleChangePassword(new Event('submit') as any);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    isLeaveModalOpen, isChangePasswordModalOpen, selectedCalendarDay,
    startDate, endDate, reason, newPassword, confirmPassword
  ]);

  useEffect(() => {
    fetchData();

    let debounceTimer: any = null;
    const channel = supabase
      .channel('emp-realtime-all-tables')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (document.visibilityState === 'visible') {
            fetchData();
          }
        }, 600);
      })
      .subscribe();

    // Optimized background heartbeat (30s interval, active only when tab is visible)
    const telemetryInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }, 30000);

    const handleLiveSyncNotification = () => {
      fetchData();
    };
    window.addEventListener('app-refresh-notifications', handleLiveSyncNotification);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('app-refresh-notifications', handleLiveSyncNotification);
      supabase.removeChannel(channel);
      clearInterval(telemetryInterval);
    };
  }, [user, calendarYear, calendarMonth]);

  const fetchData = async () => {
    try {
      let currentProfile: EmployeeProfile | null = null;
      const targetIdentifier = user?.id || user?.email || user?.pin;

      try {
        if (targetIdentifier) {
          currentProfile = await getProfileById(targetIdentifier);
        }
      } catch (e) {
        /* ignore primary fetch error */
      }

      const publicProfiles = await getPublicProfiles().catch(() => []);
      setAllProfiles(publicProfiles as EmployeeProfile[]);

      // Fallback matching against user object or list search
      if (!currentProfile && user) {
        if (user.pin || user.full_name) {
          currentProfile = user as EmployeeProfile;
        } else {
          const cleanTarget = String(targetIdentifier || user.email || '').trim().toLowerCase();
          const { data: allProfilesData } = await supabase.from('profiles').select('*');
          if (allProfilesData && allProfilesData.length > 0) {
            const matched = allProfilesData.find(p => 
              (p.id && String(p.id).trim().toLowerCase() === cleanTarget) ||
              (p.email && p.email.trim().toLowerCase() === cleanTarget) ||
              (p.pin && String(p.pin).trim().toLowerCase() === cleanTarget)
            );
            if (matched) currentProfile = matched as EmployeeProfile;
          }
        }
      }

      if (currentProfile && user) {
        if (!currentProfile.email && user.email) currentProfile.email = user.email;
        if (!currentProfile.id && user.id) currentProfile.id = user.id;
        if (!currentProfile.pin && user.pin) currentProfile.pin = user.pin;
        if (!currentProfile.full_name && user.full_name) currentProfile.full_name = user.full_name;
      }

      setProfile(currentProfile);
      
      if (currentProfile) {

        // Check if it's the employee's birthday today
        if (currentProfile.date_of_birth) {
          const dob = new Date(currentProfile.date_of_birth + 'T00:00:00');
          const today = new Date();
          if (dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate()) {
            setShowBirthdayEffect(true);
          }
        }

        // Fetch balances
        try {
          const balances = await getLeaveBalances(currentProfile.id);
          setLeaveBalance(balances[0] || null);
        } catch (e) { /* ignore */ }

        // Fetch leave requests
        let leaves: LeaveRequest[] = [];
        try {
          const rawLeaves = await getLeaveRequests(currentProfile.id);
          const hiddenLeaves: number[] = JSON.parse(localStorage.getItem(`hidden_leaves_${currentProfile.id}`) || '[]');
          leaves = rawLeaves.filter(l => !hiddenLeaves.includes(l.id));
          setLeaveHistory(leaves.sort((a, b) => b.id - a.id));
        } catch (e) { /* ignore */ }

        // Fetch raw attendance logs
        let rawLogs: RawLog[] = [];
        try {
          rawLogs = await getRawLogs(currentProfile.pin);
          setUserRawLogs(rawLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (e) { /* ignore */ }

        // Fetch holidays
        let holidays: Holiday[] = [];
        try {
          holidays = await getHolidays();
          setHolidaysList(holidays);
        } catch (e) { /* ignore */ }
        const holidayDates = holidays.map(h => h.date);

        // Fetch shift timings
        let timings: ShiftTiming[] = [];
        try {
          timings = await getShiftTimings();
          setTimingsList(timings);
        } catch (e) {
          /* console removed */
        }

        // Calculate dynamic month start/end range based on calendar selection
        const pad = (n: number) => n.toString().padStart(2, '0');
        const lastDay = new Date(calendarYear, calendarMonth + 1, 0).getDate();
        const startStr = `${calendarYear}-${pad(calendarMonth + 1)}-01`;
        const endStr = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(lastDay)}`;

        let graceSetting: number | Record<string, number> = 20;
        try {
          const deviceSet = await getDeviceSettings();
          if (deviceSet.monthly_grace_settings && Object.keys(deviceSet.monthly_grace_settings).length > 0) {
            graceSetting = deviceSet.monthly_grace_settings;
          } else if (deviceSet.grace_time_mins) {
            graceSetting = deviceSet.grace_time_mins;
          }
        } catch (e) {
          graceSetting = parseInt(localStorage.getItem('office_grace_time_mins') || '20', 10);
        }

        const timing = getEmployeeShiftTiming(currentProfile, timings);

        // Fetch complaints (table may not exist yet)
        let complaints: any[] = [];
        try {
          const rawComplaints = await getComplaints(currentProfile.id);
          const hiddenComplaints: number[] = JSON.parse(localStorage.getItem(`hidden_complaints_${currentProfile.id}`) || '[]');
          complaints = rawComplaints.filter(c => c.id && !hiddenComplaints.includes(c.id));
          setComplaintsList(complaints);
        } catch (e) { /* console removed */ }

        // Fetch persistent approved corrections
        let approvedCorrections: ApprovedCorrection[] = [];
        try {
          approvedCorrections = await getApprovedAttendanceCorrections(currentProfile.id);
        } catch (e) { /* ignore */ }

        // Fetch employee loans
        try {
          const loans = await getEmployeeLoans(currentProfile.id);
          setEmployeeLoansList(loans);
        } catch (e) { /* ignore */ }

        const summary = calculateEmployeePayrollSummary(
          currentProfile,
          rawLogs,
          leaves,
          startStr,
          endStr,
          holidayDates,
          timing.graceMins !== undefined ? timing.graceMins : graceSetting,
          timing.startTime,
          timing.endTime,
          complaints,
          approvedCorrections,
          timing.isFixedHours,
          timing.totalHours,
          timings
        );
        setMonthlyPayrollSummary(summary);

        const processed = processAttendanceLogs(
          currentProfile,
          rawLogs,
          leaves,
          startStr,
          endStr,
          holidayDates,
          timing.graceMins !== undefined ? timing.graceMins : graceSetting,
          timing.startTime,
          timing.endTime,
          complaints,
          approvedCorrections,
          timing.isFixedHours,
          timing.totalHours,
          timings
        );
        setAttendanceSummaries(processed.slice().reverse());

        // Fetch announcements (table may not exist yet)
        try {
          const announcements = await getAnnouncements();
          setAnnouncementsList(announcements);
        } catch (e) { /* console removed */ }

        // Fetch notifications (table may not exist yet)
        try {
          const notifications = await getNotifications(currentProfile.id, false, currentProfile.pin, currentProfile.email, currentProfile.designation);
          setNotificationsList(notifications);
        } catch (e) { /* console removed */ }

        // Check and trigger birthday notifications
        try {
          await checkAndTriggerBirthdayNotifications();
        } catch (e) { /* console removed */ }
      }
    } catch (err) {
      /* console removed */
    } finally {
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        setLoading(false);
      }
    }
  };

  // Load drafts on mount
  useEffect(() => {
    try {
      const savedLeave = localStorage.getItem('draft_leave_request');
      if (savedLeave) {
        const parsed = JSON.parse(savedLeave);
        if (parsed.leaveType) setLeaveType(parsed.leaveType);
        if (parsed.startDate) setStartDate(parsed.startDate);
        if (parsed.endDate) setEndDate(parsed.endDate);
        if (parsed.reason) setReason(parsed.reason);
      }
    } catch (e) {
      /* console removed */
    }

    try {
      const savedComplaint = localStorage.getItem('draft_complaint');
      if (savedComplaint) {
        const parsed = JSON.parse(savedComplaint);
        if (parsed.title) setComplaintTitle(parsed.title);
        if (parsed.description) setComplaintDesc(parsed.description);
        if (parsed.issueType) setIssueType(parsed.issueType);
        if (parsed.correctionDate) setCorrectionDate(parsed.correctionDate);
        if (parsed.correctionCheckIn) setCorrectionCheckIn(parsed.correctionCheckIn);
        if (parsed.correctionCheckOut) setCorrectionCheckOut(parsed.correctionCheckOut);
      }
    } catch (e) {
      /* console removed */
    }
  }, []);

  // Save drafts on change
  useEffect(() => {
    const draft = { leaveType, startDate, endDate, reason };
    if (leaveType !== 'Casual' || startDate || endDate || reason) {
      localStorage.setItem('draft_leave_request', JSON.stringify(draft));
    }
  }, [leaveType, startDate, endDate, reason]);

  useEffect(() => {
    const draft = { title: complaintTitle, description: complaintDesc, issueType, correctionDate, correctionCheckIn, correctionCheckOut };
    if (complaintTitle || complaintDesc || issueType) {
      localStorage.setItem('draft_complaint', JSON.stringify(draft));
    }
  }, [complaintTitle, complaintDesc, issueType, correctionDate, correctionCheckIn, correctionCheckOut]);

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSubmitLoading(true);

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      window.customAlert('End date cannot be before start date.');
      setSubmitLoading(false);
      return;
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const reqType = (leaveType || 'Casual') as 'Casual' | 'Medical' | 'Annual';

    const casualRemaining = Math.max(0, (leaveBalance?.casual_total ?? 10) - (leaveBalance?.casual_used ?? 0));
    const medicalRemaining = Math.max(0, (leaveBalance?.medical_total ?? 10) - (leaveBalance?.medical_used ?? 0));
    const annualRemaining = Math.max(0, (leaveBalance?.annual_total ?? 10) - (leaveBalance?.annual_used ?? 0));

    let catRemaining = casualRemaining;
    if (reqType === 'Medical') catRemaining = medicalRemaining;
    else if (reqType === 'Annual') catRemaining = annualRemaining;

    if (diffDays > catRemaining) {
      let suggestCategory = 'Casual';
      let suggestRemaining = casualRemaining;

      if (reqType === 'Annual') {
        if (casualRemaining >= medicalRemaining) {
          suggestCategory = 'Casual';
          suggestRemaining = casualRemaining;
        } else {
          suggestCategory = 'Medical';
          suggestRemaining = medicalRemaining;
        }
      } else if (reqType === 'Casual') {
        if (annualRemaining >= medicalRemaining) {
          suggestCategory = 'Annual';
          suggestRemaining = annualRemaining;
        } else {
          suggestCategory = 'Medical';
          suggestRemaining = medicalRemaining;
        }
      } else if (reqType === 'Medical') {
        if (annualRemaining >= casualRemaining) {
          suggestCategory = 'Annual';
          suggestRemaining = annualRemaining;
        } else {
          suggestCategory = 'Casual';
          suggestRemaining = casualRemaining;
        }
      }

      setSubmitLoading(false);

      if (catRemaining > 0) {
        const exceeded = diffDays - catRemaining;
        window.customAlert(
          `⚠️ Leave Limit Exceeded!\n\n` +
          `You requested ${diffDays} day(s) under ${reqType} Leave, but only ${catRemaining} day(s) remain in your ${reqType} Leave balance.\n\n` +
          `Please apply ${catRemaining} day(s) under ${reqType} Leave, and adjust the remaining ${exceeded} day(s) under ${suggestCategory} Leave (${suggestRemaining} day(s) available) or another available category.`
        );
      } else {
        window.customAlert(
          `⚠️ No ${reqType} Leaves Remaining!\n\n` +
          `You have 0 ${reqType} Leaves remaining.\n\n` +
          `Please apply your ${diffDays} day(s) under ${suggestCategory} Leave (${suggestRemaining} day(s) available) or another category with remaining balance.`
        );
      }
      return;
    }

    window.showLoading('is in the process');
    try {
      const targetEmpId = user?.id || profile.id;
      await createLeaveRequest({
        employee_id: targetEmpId,
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType || 'Casual',
        reason
      });

      // Clear draft on success
      localStorage.removeItem('draft_leave_request');

      setStartDate('');
      setEndDate('');
      setReason('');
      setIsLeaveModalOpen(false);
      
      fetchData();
      window.customAlert(`Leave request (${leaveType || 'Casual'}) for ${diffDays} day(s) submitted successfully!`);
    } catch (err: any) {
      window.customAlert(err.message || 'Failed to submit request. Please try again.');
    } finally {
      window.hideLoading();
      setSubmitLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (newPassword.length < 6) {
      window.customAlert('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      window.customAlert('Passwords do not match.');
      return;
    }

    setPasswordChangeLoading(true);
    window.showLoading('Updating password...');
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          password: newPassword,
          is_first_login: false
        })
        .eq('id', profile.id);
      if (profileError) throw profileError;

      try {
        const adminIds = await getAdminIds(supabase);
        if (adminIds.length > 0) {
          for (const adminId of adminIds) {
            await createNotification({
              user_id: adminId,
              title: 'Password Changed',
              message: `${profile.full_name} (${profile.pin}) has updated their password.`
            });
          }
        }
      } catch (ex) { /* ignore */ }

      setProfile(prev => prev ? { ...prev, is_first_login: false, password: newPassword } : null);
      setNewPassword('');
      setConfirmPassword('');
      setIsChangePasswordModalOpen(false);
      window.customAlert('Password updated successfully!');
    } catch (err: any) {
      window.customAlert(err.message || 'Failed to update password.');
    } finally {
      setPasswordChangeLoading(false);
      window.hideLoading();
    }
  };

  const handleDeleteLoan = async (id: number) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      window.customConfirm(
        'Are you sure you want to cancel and delete this loan request?',
        () => resolve(true),
        () => resolve(false)
      );
    });
    if (!confirmed) return;

    window.showLoading('Deleting loan request...');
    try {
      await deleteEmployeeLoan(id);
      if (profile) {
        const loans = await getEmployeeLoans(profile.id);
        setEmployeeLoansList(loans);
      }
      window.customAlert('Loan request cancelled and deleted.');
    } catch (e) {
      window.customAlert('Failed to delete loan request.');
    } finally {
      window.hideLoading();
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (issueType === 'Loan Request') {
      const amt = parseFloat(loanAmount);
      const dur = parseInt(loanDurationMonths, 10);
      if (!loanName.trim() || isNaN(amt) || amt <= 0 || isNaN(dur) || dur <= 0) {
        window.customAlert('Please enter a valid loan name, amount, and monthly duration.');
        return;
      }

      const monthlyDeduction = parseFloat((amt / dur).toFixed(2));

      window.showLoading('Submitting loan request...');
      try {
        await createEmployeeLoan({
          employee_id: profile.id,
          employee_pin: profile.pin,
          employee_name: profile.full_name,
          employee_contact: loanContact.trim() || undefined,
          loan_name: loanName.trim(),
          loan_amount: amt,
          monthly_deduction: monthlyDeduction,
          months_duration: dur,
          total_repaid: 0,
          remaining_balance: amt,
          status: 'Pending',
          notes: complaintDesc.trim() || undefined
        });

        const loans = await getEmployeeLoans(profile.id);
        setEmployeeLoansList(loans);
        setLoanName('');
        setLoanContact('');
        setLoanAmount('');
        setLoanDurationMonths('10');
        setComplaintDesc('');
        setIssueType('');
        window.customAlert('Loan Request submitted successfully!');
      } catch (e) {
        window.customAlert('Failed to submit Loan Request.');
      } finally {
        window.hideLoading();
      }
      return;
    }

    const isCorrection = issueType === 'Check In/Out Entry Correction';

    if (isCorrection) {
      if (!correctionDate) {
        window.customAlert('Please select a date for the correction.');
        return;
      }
    } else {
      if (!issueType || !complaintDesc.trim()) {
        window.customAlert('Please fill in all required fields.');
        return;
      }
    }

    window.showLoading('is in the process');
    try {
      const to12h = (time24: string): string => {
        if (!time24) return '';
        const [hrs, mins] = time24.split(':');
        let h = Number(hrs);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        return `${String(h).padStart(2, '0')}:${mins} ${ampm}`;
      };

      const description = isCorrection
        ? JSON.stringify({
            type: 'attendance_correction',
            date: correctionDate,
            check_in: correctionCheckIn ? to12h(correctionCheckIn) : null,
            check_out: correctionCheckOut ? to12h(correctionCheckOut) : null,
            missing_check_in: !existingCheckIn,
            missing_check_out: !existingCheckOut
          })
        : complaintDesc.trim();

      await createComplaint({
        employee_id: profile.id,
        title: issueType,
        description
      });

      // Create notification for HR / Admins
      try {
        await createNotification({
          user_id: 'admin',
          title: isCorrection ? `⏰ Attendance Correction - ${profile.full_name}` : `💬 Helpdesk: ${issueType} - ${profile.full_name}`,
          message: isCorrection
            ? `${profile.full_name} (${profile.pin || 'PIN N/A'}) requested correction for ${correctionDate} (In: ${correctionCheckIn ? to12h(correctionCheckIn) : 'N/A'}, Out: ${correctionCheckOut ? to12h(correctionCheckOut) : 'N/A'}).`
            : `${profile.full_name} (${profile.pin || 'PIN N/A'}) submitted "${issueType}": "${complaintDesc.trim().substring(0, 120)}"`
        });
      } catch (e) {
        /* console removed */
      }

      // Clear all fields
      localStorage.removeItem('draft_complaint');
      setComplaintTitle('');
      setComplaintDesc('');
      setIssueType('');
      setCorrectionDate('');
      setCorrectionCheckIn('');
      setCorrectionCheckOut('');
      setExistingCheckIn('');
      setExistingCheckOut('');

      // Refresh complaints list
      const complaints = await getComplaints(profile.id);
      setComplaintsList(complaints);

      window.customAlert(isCorrection
        ? 'Correction request submitted! Admin will review and approve it.'
        : 'Complaint submitted successfully! Technical team will review it.');
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to submit. Please try again.');
    } finally {
      window.hideLoading();
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!profile) return;
    try {
      await markAllNotificationsRead(profile.id);
      const notifications = await getNotifications(profile.id, false, profile.pin, profile.email, profile.designation);
      setNotificationsList(notifications);
    } catch (err) {
      /* console removed */
    }
  };

  const handleMarkNotificationRead = async (id: number, notification?: Notification) => {
    if (!profile) return;
    try {
      await markNotificationRead(id);
      const notifications = await getNotifications(profile.id, false, profile.pin, profile.email, profile.designation);
      setNotificationsList(notifications);
      
      // Redirect to relevant panel based on notification title/content
      if (notification) {
        setShowNotificationsDropdown(false);
        const fullText = (notification.title + ' ' + (notification.message || '')).toLowerCase();
        if (fullText.includes('leave')) {
          setEmployeeDashboardTab('leaves');
        } else if (fullText.includes('complaint') || fullText.includes('helpdesk') || fullText.includes('loan') || fullText.includes('ticket') || fullText.includes('correction') || fullText.includes('feedback')) {
          setEmployeeDashboardTab('helpdesk');
        } else if (fullText.includes('announce') || fullText.includes('holiday') || fullText.includes('birthday') || fullText.includes('attendance')) {
          setEmployeeDashboardTab('dashboard');
          setIsAnnouncementsExpanded(true);
        } else {
          setEmployeeDashboardTab('dashboard');
        }
      }
    } catch (err) {
      /* console removed */
    }
  };

  // Helper to format currency (Pakistani Rupee formatting)
  const formatSalary = (amount: number) => {
    return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount)}`;
  };

  const empShiftTiming = getEmployeeShiftTiming(profile || ({} as any), timingsList);
  const isCompensationMode = empShiftTiming.isFixedHours && !empShiftTiming.allowRegularOvertime;

  // Calculate monthly stats
  const totalOvertimeHours = isCompensationMode
    ? (monthlyPayrollSummary ? (monthlyPayrollSummary.totalCompensatedOvertimeHours || 0) : attendanceSummaries.reduce((sum, s) => sum + s.compensatedOvertimeHours, 0))
    : (monthlyPayrollSummary ? monthlyPayrollSummary.totalOvertimeHours : attendanceSummaries.reduce((sum, s) => sum + s.overtimeHours, 0));

  const totalOvertimeEarnings = monthlyPayrollSummary ? monthlyPayrollSummary.totalOvertimePayout : attendanceSummaries.reduce((sum, s) => sum + s.overtimePayout, 0);
  const totalLateDeductions = monthlyPayrollSummary ? monthlyPayrollSummary.totalLateDeduction : attendanceSummaries.reduce((sum, s) => sum + s.lateDeduction, 0);
  const totalAbsenceDeductions = monthlyPayrollSummary ? monthlyPayrollSummary.totalAbsenceDeduction : attendanceSummaries.reduce((sum, s) => sum + s.absenceDeduction, 0);
  const lateCount = monthlyPayrollSummary ? monthlyPayrollSummary.lateArrivals : attendanceSummaries.filter(s => s.isLate).length;
  const absentCount = monthlyPayrollSummary ? monthlyPayrollSummary.absences : attendanceSummaries.filter(s => s.isAbsent).length;
  const netSalaryForMonth = monthlyPayrollSummary ? monthlyPayrollSummary.netPayable : Math.max(
    0,
    parseFloat(((profile?.base_salary || 0) + totalOvertimeEarnings - totalLateDeductions - totalAbsenceDeductions - (profile?.income_tax || 0)).toFixed(2))
  );


  const formatTo12h = (time24?: string): string => {
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
          <span className="cool-loading-subtext">Initializing secure session...</span>
        </div>
      </div>
    );
  }

  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
  const startShift = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startShift; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const activeAnnouncements = announcementsList.filter(ann => {
    const targetType = ann.target_type as string;
    if (targetType === 'all') return true;
    if (targetType === 'department' && profile && ann.target_value === profile.department) return true;
    if (targetType === 'designation' && profile && ann.target_value === profile.designation) return true;
    if (targetType === 'employee' && profile && (ann.target_value === profile.id || ann.target_value === profile.pin || (profile.pin && String(ann.target_value) === String(profile.pin)))) return true;
    return false;
  });

  const hasActiveWarning = profile?.warning_active && profile?.warning_expiry && (new Date(profile.warning_expiry + 'T23:59:59') >= new Date());
  const warningColor = profile?.warning_color || '#ef4444';

  const pageStyle = {
    ...styles.page,
    position: 'relative' as const,
    boxSizing: 'border-box' as const,
    minHeight: '100vh'
  };

  return (
    <div style={pageStyle} className="app-page">
      {hasActiveWarning && (
        <>
          {/* Ambient Outer Side Gradients / Glows */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: '8px',
            background: `linear-gradient(to right, ${warningColor}, transparent)`,
            boxShadow: `0 0 40px 10px ${warningColor}40, 0 0 100px 30px ${warningColor}20`,
            zIndex: 9999,
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '8px',
            background: `linear-gradient(to left, ${warningColor}, transparent)`,
            boxShadow: `0 0 40px 10px ${warningColor}40, 0 0 100px 30px ${warningColor}20`,
            zIndex: 9999,
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: `linear-gradient(to bottom, ${warningColor}, transparent)`,
            boxShadow: `0 0 40px 10px ${warningColor}40, 0 0 100px 30px ${warningColor}20`,
            zIndex: 9999,
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: `linear-gradient(to top, ${warningColor}, transparent)`,
            boxShadow: `0 0 40px 10px ${warningColor}40, 0 0 100px 30px ${warningColor}20`,
            zIndex: 9999,
            pointerEvents: 'none'
          }} />

          {/* Premium Glassmorphic Warning Alert Box */}
          <div style={{
            width: 'calc(100% - 40px)',
            margin: '20px auto 10px auto',
            background: `linear-gradient(135deg, ${warningColor}26, ${warningColor}0d)`,
            border: `1px solid ${warningColor}55`,
            color: 'var(--text-primary)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: '600',
            fontSize: '0.9rem',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            boxShadow: `0 8px 32px rgba(0,0,0,0.15), 0 4px 16px ${warningColor}15`,
            justifyContent: 'center',
            textAlign: 'center',
            position: 'relative',
            zIndex: 100
          }}>
            <img src="/icons/alert.png" alt="Warning" style={{ width: '20px', height: '20px' }} />
            <span>WARNING NOTICE: {profile?.warning_text} (Active until: {new Date(profile!.warning_expiry + 'T00:00:00').toLocaleDateString()})</span>
          </div>
        </>
      )}
      {/* Birthday Confetti Effect */}
      {showBirthdayEffect && <ConfettiCanvas />}
      {showBirthdayEffect && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100000, background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
          color: 'white', padding: '16px 32px', borderRadius: '12px',
          fontSize: '1.1rem', fontWeight: '700', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.4)',
          cursor: 'pointer', textAlign: 'center', animation: 'pulse 2s infinite'
        }} onClick={() => setShowBirthdayEffect(false)}>
          Happy Birthday! Click to dismiss
        </div>
      )}

      {/* Admin Message / Email Contact Notification Banner */}
      {(() => {
        const adminNotif = notificationsList.find(n => !n.is_read && (
          n.title.toLowerCase().includes('admin') ||
          n.message.toLowerCase().includes('admin') ||
          n.message.toLowerCase().includes('whatsapp') ||
          n.message.toLowerCase().includes('email')
        ));
        if (!adminNotif) return null;

        return (
          <div style={{
            position: 'fixed', 
            top: '20px', 
            left: '50%', 
            transform: 'translateX(-50%)',
            zIndex: 100000, 
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white', 
            padding: '12px 24px', 
            borderRadius: '12px',
            fontSize: '0.92rem', 
            fontWeight: '700', 
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            maxWidth: '92vw'
          }}>
            <img src="/icons/bell.png" alt="Bell" style={{ width: '22px', height: '22px', filter: 'brightness(0) invert(1)' }} />
            <div>
              <div style={{ fontSize: '0.98rem', fontWeight: 800 }}>{adminNotif.title}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, opacity: 0.95 }}>{adminNotif.message}</div>
            </div>
            <button
              type="button"
              onClick={() => handleMarkNotificationRead(adminNotif.id!)}
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                color: '#ffffff',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.78rem',
                whiteSpace: 'nowrap',
                marginLeft: '8px'
              }}
            >
              Mark as Read
            </button>
          </div>
        );
      })()}
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
            <span style={styles.badge} className="hide-on-mobile">Employee Portal</span>
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
            <button onClick={() => setIsChangePasswordModalOpen(true)} style={styles.toggleBtn} className="btn btn-secondary" title="Change Password">
              <img 
                src="/icons/lock.png" 
                alt="Change Password" 
                className="theme-icon" 
                style={{ width: '16px', height: '16px', display: 'block' }} 
              />
            </button>
            
            {/* Theme switcher toggle */}
            <button onClick={toggleTheme} style={styles.toggleBtn} className="btn btn-secondary" title="Toggle Theme">
              <img 
                src={theme === 'dark' ? '/icons/sun.png' : '/icons/moon.png'} 
                alt="Theme" 
                className="theme-icon" 
                style={{ width: '16px', height: '16px', display: 'block' }} 
              />
            </button>
            
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
              {(profile?.full_name || user?.email || 'Employee').replace(/\s+/g, ' ').trim()}
            </span>
          </div>
        </div>
      </nav>

      {/* Tabs Selection (Slideable horizontal row) */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', width: '100%', overflowX: 'auto', marginBottom: '4px' }} className="tabs-scroll-container">
        <div style={{ ...styles.tabsRow, flexWrap: 'nowrap', display: 'flex', gap: '6px' }}>
          <button 
            onClick={() => setEmployeeDashboardTab('dashboard')} 
            style={{...styles.tabBtn, borderBottom: employeeDashboardTab === 'dashboard' ? '3px solid var(--primary)' : 'none', color: employeeDashboardTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setEmployeeDashboardTab('logs')} 
            style={{...styles.tabBtn, borderBottom: employeeDashboardTab === 'logs' ? '3px solid var(--primary)' : 'none', color: employeeDashboardTab === 'logs' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            My Punch Logs
          </button>
          <button 
            onClick={() => setEmployeeDashboardTab('leaves')} 
            style={{...styles.tabBtn, borderBottom: employeeDashboardTab === 'leaves' ? '3px solid var(--primary)' : 'none', color: employeeDashboardTab === 'leaves' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Leave Management
          </button>
          <button 
            onClick={() => setEmployeeDashboardTab('helpdesk')} 
            style={{...styles.tabBtn, borderBottom: employeeDashboardTab === 'helpdesk' ? '3px solid var(--primary)' : 'none', color: employeeDashboardTab === 'helpdesk' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Helpdesk / Complaints
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      {/* 1. DASHBOARD TAB */}
      {employeeDashboardTab === 'dashboard' && (
                <DashboardTab
          theme={theme}
          activeAnnouncements={activeAnnouncements}
          isAnnouncementsExpanded={isAnnouncementsExpanded}
          setIsAnnouncementsExpanded={setIsAnnouncementsExpanded}
          calendarMonth={calendarMonth}
          setCalendarMonth={setCalendarMonth}
          calendarYear={calendarYear}
          setCalendarYear={setCalendarYear}
          calendarView={calendarView}
          setCalendarView={setCalendarView}
          profile={profile}
          user={user}
          empShiftTiming={empShiftTiming}
          officeGraceTime={empShiftTiming?.graceMins || 20}
          payrollSummary={monthlyPayrollSummary}
          showEmployeeSalary={showEmployeeSalary}
          setShowEmployeeSalary={setShowEmployeeSalary}
          isCompensationMode={!!isCompensationMode}
          formatSalary={formatSalary}
          formatClockDuration={formatClockDuration}
          formatOvertimeDuration={formatOvertimeDuration}
          formatTo12h={formatTo12h}
          attendanceSummaries={attendanceSummaries}
          holidaysList={holidaysList}
          allProfiles={allProfiles}
          leaveHistory={leaveHistory}
          leaveBalance={leaveBalance}
          timingsList={timingsList}
          liveCurrentTime={liveCurrentTime}
          liveDateString={liveDateString}
          liveElapsed={liveElapsed}
          liveOvertime={liveOvertime}
          liveCompensatedOvertime={liveCompensatedOvertime}
          liveIsCompMode={liveIsCompMode}
          liveCheckInTime={liveCheckInTime}
          liveCheckOutTime={liveCheckOutTime}
          totalOvertimeHours={totalOvertimeHours}
          totalOvertimeEarnings={totalOvertimeEarnings}
          lateCount={lateCount}
          absentCount={absentCount}
          netSalaryForMonth={netSalaryForMonth}
          monthNames={monthNames}
          setSelectedCalendarDay={setSelectedCalendarDay}
          getStatusTagStyle={getStatusTagStyle}
          fetchData={fetchData}
        />
      )}

      {/* 2. LOGS TAB */}
      {employeeDashboardTab === 'logs' && (
        <LogsTab
          userRawLogs={userRawLogs}
          empLogSearch={empLogSearch}
          setEmpLogSearch={setEmpLogSearch}
          empLogDateFilter={empLogDateFilter}
          setEmpLogDateFilter={setEmpLogDateFilter}
          empLogStatusFilter={empLogStatusFilter}
          setEmpLogStatusFilter={setEmpLogStatusFilter}
          profile={profile}
          user={user}
        />
      )}

      {/* 3. LEAVES TAB */}
      {employeeDashboardTab === 'leaves' && (
        <LeavesTab
          leaveBalance={leaveBalance}
          setIsLeaveModalOpen={setIsLeaveModalOpen}
          leaveHistory={leaveHistory}
          hiddenLeaveIds={hiddenLeaveIds}
          selectedLeaveIds={selectedLeaveIds}
          setSelectedLeaveIds={setSelectedLeaveIds}
          handleDeleteLeaveRequests={handleDeleteLeaveRequests}
          holidaysList={holidaysList}
        />
      )}

      {/* 4. HELPDESK TAB */}
      {employeeDashboardTab === 'helpdesk' && (
                <HelpdeskTab
          complaintsList={complaintsList}
          employeeLoansList={employeeLoansList}
          profile={profile}
          user={user}
          selectedComplaintIds={selectedComplaintIds}
          setSelectedComplaintIds={setSelectedComplaintIds}
          hiddenComplaintIds={hiddenComplaintIds}
          handleDeleteComplaints={handleDeleteComplaints}
          handleDeleteLoan={handleDeleteLoan}
          handleCreateComplaint={handleCreateComplaint}
          issueTypes={issueTypes}
          issueType={issueType}
          setIssueType={setIssueType}
          complaintTitle={complaintTitle}
          setComplaintTitle={setComplaintTitle}
          complaintDesc={complaintDesc}
          setComplaintDesc={setComplaintDesc}
          correctionDate={correctionDate}
          setCorrectionDate={setCorrectionDate}
          correctionCheckIn={correctionCheckIn}
          setCorrectionCheckIn={setCorrectionCheckIn}
          correctionCheckOut={correctionCheckOut}
          setCorrectionCheckOut={setCorrectionCheckOut}
          existingCheckIn={existingCheckIn}
          existingCheckOut={existingCheckOut}
          loanName={loanName}
          setLoanName={setLoanName}
          loanAmount={loanAmount}
          setLoanAmount={setLoanAmount}
          loanDurationMonths={loanDurationMonths}
          setLoanDurationMonths={setLoanDurationMonths}
          loanContact={loanContact}
          setLoanContact={setLoanContact}
          empTrustedDevice={empTrustedDevice}
          handleDisableEmpBiometric={handleDisableEmpBiometric}
          handleRegisterEmpBiometric={handleRegisterEmpBiometric}
        />
      )}

      {/* ALL MODALS & DIALOGS */}
      <EmployeeModals
        isChangePasswordModalOpen={isChangePasswordModalOpen}
        setIsChangePasswordModalOpen={setIsChangePasswordModalOpen}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        passwordChangeLoading={passwordChangeLoading}
        handleChangePassword={handleChangePassword}
        isLeaveModalOpen={isLeaveModalOpen}
        setIsLeaveModalOpen={setIsLeaveModalOpen}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        reason={reason}
        setReason={setReason}
        leaveType={leaveType}
        setLeaveType={setLeaveType}
        isSingleDayLeave={isSingleDayLeave}
        setIsSingleDayLeave={setIsSingleDayLeave}
        submitLoading={submitLoading}
        handleRequestLeave={handleRequestLeave}
        selectedCalendarDay={selectedCalendarDay}
        setSelectedCalendarDay={setSelectedCalendarDay}
        holidaysList={holidaysList}
        allProfiles={allProfiles}
        leaveHistory={leaveHistory}
        isCompensationMode={!!isCompensationMode}
        showEmployeeSalary={showEmployeeSalary}
        setShowEmployeeSalary={setShowEmployeeSalary}
        profile={profile}
        formatSalary={formatSalary}
        formatClockDuration={formatClockDuration}
        formatOvertimeDuration={formatOvertimeDuration}
        getStatusTagStyle={getStatusTagStyle}
        showNotificationsDropdown={showNotificationsDropdown}
        setShowNotificationsDropdown={setShowNotificationsDropdown}
        notificationsList={notificationsList}
        handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        handleMarkNotificationRead={handleMarkNotificationRead}
      />
    </div>
  );
}
