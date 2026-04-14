-- Create shuttle_booking_audit table for tracking changes
CREATE TABLE IF NOT EXISTS public.shuttle_booking_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.shuttle_bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shuttle_booking_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
    ON public.shuttle_booking_audit
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Anyone can insert audit logs via service logic (security via function/service)
CREATE POLICY "Service can insert audit logs"
    ON public.shuttle_booking_audit
    FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE public.shuttle_booking_audit IS 'Audit trail for shuttle booking changes';
