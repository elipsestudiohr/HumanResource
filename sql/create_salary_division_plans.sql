-- ============================================================================
-- CREATE SALARY DIVISION PLANS TABLE
-- Run this in your Supabase SQL Editor to create the dedicated table.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.salary_division_plans (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  month_key text UNIQUE NOT NULL, -- e.g. '2026-08'
  division_count integer NOT NULL DEFAULT 2,
  divisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.salary_division_plans ENABLE ROW LEVEL SECURITY;

-- Create Open Access Policy
DROP POLICY IF EXISTS "Allow all operations for salary_division_plans" ON public.salary_division_plans;
CREATE POLICY "Allow all operations for salary_division_plans" ON public.salary_division_plans FOR ALL USING (true) WITH CHECK (true);

-- Grant Table Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_division_plans TO anon, authenticated, service_role;
