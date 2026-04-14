-- Phase 1: Data cleanup and standardization
-- This migration standardizes route and rayon names for a cleaner UI/UX.

-- 1. Standardize Route Names (Remove redundant Rayon info from name)
UPDATE public.shuttle_routes
SET name = 'Medan Kota - Kualanamu'
WHERE id = 'a1111111-1111-1111-1111-111111111111';

UPDATE public.shuttle_routes
SET name = 'Medan Petisah - Kualanamu'
WHERE id = 'b2222222-2222-2222-2222-222222222222';

UPDATE public.shuttle_routes
SET name = 'Medan Barat - Kualanamu'
WHERE id = 'c3333333-3333-3333-3333-333333333333';

UPDATE public.shuttle_routes
SET name = 'Medan Baru - Kualanamu'
WHERE id = 'd4444444-4444-4444-4444-444444444444';

-- 2. Standardize Rayon Names (Title Case for better UX)
UPDATE public.shuttle_rayons SET name = 'Rayon A' WHERE name = 'RAYON A';
UPDATE public.shuttle_rayons SET name = 'Rayon B' WHERE name = 'RAYON B';
UPDATE public.shuttle_rayons SET name = 'Rayon C' WHERE name = 'RAYON C';
UPDATE public.shuttle_rayons SET name = 'Rayon D' WHERE name = 'RAYON D';

-- 3. Ensure all bookings have service_type_id and vehicle_type populated (for existing data)
-- This is a one-time fix for legacy data if any exists
UPDATE public.shuttle_bookings sb
SET 
    service_type_id = (SELECT id FROM shuttle_service_types WHERE name = 'Reguler' LIMIT 1),
    vehicle_type = 'MiniCar'
WHERE service_type_id IS NULL;

-- 4. Clean up any orphaned schedule services
DELETE FROM shuttle_schedule_services 
WHERE schedule_id NOT IN (SELECT id FROM shuttle_schedules);

-- 5. Add helpful comments to the schema
COMMENT ON COLUMN public.shuttle_bookings.service_type_id IS 'Selected service type for this booking';
COMMENT ON COLUMN public.shuttle_bookings.vehicle_type IS 'Selected vehicle model for this booking';
COMMENT ON COLUMN public.shuttle_bookings.base_amount IS 'Calculated base fare at time of booking';
COMMENT ON TABLE public.shuttle_booking_details IS 'Stores per-seat passenger information';
