# Diagnóstico de Equipes — app

Implementação das Fases 1 e 2 do plano descrito em `Diagnostico_Equipes_Especificacao_Tecnica.docx`:
schema no Supabase, tela pública de resposta (líder/liderado) e painel da administradora.

## O que já está pronto

**Fase 1 — estrutura base**
- `supabase/schema.sql` — todas as tabelas (`clients`, `teams`, `expected_respondents`,
  `responses`, `response_answers`), Row Level Security e a função `submit_response()`
  que faz a gravação de forma segura (o link público nunca lê respostas nem e-mails,
  só grava através dessa função).
- Tela do respondente (`/responder/{token}`): boas-vindas → identificação (papel,
  nome selecionado da lista de respondentes esperados, função, tempo de equipe) →
  perguntas (likert + abertas, carregadas de `src/data/questions.json`) → confirmação.

**Fase 2 — painel da administradora (`/admin`)**
- Login com Supabase Auth (e-mail/senha) — só você acessa, nenhum cadastro público.
- Aba "Clientes e equipes": lista todos os clientes e suas equipes, com progresso
  de quem já respondeu.
- Aba "Nova equipe": cria cliente (ou reaproveita um existente), cadastra a equipe
  e a lista de respondentes esperados (nome, e-mail, papel), e gera o link de
  acesso automaticamente — sem precisar de SQL manual.
- Aba "Status da equipe": status nominal (quem respondeu, quem falta) com botões
  de convite/lembrete que abrem o Gmail já preenchido para cada pessoa.
- Aba "E-mails": os dois modelos (apresentação e lembrete) ficam editáveis ali,
  com seleção de destinatários e geração de link individual ou único.
- Aba "Resultados": visão agregada básica (médias por dimensão, líder x liderados),
  já aplicando a regra de anonimato — só libera a comparação quando pelo menos 5
  liderados tiverem respondido. O gráfico com pergunta original, análise gerada por
  IA e exportação (CSV/PDF) ficam para a Fase 3.

Visual replicando os protótipos já aprovados (`Diagnostico_Equipes_Layout_Prototipo.html`
e `Diagnostico_Equipes_Layout_Painel_Administradora.html`): mesma paleta, logo, rodapé com CNPJ.

## Como configurar (do zero)

1. **Criar o projeto no Supabase** (gratuito): supabase.com → "New project".
2. **Rodar o schema**: abra o SQL Editor do projeto, cole o conteúdo de `supabase/schema.sql` e rode.
3. **Pegar as chaves**: em Project Settings → API, copie a "Project URL" e a "anon public key".
4. **Configurar o app**: copie `.env.example` para `.env` e cole as duas chaves.
5. **Criar seu usuário do painel** (Fase 2): no Supabase, vá em Authentication → Users →
   "Add user" → "Create new user". Cadastre seu e-mail e uma senha. Deixe marcado
   "Auto Confirm User" (assim você já entra direto, sem precisar clicar em link de
   confirmação). Esse é o e-mail/senha que você vai usar para entrar em `/admin`.
   (Não crie usuários pelo formulário de cadastro público — não existe um nesta
   versão, de propósito: só você acessa o painel.)
6. **Rodar localmente**:
   ```
   npm install
   npm run dev
   ```
7. Acesse `http://localhost:5173/admin`, entre com o e-mail/senha do passo 5, e use
   a aba "Nova equipe" para criar sua primeira equipe de teste — o link de resposta
   já sai pronto para copiar.
8. Acesse o link gerado (`/responder/{token}`) e responda o diagnóstico de ponta a
   ponta (em outra aba/janela, ou peça para alguém de teste responder). Volte ao
   painel, aba "Status da equipe", e confira que o nome aparece como "Respondeu".

## Próxima fase

Fase 3 (comparação 360º e regras de anonimato completas): gráfico comparativo com
a pergunta original de cada dimensão, análise curta gerada por IA por item, resumo
textual gerado por IA e editável para o relatório final, e exportação (CSV/PDF).
