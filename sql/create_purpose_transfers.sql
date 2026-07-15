-- Migration: Create purpose_transfers table and configure security
create table if not exists public.purpose_transfers (
  id bigint generated always as identity primary key,
  payee_name text not null,
  purpose text not null,
  amount numeric(12, 2) not null,
  payment_method text not null,
  bank_name text,
  bank_account_title text,
  bank_account_no text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.purpose_transfers enable row level security;

-- Drop policy if exists
drop policy if exists "Admins can manage all transfers" on public.purpose_transfers;

-- Admins can do anything, employees can't see/do anything
create policy "Admins can manage all transfers" on public.purpose_transfers
  for all using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'admin'
    )
  );

-- Grant permissions to authenticated users and service role
grant all on public.purpose_transfers to authenticated, service_role;
