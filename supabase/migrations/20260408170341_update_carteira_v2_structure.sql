/*
  # Update Carteira Structure to V2 (45 columns)

  ## Summary
  This migration updates the carteira_itens table structure to accommodate the new V2 dataset format with 45 columns.

  ## Changes Made

  ### 1. Column Renaming (18 columns)
  Renamed existing columns to match new Excel format:
  - `filial` → `filial_r` (Filial de roteirização)
  - `filial_origem` → `filial_d` (Filial de destino)
  - `peso_c` → `peso_cubico` (Peso cúbico)
  - `classifi` → `classif` (Classificação)
  - `tomador` → `tomad` (Tomador)
  - `destinatario` → `destin` (Destinatário)
  - `cida` → `cidade` (Cidade)
  - `ocorrencias_nfs` → `ocorrencias_nf` (Ocorrências NF)
  - `observacao_r` → `observacao` (Observação)
  - `ultima` → `ultima_ocorrencia` (Última Ocorrência)
  - `status` → `status_r` (Status)
  - `lat` → `latitude` (Latitude)
  - `lon` → `longitude` (Longitude)
  - `peso_calculado` → `peso_calculo` (Peso Calculado)

  ### 2. New Columns Added (6 columns)
  Critical new fields for advanced routing:
  - `tipo_ca text` - Additional cargo type field (separate from tipo_carga)
  - `restricao_veiculo text` - Vehicle restriction (ENUM: TRUCK, VUC, CARRETA, etc.)
  - `carro_dedicado boolean` - Dedicated vehicle flag (default: false)
  - `inicio_entrega time` - Delivery window start time
  - `fim_entrega time` - Delivery window end time
  - `endereco text` - Full address
  - `numero text` - Address number

  ### 3. Columns Removed (2 columns)
  Obsolete fields removed:
  - `regiao` - Region field (no longer used)
  - `veiculo_exclusivo` - Replaced by carro_dedicado
  - `tipo_c` - Removed (replaced by tipo_ca)

  ### 4. Type Changes
  - `prioridade`: Changed from integer to text (ENUM: ALTA, MEDIA, BAIXA, URGENTE, NORMAL)

  ### 5. Constraints and Indexes
  - CHECK constraint on restricao_veiculo (valid enum values)
  - CHECK constraint on prioridade (valid enum values)
  - CHECK constraint on delivery window (inicio_entrega < fim_entrega when both present)
  - Indexes on new searchable/filterable columns

  ## Impact on Routing
  - `carro_dedicado=true` → Forces single-customer routes
  - `restricao_veiculo` → Filters available fleet
  - `inicio_entrega/fim_entrega` → Hard time window constraints
  - `prioridade` → Influences delivery sequence
  - `peso_cubico` → Improves capacity calculations

  ## Security
  - All existing RLS policies remain active
  - No changes to permissions structure
*/

-- Step 1: Add new columns
ALTER TABLE carteira_itens
  ADD COLUMN IF NOT EXISTS tipo_ca text,
  ADD COLUMN IF NOT EXISTS restricao_veiculo text,
  ADD COLUMN IF NOT EXISTS carro_dedicado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS inicio_entrega time,
  ADD COLUMN IF NOT EXISTS fim_entrega time,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS numero text;

-- Step 2: Rename existing columns
DO $$ 
BEGIN
  -- Rename filial to filial_r
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'filial') THEN
    ALTER TABLE carteira_itens RENAME COLUMN filial TO filial_r;
  END IF;

  -- Rename filial_origem to filial_d
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'filial_origem') THEN
    ALTER TABLE carteira_itens RENAME COLUMN filial_origem TO filial_d;
  END IF;

  -- Rename peso_c to peso_cubico
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'peso_c') THEN
    ALTER TABLE carteira_itens RENAME COLUMN peso_c TO peso_cubico;
  END IF;

  -- Rename classifi to classif
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'classifi') THEN
    ALTER TABLE carteira_itens RENAME COLUMN classifi TO classif;
  END IF;

  -- Rename tomador to tomad
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'tomador') THEN
    ALTER TABLE carteira_itens RENAME COLUMN tomador TO tomad;
  END IF;

  -- Rename destinatario to destin
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'destinatario') THEN
    ALTER TABLE carteira_itens RENAME COLUMN destinatario TO destin;
  END IF;

  -- Rename cida to cidade
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'cida') THEN
    ALTER TABLE carteira_itens RENAME COLUMN cida TO cidade;
  END IF;

  -- Rename ocorrencias_nfs to ocorrencias_nf
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'ocorrencias_nfs') THEN
    ALTER TABLE carteira_itens RENAME COLUMN ocorrencias_nfs TO ocorrencias_nf;
  END IF;

  -- Rename observacao_r to observacao
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'observacao_r') THEN
    ALTER TABLE carteira_itens RENAME COLUMN observacao_r TO observacao;
  END IF;

  -- Rename ultima to ultima_ocorrencia
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'ultima') THEN
    ALTER TABLE carteira_itens RENAME COLUMN ultima TO ultima_ocorrencia;
  END IF;

  -- Rename status to status_r
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'status') THEN
    ALTER TABLE carteira_itens RENAME COLUMN status TO status_r;
  END IF;

  -- Rename lat to latitude
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'lat') THEN
    ALTER TABLE carteira_itens RENAME COLUMN lat TO latitude;
  END IF;

  -- Rename lon to longitude
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'lon') THEN
    ALTER TABLE carteira_itens RENAME COLUMN lon TO longitude;
  END IF;

  -- Rename peso_calculado to peso_calculo
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'peso_calculado') THEN
    ALTER TABLE carteira_itens RENAME COLUMN peso_calculado TO peso_calculo;
  END IF;
