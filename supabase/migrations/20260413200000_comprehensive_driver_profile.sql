
-- Add missing columns for comprehensive driver profile
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS prefers_bike BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS prefers_bike_women BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS prefers_car BOOLEAN NOT NULL DEFAULT true;

-- Add a table for OTP verification if not exists (for email/phone change)
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'phone')),
  target TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);

ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own OTPs" ON public.otp_verifications 
  FOR ALL USING (auth.uid() = user_id);

-- Update vehicles table to include more details
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Create storage bucket for avatars if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
