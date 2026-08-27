-- ==============================================================================
-- RESTORE EMPLOYEE: Syed Shurem Ali
-- Sourced directly from backup: D:\Elipse\HRPortal\backups\2026-08-25\profiles.json
--
-- Instructions:
-- 1. Open Supabase Dashboard -> SQL Editor
-- 2. Paste this SQL query and click RUN.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Restore: Syed Shurem Ali | PIN: 20 | Department: Maryam & Zayn | Email: shuremsyed41@gmail.com
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  uid uuid := '873b86a0-944b-4489-8c22-a37b4035d31e'::uuid;
  u_email text := 'shuremsyed41@gmail.com';
  u_pass text := 'Shurii22@';
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

  -- 3. Upsert into public.profiles with original settings and PIN 20
  INSERT INTO public.profiles (
    id, pin, full_name, designation, department, joining_date, base_salary, hourly_rate,
    role, is_active, email, date_of_birth, income_tax, is_first_login, nic_no,
    emergency_contacts, timeline_periods, warning_text, warning_expiry, warning_color, warning_active,
    password, bank_name, bank_account_title, bank_account_no, payment_method, phone, display_order
  ) VALUES (
    '873b86a0-944b-4489-8c22-a37b4035d31e',
    '20',
    'Syed  Shurem Ali',
    '',
    'Maryam & Zayn',
    '2026-05-06',
    25000,
    92.59,
    'employee',
    TRUE,
    'shuremsyed41@gmail.com',
    '2005-07-22',
    0,
    FALSE,
    '41302-5549203-1',
    '[{"name":"Sufyan","phone":"03353771209","relation":"Other"}]'::jsonb,
    '[]'::jsonb,
    NULL,
    NULL,
    NULL,
    FALSE,
    'Shurii22@',
    'Meezan Bank',
    'NAIMAL',
    '16810112414081',
    'Bank',
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
