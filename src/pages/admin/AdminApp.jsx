import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import AdminLogin from './AdminLogin'
import AdminShell from './AdminShell'
import '../../admin.css'

// Ponto de entrada do painel da administradora (Fase 2). Cuida só da sessão
// de autenticação; a navegação entre abas fica em AdminShell.
export default function AdminApp() {
  const [checking, setChecking] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (checking) {
    return (
      <div className="admin-login-shell">
        <p className="muted">Carregando…</p>
      </div>
    )
  }

  if (!session) {
    return <AdminLogin />
  }

  return <AdminShell userEmail={session.user.email} />
}
