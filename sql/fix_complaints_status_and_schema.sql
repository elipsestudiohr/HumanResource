-- ==============================================================================
-- Fix Complaints Status Check Constraint, Schema & Permissions
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fkhuybrvtkrdccqswzqr/sql
-- ==============================================================================

-- 1. Ensure resolution column exists on complaints table
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS resolution text;

-- 2. Drop any existing status check constraint on complaints table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.complaints'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- 3. Add updated status check constraint allowing all valid statuses:
-- 'Open', 'In Progress', 'Resolved', 'Ignored', 'Rejected', 'Approved', 'Closed'
ALTER TABLE public.complaints 
  ADD CONSTRAINT complaints_status_check 
  CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Ignored', 'Rejected', 'Approved', 'Closed'));

-- 4. Set default status to 'Open' if not set
ALTER TABLE public.complaints 
  ALTER COLUMN status SET DEFAULT 'Open';

-- 5. Enable RLS and create comprehensive, reliable policies
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for complaints" ON public.complaints;
DROP POLICY IF EXISTS "complaints_policy" ON public.complaints;
DROP POLICY IF EXISTS "Allow all access to complaints" ON public.complaints;
DROP POLICY IF EXISTS "complaints_select" ON public.complaints;
DROP POLICY IF EXISTS "complaints_insert" ON public.complaints;
DROP POLICY IF EXISTS "complaints_update" ON public.complaints;
DROP POLICY IF EXISTS "complaints_delete" ON public.complaints;

CREATE POLICY "complaints_select" ON public.complaints 
  FOR SELECT TO anon, authenticated, service_role 
  USING (true);

CREATE POLICY "complaints_insert" ON public.complaints 
  FOR INSERT TO anon, authenticated, service_role 
  WITH CHECK (true);

CREATE POLICY "complaints_update" ON public.complaints 
  FOR UPDATE TO anon, authenticated, service_role 
  USING (true);

CREATE POLICY "complaints_delete" ON public.complaints 
  FOR DELETE TO anon, authenticated, service_role 
  USING (true);

-- 6. Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO anon, authenticated, service_role;

-- 7. Create Security Definer RPC for 100% Guaranteed Status Updates
CREATE OR REPLACE FUNCTION public.update_complaint_status(
  p_id bigint, 
  p_status text, 
  p_resolution text DEFAULT NULL
)
RETURNS public.complaints
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_row public.complaints;
BEGIN
  IF p_resolution IS NOT NULL THEN
    UPDATE public.complaints
    SET status = p_status,
        resolution = p_resolution
    WHERE id = p_id
    RETURNING * INTO v_updated_row;
  ELSE
    UPDATE public.complaints
    SET status = p_status
    WHERE id = p_id
    RETURNING * INTO v_updated_row;
  END IF;

  RETURN v_updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_complaint_status(bigint, text, text) TO anon, authenticated, service_role;
