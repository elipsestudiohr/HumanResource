-- SQL Migration: Add Employee Portal features, Emergency Contacts, Pakistani NIC validation, Announcements, and Warnings.

-- 1. Add new columns to public.profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nic_no TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timeline_periods JSONB DEFAULT '[]'::jsonb;

-- Warning fields for disciplinary action
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS warning_text TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS warning_expiry DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS warning_color TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS warning_active BOOLEAN DEFAULT FALSE;

-- 2. Alter target_type check constraint on announcements table
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_target_type_check;
ALTER TABLE public.announcements ADD CONSTRAINT announcements_target_type_check CHECK (target_type IN ('all', 'department', 'designation', 'employee'));
