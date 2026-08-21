import { supabase, broadcastLiveNotification } from './supabase';
import type { RawLog, LeaveRequest, EmployeeProfile } from '../utils/attendanceProcessor';
import { matchPin, calculateShiftDurationHours } from '../utils/attendanceProcessor';

// Checks if the application is running in demo mode (Disabled for production)
export function isDemoMode(): boolean {
  return false;
}

// Fetch all active profiles from Supabase
export async function getProfiles(): Promise<EmployeeProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_active', true);
    
  if (error) throw error;
  return data as EmployeeProfile[];
}

// Fetch public profile info for calendar/birthday display without sensitive fields
export async function getPublicProfiles(): Promise<Partial<EmployeeProfile>[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, department, designation, date_of_birth')
    .eq('is_active', true);
    
  if (error) throw error;
  return data as Partial<EmployeeProfile>[];
}

// Fetch a single profile by user ID, email, or PIN
export async function getProfileById(idOrEmail: string): Promise<EmployeeProfile> {
  if (!idOrEmail) throw new Error('No profile identifier provided');
  const cleanTarget = String(idOrEmail).trim().toLowerCase();

  // Try fetching profile list safely to prevent PostgREST UUID syntax errors
  try {
    const { data: allProfiles } = await supabase.from('profiles').select('*');
    if (allProfiles && allProfiles.length > 0) {
      const matched = allProfiles.find(p => 
        (p.id && String(p.id).trim().toLowerCase() === cleanTarget) ||
        (p.email && p.email.trim().toLowerCase() === cleanTarget) ||
        (p.pin && String(p.pin).trim().toLowerCase() === cleanTarget)
      );
      if (matched) return matched as EmployeeProfile;
    }
  } catch (e) {
    /* ignore fallback error */
  }

  // If single target attempt by email
  if (cleanTarget.includes('@')) {
    const { data: emailMatch } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', cleanTarget)
      .maybeSingle();
    if (emailMatch) return emailMatch as EmployeeProfile;
  }

  // If single target attempt by UUID
  if (cleanTarget.length > 20 && cleanTarget.includes('-')) {
    const { data: uuidMatch } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', cleanTarget)
      .maybeSingle();
    if (uuidMatch) return uuidMatch as EmployeeProfile;
  }

  throw new Error(`Profile not found for identifier: ${idOrEmail}`);
}

