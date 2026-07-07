-- ============================================================================
-- Diagnóstico de Equipes — schema Supabase (Postgres)
-- Referência: Diagnostico_Equipes_Especificacao_Tecnica.docx, seção 5 e 6/7
--
-- Como rodar:
--   1. Crie um projeto em https://supabase.com
--   2. Abra o SQL Editor do projeto e cole este arquivo inteiro
--   3. Rode (Run). Isso cria as tabelas, as views públicas e a função de envio.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Tabelas
-- ----------------------------------------------------------------------------

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato_nome text,
  contato_email text,
  criado_em timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  nome text not null,
  token_acesso uuid not null unique default gen_random_uuid(),
  -- Fixo em 5 nesta versão (não configurável por equipe — ver especificação, seção 4/5).
  min_respondentes int not null default 5,
  status text not null default 'ativo' check (status in ('ativo', 'encerrado')),
  criado_em timestamptz not null default now()
);

create table if not exists expected_respondents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  nome text not null,
  email text,
  papel_esperado text not null check (papel_esperado in ('lider', 'liderado')),
  response_id uuid, -- preenchido quando a pessoa responde (fk abaixo, adicionada depois de criar 'responses')
  criado_em timestamptz not null default now()
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  expected_respondent_id uuid not null references expected_respondents(id) on delete cascade,
  papel text not null check (papel in ('lider', 'liderado')),
  nome text not null,
  funcao text not null,
  tempo_equipe text not null,
  criado_em timestamptz not null default now()
);

-- agora que 'responses' existe, cria a fk de expected_respondents.response_id
alter table expected_respondents
  drop constraint if exists expected_respondents_response_id_fkey;
alter table expected_respondents
  add constraint expected_respondents_response_id_fkey
  foreign key (response_id) references responses(id) on delete set null;

create table if not exists response_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  question_code text not null,
  tipo text not null check (tipo in ('likert', 'texto_longo', 'texto_curto', 'escolha_unica', 'escolha_ramificacao')),
  valor_likert int check (valor_likert between 1 and 5),
  valor_texto text
);

create index if not exists idx_teams_client on teams(client_id);
create index if not exists idx_expected_team on expected_respondents(team_id);
create index if not exists idx_responses_team on responses(team_id);
create index if not exists idx_answers_response on response_answers(response_id);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security
--
-- Estratégia (especificação, seção 6/7 — confidencialidade):
--   - O papel "anon" (link público do respondente) NUNCA lê responses nem
--     response_answers diretamente, e nunca lê a coluna email de
--     expected_respondents. Ele só enxerga duas views sem dado sensível
--     (team_public e expected_respondents_public) e só grava dados através
--     da função submit_response() (abaixo), que roda com privilégio elevado
--     e faz as validações necessárias.
--   - O papel "authenticated" (você, logada no painel) tem acesso completo.
--     Como só você usa o painel nesta versão (ver seção 2 — "fora do escopo:
--     múltiplos administradores"), não há filtro adicional por usuário.
-- ----------------------------------------------------------------------------

alter table clients enable row level security;
alter table teams enable row level security;
alter table expected_respondents enable row level security;
alter table responses enable row level security;
alter table response_answers enable row level security;

drop policy if exists "admin full access clients" on clients;
create policy "admin full access clients" on clients
  for all to authenticated using (true) with check (true);

drop policy if exists "admin full access teams" on teams;
create policy "admin full access teams" on teams
  for all to authenticated using (true) with check (true);

drop policy if exists "admin full access expected_respondents" on expected_respondents;
create policy "admin full access expected_respondents" on expected_respondents
  for all to authenticated using (true) with check (true);

drop policy if exists "admin full access responses" on responses;
create policy "admin full access responses" on responses
  for all to authenticated using (true) with check (true);

drop policy if exists "admin full access response_answers" on response_answers;
create policy "admin full access response_answers" on response_answers
  for all to authenticated using (true) with check (true);

-- Nenhuma policy para "anon" nestas 5 tabelas de propósito: o público não tem
-- nenhum acesso direto a elas. O acesso do link público passa só pelas views
-- e pela função abaixo.

-- ----------------------------------------------------------------------------
-- 3. Views públicas (somente leitura, sem dado sensível) — usadas pela tela
--    do respondente para carregar a equipe e a lista de nomes a selecionar.
-- ----------------------------------------------------------------------------

create or replace view team_public
  with (security_invoker = false) as
select id, nome, token_acesso, min_respondentes, status
from teams;

grant select on team_public to anon, authenticated;

create or replace view expected_respondents_public
  with (security_invoker = false) as
select id, team_id, nome, papel_esperado, (response_id is not null) as ja_respondeu
from expected_respondents;

grant select on expected_respondents_public to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Função de envio (RPC) — único caminho de escrita para o link público.
--
--    SECURITY DEFINER: roda com os privilégios do dono da função (que tem
--    acesso total às tabelas), então o anon consegue gravar sem precisar de
--    policies de INSERT abertas nas tabelas sensíveis.
-- ----------------------------------------------------------------------------

create or replace function submit_response(
  p_token uuid,
  p_expected_respondent_id uuid,
  p_papel text,
  p_funcao text,
  p_tempo_equipe text,
  p_answers jsonb -- ex.: [{"question_code":"L01","tipo":"likert","valor_likert":4}, {"question_code":"LA01","tipo":"texto_longo","valor_texto":"..."}]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_nome text;
  v_response_id uuid;
  v_answer jsonb;
begin
  -- valida o token e recupera a equipe
  select id into v_team_id from teams where token_acesso = p_token and status = 'ativo';
  if v_team_id is null then
    raise exception 'Link inválido ou equipe encerrada.';
  end if;

  -- valida que o respondente esperado pertence a essa equipe e ainda não respondeu
  select nome into v_nome
  from expected_respondents
  where id = p_expected_respondent_id and team_id = v_team_id and response_id is null;

  if v_nome is null then
    raise exception 'Respondente não encontrado, já respondeu, ou não pertence a esta equipe.';
  end if;

  if p_papel not in ('lider', 'liderado') then
    raise exception 'Papel inválido.';
  end if;

  -- grava a resposta
  insert into responses (team_id, expected_respondent_id, papel, nome, funcao, tempo_equipe)
  values (v_team_id, p_expected_respondent_id, p_papel, v_nome, p_funcao, p_tempo_equipe)
  returning id into v_response_id;

  -- marca o respondente esperado como respondido
  update expected_respondents set response_id = v_response_id where id = p_expected_respondent_id;

  -- grava cada resposta individual
  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    insert into response_answers (response_id, question_code, tipo, valor_likert, valor_texto)
    values (
      v_response_id,
      v_answer->>'question_code',
      v_answer->>'tipo',
      nullif(v_answer->>'valor_likert', '')::int,
      v_answer->>'valor_texto'
    );
  end loop;

  return v_response_id;
end;
$$;

revoke all on function submit_response(uuid, uuid, text, text, text, jsonb) from public;
grant execute on function submit_response(uuid, uuid, text, text, text, jsonb) to anon, authenticated;
