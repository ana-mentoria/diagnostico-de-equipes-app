import RespondentFlow from './pages/RespondentFlow'
import AdminApp from './pages/admin/AdminApp'

// Roteamento simples por caminho da URL: /responder/{token-da-equipe} e /admin.
// Sem dependência de react-router: só duas áreas (pública e administrativa),
// cada uma com sua própria navegação interna por estado (ver AdminShell).
function App() {
  const path = window.location.pathname
  // Sem âncora (^) no início: no GitHub Pages o site fica num subcaminho
  // (/diagnostico-de-equipes-app/responder/TOKEN), então procuramos
  // "/responder/TOKEN" em qualquer ponto do caminho, não só na raiz.
  const match = path.match(/\/responder\/([^/]+)/)

  if (match) {
    return <RespondentFlow token={match[1]} />
  }

  if (path.includes('/admin')) {
    return <AdminApp />
  }

  return (
    <div className="app-shell">
      <div className="card">
        <div className="screen">
          <h1>Diagnóstico de Equipes</h1>
          <p>
            Esta é a área pública do respondente. Acesse pelo link específico da
            sua equipe (algo como <code>/responder/token-da-equipe</code>).
          </p>
          <p>
            Administradora? Acesse <code>/admin</code>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