// Insert or update an employee profile in Supabase using the secure RPC function
export async function saveProfile(
  profile: Omit<EmployeeProfile, 'id'> & { id?: string },
  email?: string,
  password?: string
): Promise<EmployeeProfile> {
  const { data: userId, error } = await supabase.rpc('save_employee_user', {
    id_val: profile.id || null,
    email_val: email || profile.email || '',
    password_val: password || '',
    pin_val: profile.pin,
    name_val: profile.full_name,
    designation_val: profile.designation || '',
    department_val: profile.department || '',
    salary_val: profile.base_salary,
    hourly_val: profile.hourly_rate,
    dob_val: profile.date_of_birth || null
  });
  
  if (error) throw error;

  // Direct update for extra columns to avoid changing RPC signature
  const extraUpdates: any = {};
  if (profile.income_tax !== undefined) extraUpdates.income_tax = profile.income_tax;
  if (profile.nic_no !== undefined) extraUpdates.nic_no = profile.nic_no;
  if (profile.emergency_contacts !== undefined) extraUpdates.emergency_contacts = profile.emergency_contacts;
  if (profile.timeline_periods !== undefined) extraUpdates.timeline_periods = profile.timeline_periods;
  if (profile.joining_date !== undefined) extraUpdates.joining_date = profile.joining_date;
  if (profile.bank_name !== undefined) extraUpdates.bank_name = profile.bank_name;
  if (profile.bank_account_title !== undefined) extraUpdates.bank_account_title = profile.bank_account_title;
  if (profile.bank_account_no !== undefined) extraUpdates.bank_account_no = profile.bank_account_no;
  if (profile.payment_method !== undefined) extraUpdates.payment_method = profile.payment_method;
  if (profile.phone !== undefined) extraUpdates.phone = profile.phone;
  if (password !== undefined && password !== '') extraUpdates.password = password;

  if (Object.keys(extraUpdates).length > 0) {
    const { error: updateErr } = await supabase
      .from('profiles')
      .update(extraUpdates)
      .eq('id', userId);
    if (updateErr) throw updateErr;
  }
  
  // Fetch the created/updated public profile record to return
  const { data: newProfile, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (fetchError) throw fetchError;
  return newProfile as EmployeeProfile;
}

// Completely delete an employee profile and auth account from Supabase
export async function deleteProfile(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_employee_user', { user_id: id });
  if (error) throw error;
}

// Update display order and department of multiple profiles for persistent drag-and-drop ordering
export async function updateProfilesDisplayOrder(
  updates: { id: string; display_order: number; department?: string }[]
): Promise<void> {
  if (!updates || updates.length === 0) return;

  for (const item of updates) {
    const patch: any = { display_order: item.display_order };
    if (item.department !== undefined) {
      patch.department = item.department;
    }
    await supabase.from('profiles').update(patch).eq('id', item.id);
  }
}

// Synchronize an employee's consumed leave balance based on all Approved leave requests
export async function syncEmployeeLeaveBalances(employeeId: string): Promise<any> {
  let existingBal: any = null;
  try {
    const { data } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle();
    existingBal = data;
  } catch (e) { /* ignore read error */ }

  let approvedLeaves: any[] = [];
  try {
    const { data } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('status', 'Approved');
    approvedLeaves = data || [];
  } catch (e) { /* ignore */ }

  let holidayDates: string[] = [];
  try {
    const { data: holidays } = await supabase
      .from('holidays')
      .select('date');
    if (holidays) {
      holidayDates = holidays.map((h: any) => h.date);
    }
  } catch (e) { /* ignore */ }

  let casualUsed = 0;
  let medicalUsed = 0;
  let annualUsed = 0;

  approvedLeaves.forEach((leave: any) => {
    const start = new Date(leave.start_date + 'T00:00:00');
    const end = new Date(leave.end_date + 'T00:00:00');
    
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

    const type = leave.leave_type;
    if (type === 'Casual') casualUsed += diffDays;
    else if (type === 'Medical') medicalUsed += diffDays;
    else if (type === 'Annual') annualUsed += diffDays;
  });

  const casualTotal = existingBal?.casual_total ?? 10;
  const medicalTotal = existingBal?.medical_total ?? 10;
  const annualTotal = existingBal?.annual_total ?? 10;

  const payload = {
    employee_id: employeeId,
    casual_total: casualTotal,
    casual_used: casualUsed,
    medical_total: medicalTotal,
    medical_used: medicalUsed,
    annual_total: annualTotal,
    annual_used: annualUsed
  };

  try {
    await supabase
      .from('leave_balances')
      .upsert(payload, { onConflict: 'employee_id' });
  } catch (e) { /* ignore upsert error */ }

  return payload;
}

// Update an employee's leave balance in Supabase
export async function updateLeaveBalance(employeeId: string, balance: any): Promise<void> {
  const payload = {
    employee_id: employeeId,
    casual_total: Number(balance.casual_total ?? 10),
    casual_used: Number(balance.casual_used ?? 0),
    medical_total: Number(balance.medical_total ?? 10),
    medical_used: Number(balance.medical_used ?? 0),
    annual_total: Number(balance.annual_total ?? 10),
    annual_used: Number(balance.annual_used ?? 0)
  };

  const { error } = await supabase
    .from('leave_balances')
    .upsert(payload, { onConflict: 'employee_id' });

  if (error) {
    console.error('Failed to update leave balances in Supabase:', error);
    throw error;
  }
}

// Fetch leave balances from Supabase (auto-syncing if employeeId provided)
export async function getLeaveBalances(employeeId?: string): Promise<any[]> {
  try {
    if (employeeId) {
      // 1. READ-ONLY lookup first for employees
      const { data, error } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (!error && data) {
        return [data];
      }

      // 2. If row not found in DB, return computed in-memory payload
      let approvedLeaves: any[] = [];
      try {
        const { data: leaves } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('status', 'Approved');
        approvedLeaves = leaves || [];
      } catch (e) {}

      let casualUsed = 0;
      let medicalUsed = 0;
      let annualUsed = 0;

      approvedLeaves.forEach((l: any) => {
        const diff = Math.max(1, Math.ceil((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / 86400000) + 1);
        if (l.leave_type === 'Casual') casualUsed += diff;
        else if (l.leave_type === 'Medical') medicalUsed += diff;
        else if (l.leave_type === 'Annual') annualUsed += diff;
      });

      return [{
        employee_id: employeeId,
        casual_total: 10, casual_used: casualUsed,
        medical_total: 10, medical_used: medicalUsed,
        annual_total: 10, annual_used: annualUsed
      }];
    }
    const { data, error } = await supabase.from('leave_balances').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    if (employeeId) {
      return [{
        employee_id: employeeId,
        casual_total: 10, casual_used: 0,
        medical_total: 10, medical_used: 0,
        annual_total: 10, annual_used: 0
      }];
    }
    return [];
  }
}

// Helper to split leave date range into primary and secondary chunks based on working days
interface LeaveSplitChunk {
  startDate: string;
  endDate: string;
  workingDays: number;
}

export function splitLeaveDateRange(
  startDateStr: string,
  endDateStr: string,
  primaryDaysCount: number,
  holidayDates: string[] = []
): { primaryChunk: LeaveSplitChunk; secondaryChunk: LeaveSplitChunk | null } {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  const workingDates: string[] = [];
  const loop = new Date(start);

  while (loop <= end) {
    const curStr = `${loop.getFullYear()}-${pad(loop.getMonth() + 1)}-${pad(loop.getDate())}`;
    const dayOfWeek = loop.getDay();
    const isSun = dayOfWeek === 0;
    const dayOfMonth = loop.getDate();
    const weekNum = Math.ceil(dayOfMonth / 7);
    const offSat = dayOfWeek === 6 && (weekNum === 1 || weekNum === 3 || weekNum === 5);
    const isHoliday = holidayDates.includes(curStr);

    if (!isSun && !offSat && !isHoliday) {
      workingDates.push(curStr);
    }
    loop.setDate(loop.getDate() + 1);
  }

  const totalWorkingDays = workingDates.length;

  if (primaryDaysCount >= totalWorkingDays || primaryDaysCount <= 0) {
    return {
      primaryChunk: { startDate: startDateStr, endDate: endDateStr, workingDays: totalWorkingDays },
      secondaryChunk: null
    };
  }

  const primaryStartDate = startDateStr;
  const primaryEndDate = workingDates[primaryDaysCount - 1];

  const secStartObj = new Date(primaryEndDate + 'T00:00:00');
  secStartObj.setDate(secStartObj.getDate() + 1);
  const secondaryStartDate = `${secStartObj.getFullYear()}-${pad(secStartObj.getMonth() + 1)}-${pad(secStartObj.getDate())}`;
  const secondaryEndDate = endDateStr;

  const secondaryWorkingDays = totalWorkingDays - primaryDaysCount;

  return {
    primaryChunk: {
      startDate: primaryStartDate,
      endDate: primaryEndDate,
      workingDays: primaryDaysCount
    },
    secondaryChunk: {
      startDate: secondaryStartDate,
      endDate: secondaryEndDate,
      workingDays: secondaryWorkingDays
    }
  };
}

// Approve and split a leave request across primary and secondary leave categories
export async function approveAndSplitLeaveRequest(
  requestId: number,
  primaryType: 'Casual' | 'Medical' | 'Annual',
  primaryDays: number,
  secondaryType?: 'Casual' | 'Medical' | 'Annual',
  holidayDates: string[] = []
): Promise<void> {
  const { data: req, error: fetchErr } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchErr || !req) throw fetchErr || new Error('Leave request not found');

  const splitResult = splitLeaveDateRange(req.start_date, req.end_date, primaryDays, holidayDates);

  // Update primary chunk
  const { error: updateErr } = await supabase
    .from('leave_requests')
    .update({
      start_date: splitResult.primaryChunk.startDate,
      end_date: splitResult.primaryChunk.endDate,
      leave_type: primaryType,
      status: 'Approved'
    })
    .eq('id', requestId);

  if (updateErr) throw updateErr;

  // Insert secondary chunk if present
  if (splitResult.secondaryChunk && secondaryType) {
    const { error: insertErr } = await supabase
      .from('leave_requests')
      .insert({
        employee_id: req.employee_id,
        start_date: splitResult.secondaryChunk.startDate,
        end_date: splitResult.secondaryChunk.endDate,
        leave_type: secondaryType,
        reason: req.reason ? `${req.reason} (Exceeding portion)` : 'Leave (Exceeding portion)',
        status: 'Approved'
      });

    if (insertErr) throw insertErr;
  }

  await syncEmployeeLeaveBalances(req.employee_id);
}

// Fetch leave requests from Supabase
export async function getLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
  const query = supabase.from('leave_requests').select('*');
  let isUuid = false;

  if (employeeId) {
    const clean = String(employeeId).trim().toLowerCase();
    if (clean.length > 20 && clean.includes('-')) {
      query.eq('employee_id', clean);
      isUuid = true;
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  const rawList = (data as LeaveRequest[]) || [];

  const allRequests = rawList.map(r => {
    const rawTime = r.requested_at || r.created_at || (r as any).applied_at || (r as any).created_at || (r as any).requested_at;
    return {
      ...r,
      requested_at: rawTime,
      created_at: rawTime
    };
  }).sort((a, b) => new Date(b.requested_at || b.created_at || 0).getTime() - new Date(a.requested_at || a.created_at || 0).getTime());

  if (employeeId && !isUuid) {
    const clean = String(employeeId).trim().toLowerCase();
    return allRequests.filter(r => 
      r.employee_id && (
        String(r.employee_id).trim().toLowerCase() === clean ||
        matchPin(r.employee_id, clean)
      )
    );
  }

  return allRequests;
}

// Create a new leave request in Supabase
export async function createLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status'>): Promise<LeaveRequest> {
  let targetEmployeeId = request.employee_id;

  // If targetEmployeeId is not a valid UUID (e.g. is a PIN '1001' or email 'm.ashhar10@gmail.com'), lookup profile UUID from profiles table
  if (targetEmployeeId && (!targetEmployeeId.includes('-') || targetEmployeeId.includes('@'))) {
    try {
      const prof = await getProfileById(targetEmployeeId);
      if (prof?.id && String(prof.id).includes('-')) {
        targetEmployeeId = prof.id;
      }
    } catch (e) {}
  }

  const nowIso = new Date().toISOString();
  const payload: any = {
    employee_id: targetEmployeeId,
    start_date: request.start_date,
    end_date: request.end_date,
    leave_type: request.leave_type || 'Casual',
    reason: request.reason || '',
    status: 'Pending',
    requested_at: nowIso
  };

  let { data, error } = await supabase
    .from('leave_requests')
    .insert(payload)
    .select()
    .single();
  
  if (error) {
    // If schema cache mismatch error occurs, retry without requested_at timestamp field
    delete payload.requested_at;
    const retry = await supabase
      .from('leave_requests')
      .insert(payload)
      .select()
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    throw new Error(error.message || 'Failed to submit leave request to database');
  }

  const resultLeave = {
    ...data,
    created_at: data?.created_at || data?.requested_at || nowIso,
    requested_at: data?.requested_at || data?.created_at || nowIso
  } as LeaveRequest;

  try {
    let empName = 'Employee';
    let empPin = '';
    try {
      const prof = await getProfileById(targetEmployeeId);
      if (prof) {
        empName = prof.full_name || prof.email || 'Employee';
        empPin = prof.pin ? ` (PIN: ${prof.pin})` : '';
      }
    } catch (e) {}

    await createNotification({
      user_id: 'admin',
      title: `New Leave Request - ${empName}`,
      message: `${empName}${empPin} submitted a ${request.leave_type || 'Casual'} leave request for ${request.start_date} to ${request.end_date}. Reason: "${request.reason || 'Not specified'}"`
    });
  } catch (e) {}

  return resultLeave;
}

// Approve or reject a leave request and adjust balances accordingly
export async function updateLeaveRequestStatus(
  requestId: number, 
  status: 'Approved' | 'Rejected' | 'Pending', 
  newLeaveType?: 'Casual' | 'Medical' | 'Annual'
): Promise<void> {
  const updatePayload: any = { status };
  if (newLeaveType) {
    updatePayload.leave_type = newLeaveType;
  }

  const { data: leave, error: getError } = await supabase
    .from('leave_requests')
    .update(updatePayload)
    .eq('id', requestId)
    .select()
    .single();

  if (getError) throw getError;

  if (leave && leave.employee_id) {
    await syncEmployeeLeaveBalances(leave.employee_id);
  }
}

// Delete a leave request
export async function deleteLeaveRequest(requestId: number): Promise<void> {
  let empId: string | undefined = undefined;
  try {
    const { data: leave } = await supabase
      .from('leave_requests')
      .select('employee_id')
      .eq('id', requestId)
      .maybeSingle();
    if (leave) empId = leave.employee_id;
  } catch (e) {}

  try {
    const { error } = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', requestId);
    if (error) {
      /* RLS fallback handle */
    }
  } catch (e) {}

  if (empId) {
    try {
      await syncEmployeeLeaveBalances(empId);
    } catch (e) {}
  }

  // Trigger sync event so both Admin and Employee dashboard immediately refresh their leave lists
  try {
    window.dispatchEvent(new CustomEvent('app-refresh-notifications'));
  } catch (e) {}
}

// Fetch raw logs from Supabase (with optional server-side filtering for PIN, startDate, and endDate)
export async function getRawLogs(employeePin?: string, startDate?: string, endDate?: string): Promise<RawLog[]> {
  let allLogs: RawLog[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('raw_attendance_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(from, from + step - 1);

    if (employeePin && employeePin.trim()) {
      const pinStr = employeePin.trim();
      const numPin = parseInt(pinStr, 10);
      if (!isNaN(numPin)) {
        // match both pinStr and unpadded/padded if applicable e.g. "17", "017", "0017"
        const unpadded = String(numPin);
        const padded2 = unpadded.padStart(2, '0');
        const padded3 = unpadded.padStart(3, '0');
        const padded4 = unpadded.padStart(4, '0');
        const pinSet = Array.from(new Set([pinStr, unpadded, padded2, padded3, padded4]));
        query = query.in('employee_pin', pinSet);
      } else {
        query = query.eq('employee_pin', pinStr);
      }
    }

    if (startDate && startDate.trim()) {
      const s = startDate.trim();
      query = query.gte('timestamp', s.includes('T') ? s : `${s}T00:00:00.000Z`);
    }

    if (endDate && endDate.trim()) {
      const e = endDate.trim();
      query = query.lte('timestamp', e.includes('T') ? e : `${e}T23:59:59.999Z`);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      allLogs = allLogs.concat(data as RawLog[]);
      if (data.length < step) {
        hasMore = false;
      } else {
        from += step;
      }
    } else {
      hasMore = false;
    }
  }

  if (employeePin) {
    return allLogs.filter(l => matchPin(l.employee_pin, employeePin));
  }

  return allLogs;
}

// Upload raw logs into Supabase (ignoring duplicate pin+timestamp entries)
export async function uploadRawLogs(logs: RawLog[]): Promise<void> {
  const { error } = await supabase
    .from('raw_attendance_logs')
    .upsert(logs, {
      onConflict: 'employee_pin,timestamp',
      ignoreDuplicates: true
    });
    
  if (error) throw error;
}

export interface ShiftTiming {
  id?: number;
  target_type: 'designation' | 'department' | 'employee' | 'global_default';
  target_id: string;
  target_name: string;
  start_time: string;
  end_time: string;
  grace_mins?: number;
  days: string[];
  is_fixed_hours?: boolean;
  total_hours?: number;
  saturday_option?: 'alternate' | 'all_off' | 'all_working';
  allow_regular_overtime?: boolean;
  created_at?: string;
}

// Fetch departments
export async function getDepartments(): Promise<string[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('name')
    .order('name', { ascending: true });
    
  if (error) throw error;
  return (data || []).map((d: any) => d.name);
}

// Add department
export async function addDepartment(name: string): Promise<string> {
  const { data, error } = await supabase
    .from('departments')
    .insert({ name })
    .select('name')
    .single();
    
  if (error) throw error;
  return data.name;
}

// Fetch designations
export async function getDesignations(): Promise<string[]> {
  const { data, error } = await supabase
    .from('designations')
    .select('name')
    .order('name', { ascending: true });
    
  if (error) throw error;
  return (data || []).map((d: any) => d.name);
}

// Add designation
export async function addDesignation(name: string): Promise<string> {
  const { data, error } = await supabase
    .from('designations')
    .insert({ name })
    .select('name')
    .single();
    
  if (error) throw error;
  return data.name;
}

const SHIFT_TIMINGS_BACKUP_KEY = 'elipse_shift_timings_backup_v1';

export function getLocalShiftTimingsBackup(): Record<string, Partial<ShiftTiming>> {
  try {
    const str = localStorage.getItem(SHIFT_TIMINGS_BACKUP_KEY);
    return str ? JSON.parse(str) : {};
  } catch (e) {
    return {};
  }
}

export function setLocalShiftTimingBackup(rule: ShiftTiming) {
  try {
    const backup = getLocalShiftTimingsBackup();
    const key = rule.id ? `id_${rule.id}` : `${rule.target_type}_${rule.target_id}`;
    backup[key] = rule;
    localStorage.setItem(SHIFT_TIMINGS_BACKUP_KEY, JSON.stringify(backup));
  } catch (e) {}
}

// Fetch Shift Timings
export async function getShiftTimings(): Promise<ShiftTiming[]> {
  let list: ShiftTiming[] = [];
  try {
    const { data, error } = await supabase
      .from('shift_timings')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      list = (data as any[]).map(t => {
        const startStr = String(t.start_time || '');
        const endStr = String(t.end_time || '');
        const startParts = startStr.split(':');
        const endParts = endStr.split(':');
        const startSecs = startParts[2] ? parseInt(startParts[2], 10) : 0;
        const endMins = endParts[1] ? parseInt(endParts[1], 10) : 0;
        const startMins = startParts[1] ? parseInt(startParts[1], 10) : 0;
        
        let isFix = t.is_fixed_hours;
        let totHrs = undefined;

        const tagMatch = String(t.target_name || '').match(/\[FIXED_HOURS:(\d+(?:\.\d+)?)\]/i);
        if (tagMatch) {
          isFix = true;
          totHrs = parseFloat(tagMatch[1]);
        }

        if (isFix === undefined || isFix === null) {
          isFix = startStr === endStr || (startStr.startsWith('09:00') && endStr.startsWith('09:')) || (startSecs > 0 && startSecs <= 24);
        }

        if (totHrs === undefined) {
          if (isFix) {
            if (endStr.startsWith('09:') && endMins > 0 && endMins <= 24 && startMins === 0) {
              totHrs = endMins;
            } else if (startSecs > 0 && startSecs <= 24) {
              totHrs = startSecs;
            } else if (t.total_hours && Number(t.total_hours) > 0) {
              totHrs = Number(t.total_hours);
            } else {
              totHrs = 9;
            }
          } else {
            totHrs = (t.total_hours && Number(t.total_hours) > 0) ? Number(t.total_hours) : calculateShiftDurationHours(t.start_time, t.end_time);
          }
        }

        return {
          ...t,
          is_fixed_hours: !!isFix,
          allow_regular_overtime: t.allow_regular_overtime === true,
          total_hours: Number(totHrs) || 9,
          // Keep raw start_time/end_time so resolveTotalHours can decode encoded hours from them
          start_time: t.start_time || '09:00:00',
          end_time: t.end_time || '18:00:00'
        };
      });
    }
  } catch (e) {}

  // Merge with local backup as additional layer
  const backup = getLocalShiftTimingsBackup();
  list = list.map(t => {
    const keyId = t.id ? `id_${t.id}` : '';
    const keyTarget = `${t.target_type}_${t.target_id}`;
    const saved = backup[keyId] || backup[keyTarget];
    if (saved) {
      return {
        ...t,
        is_fixed_hours: saved.is_fixed_hours !== undefined ? saved.is_fixed_hours : t.is_fixed_hours,
        allow_regular_overtime: saved.allow_regular_overtime !== undefined ? saved.allow_regular_overtime : t.allow_regular_overtime,
        total_hours: saved.total_hours !== undefined ? saved.total_hours : t.total_hours,
        grace_mins: saved.grace_mins !== undefined ? saved.grace_mins : t.grace_mins,
        saturday_option: saved.saturday_option !== undefined ? saved.saturday_option : t.saturday_option,
      };
    }
    return t;
  });

  return list.filter(t => t.target_id !== 'GLOBAL_DEFAULT_SETTINGS');
}

// Save Shift Timing (Create/Update)
export async function saveShiftTiming(timing: ShiftTiming): Promise<ShiftTiming> {
  setLocalShiftTimingBackup(timing);

  const startVal = timing.start_time || '09:00:00';
  const endVal = timing.end_time || '18:00:00';

  // Clean payload matching base table schema
  const cleanPayload: any = {
    target_type: timing.target_type,
    target_id: timing.target_id,
    target_name: timing.target_name,
    start_time: startVal,
    end_time: endVal,
    days: timing.days,
    is_fixed_hours: timing.is_fixed_hours,
    total_hours: timing.total_hours || 9,
    saturday_option: timing.saturday_option,
    grace_mins: timing.grace_mins,
    allow_regular_overtime: timing.allow_regular_overtime === true
  };
  if (timing.id) {
    cleanPayload.id = timing.id;
  }

  try {
    const { data, error } = await supabase
      .from('shift_timings')
      .upsert(cleanPayload)
      .select()
      .maybeSingle();

    if (!error && data) {
      const merged = { ...data, ...timing };
      setLocalShiftTimingBackup(merged);
      return merged as ShiftTiming;
    } else if (error) {
      // Fallback for missing optional DB columns
      const fallbackPayload: any = {
        target_type: timing.target_type,
        target_id: timing.target_id,
        target_name: timing.target_name,
        start_time: startVal,
        end_time: endVal,
        days: timing.days
      };
      if (timing.id) fallbackPayload.id = timing.id;
      const { data: fbData } = await supabase.from('shift_timings').upsert(fallbackPayload).select().maybeSingle();
      if (fbData) {
        const merged = { ...fbData, ...timing };
        setLocalShiftTimingBackup(merged);
        return merged as ShiftTiming;
      }
    }
  } catch (e) {}

  return timing;
}

// Delete Shift Timing
export async function deleteShiftTiming(id: number): Promise<void> {
  const { error } = await supabase
    .from('shift_timings')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}

// --- NEW HELPDESK, ANNOUNCEMENTS, AND NOTIFICATIONS CENTER HELPERS ---

export interface Complaint {
  id?: number;
  employee_id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Ignored' | 'Rejected';
  resolution?: string;
  created_at?: string;
}

export interface Announcement {
  id?: number;
  title: string;
  message: string;
  target_type: 'all' | 'department' | 'designation' | 'employee';
  target_value?: string;
  color?: string;
  created_at?: string;
}

export interface Notification {
  id?: number;
  user_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at?: string;
}

// Fetch complaints from Supabase (excludes loan request entries)
export async function getComplaints(employeeId?: string): Promise<Complaint[]> {
  let query = supabase.from('complaints').select('*').order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  const list = (data || []) as Complaint[];
  // Filter out loan request entries — they belong in the Loans panel, not Help Desk
  const filtered = list.filter(c => !c.title?.includes('[LOAN_REQUEST]'));
  if (employeeId) {
    return filtered.filter(c => matchPin(c.employee_id, employeeId));
  }
  return filtered;
}

// Create a complaint
export async function createComplaint(complaint: Omit<Complaint, 'id' | 'status'>): Promise<Complaint> {
  const { data, error } = await supabase
    .from('complaints')
    .insert({
      ...complaint,
      status: 'Open'
    })
    .select()
    .single();

  if (error) throw error;
  return data as Complaint;
}

// Update a complaint status or resolution
export async function updateComplaintStatus(id: number, status: Complaint['status'], resolution?: string): Promise<Complaint> {
  const updateData: Partial<Complaint> = { status };
  if (resolution !== undefined) {
    updateData.resolution = resolution;
  }
  
  const { data, error } = await supabase
    .from('complaints')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Complaint;
}

// Delete a complaint
export async function deleteComplaint(id: number): Promise<void> {
  const { error } = await supabase
    .from('complaints')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export interface ApprovedCorrection {
  id?: number;
  employee_id: string;
  employee_pin: string;
  date: string;
  check_in?: string | null;
  check_out?: string | null;
  status?: string;
  created_at?: string;
}

// Fetch approved attendance corrections (with graceful fallback to localStorage)
export async function getApprovedAttendanceCorrections(employeeId?: string): Promise<ApprovedCorrection[]> {
  let allCorrs: ApprovedCorrection[] = [];
  try {
    const { data, error } = await supabase
      .from('approved_attendance_corrections')
      .select('*');
    if (!error && data) {
      allCorrs = data as ApprovedCorrection[];
    }
  } catch (e) {
    /* fallback to localStorage */
  }

  try {
    const raw = localStorage.getItem('approved_attendance_corrections');
    if (raw) {
      const parsed: ApprovedCorrection[] = JSON.parse(raw);
      parsed.forEach(c => {
        if (!allCorrs.some(x => x.employee_id === c.employee_id && x.date === c.date)) {
          allCorrs.push(c);
        }
      });
    }
  } catch (e) {}

  if (employeeId) {
    return allCorrs.filter(c => matchPin(c.employee_id, employeeId) || matchPin(c.employee_pin, employeeId));
  }

  return allCorrs;
}

// Save or update an approved attendance correction
export async function saveApprovedAttendanceCorrection(corr: ApprovedCorrection): Promise<void> {
  // 1. Try to upsert into Supabase table
  try {
    await supabase
      .from('approved_attendance_corrections')
      .upsert({
        employee_id: corr.employee_id,
        employee_pin: corr.employee_pin,
        date: corr.date,
        check_in: corr.check_in || null,
        check_out: corr.check_out || null,
        status: corr.status || 'Approved'
      }, {
        onConflict: 'employee_id,date'
      });
  } catch (e) {
    /* fallback */
  }

  // 2. Also persist in localStorage for multi-layer local caching
  try {
    const raw = localStorage.getItem('approved_attendance_corrections');
    let list: ApprovedCorrection[] = raw ? JSON.parse(raw) : [];
    list = list.filter(item => !(item.employee_id === corr.employee_id && item.date === corr.date));
    list.push(corr);
    localStorage.setItem('approved_attendance_corrections', JSON.stringify(list));
  } catch (e) {}
}

// Fetch announcements
export async function getAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Announcement[];
}

// Create an announcement
export async function createAnnouncement(announcement: Announcement): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert(announcement)
    .select()
    .single();

  if (error) throw error;
  return data as Announcement;
}

