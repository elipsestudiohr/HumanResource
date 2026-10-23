-- SQL Migration: Create WFH Punches Table for Work From Home Attendance
-- Tracks employee remote punches (Check In, Break intervals, Check Out) with Admin approval workflow

CREATE TABLE IF NOT EXISTS public.wfh_punches (
  id text PRIMARY KEY,
  employee_id text NOT NULL,
  employee_pin text NOT NULL,
  employee_name text,
  department text,
  designation text,
  date date NOT NULL,
  check_in text,
  check_out text,
  check_in_raw timestamp with time zone,
  check_out_raw timestamp with time zone,
  breaks jsonb DEFAULT '[]'::jsonb,
  total_break_mins numeric DEFAULT 0,
  effective_break_mins numeric DEFAULT 0,
  excess_break_mins numeric DEFAULT 0,
  working_hours_target numeric DEFAULT 9,
  allowed_break_mins numeric DEFAULT 60,
  total_working_mins numeric DEFAULT 0,
  check_in_status text DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  check_out_status text DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  status text DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  approved_by text,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wfh_punches_emp_date ON public.wfh_punches(employee_pin, date);
CREATE INDEX IF NOT EXISTS idx_wfh_punches_status ON public.wfh_punches(status);
CREATE INDEX IF NOT EXISTS idx_wfh_punches_check_in_status ON public.wfh_punches(check_in_status);
CREATE INDEX IF NOT EXISTS idx_wfh_punches_check_out_status ON public.wfh_punches(check_out_status);

-- Enable Realtime if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wfh_punches;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
