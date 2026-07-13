-- Allow users to update their own profile details (like password, is_first_login, etc.)
DROP POLICY IF EXISTS "Users can update their own profile details" ON public.profiles;

CREATE POLICY "Users can update their own profile details" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
