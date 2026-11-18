'use client';
// Arquivos que o cliente mandou pela área do cliente para este pedido.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { linkEnvio } from '@/lib/arquivos';

type Envio = { id: number; nome: string; caminho: string; tamanho: number; tipo: string; visto: boolean; criado_em: string };

export default function EnviosPedido({ pedidoId, avisar }: { pedidoId: number; avisar: (m: string, e?: boolean) => void }) {
  const [lista, setLista] = useState<Envio[]>([]);

  useEffect(() => {
    supabase().from('envios').select('*').eq('atendimento_id', pedidoId).order('criado_em', { ascending: false })
      .then(({ data }) => setLista((data as Envio[]) ?? []));
  }, [pedidoId]);

  async function abrir(e: Envio) {
    try {
      window.open(await linkEnvio(e.caminho), '_blank', 'noopener');
      if (!e.visto) {
        await supabase().from('envios').update({ visto: true }).eq('id', e.id);
        setLista((l) => l.map((x) => (x.id === e.id ? { ...x, visto: true } : x)));
      }
    } catch (err: any) { avisar(err.message, true); }
  }

  if (!lista.length) return null;
  return (
    <div className="notas">
      <strong>📎 Enviados pelo cliente ({lista.length})</strong>
      {lista.map((e) => (
        <button key={e.id} type="button" className="envio" onClick={() => abrir(e)}>
          <span>{e.tipo === 'comprovante' ? '💰' : '📄'} {e.nome}</span>
          <span className="adm-dica" style={{ margin: 0 }}>
            {new Date(e.criado_em).toLocaleString('pt-BR')}{!e.visto && <strong style={{ color: '#b3261e' }}> · novo</strong>}
          </span>
        </button>
      ))}
    </div>
  );
}
