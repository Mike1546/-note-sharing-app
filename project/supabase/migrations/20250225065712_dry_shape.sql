/*
  # Notes Application Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key) - matches auth.users
      - `username` (text)
      - `created_at` (timestamp)
    
    - `notes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `is_locked` (boolean)
      - `password_hash` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `owner_id` (uuid, references profiles)
    
    - `group_notes`
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, references profiles)
    
    - `group_members`
      - `group_note_id` (uuid, references group_notes)
      - `user_id` (uuid, references profiles)
      - `role` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for note access and management
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create notes table
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_locked boolean DEFAULT false,
  password_hash text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  owner_id uuid REFERENCES profiles(id) NOT NULL
);

-- Create group notes table
CREATE TABLE group_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) NOT NULL
);

-- Create group members table
CREATE TABLE group_members (
  group_note_id uuid REFERENCES group_notes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  PRIMARY KEY (group_note_id, user_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Notes policies
CREATE POLICY "Users can CRUD their own notes"
  ON notes FOR ALL
  USING (auth.uid() = owner_id);

-- Group notes policies
CREATE POLICY "Members can read group notes"
  ON group_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_note_id = id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and editors can update group notes"
  ON group_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_note_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

-- Group members policies
CREATE POLICY "Members can see group membership"
  ON group_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_note_id = group_note_id
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Only owners can manage group membership"
  ON group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_note_id = group_note_id
      AND user_id = auth.uid()
      AND role = 'owner'
    )
  );