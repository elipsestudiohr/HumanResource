export interface RawLog {
  id?: number;
  employee_pin: string;
  timestamp: string;
  verify_type: number;
  status_type: number;
}

export interface LeaveRequest {
  id: number;
  employee_id: string;
  start_date: string;
  end_date: string;
  leave_type: 'Casual' | 'Medical' | 'Annual';
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
}

export interface EmployeeProfile {
  id: string;
  pin: string;
  full_name: string;
  designation?: string;
  department?: string;
  joining_date: string;
  base_salary: number;
  hourly_rate: number;
  email?: string;
  password?: string;
  role?: 'admin' | 'employee';
  date_of_birth?: string;
  income_tax?: number;
  is_first_login?: boolean;
  nic_no?: string;
  emergency_contacts?: { name: string; phone: string; relation: string; }[];
  timeline_periods?: { heading: string; startDate: string; endDate: string; }[];
  warning_text?: string;
  warning_expiry?: string;
  warning_color?: string;
  warning_active?: boolean;
  bank_name?: string;
  bank_account_title?: string;
  bank_account_no?: string;
  payment_method?: 'Bank' | 'Cash';
  phone?: string;
}

export interface ShiftTiming {
  id?: number;
  target_type: 'employee' | 'designation' | 'department';
  target_id: string;
  target_name?: string;
  start_time: string;
  end_time: string;
  grace_mins?: number;
  days?: string[];
  is_fixed_hours?: boolean;
  total_hours?: number;
  saturday_option?: 'alternate' | 'all_off' | 'all_working';
  allow_regular_overtime?: boolean;
  created_at?: string;
}

export function calculateShiftDurationHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 9;
  const sParts = startTime.split(':').map(Number);
  const eParts = endTime.split(':').map(Number);
  if (isNaN(sParts[0]) || isNaN(eParts[0])) return 9;
  let startMins = sParts[0] * 60 + (sParts[1] || 0);
  let endMins = eParts[0] * 60 + (eParts[1] || 0);
  if (endMins <= startMins) endMins += 24 * 60;
  const diffHours = (endMins - startMins) / 60;
  return diffHours > 0 && diffHours <= 24 ? diffHours : 9;
}

export function resolveTotalHours(t: ShiftTiming): number {
  const th = Number(t.total_hours);
  if (!isNaN(th) && th > 0 && th <= 24) return th;
  // Fallback: decode from encoded start_time seconds (09:00:SS) or end_time minutes (09:MM:00)
  const rawStart = String(t.start_time || '');
  const rawEnd = String(t.end_time || '');
  const startParts = rawStart.split(':');
  const endParts = rawEnd.split(':');
  const secs = startParts[2] ? parseInt(startParts[2], 10) : 0;
  if (secs > 0 && secs <= 24) return secs;
  const endMins = endParts[1] ? parseInt(endParts[1], 10) : 0;
  const startMins = startParts[1] ? parseInt(startParts[1], 10) : 0;
  if (rawEnd.startsWith('09:') && endMins > 0 && endMins <= 24 && startMins === 0) return endMins;
  return calculateShiftDurationHours(t.start_time, t.end_time);
}

export function isFixedHoursTiming(t: ShiftTiming): boolean {
  if (t.is_fixed_hours) return true;
  const startStr = String(t.start_time || '');
  const endStr = String(t.end_time || '');
  const startParts = startStr.split(':');
  const startSecs = startParts[2] ? parseInt(startParts[2], 10) : 0;
  if (startStr === endStr || (startStr.startsWith('09:00') && endStr.startsWith('09:')) || (startSecs > 0 && startSecs <= 24)) {
    return true;
  }
  return false;
}

export function matchesEmployeeRule(t: ShiftTiming, emp: EmployeeProfile): boolean {
  if (!t) return false;
  const targetType = String(t.target_type || '').trim().toLowerCase();
  if (targetType !== 'employee') return false;
  if (!emp) return false;

  const empId = String(emp.id || '').trim().toLowerCase();
  const empPin = String(emp.pin || '').trim().toLowerCase();
  const empEmail = String(emp.email || '').trim().toLowerCase();
  const empName = String(emp.full_name || '').trim().toLowerCase();

  const targetId = String(t.target_id || '').trim().toLowerCase();
  const rawTargetName = String(t.target_name || '').trim().toLowerCase();
  const cleanTargetName = rawTargetName.replace(/\[FIXED_HOURS:[^\]]+\]/gi, '').replace(/\[ALLOW_OT:[^\]]+\]/gi, '').trim();

  // 1. Direct ID match
  if (empId && (targetId === empId || cleanTargetName === empId || matchPin(targetId, empId) || matchPin(cleanTargetName, empId))) return true;

  // 2. Direct PIN match
  if (empPin && (targetId === empPin || cleanTargetName === empPin || matchPin(targetId, empPin) || matchPin(cleanTargetName, empPin))) return true;

  // 3. Email match
  if (empEmail && (targetId === empEmail || cleanTargetName === empEmail)) return true;

  // 4. Exact PIN in parentheses or word boundary match on cleaned name (prevents PIN 9 matching [FIXED_HOURS:9])
  if (empPin) {
    const parenthesizedPin = `(${empPin})`;
    if (targetId.includes(parenthesizedPin) || cleanTargetName.includes(parenthesizedPin)) return true;
    const pinRegex = new RegExp(`\\b${empPin}\\b`, 'i');
    if (pinRegex.test(targetId) || pinRegex.test(cleanTargetName)) return true;
  }

  // 5. Name match
  if (empName && (targetId === empName || cleanTargetName === empName)) return true;

  return false;
}

