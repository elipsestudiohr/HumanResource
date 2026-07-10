-- ============================================================================
-- SQL SCRIPT: Fixes Row-Level Security (RLS) policies for metadata tables.
-- Run this in your Supabase SQL Editor to resolve the RLS violation error.
-- ============================================================================

-- 1. Enable RLS on metadata tables (if not already enabled)
alter table public.departments enable row level security;
alter table public.designations enable row level security;
alter table public.shift_timings enable row level security;

-- 2. Drop existing policies if any
drop policy if exists "Allow all operations for departments" on public.departments;
drop policy if exists "Allow all operations for designations" on public.designations;
drop policy if exists "Allow all operations for shift_timings" on public.shift_timings;

-- 3. Create permissive policies to allow selects and inserts
create policy "Allow all operations for departments" 
  on public.departments 
  for all 
  using (true) 
  with check (true);

create policy "Allow all operations for designations" 
  on public.designations 
  for all 
  using (true) 
  with check (true);

create policy "Allow all operations for shift_timings" 
  on public.shift_timings 
  for all 
  using (true) 
  with check (true);
