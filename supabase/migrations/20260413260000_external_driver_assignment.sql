-- Migration to add external driver information to shuttle bookings or rides
-- This supports cases where a driver is assigned manually with name and plate number

-- 1. Add external driver columns to rides table
ALTER TABLE public.rides
ADD COLUMN IF NOT EXISTS external_driver_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS external_driver_plate VARCHAR(15);

-- 2. Add external driver columns to shuttle_bookings table (for pickup assignment)
ALTER TABLE public.shuttle_bookings
ADD COLUMN IF NOT EXISTS pickup_driver_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS pickup_driver_plate VARCHAR(15),
ADD COLUMN IF NOT EXISTS pickup_status TEXT CHECK (pickup_status IN ('pending', 'assigned', 'picked_up', 'completed')) DEFAULT 'pending';

-- 3. Create a table for managing "External/Quick Drivers" if they need to be reused
CREATE TABLE IF NOT EXISTS public.external_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    plate_number VARCHAR(15) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_drivers ENABLE ROW LEVEL SECURITY;

-- Admin only policies
CREATE POLICY "Admins can manage external drivers" ON public.external_drivers
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Public viewable (optional, depending on requirements)
CREATE POLICY "External drivers viewable by authenticated users" ON public.external_drivers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_external_drivers_updated_at 
    BEFORE UPDATE ON public.external_drivers 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
