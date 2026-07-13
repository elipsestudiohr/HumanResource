-- SQL Migration: Add grace_mins column to shift_timings table if it doesn't exist
ALTER TABLE public.shift_timings ADD COLUMN IF NOT EXISTS grace_mins INTEGER DEFAULT 20;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_timings TO anon, authenticated, service_role;
