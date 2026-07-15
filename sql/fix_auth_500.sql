-- SQL script to resolve Supabase GoTrue Auth 500 Internal Server Errors
-- Run this in your Supabase SQL Editor.

-- 1. Automatically provision missing identity records to allow standard logins
INSERT INTO auth.identities (
  id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at
)
SELECT 
  u.id, 
  u.id, 
  'email', 
  u.id::text, 
  jsonb_build_object('sub', u.id::text, 'email', u.email), 
  now(), 
  now(), 
  now()
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM auth.identities)
ON CONFLICT DO NOTHING;

-- 2. Set default values for GoTrue columns that must not be NULL (e.g. is_anonymous)
UPDATE auth.users SET is_anonymous = false WHERE is_anonymous IS NULL;
