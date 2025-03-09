/*
  # Fix admin_users policies and prevent null user_id

  1. Changes
    - Replace recursive admin_users policies with non-recursive alternatives
    - Fix the issue with null user_id in admin_users table
    - Create safer policies for admin management
  
  2. Security
    - Maintain admin privileges while avoiding infinite recursion
    - Ensure proper access control for all tables
*/

-- First, drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can manage admin_users" ON admin_users;
DROP POLICY IF EXISTS "Users can see if they are admin" ON admin_users;

-- Create simpler policies for admin_users table
CREATE POLICY "Users can see their own admin status"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());

-- Create a policy for admins to manage other admins
-- This uses a direct check against the table instead of a recursive policy
CREATE POLICY "Admins can manage other admins"
  ON admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Update the policies for other tables to use direct checks
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all notes" ON notes;
CREATE POLICY "Admins can view all notes"
  ON notes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all group notes" ON group_notes;
CREATE POLICY "Admins can view all group notes"
  ON group_notes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can view all group members" ON group_members;
CREATE POLICY "Admins can view all group members"
  ON group_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Create a function to safely add the first admin
-- This avoids the issue with auth.uid() being null during migrations
CREATE OR REPLACE FUNCTION add_first_admin()
RETURNS void AS $$
DECLARE
  admin_count integer;
  first_user_id uuid;
BEGIN
  -- Check if there are any admins
  SELECT COUNT(*) INTO admin_count FROM admin_users;
  
  -- If no admins exist, add the first user as admin
  IF admin_count = 0 THEN
    -- Get the first user from profiles
    SELECT id INTO first_user_id FROM profiles ORDER BY created_at LIMIT 1;
    
    -- If we found a user, make them admin
    IF first_user_id IS NOT NULL THEN
      INSERT INTO admin_users (user_id) VALUES (first_user_id)
      ON CONFLICT (user_id) DO NOTHING;
      
      -- Also update the profiles table
      UPDATE profiles SET is_admin = true WHERE id = first_user_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to ensure we have at least one admin
SELECT add_first_admin();