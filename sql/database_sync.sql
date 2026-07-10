-- Secure PostgreSQL Triggers for Two-Way Authentication Syncing

-- 1. Make sure email and password columns exist in profiles
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists password text;

-- 2. Drop old functions to avoid conflicts
drop function if exists public.save_employee_user(uuid, text, text, text, text, text, text, numeric, numeric);
drop function if exists public.create_employee_user(text, text, text, text, text, text, numeric, numeric);
drop trigger if exists on_profile_updated on public.profiles;
drop function if exists public.sync_profile_to_auth();
drop trigger if exists on_auth_user_created_before on auth.users;
drop function if exists public.auto_confirm_user_email();

-- 3. Create a trigger to automatically confirm all email signups (bypasses mandatory email confirmation checks)
create or replace function public.auto_confirm_user_email()
returns trigger as $$
begin
  new.email_confirmed_at := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_before
  before insert on auth.users
  for each row execute procedure public.auto_confirm_user_email();

-- 4. Create a trigger function to sync profile updates back to auth.users and auth.identities
create or replace function public.sync_profile_to_auth()
returns trigger as $$
begin
  -- Update auth.users email
  update auth.users
  set email = new.email,
      updated_at = now()
  where id = new.id;

  -- Update auth.users password if the plaintext password in profiles was modified
  if new.password is not null and new.password != '' and (old.password is null or new.password != old.password) then
    update auth.users
    set encrypted_password = crypt(new.password, gen_salt('bf'))
    where id = new.id;
  end if;

  -- Update auth.identities email mapping
  update auth.identities
  set identity_data = jsonb_build_object('sub', new.id::text, 'email', new.email),
      updated_at = now()
  where user_id = new.id;

  return new;
end;
$$ language plpgsql security definer; -- Bypasses RLS to write to auth schema

-- 5. Attach the trigger on update
create trigger on_profile_updated
  after update on public.profiles
  for each row execute procedure public.sync_profile_to_auth();

-- 6. Cleanup broken users created without identity rows
delete from auth.users
where id not in (select user_id from auth.identities)
  and email != 'elipsestudiohr@gmail.com';
