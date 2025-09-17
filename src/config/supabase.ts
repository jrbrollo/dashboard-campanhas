// Configuração do Supabase
export const SUPABASE_CONFIG = {
  // Substitua pelas suas credenciais do Supabase
  url: import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here',
  
  // Verificar se as credenciais estão configuradas
  isConfigured: () => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    return url && key && 
           !url.includes('your-project-id') && 
           !key.includes('your-anon-key')
  }
}

// Instruções para configurar:
// 1. Crie um projeto no Supabase (https://supabase.com)
// 2. Vá em Settings > API
// 3. Copie a URL do projeto e a chave anônima
// 4. Crie um arquivo .env na raiz do projeto com:
//    VITE_SUPABASE_URL=sua_url_aqui
//    VITE_SUPABASE_ANON_KEY=sua_chave_aqui
