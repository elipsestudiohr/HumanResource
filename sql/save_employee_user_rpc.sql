-- SQL script to store plaintext employee credentials in the profiles database table
-- and configure the unified save_employee_user RPC function.

-- 1. Alter public.profiles to add email and password columns in plaintext
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists password text;

-- 2. Drop the old functions to ensure clean recreation
drop function if exists public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric);
drop function if exists public.create_employee_user(text, text, text, text, text, text, numeric, numeric);

-- 3. Create the unified user creation and update function
create or replace function public.save_employee_user(
  id_val uuid default null,
  email_val text default null,
  password_val text default null,
  pin_val text default null,
  name_val text default null,
  designation_val text default null,
  department_val text default null,
  salary_val numeric default null,
  hourly_val numeric default null
)
returns uuid
language plpgsql
security definer -- Bypasses RLS to update auth.users, auth.identities, and public.profiles
as $$
declare
  target_user_id uuid := id_val;
begin
  if target_user_id is null then
    -- CREATE MODE: Check for duplicates
    if exists (select 1 from auth.users where email = email_val) then
      raise exception 'An account with this email already exists.';
    end if;
    if exists (select 1 from public.profiles where pin = pin_val) then
      raise exception 'An employee with ZKTeco PIN % already exists.', pin_val;
    end if;

    -- Insert into auth.users
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      email_val, crypt(password_val, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now()
    )
    returning id into target_user_id;

    -- Insert into auth.identities (Passing id as UUID to match database type constraints)
    insert into auth.identities (
      id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
    )
    values (
      target_user_id, -- Passed as UUID (fixes "column id is of type uuid but expression is of type text")
      target_user_id,
      'email',
      target_user_id::text,
      jsonb_build_object('sub', target_user_id::text, 'email', email_val), now(), now(), now()
    );
  else
    -- UPDATE MODE: Check duplicate PIN
    if exists (select 1 from public.profiles where pin = pin_val and id != target_user_id) then
      raise exception 'ZKTeco PIN % is already assigned to another employee.', pin_val;
    end if;

    -- Update auth.users email
    update auth.users
    set 
      email = email_val,
      updated_at = now()
    where id = target_user_id;

    -- Update auth.users password if a new one is supplied
    if password_val is not null and password_val != '' then
      update auth.users
      set encrypted_password = crypt(password_val, gen_salt('bf'))
      where id = target_user_id;
    end if;

    -- Update auth.identities
    update auth.identities
    set 
      identity_data = jsonb_build_object('sub', target_user_id::text, 'email', email_val),
      updated_at = now()
    where user_id = target_user_id;
  end if;

  -- 3. Update public.profiles record (handles both create and update)
  update public.profiles
  set
    full_name = name_val,
    pin = pin_val,
    designation = designation_val,
    department = department_val,
    base_salary = salary_val,
    hourly_rate = hourly_val,
    email = email_val,
    password = coalesce(nullif(password_val, ''), password) -- Keep existing password if blank is submitted
  where id = target_user_id;

  return target_user_id;
end;
$$;

-- 4. Explicitly grant execute rights to anon, authenticated, and service_role
grant execute on function public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric) to anon, authenticated, service_role;
