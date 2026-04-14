-- Create email templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL UNIQUE CHECK (type IN (
    'user_verification',
    'driver_verification', 
    'password_reset',
    'welcome_user',
    'welcome_driver',
    'documents_requested',
    'payment_received',
    'withdrawal_processed'
  )),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  preview TEXT,
  variables JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create email logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_type TEXT NOT NULL REFERENCES public.email_templates(type),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add SMTP configuration to app_settings if not exists
INSERT INTO public.app_settings (key, value)
VALUES (
  'email_smtp_config',
  jsonb_build_object(
    'host', 'smtp.gmail.com',
    'port', 587,
    'username', 'your-email@gmail.com',
    'password', 'your-app-password',
    'from_email', 'noreply@pyugo.com',
    'from_name', 'PYU GO',
    'enabled', false
  )
)
ON CONFLICT (key) DO NOTHING;

-- Add email provider config to app_settings
INSERT INTO public.app_settings (key, value)
VALUES (
  'email_provider',
  jsonb_build_object(
    'type', 'resend',
    'api_key', '',
    'api_url', 'https://api.resend.com/emails',
    'enabled', true
  )
)
ON CONFLICT (key) DO NOTHING;

-- Create indexes for email logs
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_email ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_id ON public.email_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON public.email_logs(template_type);

-- Add RLS policies for email_templates (readonly for users)
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read email templates"
  ON public.email_templates FOR SELECT
  USING (is_active = true);

-- Add RLS policies for email_logs (users can only see their own logs)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own email logs"
  ON public.email_logs FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Admins can see all email logs"
  ON public.email_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));
