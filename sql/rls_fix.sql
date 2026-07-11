-- Fix Infinite Recursion in public.profiles RLS Policies

-- 1. Create a security definer function to check if a user is an admin
-- A security definer function runs with database owner privileges, bypassing RLS checks inside the subquery and preventing recursion.
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- 2. Drop the recursive admin policies
drop policy if exists "Admins can manage all profiles" on public.profiles;
drop policy if exists "Admins can view raw logs" on public.raw_attendance_logs;
drop policy if exists "Admins can manage raw logs" on public.raw_attendance_logs;
drop policy if exists "Admins can manage all summaries" on public.attendance_summaries;
drop policy if exists "Admins can manage all balances" on public.leave_balances;
drop policy if exists "Admins can manage all leave requests" on public.leave_requests;
drop policy if exists "Admins can manage all overtime records" on public.overtime_records;

-- 3. Re-create the admin policies using the is_admin() function
create policy "Admins can manage all profiles" on public.profiles
  for all using (public.is_admin());

create policy "Admins can manage raw logs" on public.raw_attendance_logs
  for all using (public.is_admin());

create policy "Admins can manage all summaries" on public.attendance_summaries
  for all using (public.is_admin());

create policy "Admins can manage all balances" on public.leave_balances
  for all using (public.is_admin());

create policy "Admins can manage all leave requests" on public.leave_requests
  for all using (public.is_admin());

create policy "Admins can manage all overtime records" on public.overtime_records
  for all using (public.is_admin());
