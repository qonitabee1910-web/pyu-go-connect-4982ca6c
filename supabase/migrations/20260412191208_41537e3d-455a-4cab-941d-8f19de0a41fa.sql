
CREATE OR REPLACE FUNCTION public.create_shuttle_booking_atomic(
  p_schedule_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_guest_name text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_seat_numbers text[] DEFAULT '{}',
  p_total_fare numeric DEFAULT 0,
  p_payment_method text DEFAULT 'cash',
  p_payment_status text DEFAULT 'unpaid',
  p_rayon_id uuid DEFAULT NULL,
  p_pickup_point_id uuid DEFAULT NULL,
  p_booking_ref text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_seat_id uuid;
  v_seat text;
BEGIN
  -- Insert booking
  INSERT INTO public.shuttle_bookings (
    schedule_id, user_id, guest_name, guest_phone,
    seat_count, total_fare, payment_method, payment_status,
    rayon_id, pickup_point_id, booking_ref, status
  ) VALUES (
    p_schedule_id, p_user_id, p_guest_name, p_guest_phone,
    array_length(p_seat_numbers, 1), p_total_fare, p_payment_method, p_payment_status,
    p_rayon_id, p_pickup_point_id, COALESCE(p_booking_ref, 'PYU-' || upper(substr(md5(random()::text), 1, 8))),
    'confirmed'
  )
  RETURNING id INTO v_booking_id;

  -- Link seats and mark as booked
  FOREACH v_seat IN ARRAY p_seat_numbers LOOP
    SELECT id INTO v_seat_id
    FROM public.shuttle_seats
    WHERE schedule_id = p_schedule_id AND seat_number = v_seat;

    IF v_seat_id IS NOT NULL THEN
      INSERT INTO public.shuttle_booking_seats (booking_id, seat_id)
      VALUES (v_booking_id, v_seat_id);

      UPDATE public.shuttle_seats
      SET status = 'booked', reserved_at = now()
      WHERE id = v_seat_id;
    END IF;
  END LOOP;

  -- Decrease available seats
  UPDATE public.shuttle_schedules
  SET available_seats = available_seats - array_length(p_seat_numbers, 1)
  WHERE id = p_schedule_id;

  RETURN v_booking_id;
END;
$$;