END $$;

-- Step 3: Change prioridade from integer to text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'carteira_itens' 
    AND column_name = 'prioridade' 
    AND data_type = 'integer'
  ) THEN
    -- Convert existing integer values to text enum
    ALTER TABLE carteira_itens ALTER COLUMN prioridade TYPE text USING (
      CASE 
        WHEN prioridade = 0 THEN 'URGENTE'
        WHEN prioridade = 1 THEN 'ALTA'
        WHEN prioridade = 2 THEN 'MEDIA'
        WHEN prioridade = 3 THEN 'BAIXA'
        ELSE 'NORMAL'
      END
    );
  END IF;
END $$;

-- Step 4: Remove obsolete columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'regiao') THEN
    ALTER TABLE carteira_itens DROP COLUMN regiao;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'veiculo_exclusivo') THEN
    ALTER TABLE carteira_itens DROP COLUMN veiculo_exclusivo;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carteira_itens' AND column_name = 'tipo_c') THEN
    ALTER TABLE carteira_itens DROP COLUMN tipo_c;
  END IF;
END $$;

-- Step 5: Add constraints
DO $$
BEGIN
  -- Check constraint for restricao_veiculo enum
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'carteira_itens' AND constraint_name = 'carteira_itens_restricao_veiculo_check'
  ) THEN
    ALTER TABLE carteira_itens 
      ADD CONSTRAINT carteira_itens_restricao_veiculo_check 
      CHECK (restricao_veiculo IS NULL OR restricao_veiculo IN ('TRUCK', 'VUC', 'CARRETA', 'UTILITARIO', 'TOCO', 'BITRUCK', 'QUALQUER'));
  END IF;

  -- Check constraint for prioridade enum
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'carteira_itens' AND constraint_name = 'carteira_itens_prioridade_check'
  ) THEN
    ALTER TABLE carteira_itens 
      ADD CONSTRAINT carteira_itens_prioridade_check 
      CHECK (prioridade IS NULL OR prioridade IN ('ALTA', 'MEDIA', 'BAIXA', 'URGENTE', 'NORMAL'));
  END IF;

  -- Check constraint for delivery window
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'carteira_itens' AND constraint_name = 'carteira_itens_janela_entrega_check'
  ) THEN
    ALTER TABLE carteira_itens 
      ADD CONSTRAINT carteira_itens_janela_entrega_check 
      CHECK (inicio_entrega IS NULL OR fim_entrega IS NULL OR inicio_entrega < fim_entrega);
  END IF;
END $$;

-- Step 6: Create indexes for new filterable columns
CREATE INDEX IF NOT EXISTS idx_carteira_restricao_veiculo ON carteira_itens(restricao_veiculo);
CREATE INDEX IF NOT EXISTS idx_carteira_carro_dedicado ON carteira_itens(carro_dedicado);
CREATE INDEX IF NOT EXISTS idx_carteira_prioridade ON carteira_itens(prioridade);
CREATE INDEX IF NOT EXISTS idx_carteira_janela_entrega ON carteira_itens(inicio_entrega, fim_entrega);

-- Step 7: Add comments documenting V2 structure
COMMENT ON TABLE carteira_itens IS 'Carteira V2: 45-column structure with enhanced routing fields (restricao_veiculo, carro_dedicado, janelas de entrega)';
COMMENT ON COLUMN carteira_itens.tipo_ca IS 'Additional cargo type field (separate from tipo_carga)';
COMMENT ON COLUMN carteira_itens.restricao_veiculo IS 'Vehicle restriction enum: TRUCK, VUC, CARRETA, UTILITARIO, TOCO, BITRUCK, QUALQUER';
COMMENT ON COLUMN carteira_itens.carro_dedicado IS 'Dedicated vehicle flag - forces single-customer routes when true';
COMMENT ON COLUMN carteira_itens.inicio_entrega IS 'Delivery window start time (HH:MM:SS format)';
COMMENT ON COLUMN carteira_itens.fim_entrega IS 'Delivery window end time (HH:MM:SS format)';
COMMENT ON COLUMN carteira_itens.prioridade IS 'Priority enum: ALTA, MEDIA, BAIXA, URGENTE, NORMAL - influences delivery sequence';
