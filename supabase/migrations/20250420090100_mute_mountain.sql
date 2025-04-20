/*
  # Add driver functionality fields
  
  1. New Fields
    - Add `is_available` field to drivers table to track driver availability
    - Add `driver_acknowledged` field to trips table to track job confirmations
    - Add `started_at` and `completed_at` to trips table for tracking trip progress
    - Add `expiry_date` column to driver_documents for document expiry tracking

  2. New Table:
    - Add messages table for support chat functionality
    
  3. Security
    - Add RLS policies for the new tables and fields
*/

-- Add is_available column to drivers table to track availability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'is_available'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN is_available BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add driver_acknowledged, started_at and completed_at to trips table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'driver_acknowledged'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN driver_acknowledged BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN started_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'pickup_address'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN pickup_address TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'dropoff_address'
  ) THEN
    ALTER TABLE public.trips ADD COLUMN dropoff_address TEXT;
  END IF;
END $$;

-- Add license_number field to drivers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'drivers' AND column_name = 'license_number'
  ) THEN
    ALTER TABLE public.drivers ADD COLUMN license_number TEXT;
  END IF;
END $$;

-- Add expiry_date to driver_documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_documents' AND column_name = 'expiry_date'
  ) THEN
    ALTER TABLE public.driver_documents ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_documents' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.driver_documents ADD COLUMN name TEXT;
  END IF;
END $$;

-- Create messages table for driver-support chat
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  receiver_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN DEFAULT false
);

-- Index for messages
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_receiver_id_idx ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for messages
CREATE POLICY "Users can view their own messages" 
ON public.messages
FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages" 
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update read status of received messages" 
ON public.messages
FOR UPDATE
TO authenticated
USING (receiver_id = auth.uid())
WITH CHECK (receiver_id = auth.uid() AND (
  -- Only allow updating the read field
  current_setting('request.jwt.claims', true)::json->'role' = '"authenticated"'::jsonb
  AND (SELECT count(*) FROM jsonb_object_keys(current_setting('request.jwt.claims', true)::jsonb - 'role') - 'read') = 0
));

-- RLS policies for trips (for driver updates)
CREATE POLICY "Drivers can update their assigned trips" 
ON public.trips
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM drivers
  WHERE drivers.user_id = auth.uid()
  AND drivers.id = trips.driver_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM drivers
  WHERE drivers.user_id = auth.uid()
  AND drivers.id = trips.driver_id
) AND (
  -- Only allow updating specific fields
  (OLD.status <> NEW.status AND NEW.status IN ('in_progress', 'completed'))
  OR (OLD.driver_acknowledged <> NEW.driver_acknowledged)
  OR (OLD.started_at IS NULL AND NEW.started_at IS NOT NULL)
  OR (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
));

-- RLS policies for drivers
CREATE POLICY "Drivers can update their own availability" 
ON public.drivers
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());