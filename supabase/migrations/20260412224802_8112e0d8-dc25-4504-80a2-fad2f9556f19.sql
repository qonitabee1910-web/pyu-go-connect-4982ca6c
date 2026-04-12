
ALTER TABLE public.shuttle_bookings
  DROP CONSTRAINT shuttle_bookings_pickup_point_id_fkey;

ALTER TABLE public.shuttle_bookings
  ADD CONSTRAINT shuttle_bookings_pickup_point_id_fkey
  FOREIGN KEY (pickup_point_id) REFERENCES public.shuttle_pickup_points(id)
  ON DELETE SET NULL;