// Delete announcement
export async function deleteAnnouncement(id: number): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Fetch notifications
export async function getNotifications(
  userId: string, 
  isAdmin: boolean = false,
  userPin?: string,
  userEmail?: string,
  userDesignation?: string
): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    const allNotifs = data as Notification[];
    const cleanId = String(userId || '').trim().toLowerCase();
    const cleanPin = String(userPin || '').trim().toLowerCase();
    const cleanEmail = String(userEmail || '').trim().toLowerCase();
    const cleanDesig = String(userDesignation || '').trim().toLowerCase();

    if (isAdmin) {
      // Admin sees notifications intended for Admin (user_id = 'admin' / Admin UUID / Admin Email) or system alerts
      return allNotifs.filter(n => {
        const target = String(n.user_id || '').trim().toLowerCase();
        if (!n.user_id || target === 'admin' || target === 'all') return true;
        if (cleanId && target === cleanId) return true;
        if (cleanEmail && target === cleanEmail) return true;
        if (cleanPin && target === cleanPin) return true;

        const t = String(n.title || '').toLowerCase();
        if (t.includes('leave request') || t.includes('loan request') || t.includes('helpdesk') || t.includes('ticket')) {
          return true;
        }
        return false;
      });
    }

    // Isolated filtering for regular employees: ONLY see notifications targeted to THIS employee!
    return allNotifs.filter(n => {
      const targetUser = String(n.user_id || '').trim().toLowerCase();
      
      // Exclude admin notifications
      if (targetUser === 'admin') return false;

      // Global broadcast notification for all employees
      if (!n.user_id || targetUser === 'all' || targetUser === 'null') {
        return true;
      }

      // Direct match by UUID, PIN, or Email
      if (
        (cleanId && targetUser === cleanId) ||
        (cleanPin && targetUser === cleanPin) ||
        (cleanEmail && targetUser === cleanEmail)
      ) {
        return true;
      }

      // Designation match if specified
      if (cleanDesig && (
        String(n.title || '').toLowerCase().includes(cleanDesig) ||
        String(n.message || '').toLowerCase().includes(`(${cleanDesig})`)
      )) {
        return true;
      }

      return false;
    });
  } catch (err) {
    return [];
  }
}

// Create a notification
export async function createNotification(notification: Omit<Notification, 'id' | 'is_read'>): Promise<Notification> {
  const { data } = await supabase
    .from('notifications')
    .insert({
      ...notification,
      is_read: false
    })
    .select()
    .single();

  const finalNotif = data || {
    id: Date.now(),
    ...notification,
    is_read: false,
    created_at: new Date().toISOString()
  };

  // Instant Peer-to-Peer WebSocket Broadcast (0ms latency across all active clients)
  broadcastLiveNotification({
    id: finalNotif.id,
    user_id: notification.user_id,
    title: notification.title,
    message: notification.message
  }).catch(() => {});

  // Dispatch local window event so current window reacts immediately with zero lag
  try {
    window.dispatchEvent(new CustomEvent('app-local-notification', { detail: finalNotif }));
  } catch (wErr) {}

  return finalNotif as Notification;
}

// Mark single notification read
export async function markNotificationRead(id: number): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;
}

// Mark all notifications read for a user
export async function markAllNotificationsRead(userId: string, isAdmin?: boolean, specificIds?: number[]): Promise<void> {
  if (specificIds && specificIds.length > 0) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', specificIds);
    return;
  }

  if (isAdmin) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`user_id.eq.admin,user_id.eq.${userId},user_id.is.null`);
  } else {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`user_id.eq.${userId},user_id.is.null`);
  }
}

