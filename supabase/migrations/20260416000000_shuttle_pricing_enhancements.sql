-- Migration: Shuttle Pricing Enhancements (Distance Matrix & Pricing Tiers)
-- Date: 2026-04-16

-- 1. Create Distance Matrix table
-- Allows overriding route-level distance with specific point-to-point distances
CREATE TABLE IF NOT EXISTS public.shuttle_distance_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_point_id UUID REFERENCES public.shuttle_pickup_points(id) ON DELETE CASCADE,
    destination_point_id UUID REFERENCES public.shuttle_pickup_points(id) ON DELETE CASCADE,
    distance_km NUMERIC(8, 2) NOT NULL,
    estimated_minutes INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(origin_point_id, destination_point_id)
);

-- 2. Create Pricing Tiers table
-- Supports bulk booking discounts or premium pricing based on seat count
CREATE TABLE IF NOT EXISTS public.shuttle_pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type_id UUID REFERENCES public.shuttle_service_types(id) ON DELETE CASCADE,
    min_seats INTEGER NOT NULL DEFAULT 1,
    max_seats INTEGER,
    discount_multiplier NUMERIC(5, 2) DEFAULT 1.0, -- 0.90 = 10% discount
    surcharge_fixed NUMERIC(12, 2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add CHECK constraints for safety
ALTER TABLE public.shuttle_bookings ADD CONSTRAINT total_fare_positive CHECK (total_fare >= 0);
ALTER TABLE public.shuttle_bookings ADD CONSTRAINT seat_count_positive CHECK (seat_count > 0);

-- 4. Update calculation function to incorporate Tiers and Matrix
CREATE OR REPLACE FUNCTION public.calculate_shuttle_booking_price(
  p_schedule_id UUID DEFAULT NULL,
  p_service_type_id UUID DEFAULT NULL,
  p_rayon_id UUID DEFAULT NULL,
  p_seat_count INTEGER DEFAULT 1,
  p_variation_id UUID DEFAULT NULL,
  p_pickup_point_id UUID DEFAULT NULL,
  p_destination_point_id UUID DEFAULT NULL,
  p_route_id UUID DEFAULT NULL
)
RETURNS TABLE (
  base_amount NUMERIC,
  service_premium NUMERIC,
  rayon_surcharge NUMERIC,
  distance_amount NUMERIC,
  peak_multiplier NUMERIC,
  tier_discount NUMERIC,
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
  v_matrix_distance NUMERIC;
  v_pricing RECORD;
  v_tier RECORD;
  v_subtotal NUMERIC;
  v_ab_config JSONB;
  v_base_multiplier NUMERIC;
  v_dist_weight NUMERIC;
  v_demand_surge NUMERIC;
BEGIN
  -- 1. Resolve Route ID
  IF p_schedule_id IS NOT NULL THEN
    SELECT route_id INTO v_route_id FROM shuttle_schedules WHERE id = p_schedule_id;
  ELSIF p_route_id IS NOT NULL THEN
    v_route_id := p_route_id;
  ELSE
    RAISE EXCEPTION 'Either p_schedule_id or p_route_id must be provided';
  END IF;

  -- 2. Get route info
  SELECT b.base_fare, b.distance_km INTO v_base_fare, v_distance_km FROM shuttle_routes b WHERE b.id = v_route_id;

  -- 3. Check Distance Matrix for override
  IF p_pickup_point_id IS NOT NULL AND p_destination_point_id IS NOT NULL THEN
    SELECT dm.distance_km INTO v_matrix_distance 
    FROM shuttle_distance_matrix dm
    WHERE dm.origin_point_id = p_pickup_point_id AND dm.destination_point_id = p_destination_point_id AND dm.active = true;
    
    IF v_matrix_distance IS NOT NULL THEN
      v_distance_km := v_matrix_distance;
    END IF;
  END IF;

  -- 4. Get pricing rules for the service type
  IF p_service_type_id IS NOT NULL THEN
    SELECT * INTO v_pricing FROM get_current_pricing_for_service(p_service_type_id);
  END IF;
  
  -- Fallback if no specific pricing rule found
  IF v_pricing IS NULL THEN
    v_pricing := ROW(p_service_type_id, 1.0, 0, 1.0, 0);
  END IF;

  -- 5. Get A/B config if variation_id provided
  IF p_variation_id IS NOT NULL THEN
    SELECT config INTO v_ab_config FROM ab_test_variations WHERE id = p_variation_id;
  END IF;

  -- 6. Get Pricing Tier
  IF p_service_type_id IS NOT NULL THEN
    SELECT * INTO v_tier FROM shuttle_pricing_tiers 
    WHERE service_type_id = p_service_type_id 
      AND active = true 
      AND p_seat_count >= min_seats 
      AND (max_seats IS NULL OR p_seat_count <= max_seats)
    ORDER BY min_seats DESC LIMIT 1;
  END IF;

  -- 7. Apply multipliers
  v_base_multiplier := COALESCE((v_ab_config->>'base_price_multiplier')::NUMERIC, v_pricing.base_fare_multiplier, 1.0);
  v_dist_weight := COALESCE((v_ab_config->>'distance_weight')::NUMERIC, v_pricing.distance_cost_per_km, 0);
  v_demand_surge := COALESCE((v_ab_config->>'demand_surge_factor')::NUMERIC, v_pricing.peak_hours_multiplier, 1.0);

  -- 8. Calculate components (multiplied by seat count)
  base_amount := v_base_fare * p_seat_count;
  service_premium := (v_base_fare * (v_base_multiplier - 1.0)) * p_seat_count;
  rayon_surcharge := COALESCE(v_pricing.rayon_base_surcharge, 0) * p_seat_count;
  distance_amount := (COALESCE(v_distance_km, 0) * v_dist_weight) * p_seat_count;
  peak_multiplier := v_demand_surge;
  
  v_subtotal := base_amount + service_premium + rayon_surcharge + distance_amount;
  
  -- 9. Apply Tier Discount/Surcharge
  tier_discount := v_subtotal * (1.0 - COALESCE(v_tier.discount_multiplier, 1.0)) + COALESCE(v_tier.surcharge_fixed, 0);
  
  -- 10. Final Calculation & Rounding (500 IDR)
  total_amount := ROUND(((v_subtotal - tier_discount) * peak_multiplier) / 500) * 500;

  RETURN NEXT;
END;
$$;
