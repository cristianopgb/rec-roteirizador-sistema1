/*
  # Alter carteira_itens Column Types

  1. Type Changes
    - agendam: DATE → TIMESTAMP (to store date + time)
    - filial: TEXT → INTEGER
    - romane: TEXT → INTEGER
    - filial_origem: TEXT → INTEGER
    - serie: TEXT → INTEGER
    - nro_doc: TEXT → INTEGER
    - qtd: TEXT → INTEGER
    - qtd_nf: TEXT → INTEGER
    - palet: TEXT → INTEGER

  2. Purpose
    - Ensure correct data types for business logic
    - Enable proper numeric operations on integer fields
    - Store scheduling timestamps with time component

  3. Important Notes
    - Uses USING clause for safe type conversion
    - Existing data will be converted to new types
    - NULL values are preserved
*/

-- Alter agendam from DATE to TIMESTAMP
ALTER TABLE carteira_itens
ALTER COLUMN agendam TYPE timestamp USING agendam::timestamp;

-- Alter integer fields from TEXT to INTEGER
ALTER TABLE carteira_itens
ALTER COLUMN filial TYPE integer USING filial::integer;

ALTER TABLE carteira_itens
ALTER COLUMN romane TYPE integer USING romane::integer;

ALTER TABLE carteira_itens
ALTER COLUMN filial_origem TYPE integer USING filial_origem::integer;

ALTER TABLE carteira_itens
ALTER COLUMN serie TYPE integer USING serie::integer;

ALTER TABLE carteira_itens
ALTER COLUMN nro_doc TYPE integer USING nro_doc::integer;

ALTER TABLE carteira_itens
ALTER COLUMN qtd TYPE integer USING qtd::integer;

ALTER TABLE carteira_itens
ALTER COLUMN qtd_nf TYPE integer USING qtd_nf::integer;

ALTER TABLE carteira_itens
ALTER COLUMN palet TYPE integer USING palet::integer;
