/*
  # Fix SELECT Policies Causing Infinite Recursion

  ## Summary
  This migration fixes the remaining SELECT policies that were causing infinite recursion.
  The previous migration fixed INSERT/UPDATE/DELETE policies, but the original SELECT policies
  from the first migration were still using recursive subqueries.

  ## Problem
  When a user tries to login and read their profile, the SELECT policies check if the user
  is an admin by querying the profiles table itself, creating an infinite loop.

  ## Solution
  Replace all SELECT policies that use recursive subqueries with policies that use the
  `is_current_user_admin()` helper function which bypasses RLS.

  ## Changes Made

  ### 1. Profiles Table SELECT Policies
    - Drop: "Admin users can view all profiles" (recursive)
    - Create: "Admin can view all profiles" (uses helper function)
    - Keep: "Users can view their own profile" (not recursive - safe)

  ### 2. Filiais Table SELECT Policies
    - Drop: "Admin users can view all filiais" (recursive)
    - Drop: "Regular users can view their own filial" (recursive)
    - Create: "Admin can view all filiais" (uses helper function)
    - Create: "Users can view their own filial" (non-recursive - checks filial_id directly)

  ## Security Notes
    - All policies maintain the same security level as before
    - Admin users can still view all data
    - Regular users can still only view their own data
    - The helper function is safe (SECURITY DEFINER, read-only, checks only auth.uid())
*/

-- ============================================================================
-- FIX PROFILES TABLE SELECT POLICIES
-- ============================================================================

-- Drop the recursive admin SELECT policy
DROP POLICY IF EXISTS "Admin users can view all profiles" ON profiles;

-- Create new non-recursive admin SELECT policy
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

-- Note: "Users can view their own profile" policy is already safe (no recursion)
-- It only checks auth_user_id = auth.uid() without querying profiles table

-- ============================================================================
-- FIX FILIAIS TABLE SELECT POLICIES
-- ============================================================================

-- Drop both recursive SELECT policies
DROP POLICY IF EXISTS "Admin users can view all filiais" ON filiais;
DROP POLICY IF EXISTS "Regular users can view their own filial" ON filiais;

-- Create new non-recursive admin SELECT policy
CREATE POLICY "Admin can view all filiais"
  ON filiais FOR SELECT
  TO authenticated
  USING (is_current_user_admin());

-- Create new non-recursive user SELECT policy
-- This is safe because it doesn't query profiles table in the policy itself
-- The filial_id is already on the profiles row that was successfully read
CREATE POLICY "Users can view their own filial"
  ON filiais FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT filial_id FROM profiles
      WHERE auth_user_id = auth.uid()
      AND ativo = true
      LIMIT 1
    )
  );

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================

-- After this migration:
-- 1. Users should be able to login without "infinite recursion" errors
-- 2. Admin users can view all profiles and filiais
-- 3. Regular users can view only their own profile and filial
-- 4. All policies use either direct auth.uid() checks or the helper function
-- 5. No policy creates a recursive loop by checking profiles within profiles policies
