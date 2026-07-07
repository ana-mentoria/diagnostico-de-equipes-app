import questions from '../data/questions.json'

// Monta a sequência de perguntas para um papel (líder ou liderado), na ordem
// descrita na especificação (seção 3): autoavaliação/avaliação do líder (12),
// dinâmica da equipe (5 para líder, 6 para liderado), perguntas abertas (5).
export function getQuestionFlow(papel) {
  const bloco = papel === 'lider' ? questions.bloco_lider : questions.bloco_liderado
  const principal = papel === 'lider' ? bloco.autoavaliacao : bloco.avaliacao_lider

  const withSection = (arr, secao) => arr.map((q) => ({ ...q, secao }))

  return [
    ...withSection(principal, 'lideranca'),
    ...withSection(bloco.equipe, 'dinamica_equipe'),
    ...withSection(bloco.abertas, 'abertas'),
  ]
}

export function getEscalaLikert() {
  return questions.meta.escala_likert
}

export function getIdentificacao() {
  return questions.identificacao
}

export const SECAO_LABELS = {
  lideranca: 'Autoavaliação de liderança',
  dinamica_equipe: 'Dinâmica da equipe',
  abertas: 'Perguntas abertas',
}
