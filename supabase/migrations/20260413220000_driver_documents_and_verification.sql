
-- Add document columns to drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS ktp_number TEXT,
ADD COLUMN IF NOT EXISTS ktp_url TEXT,
ADD COLUMN IF NOT EXISTS sim_url TEXT,
ADD COLUMN IF NOT EXISTS vehicle_stnk_url TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add a more granular verification status if needed, or stick with is_verified
-- Let's add a status enum for registration
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status') THEN
    CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS registration_status public.registration_status DEFAULT 'pending';

-- Update storage policies to allow drivers to upload their documents
-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents (Private, only owner and admins can access)
CREATE POLICY "Users can upload their own documents" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" ON storage.objects 
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin access (assuming role 'admin' exists in user_roles)
CREATE POLICY "Admins can view all documents" ON storage.objects 
  FOR SELECT USING (
    bucket_id = 'documents' AND 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
