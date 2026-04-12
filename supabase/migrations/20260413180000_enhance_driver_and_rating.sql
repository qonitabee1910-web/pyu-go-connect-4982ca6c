
-- 1. Add gender and verification to drivers
CREATE TYPE public.gender_type AS ENUM ('male', 'female');

ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS gender public.gender_type NOT NULL DEFAULT 'male',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS current_vehicle_id UUID REFERENCES public.vehicles(id);

-- 2. Add gender to profiles (optional, but good for UX)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender public.gender_type;

-- 3. Add ride_rating table
CREATE TABLE public.ride_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES auth.users(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(ride_id)
);

ALTER TABLE public.ride_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders can view own ratings" ON public.ride_ratings FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Riders can insert own ratings" ON public.ride_ratings FOR INSERT WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Drivers can view their ratings" ON public.ride_ratings FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.drivers WHERE user_id = auth.uid() AND id = driver_id
));

-- 4. Trigger to update driver's average rating
CREATE OR REPLACE FUNCTION public.update_driver_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.drivers
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 1)
    FROM public.ride_ratings
    WHERE driver_id = NEW.driver_id
  )
  WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ride_rating_inserted
AFTER INSERT ON public.ride_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_driver_average_rating();

-- 5. Link driver to shuttle schedules
ALTER TABLE public.shuttle_schedules
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id);

-- Update some existing drivers for testing purposes
-- UPDATE public.drivers SET is_verified = true;
