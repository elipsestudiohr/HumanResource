-- Add automated backup configuration columns to device_settings table
ALTER TABLE public.device_settings ADD COLUMN IF NOT EXISTS auto_backup_enabled boolean DEFAULT false;
ALTER TABLE public.device_settings ADD COLUMN IF NOT EXISTS backup_directory text DEFAULT 'D:\Elipse\HRPortal\backups';
ALTER TABLE public.device_settings ADD COLUMN IF NOT EXISTS last_backup_time timestamp with time zone;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_settings TO anon, authenticated, service_role;
