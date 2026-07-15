-- ============================================================================
-- SECURITY HARDENING MIGRATION
-- Removes plaintext password storage, secures RPC functions, fixes RLS policies
-- RUN THIS IN SUPABASE SQL EDITOR AFTER DEPLOYING THE FRONTEND CHANGES
-- ============================================================================

-- ============================================================
-- STEP 1: REMOVE PLAINTEXT PASSWORDS FROM PROFILES
-- ============================================================

-- Clear all plaintext passwords immediately
UPDATE public.profiles SET password = NULL WHERE password IS NOT NULL;

-- Drop the password column entirely (irreversible — this is intentional)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS password;

-- ============================================================
-- STEP 2: REWRITE save_employee_user WITH AUTH CHECKS
-- ============================================================

-- Drop existing versions
DROP FUNCTION IF EXISTS public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric);
DROP FUNCTION IF EXISTS public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric, text);

CREATE OR REPLACE FUNCTION public.save_employee_user(
  id_val uuid DEFAULT NULL,
  email_val text DEFAULT NULL,
  password_val text DEFAULT NULL,
  pin_val text DEFAULT NULL,
  name_val text DEFAULT NULL,
  designation_val text DEFAULT NULL,
  department_val text DEFAULT NULL,
  salary_val numeric DEFAULT NULL,
  hourly_val numeric DEFAULT NULL,
  dob_val text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_user_id uuid := id_val;
  calling_user_role text;
  encrypted_pw text;
  col_name text;
BEGIN
  -- AUTHORIZATION: Only authenticated admin users can call this function
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required. You must be logged in to perform this action.';
  END IF;

  SELECT role INTO calling_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF calling_user_role IS NULL OR calling_user_role != 'admin' THEN
    RAISE EXCEPTION 'Authorization denied. Only administrators can manage employee accounts.';
  END IF;

  -- INPUT VALIDATION
  IF email_val IS NULL OR email_val = '' THEN
    RAISE EXCEPTION 'Email address is required.';
  END IF;
  IF pin_val IS NULL OR pin_val = '' THEN
    RAISE EXCEPTION 'Employee PIN is required.';
  END IF;
  IF name_val IS NULL OR name_val = '' THEN
    RAISE EXCEPTION 'Employee name is required.';
  END IF;

  IF target_user_id IS NULL THEN
    -- ============ CREATE MODE ============

    -- Password required for new accounts
    IF password_val IS NULL OR length(password_val) < 12 THEN
      RAISE EXCEPTION 'Password must be at least 12 characters long.';
    END IF;

    -- Check duplicate email
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_val) THEN
      RAISE EXCEPTION 'An account with this email already exists.';
    END IF;

    -- Check duplicate PIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE pin = pin_val) THEN
      RAISE EXCEPTION 'An employee with ZKTeco PIN % already exists.', pin_val;
    END IF;

    target_user_id := gen_random_uuid();
    encrypted_pw := crypt(password_val, gen_salt('bf'));

    -- Insert into auth.users (password is HASHED, never stored in plaintext)
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', target_user_id, 'authenticated', 'authenticated',
      email_val, encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('role', 'employee'),
      now(), now()
    );

    -- Dynamic cleanup to prevent GoTrue scan crashes
    FOR col_name IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'users'
        AND data_type IN ('character varying', 'text')
        AND column_name != 'phone'
    LOOP
      EXECUTE format('UPDATE auth.users SET %I = '''' WHERE id = $1 AND %I IS NULL', col_name, col_name) USING target_user_id;
    END LOOP;

    FOR col_name IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'users'
        AND data_type = 'boolean'
    LOOP
      EXECUTE format('UPDATE auth.users SET %I = false WHERE id = $1 AND %I IS NULL', col_name, col_name) USING target_user_id;
    END LOOP;

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
    )
    VALUES (
      target_user_id,
      target_user_id,
      'email',
      target_user_id::text,
      jsonb_build_object('sub', target_user_id::text, 'email', email_val, 'email_verified', true),
      now(), now(), now()
    );

    -- Update identities email column if writable
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'identities'
        AND column_name = 'email'
        AND is_generated = 'NEVER'
    ) THEN
      EXECUTE 'UPDATE auth.identities SET email = $1 WHERE user_id = $2' USING email_val, target_user_id;
    END IF;

    -- Dynamic cleanup on auth.identities
    FOR col_name IN
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'identities'
        AND data_type IN ('character varying', 'text')
        AND is_generated = 'NEVER'
    LOOP
      EXECUTE format('UPDATE auth.identities SET %I = '''' WHERE user_id = $1 AND %I IS NULL', col_name, col_name) USING target_user_id;
    END LOOP;

  ELSE
    -- ============ UPDATE MODE ============

    -- Check duplicate PIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE pin = pin_val AND id != target_user_id) THEN
      RAISE EXCEPTION 'ZKTeco PIN % is already assigned to another employee.', pin_val;
    END IF;

    -- Update auth.users email
    UPDATE auth.users
    SET email = email_val, updated_at = now()
    WHERE id = target_user_id;

    -- Update auth.users password if provided (HASHED via bcrypt)
    IF password_val IS NOT NULL AND password_val != '' THEN
      IF length(password_val) < 12 THEN
        RAISE EXCEPTION 'Password must be at least 12 characters long.';
      END IF;
      UPDATE auth.users
      SET encrypted_password = crypt(password_val, gen_salt('bf')), updated_at = now()
      WHERE id = target_user_id;
    END IF;

    -- Update auth.identities email mapping
    UPDATE auth.identities
    SET identity_data = jsonb_build_object('sub', target_user_id::text, 'email', email_val, 'email_verified', true),
        updated_at = now()
    WHERE user_id = target_user_id;

    -- Update identities email column if writable
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'identities'
        AND column_name = 'email'
        AND is_generated = 'NEVER'
    ) THEN
      EXECUTE 'UPDATE auth.identities SET email = $1 WHERE user_id = $2' USING email_val, target_user_id;
    END IF;
  END IF;

  -- Upsert into public.profiles (NO password column — passwords only exist in auth.users)
  INSERT INTO public.profiles (
    id, pin, full_name, designation, department, base_salary, hourly_rate, email, role, is_active, joining_date, date_of_birth
  )
  VALUES (
    target_user_id, pin_val, name_val, designation_val, department_val, salary_val, hourly_val, email_val, 'employee', true, now()::date,
    CASE WHEN dob_val IS NOT NULL AND dob_val != '' THEN dob_val::date ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    pin = pin_val,
    full_name = name_val,
    designation = designation_val,
    department = department_val,
    base_salary = salary_val,
    hourly_rate = hourly_val,
    email = email_val,
    date_of_birth = CASE WHEN dob_val IS NOT NULL AND dob_val != '' THEN dob_val::date ELSE public.profiles.date_of_birth END;

  RETURN target_user_id;
END;
$$;

-- ============================================================
-- STEP 3: REWRITE delete_employee_user WITH AUTH CHECKS
-- ============================================================

DROP FUNCTION IF EXISTS public.delete_employee_user(uuid);

CREATE OR REPLACE FUNCTION public.delete_employee_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  calling_user_role text;
BEGIN
  -- AUTHORIZATION: Only authenticated admin users can delete employees
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT role INTO calling_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF calling_user_role IS NULL OR calling_user_role != 'admin' THEN
    RAISE EXCEPTION 'Authorization denied. Only administrators can delete employee accounts.';
  END IF;

  -- Prevent self-deletion
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own admin account.';
  END IF;

  -- Cascade delete (auth.users -> auth.identities -> profiles)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- ============================================================
-- STEP 4: REVOKE ANONYMOUS ACCESS — Only authenticated users
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.delete_employee_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_employee_user(uuid) TO authenticated, service_role;

-- ============================================================
-- STEP 5: FIX RLS POLICIES ON METADATA TABLES
-- ============================================================

-- Revoke direct table access from anon
REVOKE INSERT, UPDATE, DELETE ON public.complaints FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.announcements FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.notifications FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.holidays FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.departments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.designations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.shift_timings FROM anon;

-- Fix complaints: employees see only their own, admins see all
DROP POLICY IF EXISTS "complaints_policy" ON public.complaints;
DROP POLICY IF EXISTS "Allow all access to complaints" ON public.complaints;

CREATE POLICY "complaints_select" ON public.complaints FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "complaints_insert" ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (employee_id = auth.uid()::text);

CREATE POLICY "complaints_update" ON public.complaints FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Fix announcements: all authenticated can read, only admins can write
DROP POLICY IF EXISTS "announcements_policy" ON public.announcements;
DROP POLICY IF EXISTS "Allow all access to announcements" ON public.announcements;

CREATE POLICY "announcements_select" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "announcements_delete" ON public.announcements FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Fix notifications: users see their own + global, admins see all
DROP POLICY IF EXISTS "notifications_policy" ON public.notifications;
DROP POLICY IF EXISTS "Allow all access to notifications" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR user_id IS NULL
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text OR user_id IS NULL);

