'use client';
// Painel do mês no Resumo: pedidos por etapa, prazos da semana (dias úteis) e satisfação dos clientes.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { COR_STATUS, STATUS, dataBR, diaSemana, hojeISO, intervalo, situacaoPrazo, somarDiasUteis, type Atendimento } from '@/lib/gestao';

type Pedido = Pick<Atendimento, 'id' | 'codigo' | 'servico' | 'status' | 'prazo' | 'data' | 'cliente_id'>;
type Aval = { nota: number | null; pontos: string[] | null; criado_em?: string };

export default function PainelMes({ irPara }: { irPara: (aba: string) => void }) {
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [nomes, setNomes] = useState<Record<number, string>>({});
  const [aval, setAval] = useState<Aval[]>([]);

  useEffect(() => {
    (async () => {
      const desde = new Date(Date.now() - 90 * 864e5).toISOString();
      const [p, c, d] = await Promise.all([
        supabase().from('atendimentos').select('id, codigo, servico, status, prazo, data, cliente_id').neq('status', 'cancelado').gte('data', `${hojeISO().slice(0, 4)}-01-01`),
        supabase().from('clientes').select('id, nome'),
        supabase().from('depoimentos').select('nota, pontos, criado_em').eq('origem', 'avaliacao').gte('criado_em', desde),
      ]);
      setPedidos((p.data as Pedido[]) ?? []);
      setNomes(Object.fromEntries(((c.data ?? []) as { id: number; nome: string }[]).map((x) => [x.id, x.nome])));
      setAval((d.data as Aval[]) ?? []);
    })();
  }, []);

  if (!pedidos) return null;
  const hoje = hojeISO();
  const [ini, fim] = intervalo('mes');
  const abertos = pedidos.filter((p) => p.status !== 'concluido');
  const etapas = STATUS.filter((s) => s.valor !== 'cancelado' && s.valor !== 'concluido').map((s) => ({ ...s, qtd: abertos.filter((p) => p.status === s.valor).length }));
  const concluidosMes = pedidos.filter((p) => p.status === 'concluido' && p.data >= ini && p.data <= fim).length;
  const maxEtapa = Math.max(1, ...etapas.map((e) => e.qtd));
  const limite = somarDiasUteis(hoje, 5);
  const semana = abertos.filter((p) => p.prazo && p.prazo <= limite).sort((a, b) => (a.prazo! < b.prazo! ? -1 : 1));

  const notas = aval.filter((a) => a.nota);
  const media = notas.length ? notas.reduce((s, a) => s + (a.nota || 0), 0) / notas.length : 0;
  const pontos = Object.entries(aval.flatMap((a) => a.pontos ?? []).reduce<Record<string, number>>((m, p) => ((m[p] = (m[p] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="adm-grade">
      <div className="adm-item">
        <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Pedidos em aberto ({abertos.length})</h3>
          <button className="adm-btn peq" onClick={() => irPara('clientes')}>Clientes</button>
        </div>
        <ul className="ranking">
          {etapas.map((e) => (
            <li key={e.valor}>
              <div className="ranking-topo"><span>{e.rotulo}</span><strong>{e.qtd}</strong></div>
              <div className="ranking-barra"><span style={{ width: `${(e.qtd / maxEtapa) * 100}%`, background: COR_STATUS[e.valor] }} /></div>
            </li>
          ))}
        </ul>
        <span className="adm-dica" style={{ margin: 0 }}>✅ {concluidosMes} concluído{concluidosMes === 1 ? '' : 's'} este mês</span>
      </div>

      <div className="adm-item">
        <h3 style={{ margin: 0 }}>Prazos dos próximos 5 dias úteis</h3>
        {semana.length === 0 && <p className="adm-dica" style={{ margin: 0 }}>Nenhum prazo de pedido chegando. 🎉</p>}
        {semana.slice(0, 8).map((p) => {
          const s = situacaoPrazo(p.prazo);
          return (
            <div key={p.id} className="prazo-linha" style={{ borderLeftColor: s.cor }}>
              <strong style={{ color: s.cor }}>{p.prazo! < hoje ? 'Atrasado' : p.prazo === hoje ? 'Hoje' : `${diaSemana(p.prazo!)} ${dataBR(p.prazo).slice(0, 5)}`}</strong>
              <span>{p.codigo ? `${p.codigo} · ` : ''}{p.servico}{p.cliente_id && nomes[p.cliente_id] ? ` · ${nomes[p.cliente_id]}` : ''}</span>
            </div>
          );
        })}
      </div>

      <div className="adm-item" style={{ gap: 4 }}>
        <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Satisfação (90 dias)</h3>
          <button className="adm-btn peq" onClick={() => irPara('depoimentos')}>Avaliações</button>
        </div>
        {notas.length === 0 ? (
          <p className="adm-dica" style={{ margin: 0 }}>Ainda sem avaliações. Ao concluir um pedido, marque “Pedir avaliação” no aviso ao cliente.</p>
        ) : (
          <>
            <strong className="numero">{media.toFixed(1).replace('.', ',')} <span style={{ color: '#a8894e', fontSize: '1.6rem' }}>★</span></strong>
            <span className="adm-dica" style={{ margin: 0 }}>{notas.length} avaliaç{notas.length > 1 ? 'ões' : 'ão'}</span>
            {pontos.length > 0 && <div className="adm-linha">{pontos.map(([p, q]) => <span key={p} className="etq" style={{ ['--cor' as string]: '#2e7d32' }}>{p} · {q}</span>)}</div>}
          </>
        )}
      </div>
    </div>
  );
}
