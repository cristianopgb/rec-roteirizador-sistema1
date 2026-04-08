/*
  # Add 5 New Columns to Carteira Itens (V2.1)

  ## Changes
  
  1. New Columns Added
     - `placa_preferencial` (text) - Placa do veículo preferencial para entrega
     - `motorista_preferencial` (text) - Nome do motorista preferencial
     - `observacao_interna` (text) - Observações internas da operação
     - `cliente_novo` (text) - Indica se é cliente novo (S/N)
     - `temperatura_controlada` (text) - Indica se requer temperatura controlada (S/N)
  
  2. Notes
     - All fields are nullable to accept empty values from Excel
     - Text type for maximum flexibility
     - No validation constraints - data accepted as-is
*/

-- Add 5 new columns to carteira_itens table
ALTER TABLE carteira_itens
ADD COLUMN IF NOT EXISTS placa_preferencial text,
ADD COLUMN IF NOT EXISTS motorista_preferencial text,
ADD COLUMN IF NOT EXISTS observacao_interna text,
ADD COLUMN IF NOT EXISTS cliente_novo text,
ADD COLUMN IF NOT EXISTS temperatura_controlada text;
