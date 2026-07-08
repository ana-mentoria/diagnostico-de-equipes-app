import questions from '../data/questions.json'

// Monta a sequência de perguntas para um papel (líder ou liderado).
// Líder: autoavaliação (13) -> dinâmica da equipe (6) -> abertas (5).
// Liderado: autoavaliação própria (5, seção nova) -> avaliação da liderança (13)
// -> dinâmica da equipe (7) -> abertas (5). A autoavaliação do liderado vem
// ANTES da avaliação da liderança de propósito: ele reflete sobre o próprio
// esforço/autonomia antes de julgar o líder.
export function getQuestionFlow(papel) {
  const withSection = (arr, secao) => arr.map((q) => ({ ...q, secao }))

  if (papel === 'lider') {
    const bloco = questions.bloco_lider
    return [
      ...withSection(bloco.autoavaliacao, 'autoavaliacao_lider'),
      ...withSection(bloco.equipe, 'dinamica_equipe'),
      ...withSection(bloco.abertas, 'abertas'),
    ]
  }

  const bloco = questions.bloco_liderado
  return [
    ...withSection(bloco.autoavaliacao, 'autoavaliacao_liderado'),
    ...withSection(bloco.avaliacao_lider, 'avaliacao_lider'),
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
  autoavaliacao_lider: 'Autoavaliação de liderança',
  autoavaliacao_liderado: 'Sua autoavaliação',
  avaliacao_lider: 'Avaliação da liderança',
  dinamica_equipe: 'Dinâmica da equipe',
  abertas: 'Perguntas abertas',
}
