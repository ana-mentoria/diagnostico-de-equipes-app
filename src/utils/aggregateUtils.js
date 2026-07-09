import questions from '../data/questions.json'

// Rótulos das dimensões de "dinâmica de equipe", que no banco de perguntas
// não têm dimensao_label (só dimensao_id) — ver questions.json, blocos
// bloco_lider.equipe / bloco_liderado.equipe.
const DINAMICA_LABELS = {
  conflitos_nao_resolvidos: 'Conflitos não resolvidos',
  colaboracao_pares: 'Colaboração entre pares',
  clareza_papeis: 'Clareza de papéis',
  justica_carga_trabalho: 'Justiça na carga de trabalho',
  seguranca_psicologica: 'Segurança psicológica',
  resposta_a_desafios: 'Resposta a desafios',
  confianca_pares: 'Confiança entre colegas',
}

function media(valores) {
  if (valores.length === 0) return null
  const soma = valores.reduce((a, b) => a + b, 0)
  return Math.round((soma / valores.length) * 10) / 10
}

// Recebe:
//  - responses: linhas da tabela `responses` desta equipe (com id, papel)
//  - answers: linhas da tabela `response_answers` cujos response_id estão em responses
// Devolve um resumo agregado, sem nenhuma resposta individual identificável.
export function buildAggregateSummary(responses, answers, minRespondentes) {
  const responseById = new Map(responses.map((r) => [r.id, r]))

  // agrupa valores de likert por question_code, já filtrando por papel de quem respondeu
  const porCodigo = new Map() // codigo -> number[]
  for (const a of answers) {
    if (a.tipo !== 'likert' || a.valor_likert == null) continue
    const resp = responseById.get(a.response_id)
    if (!resp) continue
    if (!porCodigo.has(a.question_code)) porCodigo.set(a.question_code, [])
    porCodigo.get(a.question_code).push(a.valor_likert)
  }

  const liderResponses = responses.filter((r) => r.papel === 'lider')
  const liderasResponses = responses.filter((r) => r.papel === 'liderado')
  const liderasCount = liderasResponses.length
  const liberado = liderasCount >= minRespondentes

  // --- Bloco espelhado 360º: L01..L13 (líder) x D01..D13 (liderados) ---
  const autoLider = questions.bloco_lider.autoavaliacao
  const avalLider = questions.bloco_liderado.avaliacao_lider
  const dimensoes360 = autoLider.map((qLider, i) => {
    const qLiderado = avalLider[i] // mesma posição = mesma dimensao_id (ver pares_dimensoes_360)
    return {
      dimensao_id: qLider.dimensao_id,
      label: qLider.dimensao_label,
      perguntaLider: qLider.texto,
      perguntaLiderados: qLiderado?.texto ?? '',
      mediaLider: media(porCodigo.get(qLider.codigo) ?? []),
      nLider: (porCodigo.get(qLider.codigo) ?? []).length,
      mediaLiderados: liberado ? media(porCodigo.get(qLiderado?.codigo) ?? []) : null,
      nLiderados: (porCodigo.get(qLiderado?.codigo) ?? []).length,
    }
  })

  // --- Dinâmica de equipe: LE0x (líder) e DE0x (liderados), casados por dimensao_id ---
  const leItems = questions.bloco_lider.equipe
  const deItems = questions.bloco_liderado.equipe
  const dinamicaEquipe = deItems.map((qD) => {
    const qL = leItems.find((x) => x.dimensao_id === qD.dimensao_id)
    return {
      dimensao_id: qD.dimensao_id,
      label: DINAMICA_LABELS[qD.dimensao_id] ?? qD.dimensao_id,
      perguntaLider: qL?.texto ?? '',
      perguntaLiderados: qD.texto,
      mediaLider: qL ? media(porCodigo.get(qL.codigo) ?? []) : null,
      mediaLiderados: liberado ? media(porCodigo.get(qD.codigo) ?? []) : null,
      nLiderados: (porCodigo.get(qD.codigo) ?? []).length,
    }
  })

  // --- Autoavaliação exclusiva do(a) liderado(a): AA01..AA05 ---
  const autoLiderado = questions.bloco_liderado.autoavaliacao.map((q) => ({
    dimensao_id: q.dimensao_id,
    label: q.dimensao_label,
    pergunta: q.texto,
    media: liberado ? media(porCodigo.get(q.codigo) ?? []) : null,
    n: (porCodigo.get(q.codigo) ?? []).length,
  }))

  return {
    totalRespostas: responses.length,
    liderCount: liderResponses.length,
    liderasCount,
    liberado,
    faltamParaLiberar: Math.max(0, minRespondentes - liderasCount),
    dimensoes360,
    dinamicaEquipe,
    autoavaliacaoLiderado: autoLiderado,
  }
}
