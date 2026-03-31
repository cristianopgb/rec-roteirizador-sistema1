/*
  # Remove trigger automático de criação de profile

  ## Mudanças
  
  1. Remove o trigger `on_auth_user_created` que executava automaticamente ao criar usuários
  2. Remove a função `handle_new_user()` que não é mais necessária
  
  ## Motivo
  
  O trigger tentava criar perfis automaticamente quando usuários eram criados no auth.users,
  mas falhava porque a tabela `profiles` exige campos `nome` e `filial_id` que não estavam
  disponíveis no momento da criação do usuário.
  
  A edge function `create-user` já gerencia manualmente a criação do profile com todos
  os dados necessários, tornando o trigger desnecessário e problemático.
  
  ## Segurança
  
  - Não afeta RLS policies
  - Não afeta dados existentes
  - Apenas remove automação redundante
*/

-- Remove o trigger que executa automaticamente ao criar usuários
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove a função que não é mais necessária
DROP FUNCTION IF EXISTS public.handle_new_user();
