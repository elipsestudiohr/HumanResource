-- SQL Migration: Add status, schedule_from, and dispose_at to announcements
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS schedule_from timestamp with time zone;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS dispose_at timestamp with time zone;
