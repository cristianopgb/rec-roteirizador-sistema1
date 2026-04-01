/*
  # Create rodadas_roteirizacao table for integration tracking

  1. New Tables
    - `rodadas_roteirizacao`
      - `id` (uuid, primary key) - Unique identifier for the routing round
      - `usuario_id` (uuid) - Reference to the user who initiated the round
      - `filial_id` (uuid) - Reference to the branch where routing was performed
      - `upload_id` (uuid) - Reference to the upload used for this round
      - `status` (text) - Current status: iniciado, enviando, processado, erro
      - `payload_enviado` (jsonb) - Complete payload sent to Python motor
      - `resposta_recebida` (jsonb) - Response received from Python motor
      - `mensagem_retorno` (text) - Return message or error description
      - `created_at` (timestamptz) - Timestamp when round was created
      - `updated_at` (timestamptz) - Timestamp when round was last updated

  2. Security
    - Enable RLS on `rodadas_roteirizacao` table
    - Add policy for users to view their own rounds
    - Add policy for users to view rounds from their branch
    - Add policy for users to create new rounds
    - Add policy for users to update their own rounds

  3. Indexes
    - Add index on usuario_id for fast user filtering
    - Add index on filial_id for fast branch filtering
    - Add index on upload_id for tracking
    - Add index on status for filtering by status
*/

-- Create the table
CREATE TABLE IF NOT EXISTS rodadas_roteirizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filial_id uuid NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  upload_id uuid NOT NULL REFERENCES uploads_carteira(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'iniciado',
  payload_enviado jsonb DEFAULT NULL,
  resposta_recebida jsonb DEFAULT NULL,
  mensagem_retorno text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('iniciado', 'enviando', 'processado', 'erro'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rodadas_usuario_id ON rodadas_roteirizacao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_rodadas_filial_id ON rodadas_roteirizacao(filial_id);
CREATE INDEX IF NOT EXISTS idx_rodadas_upload_id ON rodadas_roteirizacao(upload_id);
CREATE INDEX IF NOT EXISTS idx_rodadas_status ON rodadas_roteirizacao(status);
CREATE INDEX IF NOT EXISTS idx_rodadas_created_at ON rodadas_roteirizacao(created_at DESC);

-- Enable RLS
ALTER TABLE rodadas_roteirizacao ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own rounds
CREATE POLICY "Users can view own rounds"
  ON rodadas_roteirizacao FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Policy: Users can view rounds from their branch
CREATE POLICY "Users can view branch rounds"
  ON rodadas_roteirizacao FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.filial_id = rodadas_roteirizacao.filial_id
    )
  );

-- Policy: Admins can view all rounds
CREATE POLICY "Admins can view all rounds"
  ON rodadas_roteirizacao FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Users can create rounds
CREATE POLICY "Users can create rounds"
  ON rodadas_roteirizacao FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = usuario_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Policy: Users can update their own rounds
CREATE POLICY "Users can update own rounds"
  ON rodadas_roteirizacao FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = rodadas_roteirizacao.usuario_id
      AND profiles.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = rodadas_roteirizacao.usuario_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rodadas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_rodadas_updated_at ON rodadas_roteirizacao;
CREATE TRIGGER trigger_update_rodadas_updated_at
  BEFORE UPDATE ON rodadas_roteirizacao
  FOR EACH ROW
  EXECUTE FUNCTION update_rodadas_updated_at();
