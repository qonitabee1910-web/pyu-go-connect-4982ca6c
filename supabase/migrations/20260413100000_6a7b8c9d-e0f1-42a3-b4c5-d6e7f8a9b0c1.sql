
-- Create new enums for Promo and Ads feature
CREATE TYPE public.promo_discount_type AS ENUM ('percentage', 'fixed_amount');
CREATE TYPE public.promo_target_service AS ENUM ('ride', 'shuttle', 'hotel', 'all');
CREATE TYPE public.promo_user_segment AS ENUM ('all', 'new_user', 'loyal_user', 'inactive_user');
CREATE TYPE public.ad_placement AS ENUM ('dashboard_banner', 'sidebar', 'popup', 'ride_completion');

-- ============ PROMOS ============
CREATE TABLE public.promos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type public.promo_discount_type NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(12,2) NOT NULL,
  image_url TEXT, -- Added image support for promos
  max_discount NUMERIC(12,2), -- Maximum discount amount for percentage type
  min_purchase NUMERIC(12,2) DEFAULT 0,
  quota INTEGER NOT NULL DEFAULT 0, -- Total available uses
  used_count INTEGER NOT NULL DEFAULT 0, -- Current uses
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  target_service public.promo_target_service NOT NULL DEFAULT 'all',
  target_user_segment public.promo_user_segment NOT NULL DEFAULT 'all',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;

-- RLS for Promos
CREATE POLICY "Promos viewable by authenticated users" ON public.promos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage promos" ON public.promos FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promos_updated_at BEFORE UPDATE ON public.promos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROMO REDEMPTIONS ============
CREATE TABLE public.promo_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_id UUID NOT NULL REFERENCES public.promos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  reference_id UUID NOT NULL, -- ID of the ride, shuttle booking, or hotel booking
  discount_amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS for Promo Redemptions
CREATE POLICY "Users can view own redemptions" ON public.promo_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all redemptions" ON public.promo_redemptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can record own redemptions" ON public.promo_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============ ADS / BANNERS ============
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT, -- External or internal deep link
  placement public.ad_placement NOT NULL DEFAULT 'dashboard_banner',
  display_order INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- RLS for Ads
CREATE POLICY "Ads viewable by everyone" ON public.ads FOR SELECT USING (true);
CREATE POLICY "Admins can manage ads" ON public.ads FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ AD PERFORMANCE METRICS ============
CREATE TABLE public.ad_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE UNIQUE,
  views_count INTEGER NOT NULL DEFAULT 0,
  clicks_count INTEGER NOT NULL DEFAULT 0,
  last_recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_metrics ENABLE ROW LEVEL SECURITY;

-- RLS for Ad Metrics
CREATE POLICY "Admins can view ad metrics" ON public.ad_metrics FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
-- Allowing system/authenticated users to increment counts (logic handled via function usually)
CREATE POLICY "Anyone can update ad metrics" ON public.ad_metrics FOR UPDATE USING (true);

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS for Audit Logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============ HELPER FUNCTIONS ============

-- Function to handle ad clicks/views increment
CREATE OR REPLACE FUNCTION public.increment_ad_metric(p_ad_id UUID, p_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.ad_metrics (ad_id, views_count, clicks_count)
  VALUES (p_ad_id, CASE WHEN p_type = 'view' THEN 1 ELSE 0 END, CASE WHEN p_type = 'click' THEN 1 ELSE 0 END)
  ON CONFLICT (ad_id) DO UPDATE
  SET 
    views_count = ad_metrics.views_count + (CASE WHEN p_type = 'view' THEN 1 ELSE 0 END),
    clicks_count = ad_metrics.clicks_count + (CASE WHEN p_type = 'click' THEN 1 ELSE 0 END),
    last_recorded_at = now();
END;
$$;

-- Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Audit Trigger to Promos and Ads
CREATE TRIGGER audit_promos
AFTER INSERT OR UPDATE OR DELETE ON public.promos
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE TRIGGER audit_ads
AFTER INSERT OR UPDATE OR DELETE ON public.ads
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- ============ INDEXES FOR PERFORMANCE ============
CREATE INDEX idx_promos_active_dates ON public.promos(is_active, start_date, end_date);
CREATE INDEX idx_promos_code ON public.promos(code);
CREATE INDEX idx_ads_active_dates ON public.ads(is_active, start_date, end_date, placement);
CREATE INDEX idx_ads_display_order ON public.ads(display_order);
CREATE INDEX idx_promo_redemptions_user ON public.promo_redemptions(user_id);
CREATE INDEX idx_promo_redemptions_promo ON public.promo_redemptions(promo_id);
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
