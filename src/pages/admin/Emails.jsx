import { useEffect, useState } from 'react'
import { useEquipeData } from '../../hooks/useEquipeData'
import { loadTemplates, saveTemplates, buildGmailLink, defaultPrazo } from './emailTemplates'

function linkDaEquipe(token) {
  return `${window.location.origin}${import.meta.env.BASE_URL}responder/${token}`
}

export default function Emails({ teamId }) {
  const { loading, error, team, client, roster } = useEquipeData(teamId)
  const [templates, setTemplates] = useState(() => loadTemplates())
  const [prazo, setPrazo] = useState(defaultPrazo())
  const [selecionados, setSelecionados] = useState(new Set())
  const [linksGerados, setLinksGerados] = useState({ apresentacao: null, lembrete: null })
  const [savedFlash, setSavedFlash] = useState(false)

  // inicializa seleção (todos) sempre que o roster desta equipe terminar de carregar
  useEffect(() => {
    if (roster.length > 0) setSelecionados(new Set(roster.map((r) => r.id)))
  }, [roster])

  if (!teamId) return <p className="muted">Selecione uma equipe na aba &quot;Clientes e equipes&quot;.</p>
  if (loading) return <p className="muted">Carregando…</p>
  if (error) return <div className="error-box">{error}</div>
  if (!team) return null

  const link = linkDaEquipe(team.token_acesso)

  function toggleTodos(checked) {
    setSelecionados(checked ? new Set(roster.map((r) => r.id)) : new Set())
  }

  function toggleUm(id, checked) {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id); else next.delete(id)
      return next
    })
  }

  function updateTemplateField(tipo, campo, valor) {
    setTemplates((prev) => ({ ...prev, [tipo]: { ...prev[tipo], [campo]: valor } }))
  }

  function handleSalvarModelos() {
    saveTemplates(templates)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  function pessoasSelecionadas() {
    return roster.filter((r) => selecionados.has(r.id) && r.email)
  }

  function gerarLinksPorPessoa(tipo) {
    const pessoas = pessoasSelecionadas()
    if (pessoas.length === 0) {
      setLinksGerados((prev) => ({ ...prev, [tipo]: [] }))
      return
    }
    const tpl = templates[tipo]
    const links = pessoas.map((p) => ({
      nome: p.nome,
      url: buildGmailLink({
        assunto: tpl.assunto,
        corpo: tpl.corpo,
        destinatarioEmail: p.email,
        vars: { nome: p.nome, equipe: team.nome, empresa: client?.nome ?? '', link, prazo },
      }),
    }))
    setLinksGerados((prev) => ({ ...prev, [tipo]: links }))
  }

  function gerarLinkUnico(tipo) {
    const pessoas = pessoasSelecionadas()
    if (pessoas.length === 0) {
      setLinksGerados((prev) => ({ ...prev, [tipo]: [] }))
      return
    }
    const tpl = templates[tipo]
    const url = buildGmailLink({
      assunto: tpl.assunto,
      corpo: tpl.corpo,
      destinatarioEmail: pessoas.map((p) => p.email).join(','),
      vars: { nome: 'pessoal', equipe: team.nome, empresa: client?.nome ?? '', link, prazo },
    })
    setLinksGerados((prev) => ({ ...prev, [tipo]: { unico: true, url, nomes: pessoas.map((p) => p.nome) } }))
  }

  function renderBlocoModelo(tipo, titulo) {
    const tpl = templates[tipo]
    const resultado = linksGerados[tipo]
    return (
      <div key={tipo}>
        <div className="section-title">{titulo}</div>
        <label>Assunto</label>
        <input type="text" value={tpl.assunto} onChange={(e) => updateTemplateField(tipo, 'assunto', e.target.value)} />
        <label>Corpo</label>
        <textarea className="ai-box" rows={10} value={tpl.corpo} onChange={(e) => updateTemplateField(tipo, 'corpo', e.target.value)} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0' }}>
          <button type="button" className="btn small" onClick={() => gerarLinksPorPessoa(tipo)}>Gerar link por pessoa (personalizado)</button>
          <button type="button" className="btn small" onClick={() => gerarLinkUnico(tipo)}>Abrir 1 e-mail com todos no destinatário</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          {Array.isArray(resultado) && resultado.length === 0 && (
            <p className="muted">Nenhum destinatário selecionado (ou sem e-mail cadastrado).</p>
          )}
          {Array.isArray(resultado) && resultado.length > 0 && (
            <>
              <p className="muted" style={{ marginBottom: 6 }}>Um link por pessoa, já personalizado:</p>
              {resultado.map((r, i) => (
                <a key={i} className="btn small" href={r.url} target="_blank" rel="noopener noreferrer" style={{ margin: '0 6px 6px 0', display: 'inline-block' }}>
                  Enviar para {r.nome}
                </a>
              ))}
            </>
          )}
          {resultado && resultado.unico && (
            <>
              <p className="muted" style={{ marginBottom: 2 }}>
                Todos aparecem no campo &quot;Para&quot; — cada pessoa vê o e-mail de todo mundo na lista, e o texto usa
                a saudação genérica ({'{{nome}}'} = &quot;pessoal&quot;), não o nome de cada um.
              </p>
              <p className="muted" style={{ marginBottom: 8 }}>Destinatários: {resultado.nomes.join(', ')}</p>
              <a className="btn small" href={resultado.url} target="_blank" rel="noopener noreferrer">
                Abrir no Gmail com {resultado.nomes.length} destinatário(s)
              </a>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1>E-mails para respondentes — {team.nome}</h1>
      <p className="muted">
        Modelos prontos para uso. {'{{nome}}'}, {'{{equipe}}'}, {'{{empresa}}'}, {'{{link}}'} e {'{{prazo}}'} são
        preenchidos automaticamente para cada pessoa da lista de respondentes esperados.
      </p>

      <label style={{ maxWidth: 160 }}>Prazo (usado no placeholder {'{{prazo}}'})</label>
      <input type="text" style={{ maxWidth: 160 }} value={prazo} onChange={(e) => setPrazo(e.target.value)} />

      <div className="section-title">Destinatários</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13 }}>
        <input
          type="checkbox"
          style={{ width: 'auto', margin: 0 }}
          checked={roster.length > 0 && selecionados.size === roster.length}
          onChange={(e) => toggleTodos(e.target.checked)}
        />
        Selecionar todos
      </label>
      <div style={{ margin: '8px 0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {roster.map((r) => (
          <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="checkbox"
              style={{ width: 'auto', margin: 0 }}
              checked={selecionados.has(r.id)}
              onChange={(e) => toggleUm(r.id, e.target.checked)}
            />
            {r.nome} <span className="muted">({r.papel_esperado === 'lider' ? 'Líder' : 'Liderado(a)'}{!r.email ? ' — sem e-mail' : ''})</span>
          </label>
        ))}
      </div>
      <p className="muted" style={{ marginTop: -10 }}>
        O remetente é definido pela conta logada no Gmail ao enviar, não pelo link. Para aparecer como
        contato@anaalmeidamentoria.com.br, configure esse endereço em &quot;Enviar como&quot; nas configurações do
        seu Gmail e selecione-o na hora de enviar.
      </p>

      {renderBlocoModelo('apresentacao', '1. E-mail de apresentação — enviado com o link, ao criar a equipe')}
      {renderBlocoModelo('lembrete', '2. E-mail de lembrete — usado quando alguém ainda não respondeu')}

      <button type="button" className="btn" onClick={handleSalvarModelos}>
        {savedFlash ? 'Modelos salvos ✓' : 'Salvar edições dos modelos'}
      </button>
      <p className="muted" style={{ marginTop: 6 }}>
        Os modelos são compartilhados entre todas as equipes e ficam salvos neste navegador.
      </p>
    </div>
  )
}
