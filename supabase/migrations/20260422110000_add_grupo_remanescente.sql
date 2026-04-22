ALTER TABLE remanescentes_roteirizacao
ADD COLUMN IF NOT EXISTS grupo_remanescente text;

CREATE INDEX IF NOT EXISTS remanescentes_roteirizacao_grupo_idx
  ON remanescentes_roteirizacao(rodada_id, grupo_remanescente);
