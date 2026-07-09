import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Dashboard({ onVerEquipe, reloadToken }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [grupos, setGrupos] = useState([]) // [{ client, teams: [{ team, total, done }] }]

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const [{ data: clients, error: clientsErr }, { data: teams, error: teamsErr }, { data: expected, error: expErr }] =
        await Promise.all([
          supabase.from('clients').select('id, nome').order('nome'),
          supabase.from('teams').select('id, client_id, nome, status, criado_em').order('criado_em', { ascending: false }),
          supabase.from('expected_respondents').select('id, team_id, response_id'),
        ])

      if (cancelled) return
      if (clientsErr || teamsErr || expErr) {
        setError('Não foi possível carregar os dados. Confira sua conexão e tente novamente.')
        setLoading(false)
        return
      }

      const grupos = (clients ?? [])
        .map((client) => {
          const teamsDoCliente = (teams ?? []).filter((t) => t.client_id === client.id)
          const teamsComContagem = teamsDoCliente.map((team) => {
            const doTeam = (expected ?? []).filter((e) => e.team_id === team.id)
            const total = doTeam.length
            const done = doTeam.filter((e) => e.response_id != null).length
            return { team, total, done }
          })
          return { client, teams: teamsComContagem }
        })
        .filter((g) => g.teams.length > 0)

      setGrupos(grupos)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [reloadToken])

  if (loading) return <p className="muted">Carregando…</p>
  if (error) return <div className="error-box">{error}</div>

  return (
    <div>
      <h1>Clientes e equipes</h1>
      <p className="muted">Visão geral dos diagnósticos em andamento.</p>

      {grupos.length === 0 && (
        <p className="muted">Nenhuma equipe cadastrada ainda. Use a aba &quot;Nova equipe&quot; para começar.</p>
      )}

      {grupos.map(({ client, teams }) => (
        <div key={client.id}>
          <div className="section-title">{client.nome}</div>
          {teams.map(({ team, total, done }) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            return (
              <div className="card" key={team.id}>
                <div className="row-between">
                  <div>
                    <strong style={{ fontSize: 13 }}>{team.nome}</strong>
                    <div className="muted">
                      {done} de {total} respondentes concluíram
                      {team.status === 'encerrado' ? ' · encerrada' : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                    <button className="btn small" onClick={() => onVerEquipe(team.id)}>Ver equipe</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
