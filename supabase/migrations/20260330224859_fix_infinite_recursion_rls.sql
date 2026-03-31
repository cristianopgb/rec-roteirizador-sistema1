/*
  # Fix Infinite Recursion in RLS Policies

  ## Summary
  This migration fixes the infinite recursion error in the profiles table RLS policies.
  The issue was caused by policies checking the profiles table itself to verify admin status,
  creating a recursive loop.

  ## Changes Made

  ### 1. Create Helper Function
    - `is_current_user_admin()`: A SECURITY DEFINER function that bypasses RLS to check if the current user is an admin
    - This function is safe because it only checks auth.uid() (current authenticated user)
    - Uses SECURITY DEFINER to bypass RLS when reading profiles table

  ### 2. Recreate Profiles RLS Policies
    - Drop existing INSERT, UPDATE, DELETE policies that cause recursion
    - Recreate them using the new helper function instead of inline EXISTS queries
    - This breaks the recursion cycle

  ### 3. Fix Veiculos RLS Policies
    - Update admin policies to use the helper function
    - Ensures consistency across all tables

  ## Security Notes
    - The SECURITY DEFINER function is safe because:
      - It only checks the current user's own admin status
      - It doesn't accept parameters that could be manipulated
      - It's read-only and doesn't modify data
    - All policies still properly verify authentication and active status
*/

-- ============================================================================
-- CREATE HELPER FUNCTION TO CHECK ADMIN STATUS
-- ============================================================================

-- This function bypasses RLS to check if the current user is an admin
-- SECURITY DEFINER allows it to read profiles without triggering RLS recursion
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
    AND ativo = true
  );
END;
$$;

-- ============================================================================
-- FIX PROFILES TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;

-- Recreate INSERT policy using helper function
CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

-- Recreate UPDATE policy for admins using helper function
CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

-- Recreate UPDATE policy for users (no recursion here - just checks own auth_user_id)
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Recreate DELETE policy using helper function
CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- ============================================================================
-- FIX VEICULOS TABLE RLS POLICIES (for consistency)
-- ============================================================================

-- Drop and recreate admin policies to use helper function
DROP POLICY IF EXISTS "Admin pode inserir veículos" ON veiculos;
DROP POLICY IF EXISTS "Admin pode atualizar veículos" ON veiculos;
DROP POLICY IF EXISTS "Admin pode deletar veículos" ON veiculos;
DROP POLICY IF EXISTS "Admin pode ver todos os veículos" ON veiculos;

-- Recreate policies using helper function
CREATE POLICY "Admin pode ver todos os veículos"
  ON veiculos FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admin pode inserir veículos"
  ON veiculos FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin pode atualizar veículos"
  ON veiculos FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin pode deletar veículos"
  ON veiculos FOR DELETE
  TO authenticated
  USING (is_current_user_admin());

-- ============================================================================
-- FIX REGIONALIDADES TABLE RLS POLICIES (for consistency)
-- ============================================================================

-- Drop and recreate admin policies to use helper function
DROP POLICY IF EXISTS "Admin pode inserir regionalidades" ON regionalidades;
DROP POLICY IF EXISTS "Admin pode atualizar regionalidades" ON regionalidades;
DROP POLICY IF EXISTS "Admin pode deletar regionalidades" ON regionalidades;
DROP POLICY IF EXISTS "Admin pode ver todas as regionalidades" ON regionalidades;

-- Recreate policies using helper function
CREATE POLICY "Admin pode ver todas as regionalidades"
  ON regionalidades FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

CREATE POLICY "Admin pode inserir regionalidades"
  ON regionalidades FOR INSERT
  TO authenticated
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin pode atualizar regionalidades"
  ON regionalidades FOR UPDATE
  TO authenticated
  USING (is_current_user_admin())
  WITH CHECK (is_current_user_admin());

CREATE POLICY "Admin pode deletar regionalidades"
  ON regionalidades FOR DELETE
  TO authenticated
  USING (is_current_user_admin());
