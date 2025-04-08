/*
  # Airport Transfer Database Setup

  1. New Tables
     - `users` - Extension of Supabase auth.users with role information
     - `profiles` - User profile information
     - `vehicles` - Vehicle information
     - `bookings` - Booking records
     - `payments` - Payment records
     - `support_tickets` - Customer support tickets

  2. Security
     - Enable RLS on all tables
     - Create policies for authenticated users to access their own data
     - Create policies for partners to access relevant vehicle and booking data
     - Create policies for admin and support roles to access appropriate data

  3. Indices
     - Create indices on frequently queried fields
     - Set up proper relationships between tables
*/

-- Create custom types for enumeration fields
CREATE TYPE user_role AS ENUM ('admin', 'customer', 'partner', 'support');
CREATE TYPE booking_status AS ENUM ('booked', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE payment_method AS ENUM ('credit_card', 'paypal', 'cash');
CREATE TYPE ticket_status AS ENUM ('open', 'closed', 'in_progress');

-- Extend the users table from auth schema
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  profile_pic text,
  created_at timestamptz DEFAULT now()
);

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  license_plate text UNIQUE NOT NULL,
  capacity integer NOT NULL,
  availability boolean NOT NULL DEFAULT true,
  rate_per_km decimal(10, 2) NOT NULL,
  owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  pickup_location text NOT NULL,
  dropoff_location text NOT NULL,
  pickup_time timestamptz NOT NULL,
  status booking_status NOT NULL DEFAULT 'booked',
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status ticket_status NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS bookings_user_id_idx ON bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_pickup_time_idx ON bookings (pickup_time);
CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments (booking_id);
CREATE INDEX IF NOT EXISTS vehicles_owner_id_idx ON vehicles (owner_id);
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets (user_id);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all user data"
  ON users
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for profiles table
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for vehicles table
CREATE POLICY "Public can view available vehicles"
  ON vehicles
  FOR SELECT
  USING (availability = true);

CREATE POLICY "Partners can manage their own vehicles"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id AND auth.jwt() ->> 'role' = 'partner');

CREATE POLICY "Admins can manage all vehicles"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for bookings table
CREATE POLICY "Users can view their own bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners can view bookings for their vehicles"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM vehicles 
    WHERE vehicles.id = bookings.vehicle_id 
    AND vehicles.owner_id = auth.uid()
  ));

CREATE POLICY "Admins and support can manage all bookings"
  ON bookings
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'support'));

-- Create RLS policies for payments table
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = payments.booking_id 
    AND bookings.user_id = auth.uid()
  ));

CREATE POLICY "Partners can view payments for their bookings"
  ON payments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bookings 
    JOIN vehicles ON bookings.vehicle_id = vehicles.id
    WHERE bookings.id = payments.booking_id 
    AND vehicles.owner_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create RLS policies for support tickets table
CREATE POLICY "Users can view and create their own support tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own support tickets"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Support and admins can manage all support tickets"
  ON support_tickets
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IN ('admin', 'support'));

-- Create a function to handle user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, role, created_at)
  VALUES (NEW.id, NEW.email, 'customer', NEW.created_at);
  
  INSERT INTO profiles (user_id, first_name, last_name)
  VALUES (NEW.id, '', '');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically handle new users from auth schema
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create a function to update updated_at column for support tickets
CREATE OR REPLACE FUNCTION update_ticket_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_modified_column();