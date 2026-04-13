ALTER TABLE public.shuttle_pickup_points 
ADD COLUMN point_type text NOT NULL DEFAULT 'pickup';

COMMENT ON COLUMN public.shuttle_pickup_points.point_type IS 'Type of point: pickup or dropoff';