// --- HOLIDAYS ---

export interface Holiday {
  id?: number;
  date: string;
  title: string;
  description?: string;
  color?: string;
  created_by?: string;
  created_at?: string;
}

// Fetch all holidays
export async function getHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('date', { ascending: true });

  if (error) throw error;
  return data as Holiday[];
}

// Create a holiday
export async function createHoliday(holiday: Omit<Holiday, 'id' | 'created_at'>): Promise<Holiday> {
  const { data, error } = await supabase
    .from('holidays')
    .insert(holiday)
    .select()
    .single();

  if (error) throw error;
  return data as Holiday;
}

// Delete a holiday
export async function deleteHoliday(id: number): Promise<void> {
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Check and trigger birthday notifications
export async function checkAndTriggerBirthdayNotifications(): Promise<void> {
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('full_name, date_of_birth')
    .eq('is_active', true);

  if (pError || !profiles) return;

  const today = new Date();
  const todayMonth = today.getMonth(); // 0-11
  const todayDay = today.getDate(); // 1-31

  const birthdayPeople = profiles.filter(p => {
    if (!p.date_of_birth) return false;
    const dob = new Date(p.date_of_birth + 'T00:00:00');
    return dob.getMonth() === todayMonth && dob.getDate() === todayDay;
  });

  if (birthdayPeople.length === 0) return;

  // Start of today in UTC/ISO
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayStartStr = todayStart.toLocaleDateString('en-CA') + 'T00:00:00.000Z';

  const { data: existingNotifs, error: nError } = await supabase
    .from('notifications')
    .select('message')
    .eq('title', 'Birthday Today')
    .gte('created_at', todayStartStr);

  if (nError) return;

  for (const person of birthdayPeople) {
    const msg = `Happy Birthday to ${person.full_name}!`;
    const alreadySent = (existingNotifs || []).some(n => n.message === msg);

    if (!alreadySent) {
      await createNotification({
        user_id: null,
        title: 'Birthday Today',
        message: msg
      });
    }
  }
}

// --- DEVICE SETTINGS ---

export interface DeviceSettings {
  id?: number;
  ip_address: string;
  port: number;
  sync_interval: number;
  last_sync?: string | null;
  status?: string;
  last_connection_state?: string;
  grace_time_mins?: number;
  monthly_grace_settings?: Record<string, number>;
  default_shift_start_time?: string;
  default_shift_end_time?: string;
  default_shift_total_hours?: number;
  updated_at?: string;
}

// Fetch device settings from Supabase (with multi-device localStorage fallback & sync)
export async function getDeviceSettings(): Promise<DeviceSettings> {
  let dbResult: DeviceSettings | null = null;
  try {
    const { data, error } = await supabase
      .from('device_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (!error && data) {
      dbResult = data as DeviceSettings;
    }
  } catch (err) {}

  let globalTiming: ShiftTiming | null = null;
  try {
    const { data } = await supabase
      .from('shift_timings')
      .select('*')
      .eq('target_type', 'department')
      .eq('target_id', 'GLOBAL_DEFAULT_SETTINGS')
      .maybeSingle();
    if (data) globalTiming = data as ShiftTiming;
  } catch (e) {}

  let tagGraceMins: number | null = null;
  let tagMonthlyGrace: Record<string, number> | null = null;
  if (globalTiming?.target_name) {
    const gMatch = globalTiming.target_name.match(/\[GRACE:(\d+)\]/i);
    if (gMatch) tagGraceMins = parseInt(gMatch[1], 10);
    const mMatch = globalTiming.target_name.match(/\[MONTHLY:(\{.*?\})\]/i);
    if (mMatch) {
      try { tagMonthlyGrace = JSON.parse(mMatch[1]); } catch(e) {}
    }
  }

  let localSettings: Partial<DeviceSettings> = {};
  try {
    const raw = localStorage.getItem('device_settings');
    if (raw) localSettings = JSON.parse(raw);
  } catch (err) {}

  const localGrace = localStorage.getItem('office_grace_time_mins');
  const localMonthlyGrace = localStorage.getItem('monthly_grace_settings');
  const localStart = localStorage.getItem('office_default_shift_start');
  const localEnd = localStorage.getItem('office_default_shift_end');
  const localHours = localStorage.getItem('office_default_shift_hours');

  const graceMins = dbResult?.grace_time_mins ?? globalTiming?.grace_mins ?? tagGraceMins ?? localSettings.grace_time_mins ?? (localGrace ? parseInt(localGrace, 10) : 20);
  const monthlyGrace = dbResult?.monthly_grace_settings ?? tagMonthlyGrace ?? localSettings.monthly_grace_settings ?? (localMonthlyGrace ? JSON.parse(localMonthlyGrace) : {});
  const defaultStart = dbResult?.default_shift_start_time ?? (globalTiming?.start_time ? String(globalTiming.start_time).substring(0, 5) : null) ?? localSettings.default_shift_start_time ?? (localStart || '11:00');
  const defaultEnd = dbResult?.default_shift_end_time ?? (globalTiming?.end_time ? String(globalTiming.end_time).substring(0, 5) : null) ?? localSettings.default_shift_end_time ?? (localEnd || '20:00');
  const defaultHours = dbResult?.default_shift_total_hours ?? (globalTiming?.total_hours ? Number(globalTiming.total_hours) : null) ?? localSettings.default_shift_total_hours ?? (localHours ? parseFloat(localHours) : 9);

  return {
    id: 1,
    ip_address: dbResult?.ip_address || localSettings.ip_address || '192.168.1.201',
    port: dbResult?.port || localSettings.port || 4370,
    sync_interval: dbResult?.sync_interval || localSettings.sync_interval || 1,
    status: dbResult?.status || localSettings.status || 'Offline',
    last_connection_state: dbResult?.last_connection_state || localSettings.last_connection_state || 'Unknown',
    grace_time_mins: graceMins,
    monthly_grace_settings: monthlyGrace,
    default_shift_start_time: defaultStart,
    default_shift_end_time: defaultEnd,
    default_shift_total_hours: defaultHours
  };
}

// Update device settings in Supabase (with fallback to localStorage for offline devices)
export async function updateDeviceSettings(settings: Partial<DeviceSettings>): Promise<void> {
  // 1. Try updating device_settings table (full payload if columns exist, base fields fallback)
  const fullPayload = { id: 1, ...settings, updated_at: new Date().toISOString() };
  try {
    const { error } = await supabase.from('device_settings').upsert([fullPayload]);
    if (error) {
      const baseData: any = { id: 1, updated_at: new Date().toISOString() };
      if (settings.ip_address !== undefined) baseData.ip_address = settings.ip_address;
      if (settings.port !== undefined) baseData.port = settings.port;
      if (settings.sync_interval !== undefined) baseData.sync_interval = settings.sync_interval;
      if (settings.status !== undefined) baseData.status = settings.status;
      if (settings.last_connection_state !== undefined) baseData.last_connection_state = settings.last_connection_state;
      await supabase.from('device_settings').upsert([baseData]);
    }
  } catch (err) {}

  // 2. Save global default shift & grace settings to shift_timings under target_type='department' & target_id='GLOBAL_DEFAULT_SETTINGS' (satisfies DB constraint)
  try {
    const { data: existingGlobal } = await supabase
      .from('shift_timings')
      .select('*')
      .eq('target_type', 'department')
      .eq('target_id', 'GLOBAL_DEFAULT_SETTINGS')
      .maybeSingle();

    const tagStr = `[GRACE:${settings.grace_time_mins || 20}][MONTHLY:${JSON.stringify(settings.monthly_grace_settings || {})}]`;
    const globalRule: Partial<ShiftTiming> = {
      target_type: 'department',
      target_id: 'GLOBAL_DEFAULT_SETTINGS',
      target_name: `Global Default Settings ${tagStr}`,
      start_time: settings.default_shift_start_time || '11:00',
      end_time: settings.default_shift_end_time || '20:00',
      grace_mins: settings.grace_time_mins || 20,
      is_fixed_hours: true,
      total_hours: settings.default_shift_total_hours || 9,
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      allow_regular_overtime: true
    };
    if (existingGlobal?.id) {
      globalRule.id = existingGlobal.id;
    }
    await saveShiftTiming(globalRule as ShiftTiming);
  } catch (e) {}

  try {
    const raw = localStorage.getItem('device_settings');
    const prev = raw ? JSON.parse(raw) : {};
    const merged = { ...prev, ...settings, id: 1 };
    localStorage.setItem('device_settings', JSON.stringify(merged));
    if (settings.grace_time_mins !== undefined) {
      localStorage.setItem('office_grace_time_mins', settings.grace_time_mins.toString());
    }
    if (settings.monthly_grace_settings) {
      localStorage.setItem('monthly_grace_settings', JSON.stringify(settings.monthly_grace_settings));
    }
    if (settings.default_shift_start_time) {
      localStorage.setItem('office_default_shift_start', settings.default_shift_start_time);
    }
    if (settings.default_shift_end_time) {
      localStorage.setItem('office_default_shift_end', settings.default_shift_end_time);
    }
    if (settings.default_shift_total_hours !== undefined) {
      localStorage.setItem('office_default_shift_hours', settings.default_shift_total_hours.toString());
    }
  } catch (e) {}
}

// --- PURPOSE / CHARITY TRANSFERS ---

export interface PurposeTransfer {
  id?: number;
  payee_name: string;
  purpose: string;
  amount: number;
  payment_method: string;
  bank_name?: string;
  bank_account_title?: string;
  bank_account_no?: string;
  created_at?: string;
}

// Fetch all recorded purpose/charity transfers (with graceful fallback if table not created yet)
export async function getPurposeTransfers(): Promise<PurposeTransfer[]> {
  let list: PurposeTransfer[] = [];
  try {
    const { data, error } = await supabase
      .from('purpose_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      list = data as PurposeTransfer[];
    }
  } catch (err) {}

  try {
    const raw = localStorage.getItem('purpose_transfers');
    if (raw) {
      const local: PurposeTransfer[] = JSON.parse(raw);
      local.forEach(item => {
        if (!list.some(x => String(x.id) === String(item.id))) {
          list.push(item);
        }
      });
    }
  } catch (err) {}

  return list;
}

// Record a new purpose/charity transfer
export async function createPurposeTransfer(transfer: PurposeTransfer): Promise<PurposeTransfer> {
  let saved: PurposeTransfer = { ...transfer, id: transfer.id || Date.now() };
  try {
    const { data, error } = await supabase
      .from('purpose_transfers')
      .insert([transfer])
      .select()
      .single();

    if (!error && data) {
      saved = data;
    }
  } catch (error) {}

  try {
    const raw = localStorage.getItem('purpose_transfers');
    let list: PurposeTransfer[] = raw ? JSON.parse(raw) : [];
    list = list.filter(item => String(item.id) !== String(saved.id));
    list.unshift(saved);
    localStorage.setItem('purpose_transfers', JSON.stringify(list));
  } catch (e) {}

  return saved;
}

// Delete a purpose/charity transfer record
export async function deletePurposeTransfer(id: number): Promise<void> {
  try {
    await supabase
      .from('purpose_transfers')
      .delete()
      .eq('id', id);
  } catch (e) {}

  try {
    const raw = localStorage.getItem('purpose_transfers');
    if (raw) {
      let list: PurposeTransfer[] = JSON.parse(raw);
      list = list.filter(item => String(item.id) !== String(id));
      localStorage.setItem('purpose_transfers', JSON.stringify(list));
    }
  } catch (e) {}
}

// Update an existing purpose/charity transfer record
export async function updatePurposeTransfer(id: number, transfer: PurposeTransfer): Promise<PurposeTransfer> {
  const { data, error } = await supabase
    .from('purpose_transfers')
    .update(transfer)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- EMPLOYEE LOANS ---

export interface EmployeeLoan {
  id?: number;
  employee_id: string;
  employee_pin: string;
  employee_name?: string;
  employee_contact?: string;
  loan_name: string;
  loan_amount: number;
  monthly_deduction: number;
  months_duration?: number;
  total_repaid?: number;
  remaining_balance: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  notes?: string;
  start_date?: string;
  end_date?: string;
  months_skipped?: number;
  last_payment_date?: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch employee loans (with Supabase complaints fallback & local storage)
export async function getEmployeeLoans(employeeId?: string): Promise<EmployeeLoan[]> {
  let allLoans: EmployeeLoan[] = [];

  // Primary: Fetch from dedicated employee_loans table in Supabase
  try {
    const { data, error } = await supabase
      .from('employee_loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      allLoans = data as EmployeeLoan[];
    }
  } catch (e) {}

  // Secondary Fallback: Fetch from complaints table where title contains [LOAN_REQUEST]
  try {
    const { data: compData, error: compErr } = await supabase
      .from('complaints')
      .select('*')
      .ilike('title', '%[LOAN_REQUEST]%')
      .order('created_at', { ascending: false });

    if (!compErr && compData) {
      compData.forEach((c: any) => {
        let loanObj: Partial<EmployeeLoan> | null = null;
        if (c.description) {
          try {
            loanObj = JSON.parse(c.description);
          } catch (e) {}
        }

        const amt = loanObj?.loan_amount || parseFloat(String(c.title || '').match(/PKR\s*([\d,]+)/i)?.[1]?.replace(/,/g, '') || '0');
        const dur = loanObj?.months_duration || 1;
        const ded = loanObj?.monthly_deduction || (amt > 0 ? parseFloat((amt / dur).toFixed(2)) : 0);

        const statusMapped: EmployeeLoan['status'] = 
          c.status === 'Open' ? 'Pending' : 
          c.status === 'Resolved' ? 'Approved' : 
          c.status === 'In Progress' ? 'Pending' : 'Pending';

        const reconstructedLoan: EmployeeLoan = {
          id: c.id,
          employee_id: String(c.employee_id || ''),
          employee_pin: String(loanObj?.employee_pin || c.employee_id || ''),
          employee_name: loanObj?.employee_name || 'Employee',
          employee_contact: loanObj?.employee_contact || undefined,
          loan_name: loanObj?.loan_name || String(c.title || '').replace(/\[LOAN_REQUEST\]\s*/i, '').split('(')[0].trim() || 'Loan Request',
          loan_amount: amt,
          monthly_deduction: ded,
          months_duration: dur,
          total_repaid: loanObj?.total_repaid || 0,
          remaining_balance: loanObj?.remaining_balance || amt,
          status: loanObj?.status || statusMapped,
          notes: loanObj?.notes || c.description,
          created_at: c.created_at,
          updated_at: c.updated_at || c.created_at
        };

        if (!allLoans.some(x => x.id === reconstructedLoan.id || (x.employee_id === reconstructedLoan.employee_id && x.created_at === reconstructedLoan.created_at))) {
          allLoans.push(reconstructedLoan);
        }
      });
    }
  } catch (e) {}

  // Local Storage Sync & Cloud Auto-Migration
  try {
    const raw = localStorage.getItem('employee_loans');
    if (raw) {
      const parsed: EmployeeLoan[] = JSON.parse(raw);
      for (const c of parsed) {
        if (!allLoans.some(x => x.id === c.id || (x.employee_id === c.employee_id && x.created_at === c.created_at))) {
          allLoans.push(c);

          // Push local-only loan to Supabase Cloud via complaints table so Admin on any device sees it!
          try {
            await supabase.from('complaints').insert([{
              employee_id: c.employee_id,
              title: `[LOAN_REQUEST] ${c.loan_name} (PKR ${(c.loan_amount || 0).toLocaleString()})`,
              description: JSON.stringify(c),
              status: c.status === 'Approved' ? 'Resolved' : 'Open'
            }]);
          } catch (e) {}

          try {
            await supabase.from('employee_loans').insert([{
              employee_id: c.employee_id,
              employee_pin: c.employee_pin,
              employee_name: c.employee_name,
              employee_contact: c.employee_contact,
              loan_name: c.loan_name,
              loan_amount: c.loan_amount,
              monthly_deduction: c.monthly_deduction,
              months_duration: c.months_duration,
              total_repaid: c.total_repaid || 0,
              remaining_balance: c.remaining_balance || c.loan_amount,
              status: c.status || 'Pending',
              notes: c.notes
            }]);
          } catch (e) {}
        }
      }
    }
  } catch (e) {}

  if (employeeId) {
    return allLoans.filter(l => matchPin(l.employee_id, employeeId) || matchPin(l.employee_pin, employeeId));
  }

  return allLoans;
}

// Create a loan request (saves to employee_loans, complaints backup & localStorage)
export async function createEmployeeLoan(loan: Omit<EmployeeLoan, 'id' | 'created_at' | 'updated_at'>): Promise<EmployeeLoan> {
  let createdLoan: EmployeeLoan = {
    ...loan,
    id: Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Primary: Save to employee_loans table in Supabase
  try {
    const { data, error } = await supabase
      .from('employee_loans')
      .insert([{
        employee_id: loan.employee_id,
        employee_pin: loan.employee_pin,
        employee_name: loan.employee_name,
        employee_contact: loan.employee_contact,
        loan_name: loan.loan_name,
        loan_amount: loan.loan_amount,
        monthly_deduction: loan.monthly_deduction,
        months_duration: loan.months_duration,
        total_repaid: loan.total_repaid || 0,
        remaining_balance: loan.remaining_balance || loan.loan_amount,
        status: loan.status || 'Pending',
        notes: loan.notes
      }])
      .select()
      .single();

    if (!error && data) {
      createdLoan = data as EmployeeLoan;
    }
  } catch (e) {}

  // Secondary Dual-Write: Save to complaints table as cloud backup (valid columns: employee_id, title, description, status)
  try {
    const payload = { ...createdLoan, ...loan };
    const { data: compRes } = await supabase
      .from('complaints')
      .insert([{
        employee_id: loan.employee_id,
        title: `[LOAN_REQUEST] ${loan.loan_name} (PKR ${loan.loan_amount.toLocaleString()})`,
        description: JSON.stringify(payload),
        status: 'Open'
      }])
      .select()
      .single();

    if (compRes && compRes.id) {
      createdLoan.id = compRes.id;
    }
  } catch (e) {}

  // Sync to localStorage
  try {
    const raw = localStorage.getItem('employee_loans');
    const list: EmployeeLoan[] = raw ? JSON.parse(raw) : [];
    list.unshift(createdLoan);
    localStorage.setItem('employee_loans', JSON.stringify(list));
  } catch (e) {}

  try {
    await createNotification({
      user_id: 'admin',
      title: `New Loan Request - ${loan.employee_name || 'Employee'}`,
      message: `${loan.employee_name || 'Employee'} (PIN: ${loan.employee_pin || 'N/A'}) requested PKR ${Number(loan.loan_amount).toLocaleString()} (${loan.loan_name || 'Loan'}) for ${loan.months_duration || 12} months.`
    });
  } catch (e) {}

  return createdLoan;
}

// Update loan status or details (Approve, Modify, Ignore/Reject)
export async function updateEmployeeLoan(id: number, updates: Partial<EmployeeLoan>): Promise<EmployeeLoan> {
  const updatePayload = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  let updated: EmployeeLoan | null = null;

  // Primary: Update employee_loans table
  try {
    const { data, error } = await supabase
      .from('employee_loans')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      updated = data as EmployeeLoan;
    }
  } catch (e) {}

  // Secondary Backup: Update complaints table
  try {
    const compStatus = updates.status === 'Approved' ? 'Resolved' : updates.status === 'Rejected' ? 'Resolved' : 'Open';
    await supabase
      .from('complaints')
      .update({
        status: compStatus
      })
      .eq('id', id);
  } catch (e) {}

  // Sync to localStorage
  try {
    const raw = localStorage.getItem('employee_loans');
    let list: EmployeeLoan[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(l => l.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatePayload };
      if (!updated) updated = list[idx];
      localStorage.setItem('employee_loans', JSON.stringify(list));
    }
  } catch (e) {}

  if (updated && updates.status && updates.status !== 'Pending') {
    try {
      await createNotification({
        user_id: updated.employee_id,
        title: `Loan Request ${updates.status} - ${updated.loan_name || 'Loan'}`,
        message: `Your loan request for PKR ${Number(updated.loan_amount).toLocaleString()} has been ${updates.status.toLowerCase()} by Management.`
      });
    } catch (e) {}
  }

  return updated || ({ id, ...updatePayload } as EmployeeLoan);
}

// Delete / Ignore a loan request
export async function deleteEmployeeLoan(id: number): Promise<void> {
  try {
    await supabase
      .from('employee_loans')
      .delete()
      .eq('id', id);
  } catch (e) {}

  try {
    await supabase
      .from('complaints')
      .delete()
      .eq('id', id);
  } catch (e) {}

  try {
    const raw = localStorage.getItem('employee_loans');
    if (raw) {
      let list: EmployeeLoan[] = JSON.parse(raw);
      list = list.filter(l => l.id !== id);
      localStorage.setItem('employee_loans', JSON.stringify(list));
    }
  } catch (e) {}
}

// Record a monthly loan payment
export async function recordLoanPayment(id: number, amount: number, loan: EmployeeLoan): Promise<EmployeeLoan> {
  const newRepaid = (loan.total_repaid || 0) + amount;
  const newRemaining = Math.max(0, loan.loan_amount - newRepaid);
  const newStatus: EmployeeLoan['status'] = newRemaining <= 0 ? 'Completed' : 'Approved';

  return updateEmployeeLoan(id, {
    total_repaid: parseFloat(newRepaid.toFixed(2)),
    remaining_balance: parseFloat(newRemaining.toFixed(2)),
    last_payment_date: new Date().toISOString(),
    status: newStatus
  });
}

// Skip loan deduction for the current month
export async function skipLoanMonth(id: number, loan: EmployeeLoan): Promise<EmployeeLoan> {
  const newSkipped = (loan.months_skipped || 0) + 1;
  let newEndDate = loan.end_date;
  if (newEndDate) {
    const d = new Date(newEndDate);
    d.setMonth(d.getMonth() + 1);
    newEndDate = d.toISOString();
  }

  return updateEmployeeLoan(id, {
    months_skipped: newSkipped,
    end_date: newEndDate
  });
}

