-- Table to store Firebase Cloud Messaging (FCM) & Web Push Tokens per User / Device
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  token TEXT UNIQUE NOT NULL,
  subscription_data TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_push_tokens ADD COLUMN IF NOT EXISTS subscription_data TEXT;

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for active portal users
DROP POLICY IF EXISTS "Allow all access to user_push_tokens" ON public.user_push_tokens;
CREATE POLICY "Allow all access to user_push_tokens"
ON public.user_push_tokens
FOR ALL
USING (true)
WITH CHECK (true);

GRANT ALL ON public.user_push_tokens TO anon, authenticated, service_role;
