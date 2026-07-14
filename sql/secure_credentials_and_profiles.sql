-- ============================================================================
-- SQL MIGRATION: SECURE CREDENTIALS AND PROFILES ROW-LEVEL SECURITY (RLS)
-- Run this script in your Supabase SQL Editor.
-- ============================================================================

-- 1. Create a Security Definer helper to safely check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Public Profiles view for safe, non-sensitive metadata access
-- (Allows employee directory/calendar/announcements without exposing credentials)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  pin,
  full_name,
  department,
  designation,
  role,
  date_of_birth,
  is_active
FROM public.profiles
WHERE is_active = true;

-- Grant permissions on the view to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- 3. Enable RLS on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing unsafe or recursive policies
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employees can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile details" ON public.profiles;

-- 5. Strict Row-Level Security (RLS) Policies on public.profiles:

-- A. Admins have FULL access (SELECT, INSERT, UPDATE, DELETE) to all profiles and credentials
CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- B. Non-admin Employees can ONLY SELECT their own individual profile row
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- C. Non-admin Employees can ONLY UPDATE their own individual profile row
CREATE POLICY "Users can update their own profile details" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
