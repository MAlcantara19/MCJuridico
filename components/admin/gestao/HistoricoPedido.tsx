'use client';
// Histórico do pedido: quem mudou a etapa e quando (gravado sozinho pelo banco).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { COR_STATUS, STATUS, rotulo } from '@/lib/gestao';

type Registro = { id: number; status: string; autor: string; criado_em: string };

export default function HistoricoPedido({ pedidoId }: { pedidoId: number }) {
  const [lista, setLista] = useState<Registro[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    supabase().from('historico_pedido').select('*').eq('atendimento_id', pedidoId).order('criado_em')
      .then(({ data }) => setLista((data as Registro[]) ?? []));
  }, [pedidoId]);

  if (!lista.length) return null;
  return (
    <div className="notas">
      <button type="button" className="link-btn" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        🕓 Histórico do pedido ({lista.length}) {aberto ? '▲' : '▼'}
      </button>
      {aberto && (
        <ol className="historico">
          {lista.map((h) => (
            <li key={h.id} style={{ ['--cor' as string]: COR_STATUS[h.status] ?? '#5b6780' }}>
              <strong>{rotulo(STATUS, h.status)}</strong>
              <span className="adm-dica" style={{ margin: 0 }}>
                {new Date(h.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                {h.autor ? ` · por ${h.autor}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
