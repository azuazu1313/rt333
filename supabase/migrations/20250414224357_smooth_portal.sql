/*
  # Fix User Authentication Database Integration

  This migration addresses issues with user data not being persisted correctly
  during registration and resolves problems with the authentication trigger function.

  1. Changes
     - Completely rewrites the user creation trigger function to ensure proper data extraction
     - Explicitly handles user metadata to store name and phone
     - Improves error logging
     - Ensures proper database record creation on signup

  2. Security
     - Maintains existing RLS policies
     - Uses SECURITY DEFINER for proper execution context
*/

-- Improved trigger function for user creation that properly handles metadata
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

-- Ensure we drop any existing trigger before creating a new one to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the users table has RLS enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'users' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Add debug function to show raw user metadata for troubleshooting
CREATE OR REPLACE FUNCTION debug_user_metadata(user_id uuid) 
RETURNS json AS $$
DECLARE
  user_meta json;
BEGIN
  SELECT raw_user_meta_data INTO user_meta 
  FROM auth.users 
  WHERE id = user_id;
  RETURN user_meta;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;