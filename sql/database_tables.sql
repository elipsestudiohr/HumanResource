-- ============================================================================
-- SQL SCRIPT: Creates departments, designations, and shift_timings tables.
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- 1. Create Departments Table
create table if not exists public.departments (
  id bigint generated always as identity primary key,
  name text unique not null
);

-- 2. Create Designations Table
create table if not exists public.designations (
  id bigint generated always as identity primary key,
  name text unique not null
);

-- 3. Create Shift Timings Table
create table if not exists public.shift_timings (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('designation', 'department', 'employee')),
  target_id text not null, -- Designation Name, Department Name, or Employee Profile UUID
  target_name text not null, -- Human-readable name for display
  start_time time not null,
  end_time time not null,
  days text[] not null, -- array of days, e.g. ['Monday', 'Tuesday']
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

grant select, insert, update, delete on public.departments to anon, authenticated, service_role;
grant select, insert, update, delete on public.designations to anon, authenticated, service_role;
grant select, insert, update, delete on public.shift_timings to anon, authenticated, service_role;

-- 4b. Enable RLS and define permissive policies to prevent Supabase default-lockout
alter table public.departments enable row level security;
alter table public.designations enable row level security;
alter table public.shift_timings enable row level security;

drop policy if exists "Allow all operations for departments" on public.departments;
create policy "Allow all operations for departments" on public.departments for all using (true) with check (true);

drop policy if exists "Allow all operations for designations" on public.designations;
create policy "Allow all operations for designations" on public.designations for all using (true) with check (true);

drop policy if exists "Allow all operations for shift_timings" on public.shift_timings;
create policy "Allow all operations for shift_timings" on public.shift_timings for all using (true) with check (true);

-- 5. Pre-populate default values
insert into public.departments (name) values 
  ('Technology'), 
  ('Human Resources'), 
  ('Administration'), 
  ('Sales'), 
  ('Finance'),
  ('Marketing'),
  ('Operations')
on conflict (name) do nothing;

insert into public.designations (name) values 
  ('Senior Developer'), 
  ('Junior Developer'), 
  ('HR Specialist'), 
  ('HR Manager'), 
  ('Administrator'), 
  ('Sales Executive'), 
  ('Finance Officer'),
  ('Project Manager'),
  ('QA Lead')
on conflict (name) do nothing;
