'use client';
// Lembrete no topo do painel: compromissos atrasados, de hoje e de amanhã (sem e-mail, sem custo).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hojeISO, somarDias } from '@/lib/gestao';

type Item = { data: string; titulo: string; hora: string | null };

export default function FaixaLembrete({ irPara }: { irPara: (aba: string) => void }) {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [fechada, setFechada] = useState(false);
  const [novidades, setNovidades] = useState({ envios: 0, conferir: 0 });

  useEffect(() => {
    supabase().from('agenda').select('data, titulo, hora').eq('feito', false).lte('data', somarDias(hojeISO(), 1)).order('data').order('hora', { nullsFirst: true })
      .then(({ data }) => setItens((data as Item[]) ?? []));
    try { if (sessionStorage.getItem('mc-faixa') === hojeISO()) setFechada(true); } catch {}
    // Arquivos novos dos clientes e pagamentos informados (aparecem quando a atualização 15 estiver rodada)
    Promise.all([
      supabase().from('envios').select('id', { count: 'exact', head: true }).eq('visto', false),
      supabase().from('atendimentos').select('id', { count: 'exact', head: true }).eq('pagamento_informado', true).eq('pago', false),
    ]).then(([e, p]) => setNovidades({ envios: e.count ?? 0, conferir: p.count ?? 0 }));
  }, []);

  const temNovidade = novidades.envios > 0 || novidades.conferir > 0;
  if (!itens || (!itens.length && !temNovidade) || fechada) return null;
  const hoje = hojeISO();
  const atrasados = itens.filter((i) => i.data < hoje).length;
  const deHoje = itens.filter((i) => i.data === hoje);
  const amanha = itens.filter((i) => i.data > hoje).length;
  const proximo = deHoje.find((i) => i.hora) ?? deHoje[0];

  return (
    <div className={`faixa-lembrete${atrasados ? ' alerta' : ''}`} role="status">
      <button className="faixa-texto" onClick={() => irPara('agenda')}>
        📅 {atrasados > 0 && <strong>{atrasados} atrasado{atrasados > 1 ? 's' : ''} · </strong>}
        Hoje: <strong>{deHoje.length}</strong> · Amanhã: <strong>{amanha}</strong>
        {proximo && <span className="faixa-prox"> · Próximo: {proximo.hora ? `${proximo.hora.slice(0, 5)} ` : ''}{proximo.titulo}</span>}
        {novidades.envios > 0 && <strong> · 📎 {novidades.envios} arquivo{novidades.envios > 1 ? 's' : ''} de cliente</strong>}
        {novidades.conferir > 0 && <strong> · 💰 {novidades.conferir} pagamento{novidades.conferir > 1 ? 's' : ''} a conferir</strong>}
        <span className="faixa-ver">Ver agenda →</span>
      </button>
      <button className="faixa-fechar" aria-label="Esconder até amanhã" onClick={() => { setFechada(true); try { sessionStorage.setItem('mc-faixa', hoje); } catch {} }}>×</button>
    </div>
  );
}
