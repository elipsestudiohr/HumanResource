-- ============================================================================
-- COMPLETE DATABASE SETUP SCRIPT
-- Run this ONCE in your Supabase SQL Editor to create all required tables.
-- This script is idempotent (safe to re-run).
-- ============================================================================

-- ============================================================
-- 1. Complaints Table (technical helpdesk issues)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.complaints (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status text CHECK (status IN ('Open', 'In Progress', 'Resolved')) DEFAULT 'Open',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for complaints" ON public.complaints;
CREATE POLICY "Allow all operations for complaints" ON public.complaints FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO anon, authenticated, service_role;

-- ============================================================
-- 2. Announcements Table (broadcasts from HR)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  target_type text CHECK (target_type IN ('all', 'department', 'designation')) DEFAULT 'all',
  target_value text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for announcements" ON public.announcements;
CREATE POLICY "Allow all operations for announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO anon, authenticated, service_role;

-- ============================================================
-- 3. Notifications Table (in-app notifications center)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for notifications" ON public.notifications;
CREATE POLICY "Allow all operations for notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated, service_role;

-- ============================================================
-- 4. Holidays Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.holidays (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date date NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations for holidays" ON public.holidays;
CREATE POLICY "Allow all operations for holidays" ON public.holidays FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO anon, authenticated, service_role;

-- ============================================================
-- 5. Add date_of_birth column to profiles (if not exists)
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- ============================================================
-- 6. Enable Realtime for notifications (for toast alerts)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- DONE! All tables are now created and ready.
-- ============================================================
