-- Create session audit logs table for tracking session activity and security
-- This supports multi-device session management and security monitoring

CREATE TABLE IF NOT EXISTS public.session_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('LOGIN', 'LOGOUT', 'TOKEN_REFRESH', 'SESSION_EXTEND', 'SUSPICIOUS_ACTIVITY')),
  ip_address TEXT,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_audit_logs_user_id ON public.session_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_session_audit_logs_session_id ON public.session_audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_audit_logs_event ON public.session_audit_logs(event);
CREATE INDEX IF NOT EXISTS idx_session_audit_logs_created_at ON public.session_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_audit_logs_user_event ON public.session_audit_logs(user_id, event);

-- Enable RLS
ALTER TABLE public.session_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own session logs" ON public.session_audit_logs;
CREATE POLICY "Users can view own session logs"
ON public.session_audit_logs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert session logs" ON public.session_audit_logs;
CREATE POLICY "System can insert session logs"
ON public.session_audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all session logs" ON public.session_audit_logs;
CREATE POLICY "Admins can view all session logs"
ON public.session_audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_session_audit_logs_updated_at ON public.session_audit_logs;
CREATE TRIGGER update_session_audit_logs_updated_at
BEFORE UPDATE ON public.session_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- View for active sessions (last 24 hours)
DROP VIEW IF EXISTS public.active_sessions;
CREATE VIEW public.active_sessions AS
SELECT
  s.user_id,
  s.session_id,
  s.ip_address,
  s.device_info,
  s.user_agent,
  COUNT(*) as activity_count,
  MAX(s.created_at) as last_activity,
  MIN(s.created_at) as session_started
FROM public.session_audit_logs s
WHERE
  s.event != 'LOGOUT'
  AND s.created_at > now() - interval '24 hours'
  AND s.user_id = auth.uid()
GROUP BY s.user_id, s.session_id, s.ip_address, s.device_info, s.user_agent;

-- View for suspicious activities
DROP VIEW IF EXISTS public.suspicious_activities;
CREATE VIEW public.suspicious_activities AS
SELECT
  s.user_id,
  s.session_id,
  s.event,
  s.ip_address,
  s.device_info,
  s.details,
  s.created_at,
  (
    SELECT COUNT(*) 
    FROM public.session_audit_logs s2 
    WHERE s2.user_id = s.user_id 
    AND s2.ip_address != s.ip_address 
    AND s2.created_at > now() - interval '1 hour'
  ) as logins_from_different_ips_last_hour
FROM public.session_audit_logs s
WHERE s.event IN ('SUSPICIOUS_ACTIVITY', 'LOGIN')
ORDER BY s.created_at DESC;

-- Comments for documentation
COMMENT ON TABLE public.session_audit_logs IS 'Audit log for all session-related activities for security and compliance';
COMMENT ON COLUMN public.session_audit_logs.user_id IS 'Reference to authenticated user';
COMMENT ON COLUMN public.session_audit_logs.session_id IS 'Unique session identifier from Supabase Auth';
COMMENT ON COLUMN public.session_audit_logs.event IS 'Type of session event (LOGIN, LOGOUT, TOKEN_REFRESH, etc.)';
COMMENT ON COLUMN public.session_audit_logs.ip_address IS 'Client IP address (IPv4/IPv6)';
COMMENT ON COLUMN public.session_audit_logs.device_info IS 'JSON: device ID, name, OS, browser info';
COMMENT ON COLUMN public.session_audit_logs.details IS 'JSON: additional event-specific details';
