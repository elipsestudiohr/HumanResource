-- ============================================================================
-- SQL MIGRATION: SECURE CREDENTIALS AND PROFILES LOCKDOWN
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

-- 2. Never store Admin passwords in public.profiles!
-- Clear any existing Admin plaintext passwords in public.profiles table
UPDATE public.profiles SET password = NULL WHERE role = 'admin';

-- 3. Create the Public Profiles view for safe, non-sensitive metadata access
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

-- 4. Update save_employee_user RPC to NEVER store plaintext password for Admin roles
CREATE OR REPLACE FUNCTION public.save_employee_user(
  id_val uuid DEFAULT NULL,
  email_val text DEFAULT '',
  password_val text DEFAULT '',
  pin_val text DEFAULT '',
  name_val text DEFAULT '',
  designation_val text DEFAULT '',
  department_val text DEFAULT '',
  salary_val numeric DEFAULT 0,
  hourly_val numeric DEFAULT 0,
  dob_val date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_id uuid;
  user_role text;
BEGIN
  IF id_val IS NOT NULL THEN
    -- Get current role
    SELECT role INTO user_role FROM public.profiles WHERE id = id_val;

    -- UPDATE existing profile metadata
    UPDATE public.profiles SET
      pin = pin_val,
      full_name = name_val,
      designation = designation_val,
      department = department_val,
      base_salary = salary_val,
      hourly_rate = hourly_val,
      date_of_birth = dob_val
    WHERE id = id_val;

    -- Update auth email if changed
    IF email_val IS NOT NULL AND email_val != '' THEN
      UPDATE auth.users SET email = email_val WHERE id = id_val;
    END IF;

    -- Update auth password if provided
    IF password_val IS NOT NULL AND password_val != '' THEN
      UPDATE auth.users SET encrypted_password = crypt(password_val, gen_salt('bf'))
      WHERE id = id_val;
    END IF;

    -- Store plaintext password reference in profiles ONLY for non-admin employees
    IF password_val IS NOT NULL AND password_val != '' AND (user_role IS NULL OR user_role != 'admin') THEN
      UPDATE public.profiles SET password = password_val WHERE id = id_val;
    ELSE
      -- Clear password column if role is admin
      IF user_role = 'admin' THEN
        UPDATE public.profiles SET password = NULL WHERE id = id_val;
      END IF;
    END IF;

    IF email_val IS NOT NULL AND email_val != '' THEN
      UPDATE public.profiles SET email = email_val WHERE id = id_val;
    END IF;

    target_id := id_val;
  ELSE
    -- CREATE new employee
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      email_val, crypt(password_val, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}', '{"role":"employee"}',
      now(), now(), '', '', '', ''
    ) RETURNING id INTO target_id;

    -- Update the created public profile
    UPDATE public.profiles SET
      pin = pin_val,
      full_name = name_val,
      designation = designation_val,
      department = department_val,
      base_salary = salary_val,
      hourly_rate = hourly_val,
      date_of_birth = dob_val,
      email = email_val,
      password = password_val,
      role = 'employee'
    WHERE id = target_id;
  END IF;

  RETURN target_id;
END;
$$;

-- 5. Enable RLS on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Clean up any existing unsafe or recursive policies
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employees can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile details" ON public.profiles;

-- 7. Strict Row-Level Security (RLS) Policies on public.profiles:

-- A. Admins have FULL access (SELECT, INSERT, UPDATE, DELETE) to all profiles
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
