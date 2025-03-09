/*
  # Fix infinite recursion in admin policies

  1. Changes
    - Replace recursive admin policies with non-recursive alternatives
    - Add email column to profiles table if missing
  
  2. Security
    - Maintain admin privileges while avoiding infinite recursion
    - Ensure proper access control for all tables
*/

-- First, drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all notes" ON notes;
DROP POLICY IF EXISTS "Admins can view all group notes" ON group_notes;
DROP POLICY IF EXISTS "Admins can view all group members" ON group_members;

-- Add email column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email text;
  END IF;
END $$;

-- Create a separate admin_users table to avoid recursion
CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);

-- Insert existing admins into the admin_users table
INSERT INTO admin_users (user_id)
SELECT id FROM profiles WHERE is_admin = true
ON CONFLICT (user_id) DO NOTHING;

-- Create policies using the admin_users table instead
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all notes"
  ON notes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all group notes"
  ON group_notes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can view all group members"
  ON group_members FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Enable RLS on admin_users table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_users table
CREATE POLICY "Admins can manage admin_users"
  ON admin_users FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Create policy for users to see their own admin status
CREATE POLICY "Users can see if they are admin"
  ON admin_users FOR SELECT
  USING (user_id = auth.uid());