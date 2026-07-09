import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useEquipeData } from '../../hooks/useEquipeData'
import { buildAggregateSummary } from '../../utils/aggregateUtils'

// Visualização agregada básica (Fase 2). O gráfico comparativo completo com
// análise gerada por IA e o resumo de relatório entram na Fase 3 — aqui o
// objetivo é dar uma primeira leitura numérica, já respeitando a regra de
// anonimato mínimo (ver especificação, seção 4 e 6).
export default function Resultados({ teamId }) {
  const { loading: loadingEquipe, error: errorEquipe, team } = useEquipeData(teamId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resumo, setResumo] = useState(null)

  useEffect(() => {
    if (!teamId || !team) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      const { data: responses, error: respErr } = await supabase
        .from('responses')
        .select('id, papel')
        .eq('team_id', teamId)

      if (cancelled) return
      if (respErr) {
        setError('Não foi possível carregar as respostas desta equipe.')
        setLoading(false)
        return
      }

      if (!responses || responses.length === 0) {
        setResumo(buildAggregateSummary([], [], team.min_respondentes))
        setLoading(false)
        return
      }

      const responseIds = responses.map((r) => r.id)
      const { data: answers, error: answersErr } = await supabase
        .from('response_answers')
        .select('response_id, question_code, tipo, valor_likert')
        .in('response_id', responseIds)

      if (cancelled) return
      if (answersErr) {
        setError('Não foi possível carregar as respostas desta equipe.')
        setLoading(false)
        return
      }

      setResumo(buildAggregateSummary(responses, answers ?? [], team.min_respondentes))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [teamId, team])

  if (!teamId) return <p className="muted">Selecione uma equipe na aba &quot;Clientes e equipes&quot;.</p>
  if (loadingEquipe || loading) return <p className="muted">Carregando…</p>
  if (errorEquipe || error) return <div className="error-box">{errorEquipe || error}</div>
  if (!team || !resumo) return null

  return (
    <div>
      <h1>Resultados (visão básica) — {team.nome}</h1>
      <p className="muted">
        {resumo.liderCount} líder(es) e {resumo.liderasCount} liderado(s) responderam até agora.
      </p>

      {!resumo.liberado && (
        <div className="warning-banner">
          Amostra pequena: faltam {resumo.faltamParaLiberar} resposta(s) de liderados para liberar a
          comparação por dimensão (mínimo de {team.min_respondentes}, regra de anonimato — evita que uma
          resposta individual fique identificável).
        </div>
      )}

      <div className="section-title">Comparação por dimensão (autoavaliação do líder x média dos liderados)</div>
      {resumo.dimensoes360.map((d) => (
        <div className="dim-card" key={d.dimensao_id}>
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <strong style={{ fontSize: 13 }}>{d.label}</strong>
            <span className="dim-val">
              {d.mediaLider ?? '—'} / {d.mediaLiderados ?? (resumo.liberado ? '—' : '🔒')}
            </span>
          </div>
        </div>
      ))}

      <div className="section-title">Dinâmica de equipe (visão dos liderados)</div>
      {resumo.dinamicaEquipe.map((d) => (
        <div className="dim-card" key={d.dimensao_id}>
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <strong style={{ fontSize: 13 }}>{d.label}</strong>
            <span className="dim-val">{d.mediaLiderados ?? (resumo.liberado ? '—' : '🔒')}</span>
          </div>
        </div>
      ))}

      <div className="section-title">Autoavaliação exclusiva do(a) liderado(a)</div>
      {resumo.autoavaliacaoLiderado.map((d) => (
        <div className="dim-card" key={d.dimensao_id}>
          <div className="row-between" style={{ alignItems: 'flex-start' }}>
            <strong style={{ fontSize: 13 }}>{d.label}</strong>
            <span className="dim-val">{d.media ?? (resumo.liberado ? '—' : '🔒')}</span>
          </div>
        </div>
      ))}

      <p className="muted" style={{ marginTop: 16 }}>
        Gráfico comparativo com pergunta original, análise gerada por IA, respostas abertas e exportação
        (CSV/PDF) entram na Fase 3.
      </p>
    </div>
  )
}
