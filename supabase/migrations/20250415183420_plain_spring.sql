/*
  # Complete Database Schema

  1. New Tables
    - Drivers: For driver-specific information
    - Vehicles: For vehicle information
    - DriverDocuments: For driver document storage
    - TripOffers: For trip offer management
    - Zones: For geographical zones
    - SurgePricing: For dynamic pricing
    - PromoCodes: For promotion management
    - UserPromos: For user-promo relationships
    - DriverReviews: For driver ratings and reviews
    - ZendeskTickets: For customer support tickets
    - Referrals: For referral tracking

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Create Drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  vehicle_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id),
  make text NOT NULL,
  model text NOT NULL,
  capacity integer NOT NULL,
  plate_number text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key from Drivers to Vehicles after both tables exist
ALTER TABLE drivers ADD FOREIGN KEY (vehicle_id) REFERENCES vehicles(id);

-- Create DriverDocuments table
CREATE TABLE IF NOT EXISTS driver_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id),
  doc_type document_type NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  verified boolean DEFAULT false
);

-- Create Zones table
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  polygon_data jsonb NOT NULL,
  base_fare numeric NOT NULL,
  price_per_km numeric NOT NULL,
  price_per_min numeric NOT NULL
);

-- Create SurgePricing table
CREATE TABLE IF NOT EXISTS surge_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id),
  multiplier numeric NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL
);

-- Create PromoCodes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type discount_type NOT NULL,
  discount_value numeric NOT NULL,
  usage_limit integer,
  valid_from timestamptz NOT NULL,
  valid_until timestamptz,
  active boolean DEFAULT true
);

-- Create UserPromos table
CREATE TABLE IF NOT EXISTS user_promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  promo_id uuid REFERENCES promo_codes(id),
  used_at timestamptz DEFAULT now()
);

-- Create DriverReviews table
CREATE TABLE IF NOT EXISTS driver_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id),
  user_id uuid REFERENCES users(id),
  driver_id uuid REFERENCES drivers(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamptz DEFAULT now()
);

-- Create ZendeskTickets table
CREATE TABLE IF NOT EXISTS zendesk_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zendesk_ticket_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES users(id),
  trip_id uuid REFERENCES trips(id),
  created_at timestamptz DEFAULT now(),
  status ticket_status DEFAULT 'open'
);

-- Create Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES users(id),
  referred_id uuid REFERENCES users(id),
  referral_code text NOT NULL UNIQUE,
  used_at timestamptz DEFAULT now()
);

-- Create TripOffers table
CREATE TABLE IF NOT EXISTS trip_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id),
  driver_id uuid REFERENCES drivers(id),
  offered_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  status text CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'))
);

-- Enable RLS on all tables
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE surge_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE zendesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_offers ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Drivers can view own data"
  ON drivers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can view own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM drivers WHERE drivers.id = vehicles.driver_id AND drivers.user_id = auth.uid()
  ));

CREATE POLICY "Drivers can view own documents"
  ON driver_documents FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM drivers WHERE drivers.id = driver_documents.driver_id AND drivers.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own reviews"
  ON driver_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reviews for completed trips"
  ON driver_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM trips 
      WHERE trips.id = trip_id 
      AND trips.user_id = auth.uid()
      AND trips.status = 'completed'
    )
  );

CREATE POLICY "Users can view own tickets"
  ON zendesk_tickets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Add indexes for better performance
CREATE INDEX drivers_user_id_idx ON drivers(user_id);
CREATE INDEX vehicles_driver_id_idx ON vehicles(driver_id);
CREATE INDEX driver_documents_driver_id_idx ON driver_documents(driver_id);
CREATE INDEX surge_pricing_zone_id_idx ON surge_pricing(zone_id);
CREATE INDEX user_promos_user_id_idx ON user_promos(user_id);
CREATE INDEX driver_reviews_trip_id_idx ON driver_reviews(trip_id);
CREATE INDEX driver_reviews_driver_id_idx ON driver_reviews(driver_id);
CREATE INDEX zendesk_tickets_user_id_idx ON zendesk_tickets(user_id);
CREATE INDEX referrals_referrer_id_idx ON referrals(referrer_id);
CREATE INDEX referrals_referred_id_idx ON referrals(referred_id);
CREATE INDEX trip_offers_trip_id_idx ON trip_offers(trip_id);
CREATE INDEX trip_offers_driver_id_idx ON trip_offers(driver_id);

-- Add helpful comments
COMMENT ON TABLE drivers IS 'Stores driver information';
COMMENT ON TABLE vehicles IS 'Stores vehicle information';
COMMENT ON TABLE driver_documents IS 'Stores driver document information';
COMMENT ON TABLE zones IS 'Stores geographical zone information';
COMMENT ON TABLE surge_pricing IS 'Stores dynamic pricing information';
COMMENT ON TABLE promo_codes IS 'Stores promotion codes';
COMMENT ON TABLE user_promos IS 'Tracks user promotion usage';
COMMENT ON TABLE driver_reviews IS 'Stores driver ratings and reviews';
COMMENT ON TABLE zendesk_tickets IS 'Stores customer support tickets';
COMMENT ON TABLE referrals IS 'Tracks user referrals';
COMMENT ON TABLE trip_offers IS 'Stores trip offers from drivers';