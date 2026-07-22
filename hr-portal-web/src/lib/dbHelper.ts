import { supabase } from './supabase';
import type { RawLog, LeaveRequest, EmployeeProfile } from '../utils/attendanceProcessor';
import { matchPin } from '../utils/attendanceProcessor';

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

// Fetch a single profile by user ID
export async function getProfileById(id: string): Promise<EmployeeProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) throw error;
  return data as EmployeeProfile;
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
    const { data } = await supabase
      .from('leave_balances')
      .upsert(payload, { onConflict: 'employee_id' })
      .select()
      .single();
    if (data) return data;
  } catch (err) {
    /* If RLS prevents upsert by employee role, return computed payload */
  }

  return payload;
}

// Fetch leave balances from Supabase (auto-syncing if employeeId provided)
export async function getLeaveBalances(employeeId?: string): Promise<any[]> {
  try {
    if (employeeId) {
      const synced = await syncEmployeeLeaveBalances(employeeId);
      return [synced];
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

// Update an employee's leave balance in Supabase (upserting if not existing)
export async function updateLeaveBalance(employeeId: string, balance: any): Promise<void> {
  const { error } = await supabase
    .from('leave_balances')
    .upsert({ ...balance, employee_id: employeeId }, { onConflict: 'employee_id' });
    
  if (error) throw error;
  await syncEmployeeLeaveBalances(employeeId);
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
  if (employeeId) {
    query.eq('employee_id', employeeId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as LeaveRequest[];
}

// Create a new leave request in Supabase
export async function createLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status'>): Promise<LeaveRequest> {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      ...request,
      status: 'Pending'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as LeaveRequest;
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
  const { data: leave } = await supabase
    .from('leave_requests')
    .select('employee_id')
    .eq('id', requestId)
    .maybeSingle();

  const { error } = await supabase
    .from('leave_requests')
    .delete()
    .eq('id', requestId);

  if (error) throw error;

  if (leave && leave.employee_id) {
    await syncEmployeeLeaveBalances(leave.employee_id);
  }
}

// Fetch raw logs from Supabase (optionally filtered by employee pin, paginating to fetch ALL logs)
export async function getRawLogs(employeePin?: string): Promise<RawLog[]> {
  let allLogs: RawLog[] = [];
  let from = 0;
  const step = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('raw_attendance_logs')
      .select('*')
      .range(from, from + step - 1);

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
  target_type: 'designation' | 'department' | 'employee';
  target_id: string;
  target_name: string;
  start_time: string;
  end_time: string;
  grace_mins?: number;
  days: string[];
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

// Fetch Shift Timings
export async function getShiftTimings(): Promise<ShiftTiming[]> {
  const { data, error } = await supabase
    .from('shift_timings')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data as ShiftTiming[];
}

// Save Shift Timing (Create/Update)
export async function saveShiftTiming(timing: ShiftTiming): Promise<ShiftTiming> {
  const { data, error } = await supabase
    .from('shift_timings')
    .upsert(timing)
    .select()
    .single();
    
  if (error) throw error;
  return data as ShiftTiming;
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
  status: 'Open' | 'In Progress' | 'Resolved';
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

// Fetch complaints from Supabase
export async function getComplaints(employeeId?: string): Promise<Complaint[]> {
  let query = supabase.from('complaints').select('*').order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  const list = (data || []) as Complaint[];
  if (employeeId) {
    return list.filter(c => matchPin(c.employee_id, employeeId));
  }
  return list;
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
export async function getNotifications(userId: string, isAdmin: boolean = false): Promise<Notification[]> {
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (!isAdmin) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as Notification[];
}

// Create a notification
export async function createNotification(notification: Omit<Notification, 'id' | 'is_read'>): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      ...notification,
      is_read: false
    })
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
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
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .or(`user_id.eq.${userId},user_id.is.null`);

  if (error) throw error;
}

// --- HOLIDAYS ---

export interface Holiday {
  id?: number;
  date: string;
  title: string;
  description?: string;
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
  updated_at?: string;
}

// Fetch device settings from Supabase (with fallback if table is missing)
export async function getDeviceSettings(): Promise<DeviceSettings> {
  try {
    const { data, error } = await supabase
      .from('device_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;
    return data as DeviceSettings;
  } catch (err) {
    // Graceful fallback during setup if table/row does not exist yet
    return {
      id: 1,
      ip_address: '192.168.1.201',
      port: 4370,
      sync_interval: 1,
      status: 'Offline',
      last_connection_state: 'Unknown',
      grace_time_mins: 20,
      monthly_grace_settings: {}
    };
  }
}

// Update device settings in Supabase
export async function updateDeviceSettings(settings: Omit<DeviceSettings, 'id' | 'updated_at'>): Promise<void> {
  const { error } = await supabase
    .from('device_settings')
    .update(settings)
    .eq('id', 1);

  if (error) throw error;
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
  try {
    const { data, error } = await supabase
      .from('purpose_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('relation "public.purpose_transfers" does not exist')) {
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('Error fetching purpose transfers:', err);
    return [];
  }
}

// Record a new purpose/charity transfer
export async function createPurposeTransfer(transfer: PurposeTransfer): Promise<PurposeTransfer> {
  const { data, error } = await supabase
    .from('purpose_transfers')
    .insert([transfer])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete a purpose/charity transfer record
export async function deletePurposeTransfer(id: number): Promise<void> {
  const { error } = await supabase
    .from('purpose_transfers')
    .delete()
    .eq('id', id);

  if (error) throw error;
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
  created_at?: string;
  updated_at?: string;
}

// Fetch employee loans (with local storage fallback)
export async function getEmployeeLoans(employeeId?: string): Promise<EmployeeLoan[]> {
  let allLoans: EmployeeLoan[] = [];
  try {
    const { data, error } = await supabase
      .from('employee_loans')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      allLoans = data as EmployeeLoan[];
    }
  } catch (e) {
    /* fallback to localStorage */
  }

  try {
    const raw = localStorage.getItem('employee_loans');
    if (raw) {
      const parsed: EmployeeLoan[] = JSON.parse(raw);
      parsed.forEach(c => {
        if (!allLoans.some(x => x.id === c.id || (x.employee_id === c.employee_id && x.created_at === c.created_at))) {
          allLoans.push(c);
        }
      });
    }
  } catch (e) {}

  if (employeeId) {
    return allLoans.filter(l => matchPin(l.employee_id, employeeId) || matchPin(l.employee_pin, employeeId));
  }

  return allLoans;
}

// Create a loan request
export async function createEmployeeLoan(loan: Omit<EmployeeLoan, 'id' | 'created_at' | 'updated_at'>): Promise<EmployeeLoan> {
  let createdLoan: EmployeeLoan = {
    ...loan,
    id: Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('employee_loans')
      .insert([loan])
      .select()
      .single();

    if (!error && data) {
      createdLoan = data as EmployeeLoan;
    }
  } catch (e) {}

  // Sync to localStorage
  try {
    const raw = localStorage.getItem('employee_loans');
    const list: EmployeeLoan[] = raw ? JSON.parse(raw) : [];
    list.unshift(createdLoan);
    localStorage.setItem('employee_loans', JSON.stringify(list));
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
    const raw = localStorage.getItem('employee_loans');
    if (raw) {
      let list: EmployeeLoan[] = JSON.parse(raw);
      list = list.filter(l => l.id !== id);
      localStorage.setItem('employee_loans', JSON.stringify(list));
    }
  } catch (e) {}
}


