import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Publicado como site de projeto no GitHub Pages:
  // https://ana-mentoria.github.io/diagnostico-de-equipes-app/
  // Por isso os assets precisam ser resolvidos a partir desse subcaminho,
  // não da raiz do domínio.
  base: '/diagnostico-de-equipes-app/',
})