export function getEmployeeShiftTiming(
  emp: EmployeeProfile,
  shiftTimings?: ShiftTiming[]
): { startTime: string; endTime: string; graceMins?: number; isFixedHours?: boolean; totalHours?: number; days?: string[]; saturdayOption?: 'alternate' | 'all_off' | 'all_working'; allowRegularOvertime?: boolean } {
  if (!emp || !shiftTimings || shiftTimings.length === 0) {
    return { startTime: '11:00', endTime: '20:00', graceMins: undefined, isFixedHours: false, totalHours: 9, days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], saturdayOption: 'alternate', allowRegularOvertime: false };
  }

  // Helper: for fixed hours rules, return clean times so downstream Date parsing doesn't break
  const buildResult = (rule: ShiftTiming) => {
    const isFix = isFixedHoursTiming(rule);
    const hours = resolveTotalHours(rule);
    let rawStart = rule.start_time ? rule.start_time.substring(0, 5) : '09:00';
    let rawEnd = rule.end_time ? rule.end_time.substring(0, 5) : '18:00';

    if (isFix) {
      const [sh, sm] = rawStart.split(':').map(Number);
      if (!isNaN(sh)) {
        const endH = (sh + hours) % 24;
        rawEnd = `${String(endH).padStart(2, '0')}:${String(sm || 0).padStart(2, '0')}`;
      }
    }

    const otTagMatch = String(rule.target_name || '').match(/\[ALLOW_OT:1\]/i);
    const allowOT = rule.allow_regular_overtime === true || !!otTagMatch;

    return {
      startTime: rawStart,
      endTime: rawEnd,
      graceMins: rule.grace_mins,
      isFixedHours: isFix,
      totalHours: hours,
      days: rule.days,
      saturdayOption: rule.saturday_option || (rule.days && !rule.days.includes('Saturday') ? 'all_off' : 'alternate') as 'alternate' | 'all_off' | 'all_working',
      allowRegularOvertime: allowOT
    };
  };

  // Priority 1: Specific Employee Rule (STRICT OVERRIDE)
  const empRule = shiftTimings.find(t => matchesEmployeeRule(t, emp));
  if (empRule) return buildResult(empRule);

  // Priority 2: Designation Rule
  if (emp.designation) {
    const desigRule = shiftTimings.find(t => 
      String(t.target_type || '').trim().toLowerCase() === 'designation' && 
      String(t.target_id || '').trim().toLowerCase() === String(emp.designation!).trim().toLowerCase()
    );
    if (desigRule) return buildResult(desigRule);
  }

  // Priority 3: Department Rule
  if (emp.department) {
    const deptRule = shiftTimings.find(t => 
      String(t.target_type || '').trim().toLowerCase() === 'department' && 
      String(t.target_id || '').trim().toLowerCase() === String(emp.department!).trim().toLowerCase()
    );
    if (deptRule) return buildResult(deptRule);
  }

  return { startTime: '11:00', endTime: '20:00', graceMins: undefined, isFixedHours: false, totalHours: 9, days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], saturdayOption: 'alternate' };
}

export interface DailySummary {
  date: string;
  dayName: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number;
  overtimeHours: number;
  compensatedOvertimeHours: number;
  isLate: boolean;
  isAbsent: boolean;
  status: 'Present' | 'Absent' | 'Uninformed Absent' | 'Off Saturday' | 'Sunday' | 'Holiday' | 'Leave (Casual)' | 'Leave (Medical)' | 'Leave (Annual)' | 'Unprocessed' | 'Short Time';
  overtimePayout: number;
  lateMinutes: number;
  lateDeduction: number;
  absenceDeduction: number;
}

// Check if a date is the 1st, 3rd, or 5th Saturday of the month (Alternate Saturdays Off)
export function isOffSaturday(date: Date): boolean {
  if (date.getDay() !== 6) return false; // Not a Saturday
  const dayOfMonth = date.getDate();
  const weekNum = Math.ceil(dayOfMonth / 7);
  return weekNum === 1 || weekNum === 3 || weekNum === 5;
}

// Get day name (Monday, Tuesday, etc.)
export function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// Helper to check if a date falls within a leave range (inclusive)
export function getApprovedLeaveForDate(dateStr: string, leaves: LeaveRequest[], employeeId?: string): LeaveRequest | undefined {
  const targetDate = new Date(dateStr + 'T00:00:00');
  
  return leaves.find(leave => {
    if (leave.status !== 'Approved') return false;
    if (employeeId && leave.employee_id && leave.employee_id !== employeeId) return false;
    const start = new Date(leave.start_date + 'T00:00:00');
    const end = new Date(leave.end_date + 'T00:00:00');
    return targetDate >= start && targetDate <= end;
  });
}

// Helper to calculate late-after time string (e.g. 20 mins -> 11:20 AM)
export function getLateAfterTimeStr(graceMins: number, startTimeStr: string = '11:00'): string {
  const [hStr, mStr] = startTimeStr.split(':');
  let h = parseInt(hStr || '11', 10);
  let m = parseInt(mStr || '0', 10) + graceMins;
  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function getGracePeriodForDate(dateStr: string, graceSettings?: number | Record<string, number>): number {
  if (typeof graceSettings === 'number') return graceSettings;
  if (graceSettings && typeof graceSettings === 'object') {
    // Check exact date match (e.g. "2026-07-13")
    if (dateStr in graceSettings) {
      return graceSettings[dateStr];
    }
    // Check range keys in format "START:END" e.g. "2026-07-10:2026-07-15"
    for (const key of Object.keys(graceSettings)) {
      if (key.includes(':')) {
        const [start, end] = key.split(':');
        if (start && end && dateStr >= start && dateStr <= end) {
          return graceSettings[key];
        }
      }
    }
    const monthKey = dateStr.substring(0, 7); // e.g. "2026-07"
    if (monthKey in graceSettings) {
      return graceSettings[monthKey];
    }
    if ('global' in graceSettings) {
      return graceSettings['global'];
    }
  }
  const stored = localStorage.getItem('office_grace_time_mins');
  return stored ? parseInt(stored, 10) : 20;
}

export function matchPin(p1: any, p2: any): boolean {
  if (p1 === undefined || p1 === null || p2 === undefined || p2 === null) return false;
  const s1 = String(p1).trim().toLowerCase();
  const s2 = String(p2).trim().toLowerCase();
  if (!s1 || !s2) return false;

  // 1. Exact string match
  if (s1 === s2) return true;

  // 2. Pure integer PIN matching ONLY (e.g. '017' vs '17').
  // DO NOT use parseInt if string contains non-digits (UUIDs) to prevent prefix matching across employees!
  const isPureNum1 = /^\d+$/.test(s1);
  const isPureNum2 = /^\d+$/.test(s2);

  if (isPureNum1 && isPureNum2) {
    if (parseInt(s1, 10) === parseInt(s2, 10)) return true;
    const clean1 = s1.replace(/^0+/, '');
    const clean2 = s2.replace(/^0+/, '');
    if (clean1 && clean2 && clean1 === clean2) return true;
  }

  return false;
}

export function getLocalDateStr(dateInput: Date | string): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const d = new Date(dateInput);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Formats decimal hours (e.g. 1.5) into standard clock running time (e.g. "1 hr 30 mins").
 * Rolls over hours after 60 minutes like a normal clock.
 */
export function formatClockDuration(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return '0 mins';
  const totalMins = Math.round(decimalHours * 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  if (hrs === 0) {
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  }
  if (mins === 0) {
    return `${hrs} hr${hrs !== 1 ? 's' : ''}`;
  }
  return `${hrs} hr${hrs !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
}

export const formatOvertimeDuration = formatClockDuration;

export interface ComplaintLike {
  id?: number;
  employee_id: string;
  title: string;
  description: string;
  status: string;
}

export interface ApprovedCorrectionItem {
  employee_id: string;
  employee_pin?: string;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
}

/**
 * Main function to calculate daily attendance summaries, overtime, deductions, and status.
 */
export function processAttendanceLogs(
  employee: EmployeeProfile,
  rawLogs: RawLog[],
  leaves: LeaveRequest[],
  startDateStr: string,
  endDateStr: string,
  holidayDates: string[] = [],
  graceTimeSetting: number | Record<string, number> = 20,
  shiftStartTimeStr: string = '11:00',
  shiftEndTimeStr: string = '20:00',
  complaints: ComplaintLike[] = [],
  approvedCorrectionsList: ApprovedCorrectionItem[] = [],
  isFixedHoursSetting: boolean = false,
  totalHoursSetting: number = 9,
  shiftTimings?: ShiftTiming[]
): DailySummary[] {
  const summaries: DailySummary[] = [];
  const start = new Date(startDateStr + 'T00:00:00');
  
  // Resolve Fix Hours rule if shiftTimings array is provided
  let effectiveIsFixedHours = isFixedHoursSetting;
  let effectiveAllowRegularOvertime = false;
  let effectiveTotalHours = totalHoursSetting || 9;
  let effectiveDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let effectiveSatOption: 'alternate' | 'all_off' | 'all_working' = 'alternate';

  if (shiftTimings && shiftTimings.length > 0) {
    const matchedTiming = getEmployeeShiftTiming(employee, shiftTimings);
    if (matchedTiming.startTime) shiftStartTimeStr = matchedTiming.startTime;
    if (matchedTiming.endTime) shiftEndTimeStr = matchedTiming.endTime;
    if (matchedTiming.isFixedHours !== undefined) {
      effectiveIsFixedHours = matchedTiming.isFixedHours;
    }
    if (matchedTiming.allowRegularOvertime !== undefined) {
      effectiveAllowRegularOvertime = matchedTiming.allowRegularOvertime;
    }
    if (matchedTiming.totalHours !== undefined && matchedTiming.totalHours !== null && matchedTiming.totalHours > 0) {
      effectiveTotalHours = matchedTiming.totalHours;
    }
    if (matchedTiming.days && matchedTiming.days.length > 0) {
      effectiveDays = matchedTiming.days;
    }
    if (matchedTiming.saturdayOption) {
      effectiveSatOption = matchedTiming.saturdayOption;
    } else if (!effectiveDays.includes('Saturday')) {
      effectiveSatOption = 'all_off';
    }
  }
  const end = new Date(endDateStr + 'T00:00:00');
  
  // Filter raw logs for this specific employee pin (robust PIN matching)
  const employeeLogs = rawLogs.filter(log => matchPin(log.employee_pin, employee.pin) || matchPin(log.employee_pin, employee.id));

  // Group logs chronologically into Shift Sessions (supporting overnight/night shifts)
  const sortedLogs = [...employeeLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const sessions: { checkInDate: Date; checkOutDate: Date | null; }[] = [];

  sortedLogs.forEach(log => {
    const logDate = new Date(log.timestamp);
    const lastSession = sessions[sessions.length - 1];

    if (lastSession) {
      const diffHrs = (logDate.getTime() - lastSession.checkInDate.getTime()) / (1000 * 60 * 60);

      // Ignore rapid accidental double punches (within 2 minutes of check-in)
      if (diffHrs >= 0 && diffHrs < 0.033) {
        return;
      }

      // Explicit Check-Out punch from device/correction (status_type === 1 or 5)
      if (log.status_type === 1 || log.status_type === 5) {
        lastSession.checkOutDate = logDate;
        return;
      }

      // If active session is open (no check-out yet), pair the next punch (up to 36 hours / next day) as check-out for the check-in date
      if (!lastSession.checkOutDate) {
        if (diffHrs >= 0.25 && diffHrs <= 36) {
          lastSession.checkOutDate = logDate;
          return;
        }
      }
    }

    // Start a new shift session (Check-In)
    sessions.push({
      checkInDate: logDate,
      checkOutDate: null
    });
  });

  // Unified high-priority active corrections map for this employee (overriding ALL device logs)
  const activeCorrections = new Map<string, { check_in: string | null; check_out: string | null; }>();

  // 1. Process Helpdesk complaints
  (complaints || []).forEach(c => {
    const isTargetEmp = matchPin(c.employee_id, employee.id) || matchPin(c.employee_id, employee.pin);
    const isCorrectionTitle = c.title === 'Check In/Out Entry Correction';
    const isResolvedStatus = c.status === 'Resolved' || c.status === 'Approved';
    if (isTargetEmp && isCorrectionTitle && isResolvedStatus) {
      try {
        const data = typeof c.description === 'string' ? JSON.parse(c.description) : c.description;
        if (data && data.date) {
          activeCorrections.set(data.date, {
            check_in: data.check_in || null,
            check_out: data.check_out || null
          });
        }
      } catch (e) {}
    }
  });

  // 2. Process dedicated approved corrections list (highest priority)
  (approvedCorrectionsList || []).forEach(ac => {
    const isTargetEmp = matchPin(ac.employee_id, employee.id) || matchPin(ac.employee_pin, employee.pin) || matchPin(ac.employee_id, employee.pin) || matchPin(ac.employee_pin, employee.id);
    if (isTargetEmp && ac.date) {
      activeCorrections.set(ac.date, {
        check_in: ac.check_in || null,
        check_out: ac.check_out || null
      });
    }
  });

  // 3. Apply corrections safely preserving unmodified machine punches (Check-In or Check-Out)
  activeCorrections.forEach((times, date) => {
    const parseTimeTo24 = (t: string | null): string | null => {
      if (!t || !t.trim()) return null;
      if (/^\d{2}:\d{2}$/.test(t.trim())) return t.trim();
      const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (!m) return null;
      let h = Number(m[1]);
      if (m[3]) {
        if (/pm/i.test(m[3]) && h !== 12) h += 12;
        if (/am/i.test(m[3]) && h === 12) h = 0;
      }
      return `${String(h).padStart(2, '0')}:${m[2]}`;
    };

    const in24 = parseTimeTo24(times.check_in);
    const out24 = parseTimeTo24(times.check_out);

    // Find existing machine sessions for this date before applying correction
    const existingDaySessions = sessions.filter(s => getLocalDateStr(s.checkInDate) === date);
    const existingMachineIn = existingDaySessions.length > 0 ? existingDaySessions[0].checkInDate : null;
    const existingMachineOut = existingDaySessions.length > 0 
      ? ([...existingDaySessions].reverse().find(s => s.checkOutDate !== null)?.checkOutDate || null)
      : null;

    let corrInDate: Date = in24 ? new Date(`${date}T${in24}:00`) : (existingMachineIn || new Date(`${date}T${shiftStartTimeStr}:00`));
    let corrOutDate: Date | null = out24 ? new Date(`${date}T${out24}:00`) : existingMachineOut;

    if (corrInDate && corrOutDate && corrOutDate <= corrInDate) {
      corrOutDate.setDate(corrOutDate.getDate() + 1);
    }

    // Remove existing raw sessions for this date and push unified merged session
    for (let i = sessions.length - 1; i >= 0; i--) {
      if (getLocalDateStr(sessions[i].checkInDate) === date) {
        sessions.splice(i, 1);
      }
    }

    sessions.push({
      checkInDate: corrInDate,
      checkOutDate: corrOutDate
    });
  });

  // Loop through each date in the range
  const loopDate = new Date(start);
  while (loopDate <= end) {
    const pad = (num: number) => num.toString().padStart(2, '0');
    const currentDateStr = `${loopDate.getFullYear()}-${pad(loopDate.getMonth() + 1)}-${pad(loopDate.getDate())}`;
    const dayOfWeek = loopDate.getDay();
    const dayName = getDayName(loopDate);
    const offSat = isOffSaturday(loopDate);
    const isSun = dayOfWeek === 0;

    // Determine grace minutes for current date
    const graceTimeMins = getGracePeriodForDate(currentDateStr, graceTimeSetting);

    // Find all shift sessions that started on this calendar day
    const daySessions = sessions.filter(s => getLocalDateStr(s.checkInDate) === currentDateStr);
    const activeSession = daySessions.length > 0 ? daySessions[0] : null;
    const lastSessionWithOut = daySessions.length > 0 ? ([...daySessions].reverse().find(s => s.checkOutDate !== null) || daySessions[daySessions.length - 1]) : null;

    // Check for approved leave
    const approvedLeave = getApprovedLeaveForDate(currentDateStr, leaves, employee.id);

    let checkIn: string | null = null;
    let checkOut: string | null = null;
    let workingHours = 0;
    let overtimeHours = 0;
    let compensatedOvertimeHours = 0;
    let isLate = false;
    let isAbsent = false;
    let lateMinutes = 0;
    let lateDeduction = 0;
    let absenceDeduction = 0;
    let overtimePayout = 0;
    let status: DailySummary['status'] = 'Unprocessed';

    // Auto-calculate hourly rate (30 days shift * target hours/day)
    const monthlyTotalHours = 30 * (effectiveTotalHours || 9);
    const calculatedHourlyRate = employee.base_salary / monthlyTotalHours;
    const calculatedPerMinRate = calculatedHourlyRate / 60;

    const shiftStartDate = new Date(currentDateStr + 'T' + shiftStartTimeStr + ':00');
    // Grace cutoff includes full grace minute (e.g., 11:20:59.999 for 20 mins grace). Minute 21 (11:21:00+) is marked Late.
    const graceCutoffDate = new Date(shiftStartDate.getTime() + (graceTimeMins * 60 + 59) * 1000 + 999);
    let shiftEndDate = new Date(currentDateStr + 'T' + shiftEndTimeStr + ':00');
    if (shiftEndTimeStr <= shiftStartTimeStr) {
      shiftEndDate.setDate(shiftEndDate.getDate() + 1);
    }

    if (approvedLeave) {
      // Approved leave overrides punches and absences, but we exclude off days and holidays
      if (isSun) {
        status = 'Sunday';
      } else if (offSat) {
        status = 'Off Saturday';
      } else if (holidayDates.includes(currentDateStr)) {
        status = 'Holiday';
      } else {
        status = `Leave (${approvedLeave.leave_type})` as DailySummary['status'];
      }
      isAbsent = false;
      absenceDeduction = 0;
      if (activeSession) {
        checkIn = activeSession.checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        if (lastSessionWithOut && lastSessionWithOut.checkOutDate) {
          checkOut = lastSessionWithOut.checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }
    } else if (activeSession) {
      // We have punches!
      const checkInDate = activeSession.checkInDate;
      checkIn = checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      if (effectiveIsFixedHours && !effectiveAllowRegularOvertime) {
        // Compensation Mode: Grace late tracking disabled
        isLate = false;
        lateMinutes = 0;
      } else if (checkInDate > graceCutoffDate) {
        // Late arrival starting minute 21 (e.g. 11:21 AM = 21 mins late)
        isLate = true;
        lateMinutes = Math.ceil((checkInDate.getTime() - shiftStartDate.getTime()) / (1000 * 60));
      } else {
        lateMinutes = 0;
        isLate = false;
      }

      const activeCheckOutDate = lastSessionWithOut ? lastSessionWithOut.checkOutDate : null;
      if (activeCheckOutDate) {
        const checkOutDate = activeCheckOutDate;
        checkOut = checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        
        // Calculate working hours across all sessions of the day
        let diffWorkingMins = 0;
        daySessions.forEach(s => {
          if (s.checkOutDate) {
            const ms = s.checkOutDate.getTime() - s.checkInDate.getTime();
            if (ms > 0) diffWorkingMins += Math.floor(ms / (1000 * 60));
          }
        });
        if (diffWorkingMins === 0) {
          const diffMs = checkOutDate.getTime() - checkInDate.getTime();
          diffWorkingMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
        }
        workingHours = parseFloat((diffWorkingMins / 60).toFixed(2));
        const targetFixedMins = (effectiveTotalHours || 9) * 60;

        // Calculate shortage minutes & per-minute shortage deduction
        const shortageMins = Math.max(0, targetFixedMins - diffWorkingMins);
        const shortageDeduction = parseFloat((shortageMins * calculatedPerMinRate).toFixed(2));
        const lateArrivalDeduction = isLate ? parseFloat((lateMinutes * calculatedPerMinRate).toFixed(2)) : 0;

        if (effectiveIsFixedHours) {
          if (effectiveAllowRegularOvertime) {
            // Option 1: Fix Hours with Regular Overtime Mode ON (Default behavior with late tracking & 1.0x OT)
            lateDeduction = parseFloat((lateArrivalDeduction + shortageDeduction).toFixed(2));
            status = diffWorkingMins < targetFixedMins ? 'Short Time' : 'Present';

            if (!isLate && diffWorkingMins > targetFixedMins) {
              const otMins = diffWorkingMins - targetFixedMins;
              overtimeHours = parseFloat((otMins / 60).toFixed(2));
              overtimePayout = parseFloat((otMins * calculatedPerMinRate).toFixed(2));
              compensatedOvertimeHours = 0;
            } else if (isLate && lateMinutes > 0) {
              const afterShiftMs = checkOutDate.getTime() - shiftEndDate.getTime();
              const afterShiftMins = afterShiftMs > 0 ? Math.floor(afterShiftMs / (1000 * 60)) : 0;
              const compMins = Math.max(0, Math.min(lateMinutes, afterShiftMins));
              compensatedOvertimeHours = parseFloat((compMins / 60).toFixed(2));
              const otMins = Math.max(0, diffWorkingMins - targetFixedMins);
              overtimeHours = parseFloat((otMins / 60).toFixed(2));
              const compPayout = compMins * (calculatedPerMinRate * 0.5);
              const otPayout = otMins * calculatedPerMinRate;
              overtimePayout = parseFloat((compPayout + otPayout).toFixed(2));
            }
          } else {
            // Option 2: Compensation Mode (No Overtime; 1.0x Compensation Time ONLY for extra working minutes between shift start & shift end time window)
            isLate = false;
            lateMinutes = 0;
            overtimeHours = 0;

            let windowWorkingMins = 0;
            daySessions.forEach(s => {
              if (s.checkOutDate) {
                const winStart = Math.max(s.checkInDate.getTime(), shiftStartDate.getTime());
                const winEnd = Math.min(s.checkOutDate.getTime(), shiftEndDate.getTime());
                if (winEnd > winStart) {
                  windowWorkingMins += Math.floor((winEnd - winStart) / (1000 * 60));
                }
              }
            });

            const effectiveCompMins = windowWorkingMins;
            const extraWindowMins = Math.max(0, effectiveCompMins - targetFixedMins);

            workingHours = parseFloat((effectiveCompMins / 60).toFixed(2));
            compensatedOvertimeHours = parseFloat((extraWindowMins / 60).toFixed(2));
            overtimePayout = parseFloat((extraWindowMins * calculatedPerMinRate).toFixed(2));

            const compShortageMins = Math.max(0, targetFixedMins - effectiveCompMins);
            lateDeduction = parseFloat((compShortageMins * calculatedPerMinRate).toFixed(2));
            status = effectiveCompMins < targetFixedMins ? 'Short Time' : 'Present';
          }
        } else {
          // Normal Shift Rule: Deduct late arrival + per-minute shortage under target hours
          lateDeduction = parseFloat((lateArrivalDeduction + shortageDeduction).toFixed(2));

          if (diffWorkingMins < targetFixedMins) {
            status = 'Short Time';
          } else {
            status = 'Present';
          }

          if (!isLate && diffWorkingMins > targetFixedMins) {
            const otMins = diffWorkingMins - targetFixedMins;
            overtimeHours = parseFloat((otMins / 60).toFixed(2));
            overtimePayout = parseFloat((otMins * calculatedPerMinRate).toFixed(2));
          } else if (isLate && lateMinutes > 0) {
            const afterShiftMs = checkOutDate.getTime() - shiftEndDate.getTime();
            const afterShiftMins = afterShiftMs > 0 ? Math.floor(afterShiftMs / (1000 * 60)) : 0;
            const compMins = Math.max(0, Math.min(lateMinutes, afterShiftMins));
            compensatedOvertimeHours = parseFloat((compMins / 60).toFixed(2));
            const otMins = Math.max(0, diffWorkingMins - targetFixedMins);
            overtimeHours = parseFloat((otMins / 60).toFixed(2));
            const compPayout = compMins * (calculatedPerMinRate * 0.5);
            const otPayout = otMins * calculatedPerMinRate;
            overtimePayout = parseFloat((compPayout + otPayout).toFixed(2));
          }
        }
      } else {
        if (effectiveIsFixedHours) {
          isLate = false;
          lateMinutes = 0;
          lateDeduction = 0;
          status = 'Present';
        } else {
          lateDeduction = isLate ? parseFloat((lateMinutes * calculatedPerMinRate).toFixed(2)) : 0;
          status = 'Present';
        }
      }
    } else {
      // No punches
      const unapprovedLeave = leaves.find(leave => {
        if (leave.status === 'Approved') return false;
        if (employee.id && leave.employee_id && leave.employee_id !== employee.id) return false;
        const start = new Date(leave.start_date + 'T00:00:00');
        const end = new Date(leave.end_date + 'T00:00:00');
        const targetDate = new Date(currentDateStr + 'T00:00:00');
        return targetDate >= start && targetDate <= end;
      });

      let isDayOff = false;
      let dayOffLabel = 'Off Day';

      if (isSun) {
        isDayOff = true;
        dayOffLabel = 'Sunday';
      } else if (dayOfWeek === 6) {
        if (effectiveSatOption === 'all_off' || !effectiveDays.includes('Saturday')) {
          isDayOff = true;
          dayOffLabel = 'Off Saturday';
        } else if (effectiveSatOption === 'alternate') {
          if (isOffSaturday(loopDate)) {
            isDayOff = true;
            dayOffLabel = 'Off Saturday';
          } else {
            isDayOff = false;
          }
        }
      } else if (!effectiveDays.includes(dayName)) {
        isDayOff = true;
        dayOffLabel = `Off ${dayName.substring(0, 3)}`;
      }

      if (isDayOff) {
        status = dayOffLabel as any;
        isAbsent = false;
        absenceDeduction = 0;
      } else if (holidayDates.includes(currentDateStr)) {
        if (unapprovedLeave) {
          status = 'Uninformed Absent';
          isAbsent = true;
          absenceDeduction = parseFloat((employee.base_salary / 30).toFixed(2));
        } else {
          status = 'Holiday';
        }
      } else {
        const now = new Date();
        const todayStr = getLocalDateStr(now);
        const isPastDay = currentDateStr < todayStr;
        const isToday = currentDateStr === todayStr;

        // Shift end time comparison for current date (supports overnight shifts)
        const shiftEndTimeObj = new Date(currentDateStr + 'T' + shiftEndTimeStr + ':00');
        if (shiftEndTimeStr <= shiftStartTimeStr) {
          shiftEndTimeObj.setDate(shiftEndTimeObj.getDate() + 1);
        }
        const isShiftEnded = isPastDay || (isToday && now >= shiftEndTimeObj);

        if (currentDateStr > todayStr) {
          // Future dates are Unprocessed
          status = 'Unprocessed';
          isAbsent = false;
          absenceDeduction = 0;
        } else if (isToday && !isShiftEnded) {
          // Today's shift is currently ongoing (before shift end time) -> Not absent yet!
          status = 'Unprocessed';
          isAbsent = false;
          absenceDeduction = 0;
        } else {
          // Past working day or today after shift end time without punches
          isAbsent = true;
          status = 'Uninformed Absent';
          // 30 working days shift, so 1 day absence = base_salary / 30
          absenceDeduction = parseFloat((employee.base_salary / 30).toFixed(2));
        }
      }
    }

    summaries.push({
      date: currentDateStr,
      dayName,
      checkIn,
      checkOut,
      workingHours,
      overtimeHours,
      compensatedOvertimeHours,
      isLate,
      isAbsent,
      status,
      overtimePayout,
      lateMinutes,
      lateDeduction,
      absenceDeduction
    });

    loopDate.setDate(loopDate.getDate() + 1);
  }

  return summaries;
}

export interface EmployeePayrollSummary {
  employeeId: string;
  pin: string;
  name: string;
  department: string;
  baseSalary: number;
  incomeTax: number;
  hourlyRate: number;
  perMinRate: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
  totalCompensatedOvertimeHours: number;
  totalOvertimePayout: number;
  lateArrivals: number;
  totalLateMinutes: number;
  totalLateDeduction: number;
  absences: number;
  totalAbsenceDeduction: number;
  leavesTaken: number;
  netPayable: number;
}

export function calculateEmployeePayrollSummary(
  employee: EmployeeProfile,
  rawLogs: RawLog[],
  leaveRequests: LeaveRequest[],
  startDateStr: string,
  endDateStr: string,
  holidayDates: string[],
  graceSetting: number | Record<string, number>,
  shiftStartTime?: string,
  shiftEndTime?: string,
  complaints?: any[],
  approvedCorrections?: any[],
  isFixedHoursSetting: boolean = false,
  totalHoursSetting: number = 9,
  shiftTimings?: ShiftTiming[]
): EmployeePayrollSummary {
  const processed = processAttendanceLogs(
    employee,
    rawLogs,
    leaveRequests,
    startDateStr,
    endDateStr,
    holidayDates,
    graceSetting,
    shiftStartTime,
    shiftEndTime,
    complaints,
    approvedCorrections,
    isFixedHoursSetting,
    totalHoursSetting,
    shiftTimings
  );

  let summaryTotalHours = totalHoursSetting || 9;
  if (shiftTimings && shiftTimings.length > 0) {
    const matchedTiming = getEmployeeShiftTiming(employee, shiftTimings);
    if (matchedTiming.totalHours !== undefined && matchedTiming.totalHours !== null && matchedTiming.totalHours > 0) {
      summaryTotalHours = matchedTiming.totalHours;
    }
  }
  const monthlyTotalHours = 30 * (summaryTotalHours || 9);
  const calculatedHourlyRate = employee.base_salary / monthlyTotalHours;
  const calculatedPerMinRate = parseFloat((calculatedHourlyRate / 60).toFixed(4));

  const totalWorkedHours = processed.reduce((sum, s) => sum + s.workingHours, 0);
  const totalOvertimeHours = processed.reduce((sum, s) => sum + s.overtimeHours, 0);
  const totalCompensatedOvertimeHours = processed.reduce((sum, s) => sum + s.compensatedOvertimeHours, 0);
  const lateArrivals = processed.filter(s => s.isLate).length;
  const totalLateMinutes = processed.reduce((sum, s) => sum + s.lateMinutes, 0);
  const absences = processed.filter(s => s.isAbsent).length;
  const totalAbsenceDeduction = processed.reduce((sum, s) => sum + s.absenceDeduction, 0);
  const leavesTaken = processed.filter(s => s.status.startsWith('Leave')).length;

  const summaryTiming = shiftTimings && shiftTimings.length > 0 ? getEmployeeShiftTiming(employee, shiftTimings) : null;
  const isFix = summaryTiming ? summaryTiming.isFixedHours : isFixedHoursSetting;
  const allowOT = summaryTiming ? summaryTiming.allowRegularOvertime : false;

  let totalOvertimePayout = processed.reduce((sum, s) => sum + s.overtimePayout, 0);
  let totalLateDeduction = processed.reduce((sum, s) => sum + s.lateDeduction, 0);

  // Fixed Hours Default Mode: Monthly Compensated Time & Deficit Balancing
  if (isFix && !allowOT) {
    const totalCompensatedMins = Math.round(totalCompensatedOvertimeHours * 60);
    const totalShortageDeductions = processed.reduce((sum, s) => sum + s.lateDeduction, 0);
    const totalShortageMins = Math.round(totalShortageDeductions / (calculatedPerMinRate || 1));

    const netBalancedMins = totalCompensatedMins - totalShortageMins;

    if (netBalancedMins >= 0) {
      // All shortage deficits in the month are 100% offset by extra worked time!
      totalLateDeduction = 0;
      // Remaining extra minutes are paid at regular per-minute base rate
      const compensatedTimeAddition = parseFloat((netBalancedMins * calculatedPerMinRate).toFixed(2));
      totalOvertimePayout = compensatedTimeAddition;
    } else {
      // Extra time offset part of shortages; deduct remaining uncompensated shortage
      const uncompensatedMins = Math.abs(netBalancedMins);
      totalLateDeduction = parseFloat((uncompensatedMins * calculatedPerMinRate).toFixed(2));
      totalOvertimePayout = 0;
    }
  }

  const incomeTax = employee.income_tax || 0;
  const netPayable = Math.max(
    0,
    parseFloat((employee.base_salary + totalOvertimePayout - totalLateDeduction - totalAbsenceDeduction - incomeTax).toFixed(2))
  );

  return {
    employeeId: employee.id,
    pin: employee.pin,
    name: employee.full_name,
    department: employee.department || 'N/A',
    baseSalary: employee.base_salary,
    incomeTax,
    hourlyRate: parseFloat(calculatedHourlyRate.toFixed(2)),
    perMinRate: calculatedPerMinRate,
    totalWorkedHours: parseFloat(totalWorkedHours.toFixed(2)),
    totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
    totalCompensatedOvertimeHours: parseFloat(totalCompensatedOvertimeHours.toFixed(2)),
    totalOvertimePayout: parseFloat(totalOvertimePayout.toFixed(2)),
    lateArrivals,
    totalLateMinutes,
    totalLateDeduction: parseFloat(totalLateDeduction.toFixed(2)),
    absences,
    totalAbsenceDeduction: parseFloat(totalAbsenceDeduction.toFixed(2)),
    leavesTaken,
    netPayable
  };
}
