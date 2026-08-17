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
import { processAttendanceLogs, calculateEmployeePayrollSummary, getEmployeeShiftTiming, getLocalDateStr, formatOvertimeDuration, formatClockDuration } from '../utils/attendanceProcessor';
import { fetchTrustedDeviceFromDb, registerBiometricDevice, disableBiometricDevice } from '../utils/biometricAuth';
import type { TrustedDeviceRecord } from '../utils/biometricAuth';
import type { DailySummary, EmployeeProfile, LeaveRequest, RawLog, EmployeePayrollSummary } from '../utils/attendanceProcessor';
import ConfettiCanvas from '../components/ConfettiCanvas';
import { MonthlyBreakdownBarChart } from '../components/AttendanceCharts';

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
      .select('id')
      .eq('role', 'admin');
    if (data) {
      return data.map((r: any) => r.id);
    }
  } catch (e) {
    /* console removed */
  }
  return [];
};

const CollapsibleCard: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpenMobile?: boolean;
  style?: React.CSSProperties;
  className?: string;
  actionButton?: React.ReactNode;
}> = ({ title, children, defaultOpenMobile = false, style = {}, className = '', actionButton }) => {
  const [isOpen, setIsOpen] = useState(defaultOpenMobile);
  return (
    <div 
      className={`glass-panel collapsible-mobile-card ${isOpen ? 'is-mobile-open' : ''} ${className}`} 
      style={{ 
        ...style, 
        padding: '16px 20px', 
        borderRadius: 'var(--radius-md)', 
        boxSizing: 'border-box', 
        width: '100%', 
        maxWidth: '100%', 
        minWidth: 0 
      }}
    >
      <div 
        className="collapsible-card-header" 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer', 
          userSelect: 'none', 
          gap: '12px',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, wordBreak: 'break-word' }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {actionButton}
          <div className="collapsible-toggle-chevron" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} style={{ cursor: 'pointer', padding: '2px 4px' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.8, display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
              ▼
            </span>
          </div>
        </div>
      </div>
      <div className="collapsible-card-body" style={{ marginTop: isOpen ? '14px' : '0' }}>
        {children}
      </div>
    </div>
  );
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
      return;
    }
    const daySummary = attendanceSummaries.find(s => s.date === correctionDate);
    if (daySummary) {
      setExistingCheckIn(daySummary.checkIn || '');
      setExistingCheckOut(daySummary.checkOut || '');
      setCorrectionCheckIn(to24h(daySummary.checkIn || ''));
      setCorrectionCheckOut(to24h(daySummary.checkOut || ''));
    } else {
      setExistingCheckIn('');
      setExistingCheckOut('');
      setCorrectionCheckIn('');
      setCorrectionCheckOut('');
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

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
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

      // Create notification for HR / Admins
      try {
        const adminIds = await getAdminIds(supabase);
        if (adminIds.length > 0) {
          for (const adminId of adminIds) {
            await createNotification({
              user_id: adminId,
              title: 'New Leave Request',
              message: `${profile.full_name} has requested ${leaveType || 'Casual'} leave from ${startDate} to ${endDate}.`
            });
          }
        }
      } catch (e) {
        /* console removed */
      }

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

        // Send notification to HR / Admins
        try {
          const adminIds = await getAdminIds(supabase);
          for (const adminId of adminIds) {
            await createNotification({
              user_id: adminId,
              title: 'New Loan Request',
              message: `${profile.full_name} requested a loan of PKR ${amt.toLocaleString()} (${loanName.trim()}).`
            });
          }
        } catch (e) {}

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
        const adminIds = await getAdminIds(supabase);
        if (adminIds.length > 0) {
          for (const adminId of adminIds) {
            await createNotification({
              user_id: adminId,
              title: isCorrection ? 'Attendance Correction Request' : 'New Helpdesk Complaint',
              message: `${profile.full_name} submitted ${isCorrection ? `a correction for ${correctionDate}` : `"${issueType}"`}.`
            });
          }
        }
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
      {employeeDashboardTab === 'dashboard' && (
        <div style={styles.dashboardContent} className="animate-fade-in">
          {/* Expandable Targeted Announcements (At TOP of Dashboard) */}
          {activeAnnouncements.length > 0 && (
            <div className="glass-panel" style={{ width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)', boxSizing: 'border-box', marginBottom: '4px' }}>
              <div 
                onClick={() => setIsAnnouncementsExpanded(!isAnnouncementsExpanded)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                title={isAnnouncementsExpanded ? "Click to collapse announcements" : "Click to expand announcements"}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src="/icons/info.png" alt="announcement" className="theme-icon" style={{ width: '16px', height: '16px' }} />
                  <strong style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    Company Announcements
                  </strong>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {activeAnnouncements.length}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '0.75rem' }}>{isAnnouncementsExpanded ? 'Collapse' : 'Expand'}</span>
                  <span style={{ fontSize: '0.75rem', display: 'inline-block', transform: isAnnouncementsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
                    ▼
                  </span>
                </div>
              </div>

              {isAnnouncementsExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', width: '100%' }} className="animate-fade-in">
                  {activeAnnouncements.map(ann => (
                    <div key={ann.id} className="glass-panel-glow" style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `4px solid ${ann.color || '#ff3b57'}`,
                      borderTop: '1px solid var(--border-color-glow)',
                      borderRight: '1px solid var(--border-color-glow)',
                      borderBottom: '1px solid var(--border-color-glow)',
                      background: `linear-gradient(90deg, ${ann.color || '#ff3b57'}0e 0%, rgba(255, 255, 255, 0.02) 100%)`,
                      textAlign: 'left',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{ann.title}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(ann.created_at || '').toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: '1.45', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                        {ann.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Month/Year Filter Row */}
          <div className="glass-panel filters-scroll-container responsive-filter-bar" style={{
            padding: '10px 12px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', gap: '6px', width: '100%', flexWrap: 'wrap', boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <img src="/icons/clock.png" alt="period" className="theme-icon" style={{ width: '14px', height: '14px' }} />
                <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>Period:</strong>
              </div>
              <select
                value={calendarMonth}
                onChange={e => { setCalendarMonth(parseInt(e.target.value)); }}
                style={{ width: 'auto', minWidth: '85px', padding: '4px 8px', fontSize: '0.8rem' }}
                className="custom-select"
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
              <select
                value={calendarYear}
                onChange={e => setCalendarYear(parseInt(e.target.value))}
                style={{ width: 'auto', minWidth: '70px', padding: '4px 8px', fontSize: '0.8rem' }}
                className="custom-select"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} className="hide-on-mobile">
                {attendanceSummaries.length} days
              </span>
              <button onClick={fetchData} title="Refresh from database" className="btn btn-secondary mobile-icon-only-btn" style={{ padding: '4px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>⟳</span>
                <span className="hide-on-mobile"> Refresh</span>
              </button>
            </div>
          </div>

          {/* Main Panel (Full Width) */}
          <div style={{ ...styles.mainPanel, flex: '1 1 100%' }}>
            
            {/* Always Visible Live Dynamic Clock & Real-Time Shift Tracker Card */}
            <div className="glass-panel" style={{
              width: '100%',
              padding: '18px 24px',
              marginBottom: '16px',
              borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.9) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              boxSizing: 'border-box'
            }}>
              {/* Left Column: Live Real-Time Clock & Today's Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem'
                }}>
                  🕒
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontFamily: "'Courier New', 'Fira Code', monospace",
                      fontSize: '1.65rem',
                      fontWeight: 800,
                      color: 'var(--primary)',
                      letterSpacing: '0.05em',
                      lineHeight: 1
                    }}>
                      {liveCurrentTime || '--:--:--'}
                    </span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      LIVE
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {liveDateString}
                  </span>
                </div>
              </div>

              {/* Right Column: Shift Status & Dynamic Elapsed Timer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {liveCheckInTime && !liveCheckOutTime ? (
                  /* Checked In & Active Shift */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: '10px 18px',
                    borderRadius: 'var(--radius-md)',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                        animation: 'pulse-dot 1.5s ease-in-out infinite',
                        flexShrink: 0
                      }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          ● Active Shift (Checked In)
                        </span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          Check In: <strong>{liveCheckInTime}</strong>
                        </span>
                      </div>
                    </div>

                    {liveElapsed && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid rgba(16, 185, 129, 0.25)', paddingLeft: '16px' }}>
                        {/* Total Work Elapsed */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{
                            fontFamily: "'Courier New', 'Fira Code', monospace",
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: '#10b981',
                            letterSpacing: '0.05em'
                          }}>
                            {liveElapsed}
                          </span>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                            WORK ELAPSED
                          </span>
                        </div>

                        {liveIsCompMode ? (
                          /* Compensation 1X Mode (Fixed Hours without Overtime) */
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{
                              fontFamily: "'Courier New', 'Fira Code', monospace",
                              fontSize: '1.15rem',
                              fontWeight: 800,
                              color: liveCompensatedOvertime !== '00:00:00' ? '#3b82f6' : 'var(--text-secondary)',
                              letterSpacing: '0.05em'
                            }}>
                              {liveCompensatedOvertime}
                            </span>
                            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                              COMPENSATION 1X
                            </span>
                          </div>
                        ) : (
                          /* Overtime Allowed Mode */
                          <>
                            {/* Overtime */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{
                                fontFamily: "'Courier New', 'Fira Code', monospace",
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                color: liveOvertime !== '00:00:00' ? '#f59e0b' : 'var(--text-secondary)',
                                letterSpacing: '0.05em'
                              }}>
                                {liveOvertime}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                                OVERTIME
                              </span>
                            </div>

                            {/* Compensation Time */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span style={{
                                fontFamily: "'Courier New', 'Fira Code', monospace",
                                fontSize: '1.15rem',
                                fontWeight: 800,
                                color: liveCompensatedOvertime !== '00:00:00' ? '#3b82f6' : 'var(--text-secondary)',
                                letterSpacing: '0.05em'
                              }}>
                                {liveCompensatedOvertime}
                              </span>
                              <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
                                COMPENSATION TIME
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : liveCheckInTime && liveCheckOutTime ? (
                  /* Shift Completed Today */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>✔️</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#60a5fa' }}>
                        Shift Completed Today
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        In: <strong>{liveCheckInTime}</strong> | Out: <strong>{liveCheckOutTime}</strong>
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Pending Check-In */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-color)',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>⏳</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Today's Attendance Status
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Pending Check-In Punch
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={styles.welcomeRow}>
              <CollapsibleCard title="Profile Details" style={styles.profileCard}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button 
                    onClick={() => setShowEmployeeSalary(!showEmployeeSalary)}
                    className="btn btn-secondary mobile-icon-only"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', height: '28px' }}
                    title={showEmployeeSalary ? "Hide Salary Info" : "Show Salary Info"}
                  >
                    <img 
                      src={showEmployeeSalary ? "/icons/eye-off.png" : "/icons/eye.png"} 
                      alt="toggle" 
                      className="theme-icon" 
                      style={{ width: '12px', height: '12px' }} 
                    />
                    <span>{showEmployeeSalary ? "Hide" : "Reveal"}</span>
                  </button>
                </div>
                <div style={styles.profileGrid}>
                  <div><strong>Pin ID:</strong> {profile?.pin}</div>
                  <div><strong>Department:</strong> {profile?.department || 'N/A'}</div>
                  <div><strong>Designation:</strong> {profile?.designation || 'N/A'}</div>
                  <div><strong>Joining Date:</strong> {profile?.joining_date}</div>
                  <div>
                    <strong>Shift Timing:</strong>{' '}
                    {(() => {
                      const empTiming = getEmployeeShiftTiming(profile || ({} as any), timingsList);
                      if (empTiming.isFixedHours) {
                        return (
                          <span style={{ fontWeight: 700, color: 'var(--primary)', background: 'var(--bg-surface-hover)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'inline-block', whiteSpace: 'nowrap' }}>
                            Fix Hours ({empTiming.totalHours || 9}h Shift)
                          </span>
                        );
                      }
                      return <span style={{ whiteSpace: 'nowrap' }}>{empTiming.startTime} to {empTiming.endTime}</span>;
                    })()}
                  </div>
                  <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal"><strong>Hourly Rate:</strong> {showEmployeeSalary ? `${formatSalary(profile?.base_salary ? Math.round(Math.max(0, profile.base_salary - (profile.income_tax || 0)) / (30 * (getEmployeeShiftTiming(profile || ({} as any), timingsList).totalHours || 9))) : (profile?.hourly_rate || 0))}/hr (After Tax)` : '••••••/hr'}</div>
                  <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal"><strong>Base Salary:</strong> {showEmployeeSalary ? `${formatSalary(profile?.base_salary || 0)}/mo` : '••••••/mo'}</div>
                </div>
              </CollapsibleCard>

              <CollapsibleCard title={`${monthNames[calendarMonth]} Summary`} style={styles.statsCard}>
                <div style={styles.statsGrid}>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/clock.png" 
                      alt="clock" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4 style={{ whiteSpace: 'nowrap' }}>{formatOvertimeDuration(totalOvertimeHours)}</h4>
                      <span style={{ whiteSpace: 'nowrap' }}>{isCompensationMode ? 'Comp Time' : 'Overtime'}</span>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/check-circle.png" 
                      alt="earnings" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4 onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} title="Click to toggle reveal">{showEmployeeSalary ? formatSalary(totalOvertimeEarnings) : '••••••'}</h4>
                      <span style={{ whiteSpace: 'nowrap' }}>{isCompensationMode ? 'Comp Payout' : 'OT Payout'}</span>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/clock.png" 
                      alt="late" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4>{lateCount}</h4>
                      <span>Late Arrivals</span>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/alert.png" 
                      alt="absent" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4>{absentCount}</h4>
                      <span>Absences</span>
                    </div>
                  </div>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/check-circle.png" 
                      alt="net" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4 onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal">
                        {showEmployeeSalary ? formatSalary(netSalaryForMonth) : '••••••'}
                      </h4>
                      <span>Net Salary</span>
                    </div>
                  </div>
                </div>
              </CollapsibleCard>
            </div>

            {/* Personal Monthly Attendance Statistics Chart */}
            <div style={{ width: '100%' }}>
              <MonthlyBreakdownBarChart 
                presentCount={attendanceSummaries.filter(s => s.status === 'Present' && s.checkIn && s.checkOut && !s.isLate).length}
                lateCount={attendanceSummaries.filter(s => s.isLate).length}
                missingCheckoutCount={attendanceSummaries.filter(s => (!s.checkIn || !s.checkOut) && (s.status === 'Present' || s.isLate)).length}
                leaveCount={attendanceSummaries.filter(s => s.status.includes('Leave')).length}
                absentCount={attendanceSummaries.filter(s => s.isAbsent).length}
                title={`Personal Attendance Statistics (${monthNames[calendarMonth]} ${calendarYear})`}
              />
            </div>

            {/* Leave Balances Display (Without Apply Button) */}
            <div style={styles.balancesSection}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={styles.sectionTitle}>Available Leave Balances</h2>
              </div>
              <div style={styles.balancesGrid}>
                <div className="glass-panel" style={styles.balanceCard}>
                  <div style={styles.balanceHeader}>
                    <span style={styles.balanceType}>Casual Leaves</span>
                    <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.casual_total - leaveBalance.casual_used : 10} Left</span>
                  </div>
                  <div style={styles.balanceProgressBg}>
                    <div 
                      style={{
                        ...styles.balanceProgressBar, 
                        backgroundColor: 'var(--primary)',
                        width: `${leaveBalance ? ((leaveBalance.casual_total - leaveBalance.casual_used) / leaveBalance.casual_total) * 100 : 100}%`
                      }}
                    ></div>
                  </div>
                  <small style={styles.balanceSub}>Used: {leaveBalance?.casual_used || 0} / Total: {leaveBalance?.casual_total || 10}</small>
                </div>

                <div className="glass-panel" style={styles.balanceCard}>
                  <div style={styles.balanceHeader}>
                    <span style={styles.balanceType}>Medical Leaves</span>
                    <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.medical_total - leaveBalance.medical_used : 10} Left</span>
                  </div>
                  <div style={styles.balanceProgressBg}>
                    <div 
                      style={{
                        ...styles.balanceProgressBar, 
                        backgroundColor: 'var(--accent)',
                        width: `${leaveBalance ? ((leaveBalance.medical_total - leaveBalance.medical_used) / leaveBalance.medical_total) * 100 : 100}%`
                      }}
                    ></div>
                  </div>
                  <small style={styles.balanceSub}>Used: {leaveBalance?.medical_used || 0} / Total: {leaveBalance?.medical_total || 10}</small>
                </div>

                <div className="glass-panel" style={styles.balanceCard}>
                  <div style={styles.balanceHeader}>
                    <span style={styles.balanceType}>Annual Leaves</span>
                    <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.annual_total - leaveBalance.annual_used : 10} Left</span>
                  </div>
                  <div style={styles.balanceProgressBg}>
                    <div 
                      style={{
                        ...styles.balanceProgressBar, 
                        backgroundColor: 'var(--success)',
                        width: `${leaveBalance ? ((leaveBalance.annual_total - leaveBalance.annual_used) / leaveBalance.annual_total) * 100 : 100}%`
                      }}
                    ></div>
                  </div>
                  <small style={styles.balanceSub}>Used: {leaveBalance?.annual_used || 0} / Total: {leaveBalance?.annual_total || 10}</small>
                </div>
              </div>
            </div>

            {/* Attendance View (Calendar or Table) */}
            <div className="glass-panel" style={{ ...styles.tablePanel, padding: '16px 20px', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '16px' }}>
                {/* Top Row: Heading on Left, View Toggle Buttons UP at TOP RIGHT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                    Attendance & Overtime
                  </h2>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: 'auto' }}>
                    <button 
                      onClick={() => setCalendarView('calendar')} 
                      className="btn mobile-icon-only-btn" 
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: calendarView === 'calendar' ? 'var(--primary)' : 'var(--bg-surface-hover)',
                        color: calendarView === 'calendar' ? 'var(--btn-primary-text, #ffffff)' : 'var(--text-secondary)',
                        border: `1px solid ${calendarView === 'calendar' ? 'var(--primary)' : 'var(--border-color)'}`,
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Calendar View"
                    >
                      <img 
                        src="/icons/calendar.png" 
                        alt="Calendar" 
                        className="theme-icon" 
                        style={{ 
                          width: '14px', 
                          height: '14px',
                          filter: theme === 'dark' ? (calendarView === 'calendar' ? 'brightness(0)' : 'brightness(0) invert(1)') : (calendarView === 'calendar' ? 'brightness(0) invert(1)' : 'brightness(0)')
                        }} 
                      />
                      <span className="hide-on-mobile">Calendar</span>
                    </button>
                    <button 
                      onClick={() => setCalendarView('table')} 
                      className="btn mobile-icon-only-btn" 
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.82rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: calendarView === 'table' ? 'var(--primary)' : 'var(--bg-surface-hover)',
                        color: calendarView === 'table' ? 'var(--btn-primary-text, #ffffff)' : 'var(--text-secondary)',
                        border: `1px solid ${calendarView === 'table' ? 'var(--primary)' : 'var(--border-color)'}`,
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title="Table View"
                    >
                      <img 
                        src="/icons/file-text.png" 
                        alt="Table" 
                        className="theme-icon" 
                        style={{ 
                          width: '14px', 
                          height: '14px',
                          filter: theme === 'dark' ? (calendarView === 'table' ? 'brightness(0)' : 'brightness(0) invert(1)') : (calendarView === 'table' ? 'brightness(0) invert(1)' : 'brightness(0)')
                        }} 
                      />
                      <span className="hide-on-mobile">Table</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Month & Year Select Dropdowns */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    value={calendarMonth}
                    onChange={e => setCalendarMonth(parseInt(e.target.value))}
                    className="custom-select"
                    style={{ width: 'auto', minWidth: '110px', padding: '6px 10px', fontSize: '0.82rem' }}
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx} value={idx}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={calendarYear}
                    onChange={e => setCalendarYear(parseInt(e.target.value))}
                    className="custom-select"
                    style={{ width: 'auto', minWidth: '80px', padding: '6px 10px', fontSize: '0.82rem' }}
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              </div>

              {calendarView === 'table' ? (
                <div style={{ padding: '16px', overflowX: 'auto' }}>
                  {(() => {
                    const baseSalary = profile?.base_salary || 0;
                    const incomeTax = profile?.income_tax || 0;
                    const dailyBase = Math.max(0, baseSalary - incomeTax) / 30;

                    let totalWorkedHoursSum = 0;
                    let totalOvertimeHoursSum = 0;
                    let totalCompensatedHoursSum = 0;
                    let totalOvertimePayoutSum = 0;

                    let totalDeductionSum = 0;
                    attendanceSummaries.forEach(s => {
                      totalWorkedHoursSum += s.workingHours || 0;
                      totalOvertimeHoursSum += s.overtimeHours || 0;
                      totalCompensatedHoursSum += s.compensatedOvertimeHours || 0;
                      totalOvertimePayoutSum += s.overtimePayout || 0;
                      totalDeductionSum += (s.lateDeduction || 0) + (s.absenceDeduction || 0);
                    });

                    const totalMonthAmountSum = netSalaryForMonth;

                    return (
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Check In</th>
                            <th>Check Out</th>
                            <th>Working Hours</th>
                            {isCompensationMode ? (
                              <>
                                <th>Comp Time</th>
                                <th>Comp Earned</th>
                              </>
                            ) : (
                              <>
                                <th>Overtime</th>
                                <th>OT Earned</th>
                              </>
                            )}
                            <th style={{ color: 'var(--danger)' }}>Deduction</th>
                            <th>Day Total Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceSummaries.map((summary) => {
                            let dayTotal = 0;
                            if (summary.status === 'Absent' || summary.status === 'Uninformed Absent') {
                              dayTotal = Math.max(0, dailyBase - (summary.absenceDeduction || 0));
                            } else if (summary.status === 'Unprocessed') {
                              dayTotal = 0;
                            } else {
                              dayTotal = Math.max(0, dailyBase + (summary.overtimePayout || 0) - (summary.lateDeduction || 0));
                            }

                            const dayDed = (summary.absenceDeduction || 0) + (summary.lateDeduction || 0);

                            return (
                              <tr key={summary.date} style={styles.tableRow}>
                                <td style={styles.tableCell}>{summary.date}</td>
                                <td style={styles.tableCell}>{summary.dayName}</td>
                                <td style={styles.tableCell}>{summary.checkIn || '-'}</td>
                                <td style={styles.tableCell}>{summary.checkOut || '-'}</td>
                                <td style={styles.tableCell}>{summary.workingHours > 0 ? formatClockDuration(summary.workingHours) : '-'}</td>
                                {isCompensationMode ? (
                                  <>
                                    <td style={{ ...styles.tableCell, color: '#3b82f6', fontWeight: 600 }}>{summary.compensatedOvertimeHours > 0 ? formatOvertimeDuration(summary.compensatedOvertimeHours) : '-'}</td>
                                    <td style={styles.tableCell}>{formatSalary(summary.overtimePayout)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td style={styles.tableCell}>{summary.overtimeHours > 0 ? formatOvertimeDuration(summary.overtimeHours) : '-'}</td>
                                    <td style={styles.tableCell}>{formatSalary(summary.overtimePayout)}</td>
                                  </>
                                )}
                                <td style={{ ...styles.tableCell, color: dayDed > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: dayDed > 0 ? '700' : '400' }}>
                                  {dayDed > 0 ? `- ${formatSalary(dayDed)}` : '-'}
                                </td>
                                <td style={{ ...styles.tableCell, fontWeight: '700', color: 'var(--success)' }}>
                                  {dayTotal > 0 ? formatSalary(dayTotal) : '-'}
                                </td>
                                <td style={styles.tableCell}>
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    background: summary.status === 'Present' ? 'rgba(16, 185, 129, 0.15)' : 
                                                (summary.status === 'Absent' || summary.status === 'Uninformed Absent') ? 'rgba(239, 68, 68, 0.15)' :
                                                summary.status === 'Holiday' ? 'rgba(239, 68, 68, 0.15)' :
                                                summary.status.includes('Leave') ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-surface-hover)',
                                    color: summary.status === 'Present' ? '#059669' : 
                                           (summary.status === 'Absent' || summary.status === 'Uninformed Absent') ? '#dc2626' :
                                           summary.status === 'Holiday' ? '#dc2626' :
                                           summary.status.includes('Leave') ? '#7c3aed' : 'var(--text-muted)'
                                  }}>
                                    {summary.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot style={{ position: 'sticky', bottom: 0, background: 'var(--bg-surface)', borderTop: '2px solid var(--border-color)', fontWeight: '700' }}>
                          <tr>
                            <td colSpan={4} style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)' }}>MONTHLY TOTALS:</td>
                            <td style={{ padding: '10px 12px', color: 'var(--primary)' }}>{formatClockDuration(totalWorkedHoursSum)}</td>
                            {isCompensationMode ? (
                              <>
                                <td style={{ padding: '10px 12px', color: '#3b82f6' }}>{totalCompensatedHoursSum > 0 ? formatOvertimeDuration(totalCompensatedHoursSum) : '-'}</td>
                                <td style={{ padding: '10px 12px', color: 'var(--success)' }}>{formatSalary(totalOvertimePayoutSum)}</td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '10px 12px', color: 'var(--warning)' }}>{totalOvertimeHoursSum > 0 ? formatOvertimeDuration(totalOvertimeHoursSum) : '-'}</td>
                                <td style={{ padding: '10px 12px', color: 'var(--success)' }}>{formatSalary(totalOvertimePayoutSum)}</td>
                              </>
                            )}
                            <td style={{ padding: '10px 12px', color: 'var(--danger)', fontWeight: '700' }}>
                              {totalDeductionSum > 0 ? `- ${formatSalary(totalDeductionSum)}` : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--success)', fontSize: '0.95rem' }}>{formatSalary(totalMonthAmountSum)}</td>
                            <td style={{ padding: '10px 12px' }}>-</td>
                          </tr>
                        </tfoot>
                      </table>
                    );
                  })()}
                </div>
              ) : (
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{day}</div>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                    {(() => {
                      const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                      const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay();
                      const adjustedStart = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

                      const cells = [];
                      for (let i = 0; i < adjustedStart; i++) {
                        cells.push({ type: 'empty', key: i });
                      }
                      for (let i = 1; i <= daysInMonth; i++) {
                        cells.push({ type: 'day', dayNum: i, key: i });
                      }

                      return cells.map((cell, idx) => {
                        if (cell.type === 'empty') {
                          return <div key={`empty-${idx}`} className="calendar-empty-cell" />;
                        }

                        const dayNum = cell.dayNum!;
                        const padNum = (n: number) => n.toString().padStart(2, '0');
                        const cellDateStr = `${calendarYear}-${padNum(calendarMonth + 1)}-${padNum(dayNum)}`;
                        const daySummary = attendanceSummaries.find(s => s.date === cellDateStr);

                        let cellBg = 'var(--bg-surface)';
                        let cellBorder = '1px solid var(--border-color)';
                        let statusText = '';
                        let statusColor = 'var(--text-muted)';
                        const holiday = holidaysList.find(h => h.date === cellDateStr);

                        if (daySummary) {
                          const hasMissingEntry = (!daySummary.checkIn || !daySummary.checkOut) && (daySummary.status === 'Present' || daySummary.isLate);

                          if (daySummary.status === 'Sunday' || daySummary.status === 'Off Saturday' || String(daySummary.status || '').startsWith('Off')) {
                            cellBg = 'var(--bg-surface-hover)';
                            statusText = daySummary.status === 'Sunday' ? 'Sun' : 'Sat Off';
                          } else if (daySummary.status === 'Holiday') {
                            cellBg = 'rgba(239, 68, 68, 0.15)';
                            cellBorder = '1px solid rgba(239, 68, 68, 0.5)';
                            statusText = 'Holiday';
                            statusColor = '#dc2626';
                          } else if (hasMissingEntry) {
                            cellBg = 'rgba(239, 68, 68, 0.12)';
                            cellBorder = '2px solid rgba(239, 68, 68, 0.6)';
                            statusText = daySummary.checkIn ? 'No Check-Out' : daySummary.checkOut ? 'No Check-In' : 'Missing Entry';
                            statusColor = '#ef4444';
                          } else if (daySummary.isAbsent) {
                            cellBg = 'rgba(239, 68, 68, 0.05)';
                            cellBorder = '1px solid rgba(239, 68, 68, 0.2)';
                            statusText = 'Absent';
                            statusColor = '#dc2626';
                          } else if (daySummary.isLate) {
                            cellBg = 'rgba(245, 158, 11, 0.05)';
                            cellBorder = '1px solid rgba(245, 158, 11, 0.2)';
                            statusText = 'Late';
                            statusColor = '#d97706';
                          } else if (daySummary.status.includes('Leave')) {
                            cellBg = 'rgba(139, 92, 246, 0.05)';
                            cellBorder = '1px solid rgba(139, 92, 246, 0.2)';
                            statusText = daySummary.status.split(' ')[0] || 'Leave';
                            statusColor = '#7c3aed';
                          } else if (daySummary.status === 'Short Time') {
                            cellBg = 'rgba(59, 130, 246, 0.12)';
                            cellBorder = '1px solid rgba(59, 130, 246, 0.35)';
                            statusText = 'Short Time';
                            statusColor = '#3b82f6';
                          } else if (daySummary.status === 'Present') {
                            cellBg = 'rgba(16, 185, 129, 0.05)';
                            cellBorder = '1px solid rgba(16, 185, 129, 0.2)';
                            statusText = 'Present';
                            statusColor = '#059669';
                          }
                        }

                        const birthdayEmployees = allProfiles.filter(p => {
                          if (!p.date_of_birth) return false;
                          const dob = new Date(p.date_of_birth + 'T00:00:00');
                          return dob.getMonth() === calendarMonth && dob.getDate() === dayNum;
                        });

                        const finalSummary = daySummary || {
                          date: cellDateStr,
                          status: holiday ? 'Holiday' : 'Absent',
                          isAbsent: !holiday,
                          workingHours: 0,
                          overtimeHours: 0,
                          overtimePayout: 0,
                          checkIn: null,
                          checkOut: null,
                          dayName: new Date(cellDateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })
                        } as DailySummary;

                        return (
                          <div
                            key={`day-${dayNum}`}
                            onClick={() => setSelectedCalendarDay(finalSummary)}
                            style={{
                              minHeight: '85px',
                              padding: '8px',
                              borderRadius: 'var(--radius-sm)',
                              background: cellBg,
                              border: cellBorder,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              transition: 'all var(--transition-fast)'
                            }}
                            className="dropdown-item-hover calendar-day-cell"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {dayNum}
                              </span>
                              <div className="calendar-dots-row">
                                {holiday && <span className="calendar-dot red" title={holiday.title}></span>}
                                {birthdayEmployees.map(emp => (
                                  <span key={emp.id} className="calendar-dot yellow" title={`Birthday: ${emp.full_name}`}></span>
                                ))}
                                {statusText && !holiday && (
                                  <span className="calendar-dot green" title={statusText}></span>
                                )}
                              </div>
                            </div>

                            <div className="calendar-details-container">
                              {holiday && (
                                <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: '600', textAlign: 'left', lineHeight: '1.2' }}>
                                  {holiday.title}
                                </span>
                              )}
                              {birthdayEmployees.map(emp => (
                                <span key={emp.id} style={{ fontSize: '0.6rem', color: '#f59e0b', fontWeight: '500', lineHeight: '1.2', textAlign: 'left' }}>
                                  Birthday: {emp.full_name}
                                </span>
                              ))}
                              {statusText && !holiday && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: statusColor,
                                  textAlign: 'right',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.02em'
                                }}>
                                  {statusText}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* MY PUNCH LOGS TAB */}
      {employeeDashboardTab === 'logs' && (() => {
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
      })()}

      {/* LEAVES MANAGEMENT TAB */}
      {employeeDashboardTab === 'leaves' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }} className="animate-fade-in">
          {/* Leave Balances */}
          <CollapsibleCard 
            title="Available Leave Balances" 
            style={{ width: '100%' }}
            actionButton={
              <button 
                onClick={() => setIsLeaveModalOpen(true)}
                className="btn btn-primary leave-apply-btn"
                style={{ 
                  fontWeight: 600, 
                  padding: '8px 16px', 
                  fontSize: '0.85rem', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <img
                  src="/icons/leave.png"
                  alt="Leave"
                  className="leave-button-icon"
                  style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                />
                <span>Apply for Leave</span>
              </button>
            }
          >
            <div style={styles.balancesGrid}>
              <div className="glass-panel" style={styles.balanceCard}>
                <div style={styles.balanceHeader}>
                  <span style={styles.balanceType}>Casual Leaves</span>
                  <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.casual_total - leaveBalance.casual_used : 10} Left</span>
                </div>
                <div style={styles.balanceProgressBg}>
                  <div 
                    style={{
                      ...styles.balanceProgressBar, 
                      backgroundColor: 'var(--primary)',
                      width: `${leaveBalance ? ((leaveBalance.casual_total - leaveBalance.casual_used) / leaveBalance.casual_total) * 100 : 100}%`
                    }}
                  ></div>
                </div>
                <small style={styles.balanceSub}>Used: {leaveBalance?.casual_used || 0} / Total: {leaveBalance?.casual_total || 10}</small>
              </div>

              <div className="glass-panel" style={styles.balanceCard}>
                <div style={styles.balanceHeader}>
                  <span style={styles.balanceType}>Medical Leaves</span>
                  <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.medical_total - leaveBalance.medical_used : 10} Left</span>
                </div>
                <div style={styles.balanceProgressBg}>
                  <div 
                    style={{
                      ...styles.balanceProgressBar, 
                      backgroundColor: 'var(--accent)',
                      width: `${leaveBalance ? ((leaveBalance.medical_total - leaveBalance.medical_used) / leaveBalance.medical_total) * 100 : 100}%`
                    }}
                  ></div>
                </div>
                <small style={styles.balanceSub}>Used: {leaveBalance?.medical_used || 0} / Total: {leaveBalance?.medical_total || 10}</small>
              </div>

              <div className="glass-panel" style={styles.balanceCard}>
                <div style={styles.balanceHeader}>
                  <span style={styles.balanceType}>Annual Leaves</span>
                  <span style={styles.balanceCount}>{leaveBalance ? leaveBalance.annual_total - leaveBalance.annual_used : 10} Left</span>
                </div>
                <div style={styles.balanceProgressBg}>
                  <div 
                    style={{
                      ...styles.balanceProgressBar, 
                      backgroundColor: 'var(--success)',
                      width: `${leaveBalance ? ((leaveBalance.annual_total - leaveBalance.annual_used) / leaveBalance.annual_total) * 100 : 100}%`
                    }}
                  ></div>
                </div>
                <small style={styles.balanceSub}>Used: {leaveBalance?.annual_used || 0} / Total: {leaveBalance?.annual_total || 10}</small>
              </div>
            </div>
          </CollapsibleCard>

          {/* Leave History Table */}
          <CollapsibleCard title="Leave Application History" style={{ width: '100%' }}>
            {(() => {
              const visibleLeaves = leaveHistory.filter(l => !hiddenLeaveIds.includes(l.id));
              const allSelected = visibleLeaves.length > 0 && selectedLeaveIds.length === visibleLeaves.length;

              const toggleSelectAll = () => {
                if (allSelected) {
                  setSelectedLeaveIds([]);
                } else {
                  setSelectedLeaveIds(visibleLeaves.map(l => l.id));
                }
              };

              const toggleSelectLeave = (id: number) => {
                setSelectedLeaveIds(prev => 
                  prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                );
              };

              return (
                <>
                  {selectedLeaveIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>
                        {selectedLeaveIds.length} leave request(s) selected
                      </span>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => handleDeleteLeaveRequests(selectedLeaveIds)}
                        style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Delete Selected ({selectedLeaveIds.length})
                      </button>
                    </div>
                  )}

                  <div style={styles.tableContainer} className="table-slider-container">
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              title="Select All"
                              style={{ cursor: 'pointer' }}
                            />
                          </th>
                          <th>Leave Type</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Days</th>
                          <th>Reason</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'center', width: '70px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleLeaves.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                              No leave requests found.
                            </td>
                          </tr>
                        ) : (
                          visibleLeaves.map((leave) => {
                            const getLeaveDaysCount = (startStr: string, endStr: string) => {
                              const start = new Date(startStr + 'T00:00:00');
                              const end = new Date(endStr + 'T00:00:00');
                              let count = 0;
                              const loop = new Date(start);
                              const holidayDates = holidaysList.map(h => h.date);
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
                                  count++;
                                }
                                loop.setDate(loop.getDate() + 1);
                              }
                              return count;
                            };
                            const days = getLeaveDaysCount(leave.start_date, leave.end_date);
                            const isSelected = selectedLeaveIds.includes(leave.id);

                            return (
                              <tr key={leave.id} style={{ ...styles.tableRow, background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                                <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectLeave(leave.id)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ ...styles.tableCell, fontWeight: '600' }}>{leave.leave_type} Leave</td>
                                <td style={styles.tableCell}>{leave.start_date}</td>
                                <td style={styles.tableCell}>{leave.end_date}</td>
                                <td style={styles.tableCell}>{days}</td>
                                <td style={styles.tableCell}>{leave.reason || '-'}</td>
                                <td style={styles.tableCell}>
                                  <span style={{
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    background: leave.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : leave.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    color: leave.status === 'Approved' ? '#10b981' : leave.status === 'Rejected' ? '#ef4444' : '#f59e0b'
                                  }}>
                                    {leave.status}
                                  </span>
                                </td>
                                <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLeaveRequests([leave.id])}
                                    title={leave.status === 'Pending' ? 'Cancel Leave Request' : 'Clear from History'}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              );
            })()}
          </CollapsibleCard>
        </div>
      )}

      {/* HELPDESK / COMPLAINTS TAB */}
      {employeeDashboardTab === 'helpdesk' && (
        <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', width: '100%', alignItems: 'flex-start' }} className="animate-fade-in responsive-split-container">
          {/* Left panel column: Complaints & Loans */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <CollapsibleCard title="Your Technical Complaints & Issues" defaultOpenMobile={true}>
              {(() => {
                const visibleComplaints = complaintsList.filter(c => c.id && !hiddenComplaintIds.includes(c.id));
                const allSelected = visibleComplaints.length > 0 && selectedComplaintIds.length === visibleComplaints.length;

                const toggleSelectAll = () => {
                  if (allSelected) {
                    setSelectedComplaintIds([]);
                  } else {
                    setSelectedComplaintIds(visibleComplaints.map(c => c.id!).filter(Boolean));
                  }
                };

                const toggleSelectComplaint = (id: number) => {
                  setSelectedComplaintIds(prev => 
                    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                  );
                };

                return (
                  <>
                    {selectedComplaintIds.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ef4444' }}>
                          {selectedComplaintIds.length} complaint(s) selected
                        </span>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDeleteComplaints(selectedComplaintIds)}
                          style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          Delete Selected ({selectedComplaintIds.length})
                        </button>
                      </div>
                    )}

                    <div style={styles.tableContainer} className="table-slider-container">
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={toggleSelectAll}
                                title="Select All"
                                style={{ cursor: 'pointer' }}
                              />
                            </th>
                            <th>Created At</th>
                            <th>Ticket Title</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'center', width: '70px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleComplaints.length > 0 ? (
                            visibleComplaints.map(c => {
                              const isSelected = c.id ? selectedComplaintIds.includes(c.id) : false;
                              let displayDescription = c.description;
                              if (c.title === 'Check In/Out Entry Correction') {
                                try {
                                  const parsed = JSON.parse(c.description);
                                  displayDescription = `Date: ${parsed.date || '-'} | In: ${parsed.check_in || '-'} | Out: ${parsed.check_out || '-'} | Reason: ${parsed.reason || '-'}`;
                                } catch (e) {
                                  displayDescription = c.description;
                                }
                              }

                              return (
                                <tr key={c.id} style={{ ...styles.tableRow, background: isSelected ? 'rgba(59, 130, 246, 0.08)' : undefined }}>
                                  <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                                    {c.id && (
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelectComplaint(c.id!)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                    )}
                                  </td>
                                  <td style={{ ...styles.tableCell, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                    {c.created_at ? new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                  </td>
                                  <td style={styles.tableCell}><strong>{c.title}</strong></td>
                                  <td style={styles.tableCell}>{displayDescription}</td>
                                  <td style={styles.tableCell}>
                                    <span style={{
                                      padding: '4px 10px',
                                      borderRadius: 'var(--radius-full)',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      background: c.status === 'Resolved' ? 'rgba(16, 185, 129, 0.15)' : c.status === 'In Progress' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                      color: c.status === 'Resolved' ? '#10b981' : c.status === 'In Progress' ? '#3b82f6' : '#f59e0b'
                                    }}>
                                      {c.status}
                                    </span>
                                  </td>
                                  <td style={{ ...styles.tableCell, textAlign: 'center' }}>
                                    {c.id && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComplaints([c.id!])}
                                        title={c.status === 'Open' ? 'Cancel Complaint Ticket' : 'Clear from History'}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                No complaints submitted yet. Need help? Submit a ticket on the right.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </CollapsibleCard>

            {/* Loan Applications List */}
            <CollapsibleCard title="Your Loan Applications & Repayment Status" defaultOpenMobile={true}>
              <div style={styles.tableContainer} className="table-slider-container">
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Applied At</th>
                      <th>Loan Name</th>
                      <th>Loan Amount</th>
                      <th>Monthly Deduction</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Repaid</th>
                      <th>Remaining</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeLoansList.length > 0 ? (
                      employeeLoansList.map(l => (
                        <tr key={l.id} style={styles.tableRow}>
                          <td style={{ ...styles.tableCell, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {l.created_at ? new Date(l.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                          </td>
                          <td style={styles.tableCell}><strong>{l.loan_name}</strong></td>
                          <td style={styles.tableCell}>PKR {l.loan_amount.toLocaleString()}</td>
                          <td style={styles.tableCell}>PKR {l.monthly_deduction.toLocaleString()} / mo ({l.months_duration || 1} mos)</td>
                          <td style={styles.tableCell}>{l.start_date ? new Date(l.start_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                          <td style={styles.tableCell}>{l.end_date ? new Date(l.end_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                          <td style={styles.tableCell}>PKR {(l.total_repaid || 0).toLocaleString()}</td>
                          <td style={styles.tableCell}>PKR {l.remaining_balance.toLocaleString()}</td>
                          <td style={styles.tableCell}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: l.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : l.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: l.status === 'Approved' ? '#10b981' : l.status === 'Rejected' ? '#ef4444' : '#f59e0b'
                            }}>
                              {l.status}
                            </span>
                          </td>
                          <td style={styles.tableCell}>
                            {l.status === 'Pending' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteLoan(l.id!)}
                                className="btn btn-danger"
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              >
                                Cancel / Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No loan requests submitted yet. Select "Loan Request" in the form to apply.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CollapsibleCard>
          </div>

          {/* Right panel: Submit Complaint Form */}
          <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', minWidth: 0 }}>
            <CollapsibleCard title="Submit Tech Issue / Loan Request / Feedback" defaultOpenMobile={true}>
              {/* Draft status helper indicator */}
              {(complaintTitle || complaintDesc) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Draft recovered from localStorage</span>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('draft_complaint');
                      setComplaintTitle('');
                      setComplaintDesc('');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Clear Draft
                  </button>
                </div>
              )}

              <form onSubmit={handleCreateComplaint} style={styles.form}>
                <div style={styles.formGroup}>
                  <label>Issue Type *</label>
                  <select
                    value={issueType}
                    onChange={e => { setIssueType(e.target.value); setComplaintTitle(e.target.value); }}
                    className="custom-select"
                    required
                  >
                    <option value="">-- Select Issue Type --</option>
                    {issueTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {issueType === 'Loan Request' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div style={styles.formGroup}>
                      <label>Loan Purpose / Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Personal Emergency Loan"
                        value={loanName}
                        onChange={e => setLoanName(e.target.value)}
                        required
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label>Contact Number *</label>
                      <input
                        type="tel"
                        placeholder="e.g. 0300-1234567"
                        value={loanContact}
                        onChange={e => setLoanContact(e.target.value)}
                        required
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label>Total Loan Amount (PKR) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 50000"
                        value={loanAmount}
                        onChange={e => setLoanAmount(e.target.value)}
                        required
                        min={1}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label>Repayment Duration (Months) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 10"
                        value={loanDurationMonths}
                        onChange={e => setLoanDurationMonths(e.target.value)}
                        required
                        min={1}
                        max={60}
                        style={styles.input}
                      />
                    </div>
                    {parseInt(loanDurationMonths, 10) > 0 && (
                      <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: '#10b981' }}>Repayment Schedule:</div>
                        <div style={{ display: 'flex', gap: '20px', marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          <span>Start: <strong>{new Date().toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })}</strong></span>
                          <span>End: <strong>{(() => { const d = new Date(); d.setMonth(d.getMonth() + parseInt(loanDurationMonths, 10)); return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }); })()}</strong></span>
                        </div>
                      </div>
                    )}
                    {parseFloat(loanAmount) > 0 && parseInt(loanDurationMonths, 10) > 0 && (
                      <div style={{ padding: '10px 14px', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>Per Month Deduction Calculation:</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, margin: '4px 0', color: 'var(--text-primary)' }}>
                          PKR {new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(parseFloat(loanAmount) / parseInt(loanDurationMonths, 10))} / month
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          This amount will be deducted per month until the total loan of PKR {new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(parseFloat(loanAmount))} is completed.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {issueType === 'Check In/Out Entry Correction' && (
                  <>
                    <div style={styles.formGroup}>
                      <label>Date *</label>
                      <input
                        type="date"
                        value={correctionDate}
                        onChange={e => setCorrectionDate(e.target.value)}
                        required
                      />
                    </div>
                    {correctionDate && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '14px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        <div style={styles.formGroup}>
                          <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Proposed Check-In Time</span>
                            {existingCheckIn && <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>Current: {existingCheckIn}</span>}
                          </label>
                          <input
                            type="time"
                            value={correctionCheckIn}
                            onChange={e => setCorrectionCheckIn(e.target.value)}
                            style={styles.input}
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                            <span>Proposed Check-Out Time</span>
                            {existingCheckOut && <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>Current: {existingCheckOut}</span>}
                          </label>
                          <input
                            type="time"
                            value={correctionCheckOut}
                            onChange={e => setCorrectionCheckOut(e.target.value)}
                            style={styles.input}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {issueType && issueType !== 'Check In/Out Entry Correction' && (
                  <div style={styles.formGroup}>
                    <label>Description / Technical Details *</label>
                    <textarea
                      value={complaintDesc}
                      onChange={e => setComplaintDesc(e.target.value)}
                      placeholder="Provide details about the issue..."
                      rows={5}
                      required={issueType !== 'Loan Request'}
                    />
                  </div>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', fontWeight: 600 }}>
                  {issueType === 'Loan Request' ? 'Apply for Loan' : 'Send Complaint'}
                </button>
              </form>
            </CollapsibleCard>

            {/* Trusted Device & Biometric Security Settings Card */}
            <CollapsibleCard title="Trusted Device & Biometric Security" defaultOpenMobile={true}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  Enable <strong>Fingerprint / Touch ID / Face ID</strong> (like Meezan, HBL, UBL banking apps) to log in instantly without typing your password.
                </p>

                {empTrustedDevice ? (
                  <div style={{ background: 'var(--bg-surface-hover)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <img
                        src={empTrustedDevice.icon_path || '/icons/fingerprint.svg'}
                        alt={empTrustedDevice.auth_type}
                        className="theme-icon"
                        style={{ width: '20px', height: '20px' }}
                      />
                      <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.85rem' }}>
                        ✓ {empTrustedDevice.auth_type === 'face_id' ? 'Face ID Active' : empTrustedDevice.auth_type === 'shield_key' ? 'Device PIN Active' : 'Fingerprint Active'} ({empTrustedDevice.device_name})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Icon File: <code>{empTrustedDevice.icon_name || 'fingerprint.svg'}</code>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Linked Account: <strong>{empTrustedDevice.email}</strong>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleDisableEmpBiometric} 
                      className="btn btn-secondary" 
                      style={{ width: '100%', fontSize: '0.8rem', color: 'var(--danger)' }}
                    >
                      Disable Biometric Login
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleRegisterEmpBiometric} 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '10px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <span>🛡️</span>
                    <span>Register / Trust This Device (Fingerprint / Face ID / PIN)</span>
                  </button>
                )}
              </div>
            </CollapsibleCard>
          </div>
        </div>
      )}



      {/* Change Password Modal (Optional Settings) */}
      {isChangePasswordModalOpen && (
        <div className="custom-overlay" onClick={() => { setIsChangePasswordModalOpen(false); setNewPassword(''); setConfirmPassword(''); }} style={{ zIndex: 20000 }}>
          <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '24px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Change Account Password
            </h3>
            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div style={styles.formGroup}>
                <label>New Password *</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label>Confirm Password *</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsChangePasswordModalOpen(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordChangeLoading}
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

      {/* Apply Leave Modal Overlay */}
      {isLeaveModalOpen && (
        <div className="custom-overlay" onClick={() => setIsLeaveModalOpen(false)}>
          <div className="custom-dialog-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', textAlign: 'left', alignItems: 'stretch' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Apply for Leave
            </h3>

            {/* Leave Draft Status Indicator */}
            {(startDate || endDate || reason) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', marginTop: '10px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Draft recovered</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('draft_leave_request');
                    setStartDate('');
                    setEndDate('');
                    setReason('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Clear Draft
                </button>
              </div>
            )}

            <form onSubmit={handleRequestLeave} style={{ ...styles.form, marginTop: '12px' }}>
              <div style={styles.formGroup}>
                <label>Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as 'Casual' | 'Medical' | 'Annual')}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Medical">Medical Leave</option>
                  <option value="Annual">Annual Leave</option>
                </select>
              </div>

              <div style={styles.dateRow}>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>Start Date</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div style={{ ...styles.formGroup, flex: 1 }}>
                  <label>End Date</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={styles.formGroup}>
                <label>Reason *</label>
                <textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State reason for leave..."
                  rows={4}
                  required
                />
              </div>

              <div style={{ ...styles.btnGroup, marginTop: '8px' }}>
                <button 
                  type="submit" 
                  disabled={submitLoading} 
                  className="btn btn-primary" 
                  style={{ flex: 1, background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600 }}
                >
                  {submitLoading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, border: '1px solid var(--border-color)', background: 'var(--bg-surface-hover)' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Calendar Day Detail Modal */}
      {selectedCalendarDay && (() => {
        const holiday = holidaysList.find(h => h.date === selectedCalendarDay.date);
        const cellDob = new Date(selectedCalendarDay.date + 'T00:00:00');
        const birthdayEmployees = allProfiles.filter(p => {
          if (!p.date_of_birth) return false;
          const dob = new Date(p.date_of_birth + 'T00:00:00');
          return dob.getMonth() === cellDob.getMonth() && dob.getDate() === cellDob.getDate();
        });
        const ownLeave = leaveHistory.find(lh => {
          if (lh.status === 'Rejected') return false;
          return selectedCalendarDay.date >= lh.start_date && selectedCalendarDay.date <= lh.end_date;
        });

        const statusLabel = holiday ? `Holiday (${holiday.title})` :
                            ownLeave ? `On Leave (${ownLeave.leave_type})` :
                            selectedCalendarDay.status;

        const isHolidayOrLeave = holiday || ownLeave;

        return (
          <div className="custom-overlay" onClick={() => setSelectedCalendarDay(null)}>
            <div className="custom-dialog-card glass-panel" onClick={e => e.stopPropagation()} style={{ padding: '24px', width: '400px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                Attendance Details
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                <div><strong>Date:</strong> {selectedCalendarDay.date} ({selectedCalendarDay.dayName})</div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    ...styles.statusTag,
                    background: holiday ? 'rgba(239, 68, 68, 0.15)' : ownLeave ? 'rgba(16, 185, 129, 0.15)' : getStatusTagStyle(selectedCalendarDay.status, selectedCalendarDay.isLate).backgroundColor,
                    color: holiday ? '#ef4444' : ownLeave ? '#10b981' : getStatusTagStyle(selectedCalendarDay.status, selectedCalendarDay.isLate).color
                  }}>
                    {statusLabel}
                  </span>
                </div>

                {birthdayEmployees.map(emp => (
                  <div key={emp.id} style={{ color: '#f59e0b', fontWeight: '600' }}>
                    🎂 Birthday: {emp.full_name} ({emp.department || 'Staff'})
                  </div>
                ))}

                {ownLeave && (
                  <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <div style={{ fontWeight: '600', color: '#10b981' }}>Leave Request Details:</div>
                    <div>Status: {ownLeave.status}</div>
                    {ownLeave.reason && (
                      <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>Reason: "{ownLeave.reason}"</div>
                    )}
                  </div>
                )}

                {!isHolidayOrLeave && (
                  <>
                    <div><strong>Check In:</strong> {selectedCalendarDay.checkIn || '-'}</div>
                    <div><strong>Check Out:</strong> {selectedCalendarDay.checkOut || '-'}</div>
                    <div><strong>Working Hours:</strong> {selectedCalendarDay.workingHours > 0 ? formatClockDuration(selectedCalendarDay.workingHours) : '-'}</div>
                    {isCompensationMode ? (
                      <>
                        <div><strong>Compensation Time:</strong> {selectedCalendarDay.compensatedOvertimeHours > 0 ? formatOvertimeDuration(selectedCalendarDay.compensatedOvertimeHours) : '-'}</div>
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal"><strong>Comp Payout:</strong> {selectedCalendarDay.overtimePayout > 0 ? (showEmployeeSalary ? formatSalary(selectedCalendarDay.overtimePayout) : '••••••') : '-'}</div>
                      </>
                    ) : (
                      <>
                        <div><strong>Overtime Hours:</strong> {selectedCalendarDay.overtimeHours > 0 ? formatOvertimeDuration(selectedCalendarDay.overtimeHours) : '-'}</div>
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal"><strong>Overtime Payout:</strong> {selectedCalendarDay.overtimePayout > 0 ? (showEmployeeSalary ? formatSalary(selectedCalendarDay.overtimePayout) : '••••••') : '-'}</div>
                      </>
                    )}
                    {(() => {
                      const ds = selectedCalendarDay;
                      const ded = (ds.absenceDeduction || 0) + (ds.lateDeduction || 0);
                      if (ded <= 0) return null;
                      const label = ds.absenceDeduction > 0 ? 'Absent' : (ds.isLate ? 'Late Arrival' : 'Short Time');
                      return (
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal">
                          <strong>Deduction ({label}):</strong>{' '}
                          <span style={{ color: 'var(--danger)', fontWeight: '700' }}>
                            {showEmployeeSalary ? `- ${formatSalary(ded)}` : '••••••'}
                          </span>
                        </div>
                      );
                    })()}
                    {(() => {
                      const emp = profile;
                      if (!emp || !emp.base_salary) return null;
                      const dailyBase = (emp.base_salary || 0) / 30;
                      const ds = selectedCalendarDay;
                      let dayTotal = 0;
                      if (ds.status === 'Absent' || ds.status === 'Uninformed Absent') {
                        dayTotal = Math.max(0, dailyBase - (ds.absenceDeduction || 0));
                      } else if (ds.status === 'Unprocessed') {
                        dayTotal = 0;
                      } else {
                        dayTotal = Math.max(0, dailyBase + (ds.overtimePayout || 0) - (ds.lateDeduction || 0));
                      }
                      return (
                        <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer', marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)' }} title="Click to toggle reveal">
                          <strong>Particular Day Total Amount:</strong> <span style={{ color: 'var(--success)', fontWeight: '700' }}>{showEmployeeSalary ? formatSalary(dayTotal) : '••••••'}</span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              <button 
                onClick={() => setSelectedCalendarDay(null)}
                className="btn btn-primary"
                style={{ marginTop: '16px', background: 'var(--primary)', color: 'var(--btn-primary-text)', fontWeight: 600 }}
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

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

            {'Notification' in window && (window as any).Notification.permission !== 'granted' && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  🔔 Enable Phone Bar Notifications
                </span>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => (window as any).enableDeviceNotifications?.()}
                  style={{ padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Enable Now
                </button>
              </div>
            )}

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
                      background: n.is_read ? 'rgba(255, 255, 255, 0.01)' : 'rgba(255, 255, 255, 0.04)',
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

function getStatusTagStyle(status: DailySummary['status'], isLate: boolean) {
  if (isLate) return { backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#d97706' };
  switch (status) {
    case 'Present':
      return { backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#059669' };
    case 'Absent':
    case 'Uninformed Absent':
      return { backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#dc2626' };
    case 'Off Saturday':
    case 'Sunday':
      return { backgroundColor: 'var(--bg-surface-hover)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' };
    default:
      return { backgroundColor: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', color: '#7c3aed' };
  }
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
    border: '3px solid rgba(255, 255, 255, 0.1)',
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
  tabsRow: {
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid var(--border-color)',
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
    fontSize: '0.85rem',
    display: 'inline-flex',
    alignItems: 'center'
  },
  dashboardContent: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box'
  },
  mainPanel: {
    flex: '3 1 600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box'
  },
  sidebarPanel: {
    flex: '1 1 320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box'
  },
  welcomeRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box'
  },
  profileCard: {
    flex: '1 1 300px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '12px',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)'
  },
  statsCard: {
    flex: '1 1 300px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '12px'
  },
  statBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)'
  },
  balancesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: '600'
  },
  balancesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px'
  },
  balanceCard: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  balanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  balanceType: {
    fontWeight: '500',
    color: 'var(--text-secondary)'
  },
  balanceCount: {
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontSize: '1.1rem'
  },
  balanceProgressBg: {
    height: '6px',
    background: 'var(--bg-surface-hover)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden'
  },
  balanceProgressBar: {
    height: '100%',
    borderRadius: 'var(--radius-full)',
    transition: 'width 0.4s ease'
  },
  balanceSub: {
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    fontWeight: '500'
  },
  tablePanel: {
    padding: '24px',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    overflow: 'hidden'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  tableContainer: {
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '68vh',
    position: 'relative',
    WebkitOverflowScrolling: 'touch',
    borderRadius: 'var(--radius-sm)',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    display: 'block',
    boxSizing: 'border-box'
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
    color: 'var(--text-secondary)',
    verticalAlign: 'middle'
  },
  statusTag: {
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block'
  },
  formPanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px'
  },
  formAlert: {
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '0.85rem',
    border: '1px solid'
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
  submitBtn: {
    marginTop: '6px',
    width: '100%'
  },
  historyPanel: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '350px',
    overflowY: 'auto',
    paddingRight: '6px'
  },
  historyItem: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  historyType: {
    fontSize: '0.875rem',
    color: 'var(--text-primary)'
  },
  historyDate: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)'
  },
  historyReason: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic'
  },
  emptyText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '20px 0'
  }
};
