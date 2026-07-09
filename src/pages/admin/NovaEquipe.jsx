import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const NOVO_CLIENTE = '__novo__'

function linkDaEquipe(token) {
  return `${window.location.origin}${import.meta.env.BASE_URL}responder/${token}`
}

export default function NovaEquipe({ onEquipeCriada }) {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [equipeNome, setEquipeNome] = useState('')
  // Guardado como texto (não número) enquanto o campo está sendo editado —
  // se a gente força um valor numérico a cada tecla, apagar o campo para
  // digitar outro número faz ele "pular" de volta para 1 antes de aceitar o
  // próximo dígito (ex.: apagar "2", campo vira "1", digitar "0" vira "10").
  const [qtdInput, setQtdInput] = useState('2')
  const [roster, setRoster] = useState([
    { nome: '', email: '', papel: 'lider' },
    { nome: '', email: '', papel: 'liderado' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null) // { token, equipeNome }

  useEffect(() => {
    let cancelled = false
    supabase
      .from('clients')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => {
        if (!cancelled) setClients(data ?? [])
      })
    return () => { cancelled = true }
  }, [])

  function syncRosterToCount(n) {
    setRoster((prev) => {
      const next = prev.slice(0, n)
      while (next.length < n) next.push({ nome: '', email: '', papel: 'liderado' })
      return next
    })
  }

  function handleQtdChange(value) {
    // Aceita o texto como o usuário está digitando, sem forçar de volta
    // para "1" enquanto o campo estiver vazio ou incompleto.
    setQtdInput(value)
    if (value.trim() === '') return
    const n = parseInt(value, 10)
    if (!Number.isFinite(n) || n < 1) return
    syncRosterToCount(n)
  }

  function handleQtdBlur() {
    // Só ao sair do campo (ou perder o foco) é que normalizamos para um
    // número válido, caso tenha ficado vazio ou inválido.
    const n = Math.max(1, parseInt(qtdInput, 10) || 1)
    setQtdInput(String(n))
    syncRosterToCount(n)
  }

  function updateRosterRow(index, field, value) {
    setRoster((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addRosterRow() {
    setRoster((prev) => {
      const next = [...prev, { nome: '', email: '', papel: 'liderado' }]
      setQtdInput(String(next.length))
      return next
    })
  }

  function removeRosterRow(index) {
    setRoster((prev) => {
      const next = prev.filter((_, i) => i !== index)
      setQtdInput(String(next.length))
      return next
    })
  }

  function validar() {
    if (clientId === '') return 'Selecione ou cadastre o cliente.'
    if (clientId === NOVO_CLIENTE && !novoClienteNome.trim()) return 'Informe o nome do novo cliente.'
    if (!equipeNome.trim()) return 'Informe o nome da equipe.'
    if (roster.length === 0) return 'Cadastre ao menos um respondente esperado.'
    if (roster.some((r) => !r.nome.trim())) return 'Preencha o nome de todos os respondentes.'
    if (!roster.some((r) => r.papel === 'lider')) return 'Cadastre ao menos um líder na equipe.'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const erro = validar()
    if (erro) { setError(erro); return }
    setError('')
    setSaving(true)

    try {
      let finalClientId = clientId
      if (clientId === NOVO_CLIENTE) {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({ nome: novoClienteNome.trim() })
          .select('id')
          .single()
        if (clientErr) throw clientErr
        finalClientId = newClient.id
      }

      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .insert({ client_id: finalClientId, nome: equipeNome.trim() })
        .select('id, token_acesso')
        .single()
      if (teamErr) throw teamErr

      const rows = roster.map((r) => ({
        team_id: team.id,
        nome: r.nome.trim(),
        email: r.email.trim() || null,
        papel_esperado: r.papel,
      }))
      const { error: rosterErr } = await supabase.from('expected_respondents').insert(rows)
      if (rosterErr) throw rosterErr

      setResultado({ token: team.token_acesso, teamId: team.id, equipeNome: equipeNome.trim() })
      onEquipeCriada?.()
    } catch (err) {
      setError('Não foi possível criar a equipe: ' + (err.message ?? 'erro desconhecido.'))
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setClientId('')
    setNovoClienteNome('')
    setEquipeNome('')
    setQtdInput('2')
    setRoster([
      { nome: '', email: '', papel: 'lider' },
      { nome: '', email: '', papel: 'liderado' },
    ])
    setResultado(null)
  }

  if (resultado) {
    const link = linkDaEquipe(resultado.token)
    return (
      <div>
        <h1>Equipe criada</h1>
        <p className="muted">{resultado.equipeNome} — compartilhe o link abaixo com os respondentes.</p>
        <div className="link-box">
          🔗 {link}
          <button className="btn small" style={{ marginLeft: 'auto' }} onClick={() => navigator.clipboard?.writeText(link)}>
            Copiar
          </button>
        </div>
        <p className="muted">
          O e-mail de apresentação (aba E-mails) já sai preenchido com este link para cada respondente cadastrado.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={resetForm}>Cadastrar outra equipe</button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Nova equipe / diagnóstico</h1>
      <p className="muted">Cadastre a equipe e a lista de respondentes esperados. O link é gerado ao final.</p>

      {error && <div className="error-box">{error}</div>}

      <label>Cliente</label>
      <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
        <option value="">Selecione…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.nome}</option>
        ))}
        <option value={NOVO_CLIENTE}>+ Cadastrar novo cliente</option>
      </select>
      {clientId === NOVO_CLIENTE && (
        <>
          <label>Nome do novo cliente</label>
          <input
            type="text"
            placeholder="Ex.: Empresa XYZ Ltda."
            value={novoClienteNome}
            onChange={(e) => setNovoClienteNome(e.target.value)}
          />
        </>
      )}

      <label>Nome da equipe</label>
      <input
        type="text"
        placeholder="Ex.: Equipe Comercial"
        value={equipeNome}
        onChange={(e) => setEquipeNome(e.target.value)}
      />

      <label>Quantidade de respondentes esperados nesta equipe</label>
      <input
        type="number"
        min="1"
        value={qtdInput}
        style={{ maxWidth: 120 }}
        onChange={(e) => handleQtdChange(e.target.value)}
        onBlur={handleQtdBlur}
      />
      <p className="muted" style={{ marginTop: -6 }}>
        Observação: a comparação 360° por dimensão só é liberada quando pelo menos 5 liderados responderem
        (regra padrão de anonimato do diagnóstico).
      </p>

      <div className="section-title">Respondentes esperados</div>
      <p className="muted" style={{ marginTop: -6 }}>
        Nome e e-mail — o e-mail é usado só para você enviar o link e lembretes, não aparece para o líder
        nem entra na análise.
      </p>
      {roster.map((r, i) => (
        <div className="roster-row-4" key={i}>
          <input
            placeholder="Nome"
            value={r.nome}
            onChange={(e) => updateRosterRow(i, 'nome', e.target.value)}
          />
          <input
            placeholder="E-mail"
            type="email"
            value={r.email}
            onChange={(e) => updateRosterRow(i, 'email', e.target.value)}
          />
          <select value={r.papel} onChange={(e) => updateRosterRow(i, 'papel', e.target.value)}>
            <option value="lider">Líder</option>
            <option value="liderado">Liderado(a)</option>
          </select>
          <button type="button" className="btn small" onClick={() => removeRosterRow(i)}>Remover</button>
        </div>
      ))}
      <button type="button" className="btn small" style={{ marginBottom: 16 }} onClick={addRosterRow}>
        + Adicionar respondente
      </button>

      <div>
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? 'Criando…' : 'Criar equipe e gerar link'}
        </button>
      </div>
    </form>
  )
}
