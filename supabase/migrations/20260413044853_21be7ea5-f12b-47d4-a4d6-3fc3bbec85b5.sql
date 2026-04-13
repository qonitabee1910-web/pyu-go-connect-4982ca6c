-- 1. Update handle_new_user to auto-assign roles and create driver records
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

  -- Check if registering as driver
  v_is_driver := COALESCE((NEW.raw_user_meta_data->>'is_driver')::boolean, false);
  
  IF v_is_driver THEN
    -- Create driver record
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
    v_license := COALESCE(NEW.raw_user_meta_data->>'license_number', '');
    
    INSERT INTO public.drivers (user_id, full_name, phone, license_number, status, is_verified)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      v_phone,
      v_license,
      'offline',
      false
    );
    
    -- Assign driver role (moderator)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'moderator')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Remove dangerous "Users can insert own role" policy (privilege escalation)
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;