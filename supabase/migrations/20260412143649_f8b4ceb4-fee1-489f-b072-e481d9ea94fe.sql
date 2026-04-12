
-- 1. Ride service type enum + column
CREATE TYPE public.ride_service_type AS ENUM ('bike', 'bike_women', 'car');
ALTER TABLE public.rides ADD COLUMN service_type public.ride_service_type NOT NULL DEFAULT 'car';

-- 2. Hotel booking status enum
CREATE TYPE public.hotel_booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- 3. Hotels table
CREATE TABLE public.hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rating NUMERIC DEFAULT 0,
  star_rating INTEGER NOT NULL DEFAULT 3 CHECK (star_rating BETWEEN 1 AND 5),
  image_url TEXT,
  amenities TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotels viewable by everyone" ON public.hotels FOR SELECT USING (true);
CREATE POLICY "Admins can manage hotels" ON public.hotels FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Hotel rooms table
CREATE TABLE public.hotel_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_night NUMERIC NOT NULL DEFAULT 0,
  max_guests INTEGER NOT NULL DEFAULT 2,
  image_url TEXT,
  amenities TEXT[] DEFAULT '{}',
  total_rooms INTEGER NOT NULL DEFAULT 1,
  available_rooms INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms viewable by everyone" ON public.hotel_rooms FOR SELECT USING (true);
CREATE POLICY "Admins can manage rooms" ON public.hotel_rooms FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_hotel_rooms_updated_at BEFORE UPDATE ON public.hotel_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Hotel bookings table
CREATE TABLE public.hotel_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id),
  room_id UUID NOT NULL REFERENCES public.hotel_rooms(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC NOT NULL DEFAULT 0,
  status public.hotel_booking_status NOT NULL DEFAULT 'pending',
  booking_ref TEXT NOT NULL DEFAULT ('HTL-' || upper(substr(md5(random()::text), 1, 8))),
  guest_name TEXT,
  guest_phone TEXT,
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hotel bookings" ON public.hotel_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own hotel bookings" ON public.hotel_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage hotel bookings" ON public.hotel_bookings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_hotel_bookings_updated_at BEFORE UPDATE ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
