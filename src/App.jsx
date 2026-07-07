import RespondentFlow from './pages/RespondentFlow'

// Roteamento simples por caminho da URL: /responder/{token-da-equipe}
// A Fase 2 (painel da administradora) vai adicionar mais rotas aqui
// (ex.: /admin/login, /admin/equipes/:id) — provavelmente migrando
// para react-router-dom quando o número de telas justificar.
function App() {
  const path = window.location.pathname
  // Sem âncora (^) no início: no GitHub Pages o site fica num subcaminho
  // (/diagnostico-de-equipes-app/responder/TOKEN), então procuramos
  // "/responder/TOKEN" em qualquer ponto do caminho, não só na raiz.
  const match = path.match(/\/responder\/([^/]+)/)

  if (match) {
    return <RespondentFlow token={match[1]} />
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
            O painel da administradora será implementado na próxima fase.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
