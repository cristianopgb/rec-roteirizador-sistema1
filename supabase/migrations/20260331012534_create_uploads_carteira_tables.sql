/*
  # Create Uploads Carteira and Carteira Itens Tables

  ## Summary
  Creates tables to store uploaded Excel files (carteira) and their individual rows with exact column preservation.

  ## New Tables
  
  ### `uploads_carteira`
  Stores metadata about each uploaded carteira file
  - `id` (uuid, primary key) - Unique upload identifier
  - `nome_arquivo` (text) - Original filename
  - `usuario_id` (uuid, foreign key) - User who uploaded the file
  - `filial_id` (uuid, foreign key) - Associated filial
  - `total_linhas` (integer) - Total rows in file
  - `total_validas` (integer) - Valid rows count
  - `total_invalidas` (integer) - Invalid rows count
  - `status` (text) - Upload status: 'processando', 'concluido', 'erro'
  - `erro_estrutura` (text, nullable) - Structure validation error details
  - `created_at` (timestamptz) - Upload timestamp

  ### `carteira_itens`
  Stores individual rows from uploaded carteira with exact Excel column preservation
  - `id` (uuid, primary key) - Unique item identifier
  - `upload_id` (uuid, foreign key) - Reference to upload
  - `dados_originais` (jsonb) - Complete row data with EXACT Excel column names as keys
  - `linha_numero` (integer) - Row number in Excel file
  - `status_validacao` (text) - 'valida' or 'invalida'
  - `erro_validacao` (text, nullable) - Validation error message
  - Database columns for query performance (extracted from dados_originais):
    - `filial` (text)
    - `romane` (text)
    - `nro_doc` (text)
    - `uf` (text)
    - `cida` (text)
    - `destinatario` (text)
    - `tomador` (text)
    - `peso` (numeric)
    - `vlr_merc` (numeric)
    - `data_des` (date)
    - `dle` (date)
    - `agendam` (date)
    - `lat` (numeric, nullable)
    - `lon` (numeric, nullable)
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  - Enable RLS on both tables
  - Admin users can view all uploads and items
  - Regular users can only view their own filial's data

  ## Indexes
  - Index on upload_id for faster joins
  - Index on status_validacao for filtering
  - Index on filial for user-based filtering
  - GIN index on dados_originais for JSONB queries
*/

-- Create uploads_carteira table
CREATE TABLE IF NOT EXISTS uploads_carteira (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo text NOT NULL,
  usuario_id uuid NOT NULL REFERENCES auth.users(id),
  filial_id uuid NOT NULL REFERENCES filiais(id),
  total_linhas integer NOT NULL DEFAULT 0,
  total_validas integer NOT NULL DEFAULT 0,
  total_invalidas integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro')),
  erro_estrutura text,
  created_at timestamptz DEFAULT now()
);

-- Create carteira_itens table
CREATE TABLE IF NOT EXISTS carteira_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES uploads_carteira(id) ON DELETE CASCADE,
  dados_originais jsonb NOT NULL,
  linha_numero integer NOT NULL,
  status_validacao text NOT NULL CHECK (status_validacao IN ('valida', 'invalida')),
  erro_validacao text,
  
  -- Extracted columns for performance
  filial text,
  romane text,
  nro_doc text,
  uf text,
  cida text,
  destinatario text,
  tomador text,
  peso numeric,
  vlr_merc numeric,
  data_des date,
  dle date,
  agendam date,
  lat numeric,
  lon numeric,
  
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_carteira_itens_upload_id ON carteira_itens(upload_id);
CREATE INDEX IF NOT EXISTS idx_carteira_itens_status ON carteira_itens(status_validacao);
CREATE INDEX IF NOT EXISTS idx_carteira_itens_filial ON carteira_itens(filial);
CREATE INDEX IF NOT EXISTS idx_carteira_itens_dados_originais ON carteira_itens USING GIN(dados_originais);
CREATE INDEX IF NOT EXISTS idx_uploads_carteira_filial ON uploads_carteira(filial_id);
CREATE INDEX IF NOT EXISTS idx_uploads_carteira_usuario ON uploads_carteira(usuario_id);

-- Enable RLS
ALTER TABLE uploads_carteira ENABLE ROW LEVEL SECURITY;
ALTER TABLE carteira_itens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploads_carteira

-- Admin can view all uploads
CREATE POLICY "Admins can view all uploads"
  ON uploads_carteira FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can view uploads from their filial
CREATE POLICY "Users can view own filial uploads"
  ON uploads_carteira FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.filial_id = uploads_carteira.filial_id
      AND profiles.role = 'user'
    )
  );

-- Admin can insert uploads for any filial
CREATE POLICY "Admins can insert uploads"
  ON uploads_carteira FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can insert uploads for their filial
CREATE POLICY "Users can insert own filial uploads"
  ON uploads_carteira FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.filial_id = uploads_carteira.filial_id
      AND profiles.role = 'user'
    )
  );

-- Admin can update all uploads
CREATE POLICY "Admins can update all uploads"
  ON uploads_carteira FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for carteira_itens

-- Admin can view all items
CREATE POLICY "Admins can view all carteira items"
  ON carteira_itens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can view items from their filial's uploads
CREATE POLICY "Users can view own filial carteira items"
  ON carteira_itens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM uploads_carteira uc
      JOIN profiles p ON p.filial_id = uc.filial_id
      WHERE uc.id = carteira_itens.upload_id
      AND p.auth_user_id = auth.uid()
      AND p.role = 'user'
    )
  );

-- Admin can insert items
CREATE POLICY "Admins can insert carteira items"
  ON carteira_itens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can insert items for their filial's uploads
CREATE POLICY "Users can insert own filial carteira items"
  ON carteira_itens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM uploads_carteira uc
      JOIN profiles p ON p.filial_id = uc.filial_id
      WHERE uc.id = carteira_itens.upload_id
      AND p.auth_user_id = auth.uid()
      AND p.role = 'user'
    )
  );

-- Admin can update all items
CREATE POLICY "Admins can update all carteira items"
  ON carteira_itens FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );