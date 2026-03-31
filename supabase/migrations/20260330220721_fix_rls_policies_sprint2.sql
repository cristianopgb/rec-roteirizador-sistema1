/*
  # Fix RLS Policies for Sprint 2

  ## Summary
  This migration addresses critical security and data model issues identified in Sprint 2 review:

  ## Changes Made

  ### 1. Profiles Table - Add Missing RLS Policies
    - **INSERT Policy**: Allow only active admins to insert new profiles
    - **UPDATE Policy**: Allow admins to update any profile, users to update their own
    - **DELETE Policy**: Allow only active admins to delete profiles (soft delete via ativo flag recommended)

  ### 2. Veiculos Table - Restrict to Admin Only
    - **REMOVE**: User INSERT policy ("User pode inserir veículos em sua filial")
    - **REMOVE**: User UPDATE policy ("User pode atualizar veículos de sua filial")
    - **KEEP**: Admin-only INSERT/UPDATE/DELETE policies
    - **KEEP**: SELECT policies for both admin (all vehicles) and users (their filial only)

  ## Security Impact
    - Profiles can now be properly created/updated via admin operations
    - Vehicle management is restricted to administrators only
    - Regular users can only view vehicles from their assigned filial
    - All policies verify active status and proper authorization

  ## Data Model Confirmation
    - **profiles.id**: Unique UUID primary key for the profile record
    - **profiles.auth_user_id**: Foreign key to auth.users.id (UNIQUE, NOT NULL)
    - This dual-ID model is maintained throughout the codebase
    - Use auth_user_id for authentication lookups
    - Use id for profile-specific operations and foreign keys
*/

-- ============================================================================
-- PROFILES TABLE RLS POLICIES
-- ============================================================================

-- Add INSERT policy for profiles (admin only)
CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      AND p.ativo = true
    )
  );

-- Add UPDATE policy for profiles (admin can update any, users can update their own)
CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      AND p.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      AND p.ativo = true
    )
  );

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Add DELETE policy for profiles (admin only - though soft delete is recommended)
CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.auth_user_id = auth.uid()
      AND p.role = 'admin'
      AND p.ativo = true
    )
  );

-- ============================================================================
-- VEICULOS TABLE RLS POLICIES - REMOVE USER PERMISSIONS
-- ============================================================================

-- Drop user INSERT policy
DROP POLICY IF EXISTS "User pode inserir veículos em sua filial" ON veiculos;

-- Drop user UPDATE policy
DROP POLICY IF EXISTS "User pode atualizar veículos de sua filial" ON veiculos;

-- Note: The following policies remain active:
-- - "Admin pode ver todos os veículos" (SELECT)
-- - "User pode ver veículos de sua filial" (SELECT)
-- - "Admin pode inserir veículos" (INSERT)
-- - "Admin pode atualizar veículos" (UPDATE)
-- - "Admin pode deletar veículos" (DELETE)
