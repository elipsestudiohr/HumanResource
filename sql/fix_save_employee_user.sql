-- Fix save_employee_user RPC conflict by dropping all overloaded versions
-- and defining exactly ONE clean, unified function.

-- 1. Drop all existing overloaded versions of save_employee_user
DROP FUNCTION IF EXISTS public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric, date);
DROP FUNCTION IF EXISTS public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric, text);
DROP FUNCTION IF EXISTS public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric);

-- 2. Create the single, unified save_employee_user function with text dob_val parameter
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
SECURITY DEFINER -- Bypasses RLS to manage auth.users and public.profiles
AS $$
DECLARE
  target_user_id uuid := id_val;
BEGIN
  IF target_user_id IS NULL THEN
    -- CREATE MODE: Check for duplicates
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = email_val) THEN
      RAISE EXCEPTION 'An account with this email already exists.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE pin = pin_val) THEN
      RAISE EXCEPTION 'An employee with ZKTeco PIN % already exists.', pin_val;
    END IF;

    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      email_val, crypt(password_val, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now()
    )
    RETURNING id INTO target_user_id;

    -- Insert into auth.identities to ensure email login works properly
    INSERT INTO auth.identities (
      id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
    )
    VALUES (
      target_user_id,
      target_user_id,
      'email',
      target_user_id::text,
      jsonb_build_object('sub', target_user_id::text, 'email', email_val), now(), now(), now()
    );
  ELSE
    -- UPDATE MODE: Check duplicate PIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE pin = pin_val AND id != target_user_id) THEN
      RAISE EXCEPTION 'ZKTeco PIN % is already assigned to another employee.', pin_val;
    END IF;

    -- Update auth.users email
    UPDATE auth.users
    SET 
      email = email_val,
      updated_at = now()
    WHERE id = target_user_id;

    -- Update auth.users password if a new one is supplied
    IF password_val IS NOT NULL AND password_val != '' THEN
      UPDATE auth.users
      SET encrypted_password = crypt(password_val, gen_salt('bf'))
      WHERE id = target_user_id;
    END IF;

    -- Update auth.identities
    UPDATE auth.identities
    SET 
      identity_data = jsonb_build_object('sub', target_user_id::text, 'email', email_val),
      updated_at = now()
    WHERE user_id = target_user_id;
  END IF;

  -- 3. Update public.profiles record
  UPDATE public.profiles
  SET
    full_name = name_val,
    pin = pin_val,
    designation = designation_val,
    department = department_val,
    base_salary = salary_val,
    hourly_rate = hourly_val,
    email = email_val,
    date_of_birth = CASE WHEN dob_val IS NOT NULL AND dob_val != '' THEN dob_val::date ELSE NULL END,
    password = COALESCE(NULLIF(password_val, ''), password)
  WHERE id = target_user_id;

  RETURN target_user_id;
END;
$$;

-- 3. Grant execute rights explicitly to authenticated roles
GRANT EXECUTE ON FUNCTION public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric, text) TO anon, authenticated, service_role;
