import React, { useState, useEffect } from 'react';
import { 
  getPublicProfiles, 
  getProfileById,
  getLeaveBalances, 
  getLeaveRequests, 
  getRawLogs, 
  createLeaveRequest,
  getComplaints,
  createComplaint,
  getAnnouncements,
  getNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  getHolidays,
  checkAndTriggerBirthdayNotifications,
  getShiftTimings
} from '../lib/dbHelper';
import type { Complaint, Announcement, Notification, Holiday, ShiftTiming } from '../lib/dbHelper';
import { processAttendanceLogs } from '../utils/attendanceProcessor';
import type { DailySummary, EmployeeProfile, LeaveRequest } from '../utils/attendanceProcessor';
import ConfettiCanvas from '../components/ConfettiCanvas';

interface EmployeeDashboardProps {
  user: any;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function EmployeeDashboard({ user, onLogout, theme, toggleTheme }: EmployeeDashboardProps) {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<EmployeeProfile[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [employeeDashboardTab, setEmployeeDashboardTab] = useState<'dashboard' | 'leaves' | 'helpdesk'>('dashboard');
  const [holidaysList, setHolidaysList] = useState<Holiday[]>([]);

  // Helpdesk complaints states
  const [complaintsList, setComplaintsList] = useState<Complaint[]>([]);
  const [complaintTitle, setComplaintTitle] = useState('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [issueType, setIssueType] = useState('');
  const [correctionDate, setCorrectionDate] = useState('');
  const [correctionCheckIn, setCorrectionCheckIn] = useState('');
  const [correctionCheckOut, setCorrectionCheckOut] = useState('');
  const [existingCheckIn, setExistingCheckIn] = useState('');
  const [existingCheckOut, setExistingCheckOut] = useState('');

  // Announcements & Notifications states
  const [announcementsList, setAnnouncementsList] = useState<Announcement[]>([]);
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Calendar navigation (July 2026 default)
  const [calendarYear, setCalendarYear] = useState(2026);
  const [calendarMonth, setCalendarMonth] = useState(6);
  const [showBirthdayEffect, setShowBirthdayEffect] = useState(false);
  const [showEmployeeSalary, setShowEmployeeSalary] = useState(false);

  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const issueTypes = [
    'Network / Internet Issue',
    'Hardware Issue (PC, Printer, etc.)',
    'Software / Application Issue',
    'Email / Account Issue',
    'Check In/Out Entry Correction',
    'Other'
  ];

  // When correction date changes, look up existing attendance data
  useEffect(() => {
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
      if (!daySummary.checkIn) setCorrectionCheckIn('');
      if (!daySummary.checkOut) setCorrectionCheckOut('');
    } else {
      setExistingCheckIn('');
      setExistingCheckOut('');
    }
  }, [correctionDate, attendanceSummaries]);

  useEffect(() => {
    fetchData();
  }, [user, calendarYear, calendarMonth]);

  const getEmployeeShiftTiming = (emp: EmployeeProfile, timings: ShiftTiming[]) => {
    const empRule = timings.find(t => t.target_type === 'employee' && t.target_id === emp.id);
    if (empRule) return { startTime: empRule.start_time, endTime: empRule.end_time };
    
    if (emp.designation) {
      const desigRule = timings.find(t => t.target_type === 'designation' && t.target_id === emp.designation);
      if (desigRule) return { startTime: desigRule.start_time, endTime: desigRule.end_time };
    }
    
    if (emp.department) {
      const deptRule = timings.find(t => t.target_type === 'department' && t.target_id === emp.department);
      if (deptRule) return { startTime: deptRule.start_time, endTime: deptRule.end_time };
    }
    
    return { startTime: '11:00', endTime: '20:00' };
  };

  const fetchData = async () => {
    if (isFirstLoad) {
      setLoading(true);
    } else {
      window.showLoading('is in the process');
    }
    try {
      const currentProfile = await getProfileById(user.id);
      setProfile(currentProfile);

      const publicProfiles = await getPublicProfiles();
      setAllProfiles(publicProfiles as EmployeeProfile[]);
      
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
        const balances = await getLeaveBalances(currentProfile.id);
        setLeaveBalance(balances[0] || null);

        // Fetch leave requests
        const leaves = await getLeaveRequests(currentProfile.id);
        setLeaveHistory(leaves.sort((a, b) => b.id - a.id));

        // Fetch raw attendance logs
        const rawLogs = await getRawLogs(currentProfile.pin);

        // Fetch holidays
        const holidays = await getHolidays();
        setHolidaysList(holidays);
        const holidayDates = holidays.map(h => h.date);

        // Fetch shift timings
        let timings: ShiftTiming[] = [];
        try {
          timings = await getShiftTimings();
        } catch (e) {
          /* console removed */
        }

        // Calculate dynamic month start/end range based on calendar selection
        const pad = (n: number) => n.toString().padStart(2, '0');
        const lastDay = new Date(calendarYear, calendarMonth + 1, 0).getDate();
        const startStr = `${calendarYear}-${pad(calendarMonth + 1)}-01`;
        const endStr = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(lastDay)}`;

        const graceTime = parseInt(localStorage.getItem('office_grace_time_mins') || '15', 10);
        const timing = getEmployeeShiftTiming(currentProfile, timings);

        const processed = processAttendanceLogs(
          currentProfile,
          rawLogs,
          leaves,
          startStr,
          endStr,
          holidayDates,
          graceTime,
          timing.startTime,
          timing.endTime
        );
        setAttendanceSummaries(processed.slice().reverse());

        // Fetch complaints (table may not exist yet)
        try {
          const complaints = await getComplaints(currentProfile.id);
          setComplaintsList(complaints);
        } catch (e) { /* console removed */ }

        // Fetch announcements (table may not exist yet)
        try {
          const announcements = await getAnnouncements();
          setAnnouncementsList(announcements);
        } catch (e) { /* console removed */ }

        // Fetch notifications (table may not exist yet)
        try {
          const notifications = await getNotifications(currentProfile.id, false);
          setNotificationsList(notifications);
        } catch (e) { /* console removed */ }

        // Check and trigger birthday notifications
        try {
          await checkAndTriggerBirthdayNotifications();
        } catch (e) { /* console removed */ }
      }
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
    } catch (err) {
      /* console removed */
    } finally {
      if (isFirstLoad) {
        setLoading(false);
      } else {
        window.hideLoading();
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

    if (leaveBalance) {
      const typeKey = leaveType.toLowerCase();
      const total = leaveBalance[`${typeKey}_total` as keyof typeof leaveBalance] as number;
      const used = leaveBalance[`${typeKey}_used` as keyof typeof leaveBalance] as number;
      const remaining = total - used;

      if (diffDays > remaining) {
        window.customAlert(`Insufficient leave balance! You requested ${diffDays} day(s), but only have ${remaining} day(s) remaining.`);
        setSubmitLoading(false);
        return;
      }
    }

    window.showLoading('is in the process');
    try {
      await createLeaveRequest({
        employee_id: profile.id,
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        reason
      });

      // Create notification for HR / Admins
      try {
        await createNotification({
          user_id: null,
          title: 'New Leave Request',
          message: `${profile.full_name} has requested ${leaveType} leave from ${startDate} to ${endDate}.`
        });
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
      window.customAlert(`Leave request for ${diffDays} day(s) submitted successfully!`);
    } catch (err) {
      /* console removed */
      window.customAlert('Failed to submit request. Please try again.');
    } finally {
      window.hideLoading();
      setSubmitLoading(false);
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const isCorrection = issueType === 'Check In/Out Entry Correction';

    if (isCorrection) {
      if (!correctionDate) {
        window.customAlert('Please select a date for the correction.');
        return;
      }
      if (!existingCheckIn && !existingCheckOut && !correctionCheckIn && !correctionCheckOut) {
        window.customAlert('Please set at least one time entry.');
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
      const to24h = (t: string) => {
        if (!t) return null;
        if (/^\d{2}:\d{2}$/.test(t)) return t;
        const m = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!m) return t;
        let h = Number(m[1]);
        if (/pm/i.test(m[3]) && h !== 12) h += 12;
        if (/am/i.test(m[3]) && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${m[2]}`;
      };
      const description = isCorrection
        ? JSON.stringify({
            type: 'attendance_correction',
            date: correctionDate,
            check_in: to24h(existingCheckIn) || (correctionCheckIn ? correctionCheckIn : null),
            check_out: to24h(existingCheckOut) || (correctionCheckOut ? correctionCheckOut : null),
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
          user_id: null,
          title: isCorrection ? 'Attendance Correction Request' : 'New Helpdesk Complaint',
          message: `${profile.full_name} submitted ${isCorrection ? `a correction for ${correctionDate}` : `"${issueType}"`}.`
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
      const notifications = await getNotifications(profile.id, false);
      setNotificationsList(notifications);
    } catch (err) {
      /* console removed */
    }
  };

  const handleMarkNotificationRead = async (id: number, notification?: Notification) => {
    if (!profile) return;
    try {
      await markNotificationRead(id);
      const notifications = await getNotifications(profile.id, false);
      setNotificationsList(notifications);
      
      // Redirect to relevant panel based on notification title
      if (notification) {
        setShowNotificationsDropdown(false);
        const title = notification.title.toLowerCase();
        if (title.includes('leave')) {
          setEmployeeDashboardTab('leaves');
        } else if (title.includes('complaint') || title.includes('helpdesk')) {
          setEmployeeDashboardTab('helpdesk');
        } else if (title.includes('announce')) {
          setEmployeeDashboardTab('dashboard');
        } else if (title.includes('holiday') || title.includes('birthday')) {
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

  // Calculate monthly stats
  const totalOvertimeHours = attendanceSummaries.reduce((sum, s) => sum + s.overtimeHours, 0);
  const totalOvertimeEarnings = attendanceSummaries.reduce((sum, s) => sum + s.overtimePayout, 0);
  const totalLateDeductions = attendanceSummaries.reduce((sum, s) => sum + s.lateDeduction, 0);
  const totalAbsenceDeductions = attendanceSummaries.reduce((sum, s) => sum + s.absenceDeduction, 0);
  const lateCount = attendanceSummaries.filter(s => s.isLate).length;
  const absentCount = attendanceSummaries.filter(s => s.isAbsent).length;
  const netSalaryForMonth = (profile?.base_salary || 0) + totalOvertimeEarnings - totalLateDeductions - totalAbsenceDeductions;

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
    if (ann.target_type === 'all') return true;
    if (ann.target_type === 'department' && profile && ann.target_value === profile.department) return true;
    if (ann.target_type === 'designation' && profile && ann.target_value === profile.designation) return true;
    return false;
  });

  return (
    <div style={styles.page}>
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
          <span style={styles.badge}>Employee Portal</span>
        </div>
        <div style={styles.navUser}>
          <img 
            src="/icons/user.png" 
            alt="user" 
            className="theme-icon" 
            style={{ width: '18px', height: '18px' }} 
          />
          <span style={styles.navUsername}>{profile?.full_name}</span>
          
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
          
          {/* Theme switcher toggle */}
          <button onClick={toggleTheme} style={styles.toggleBtn} className="btn btn-secondary" title="Toggle Theme">
            <img 
              src={theme === 'dark' ? '/icons/sun.png' : '/icons/moon.png'} 
              alt="Theme" 
              className="theme-icon" 
              style={{ width: '16px', height: '16px', display: 'block' }} 
            />
          </button>
          
          <button onClick={onLogout} style={styles.logoutBtn} className="btn btn-secondary">
            <img 
              src="/icons/logout.png" 
              alt="logout" 
              className="theme-icon" 
              style={{ width: '14px', height: '14px', marginRight: '6px' }} 
            /> Sign Out
          </button>
        </div>
      </nav>

      {/* Tabs Selection */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
        <div style={styles.tabsRow}>
          <button 
            onClick={() => setEmployeeDashboardTab('dashboard')} 
            style={{...styles.tabBtn, borderBottom: employeeDashboardTab === 'dashboard' ? '3px solid var(--primary)' : 'none', color: employeeDashboardTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)'}}
          >
            Dashboard
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
        <button onClick={fetchData} title="Refresh from database" style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '0.8rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
          ⟳ Refresh
        </button>
      </div>

      {/* TAB CONTENT */}
      {employeeDashboardTab === 'dashboard' && (
        <div style={styles.dashboardContent} className="animate-fade-in">
          {/* Month/Year Filter Row */}
          <div className="glass-panel" style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center',
            gap: '16px', flexWrap: 'wrap', width: '100%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src="/icons/clock.png" alt="period" className="theme-icon" style={{ width: '16px', height: '16px' }} />
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Period:</strong>
            </div>
            <select
              value={calendarMonth}
              onChange={e => { setCalendarMonth(parseInt(e.target.value)); }}
              style={{ width: '140px', padding: '6px 12px', fontSize: '0.85rem' }}
              className="custom-select"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              value={calendarYear}
              onChange={e => setCalendarYear(parseInt(e.target.value))}
              style={{ width: '100px', padding: '6px 12px', fontSize: '0.85rem' }}
              className="custom-select"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {attendanceSummaries.length} days
            </span>
          </div>

          {/* Main Panel (Full Width) */}
          <div style={{ ...styles.mainPanel, flex: '1 1 100%' }}>
            {/* Welcome Cards */}
            <div style={styles.welcomeRow}>
              <div className="glass-panel" style={styles.profileCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0 }}>Profile Details</h3>
                  <button 
                    onClick={() => setShowEmployeeSalary(!showEmployeeSalary)}
                    className="btn btn-secondary"
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
                  <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal"><strong>Hourly Rate:</strong> {showEmployeeSalary ? `${formatSalary(profile?.hourly_rate || 0)}/hr` : '••••••/hr'}</div>
                  <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal"><strong>Base Salary:</strong> {showEmployeeSalary ? `${formatSalary(profile?.base_salary || 0)}/mo` : '••••••/mo'}</div>
                </div>
              </div>

              <div className="glass-panel" style={styles.statsCard}>
                <h3>{monthNames[calendarMonth]} Summary</h3>
                <div style={styles.statsGrid}>
                  <div style={styles.statBox}>
                    <img 
                      src="/icons/clock.png" 
                      alt="clock" 
                      className="theme-icon" 
                      style={{ width: '20px', height: '20px' }} 
                    />
                    <div>
                      <h4>{totalOvertimeHours.toFixed(1)} hrs</h4>
                      <span>Overtime</span>
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
                      <h4 onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal">{showEmployeeSalary ? formatSalary(totalOvertimeEarnings) : '••••••'}</h4>
                      <span>OT Payout</span>
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
              </div>
            </div>

            {/* Targeted Announcements */}
            {activeAnnouncements.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Announcements</h3>
                {activeAnnouncements.map(ann => (
                  <div key={ann.id} className="glass-panel-glow" style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color-glow)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <img 
                        src="/icons/info.png" 
                        alt="announce" 
                        className="theme-icon" 
                        style={{ width: '16px', height: '16px' }} 
                      />
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{ann.title}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {new Date(ann.created_at || '').toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {ann.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

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
            <div className="glass-panel" style={styles.tablePanel}>
              <div style={styles.tableHeader}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Attendance & Overtime</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                    
                    {/* Month selection dropdown */}
                    <select
                      value={calendarMonth}
                      onChange={e => setCalendarMonth(parseInt(e.target.value))}
                      style={{ width: '130px', padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      {monthNames.map((name, idx) => (
                        <option key={idx} value={idx}>{name}</option>
                      ))}
                    </select>

                    {/* Year selection dropdown */}
                    <select
                      value={calendarYear}
                      onChange={e => setCalendarYear(parseInt(e.target.value))}
                      style={{ width: '90px', padding: '6px 12px', fontSize: '0.85rem' }}
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => setCalendarView('calendar')} 
                    className="btn" 
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      background: calendarView === 'calendar' ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                      color: calendarView === 'calendar' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      fontWeight: 600
                    }}
                  >
                    Calendar
                  </button>
                  <button 
                    onClick={() => setCalendarView('table')} 
                    className="btn" 
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.85rem',
                      background: calendarView === 'table' ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                      color: calendarView === 'table' ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      fontWeight: 600
                    }}
                  >
                    Table
                  </button>
                </div>
              </div>

              {calendarView === 'table' ? (
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Day</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Work Hours</th>
                        <th>Overtime</th>
                        <th>OT Earned</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceSummaries.map((summary) => (
                        <tr key={summary.date} style={styles.tableRow}>
                          <td style={styles.tableCell}>{summary.date}</td>
                          <td style={styles.tableCell}>{summary.dayName}</td>
                          <td style={styles.tableCell}>{summary.checkIn || '-'}</td>
                          <td style={styles.tableCell}>{summary.checkOut || '-'}</td>
                          <td style={styles.tableCell}>{summary.workingHours} hrs</td>
                          <td style={styles.tableCell}>{summary.overtimeHours} hrs</td>
                          <td style={styles.tableCell}>{formatSalary(summary.overtimePayout)}</td>
                          <td style={styles.tableCell}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: summary.status === 'Present' ? 'rgba(16, 185, 129, 0.15)' : 
                                          summary.status === 'Absent' ? 'rgba(239, 68, 68, 0.15)' :
                                          summary.status === 'Holiday' ? 'rgba(239, 68, 68, 0.15)' :
                                          summary.status.includes('Leave') ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-surface-hover)',
                              color: summary.status === 'Present' ? '#059669' : 
                                     summary.status === 'Absent' ? '#dc2626' :
                                     summary.status === 'Holiday' ? '#dc2626' :
                                     summary.status.includes('Leave') ? '#7c3aed' : 'var(--text-muted)'
                            }}>
                              {summary.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                          return <div key={`empty-${idx}`} style={{ minHeight: '85px', background: 'transparent' }} />;
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
                          if (daySummary.status === 'Holiday') {
                            cellBg = 'rgba(239, 68, 68, 0.15)';
                            cellBorder = '1px solid rgba(239, 68, 68, 0.5)';
                            statusText = 'Holiday';
                            statusColor = '#dc2626';
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
                          } else if (daySummary.status === 'Present') {
                            cellBg = 'rgba(16, 185, 129, 0.05)';
                            cellBorder = '1px solid rgba(16, 185, 129, 0.2)';
                            statusText = 'Present';
                            statusColor = '#059669';
                          } else if (daySummary.status === 'Sunday' || daySummary.status === 'Off Saturday') {
                            cellBg = 'var(--bg-surface-hover)';
                            statusText = daySummary.status === 'Sunday' ? 'Sun' : 'Sat Off';
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
                            className="dropdown-item-hover"
                          >
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {dayNum}
                            </span>
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


      {/* LEAVES MANAGEMENT TAB */}
      {employeeDashboardTab === 'leaves' && (
        <div style={{ ...styles.dashboardContent, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }} className="animate-fade-in">
          {/* Leave Balances */}
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Available Leave Balances</h3>
              <button 
                onClick={() => setIsLeaveModalOpen(true)}
                className="btn btn-primary"
                style={{ fontWeight: 600, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Apply for Leave
              </button>
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

          {/* Leave History Table */}
          <div className="glass-panel" style={{ ...styles.panel, width: '100%', padding: '24px' }}>
            <h3 style={{ margin: 0, marginBottom: '16px' }}>Leave Application History</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No leave requests found.
                      </td>
                    </tr>
                  ) : (
                    leaveHistory.map((leave) => {
                      const days = Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return (
                        <tr key={leave.id} style={styles.tableRow}>
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

      {/* HELPDESK / COMPLAINTS TAB */}
      {employeeDashboardTab === 'helpdesk' && (
        <div style={styles.dashboardContent} className="animate-fade-in">
          {/* Left panel: Complaints List */}
          <div className="glass-panel" style={{ ...styles.panel, flex: 2, padding: '24px' }}>
            <h3 style={{ margin: 0, marginBottom: '16px' }}>Your Technical Complaints & Issues</h3>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Created At</th>
                    <th>Ticket Title</th>
                    <th>Description</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complaintsList.length > 0 ? (
                    complaintsList.map(c => (
                      <tr key={c.id} style={styles.tableRow}>
                        <td style={styles.tableCell}>{new Date(c.created_at || '').toLocaleDateString()}</td>
                        <td style={styles.tableCell}><strong>{c.title}</strong></td>
                        <td style={styles.tableCell}>{c.description}</td>
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
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No complaints submitted yet. Need help? Submit a ticket on the right.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right panel: Submit Complaint Form */}
          <div className="glass-panel" style={{ ...styles.panel, flex: 1, padding: '24px' }}>
            <h3 style={{ margin: 0, marginBottom: '16px' }}>Submit Tech Issue / Feedback</h3>
            
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                      {existingCheckIn ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Current Check-In: <strong style={{ color: 'var(--text-primary)' }}>{existingCheckIn}</strong>
                        </div>
                      ) : (
                        <div style={styles.formGroup}>
                          <label style={{ fontSize: '0.85rem' }}>Set Check-In Time</label>
                          <input
                            type="time"
                            value={correctionCheckIn}
                            onChange={e => setCorrectionCheckIn(e.target.value)}
                          />
                        </div>
                      )}
                      {existingCheckOut ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Current Check-Out: <strong style={{ color: 'var(--text-primary)' }}>{existingCheckOut}</strong>
                        </div>
                      ) : (
                        <div style={styles.formGroup}>
                          <label style={{ fontSize: '0.85rem' }}>Set Check-Out Time</label>
                          <input
                            type="time"
                            value={correctionCheckOut}
                            onChange={e => setCorrectionCheckOut(e.target.value)}
                          />
                        </div>
                      )}
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
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', fontWeight: 600 }}>
                Send Complaint
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave Modal Overlay */}
      {isLeaveModalOpen && (
        <div className="custom-overlay">
          <div className="custom-dialog-card" style={{ maxWidth: '460px', textAlign: 'left', alignItems: 'stretch' }}>
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
                <label>Leave Type</label>
                <select 
                  value={leaveType} 
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="custom-select"
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
          <div className="custom-overlay">
            <div className="custom-dialog-card glass-panel" style={{ padding: '24px', width: '400px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
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
                    <div><strong>Working Hours:</strong> {selectedCalendarDay.workingHours > 0 ? `${selectedCalendarDay.workingHours} hrs` : '-'}</div>
                    <div><strong>Overtime Hours:</strong> {selectedCalendarDay.overtimeHours > 0 ? `${selectedCalendarDay.overtimeHours} hrs` : '-'}</div>
                    <div onClick={() => setShowEmployeeSalary(!showEmployeeSalary)} style={{ cursor: 'pointer' }} title="Click to toggle reveal"><strong>Overtime Payout:</strong> {selectedCalendarDay.overtimePayout > 0 ? (showEmployeeSalary ? formatSalary(selectedCalendarDay.overtimePayout) : '••••••') : '-'}</div>
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
    alignItems: 'flex-start'
  },
  mainPanel: {
    flex: '3 1 600px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  sidebarPanel: {
    flex: '1 1 320px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  welcomeRow: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap'
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
    color: 'var(--text-muted)',
    fontSize: '0.75rem'
  },
  tablePanel: {
    padding: '24px'
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
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
