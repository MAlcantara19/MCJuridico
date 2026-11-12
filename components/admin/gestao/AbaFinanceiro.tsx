'use client';
// Financeiro: serviços realizados, valores, recebido x a receber e estatísticas por período.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { combina } from '@/lib/util';
import { PERIODOS, STATUS, baixarPlanilha, brl, dataBR, intervalo, iso, linkPedidoAvaliacao, mensagemCobranca, podePedirAvaliacao, rotulo, whatsDoTelefone, type Atendimento, type Cliente } from '@/lib/gestao';
import type { Config } from '@/lib/tipos';
import FormAtendimento from './FormAtendimento';
import { LinhaServico } from './AbaClientes';
import { useBase } from './useBase';

type Aviso = (m: string, e?: boolean) => void;

export default function AbaFinanceiro({ avisar, config }: { avisar: Aviso; config: Config }) {
  const { clientes, servicos, recarregar } = useBase();
  const [sugestao, setSugestao] = useState<Cliente | null>(null);
  const [todos, setTodos] = useState<Atendimento[]>([]);
  const [periodo, setPeriodo] = useState('mes');
  const [filtro, setFiltro] = useState<'todos' | 'receber' | 'pagos' | 'abertos'>('todos');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Partial<Atendimento> | null>(null);

  async function carregar() {
    const { data, error } = await supabase().from('atendimentos').select('*').order('data', { ascending: false });
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-06.sql?`, true);
    setTodos((data as Atendimento[]) ?? []);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nomeCliente = (id: number | null) => clientes.find((c) => c.id === id)?.nome ?? '';
  const [ini, fim] = intervalo(periodo);
  const doPeriodo = todos.filter((a) => a.data >= ini && a.data <= fim && a.status !== 'cancelado');
  const concluidos = doPeriodo.filter((a) => a.status === 'concluido');
  const soma = (l: Atendimento[]) => l.reduce((s, a) => s + (Number(a.valor) || 0), 0);
  const faturado = soma(concluidos);
  const recebido = soma(concluidos.filter((a) => a.pago));
  const aReceber = faturado - recebido;
  const emAberto = doPeriodo.filter((a) => ['orcamento', 'a_fazer', 'andamento'].includes(a.status));
  const ticket = concluidos.length ? faturado / concluidos.length : 0;
  // A receber de qualquer época (para não esquecer cobranças antigas)
  const aReceberGeral = soma(todos.filter((a) => a.status === 'concluido' && !a.pago));

  // Ranking de serviços e clientes no período
  const ranking = (chave: (a: Atendimento) => string) => {
    const m = new Map<string, { qtd: number; valor: number }>();
    for (const a of concluidos) {
      const k = chave(a) || 'Sem cliente';
      const x = m.get(k) ?? { qtd: 0, valor: 0 };
      x.qtd += 1; x.valor += Number(a.valor) || 0;
      m.set(k, x);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].valor - a[1].valor || b[1].qtd - a[1].qtd).slice(0, 6);
  };
  const topServicos = ranking((a) => a.servico);
  const topClientes = ranking((a) => nomeCliente(a.cliente_id));

  // Gráfico: últimos 12 meses (faturado por mês)
  const meses = useMemo(() => {
    const h = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(h.getFullYear(), h.getMonth() - 11 + i, 1);
      const chave = iso(d).slice(0, 7);
      const valor = todos.filter((a) => a.status === 'concluido' && a.data.slice(0, 7) === chave).reduce((s, a) => s + (Number(a.valor) || 0), 0);
      return { chave, rotulo: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), valor };
    });
  }, [todos]);
  const maiorMes = Math.max(1, ...meses.map((m) => m.valor));

  const lista = doPeriodo
    .filter((a) => filtro === 'todos' || (filtro === 'receber' ? a.status === 'concluido' && !a.pago : filtro === 'pagos' ? a.pago : emAberto.includes(a)))
    .filter((a) => !busca.trim() || combina(`${a.servico} ${a.descricao} ${a.processo} ${nomeCliente(a.cliente_id)}`, busca));

  function cobrar(a: Atendimento) {
    const c = clientes.find((x) => x.id === a.cliente_id);
    if (!c?.telefone) return avisar('Este serviço não tem cliente com WhatsApp cadastrado.', true);
    window.open(whatsDoTelefone(c.telefone, mensagemCobranca(config.mensagem_cobranca, { responsavel: c.responsavel, servico: a.servico, data: a.data, valor: Number(a.valor) || 0 })), '_blank', 'noopener');
  }

  // Planilha do período (abre no Excel)
  function exportar() {
    const nomePeriodo = PERIODOS.find((p) => p.valor === periodo)?.rotulo ?? periodo;
    const linhasPlanilha: (string | number)[][] = doPeriodo.map((a) => [
      dataBR(a.data), nomeCliente(a.cliente_id), a.servico, a.descricao, a.processo,
      rotulo(STATUS, a.status), Number(a.valor) || 0, a.pago ? 'Sim' : 'Não', dataBR(a.data_pagamento), a.forma_pagamento,
    ]);
    linhasPlanilha.push([], ['', '', 'Faturado (concluídos)', '', '', '', faturado], ['', '', 'Recebido', '', '', '', recebido], ['', '', 'A receber', '', '', '', aReceber]);
    baixarPlanilha(
      `financeiro-${(config.marca || 'site').toLowerCase().replace(/\W+/g, '-')}-${nomePeriodo.toLowerCase().replace(/\s+/g, '-')}-${iso(new Date())}.csv`,
      ['Data', 'Cliente', 'Serviço', 'Descrição', 'Processo', 'Situação', 'Valor (R$)', 'Pago', 'Data do pagamento', 'Forma'],
      linhasPlanilha,
    );
  }

  async function marcarPago(a: Atendimento) {
    const { error } = await supabase().from('atendimentos').update({ pago: true, data_pagamento: iso(new Date()) }).eq('id', a.id);
    if (error) return avisar(error.message, true);
    avisar('Marcado como pago');
    carregar();
    // Cliente satisfeito = melhor hora para pedir avaliação
    const c = clientes.find((x) => x.id === a.cliente_id);
    if (podePedirAvaliacao(c)) setSugestao(c!);
  }

  async function pedirAvaliacao(c: Cliente) {
    window.open(linkPedidoAvaliacao(c), '_blank', 'noopener');
    await supabase().from('clientes').update({ avaliacao_pedida_em: new Date().toISOString() }).eq('id', c.id);
    setSugestao(null);
    recarregar();
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Financeiro</h2>
        <p className="adm-sub">Registre cada serviço feito com o valor. Os números e gráficos se montam sozinhos.</p>
      </div>

      <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} aria-label="Período" style={{ width: 'auto' }}>
          {PERIODOS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
        </select>
        <span className="adm-linha">
          <button className="adm-btn" onClick={exportar} disabled={!doPeriodo.length}>Baixar planilha (Excel)</button>
          <button className="adm-btn pri" onClick={() => setEditando({})}>+ Registrar serviço</button>
        </span>
      </div>

      {sugestao && (
        <div className="adm-item mudou">
          <strong>Pagamento registrado! Quer pedir uma avaliação para {sugestao.nome}?</strong>
          <span className="adm-dica" style={{ margin: 0 }}>Abre o WhatsApp com o link da avaliação. Não sugerimos de novo para este cliente por 90 dias.</span>
          <div className="adm-linha">
            <button className="adm-btn pri" onClick={() => pedirAvaliacao(sugestao)}>Pedir avaliação</button>
            <button className="adm-btn" onClick={() => setSugestao(null)}>Agora não</button>
          </div>
        </div>
      )}

      {editando && (
        <FormAtendimento
          inicial={editando}
          clientes={clientes}
          servicos={servicos}
          avisar={avisar}
          aoSalvar={() => { setEditando(null); carregar(); }}
          aoCancelar={() => setEditando(null)}
        />
      )}

      <div className="adm-grade">
        <Cartao rotulo="Faturado" valor={brl(faturado)} dica={`${concluidos.length} serviço${concluidos.length === 1 ? '' : 's'} concluído${concluidos.length === 1 ? '' : 's'}`} />
        <Cartao rotulo="Recebido" valor={brl(recebido)} dica="já pago" />
        <Cartao rotulo="A receber" valor={brl(aReceber)} dica={aReceberGeral > aReceber ? `${brl(aReceberGeral)} somando outros períodos` : 'concluído e não pago'} alerta={aReceber > 0} />
        <Cartao rotulo="Ticket médio" valor={brl(ticket)} dica={`${emAberto.length} em aberto ou orçamento`} />
      </div>

      <div className="adm-item">
        <h3>Faturamento dos últimos 12 meses</h3>
        <div className="grafico" role="img" aria-label="Faturamento por mês">
          {meses.map((m) => (
            <div key={m.chave} className="grafico-col" title={`${m.rotulo}: ${brl(m.valor)}`}>
              <span className="grafico-valor">{m.valor ? brl(m.valor).replace(',00', '') : ''}</span>
              <div className="grafico-barra" style={{ height: `${Math.max(2, (m.valor / maiorMes) * 100)}%` }} />
              <span className="grafico-mes">{m.rotulo}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="adm-grade">
        <Ranking titulo="Serviços que mais renderam" itens={topServicos} />
        <Ranking titulo="Clientes que mais contrataram" itens={topClientes} />
      </div>

      <div className="adm-linha">
        {([['todos', 'Todos'], ['receber', 'A receber'], ['pagos', 'Pagos'], ['abertos', 'Em aberto']] as const).map(([k, r]) => (
          <button key={k} className={`adm-btn peq${filtro === k ? ' pri' : ''}`} onClick={() => setFiltro(k)}>{r}</button>
        ))}
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar serviço, cliente, processo…" aria-label="Buscar serviço" style={{ flex: 1, minWidth: 180 }} />
      </div>

      {lista.length === 0 && <p className="adm-sub">Nenhum serviço neste período.</p>}
      <div className="adm-lista">
        {lista.map((a) => (
          <div key={a.id} style={{ display: 'grid', gap: 6 }}>
            <LinhaServico s={a} cliente={nomeCliente(a.cliente_id)} aoClicar={() => setEditando(a)} />
            {a.status === 'concluido' && !a.pago && (
              <span className="adm-linha" style={{ justifyContent: 'flex-end' }}>
                <button className="adm-btn peq" onClick={() => cobrar(a)}>Cobrar no WhatsApp</button>
                <button className="adm-btn peq" onClick={() => marcarPago(a)}>Marcar como pago</button>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Cartao({ rotulo, valor, dica, alerta }: { rotulo: string; valor: string; dica: string; alerta?: boolean }) {
  return (
    <div className="adm-item" style={{ gap: 2 }}>
      <span className="adm-dica" style={{ margin: 0 }}>{rotulo}</span>
      <strong className="numero" style={{ color: alerta ? '#b3261e' : undefined }}>{valor}</strong>
      <span className="adm-dica" style={{ margin: 0 }}>{dica}</span>
    </div>
  );
}

function Ranking({ titulo, itens }: { titulo: string; itens: [string, { qtd: number; valor: number }][] }) {
  const maior = Math.max(1, ...itens.map(([, x]) => x.valor));
  return (
    <div className="adm-item">
      <h3>{titulo}</h3>
      {itens.length === 0 && <p className="adm-dica" style={{ margin: 0 }}>Sem serviços concluídos no período.</p>}
      <ul className="ranking">
        {itens.map(([nome, x]) => (
          <li key={nome}>
            <div className="ranking-topo"><span>{nome}</span><strong>{brl(x.valor)}</strong></div>
            <div className="ranking-barra"><span style={{ width: `${(x.valor / maior) * 100}%` }} /></div>
            <span className="adm-dica" style={{ margin: 0 }}>{x.qtd} vez{x.qtd === 1 ? '' : 'es'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
