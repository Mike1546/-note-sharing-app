/*
  # Add admin role to profiles

  1. Changes
    - Add `is_admin` column to `profiles` table
    - Create admin-specific policies for user management
  
  2. Security
    - Add policies for admins to view and manage all users
    - Ensure only admins can access admin-specific features
*/

-- Add is_admin column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Create policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Create policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Create policy for admins to view all notes
CREATE POLICY "Admins can view all notes"
  ON notes FOR SELECT
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Create policy for admins to view all group notes
CREATE POLICY "Admins can view all group notes"
  ON group_notes FOR SELECT
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Create policy for admins to view all group members
CREATE POLICY "Admins can view all group members"
  ON group_members FOR SELECT
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );