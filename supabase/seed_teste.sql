-- ============================================================================
-- Seed de teste — cria um cliente, uma equipe e 3 respondentes esperados
-- Rode isso no SQL Editor do Supabase, DEPOIS de já ter rodado o schema.sql
-- ============================================================================

-- 1. Cria o cliente e a equipe, e devolve o token de acesso
with novo_cliente as (
  insert into clients (nome) values ('Empresa Teste') returning id
),
nova_equipe as (
  insert into teams (client_id, nome)
  select id, 'Equipe Teste' from novo_cliente
  returning id, token_acesso
)
select id as team_id, token_acesso from nova_equipe;

-- 2. Copie o "team_id" retornado acima e cole no lugar de TEAM_ID abaixo,
--    depois rode este segundo bloco para cadastrar os respondentes esperados.
insert into expected_respondents (team_id, nome, email, papel_esperado) values
  ('TEAM_ID', 'Marina Duarte', 'marina@teste.com', 'lider'),
  ('TEAM_ID', 'Carlos Nogueira', 'carlos@teste.com', 'liderado'),
  ('TEAM_ID', 'Juliana Prado', 'juliana@teste.com', 'liderado');

-- 3. O link de teste fica: http://localhost:5173/responder/{token_acesso}
--    (o token_acesso que veio no passo 1)
