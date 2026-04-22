/*
  # Aprovação Hub - Post-Routing Operational Schema

  1. New Tables
    - `manifestos_roteirizacao` — one row per manifest of a rodada (from motor_response_raw.manifestos_m7)
    - `manifestos_itens` — sequenced delivery items per manifest (from motor_response_raw.itens_manifestos_sequenciados_m7)
    - `remanescentes_roteirizacao` — items not routed. Populated only when an explicit node is returned
    - `estatisticas_roteirizacao` — one row per rodada with consolidated stats (1-1 with rodadas_roteirizacao)
    - `tabela_antt` — ANTT minimum freight lookup (seed manually; no hardcode in front)

  2. Security
    - RLS enabled on all tables
    - Access is restricted to authenticated users whose profile.filial_id matches the parent rodada's filial_id
    - tabela_antt is readable by all authenticated users; writes are admin-only

  3. Important Notes
    1. Idempotency handled at the application layer (delete+insert by rodada_id)
    2. manifesto_id is unique within a rodada: UNIQUE(rodada_id, manifesto_id)
    3. `sequencia_original` preserves the M7 order; `sequencia_atual` is user-editable
    4. `frete_minimo` is populated by the frete service after rules lookup
*/

-- manifestos_roteirizacao
CREATE TABLE IF NOT EXISTS manifestos_roteirizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id uuid NOT NULL REFERENCES rodadas_roteirizacao(id) ON DELETE CASCADE,
  manifesto_id text NOT NULL,
  origem_modulo text,
  tipo_manifesto text,
  veiculo_perfil text,
  veiculo_tipo text,
  exclusivo_flag boolean DEFAULT false,
  peso_total numeric,
  km_total numeric,
  ocupacao numeric,
  qtd_entregas integer DEFAULT 0,
  qtd_clientes integer DEFAULT 0,
  frete_minimo numeric,
  status text DEFAULT 'gerado',
  sequencia_editada_flag boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT manifestos_roteirizacao_rodada_manifesto_unique UNIQUE (rodada_id, manifesto_id)
);

CREATE INDEX IF NOT EXISTS manifestos_roteirizacao_rodada_idx ON manifestos_roteirizacao(rodada_id);
CREATE INDEX IF NOT EXISTS manifestos_roteirizacao_manifesto_idx ON manifestos_roteirizacao(manifesto_id);

ALTER TABLE manifestos_roteirizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Filial users can read manifestos"
  ON manifestos_roteirizacao FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can insert manifestos"
  ON manifestos_roteirizacao FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can update manifestos"
  ON manifestos_roteirizacao FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can delete manifestos"
  ON manifestos_roteirizacao FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- manifestos_itens
CREATE TABLE IF NOT EXISTS manifestos_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id uuid NOT NULL REFERENCES rodadas_roteirizacao(id) ON DELETE CASCADE,
  manifesto_id text NOT NULL,
  sequencia_original integer NOT NULL,
  sequencia_atual integer NOT NULL,
  nro_documento text,
  destinatario text,
  cidade text,
  uf text,
  peso numeric,
  distancia_km numeric,
  inicio_entrega text,
  fim_entrega text,
  latitude numeric,
  longitude numeric,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manifestos_itens_rodada_idx ON manifestos_itens(rodada_id);
CREATE INDEX IF NOT EXISTS manifestos_itens_manifesto_idx ON manifestos_itens(manifesto_id);
CREATE INDEX IF NOT EXISTS manifestos_itens_manifesto_seq_idx ON manifestos_itens(manifesto_id, sequencia_atual);

ALTER TABLE manifestos_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Filial users can read itens"
  ON manifestos_itens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_itens.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can insert itens"
  ON manifestos_itens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_itens.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can update itens"
  ON manifestos_itens FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_itens.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_itens.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can delete itens"
  ON manifestos_itens FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = manifestos_itens.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- remanescentes_roteirizacao
CREATE TABLE IF NOT EXISTS remanescentes_roteirizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id uuid NOT NULL REFERENCES rodadas_roteirizacao(id) ON DELETE CASCADE,
  nro_documento text,
  destinatario text,
  cidade text,
  uf text,
  motivo text,
  etapa_origem text,
  payload_apoio_json jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS remanescentes_roteirizacao_rodada_idx ON remanescentes_roteirizacao(rodada_id);

ALTER TABLE remanescentes_roteirizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Filial users can read remanescentes"
  ON remanescentes_roteirizacao FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = remanescentes_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can insert remanescentes"
  ON remanescentes_roteirizacao FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = remanescentes_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can delete remanescentes"
  ON remanescentes_roteirizacao FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = remanescentes_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- estatisticas_roteirizacao
CREATE TABLE IF NOT EXISTS estatisticas_roteirizacao (
  rodada_id uuid PRIMARY KEY REFERENCES rodadas_roteirizacao(id) ON DELETE CASCADE,
  total_carteira integer DEFAULT 0,
  total_roteirizado integer DEFAULT 0,
  total_remanescente integer DEFAULT 0,
  total_manifestos integer DEFAULT 0,
  km_total numeric,
  ocupacao_media numeric,
  tempo_execucao_ms numeric,
  resumo_modulos_json jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE estatisticas_roteirizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Filial users can read estatisticas"
  ON estatisticas_roteirizacao FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = estatisticas_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can insert estatisticas"
  ON estatisticas_roteirizacao FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = estatisticas_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can update estatisticas"
  ON estatisticas_roteirizacao FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = estatisticas_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = estatisticas_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Filial users can delete estatisticas"
  ON estatisticas_roteirizacao FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rodadas_roteirizacao r
      JOIN profiles p ON p.filial_id = r.filial_id
      WHERE r.id = estatisticas_roteirizacao.rodada_id
        AND p.auth_user_id = auth.uid()
    )
  );

-- tabela_antt
CREATE TABLE IF NOT EXISTS tabela_antt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_carga text NOT NULL,
  unidade text NOT NULL DEFAULT 'R$/km',
  eixos_2 numeric,
  eixos_3 numeric,
  eixos_4 numeric,
  eixos_5 numeric,
  eixos_6 numeric,
  eixos_7 numeric,
  eixos_9 numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tabela_antt_tipo_carga_idx ON tabela_antt(tipo_carga);

ALTER TABLE tabela_antt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ANTT"
  ON tabela_antt FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert ANTT"
  ON tabela_antt FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can update ANTT"
  ON tabela_antt FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can delete ANTT"
  ON tabela_antt FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.role = 'admin')
  );
