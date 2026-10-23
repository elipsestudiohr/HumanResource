-- Fix RLS on wfh_punches table: Add open access policies for anon client
-- Run this in Supabase Dashboard > SQL Editor

-- Option A: Disable RLS entirely (simplest, matches other tables like raw_attendance_logs)
ALTER TABLE public.wfh_punches DISABLE ROW LEVEL SECURITY;

-- Option B (alternative): If you prefer to keep RLS enabled, add permissive policies instead:
-- Uncomment below and comment out the DISABLE line above if preferred.

-- CREATE POLICY "Allow all select on wfh_punches" ON public.wfh_punches
--   FOR SELECT USING (true);
-- 
-- CREATE POLICY "Allow all insert on wfh_punches" ON public.wfh_punches
--   FOR INSERT WITH CHECK (true);
-- 
-- CREATE POLICY "Allow all update on wfh_punches" ON public.wfh_punches
--   FOR UPDATE USING (true) WITH CHECK (true);
-- 
-- CREATE POLICY "Allow all delete on wfh_punches" ON public.wfh_punches
--   FOR DELETE USING (true);
