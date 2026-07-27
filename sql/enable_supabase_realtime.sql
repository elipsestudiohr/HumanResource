-- =========================================================
-- Enable Supabase Realtime (CDC) Replication on ALL Tables
-- =========================================================

-- Execute this script in Supabase SQL Editor to enable instant
-- WebSocket change data capture (CDC) on all 19 database tables.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.approved_attendance_corrections;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_summaries;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.departments;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.designations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.device_settings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_loans;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.holidays;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_balances;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.overtime_records;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.purpose_transfers;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.raw_attendance_logs;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_timings;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.trusted_devices;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Publication alter completed or table already exists in publication.';
END $$;
