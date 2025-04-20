/*
  # Fix is_admin function for RLS policies

  1. Updates
     - Update the is_admin() function to properly check JWT claims
     - Make sure it correctly handles both user_role claims and direct role checks
     - Add additional diagnostic function to help debug JWT claims
*/

-- Update the is_admin function in place without dropping it
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- First check the JWT claims for user_role = 'admin'
  SELECT 
    CASE 
      -- Check JWT claims - method 1 (role from auth.jwt())
      WHEN EXISTS (
        SELECT 1
        FROM auth.jwt() AS jwt
        WHERE jwt->>'role' = 'admin'
      ) THEN TRUE
      
      -- Check JWT claims - method 2 (user_role claim)
      WHEN EXISTS (
        SELECT 1
        FROM auth.jwt() AS jwt
        WHERE jwt->'user_metadata'->>'user_role' = 'admin'
      ) THEN TRUE
      
      -- Check JWT claims - method 3 (user_role from custom_claims or app_metadata)
      WHEN EXISTS (
        SELECT 1
        FROM auth.jwt() AS jwt
        WHERE 
          (jwt->'app_metadata'->>'user_role' = 'admin') OR
          (jwt->'custom_claims'->>'user_role' = 'admin')
      ) THEN TRUE
      
      -- Check users table directly
      WHEN EXISTS (
        SELECT 1
        FROM users
        WHERE 
          id = auth.uid() AND
          user_role = 'admin' AND
          (is_suspended IS NULL OR is_suspended = false)
      ) THEN TRUE
      
      -- Fall back to FALSE if none of the above are true
      ELSE FALSE
    END;
$$;

-- Create a debugging function to view a user's auth JWT
CREATE OR REPLACE FUNCTION public.debug_jwt()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.jwt();
$$;

-- Add a comment to the is_admin function to explain its purpose
COMMENT ON FUNCTION public.is_admin() IS 'Checks if the current user has admin role through JWT claims or direct database lookup';

-- Add a comment to the debug_jwt function
COMMENT ON FUNCTION public.debug_jwt() IS 'Returns the current user''s JWT claims for debugging purposes';