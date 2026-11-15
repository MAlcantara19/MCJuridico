'use client';
// Lembrete no topo do painel: compromissos atrasados, de hoje e de amanhã (sem e-mail, sem custo).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { hojeISO, somarDias } from '@/lib/gestao';

type Item = { data: string; titulo: string; hora: string | null };

export default function FaixaLembrete({ irPara }: { irPara: (aba: string) => void }) {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [fechada, setFechada] = useState(false);

  useEffect(() => {
    supabase().from('agenda').select('data, titulo, hora').eq('feito', false).lte('data', somarDias(hojeISO(), 1)).order('data').order('hora', { nullsFirst: true })
      .then(({ data }) => setItens((data as Item[]) ?? []));
    try { if (sessionStorage.getItem('mc-faixa') === hojeISO()) setFechada(true); } catch {}
  }, []);

  if (!itens || !itens.length || fechada) return null;
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
        <span className="faixa-ver">Ver agenda →</span>
      </button>
      <button className="faixa-fechar" aria-label="Esconder até amanhã" onClick={() => { setFechada(true); try { sessionStorage.setItem('mc-faixa', hoje); } catch {} }}>×</button>
    </div>
  );
}
