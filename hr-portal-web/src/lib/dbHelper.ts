import { supabase } from './supabase';
import type { RawLog, LeaveRequest, EmployeeProfile } from '../utils/attendanceProcessor';

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

// Fetch leave balances from Supabase
export async function getLeaveBalances(employeeId?: string): Promise<any[]> {
  const query = supabase.from('leave_balances').select('*');
  if (employeeId) {
    query.eq('employee_id', employeeId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Update an employee's leave balance in Supabase
export async function updateLeaveBalance(employeeId: string, balance: any): Promise<void> {
  const { error } = await supabase
    .from('leave_balances')
    .update(balance)
    .eq('employee_id', employeeId);
    
  if (error) throw error;
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

  // Deduct from leave balance if approved
  if (status === 'Approved' && leave) {
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const { data: balance, error: balError } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', leave.employee_id)
      .single();
      
    if (!balError && balance) {
      const updatedBalance: any = {};
      const actualType = newLeaveType || leave.leave_type;
      if (actualType === 'Casual') {
        updatedBalance.casual_used = balance.casual_used + diffDays;
      } else if (actualType === 'Medical') {
        updatedBalance.medical_used = balance.medical_used + diffDays;
      } else if (actualType === 'Annual') {
        updatedBalance.annual_used = balance.annual_used + diffDays;
      }
      
      await supabase
        .from('leave_balances')
        .update(updatedBalance)
        .eq('employee_id', leave.employee_id);
    }
  }
}

// Fetch raw logs from Supabase (optionally filtered by employee pin)
export async function getRawLogs(employeePin?: string): Promise<RawLog[]> {
  let query = supabase.from('raw_attendance_logs').select('*');
  if (employeePin) {
    query = query.eq('employee_pin', employeePin);
  }
  const { data, error } = await query;
    
  if (error) throw error;
  return data as RawLog[];
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
  const query = supabase.from('complaints').select('*').order('created_at', { ascending: false });
  if (employeeId) {
    query.eq('employee_id', employeeId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as Complaint[];
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

// Update complaint status
export async function updateComplaintStatus(id: number, status: 'Open' | 'In Progress' | 'Resolved'): Promise<void> {
  const { error } = await supabase
    .from('complaints')
    .update({ status })
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
  try {
    let query = supabase.from('approved_attendance_corrections').select('*');
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    const { data, error } = await query;
    if (!error && data) {
      return data as ApprovedCorrection[];
    }
  } catch (e) {
    /* fallback to localStorage */
  }

  try {
    const raw = localStorage.getItem('approved_attendance_corrections');
    if (raw) {
      const parsed: ApprovedCorrection[] = JSON.parse(raw);
      if (employeeId) {
        return parsed.filter(c => c.employee_id === employeeId);
      }
      return parsed;
    }
  } catch (e) {}

  return [];
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


