/*
  # Fix Authentication Trigger Issues
  
  1. Changes
     - Drop existing trigger and function
     - Recreate function with proper error handling
     - Create new trigger on auth.users table
     
  2. Security
     - Maintain SECURITY DEFINER for proper execution context
     - Preserve RLS policies
*/

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;

-- Drop the function with CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Recreate the function with improved error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_phone text;
  user_role text := 'customer';
BEGIN
  -- Extract metadata from auth.users record
  SELECT 
    COALESCE(raw_user_meta_data->>'name', email),
    raw_user_meta_data->>'phone'
  INTO user_name, user_phone
  FROM auth.users
  WHERE id = NEW.id;
  
  -- Add comprehensive debug logging
  RAISE LOG 'Creating new user in database - ID: %, Email: %, Name from metadata: %, Phone: %', 
    NEW.id, 
    NEW.email, 
    user_name,
    user_phone;

  -- Insert into users table with proper fields matching the schema
  INSERT INTO public.users (
    id, 
    name,
    email,
    phone,
    role,
    password_hash,
    created_at
  ) VALUES (
    NEW.id,
    user_name,
    NEW.email,
    user_phone,
    user_role,
    'managed_by_supabase_auth',
    NOW()
  );

  -- Only create user_preferences if the table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    INSERT INTO public.user_preferences (
      user_id,
      two_fa_enabled
    ) VALUES (
      NEW.id,
      false
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: % - %', SQLERRM, NEW.raw_user_meta_data;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add helpful comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Handles the creation of a new user in the public.users table when a new user is added to auth.users';