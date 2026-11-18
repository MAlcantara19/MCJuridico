'use client';
// Relatório mensal em PDF (para o contador): faturado, recebido, despesas, lucro e lista de serviços.
import { useState } from 'react';
import type { Config } from '@/lib/tipos';
import { brl, dataBR, hojeISO, type Atendimento, type Cliente, type Despesa } from '@/lib/gestao';

type Props = { todos: Atendimento[]; despesas: Despesa[]; clientes: Cliente[]; config: Config; fechar: () => void };

const nomeMes = (m: string) => {
  const [a, n] = m.split('-').map(Number);
  return new Date(a, n - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};
const mesAnterior = (m: string) => {
  const [a, n] = m.split('-').map(Number);
  const d = new Date(a, n - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function RelatorioMensal({ todos, despesas, clientes, config, fechar }: Props) {
  const [mes, setMes] = useState(hojeISO().slice(0, 7));
  const nomeCliente = (id: number | null) => clientes.find((c) => c.id === id)?.nome ?? '—';
  const soma = (l: { valor: number }[]) => l.reduce((s, x) => s + (Number(x.valor) || 0), 0);

  const dados = (m: string) => {
    const servs = todos.filter((a) => a.status === 'concluido' && a.data.slice(0, 7) === m).sort((x, y) => x.data.localeCompare(y.data));
    const desp = despesas.filter((d) => d.data.slice(0, 7) === m).sort((x, y) => x.data.localeCompare(y.data));
    const faturado = soma(servs);
    const recebido = soma(servs.filter((a) => a.pago));
    const totDesp = soma(desp);
    return { servs, desp, faturado, recebido, aReceber: faturado - recebido, totDesp, lucro: faturado - totDesp };
  };
  const d = dados(mes);
  const ant = dados(mesAnterior(mes));
  const variacao = ant.faturado ? ((d.faturado - ant.faturado) / ant.faturado) * 100 : null;

  // Despesas por categoria e serviços mais feitos
  const porCategoria = Object.entries(d.desp.reduce<Record<string, number>>((acc, x) => { acc[x.categoria] = (acc[x.categoria] ?? 0) + (Number(x.valor) || 0); return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const porServico = Object.entries(d.servs.reduce<Record<string, { q: number; v: number }>>((acc, x) => {
    acc[x.servico] ??= { q: 0, v: 0 }; acc[x.servico].q += 1; acc[x.servico].v += Number(x.valor) || 0; return acc;
  }, {})).sort((a, b) => b[1].v - a[1].v).slice(0, 8);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="adm-linha nao-imprimir" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Relatório do mês</h2>
        <span className="adm-linha">
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mês" style={{ width: 'auto' }} />
          <button className="adm-btn pri" onClick={() => window.print()}>Gerar PDF</button>
          <button className="adm-btn" onClick={fechar}>← Voltar</button>
        </span>
      </div>

      <article className="relatorio" style={{ ['--rel-cor' as string]: config.cor_primaria, ['--rel-ouro' as string]: config.cor_destaque }}>
        <header className="rel-topo">
          <div><div className="rel-marca">{config.marca || config.nome}</div><div>{config.nome} · {config.profissao}</div></div>
          <div className="rel-contato"><div>Gerado em {dataBR(hojeISO())}</div></div>
        </header>
        <h1 style={{ textTransform: 'capitalize' }}>Relatório de {nomeMes(mes)}</h1>

        <div className="rm-cartoes">
          <div><span>Faturado</span><strong>{brl(d.faturado)}</strong>{variacao !== null && <small style={{ color: variacao >= 0 ? '#2e7d32' : '#b3261e' }}>{variacao >= 0 ? '▲' : '▼'} {Math.abs(variacao).toFixed(0)}% vs. mês anterior</small>}</div>
          <div><span>Recebido</span><strong>{brl(d.recebido)}</strong></div>
          <div><span>A receber</span><strong style={{ color: d.aReceber ? '#b3261e' : undefined }}>{brl(d.aReceber)}</strong></div>
          <div><span>Despesas</span><strong>{brl(d.totDesp)}</strong></div>
          <div className="rm-lucro"><span>Lucro</span><strong>{brl(d.lucro)}</strong></div>
        </div>

        <h2>Serviços concluídos ({d.servs.length})</h2>
        <table className="tc">
          <thead><tr><th>Data</th><th>Pedido</th><th>Cliente</th><th>Serviço</th><th>Pagamento</th><th className="num">Valor</th></tr></thead>
          <tbody>
            {d.servs.map((a) => (
              <tr key={a.id}>
                <td>{dataBR(a.data)}</td><td>{a.codigo}</td><td>{nomeCliente(a.cliente_id)}</td><td>{a.servico}</td>
                <td style={{ color: a.pago ? '#2e7d32' : '#b3261e', fontWeight: 600 }}>{a.pago ? `Pago${a.forma_pagamento ? ` (${a.forma_pagamento})` : ''}` : 'A receber'}</td>
                <td className="num">{brl(a.valor)}</td>
              </tr>
            ))}
            {!d.servs.length && <tr><td colSpan={6}>Nenhum serviço concluído no mês.</td></tr>}
            <tr className="orc-total"><td colSpan={5}>Total faturado</td><td className="num">{brl(d.faturado)}</td></tr>
          </tbody>
        </table>

        {porServico.length > 0 && (
          <>
            <h2>Serviços que mais renderam</h2>
            <table className="tc">
              <tbody>{porServico.map(([n, x]) => <tr key={n}><td>{n}</td><td className="num">{x.q}x</td><td className="num">{brl(x.v)}</td></tr>)}</tbody>
            </table>
          </>
        )}

        <h2>Despesas ({d.desp.length})</h2>
        <table className="tc">
          <thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th className="num">Valor</th></tr></thead>
          <tbody>
            {d.desp.map((x) => <tr key={x.id}><td>{dataBR(x.data)}</td><td>{x.categoria}</td><td>{x.descricao}{x.repassar ? ' (repassar ao cliente)' : ''}</td><td className="num">{brl(x.valor)}</td></tr>)}
            {!d.desp.length && <tr><td colSpan={4}>Nenhuma despesa no mês.</td></tr>}
            {porCategoria.map(([c, v]) => <tr key={c} className="rm-cat"><td colSpan={3}>Subtotal · {c}</td><td className="num">{brl(v)}</td></tr>)}
            <tr className="orc-total"><td colSpan={3}>Total de despesas</td><td className="num">{brl(d.totDesp)}</td></tr>
          </tbody>
        </table>

        <footer className="rel-assinatura">
          {config.assinatura_url && <img className="rel-ass-img" src={config.assinatura_url} alt="Assinatura" />}
          <div className="rel-linha" />
          <div>{config.nome}</div>
          <small>Relatório gerencial para controle interno.</small>
        </footer>
      </article>
    </div>
  );
}
