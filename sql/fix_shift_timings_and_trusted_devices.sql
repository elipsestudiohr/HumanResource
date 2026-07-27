-- SQL Migration: Add Fix Hours columns to shift_timings and create trusted_devices table for Cross-Browser Biometrics

-- 1. Ensure shift_timings has is_fixed_hours and total_hours columns
ALTER TABLE IF EXISTS public.shift_timings 
ADD COLUMN IF NOT EXISTS is_fixed_hours BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 9;

-- 2. Create trusted_devices table for cross-browser database device locking
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id SERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    auth_type TEXT NOT NULL DEFAULT 'fingerprint',
    device_name TEXT NOT NULL DEFAULT 'Trusted Device',
    icon_name TEXT NOT NULL DEFAULT 'fingerprint.svg',
    icon_path TEXT NOT NULL DEFAULT '/icons/fingerprint.svg',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_device_email UNIQUE (device_id, user_email)
);

-- Enable RLS and create public access policies
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read trusted_devices" ON public.trusted_devices;
CREATE POLICY "Allow public read trusted_devices" ON public.trusted_devices 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert trusted_devices" ON public.trusted_devices;
CREATE POLICY "Allow public insert trusted_devices" ON public.trusted_devices 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update trusted_devices" ON public.trusted_devices;
CREATE POLICY "Allow public update trusted_devices" ON public.trusted_devices 
FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete trusted_devices" ON public.trusted_devices;
CREATE POLICY "Allow public delete trusted_devices" ON public.trusted_devices 
FOR DELETE USING (true);
