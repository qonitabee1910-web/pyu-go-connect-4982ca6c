
-- Create enums
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.ride_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled', 'completed');
CREATE TYPE public.driver_status AS ENUM ('available', 'busy', 'offline');

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ USER ROLES (must be first for has_role) ============
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ DRIVERS ============
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  license_number TEXT,
  status driver_status NOT NULL DEFAULT 'offline',
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  rating NUMERIC(2,1) DEFAULT 5.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers viewable by everyone" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Admins can manage drivers" ON public.drivers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ VEHICLES ============
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  model TEXT,
  color TEXT,
  capacity INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vehicles viewable by everyone" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Admins can manage vehicles" ON public.vehicles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RIDES ============
CREATE TABLE public.rides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id UUID NOT NULL,
  driver_id UUID REFERENCES public.drivers(id),
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_address TEXT,
  dropoff_lat DOUBLE PRECISION NOT NULL,
  dropoff_lng DOUBLE PRECISION NOT NULL,
  dropoff_address TEXT,
  fare NUMERIC(12,2),
  distance_km NUMERIC(8,2),
  status ride_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rides" ON public.rides FOR SELECT USING (auth.uid() = rider_id);
CREATE POLICY "Admins can view all rides" ON public.rides FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create rides" ON public.rides FOR INSERT WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Admins can update rides" ON public.rides FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_rides_updated_at BEFORE UPDATE ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;

-- ============ SHUTTLE ROUTES ============
CREATE TABLE public.shuttle_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  base_fare NUMERIC(12,2) NOT NULL DEFAULT 0,
  distance_km NUMERIC(8,2),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shuttle_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Routes viewable by everyone" ON public.shuttle_routes FOR SELECT USING (true);
CREATE POLICY "Admins can manage routes" ON public.shuttle_routes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_shuttle_routes_updated_at BEFORE UPDATE ON public.shuttle_routes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SHUTTLE SCHEDULES ============
CREATE TABLE public.shuttle_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES public.shuttle_routes(id) ON DELETE CASCADE NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ,
  total_seats INTEGER NOT NULL DEFAULT 20,
  available_seats INTEGER NOT NULL DEFAULT 20,
  vehicle_id UUID REFERENCES public.vehicles(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shuttle_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schedules viewable by everyone" ON public.shuttle_schedules FOR SELECT USING (true);
CREATE POLICY "Admins can manage schedules" ON public.shuttle_schedules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_shuttle_schedules_updated_at BEFORE UPDATE ON public.shuttle_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SHUTTLE BOOKINGS ============
CREATE TABLE public.shuttle_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID REFERENCES public.shuttle_schedules(id) ON DELETE CASCADE NOT NULL,
  user_id UUID,
  guest_name TEXT,
  guest_phone TEXT,
  seat_count INTEGER NOT NULL DEFAULT 1,
  booking_ref TEXT NOT NULL DEFAULT ('PYU-' || upper(substr(md5(random()::text), 1, 8))),
  status booking_status NOT NULL DEFAULT 'confirmed',
  total_fare NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shuttle_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create shuttle bookings" ON public.shuttle_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own bookings" ON public.shuttle_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all bookings" ON public.shuttle_bookings FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bookings" ON public.shuttle_bookings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete bookings" ON public.shuttle_bookings FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_shuttle_bookings_updated_at BEFORE UPDATE ON public.shuttle_bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
