-- Phase 1: Consolidate data and implement atomic booking RPC
-- This migration updates the shuttle booking schema and implements a robust, secure atomic booking function.

-- ============ 1. Update shuttle_bookings schema ============
-- Add missing fields to track exactly what service/vehicle was booked
ALTER TABLE public.shuttle_bookings
ADD COLUMN IF NOT EXISTS service_type_id UUID REFERENCES public.shuttle_service_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vehicle_type TEXT,
ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_premium NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rayon_surcharge NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS distance_amount NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS booking_notes TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_shuttle_bookings_service_id ON public.shuttle_bookings(service_type_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_bookings_user_id ON public.shuttle_bookings(user_id);

-- ============ 2. Create shuttle_booking_details table ============
-- Stores passenger information for each seat in a booking
CREATE TABLE IF NOT EXISTS public.shuttle_booking_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.shuttle_bookings(id) ON DELETE CASCADE,
    seat_number INTEGER NOT NULL,
    passenger_name TEXT NOT NULL,
    passenger_phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for shuttle_booking_details
ALTER TABLE public.shuttle_booking_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own booking details"
    ON public.shuttle_booking_details
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.shuttle_bookings sb
            WHERE sb.id = shuttle_booking_details.booking_id
            AND (sb.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
        )
    );

CREATE POLICY "Anyone can create booking details during booking"
    ON public.shuttle_booking_details
    FOR INSERT
    WITH CHECK (true); -- Security handled by the RPC function

-- ============ 3. SQL Function for Secure Price Calculation ============
-- This function recalculates the total price on the server to prevent price tampering.
CREATE OR REPLACE FUNCTION public.calculate_shuttle_booking_price(
  p_schedule_id UUID,
  p_service_type_id UUID,
  p_rayon_id UUID,
  p_seat_count INTEGER
)
RETURNS TABLE (
  base_amount NUMERIC,
  service_premium NUMERIC,
  rayon_surcharge NUMERIC,
  distance_amount NUMERIC,
  peak_multiplier NUMERIC,
  total_amount NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_id UUID;
  v_base_fare NUMERIC;
  v_distance_km NUMERIC;
  v_pricing RECORD;
  v_subtotal NUMERIC;
BEGIN
  -- Get route info
  SELECT route_id INTO v_route_id FROM shuttle_schedules WHERE id = p_schedule_id;
  SELECT base_fare, distance_km INTO v_base_fare, v_distance_km FROM shuttle_routes WHERE id = v_route_id;

  -- Get pricing rules for the service type
  SELECT * INTO v_pricing FROM get_current_pricing_for_service(p_service_type_id);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pricing rules not found for service type';
  END IF;

  -- Calculate components
  base_amount := v_base_fare;
  service_premium := v_base_fare * (v_pricing.base_fare_multiplier - 1.0);
  rayon_surcharge := (v_pricing.rayon_base_surcharge || 0) * p_seat_count;
  distance_amount := (v_distance_km || 0) * (v_pricing.distance_cost_per_km || 0);
  peak_multiplier := v_pricing.peak_hours_multiplier || 1.0;

  v_subtotal := base_amount + service_premium + rayon_surcharge + distance_amount;
  total_amount := ROUND(v_subtotal * peak_multiplier, 0);

  RETURN NEXT;
END;
$$;

-- ============ 4. Robust Atomic Booking RPC ============
-- Handles price verification, seat locking, booking creation, and passenger info in one transaction.
CREATE OR REPLACE FUNCTION public.create_shuttle_booking_atomic_v2(
  p_schedule_id UUID,
  p_service_type_id UUID,
  p_vehicle_type TEXT,
  p_rayon_id UUID,
  p_pickup_point_id UUID,
  p_user_id UUID,
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_seat_numbers INTEGER[],
  p_passenger_names TEXT[],
  p_passenger_phones TEXT[],
  p_payment_method TEXT,
  p_expected_total NUMERIC
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_price_info RECORD;
  v_seat_count INTEGER;
  v_seat_number INTEGER;
  v_i INTEGER;
BEGIN
  v_seat_count := array_length(p_seat_numbers, 1);
  
  -- 1. Recalculate and Verify Price (Prevent Fraud)
  SELECT * INTO v_price_info FROM public.calculate_shuttle_booking_price(
    p_schedule_id, p_service_type_id, p_rayon_id, v_seat_count
  );

  IF ABS(v_price_info.total_amount - p_expected_total) > 1.0 THEN
    RAISE EXCEPTION 'Price verification failed. Expected %, calculated %', p_expected_total, v_price_info.total_amount;
  END IF;

  -- 2. Create the booking record
  INSERT INTO public.shuttle_bookings (
    schedule_id,
    service_type_id,
    vehicle_type,
    user_id,
    guest_name,
    guest_phone,
    seat_count,
    rayon_id,
    pickup_point_id,
    base_amount,
    service_premium,
    rayon_surcharge,
    distance_amount,
    total_fare,
    payment_method,
    payment_status,
    booking_status
  ) VALUES (
    p_schedule_id,
    p_service_type_id,
    p_vehicle_type,
    p_user_id,
    p_guest_name,
    p_guest_phone,
    v_seat_count,
    p_rayon_id,
    p_pickup_point_id,
    v_price_info.base_amount,
    v_price_info.service_premium,
    v_price_info.rayon_surcharge,
    v_price_info.distance_amount,
    v_price_info.total_amount,
    p_payment_method,
    'UNPAID',
    'PENDING_PAYMENT'
  ) RETURNING id INTO v_booking_id;

  -- 3. Process each seat and passenger info
  FOR v_i IN 1..v_seat_count
  LOOP
    v_seat_number := p_seat_numbers[v_i];

    -- Update seat status to booked (lock row)
    UPDATE public.shuttle_seats 
    SET status = 'booked',
        reserved_at = NULL,
        reserved_by_session = NULL
    WHERE schedule_id = p_schedule_id 
      AND (seat_number::text = v_seat_number::text OR seat_number::text = lpad(v_seat_number::text, 2, '0'))
      AND status != 'booked';
      
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Seat % is already booked or not found', v_seat_number;
    END IF;

    -- Create passenger detail
    INSERT INTO public.shuttle_booking_details (
      booking_id,
      seat_number,
      passenger_name,
      passenger_phone
    ) VALUES (
      v_booking_id,
      v_seat_number,
      p_passenger_names[v_i],
      p_passenger_phones[v_i]
    );
  END LOOP;

  -- 4. Update available seats in shuttle_schedule_services
  UPDATE public.shuttle_schedule_services
  SET available_seats = available_seats - v_seat_count
  WHERE schedule_id = p_schedule_id
    AND service_type_id = p_service_type_id
    AND vehicle_type = p_vehicle_type;

  -- Also update main schedule available seats (legacy support)
  UPDATE public.shuttle_schedules
  SET available_seats = available_seats - v_seat_count
  WHERE id = p_schedule_id;

  RETURN v_booking_id;
END;
$$;

-- Add comments for clarity
COMMENT ON FUNCTION public.create_shuttle_booking_atomic_v2 IS 'Phase 1: Secure atomic booking with server-side pricing and passenger info';
