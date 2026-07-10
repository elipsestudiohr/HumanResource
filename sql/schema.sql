-- Database Schema for HR Portal

-- Enable Row Level Security (RLS)
-- Drop existing triggers and tables if they exist to allow clean installations
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop table if exists public.overtime_records cascade;
drop table if exists public.leave_requests cascade;
drop table if exists public.leave_balances cascade;
drop table if exists public.raw_attendance_logs cascade;
drop table if exists public.attendance_summaries cascade;
drop table if exists public.profiles cascade;

-- 1. Profiles Table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  pin text unique, -- ZKTeco K40 Attendance Machine ID / PIN
  full_name text not null,
  designation text,
  department text,
  joining_date date default current_date,
  base_salary numeric(12, 2) default 0.00,
  hourly_rate numeric(10, 2) default 0.00,
  role text default 'employee' check (role in ('admin', 'employee')),
  contact_number text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Raw Attendance Logs Table (where ZKTeco K40 pushes data)
create table public.raw_attendance_logs (
  id bigint generated always as identity primary key,
  employee_pin text not null,
  timestamp timestamp with time zone not null,
  verify_type integer default 0, -- 1 for fingerprint, 4 for card, etc.
  status_type integer default 0, -- 0 for check-in, 1 for check-out (or auto)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_pin_timestamp unique (employee_pin, timestamp)
);

-- Index for faster queries on raw logs
create index idx_raw_logs_pin_timestamp on public.raw_attendance_logs(employee_pin, timestamp);

-- 3. Daily Attendance Summaries Table (processed attendance reports)
create table public.attendance_summaries (
  id bigint generated always as identity primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  check_in time,
  check_out time,
  working_hours numeric(5, 2) default 0.00,
  overtime_hours numeric(5, 2) default 0.00,
  is_late boolean default false,
  is_absent boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_employee_date unique (employee_id, date)
);

-- 4. Leave Balances Table
create table public.leave_balances (
  id bigint generated always as identity primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null unique,
  casual_total integer default 10,
  casual_used integer default 0,
  medical_total integer default 10,
  medical_used integer default 0,
  annual_total integer default 10,
  annual_used integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Leave Requests Table
create table public.leave_requests (
  id bigint generated always as identity primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  start_date date not null,
  end_date date not null,
  leave_type text check (leave_type in ('Casual', 'Medical', 'Annual')) not null,
  status text check (status in ('Pending', 'Approved', 'Rejected')) default 'Pending' not null,
  reason text,
  requested_at timestamp with time zone default timezone('utc'::text, now()) not null,
  approved_by uuid references public.profiles(id)
);

-- 6. Overtime Records Table
create table public.overtime_records (
  id bigint generated always as identity primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  hours numeric(5, 2) not null,
  rate_applied numeric(10, 2) not null,
  calculated_payout numeric(12, 2) not null,
  is_paid boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_employee_overtime_date unique (employee_id, date)
);

-- --- Row Level Security (RLS) Policies ---

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.raw_attendance_logs enable row level security;
alter table public.attendance_summaries enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.overtime_records enable row level security;

-- Profiles Policies
create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can manage all profiles" on public.profiles
  for all using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Raw Attendance Logs Policies (Sync agent has service_role so it bypasses RLS)
create policy "Admins can view raw logs" on public.raw_attendance_logs
  for select using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Attendance Summaries Policies
create policy "Users can view their own summaries" on public.attendance_summaries
  for select using (auth.uid() = employee_id);

create policy "Admins can manage all summaries" on public.attendance_summaries
  for all using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Leave Balances Policies
create policy "Users can view their own balance" on public.leave_balances
  for select using (auth.uid() = employee_id);

create policy "Admins can manage all balances" on public.leave_balances
  for all using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Leave Requests Policies
create policy "Users can view their own leave requests" on public.leave_requests
  for select using (auth.uid() = employee_id);

create policy "Users can submit their own leave requests" on public.leave_requests
  for insert with check (auth.uid() = employee_id);

create policy "Admins can manage all leave requests" on public.leave_requests
  for all using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Overtime Records Policies
create policy "Users can view their own overtime records" on public.overtime_records
  for select using (auth.uid() = employee_id);

create policy "Admins can manage all overtime records" on public.overtime_records
  for all using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );


-- --- Triggers for Automated User Provisioning ---

-- Trigger function to create profile and leave balances automatically when auth.users is created
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_role text := 'employee';
  user_pin text;
begin
  -- Check if metadata specifies role or pin, else set defaults
  default_role := coalesce(new.raw_user_meta_data->>'role', 'employee');
  user_pin := new.raw_user_meta_data->>'pin';

  insert into public.profiles (id, pin, full_name, designation, department, base_salary, hourly_rate, role, contact_number, is_active)
  values (
    new.id,
    user_pin,
    coalesce(new.raw_user_meta_data->>'full_name', 'Employee'),
    new.raw_user_meta_data->>'designation',
    new.raw_user_meta_data->>'department',
    coalesce((new.raw_user_meta_data->>'base_salary')::numeric, 0.00),
    coalesce((new.raw_user_meta_data->>'hourly_rate')::numeric, 0.00),
    default_role,
    new.raw_user_meta_data->>'contact_number',
    true
  );

  insert into public.leave_balances (employee_id, casual_total, casual_used, medical_total, medical_used, annual_total, annual_used)
  values (new.id, 10, 0, 10, 0, 10, 0);

  return new;
end;
$$ language plpgsql security definer;

-- Attach trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
