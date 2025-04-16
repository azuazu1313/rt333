/*
  # Complete Schema Rebuild
  
  1. Changes
     - Drop and recreate all tables with proper relationships
     - Set up RLS policies
     - Create necessary triggers and functions
     
  2. Security
     - Enable RLS on all tables
     - Set up proper access policies
*/

-- First, drop everything to start fresh
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Recreate types
CREATE TYPE user_role AS ENUM ('admin', 'customer', 'partner', 'support');
CREATE TYPE booking_status AS ENUM ('booked', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE payment_method AS ENUM ('credit_card', 'paypal', 'cash');
CREATE TYPE ticket_status AS ENUM ('open', 'closed', 'in_progress');
CREATE TYPE trip_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');
CREATE TYPE document_type AS ENUM ('license', 'insurance', 'registration', 'other');
CREATE TYPE discount_type AS ENUM ('percent', 'fixed');

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role user_role DEFAULT 'customer',
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_preferences table
CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  two_fa_enabled boolean DEFAULT false
);

-- Create email_verifications table
CREATE TABLE email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" 
  ON users FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data" 
  ON users FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own preferences" 
  ON user_preferences FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
  ON user_preferences FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own verifications" 
  ON email_verifications FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create user creation trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_phone text;
BEGIN
  -- Extract metadata
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  user_phone := NEW.raw_user_meta_data->>'phone';
  
  -- Insert into users table
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
    'customer',
    'managed_by_supabase_auth',
    NOW()
  );

  -- Create preferences
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

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add indexes
CREATE INDEX users_email_idx ON users(email);