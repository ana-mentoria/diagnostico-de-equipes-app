import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import logo from '../../assets/logo-completa.png'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })
    setLoading(false)
    if (signInError) {
      setError('E-mail ou senha incorretos.')
    }
  }

  return (
    <div className="admin-login-shell">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <img src={logo} alt="Ana Almeida Mentorias e Treinamentos" className="admin-login-logo" />
        <h1>Painel administrativo</h1>
        <p className="muted">Diagnóstico de Equipes</p>

        {error && <div className="error-box">{error}</div>}

        <label>E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <label>Senha</label>
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <button className="btn primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="muted" style={{ marginTop: 16, textAlign: 'center' }}>
          Acesso restrito. O usuário é criado manualmente no Supabase (ver README).
        </p>
      </form>
    </div>
  )
}
