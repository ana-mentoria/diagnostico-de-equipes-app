import { useState } from 'react'
import { useEquipeData } from '../../hooks/useEquipeData'
import { loadTemplates, buildGmailLink, defaultPrazo } from './emailTemplates'

function linkDaEquipe(token) {
  return `${window.location.origin}${import.meta.env.BASE_URL}responder/${token}`
}

export default function StatusEquipe({ teamId }) {
  const { loading, error, team, client, roster } = useEquipeData(teamId)
  const [emailExpanded, setEmailExpanded] = useState(false)
  const [prazo] = useState(defaultPrazo())

  if (!teamId) return <p className="muted">Selecione uma equipe na aba &quot;Clientes e equipes&quot;.</p>
  if (loading) return <p className="muted">Carregando…</p>
  if (error) return <div className="error-box">{error}</div>
  if (!team) return null

  const done = roster.filter((r) => r.response_id != null).length
  const link = linkDaEquipe(team.token_acesso)
  const templates = loadTemplates()

  function papelLabel(p) {
    return p === 'lider' ? 'Líder' : 'Liderado(a)'
  }

  function gmailLinkPara(pessoa, tipo) {
    if (!pessoa.email) return null
    const tpl = templates[tipo]
    return buildGmailLink({
      assunto: tpl.assunto,
      corpo: tpl.corpo,
      destinatarioEmail: pessoa.email,
      vars: {
        nome: pessoa.nome,
        equipe: team.nome,
        empresa: client?.nome ?? '',
        link,
        prazo,
      },
    })
  }

  return (
    <div>
      <h1>{team.nome}</h1>
      <p className="muted">
        {client?.nome} · {done} de {roster.length} respondentes concluíram
        {team.status === 'encerrado' ? ' · equipe encerrada' : ''}
      </p>
      <div className="link-box">
        🔗 {link}
        <button className="btn small" style={{ marginLeft: 'auto' }} onClick={() => navigator.clipboard?.writeText(link)}>
          Copiar link
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>
                <span style={{ cursor: 'pointer' }} onClick={() => setEmailExpanded((v) => !v)}>
                  E-mail {emailExpanded ? '−' : '+'}
                </span>
              </th>
              <th>Papel</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => {
              const respondeu = r.response_id != null
              const conviteUrl = gmailLinkPara(r, 'apresentacao')
              const lembreteUrl = gmailLinkPara(r, 'lembrete')
              return (
                <tr key={r.id}>
                  <td title={r.nome}>{r.nome}</td>
                  <td className="muted" style={{ cursor: 'pointer' }} title={r.email ?? ''} onClick={() => setEmailExpanded((v) => !v)}>
                    {emailExpanded ? (r.email ?? '—') : (r.email ? '✉' : '—')}
                  </td>
                  <td>{papelLabel(r.papel_esperado)}</td>
                  <td><span className={`chip ${respondeu ? 'done' : 'pending'}`}>{respondeu ? 'Respondeu' : 'Pendente'}</span></td>
                  <td className="wrap">
                    {!respondeu && (
                      <div className="action-stack">
                        {conviteUrl
                          ? <a className="btn small" href={conviteUrl} target="_blank" rel="noopener noreferrer">Convite</a>
                          : <span className="muted">sem e-mail</span>}
                        {lembreteUrl && <a className="btn small" href={lembreteUrl} target="_blank" rel="noopener noreferrer">Lembrete</a>}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        Os links de convite/lembrete abrem o Gmail com o e-mail já preenchido (edite os modelos na aba &quot;E-mails&quot;).
        O envio continua manual — o app não dispara e-mails automaticamente nesta versão.
      </p>
    </div>
  )
}
