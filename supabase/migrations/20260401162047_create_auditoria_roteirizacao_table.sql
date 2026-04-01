/*
  # Create auditoria_roteirizacao table for tracking all routing events

  1. New Tables
    - `auditoria_roteirizacao`
      - `id` (uuid, primary key) - Unique identifier
      - `acao` (text) - Action type: roteirizacao_iniciada, roteirizacao_concluida, roteirizacao_erro
      - `usuario_id` (uuid) - Reference to the user who performed the action
      - `upload_id` (uuid) - Reference to the upload
      - `rodada_id` (uuid) - Reference to the rodada
      - `metadados` (jsonb) - Additional metadata about the action
      - `created_at` (timestamptz) - Timestamp when action was logged

  2. Security
    - Enable RLS on `auditoria_roteirizacao` table
    - Add policy for users to view their own audit logs
    - Add policy for admins to view all audit logs

  3. Indexes
    - Add index on usuario_id for filtering
    - Add index on rodada_id for tracking
    - Add index on acao for filtering by action type
    - Add index on created_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS auditoria_roteirizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acao text NOT NULL,
  usuario_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  upload_id uuid REFERENCES uploads_carteira(id) ON DELETE SET NULL,
  rodada_id uuid REFERENCES rodadas_roteirizacao(id) ON DELETE SET NULL,
  metadados jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_acao CHECK (acao IN ('roteirizacao_iniciada', 'roteirizacao_concluida', 'roteirizacao_erro'))
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario_id ON auditoria_roteirizacao(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_rodada_id ON auditoria_roteirizacao(rodada_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_acao ON auditoria_roteirizacao(acao);
CREATE INDEX IF NOT EXISTS idx_auditoria_created_at ON auditoria_roteirizacao(created_at DESC);

ALTER TABLE auditoria_roteirizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs"
  ON auditoria_roteirizacao FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auditoria_roteirizacao.usuario_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all audit logs"
  ON auditoria_roteirizacao FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can insert own audit logs"
  ON auditoria_roteirizacao FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auditoria_roteirizacao.usuario_id
      AND profiles.auth_user_id = auth.uid()
    )
  );
