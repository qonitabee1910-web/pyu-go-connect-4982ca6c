-- Create email webhook events table to track webhooks from providers
CREATE TABLE IF NOT EXISTS public.email_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'sent',
    'delivered',
    'bounced',
    'complained',
    'failed',
    'opened',
    'clicked',
    'unsubscribed',
    'deferred'
  )),
  provider TEXT NOT NULL CHECK (provider IN ('resend', 'sendgrid', 'mailgun', 'smtp')),
  provider_event_id TEXT,
  bounce_type TEXT CHECK (bounce_type IN ('undetermined', 'permanent', 'transient')),
  bounce_subtype TEXT,
  recipient_email TEXT,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create email blacklist table for bounced/invalid emails
CREATE TABLE IF NOT EXISTS public.email_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  reason TEXT CHECK (reason IN ('hard_bounce', 'complaint', 'unsubscribe', 'manual')),
  bounce_type TEXT,
  bounce_subtype TEXT,
  related_event_id UUID REFERENCES public.email_webhook_events(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create webhook configuration table
CREATE TABLE IF NOT EXISTS public.email_webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('resend', 'sendgrid', 'mailgun')),
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_test_at TIMESTAMPTZ,
  last_test_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create webhook delivery metrics materialized view
CREATE TABLE IF NOT EXISTS public.email_delivery_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_complained INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  delivery_rate NUMERIC(5, 2),
  bounce_rate NUMERIC(5, 2),
  open_rate NUMERIC(5, 2),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(metric_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_email_log_id 
ON public.email_webhook_events(email_log_id);

CREATE INDEX IF NOT EXISTS idx_email_webhook_events_event_type 
ON public.email_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_email_webhook_events_provider 
ON public.email_webhook_events(provider);

CREATE INDEX IF NOT EXISTS idx_email_webhook_events_created_at 
ON public.email_webhook_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_webhook_events_recipient_email 
ON public.email_webhook_events(recipient_email);

CREATE INDEX IF NOT EXISTS idx_email_blacklist_email 
ON public.email_blacklist(email);

CREATE INDEX IF NOT EXISTS idx_email_blacklist_created_at 
ON public.email_blacklist(created_at DESC);

-- Enable RLS
ALTER TABLE public.email_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_webhook_events (admins only)
CREATE POLICY "Allow admins to view webhook events"
  ON public.email_webhook_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow service role to insert webhook events"
  ON public.email_webhook_events
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for email_blacklist (admins can manage)
CREATE POLICY "Allow admins to view blacklist"
  ON public.email_blacklist
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow admins to manage blacklist"
  ON public.email_blacklist
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow service role to insert to blacklist"
  ON public.email_blacklist
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for webhook config (admins only)
CREATE POLICY "Allow admins to view webhook config"
  ON public.email_webhook_config
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow admins to manage webhook config"
  ON public.email_webhook_config
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for metrics (admins only)
CREATE POLICY "Allow admins to view metrics"
  ON public.email_delivery_metrics
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Function to update metrics
CREATE OR REPLACE FUNCTION update_email_delivery_metrics()
RETURNS void AS $$
BEGIN
  INSERT INTO public.email_delivery_metrics (
    metric_date,
    total_sent,
    total_delivered,
    total_bounced,
    total_complained,
    total_opened,
    delivery_rate,
    bounce_rate,
    open_rate
  ) SELECT
    CURRENT_DATE,
    COUNT(*) FILTER (WHERE event_type = 'sent') as total_sent,
    COUNT(*) FILTER (WHERE event_type = 'delivered') as total_delivered,
    COUNT(*) FILTER (WHERE event_type = 'bounced') as total_bounced,
    COUNT(*) FILTER (WHERE event_type = 'complained') as total_complained,
    COUNT(*) FILTER (WHERE event_type = 'opened') as total_opened,
    ROUND(
      (COUNT(*) FILTER (WHERE event_type = 'delivered')::numeric / 
       NULLIF(COUNT(*) FILTER (WHERE event_type = 'sent'), 0)) * 100, 2
    ),
    ROUND(
      (COUNT(*) FILTER (WHERE event_type = 'bounced')::numeric / 
       NULLIF(COUNT(*) FILTER (WHERE event_type = 'sent'), 0)) * 100, 2
    ),
    ROUND(
      (COUNT(*) FILTER (WHERE event_type = 'opened')::numeric / 
       NULLIF(COUNT(*) FILTER (WHERE event_type = 'delivered'), 0)) * 100, 2
    )
  FROM public.email_webhook_events
  WHERE DATE(created_at) = CURRENT_DATE
  ON CONFLICT (metric_date) DO UPDATE SET
    total_sent = EXCLUDED.total_sent,
    total_delivered = EXCLUDED.total_delivered,
    total_bounced = EXCLUDED.total_bounced,
    total_complained = EXCLUDED.total_complained,
    total_opened = EXCLUDED.total_opened,
    delivery_rate = EXCLUDED.delivery_rate,
    bounce_rate = EXCLUDED.bounce_rate,
    open_rate = EXCLUDED.open_rate,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log webhook events to email_logs
CREATE OR REPLACE FUNCTION log_webhook_event_to_email_logs()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type IN ('sent', 'delivered', 'bounced', 'failed') THEN
    UPDATE public.email_logs
    SET status = CASE
      WHEN NEW.event_type = 'sent' THEN 'sent'
      WHEN NEW.event_type = 'delivered' THEN 'sent'
      WHEN NEW.event_type = 'bounced' THEN 'bounced'
      WHEN NEW.event_type = 'failed' THEN 'failed'
    END,
    sent_at = CASE
      WHEN NEW.event_type IN ('sent', 'delivered', 'bounced', 'failed') THEN now()
      ELSE sent_at
    END
    WHERE id = NEW.email_log_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_webhook_event_to_email_logs
AFTER INSERT ON public.email_webhook_events
FOR EACH ROW
EXECUTE FUNCTION log_webhook_event_to_email_logs();

-- Trigger to add hard bounces to blacklist
CREATE OR REPLACE FUNCTION add_bounce_to_blacklist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'bounced' AND NEW.bounce_type = 'permanent' THEN
    INSERT INTO public.email_blacklist (
      email,
      reason,
      bounce_type,
      bounce_subtype,
      related_event_id,
      user_id,
      notes
    ) VALUES (
      COALESCE(NEW.recipient_email, (
        SELECT recipient_email FROM public.email_logs WHERE id = NEW.email_log_id
      )),
      'hard_bounce',
      NEW.bounce_type,
      NEW.bounce_subtype,
      NEW.id,
      (SELECT recipient_id FROM public.email_logs WHERE id = NEW.email_log_id),
      'Auto-added from webhook event: ' || NEW.error_message
    )
    ON CONFLICT (email) DO UPDATE SET
      bounce_type = EXCLUDED.bounce_type,
      bounce_subtype = EXCLUDED.bounce_subtype,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_bounce_to_blacklist
AFTER INSERT ON public.email_webhook_events
FOR EACH ROW
EXECUTE FUNCTION add_bounce_to_blacklist();
