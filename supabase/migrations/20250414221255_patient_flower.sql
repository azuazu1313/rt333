/*
  # Fix User Registration Process

  1. Changes
     - Fix the trigger function for user creation
     - Make the function more robust with error handling
     - Ensure compatibility with the existing database schema
     - Add logging for easier debugging

  2. Security
     - Maintain existing RLS policies
     - Ensure proper access control
*/

-- Improved trigger function for new user creation with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text := 'customer';
BEGIN
  -- Add debug logging
  RAISE LOG 'Creating new user with ID: %, email: %, metadata: %', 
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data;

  -- Extract name from metadata or use email as fallback
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
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
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
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW; -- Still return NEW to avoid blocking auth user creation
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for users table
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

CREATE POLICY "Users can view own data" 
  ON public.users 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" 
  ON public.users 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

-- Ensure the same for user_preferences if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_preferences') THEN
    ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
    DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
    
    CREATE POLICY "Users can view their own preferences" 
      ON public.user_preferences 
      FOR SELECT 
      TO authenticated 
      USING (auth.uid() = user_id);
    
    CREATE POLICY "Users can update their own preferences" 
      ON public.user_preferences 
      FOR UPDATE 
      TO authenticated 
      USING (auth.uid() = user_id);
  END IF;
END $$;