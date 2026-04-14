-- Fix session_audit_logs schema - change ip_address from INET to TEXT
-- This allows storing IP addresses as strings without type conversion issues

-- First drop views that depend on this column
DROP VIEW IF EXISTS public.suspicious_activities;
DROP VIEW IF EXISTS public.active_sessions;

-- Now alter the column type
ALTER TABLE public.session_audit_logs
ALTER COLUMN ip_address SET DATA TYPE TEXT;

-- Recreate the views
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

-- Update RLS policy comment
COMMENT ON COLUMN public.session_audit_logs.ip_address IS 'Client IP address (stored as TEXT string, e.g., "203.0.113.42")';
