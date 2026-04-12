-- 1. Function for Atomic Seat Reservation (Locking)
CREATE OR REPLACE FUNCTION public.reserve_shuttle_seats(
  p_schedule_id UUID,
  p_seat_numbers TEXT[],
  p_session_id TEXT
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Check if ANY of the requested seats are NOT available (Race Condition Prevention)
  -- Use FOR UPDATE to lock the rows being checked
  IF EXISTS (
    SELECT 1 FROM public.shuttle_seats 
    WHERE schedule_id = p_schedule_id 
    AND seat_number = ANY(p_seat_numbers) 
    AND status != 'available'
    AND (status != 'reserved' OR reserved_by_session != p_session_id)
    FOR UPDATE
  ) THEN
    RETURN FALSE;
  END IF;

  -- 2. Update status to reserved
  UPDATE public.shuttle_seats
  SET status = 'reserved',
      reserved_at = now(),
      reserved_by_session = p_session_id
  WHERE schedule_id = p_schedule_id 
  AND seat_number = ANY(p_seat_numbers);

  RETURN TRUE;
END;
$$;

-- 2. Function for Atomic Booking Creation
CREATE OR REPLACE FUNCTION public.create_shuttle_booking_atomic(
  p_schedule_id UUID,
  p_user_id UUID,
  p_guest_name TEXT,
  p_guest_phone TEXT,
  p_seat_numbers TEXT[],
  p_total_fare NUMERIC,
  p_payment_method TEXT,
  p_payment_status TEXT,
  p_rayon_id UUID,
  p_pickup_point_id UUID,
  p_booking_ref TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_seat_id UUID;
  v_seat_number TEXT;
BEGIN
  -- 1. Create the booking record
  INSERT INTO public.shuttle_bookings (
    schedule_id,
    user_id,
    guest_name,
    guest_phone,
    seat_count,
    booking_ref,
    status,
    total_fare,
    payment_method,
    payment_status,
    rayon_id,
    pickup_point_id
  ) VALUES (
    p_schedule_id,
    p_user_id,
    p_guest_name,
    p_guest_phone,
    array_length(p_seat_numbers, 1),
    p_booking_ref,
    'confirmed',
    p_total_fare,
    p_payment_method,
    p_payment_status,
    p_rayon_id,
    p_pickup_point_id
  ) RETURNING id INTO v_booking_id;

  -- 2. Process each seat
  FOREACH v_seat_number IN ARRAY p_seat_numbers
  LOOP
    -- Get seat ID and lock the row
    SELECT id INTO v_seat_id 
    FROM public.shuttle_seats 
    WHERE schedule_id = p_schedule_id AND seat_number = v_seat_number
    FOR UPDATE;

    -- Update seat status to booked
    UPDATE public.shuttle_seats 
    SET status = 'booked',
        reserved_at = NULL,
        reserved_by_session = NULL
    WHERE id = v_seat_id;

    -- Create mapping
    INSERT INTO public.shuttle_booking_seats (booking_id, seat_id)
    VALUES (v_booking_id, v_seat_id);
  END LOOP;

  -- 3. Update schedule available seats
  UPDATE public.shuttle_schedules
  SET available_seats = available_seats - array_length(p_seat_numbers, 1)
  WHERE id = p_schedule_id;

  RETURN v_booking_id;
END;
$$;
