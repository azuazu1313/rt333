/*
  # Add incident reports functionality
  
  1. New Table
    - `incident_reports` - Stores driver-reported incidents during trips
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `driver_id` (uuid, foreign key to drivers)
      - `incident_type` (text) - Categorization of incidents
      - `description` (text) - Detailed description of the incident
      - `reported_at` (timestamp) - When the report was submitted
      - `location` (text) - Where the incident occurred
      - `resolved` (boolean) - Track if the incident has been addressed
      - `admin_notes` (text) - Internal notes for admins/support
  
  2. Security
    - Enable RLS on the new incident_reports table
    - Add policy for drivers to create reports for their own trips
    - Add policy for drivers to view their own reports
    - Add policy for admins to view and manage all reports
*/

-- Create incident reports table
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id),
  driver_id UUID REFERENCES public.drivers(id),
  incident_type TEXT NOT NULL,
  description TEXT NOT NULL,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  location TEXT,
  resolved BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for incident_reports
CREATE INDEX IF NOT EXISTS incident_reports_trip_id_idx ON public.incident_reports(trip_id);
CREATE INDEX IF NOT EXISTS incident_reports_driver_id_idx ON public.incident_reports(driver_id);
CREATE INDEX IF NOT EXISTS incident_reports_resolved_idx ON public.incident_reports(resolved);

-- Enable RLS on incident_reports table
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Create a helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT user_role = 'admin' 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for incident reports
CREATE POLICY "Drivers can create reports for their trips"
ON public.incident_reports
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM drivers
    WHERE drivers.user_id = auth.uid()
    AND drivers.id = incident_reports.driver_id
  )
);

CREATE POLICY "Drivers can view their own reports"
ON public.incident_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM drivers
    WHERE drivers.user_id = auth.uid()
    AND drivers.id = incident_reports.driver_id
  )
);

CREATE POLICY "Admin and support can view all reports"
ON public.incident_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.user_role = 'admin' OR users.user_role = 'support')
  )
);

CREATE POLICY "Admin can update reports"
ON public.incident_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.user_role = 'admin'
  )
);