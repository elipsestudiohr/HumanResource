-- ============================================================
-- holidays_and_dob.sql
-- Adds the holidays table and date_of_birth column to profiles
-- ============================================================

-- 1. Holidays table
CREATE TABLE IF NOT EXISTS public.holidays (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date date NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read holidays
CREATE POLICY "Anyone can read holidays"
  ON public.holidays
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert/update/delete holidays
CREATE POLICY "Admins can insert holidays"
  ON public.holidays
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update holidays"
  ON public.holidays
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete holidays"
  ON public.holidays
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 2. Add date_of_birth column to profiles (if not exists)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS date_of_birth date;

-- 3. Update save_employee_user RPC to accept dob parameter
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
BEGIN
  IF id_val IS NOT NULL THEN
    -- UPDATE existing employee
    UPDATE public.profiles SET
      pin = pin_val,
      full_name = name_val,
      designation = designation_val,
      department = department_val,
      base_salary = salary_val,
      hourly_rate = hourly_val,
      date_of_birth = dob_val
    WHERE id = id_val;

    -- Update email if changed
    IF email_val IS NOT NULL AND email_val != '' THEN
      UPDATE auth.users SET email = email_val WHERE id = id_val;
    END IF;

    -- Update password if provided
    IF password_val IS NOT NULL AND password_val != '' THEN
      UPDATE auth.users SET encrypted_password = crypt(password_val, gen_salt('bf'))
      WHERE id = id_val;
    END IF;

    -- Store plaintext password reference in profiles
    IF password_val IS NOT NULL AND password_val != '' THEN
      UPDATE public.profiles SET password = password_val WHERE id = id_val;
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
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', name_val, 'pin', pin_val),
      now(), now(), '', '', '', ''
    )
    RETURNING id INTO target_id;

    -- Update profile with all fields
    UPDATE public.profiles SET
      pin = pin_val,
      full_name = name_val,
      designation = designation_val,
      department = department_val,
      base_salary = salary_val,
      hourly_rate = hourly_val,
      role = 'employee',
      email = email_val,
      password = password_val,
      date_of_birth = dob_val
    WHERE id = target_id;
  END IF;

  RETURN target_id;
END;
$$;
