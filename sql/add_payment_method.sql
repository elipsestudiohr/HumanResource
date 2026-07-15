-- Migration: Add payment_method to profiles and color to announcements
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'Bank';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS color text DEFAULT '#ff3b57';
