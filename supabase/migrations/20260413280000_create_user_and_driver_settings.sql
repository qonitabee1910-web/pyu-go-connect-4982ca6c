-- Fix data integrity: drivers.user_id should be unique and not null
ALTER TABLE public.drivers
  ADD CONSTRAINT drivers_user_id_key UNIQUE (user_id);

ALTER TABLE public.drivers 
  ALTER COLUMN user_id SET NOT NULL;

-- Create user settings table for preferences and configurations
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'id', 'es', 'fr')),
  currency TEXT NOT NULL DEFAULT 'IDR' CHECK (currency IN ('IDR', 'USD', 'SGD')),
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  notification_email BOOLEAN NOT NULL DEFAULT true,
  notification_push BOOLEAN NOT NULL DEFAULT true,
  notification_sms BOOLEAN NOT NULL DEFAULT false,
  notification_promotions BOOLEAN NOT NULL DEFAULT true,
  notification_ride_updates BOOLEAN NOT NULL DEFAULT true,
  privacy_show_profile BOOLEAN NOT NULL DEFAULT true,
  privacy_show_location BOOLEAN NOT NULL DEFAULT false,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  data_sharing_analytics BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create driver settings table for driver-specific configurations
CREATE TABLE IF NOT EXISTS public.driver_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL UNIQUE REFERENCES public.drivers(id) ON DELETE CASCADE,
  working_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  working_hours_start TIME,
  working_hours_end TIME,
  available_monday BOOLEAN NOT NULL DEFAULT true,
  available_tuesday BOOLEAN NOT NULL DEFAULT true,
  available_wednesday BOOLEAN NOT NULL DEFAULT true,
  available_thursday BOOLEAN NOT NULL DEFAULT true,
  available_friday BOOLEAN NOT NULL DEFAULT true,
  available_saturday BOOLEAN NOT NULL DEFAULT true,
  available_sunday BOOLEAN NOT NULL DEFAULT false,
  service_area_radius_km INTEGER NOT NULL DEFAULT 50 CHECK (service_area_radius_km > 0),
  auto_accept_rides BOOLEAN NOT NULL DEFAULT false,
  auto_accept_timeout_seconds INTEGER NOT NULL DEFAULT 10 CHECK (auto_accept_timeout_seconds >= 5),
  preferred_payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (preferred_payment_method IN ('cash', 'wallet', 'card')),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enhance profiles table with additional user information
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', null)),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Indonesia',
  ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Indonesian',
  ADD COLUMN IF NOT EXISTS id_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Enhance drivers table with document expiry tracking
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS sim_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS sim_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ktp_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', null)),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Create table for driver document uploads and verification audit trail
CREATE TABLE IF NOT EXISTS public.driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('sim', 'ktp', 'stnk', 'insurance', 'other')),
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  expiry_date DATE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(driver_id, document_type)
);

-- Create table for vehicle documents and verification
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('stnk', 'insurance', 'tax_paid')),
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
  expiry_date DATE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, document_type)
);

-- Enable RLS for new tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
CREATE POLICY "Users can view and update their own settings"
  ON public.user_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for driver_settings
CREATE POLICY "Drivers can view and update their own settings"
  ON public.driver_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_settings.driver_id AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_settings.driver_id AND d.user_id = auth.uid()
    )
  );

-- RLS Policies for driver_documents
CREATE POLICY "Drivers can view their own documents"
  ON public.driver_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_documents.driver_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can upload their own documents"
  ON public.driver_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.id = driver_documents.driver_id AND d.user_id = auth.uid()
    )
  );

-- RLS Policies for vehicle_documents
CREATE POLICY "Drivers can manage their vehicle documents"
  ON public.vehicle_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      INNER JOIN public.drivers d ON d.id = v.driver_id
      WHERE v.id = vehicle_documents.vehicle_id AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      INNER JOIN public.drivers d ON d.id = v.driver_id
      WHERE v.id = vehicle_documents.vehicle_id AND d.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_settings_driver_id ON public.driver_settings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON public.driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON public.driver_documents(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_status ON public.vehicle_documents(status);

-- Create triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER driver_settings_updated_at
BEFORE UPDATE ON public.driver_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER driver_documents_updated_at
BEFORE UPDATE ON public.driver_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER vehicle_documents_updated_at
BEFORE UPDATE ON public.vehicle_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
