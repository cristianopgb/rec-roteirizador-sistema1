/*
  # Add 3 New Columns to Carteira Dataset

  1. Changes to `carteira_itens` table
    - Add `veiculo_exclusivo` (text) - optional field for exclusive vehicle assignment
    - Add `peso_calculado` (numeric) - optional field for calculated weight
    - Add `prioridade` (integer) - optional field for priority level
  
  2. Design Decisions
    - All columns are optional (nullable) - no NOT NULL constraints
    - No default values - preserves real absence of data as NULL
    - No business rule validation - Sistema 1 transports data, doesn't interpret it
    - No indexes - these are informational fields for Sistema 2 processing
  
  3. Important Notes
    - Existing records will have NULL values for these columns (expected behavior)
    - The official layout changes from 38 to 41 columns
    - Sistema 2 must be prepared to receive these columns before first upload
    - Empty cells in Excel will be persisted as NULL and sent as `null` in payload
*/

-- Add 3 new columns to carteira_itens table
-- No defaults, no NOT NULL, no business constraints
ALTER TABLE carteira_itens 
  ADD COLUMN IF NOT EXISTS veiculo_exclusivo text,
  ADD COLUMN IF NOT EXISTS peso_calculado numeric,
  ADD COLUMN IF NOT EXISTS prioridade integer;
