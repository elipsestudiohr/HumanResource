-- Create a secure RPC function to allow HR Admins to create employee login accounts directly from the web portal

-- 1. Make sure pgcrypto extension is enabled for password hashing
create extension if not exists pgcrypto;

-- 2. Cleanup broken users created without identity rows (which was causing Supabase 500 errors)
delete from auth.users
where id not in (select user_id from auth.identities)
  and email != 'elipsestudiohr@gmail.com'; -- Safety check: never delete the main admin account

-- 3. Create the user creation function with identity mapping
create or replace function public.create_employee_user(
  email_val text,
  password_val text,
  pin_val text,
  name_val text,
  designation_val text,
  department_val text,
  salary_val numeric,
  hourly_val numeric
)
returns uuid
language plpgsql
security definer -- Bypasses RLS to write to auth.users and auth.identities
as $$
declare
  new_user_id uuid;
begin
  -- Check if email already exists
  if exists (select 1 from auth.users where email = email_val) then
    raise exception 'An account with this email already exists.';
  end if;

  -- Check if ZKTeco PIN already exists in profiles
  if exists (select 1 from public.profiles where pin = pin_val) then
    raise exception 'An employee with ZKTeco PIN % already exists.', pin_val;
  end if;

  -- 1. Insert the user into auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    email_val,
    crypt(password_val, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    false
  )
  returning id into new_user_id;

  -- 2. Insert the identity row into auth.identities (MANDATORY for Supabase Auth to succeed without 500 errors)
  insert into auth.identities (
    id,
    user_id,
    provider,
    provider_id,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    new_user_id::text, -- For email provider, identity id is the user's UUID as text
    new_user_id,
    'email',
    new_user_id::text, -- provider_id is the user's UUID as text
    jsonb_build_object('sub', new_user_id::text, 'email', email_val),
    now(),
    now(),
    now()
  );

  -- 3. Update the public.profiles record created by the database trigger
  update public.profiles
  set
    full_name = name_val,
    pin = pin_val,
    designation = designation_val,
    department = department_val,
    base_salary = salary_val,
    hourly_rate = hourly_val
  where id = new_user_id;

  return new_user_id;
end;
$$;
