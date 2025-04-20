/*
  # Add admin delete permissions for users table
  
  1. Security Changes
     - Enable DELETE permission for admin users on the users table
     - This allows admin users to delete user accounts through the admin interface
     - Admins will be able to delete both the public.users record and corresponding auth.users record
  
  2. Context
     - Previously admins could view, insert, and update users but couldn't delete them
     - This was causing permission denied errors in the admin interface
*/

-- Add a policy allowing admins to delete user records
CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE 
TO authenticated
USING (is_admin());

-- Note: Deleting from auth.users requires a separate approach through
-- Supabase edge functions or server-side code with service_role key
-- as RLS doesn't directly apply to auth schema tables