-- Fix holidays: all authenticated can read, only admins can write
DROP POLICY IF EXISTS "holidays_policy" ON public.holidays;
DROP POLICY IF EXISTS "Allow all access to holidays" ON public.holidays;

CREATE POLICY "holidays_select" ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "holidays_insert" ON public.holidays FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "holidays_delete" ON public.holidays FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Fix departments: all authenticated can read, only admins can write
DROP POLICY IF EXISTS "departments_policy" ON public.departments;
DROP POLICY IF EXISTS "Allow all access to departments" ON public.departments;

CREATE POLICY "departments_select" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert" ON public.departments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Fix designations: all authenticated can read, only admins can write
DROP POLICY IF EXISTS "designations_policy" ON public.designations;
DROP POLICY IF EXISTS "Allow all access to designations" ON public.designations;

CREATE POLICY "designations_select" ON public.designations FOR SELECT TO authenticated USING (true);
CREATE POLICY "designations_insert" ON public.designations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Fix shift_timings: all authenticated can read, only admins can write
DROP POLICY IF EXISTS "shift_timings_policy" ON public.shift_timings;
DROP POLICY IF EXISTS "Allow all access to shift_timings" ON public.shift_timings;

CREATE POLICY "shift_timings_select" ON public.shift_timings FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_timings_insert" ON public.shift_timings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "shift_timings_update" ON public.shift_timings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "shift_timings_delete" ON public.shift_timings FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- STEP 6: LOCK DOWN handle_new_user TRIGGER (prevent role escalation)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_pin text;
BEGIN
  -- SECURITY: Always force role to 'employee' — admin role must be set manually
  -- This prevents privilege escalation via raw_user_meta_data manipulation
  user_pin := coalesce(new.raw_user_meta_data->>'pin', '');

  INSERT INTO public.profiles (id, full_name, role, pin, is_active, joining_date)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    'employee',  -- ALWAYS employee, never trust client-supplied role
    user_pin,
    true,
    now()::date
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;
