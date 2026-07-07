# Diagnóstico de Equipes — app

Implementação da Fase 1 do plano descrito em `Diagnostico_Equipes_Especificacao_Tecnica.docx`:
schema no Supabase + tela pública de resposta (líder/liderado), com gravação real das respostas.

## O que já está pronto

- `supabase/schema.sql` — todas as tabelas (`clients`, `teams`, `expected_respondents`,
  `responses`, `response_answers`), Row Level Security e a função `submit_response()`
  que faz a gravação de forma segura (o link público nunca lê respostas nem e-mails,
  só grava através dessa função).
- Tela do respondente (`/responder/{token}`): boas-vindas → identificação (papel,
  nome selecionado da lista de respondentes esperados, função, tempo de equipe) →
  perguntas (likert + abertas, carregadas de `src/data/questions.json`) → confirmação.
- Visual replicando o protótipo já aprovado (`Diagnostico_Equipes_Layout_Prototipo.html`):
  mesma paleta, logo, rodapé com CNPJ.

## O que falta para você conseguir testar com dados reais

1. **Criar o projeto no Supabase** (gratuito): supabase.com → "New project".
2. **Rodar o schema**: abra o SQL Editor do projeto, cole o conteúdo de `supabase/schema.sql` e rode.
3. **Pegar as chaves**: em Project Settings → API, copie a "Project URL" e a "anon public key".
4. **Configurar o app**: copie `.env.example` para `.env` e cole as duas chaves.
5. **Rodar localmente**:
   ```
   npm install
   npm run dev
   ```
6. **Criar uma equipe de teste**: como ainda não existe o painel da administradora
   (Fase 2), por enquanto isso é feito direto no SQL Editor do Supabase. Exemplo:
   ```sql
   insert into clients (nome) values ('Empresa Teste') returning id;
   -- copie o id retornado e use no lugar de CLIENT_ID abaixo

   insert into teams (client_id, nome) values ('CLIENT_ID', 'Equipe Teste')
   returning id, token_acesso;
   -- copie o token_acesso: é o que vai na URL /responder/{token_acesso}

   insert into expected_respondents (team_id, nome, email, papel_esperado) values
     ('TEAM_ID', 'Marina Duarte', 'marina@teste.com', 'lider'),
     ('TEAM_ID', 'Carlos Nogueira', 'carlos@teste.com', 'liderado'),
     ('TEAM_ID', 'Juliana Prado', 'juliana@teste.com', 'liderado');
   ```
7. Acesse `http://localhost:5173/responder/{token_acesso}` e responda o diagnóstico
   de ponta a ponta. Confira em `responses` e `response_answers` no Supabase que os
   dados foram gravados, e que `expected_respondents.response_id` foi preenchido.

## Próxima fase

Fase 2 (painel da administradora): login, criação de equipe pelo próprio painel
(sem precisar de SQL manual), status nominal de quem respondeu, modelos de e-mail.
