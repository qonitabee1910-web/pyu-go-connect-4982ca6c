
-- 1. Create shuttle_seats table
CREATE TABLE public.shuttle_seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.shuttle_schedules(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- available, reserved, booked
  reserved_at TIMESTAMPTZ,
  reserved_by_session TEXT, -- For guest sessions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, seat_number)
);

-- 2. Create shuttle_booking_seats table (mapping)
CREATE TABLE public.shuttle_booking_seats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.shuttle_bookings(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES public.shuttle_seats(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.shuttle_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shuttle_booking_seats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view seats" ON public.shuttle_seats FOR SELECT USING (true);
CREATE POLICY "Public can reserve seats" ON public.shuttle_seats FOR UPDATE USING (status = 'available' OR reserved_by_session = auth.uid()::text);
CREATE POLICY "Public can view booking seats" ON public.shuttle_booking_seats FOR SELECT USING (true);

-- 4. Function to cleanup expired reservations (10 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_expired_seat_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.shuttle_seats
  SET status = 'available',
      reserved_at = NULL,
      reserved_by_session = NULL
  WHERE status = 'reserved'
    AND reserved_at < now() - INTERVAL '10 minutes';
END;
$$;

-- 5. Trigger for updated_at
CREATE TRIGGER update_shuttle_seats_updated_at BEFORE UPDATE ON public.shuttle_seats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Indexes
CREATE INDEX idx_shuttle_seats_schedule ON public.shuttle_seats(schedule_id);
CREATE INDEX idx_shuttle_seats_status ON public.shuttle_seats(status, reserved_at);
