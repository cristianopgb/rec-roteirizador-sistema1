/*
  # Criar tabelas de Veículos e Regionalidades

  ## Mudanças

  1. Nova tabela `veiculos`
    - `id` (uuid, primary key)
    - `placa` (text, unique, not null)
    - `perfil` (text, not null)
    - `qtd_eixos` (integer, not null)
    - `capacidade_peso_kg` (numeric, not null)
    - `capacidade_vol_m3` (numeric, not null)
    - `max_entregas` (integer, not null)
    - `max_km_distancia` (numeric, not null)
    - `ocupacao_minima_perc` (numeric, not null, check 0-100)
    - `filial_id` (uuid, foreign key to filiais)
    - `dedicado` (boolean, default false)
    - `tipo_frota` (text, not null, check values)
    - `ativo` (boolean, default true)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Nova tabela `regionalidades`
    - `id` (uuid, primary key)
    - `cidade` (text, not null)
    - `uf` (text, not null, 2 chars)
    - `mesorregiao` (text, not null)
    - `microrregiao` (text, not null)
    - `created_at` (timestamptz)
    - Unique constraint em (cidade, uf)

  3. Nova tabela `importacoes_regionalidade`
    - `id` (uuid, primary key)
    - `arquivo_nome` (text, not null)
    - `total_linhas` (integer, not null)
    - `inseridos` (integer, not null)
    - `duplicados` (integer, not null)
    - `erros` (integer, not null)
    - `user_id` (uuid, foreign key to profiles)
    - `created_at` (timestamptz)

  ## Segurança

  - RLS habilitado em todas as tabelas
  - Veículos: admin vê tudo, user vê apenas sua filial
  - Regionalidades: acesso global para leitura
  - Importações: user vê apenas suas próprias importações

  ## Índices

  - veiculos(filial_id, ativo, placa)
  - regionalidades(uf, cidade)
*/

-- Criar tabela veiculos
CREATE TABLE IF NOT EXISTS veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placa text UNIQUE NOT NULL,
  perfil text NOT NULL,
  qtd_eixos integer NOT NULL CHECK (qtd_eixos >= 2 AND qtd_eixos <= 9),
  capacidade_peso_kg numeric NOT NULL CHECK (capacidade_peso_kg > 0),
  capacidade_vol_m3 numeric NOT NULL CHECK (capacidade_vol_m3 > 0),
  max_entregas integer NOT NULL CHECK (max_entregas > 0),
  max_km_distancia numeric NOT NULL CHECK (max_km_distancia > 0),
  ocupacao_minima_perc numeric NOT NULL CHECK (ocupacao_minima_perc >= 0 AND ocupacao_minima_perc <= 100),
  filial_id uuid NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  dedicado boolean DEFAULT false,
  tipo_frota text NOT NULL CHECK (tipo_frota IN ('proprio', 'terceiro', 'agregado')),
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela regionalidades
CREATE TABLE IF NOT EXISTS regionalidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cidade text NOT NULL,
  uf text NOT NULL CHECK (length(uf) = 2),
  mesorregiao text NOT NULL,
  microrregiao text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cidade, uf)
);

-- Criar tabela importacoes_regionalidade
CREATE TABLE IF NOT EXISTS importacoes_regionalidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_nome text NOT NULL,
  total_linhas integer NOT NULL DEFAULT 0,
  inseridos integer NOT NULL DEFAULT 0,
  duplicados integer NOT NULL DEFAULT 0,
  erros integer NOT NULL DEFAULT 0,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_veiculos_filial_ativo ON veiculos(filial_id, ativo);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_regionalidades_uf ON regionalidades(uf);
CREATE INDEX IF NOT EXISTS idx_regionalidades_cidade ON regionalidades(cidade);

-- Habilitar RLS
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE regionalidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE importacoes_regionalidade ENABLE ROW LEVEL SECURITY;

-- Políticas para veiculos
CREATE POLICY "Admin pode ver todos os veículos"
  ON veiculos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "User pode ver veículos de sua filial"
  ON veiculos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.filial_id = veiculos.filial_id
    )
  );

CREATE POLICY "Admin pode inserir veículos"
  ON veiculos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "User pode inserir veículos em sua filial"
  ON veiculos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.filial_id = veiculos.filial_id
    )
  );

CREATE POLICY "Admin pode atualizar veículos"
  ON veiculos FOR UPDATE
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

CREATE POLICY "User pode atualizar veículos de sua filial"
  ON veiculos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.filial_id = veiculos.filial_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.filial_id = veiculos.filial_id
    )
  );

CREATE POLICY "Admin pode deletar veículos"
  ON veiculos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Políticas para regionalidades
CREATE POLICY "Todos podem ver regionalidades"
  ON regionalidades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin pode inserir regionalidades"
  ON regionalidades FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin pode deletar regionalidades"
  ON regionalidades FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Políticas para importacoes_regionalidade
CREATE POLICY "Admin pode ver todas as importações"
  ON importacoes_regionalidade FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "User pode ver suas importações"
  ON importacoes_regionalidade FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin pode inserir importações"
  ON importacoes_regionalidade FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );