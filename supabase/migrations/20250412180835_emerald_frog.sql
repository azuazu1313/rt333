/*
  # Updated Database Schema for Transfer System
  
  This migration creates the core schema for the transfer system while handling
  existing types safely.
*/

-- Create ENUM types if they don't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'customer', 'driver', 'support');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('credit_card', 'paypal', 'cash');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM ('license', 'insurance', 'registration', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS zendesk_tickets CASCADE;
DROP TABLE IF EXISTS driver_reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS trip_offers CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS driver_documents CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS user_promos CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;
DROP TABLE IF EXISTS surge_pricing CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create tables
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  role user_role DEFAULT 'customer',
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE email_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false
);

CREATE TABLE user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  two_fa_enabled boolean DEFAULT false
);

CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id),
  referred_id uuid REFERENCES users(id),
  referral_code text NOT NULL,
  used_at timestamptz
);

CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  polygon_data jsonb NOT NULL,
  base_fare decimal(10,2) NOT NULL,
  price_per_km decimal(10,2) NOT NULL,
  price_per_min decimal(10,2) NOT NULL
);

CREATE TABLE surge_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE,
  multiplier decimal(3,2) NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL
);

CREATE TABLE promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type discount_type NOT NULL,
  discount_value decimal(10,2) NOT NULL,
  usage_limit integer,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  active boolean DEFAULT true
);

CREATE TABLE user_promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  promo_id uuid REFERENCES promo_codes(id) ON DELETE CASCADE,
  used_at timestamptz
);

CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE,
  doc_type document_type NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  verified boolean DEFAULT false
);

CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE,
  make text NOT NULL,
  model text NOT NULL,
  capacity integer NOT NULL,
  plate_number text UNIQUE NOT NULL
);

CREATE TABLE trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id),
  pickup_zone_id uuid REFERENCES zones(id),
  dropoff_zone_id uuid REFERENCES zones(id),
  estimated_distance_km decimal(10,2),
  estimated_duration_min integer,
  estimated_price decimal(10,2),
  surge_multiplier decimal(3,2) DEFAULT 1.0,
  promo_id uuid REFERENCES promo_codes(id),
  promo_discount decimal(10,2) DEFAULT 0,
  status trip_status DEFAULT 'pending',
  datetime timestamptz NOT NULL,
  scheduled_for timestamptz,
  is_scheduled boolean DEFAULT false
);

CREATE TABLE trip_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES drivers(id),
  offered_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  status trip_status DEFAULT 'pending'
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  amount decimal(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  paid_at timestamptz
);

CREATE TABLE driver_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  driver_id uuid REFERENCES drivers(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE zendesk_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zendesk_ticket_id text NOT NULL,
  user_id uuid REFERENCES users(id),
  trip_id uuid REFERENCES trips(id),
  created_at timestamptz DEFAULT now(),
  status ticket_status DEFAULT 'open'
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE surge_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE zendesk_tickets ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS trips_user_id_idx ON trips(user_id);
CREATE INDEX IF NOT EXISTS trips_driver_id_idx ON trips(driver_id);
CREATE INDEX IF NOT EXISTS payments_trip_id_idx ON payments(trip_id);
CREATE INDEX IF NOT EXISTS driver_reviews_driver_id_idx ON driver_reviews(driver_id);

-- Basic RLS policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user preferences
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();