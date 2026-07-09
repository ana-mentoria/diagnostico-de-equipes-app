import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Carrega os dados de uma equipe (equipe + cliente + respondentes esperados)
// usados em Status, E-mails e Resultados. Centralizado aqui para não repetir
// a mesma sequência de queries em cada aba.
export function useEquipeData(teamId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [team, setTeam] = useState(null)
  const [client, setClient] = useState(null)
  const [roster, setRoster] = useState([])
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    if (!teamId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      const { data: teamRow, error: teamErr } = await supabase
        .from('teams')
        .select('id, client_id, nome, token_acesso, min_respondentes, status')
        .eq('id', teamId)
        .single()

      if (cancelled) return
      if (teamErr || !teamRow) {
        setError('Não foi possível carregar esta equipe.')
        setLoading(false)
        return
      }

      const [{ data: clientRow }, { data: rosterRows }] = await Promise.all([
        supabase.from('clients').select('id, nome').eq('id', teamRow.client_id).single(),
        supabase
          .from('expected_respondents')
          .select('id, nome, email, papel_esperado, response_id')
          .eq('team_id', teamId)
          .order('nome'),
      ])

      if (cancelled) return
      setTeam(teamRow)
      setClient(clientRow ?? null)
      setRoster(rosterRows ?? [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [teamId, reloadToken])

  return { loading, error, team, client, roster, reload }
}
