/*
  # Fix Carteira Itens Table Structure - Sprint 3 Corrections

  ## Summary
  Rebuilds the carteira_itens table to store all 38 Excel columns as real database columns,
  removing dependency on JSONB structure and ensuring full SQL query capability.

  ## Changes Made

  ### 1. Table Structure
  - Drops existing carteira_itens table
  - Recreates with ALL 38 Excel columns as real typed database columns
  - Removes dados_originais JSONB column completely
  - Maintains upload_id, linha_numero, status_validacao, erro_validacao as metadata

  ### 2. All 38 Real Columns
  Database columns for all Excel fields:
  1. filial (text) - from 'Filial'
  2. romane (text) - from 'Romane'
  3. filial_origem (text) - from 'Filial (origem)'
  4. serie (text) - from 'Série'
  5. nro_doc (text) - from 'Nro Doc.'
  6. data_des (date) - from 'Data Des'
  7. data_nf (date) - from 'Data NF'
  8. dle (date) - from 'D.L.E.'
  9. agendam (date) - from 'Agendam.'
  10. palet (text) - from 'Palet'
  11. conf (text) - from 'Conf'
  12. peso (numeric) - from 'Peso'
  13. vlr_merc (numeric) - from 'Vlr.Merc.'
  14. qtd (numeric) - from 'Qtd.'
  15. peso_c (numeric) - from 'Peso C'
  16. classifi (text) - from 'Classifi'
  17. tomador (text) - from 'Tomador'
  18. destinatario (text) - from 'Destinatário'
  19. bairro (text) - from 'Bairro'
  20. cida (text) - from 'Cida'
  21. uf (text) - from 'UF'
  22. nf_serie (text) - from 'NF / Serie'
  23. tipo_carga (text) - from 'Tipo Carga'
  24. qtd_nf (numeric) - from 'Qtd.NF'
  25. regiao (text) - from 'Região'
  26. sub_regiao (text) - from 'Sub-Região'
  27. ocorrencias_nfs (text) - from 'Ocorrências NFs'
  28. remetente (text) - from 'Remetente'
  29. observacao_r (text) - from 'Observação R'
  30. ref_cliente (text) - from 'Ref Cliente'
  31. cidade_dest (text) - from 'Cidade Dest.'
  32. mesoregiao (text) - from 'Mesoregião'
  33. agenda (text) - from 'Agenda'
  34. tipo_c (text) - from 'Tipo C'
  35. ultima (text) - from 'Última'
  36. status (text) - from 'Status'
  37. lat (numeric) - from 'Lat.'
  38. lon (numeric) - from 'Lon.'

  ### 3. Indexes
  - Upload ID for join performance
  - Status validation for filtering
  - Filial, UF, Cida for geographic queries
  - Romane and Nro_doc for document lookups

  ### 4. Security (RLS)
  - All policies use correct role values: 'admin' and 'user' (NOT 'usuario')
  - Admin users can view/insert/update all items
  - Regular users can only view/insert items from their own filial
  - Policies prevent cross-filial data access

  ## Important Notes
  - NO JSONB dependency - all data stored in typed columns
  - Full SQL query capability on all 38 fields
  - Proper data types for dates, numbers, and text
  - Role values match existing system: 'admin' and 'user'
*/

-- Drop existing table
DROP TABLE IF EXISTS carteira_itens CASCADE;

-- Create carteira_itens table with ALL 38 columns as real database columns
CREATE TABLE carteira_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES uploads_carteira(id) ON DELETE CASCADE,
  linha_numero integer NOT NULL,
  status_validacao text NOT NULL CHECK (status_validacao IN ('valida', 'invalida')),
  erro_validacao text,

  -- All 38 Excel columns as real database columns
  filial text,
  romane text,
  filial_origem text,
  serie text,
  nro_doc text,
  data_des date,
  data_nf date,
  dle date,
  agendam date,
  palet text,
  conf text,
  peso numeric,
  vlr_merc numeric,
  qtd numeric,
  peso_c numeric,
  classifi text,
  tomador text,
  destinatario text,
  bairro text,
  cida text,
  uf text,
  nf_serie text,
  tipo_carga text,
  qtd_nf numeric,
  regiao text,
  sub_regiao text,
  ocorrencias_nfs text,
  remetente text,
  observacao_r text,
  ref_cliente text,
  cidade_dest text,
  mesoregiao text,
  agenda text,
  tipo_c text,
  ultima text,
  status text,
  lat numeric,
  lon numeric,

  created_at timestamptz DEFAULT now()
);

-- Create indexes for query performance
CREATE INDEX idx_carteira_itens_upload_id ON carteira_itens(upload_id);
CREATE INDEX idx_carteira_itens_status ON carteira_itens(status_validacao);
CREATE INDEX idx_carteira_itens_filial ON carteira_itens(filial);
CREATE INDEX idx_carteira_itens_uf ON carteira_itens(uf);
CREATE INDEX idx_carteira_itens_cida ON carteira_itens(cida);
CREATE INDEX idx_carteira_itens_romane ON carteira_itens(romane);
CREATE INDEX idx_carteira_itens_nro_doc ON carteira_itens(nro_doc);

-- Enable RLS
ALTER TABLE carteira_itens ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using correct 'admin' and 'user' roles)

-- SELECT Policies
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

CREATE POLICY "Users can view own filial carteira items"
  ON carteira_itens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM uploads_carteira uc
      JOIN profiles p ON p.filial_id = uc.filial_id
      WHERE uc.id = carteira_itens.upload_id
      AND p.auth_user_id = auth.uid()
      AND p.role = 'user'
    )
  );

-- INSERT Policies
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

CREATE POLICY "Users can insert own filial carteira items"
  ON carteira_itens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploads_carteira uc
      JOIN profiles p ON p.filial_id = uc.filial_id
      WHERE uc.id = carteira_itens.upload_id
      AND p.auth_user_id = auth.uid()
      AND p.role = 'user'
    )
  );

-- UPDATE Policies
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

-- DELETE Policies
CREATE POLICY "Admins can delete carteira items"
  ON carteira_itens FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );