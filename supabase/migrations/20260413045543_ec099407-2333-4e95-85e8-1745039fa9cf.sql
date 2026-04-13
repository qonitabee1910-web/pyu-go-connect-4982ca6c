
-- Add email column to drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS email TEXT;

-- Update handle_new_user to populate email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_driver BOOLEAN;
  v_phone TEXT;
  v_license TEXT;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Check if registering as driver (support both keys)
  v_is_driver := COALESCE(
    (NEW.raw_user_meta_data->>'is_driver')::boolean,
    (NEW.raw_user_meta_data->>'isDriver')::boolean,
    false
  );
  
  IF v_is_driver THEN
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
    v_license := COALESCE(NEW.raw_user_meta_data->>'license_number', '');
    
    INSERT INTO public.drivers (user_id, full_name, phone, license_number, email, status, is_verified)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      v_phone,
      v_license,
      NEW.email,
      'offline',
      false
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'moderator')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Update handle_user_update to sync email
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
    updated_at = now()
  WHERE user_id = NEW.id;

  UPDATE public.drivers
  SET 
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
    email = COALESCE(NEW.email, email),
    updated_at = now()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$;
