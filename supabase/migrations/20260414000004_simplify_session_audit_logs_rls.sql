-- Simplify session_audit_logs RLS policies for better reliability
-- Keep RLS enabled but make policies more straightforward

-- Drop existing restrictive policies  
DROP POLICY IF EXISTS "Users can view own session logs" ON public.session_audit_logs;
DROP POLICY IF EXISTS "System can insert session logs" ON public.session_audit_logs;
DROP POLICY IF EXISTS "Admins can view all session logs" ON public.session_audit_logs;

-- Enable RLS
ALTER TABLE public.session_audit_logs ENABLE ROW LEVEL SECURITY;

-- Simple policy: Authenticated users can insert logs (no user_id check needed, they'll provide it)
CREATE POLICY "Authenticated users can insert session logs"
ON public.session_audit_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can view their own logs
CREATE POLICY "Users can view own session logs"
ON public.session_audit_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all session logs"
ON public.session_audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' = 'admin'
  )
);

