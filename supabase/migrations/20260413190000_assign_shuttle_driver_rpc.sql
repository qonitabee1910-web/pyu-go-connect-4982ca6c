
-- RPC to safely assign a driver to a shuttle schedule (atomic)
CREATE OR REPLACE FUNCTION public.assign_driver_to_shuttle(
  p_schedule_id UUID,
  p_driver_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_driver UUID;
  v_is_verified BOOLEAN;
BEGIN
  -- Check if driver is verified
  SELECT is_verified INTO v_is_verified
  FROM public.drivers
  WHERE id = p_driver_id;

  IF NOT v_is_verified THEN
    RAISE EXCEPTION 'Driver must be verified to take shuttle trips';
  END IF;

  -- Lock the row for update to prevent race conditions
  SELECT driver_id INTO v_current_driver
  FROM public.shuttle_schedules
  WHERE id = p_schedule_id
  FOR UPDATE;

  -- Check if the schedule exists and doesn't have a driver yet
  IF v_current_driver IS NULL THEN
    UPDATE public.shuttle_schedules
    SET driver_id = p_driver_id
    WHERE id = p_schedule_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;
