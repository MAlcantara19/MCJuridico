// Conexão com o Supabase (banco de dados, arquivos e login).
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function conferirChaves() {
  if (!url || !chave) {
    throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local');
  }
}

// Cliente do navegador (usado no painel de administração). Guarda o login.
let clienteNavegador: SupabaseClient | null = null;
export function supabase() {
  if (!clienteNavegador) {
    conferirChaves();
    clienteNavegador = createClient(url!, chave!);
  }
  return clienteNavegador;
}

// Cliente do servidor (usado para montar a página pública). Não guarda login.
export function supabaseServidor() {
  conferirChaves();
  return createClient(url!, chave!, { auth: { persistSession: false } });
}
