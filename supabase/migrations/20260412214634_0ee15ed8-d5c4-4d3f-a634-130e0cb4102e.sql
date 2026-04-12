
-- Allow users to register themselves as drivers
CREATE POLICY "Users can insert own driver profile"
  ON public.drivers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own role during signup
CREATE POLICY "Users can insert own role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
