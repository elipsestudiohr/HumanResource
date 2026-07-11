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

// Main function to process raw logs into daily summaries for an employee
export function processAttendanceLogs(
  employee: EmployeeProfile,
  rawLogs: RawLog[],
  leaves: LeaveRequest[],
  startDateStr: string,
  endDateStr: string,
  holidayDates: string[] = [],
  graceTimeMins: number = 15,
  shiftStartTimeStr: string = '11:00',
  shiftEndTimeStr: string = '20:00'
): DailySummary[] {
  const summaries: DailySummary[] = [];
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  
  // Filter raw logs for this specific employee pin
  const employeeLogs = rawLogs.filter(log => log.employee_pin === employee.pin);

  // Group logs chronologically into Shift Sessions (supporting overnight/night shifts)
  const sortedLogs = [...employeeLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const sessions: { checkInDate: Date; checkOutDate: Date | null; }[] = [];

  sortedLogs.forEach(log => {
    const logDate = new Date(log.timestamp);
    const lastSession = sessions[sessions.length - 1];

    if (lastSession) {
      const diffHrs = (logDate.getTime() - lastSession.checkInDate.getTime()) / (1000 * 60 * 60);
      // If the punch is within 16 hours of the session's first punch, treat it as the check-out/subsequent punch of that same shift session
      if (diffHrs >= 0 && diffHrs <= 16) {
        lastSession.checkOutDate = logDate;
        return;
      }
    }

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

    // Find if there is a shift session that started on this calendar day
    const daySession = sessions.find(s => {
      const logDate = s.checkInDate;
      const logDateStr = `${logDate.getFullYear()}-${pad(logDate.getMonth() + 1)}-${pad(logDate.getDate())}`;
      return logDateStr === currentDateStr;
    });

    // Also find a session where checkout falls on this day (cross-midnight checkout)
    const crossDaySession = !daySession ? sessions.find(s => {
      if (!s.checkOutDate) return false;
      const co = s.checkOutDate;
      const coDateStr = `${co.getFullYear()}-${pad(co.getMonth() + 1)}-${pad(co.getDate())}`;
      const ci = s.checkInDate;
      const ciDateStr = `${ci.getFullYear()}-${pad(ci.getMonth() + 1)}-${pad(ci.getDate())}`;
      return coDateStr === currentDateStr && ciDateStr !== currentDateStr;
    }) : null;

    const activeSession = daySession || crossDaySession;

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

    if (activeSession) {
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
        // Lateness is calculated relative to shiftStartDate (e.g. 11:00 AM)
        lateMinutes = Math.ceil((checkInDate.getTime() - shiftStartDate.getTime()) / (1000 * 60));
      } else {
        // Fallback for check-ins before 6:00 AM
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
      } else if (approvedLeave) {
        status = `Leave (${approvedLeave.leave_type})` as DailySummary['status'];
      } else {
        // Check if date is before joining date
        const joiningDate = new Date(employee.joining_date + 'T00:00:00');
        if (loopDate < joiningDate) {
          status = 'Unprocessed';
        } else if (loopDate > new Date()) {
          status = 'Unprocessed';
        } else {
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
