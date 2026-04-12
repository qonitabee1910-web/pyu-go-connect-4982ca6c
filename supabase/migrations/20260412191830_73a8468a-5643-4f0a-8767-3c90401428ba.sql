
-- Create app_settings table
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read settings" ON public.app_settings
  FOR SELECT USING (true);

-- Seed ride fares
INSERT INTO public.app_settings (key, value) VALUES
('ride_fares', '{
  "car": { "base_fare": 10000, "per_km": 4000, "min_fare": 15000, "surge_multiplier": 1.0 },
  "bike": { "base_fare": 5000, "per_km": 2500, "min_fare": 8000, "surge_multiplier": 1.0 },
  "bike_women": { "base_fare": 5000, "per_km": 2500, "min_fare": 8000, "surge_multiplier": 1.0 }
}'::jsonb),
('service_zones', '[
  { "name": "Kota Purwokerto", "lat": -7.4213, "lng": 109.2344, "radius_km": 15 },
  { "name": "Kota Cilacap", "lat": -7.7181, "lng": 109.0154, "radius_km": 10 }
]'::jsonb);
