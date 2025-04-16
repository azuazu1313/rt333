/*
  # Clean Up Duplicate Triggers and Functions
  
  1. Changes
     - Removes duplicate triggers on auth.users table
     - Keeps only the latest version of the handle_new_user function
     - Re-creates the trigger with the most recent function definition
     
  2. Security
     - Maintains existing RLS policies
     - Ensures proper authentication flow
*/

-- First, drop the existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the latest handle_new_user function (from smooth_portal migration)
-- but drop any older versions that might exist with the same name
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
    'managed_by_supabase_auth', -- Actual password is handled by Supabase Auth
    NOW()
  );

  -- Only create user_preferences if the table exists
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    -- Create user preferences entry
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
    RETURN NEW; -- Still return NEW to avoid blocking auth user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new trigger with the correct function
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add a helpful validation query that can be run to verify the trigger exists
COMMENT ON FUNCTION public.handle_new_user() IS 'Handles the creation of a new user in the public.users table when a new user is added to auth.users';

-- Run the following to check if your trigger is properly set up:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';