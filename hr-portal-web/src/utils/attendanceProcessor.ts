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
}

export interface DailySummary {
  date: string;
  dayName: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number;
  overtimeHours: number;
  isLate: boolean;
  isAbsent: boolean;
  status: 'Present' | 'Absent' | 'Uninformed Absent' | 'Off Saturday' | 'Sunday' | 'Holiday' | 'Leave (Casual)' | 'Leave (Medical)' | 'Leave (Annual)' | 'Unprocessed';
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
export function getApprovedLeaveForDate(dateStr: string, leaves: LeaveRequest[]): LeaveRequest | undefined {
  const targetDate = new Date(dateStr + 'T00:00:00');
  
  return leaves.find(leave => {
    if (leave.status !== 'Approved') return false;
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
  if (s1 === s2) return true;
  const i1 = parseInt(s1, 10);
  const i2 = parseInt(s2, 10);
  if (!isNaN(i1) && !isNaN(i2) && i1 === i2) return true;
  const clean1 = s1.replace(/^0+/, '');
  const clean2 = s2.replace(/^0+/, '');
  if (clean1 && clean2 && clean1 === clean2) return true;
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
  shiftEndTimeStr: string = '20:00'
): DailySummary[] {
  const summaries: DailySummary[] = [];
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  
  // Filter raw logs for this specific employee pin (robust PIN matching)
  const employeeLogs = rawLogs.filter(log => matchPin(log.employee_pin, employee.pin) || matchPin(log.employee_pin, employee.id));

  // Group logs chronologically into Shift Sessions (supporting overnight/night shifts)
  const sortedLogs = [...employeeLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const sessions: { checkInDate: Date; checkOutDate: Date | null; }[] = [];

  // Check if logs contain explicit Check-Out digit codes (status_type === 1 or 5)
  const hasExplicitOutDigits = sortedLogs.some(l => l.status_type === 1 || l.status_type === 5);

  sortedLogs.forEach(log => {
    const logDate = new Date(log.timestamp);
    const lastSession = sessions[sessions.length - 1];

    // Explicit Check-Out digit code (1 = Check-Out, 5 = Overtime Out)
    if (log.status_type === 1 || log.status_type === 5) {
      if (lastSession) {
        const diffHrs = (logDate.getTime() - lastSession.checkInDate.getTime()) / (1000 * 60 * 60);
        if (diffHrs >= 0 && diffHrs <= 24) {
          lastSession.checkOutDate = logDate;
          return;
        }
      }
    }

    // Explicit Check-In digit code (0 = Check-In, 4 = Overtime In)
    if (log.status_type === 0 || log.status_type === 4) {
      // If device sends explicit Out digits (1/5), status_type 0/4 is strictly a Check-In
      // Only fallback to time pairing if the dataset has no explicit Out digits
      if (!hasExplicitOutDigits && lastSession && !lastSession.checkOutDate) {
        const diffHrs = (logDate.getTime() - lastSession.checkInDate.getTime()) / (1000 * 60 * 60);
        if (diffHrs >= 0 && diffHrs <= 24) {
          lastSession.checkOutDate = logDate;
          return;
        }
      }
    }

    // Fallback for devices without explicit Check-Out digits
    if (!hasExplicitOutDigits && lastSession && !lastSession.checkOutDate) {
      const diffHrs = (logDate.getTime() - lastSession.checkInDate.getTime()) / (1000 * 60 * 60);
      if (diffHrs >= 0 && diffHrs <= 24) {
        lastSession.checkOutDate = logDate;
        return;
      }
    }

    // Start Check-In session
    sessions.push({
      checkInDate: logDate,
      checkOutDate: null
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

    // Find if there is a shift session that started on this calendar day
    const daySession = sessions.find(s => getLocalDateStr(s.checkInDate) === currentDateStr);

    const activeSession = daySession;

    // Check for approved leave
    const approvedLeave = getApprovedLeaveForDate(currentDateStr, leaves);

    let checkIn: string | null = null;
    let checkOut: string | null = null;
    let workingHours = 0;
    let overtimeHours = 0;
    let isLate = false;
    let isAbsent = false;
    let lateMinutes = 0;
    let lateDeduction = 0;
    let absenceDeduction = 0;
    let overtimePayout = 0;
    let status: DailySummary['status'] = 'Unprocessed';

    // Auto-calculate hourly rate (24 days shift, 9 hours/day = 216 hours/month)
    const calculatedHourlyRate = employee.base_salary / 216;
    const calculatedPerMinRate = calculatedHourlyRate / 60;

    const shiftStartDate = new Date(currentDateStr + 'T' + shiftStartTimeStr + ':00');
    const graceDate = new Date(shiftStartDate.getTime() + graceTimeMins * 60 * 1000);
    let shiftEndDate = new Date(currentDateStr + 'T' + shiftEndTimeStr + ':00');

    if (approvedLeave) {
      // Approved leave overrides punches and absences
      status = `Leave (${approvedLeave.leave_type})` as DailySummary['status'];
      isAbsent = false;
      absenceDeduction = 0;
      if (activeSession) {
        checkIn = activeSession.checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        if (activeSession.checkOutDate) {
          checkOut = activeSession.checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
      }
    } else if (activeSession) {
      // We have punches!
      const checkInDate = activeSession.checkInDate;
      checkIn = checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      const checkInHour = checkInDate.getHours();
      // On-time check: check-in is between 6:00 AM and graceDate (e.g. 11:20 AM)
      const isOnTime = checkInHour >= 6 && checkInDate <= graceDate;

      if (isOnTime) {
        lateMinutes = 0;
        isLate = false;
      } else if (checkInDate > graceDate) {
        // Late arrival (past grace window)
        isLate = true;
        lateMinutes = Math.ceil((checkInDate.getTime() - shiftStartDate.getTime()) / (1000 * 60));
      } else {
        lateMinutes = 0;
        isLate = false;
      }

      let overtimeSittingMins = 0;

      if (activeSession.checkOutDate) {
        const checkOutDate = activeSession.checkOutDate;
        checkOut = checkOutDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        
        // Calculate working hours
        const diffMs = checkOutDate.getTime() - checkInDate.getTime();
        workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

        // OT = minutes after FIXED shift end (8:00 PM), always
        if (checkOutDate > shiftEndDate) {
          const diffOvertimeMs = checkOutDate.getTime() - shiftEndDate.getTime();
          overtimeSittingMins = Math.floor(diffOvertimeMs / (1000 * 60));
        }
      }

      // Payroll: Late deduction at FULL rate, OT at 50% rate offsets late
      const lateDeductionAmt = parseFloat((lateMinutes * calculatedPerMinRate).toFixed(2));
      const otOffsetAmt = parseFloat(Math.min(overtimeSittingMins * calculatedPerMinRate * 0.5, lateDeductionAmt).toFixed(2));

      lateDeduction = parseFloat((lateDeductionAmt - otOffsetAmt).toFixed(2));

      // Overtime minutes that exceed what was needed to pay back late debt (at 0.5x rate) are paid in full (1.0x rate)
      const otMinutesUsedForDebt = lateMinutes * 2;
      let overtimePaidMins = 0;
      if (overtimeSittingMins > otMinutesUsedForDebt) {
        overtimePaidMins = overtimeSittingMins - otMinutesUsedForDebt;
      }
      overtimePayout = parseFloat((overtimePaidMins * calculatedPerMinRate).toFixed(2));
      overtimeHours = parseFloat((overtimeSittingMins / 60).toFixed(2));

      status = 'Present';
    } else {
      // No punches
      if (isSun) {
        status = 'Sunday';
      } else if (offSat) {
        status = 'Off Saturday';
      } else if (holidayDates.includes(currentDateStr)) {
        status = 'Holiday';
      } else {
        const now = new Date();
        const todayStr = getLocalDateStr(now);
        const isPastDay = currentDateStr < todayStr;
        const isToday = currentDateStr === todayStr;

        // Shift end time comparison for current date
        const shiftEndTimeObj = new Date(currentDateStr + 'T' + shiftEndTimeStr + ':00');
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
          // 24 working days shift, so 1 day absence = base_salary / 24
          absenceDeduction = parseFloat((employee.base_salary / 24).toFixed(2));
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
