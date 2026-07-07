import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Isso aparece no console do navegador se o .env não estiver configurado.
  // Ver README.md para o passo a passo de criação do projeto Supabase.
  console.warn(
    '[Diagnóstico de Equipes] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. ' +
      'Crie um arquivo .env a partir do .env.example.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
