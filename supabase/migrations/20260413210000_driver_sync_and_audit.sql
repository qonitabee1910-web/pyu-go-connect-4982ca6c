
-- 1. Create audit_logs table if not exists (already exists based on types.ts, but let's ensure structure)
-- Based on types.ts, it has: id, table_name, record_id, action, old_data, new_data, changed_by, created_at

-- 2. Function to log changes to drivers table
CREATE OR REPLACE FUNCTION public.log_driver_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES ('drivers', OLD.id::text, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid()::text);
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
    VALUES ('drivers', NEW.id::text, 'INSERT', to_jsonb(NEW), auth.uid()::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for driver logging
DROP TRIGGER IF EXISTS on_driver_change ON public.drivers;
CREATE TRIGGER on_driver_change
AFTER INSERT OR UPDATE ON public.drivers
FOR EACH ROW EXECUTE FUNCTION public.log_driver_changes();

-- 4. Function to sync auth.users metadata to public.profiles and public.drivers
-- This ensures that when a user updates their profile in Auth, it reflects everywhere
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles
  UPDATE public.profiles
  SET 
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
    updated_at = now()
  WHERE user_id = NEW.id;

  -- Update drivers (if exists)
  UPDATE public.drivers
  SET 
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
    updated_at = now()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger for auth.users update
-- Note: Triggering on auth.users requires superuser or specific permissions in Supabase
-- Usually, we trigger on public tables, but for metadata sync, this is common.
-- If auth.users trigger is restricted, we'll handle sync in the application layer or via public.profiles trigger.
-- Let's stick to public.profiles trigger for better compatibility if auth.users is restricted.

CREATE OR REPLACE FUNCTION public.sync_profile_to_driver()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.drivers
  SET 
    full_name = NEW.full_name,
    phone = NEW.phone,
    avatar_url = NEW.avatar_url,
    gender = NEW.gender,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update_sync_driver ON public.profiles;
CREATE TRIGGER on_profile_update_sync_driver
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.sync_profile_to_driver();

-- 6. Ensure unique constraints for data validation
-- Prevent duplicate phone numbers in drivers table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drivers_phone_key') THEN
    ALTER TABLE public.drivers ADD CONSTRAINT drivers_phone_key UNIQUE (phone);
  END IF;
END $$;

-- Prevent duplicate license numbers
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drivers_license_number_key') THEN
    ALTER TABLE public.drivers ADD CONSTRAINT drivers_license_number_key UNIQUE (license_number);
  END IF;
END $$;
