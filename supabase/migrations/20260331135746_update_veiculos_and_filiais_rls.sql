/*
  # Update Veiculos Table and Filiais RLS Policies

  ## Changes Made

  1. **Veiculos Table Updates**
     - Make `placa` field nullable (previously NOT NULL)
     - Make `filial_id` field nullable (previously NOT NULL)
     - Make `tipo_frota` field nullable (previously NOT NULL)
     - Drop UNIQUE constraint from `placa` field
     - Remove CHECK constraint from `tipo_frota` field

  2. **Filiais RLS Policies**
     - Add policy for admin users to INSERT new filiais
     - Add policy for admin users to UPDATE existing filiais
     - Add policy for admin users to DELETE filiais

  ## Security
     - All filiais policies restricted to authenticated admin users only
     - Policies check user role from profiles table

  ## Notes
     - Vehicles are now globally available to all filiais by default
     - Admins have full control over filial management
     - Plate numbers can be null and non-unique to support simplified registration
*/

-- Drop existing constraints on veiculos table
DO $$
BEGIN
  -- Drop UNIQUE constraint on placa if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'veiculos_placa_key'
  ) THEN
    ALTER TABLE veiculos DROP CONSTRAINT veiculos_placa_key;
  END IF;

  -- Drop CHECK constraint on tipo_frota if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'veiculos_tipo_frota_check'
  ) THEN
    ALTER TABLE veiculos DROP CONSTRAINT veiculos_tipo_frota_check;
  END IF;
END $$;

-- Make placa nullable
ALTER TABLE veiculos ALTER COLUMN placa DROP NOT NULL;

-- Make filial_id nullable
ALTER TABLE veiculos ALTER COLUMN filial_id DROP NOT NULL;

-- Make tipo_frota nullable
ALTER TABLE veiculos ALTER COLUMN tipo_frota DROP NOT NULL;

-- Add RLS policies for filiais table (admin only)
CREATE POLICY "Admins can insert filiais"
  ON filiais FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update filiais"
  ON filiais FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete filiais"
  ON filiais FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );