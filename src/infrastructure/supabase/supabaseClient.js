import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Erro crítico: Variáveis de ambiente do Supabase não encontradas. ' +
    'Verifique se o arquivo .env existe e possui VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);