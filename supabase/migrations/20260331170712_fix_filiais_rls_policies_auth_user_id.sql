/*
  # Fix Filiais RLS Policies to Use auth_user_id

  1. Changes
    - Drop all existing RLS policies on filiais table
    - Recreate policies using auth_user_id instead of id for profile checks
    - Ensure proper admin role verification

  2. Security
    - Admins can perform all operations (SELECT, INSERT, UPDATE, DELETE)
    - Regular users can only view their own filial
    - All policies check against profiles.auth_user_id = auth.uid()
*/

-- Drop all existing policies on filiais
DROP POLICY IF EXISTS "Admin can view all filiais" ON filiais;
DROP POLICY IF EXISTS "Users can view their own filial" ON filiais;
DROP POLICY IF EXISTS "Admins can insert filiais" ON filiais;
DROP POLICY IF EXISTS "Admins can update filiais" ON filiais;
DROP POLICY IF EXISTS "Admins can delete filiais" ON filiais;

-- SELECT policies
CREATE POLICY "Admins can view all filiais"
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

CREATE POLICY "Users can view their own filial"
  ON filiais FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT filial_id FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.ativo = true
      AND filial_id IS NOT NULL
    )
  );

-- INSERT policy
CREATE POLICY "Admins can insert filiais"
  ON filiais FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.ativo = true
    )
  );

-- UPDATE policy
CREATE POLICY "Admins can update filiais"
  ON filiais FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.ativo = true
    )
  );

-- DELETE policy
CREATE POLICY "Admins can delete filiais"
  ON filiais FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
      AND profiles.ativo = true
    )
  );