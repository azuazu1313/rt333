/*
  # Fix Permission Issues for Public Schema

  1. Changes
     - Grant necessary permissions to authenticated and anon roles
     - Fix RLS policies for users and user_preferences tables
     - Ensure proper access control while maintaining security

  2. Security
     - Only allow users to access their own data
     - Maintain row-level security
*/

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to users table
GRANT SELECT ON public.users TO anon, authenticated;
GRANT UPDATE ON public.users TO authenticated;

-- Grant access to user_preferences table
GRANT SELECT ON public.user_preferences TO anon, authenticated;
GRANT UPDATE ON public.user_preferences TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;

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

-- Add helpful comment
COMMENT ON SCHEMA public IS 'Schema containing all application tables with proper RLS policies';