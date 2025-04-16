/*
  # Fix Authentication Loading State

  1. Changes
     - Ensures the trigger function properly extracts user name
     - Improves error handling and robustness
     - Adds error logging for debugging issues

  2. Security
     - Maintains existing RLS policies
*/

-- Improved trigger function for user creation with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_phone text;
BEGIN
  -- Extract name from metadata
  user_name := NEW.raw_user_meta_data->>'name';
  user_phone := NEW.raw_user_meta_data->>'phone';
  
  -- Add debug logging
  RAISE LOG 'Creating new user with ID: %, email: %, name: %, phone: %', 
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
    COALESCE(user_name, NEW.email),
    NEW.email,
    user_phone,
    'customer',
    'managed_by_supabase_auth',
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
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW; -- Still return NEW to avoid blocking auth user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;