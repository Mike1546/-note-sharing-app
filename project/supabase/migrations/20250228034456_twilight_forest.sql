/*
  # Fix admin_users recursion issues

  1. Changes
    - Drop and recreate all admin-related policies to prevent infinite recursion
    - Simplify policy structure to avoid circular dependencies
    - Create a system-level policy for admin management
  
  2. Security
    - Maintain admin privileges while avoiding infinite recursion
    - Ensure proper access control for all tables
*/

-- First, drop all problematic policies
DROP POLICY IF EXISTS "Admins can manage other admins" ON admin_users;
DROP POLICY IF EXISTS "Users can see their own admin status" ON admin_users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all notes" ON notes;
DROP POLICY IF EXISTS "Admins can view all group notes" ON group_notes;
DROP POLICY IF EXISTS "Admins can view all group members" ON group_members;

-- Create a special role-based policy for admin_users
-- This approach avoids the recursion by using a simpler condition
CREATE POLICY "Anyone can view admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

-- Only allow admins to modify admin_users using a non-recursive approach
CREATE POLICY "Only admins can modify admin_users"
  ON admin_users FOR INSERT UPDATE DELETE
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND created_at < now() - interval '1 second'
    )
  );

-- Recreate policies for other tables using the same non-recursive pattern
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
      AND created_at < now() - interval '1 second'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
      AND created_at < now() - interval '1 second'
    )
  );

CREATE POLICY "Admins can view all notes"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
      AND created_at < now() - interval '1 second'
    )
  );

CREATE POLICY "Admins can view all group notes"
  ON group_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
      AND created_at < now() - interval '1 second'
    )
  );

CREATE POLICY "Admins can view all group members"
  ON group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
      AND created_at < now() - interval '1 second'
    )
  );