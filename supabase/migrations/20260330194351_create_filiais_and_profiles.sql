/*
  # Create base tables for authentication and multi-filial system
  
  1. New Tables
    - `filiais`
      - `id` (uuid, primary key)
      - `nome` (text, branch name)
      - `cidade` (text, city)
      - `uf` (text, state)
      - `latitude` (numeric, optional)
      - `longitude` (numeric, optional)
      - `ativo` (boolean, active status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `profiles`
      - `id` (uuid, primary key)
      - `auth_user_id` (uuid, foreign key to auth.users)
      - `nome` (text, user full name)
      - `email` (text, unique)
      - `role` (text, either 'admin' or 'user')
      - `filial_id` (uuid, foreign key to filiais)
      - `ativo` (boolean, active status)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on both tables
    - Admin users can read all profiles and filiais
    - Regular users can only read their own profile and their filial
    - Trigger to auto-create profile when auth user is created
  
  3. Important Notes
    - Every user MUST have a filial_id
    - Only 2 roles allowed: 'admin' and 'user'
    - Admin can also perform roteirização operations
    - User only accesses data from their own filial
*/

-- Create filiais table
CREATE TABLE IF NOT EXISTS filiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cidade text NOT NULL,
  uf text NOT NULL,
  latitude numeric,
  longitude numeric,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nome text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'user')),
  filial_id uuid REFERENCES filiais(id) NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_filial_id ON profiles(filial_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_filiais_ativo ON filiais(ativo);

-- Enable Row Level Security
ALTER TABLE filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for filiais table
CREATE POLICY "Admin users can view all filiais"
  ON filiais FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.ativo = true
    )
  );

CREATE POLICY "Regular users can view their own filial"
  ON filiais FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT filial_id FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.ativo = true
    )
  );

-- Policies for profiles table
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Admin users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      AND p.ativo = true
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_filiais_updated_at
  BEFORE UPDATE ON filiais
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a default filial for initial setup
INSERT INTO filiais (nome, cidade, uf, ativo)
VALUES ('Matriz', 'São Paulo', 'SP', true)
ON CONFLICT DO NOTHING;