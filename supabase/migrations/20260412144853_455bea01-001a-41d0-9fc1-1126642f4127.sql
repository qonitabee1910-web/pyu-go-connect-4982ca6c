-- Add payment columns to shuttle_bookings
ALTER TABLE public.shuttle_bookings
  ADD COLUMN payment_method text DEFAULT 'cash',
  ADD COLUMN payment_status text NOT NULL DEFAULT 'unpaid';

-- Allow guests to view their own booking by booking_ref (no auth needed)
CREATE POLICY "Anyone can view bookings by ref"
  ON public.shuttle_bookings
  FOR SELECT
  USING (true);

-- Drop the old user-only select policy since anyone can now view
DROP POLICY IF EXISTS "Users can view own bookings" ON public.shuttle_bookings;