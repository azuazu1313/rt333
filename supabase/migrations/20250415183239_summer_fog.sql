/*
  # Restore Missing Tables

  1. New Tables
    - trips: For storing trip/booking information
    - payments: For storing payment records

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for data access
*/

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  driver_id uuid REFERENCES users(id),
  pickup_zone_id uuid,
  dropoff_zone_id uuid,
  estimated_distance_km numeric,
  estimated_duration_min integer,
  estimated_price numeric,
  surge_multiplier numeric DEFAULT 1.0,
  promo_id uuid,
  promo_discount numeric,
  status trip_status DEFAULT 'pending',
  datetime timestamptz NOT NULL,
  scheduled_for timestamptz,
  is_scheduled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id),
  user_id uuid REFERENCES users(id),
  amount numeric NOT NULL,
  payment_method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Trips policies
CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX trips_user_id_idx ON trips(user_id);
CREATE INDEX trips_driver_id_idx ON trips(driver_id);
CREATE INDEX trips_status_idx ON trips(status);
CREATE INDEX payments_trip_id_idx ON payments(trip_id);
CREATE INDEX payments_user_id_idx ON payments(user_id);
CREATE INDEX payments_status_idx ON payments(status);

-- Add helpful comments
COMMENT ON TABLE trips IS 'Stores all trip/booking information';
COMMENT ON TABLE payments IS 'Stores all payment records';