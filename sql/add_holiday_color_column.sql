-- ============================================================
-- add_holiday_color_column.sql
-- Adds the color column to the public.holidays table
-- ============================================================

ALTER TABLE public.holidays ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6';
