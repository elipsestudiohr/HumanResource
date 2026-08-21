-- Migration to add is_notifications_muted column to device_settings table
ALTER TABLE public.device_settings ADD COLUMN IF NOT EXISTS is_notifications_muted BOOLEAN DEFAULT FALSE;
