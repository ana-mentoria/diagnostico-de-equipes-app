// Modelos de e-mail padrão (apresentação e lembrete) e utilitário para gerar
// links do Gmail já preenchidos. Ver especificação técnica, seção 4
// ("Modelos de e-mail e envio").
//
// Os modelos ficam salvos no localStorage do navegador para que edições da
// Ana persistam entre sessões, sem precisar de uma tabela nova no Supabase
// (são textos globais, não por equipe/cliente).

const STORAGE_KEY = 'diagnostico_equipes_email_templates_v1'

export const DEFAULT_TEMPLATES = {
  apresentacao: {
    assunto: 'Diagnóstico de Equipes {{equipe}} — sua participação é importante',
    corpo: `Olá, {{nome}}.

Você foi convidado(a) a participar do Diagnóstico de Equipes conduzido pela Ana Almeida Mentoria para a equipe {{equipe}}, da {{empresa}}.

O objetivo é identificar pontos fortes, desafios de gestão e eventuais conflitos que estejam afetando a produtividade e o bem-estar do time — a partir da visão de quem vive o dia a dia dela, você incluído(a).

Leva de 10 a 12 minutos. Não existem respostas certas ou erradas: o valor deste diagnóstico está na sua sinceridade. Suas respostas individuais não serão compartilhadas com sua liderança ou colegas — os resultados são analisados de forma agregada e anônima.

Responda até {{prazo}} pelo link abaixo:
{{link}}

Dúvidas? Escreva para contato@anaalmeidamentoria.com.br.

Obrigada por dedicar esses minutos,
Ana Almeida
Ana Almeida Mentoria`,
  },
  lembrete: {
    assunto: 'Lembrete — ainda dá tempo de responder ao Diagnóstico de Equipes {{equipe}}',
    corpo: `Olá, {{nome}}.

Este é um lembrete: ainda não recebemos sua resposta ao Diagnóstico de Equipes da equipe {{equipe}}.

Leva só 10 a 12 minutos, e sua participação faz diferença para o retrato real da equipe. Suas respostas continuam confidenciais e analisadas de forma agregada.

Link para responder:
{{link}}

Prazo: {{prazo}}

Qualquer dúvida, é só escrever para contato@anaalmeidamentoria.com.br.

Obrigada,
Ana Almeida
Ana Almeida Mentoria`,
  },
}

export function loadTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_TEMPLATES)
    const parsed = JSON.parse(raw)
    return {
      apresentacao: { ...DEFAULT_TEMPLATES.apresentacao, ...parsed.apresentacao },
      lembrete: { ...DEFAULT_TEMPLATES.lembrete, ...parsed.lembrete },
    }
  } catch {
    return structuredClone(DEFAULT_TEMPLATES)
  }
}

export function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

// prazo default: 5 dias corridos a partir de hoje, formatado dd/mm.
export function defaultPrazo() {
  const d = new Date()
  d.setDate(d.getDate() + 5)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function fillTemplate(str, vars) {
  return Object.keys(vars).reduce((acc, k) => acc.split(`{{${k}}}`).join(vars[k] ?? ''), str)
}

export function buildGmailLink({ assunto, corpo, destinatarioEmail, vars }) {
  const assuntoFinal = fillTemplate(assunto, vars)
  const corpoFinal = fillTemplate(corpo, vars)
  return (
    'https://mail.google.com/mail/?view=cm&fs=1&to=' +
    encodeURIComponent(destinatarioEmail ?? '') +
    '&su=' + encodeURIComponent(assuntoFinal) +
    '&body=' + encodeURIComponent(corpoFinal)
  )
}
