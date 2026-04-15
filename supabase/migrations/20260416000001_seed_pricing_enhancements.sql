-- Seed Data: Pricing Tiers & Distance Matrix
-- Date: 2026-04-16

-- 1. Add some pricing tiers for "Executive" service
-- 10% discount for booking 3 or more seats
INSERT INTO public.shuttle_pricing_tiers (service_type_id, min_seats, max_seats, discount_multiplier, surcharge_fixed)
SELECT id, 3, 5, 0.90, 0
FROM shuttle_service_types 
WHERE name = 'Executive';

-- 15% discount for booking 6 or more seats
INSERT INTO public.shuttle_pricing_tiers (service_type_id, min_seats, max_seats, discount_multiplier, surcharge_fixed)
SELECT id, 6, NULL, 0.85, 0
FROM shuttle_service_types 
WHERE name = 'Executive';

-- 2. Add some distance matrix overrides
-- Example: Point A to Point B on Route 1 has a slightly different distance than the route average
INSERT INTO public.shuttle_distance_matrix (origin_point_id, destination_point_id, distance_km, estimated_minutes)
SELECT p1.id, p2.id, 15.5, 45
FROM shuttle_pickup_points p1, shuttle_pickup_points p2
WHERE p1.name = 'Titik A' AND p2.name = 'Titik B'
LIMIT 1;
