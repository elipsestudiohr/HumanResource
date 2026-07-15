-- Add bank name, account title, and account number columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank_account_no text;
