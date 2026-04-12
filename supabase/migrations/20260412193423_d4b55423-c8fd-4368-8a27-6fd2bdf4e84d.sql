
-- 1. Create driver_earnings table
CREATE TABLE public.driver_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  ride_id uuid NOT NULL REFERENCES public.rides(id),
  gross_fare numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0.2,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_earning numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_earnings ENABLE ROW LEVEL SECURITY;

-- RLS for driver_earnings
CREATE POLICY "Drivers can view own earnings"
  ON public.driver_earnings FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage driver earnings"
  ON public.driver_earnings FOR ALL USING (
    public.has_role(auth.uid(), 'admin')
  );

-- 2. Add RLS policies for drivers table (drivers can manage own record)
CREATE POLICY "Drivers can view own profile"
  ON public.drivers FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update own status/location"
  ON public.drivers FOR UPDATE USING (auth.uid() = user_id);

-- 3. Add RLS policies for rides table (drivers can see/update assigned rides)
CREATE POLICY "Drivers can view assigned rides"
  ON public.rides FOR SELECT USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can update assigned rides"
  ON public.rides FOR UPDATE USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );
