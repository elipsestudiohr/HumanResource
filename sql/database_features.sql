-- ============================================================================
-- SQL SCRIPT: Adds complaints, announcements, and notifications tables.
-- Run this in your Supabase SQL Editor.
-- ============================================================================

-- 1. Complaints Table (technical helpdesk issues)
create table if not exists public.complaints (
  id bigint generated always as identity primary key,
  employee_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  status text check (status in ('Open', 'In Progress', 'Resolved')) default 'Open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Announcements Table (broadcasts from HR)
create table if not exists public.announcements (
  id bigint generated always as identity primary key,
  title text not null,
  message text not null,
  target_type text check (target_type in ('all', 'department', 'designation')) default 'all',
  target_value text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Notifications Table (in-app notifications center)
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade, -- NULL means broadcast to all employees
  title text not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Enable select, insert, update, delete for all authenticated users
grant select, insert, update, delete on public.complaints to anon, authenticated, service_role;
grant select, insert, update, delete on public.announcements to anon, authenticated, service_role;
grant select, insert, update, delete on public.notifications to anon, authenticated, service_role;

-- 5. Enable RLS and define policies
alter table public.complaints enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Allow all operations for complaints" on public.complaints;
create policy "Allow all operations for complaints" on public.complaints for all using (true) with check (true);

drop policy if exists "Allow all operations for announcements" on public.announcements;
create policy "Allow all operations for announcements" on public.announcements for all using (true) with check (true);

drop policy if exists "Allow all operations for notifications" on public.notifications;
create policy "Allow all operations for notifications" on public.notifications for all using (true) with check (true);
