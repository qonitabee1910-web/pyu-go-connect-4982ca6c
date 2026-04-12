
-- Create shuttle_rayons table
CREATE TABLE public.shuttle_rayons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shuttle_rayons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rayons viewable by everyone" ON public.shuttle_rayons FOR SELECT USING (true);
CREATE POLICY "Admins can manage rayons" ON public.shuttle_rayons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_shuttle_rayons_updated_at BEFORE UPDATE ON public.shuttle_rayons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create shuttle_pickup_points table
CREATE TABLE public.shuttle_pickup_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rayon_id UUID NOT NULL REFERENCES public.shuttle_rayons(id) ON DELETE CASCADE,
  stop_order INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  departure_time TEXT,
  distance_meters INTEGER NOT NULL DEFAULT 0,
  fare NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shuttle_pickup_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pickup points viewable by everyone" ON public.shuttle_pickup_points FOR SELECT USING (true);
CREATE POLICY "Admins can manage pickup points" ON public.shuttle_pickup_points FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_shuttle_pickup_points_updated_at BEFORE UPDATE ON public.shuttle_pickup_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add rayon_id and pickup_point_id to shuttle_bookings
ALTER TABLE public.shuttle_bookings
  ADD COLUMN rayon_id UUID REFERENCES public.shuttle_rayons(id),
  ADD COLUMN pickup_point_id UUID REFERENCES public.shuttle_pickup_points(id);
