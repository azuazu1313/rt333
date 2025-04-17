/*
  # Rename Role Column and Update Policies

  1. Changes
    - Rename users.role to users.user_role
    - Update all policies to use new column name
    - Update trigger function
    - Maintain existing data
    
  2. Security
    - Recreate policies with new column name
    - Maintain existing security model
*/

-- Rename the column
ALTER TABLE public.users RENAME COLUMN role TO user_role;

-- Drop existing policies that reference the old column name
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Recreate policies with new column name
CREATE POLICY "Users can view own data"
ON users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
ON users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users"
ON users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.user_role = 'admin'
  )
);

CREATE POLICY "Admins can update all users"
ON users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.user_role = 'admin'
  )
);

-- Update the trigger function to use new column name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invite_record RECORD;
  assigned_role user_role;
  invite_code text;
BEGIN
  -- Get invite code from metadata if it exists
  invite_code := NEW.raw_user_meta_data->>'invite';
  
  -- Check for valid invite
  IF invite_code IS NOT NULL THEN
    SELECT * INTO invite_record
    FROM invite_links
    WHERE code = invite_code
      AND used_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW());
      
    IF FOUND THEN
      -- Use role from invite
      assigned_role := invite_record.role;
      
      -- Mark invite as used
      UPDATE invite_links
      SET 
        used_at = NOW(),
        used_by = NEW.id
      WHERE id = invite_record.id;
    ELSE
      -- Default to customer if invite is invalid
      assigned_role := 'customer';
    END IF;
  ELSE
    -- Default to customer if no invite
    assigned_role := 'customer';
  END IF;

  -- Insert into users table with proper fields
  INSERT INTO public.users (
    id, 
    name,
    email,
    phone,
    user_role,
    password_hash,
    created_at
  ) VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    assigned_role,
    'managed_by_supabase_auth',
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
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: % - %', SQLERRM, NEW.raw_user_meta_data;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON COLUMN users.user_role IS 'User role in the application (admin, customer, partner, support)';