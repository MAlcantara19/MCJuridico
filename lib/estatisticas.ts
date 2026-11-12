// Contador simples: visitas, cliques no WhatsApp e aberturas do assistente.
// Os números aparecem no painel (aba Resumo). Nenhum dado pessoal é salvo.
import { supabase } from './supabase';

type Tipo = 'visita' | 'whatsapp' | 'assistente' | 'credito';

export function registrar(tipo: Tipo, umaVezPorSessao = false, detalhe?: string) {
  try {
    if (umaVezPorSessao) {
      if (sessionStorage.getItem(`mc-${tipo}`)) return;
      sessionStorage.setItem(`mc-${tipo}`, '1');
    }
    // Não conta quem está logado no painel testando o site
    if (localStorage.getItem('mc-admin') === '1') return;
    supabase().from('cliques').insert(detalhe ? { tipo, detalhe: detalhe.slice(0, 120) } : { tipo }).then(() => {});
  } catch {}
}
