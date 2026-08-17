-- Fix for schema mismatch on leave_requests table
-- Run this in Supabase SQL Editor if needed to ensure all timestamp columns exist

ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS requested_at timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO anon, authenticated, service_role;
