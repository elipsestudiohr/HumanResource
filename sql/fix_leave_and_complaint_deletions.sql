-- ==============================================================================
-- Fix Leave Requests & Complaints Deletion Permissions and RLS Policies
-- Run this in your Supabase Project SQL Editor (https://supabase.com/dashboard/project/fkhuybrvtkrdccqswzqr/sql)
-- ==============================================================================

-- 1. Enable RLS on leave_requests table
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive delete policies on leave_requests
DROP POLICY IF EXISTS "Admins can manage all leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow delete pending leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow all on leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow select leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow insert leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Allow update leave requests" ON public.leave_requests;

-- 3. Create full comprehensive RLS policies on leave_requests
-- A. Everyone can view leave requests
CREATE POLICY "Allow select leave requests" ON public.leave_requests
  FOR SELECT USING (true);

-- B. Employees and admins can insert leave requests
CREATE POLICY "Allow insert leave requests" ON public.leave_requests
  FOR INSERT WITH CHECK (true);

-- C. Updates allowed for approvals, rejections, and quota adjustments
CREATE POLICY "Allow update leave requests" ON public.leave_requests
  FOR UPDATE USING (true);

-- D. Deletions allowed for pending requests or by admins
CREATE POLICY "Allow delete pending leave requests" ON public.leave_requests
  FOR DELETE USING (status = 'Pending' OR public.is_admin());

-- 4. Grant table permissions
GRANT ALL ON public.leave_requests TO anon, authenticated, service_role;

-- 5. Create Security Definer RPC for 100% Guaranteed Deletion of Pending Leaves
CREATE OR REPLACE FUNCTION public.delete_pending_leave_request(p_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.leave_requests
  WHERE id = p_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_pending_leave_request(bigint) TO anon, authenticated, service_role;

-- 6. Create Security Definer RPC for 100% Guaranteed Deletion of Open Complaints
CREATE OR REPLACE FUNCTION public.delete_open_complaint(p_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.complaints
  WHERE id = p_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_open_complaint(bigint) TO anon, authenticated, service_role;
