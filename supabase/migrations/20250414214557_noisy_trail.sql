/*
  # Fix Auth System Integration

  1. New Functionality
    - Create a proper trigger to handle new user registration
    - Set up Row Level Security for user-related tables
    - Ensure compatibility with existing schema

  2. Security
    - Add policies for authenticated users to manage their own data
    - Protect sensitive fields from unauthorized access
*/

-- First, let's make sure we have the right trigger function for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table with proper fields matching the schema
  INSERT INTO public.users (
    id, 
    name,
    email,
    password_hash,
    role,
    created_at
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    'managed_by_supabase_auth', -- Actual password is handled by Supabase Auth
    'customer',
    NOW()
  );

  -- Create user preferences entry
  INSERT INTO public.user_preferences (
    user_id,
    two_fa_enabled
  ) VALUES (
    NEW.id,
    false
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists to avoid duplication errors
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Now let's set up Row Level Security for key tables

-- Enable RLS on users table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'users' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Remove existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- Create policies for users table
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

-- Enable RLS on user_preferences table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'user_preferences' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;

-- Create policies for user_preferences table
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

-- Enable RLS on email_verifications table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'email_verifications' AND rowsecurity = true
  ) THEN
    ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Remove existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own verifications" ON public.email_verifications;

-- Create policy for email_verifications table
CREATE POLICY "Users can view their own verifications" 
  ON public.email_verifications 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);