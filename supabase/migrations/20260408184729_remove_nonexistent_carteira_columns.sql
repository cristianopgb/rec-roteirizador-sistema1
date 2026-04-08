/*
  # Remove 7 colunas inexistentes do dataset real

  ## Contexto
  O dataset original (REC ERP V2) possui exatamente 43 colunas.
  As colunas abaixo foram adicionadas erroneamente e não fazem parte
  do arquivo real fornecido pelo cliente.

  ## Colunas removidas
  - `endereco` - Não existe no dataset
  - `numero` - Não existe no dataset
  - `placa_preferencial` - Não existe no dataset
  - `motorista_preferencial` - Não existe no dataset
  - `observacao_interna` - Não existe no dataset
  - `cliente_novo` - Não existe no dataset
  - `temperatura_controlada` - Não existe no dataset

  ## Impacto
  - Nenhuma perda de dados reais (as colunas nunca foram populadas pelo processo de upload)
  - A estrutura da tabela carteira_itens passa de 45 para 38 colunas de dados
*/

ALTER TABLE carteira_itens
  DROP COLUMN IF EXISTS endereco,
  DROP COLUMN IF EXISTS numero,
  DROP COLUMN IF EXISTS placa_preferencial,
  DROP COLUMN IF EXISTS motorista_preferencial,
  DROP COLUMN IF EXISTS observacao_interna,
  DROP COLUMN IF EXISTS cliente_novo,
  DROP COLUMN IF EXISTS temperatura_controlada;
