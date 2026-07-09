import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import logoIcone from '../../assets/logo-icone.png'
import Dashboard from './Dashboard'
import NovaEquipe from './NovaEquipe'
import StatusEquipe from './StatusEquipe'
import Emails from './Emails'
import Resultados from './Resultados'

const TABS = [
  { id: 'dashboard', label: 'Clientes e equipes' },
  { id: 'nova', label: 'Nova equipe' },
  { id: 'status', label: 'Status da equipe' },
  { id: 'resultados', label: 'Resultados' },
  { id: 'emails', label: 'E-mails' },
]

export default function AdminShell({ userEmail }) {
  const [tab, setTab] = useState('dashboard')
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)

  function verEquipe(teamId) {
    setSelectedTeamId(teamId)
    setTab('status')
  }

  function handleEquipeCriada() {
    setReloadToken((n) => n + 1)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const precisaDeEquipe = tab === 'status' || tab === 'resultados' || tab === 'emails'

  return (
    <div className="admin-app">
      <div className="topbar">
        <div className="brand">
          <div className="logo-box">
            <img src={logoIcone} alt="Ana Almeida Mentorias e Treinamentos" />
          </div>
          <div>
            <div className="brand-name">Diagnóstico de Equipes</div>
            <div className="brand-sub">Ana Almeida Mentoria — painel administrativo</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="user-chip">{userEmail}</div>
          <button className="btn small" onClick={handleLogout}>Sair</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="content">
        {precisaDeEquipe && !selectedTeamId && (
          <p className="muted">
            Selecione uma equipe na aba &quot;Clientes e equipes&quot; primeiro (clique em &quot;Ver equipe&quot;).
          </p>
        )}
        {tab === 'dashboard' && <Dashboard onVerEquipe={verEquipe} reloadToken={reloadToken} />}
        {tab === 'nova' && <NovaEquipe onEquipeCriada={handleEquipeCriada} />}
        {tab === 'status' && selectedTeamId && <StatusEquipe teamId={selectedTeamId} />}
        {tab === 'resultados' && selectedTeamId && <Resultados teamId={selectedTeamId} />}
        {tab === 'emails' && selectedTeamId && <Emails teamId={selectedTeamId} />}
      </div>
    </div>
  )
}
