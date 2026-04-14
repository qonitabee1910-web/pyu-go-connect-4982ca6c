-- Fix shuttle RLS policies to use public.has_role() instead of JWT claims
-- The JWT claims approach doesn't work because user_role is never set in the JWT token
-- The correct approach is to query the user_roles table using has_role() function

-- ============ shuttle_service_vehicle_types ============
DROP POLICY IF EXISTS "admin_manage_service_vehicle_types" ON shuttle_service_vehicle_types;
DROP POLICY IF EXISTS "public_read_active_service_vehicle_types" ON shuttle_service_vehicle_types;

-- Public can read active service-vehicle types
CREATE POLICY "public_read_active_service_vehicle_types"
    ON shuttle_service_vehicle_types
    FOR SELECT
    USING (active = true);

-- Admins can manage all
CREATE POLICY "admin_manage_service_vehicle_types"
    ON shuttle_service_vehicle_types
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ shuttle_pricing_rules ============
DROP POLICY IF EXISTS "admin_manage_pricing_rules" ON shuttle_pricing_rules;
DROP POLICY IF EXISTS "public_read_active_pricing_rules" ON shuttle_pricing_rules;

-- Public can read active pricing rules (for UI display)
CREATE POLICY "public_read_active_pricing_rules"
    ON shuttle_pricing_rules
    FOR SELECT
    USING (
        active = true 
        AND effective_date <= CURRENT_DATE
    );

-- Admins can manage pricing
CREATE POLICY "admin_manage_pricing_rules"
    ON shuttle_pricing_rules
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ shuttle_schedule_services ============
DROP POLICY IF EXISTS "admin_manage_schedule_services" ON shuttle_schedule_services;
DROP POLICY IF EXISTS "public_read_schedule_services" ON shuttle_schedule_services;

-- Public can read schedule services
CREATE POLICY "public_read_schedule_services"
    ON shuttle_schedule_services
    FOR SELECT
    USING (true);

-- Admins and moderators can manage
CREATE POLICY "admin_manage_schedule_services"
    ON shuttle_schedule_services
    FOR ALL
    USING (
        public.has_role(auth.uid(), 'admin'::app_role) 
        OR public.has_role(auth.uid(), 'moderator'::app_role)
    )
    WITH CHECK (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'moderator'::app_role)
    );
