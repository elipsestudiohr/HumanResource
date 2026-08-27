-- ==============================================================================
-- RESTORE EMPLOYEES: Usaid Asif & Syed Rehan Ali
-- Sourced directly from backup: D:\Elipse\HRPortal\backups\2026-08-25\profiles.json
--
-- Instructions:
-- 1. Open Supabase Dashboard -> SQL Editor
-- 2. Paste this SQL query and click RUN.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Restore: Usaid Asif | PIN: 9 | Department: Visualization | Email: usaidali204@gmail.com
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  uid uuid := '31928458-09c9-4b35-a360-3876404ccdb7'::uuid;
  u_email text := 'usaidali204@gmail.com';
  u_pass text := 'usaidali101';
BEGIN
  -- 1. Insert/Update Authentication Record in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid OR email = u_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      is_anonymous, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      u_email, crypt(u_pass, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', '', false, false
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt(u_pass, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = uid OR email = u_email;
  END IF;

  -- 2. Ensure Email Auth Identity exists
  INSERT INTO auth.identities (
    id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    uid, uid, 'email', uid::text,
    jsonb_build_object('sub', uid::text, 'email', u_email),
    now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- 3. Upsert into public.profiles with original settings and PIN 9
  INSERT INTO public.profiles (
    id, pin, full_name, designation, department, joining_date, base_salary, hourly_rate,
    role, is_active, email, date_of_birth, income_tax, is_first_login, nic_no,
    emergency_contacts, timeline_periods, warning_text, warning_expiry, warning_color, warning_active,
    password, bank_name, bank_account_title, bank_account_no, payment_method, phone, display_order
  ) VALUES (
    '31928458-09c9-4b35-a360-3876404ccdb7',
    '9',
    'Usaid Asif',
    '',
    'Visualization',
    '2024-04-14',
    45000,
    166.67,
    'employee',
    TRUE,
    'usaidali204@gmail.com',
    '2006-10-04',
    0,
    FALSE,
    '42201-1973985-1',
    '[{"name":"Noreen Asif","phone":"03142322448","relation":"Mother"}]'::jsonb,
    '[{"endDate":"2024-10-14","heading":"Internship","startDate":"2024-04-14"}]'::jsonb,
    NULL,
    NULL,
    NULL,
    FALSE,
    'usaidali101',
    'Meezan Bank',
    'NOREEN ASIF',
    '10210109995993',
    'Bank',
    '+92 313 3478625',
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    pin = EXCLUDED.pin,
    full_name = EXCLUDED.full_name,
    designation = EXCLUDED.designation,
    department = EXCLUDED.department,
    joining_date = EXCLUDED.joining_date,
    base_salary = EXCLUDED.base_salary,
    hourly_rate = EXCLUDED.hourly_rate,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    email = EXCLUDED.email,
    date_of_birth = EXCLUDED.date_of_birth,
    income_tax = EXCLUDED.income_tax,
    nic_no = EXCLUDED.nic_no,
    emergency_contacts = EXCLUDED.emergency_contacts,
    timeline_periods = EXCLUDED.timeline_periods,
    password = EXCLUDED.password,
    bank_name = EXCLUDED.bank_name,
    bank_account_title = EXCLUDED.bank_account_title,
    bank_account_no = EXCLUDED.bank_account_no,
    payment_method = EXCLUDED.payment_method,
    phone = EXCLUDED.phone;
END $$;


-- ------------------------------------------------------------------------------
-- 2. Restore: Syed Rehan Ali | PIN: 15 | Department: Maryam & Zayn | Email: syedrehanali1234567891@gmail.com
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  uid uuid := 'd987a355-96f3-4b8a-acfd-e892d6f5460a'::uuid;
  u_email text := 'syedrehanali1234567891@gmail.com';
  u_pass text := 'rehanali2008';
BEGIN
  -- 1. Insert/Update Authentication Record in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = uid OR email = u_email) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      is_anonymous, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      u_email, crypt(u_pass, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', '', false, false
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt(u_pass, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = uid OR email = u_email;
  END IF;

  -- 2. Ensure Email Auth Identity exists
  INSERT INTO auth.identities (
    id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    uid, uid, 'email', uid::text,
    jsonb_build_object('sub', uid::text, 'email', u_email),
    now(), now(), now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- 3. Upsert into public.profiles with original settings and PIN 15
  INSERT INTO public.profiles (
    id, pin, full_name, designation, department, joining_date, base_salary, hourly_rate,
    role, is_active, email, date_of_birth, income_tax, is_first_login, nic_no,
    emergency_contacts, timeline_periods, warning_text, warning_expiry, warning_color, warning_active,
    password, bank_name, bank_account_title, bank_account_no, payment_method, phone, display_order
  ) VALUES (
    'd987a355-96f3-4b8a-acfd-e892d6f5460a',
    '15',
    'Syed Rehan Ali',
    '',
    'Maryam & Zayn',
    '2026-04-07',
    10000,
    37.04,
    'employee',
    TRUE,
    'syedrehanali1234567891@gmail.com',
    '2008-07-26',
    0,
    FALSE,
    '41302-7035839-9',
    '[{"name":"Syed Ayan","phone":"03313163039","relation":"Brother"}]'::jsonb,
    '[{"endDate":"2026-10-07","heading":"Internship","startDate":"2026-04-07"}]'::jsonb,
    NULL,
    NULL,
    NULL,
    FALSE,
    'rehanali2008',
    'Cash',
    NULL,
    NULL,
    'Cash',
    NULL,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    pin = EXCLUDED.pin,
    full_name = EXCLUDED.full_name,
    designation = EXCLUDED.designation,
    department = EXCLUDED.department,
    joining_date = EXCLUDED.joining_date,
    base_salary = EXCLUDED.base_salary,
    hourly_rate = EXCLUDED.hourly_rate,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    email = EXCLUDED.email,
    date_of_birth = EXCLUDED.date_of_birth,
    income_tax = EXCLUDED.income_tax,
    nic_no = EXCLUDED.nic_no,
    emergency_contacts = EXCLUDED.emergency_contacts,
    timeline_periods = EXCLUDED.timeline_periods,
    password = EXCLUDED.password,
    bank_name = EXCLUDED.bank_name,
    bank_account_title = EXCLUDED.bank_account_title,
    bank_account_no = EXCLUDED.bank_account_no,
    payment_method = EXCLUDED.payment_method,
    phone = EXCLUDED.phone;
END $$;
