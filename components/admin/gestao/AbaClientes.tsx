'use client';
// Clientes (escritórios, advogados, empresas): ficha, serviços feitos e compromissos.
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { combina } from '@/lib/util';
import {
  STATUS, TIPOS_CLIENTE, brl, dataBR, linkPedidoAvaliacao, mensagemCobranca, rotulo, whatsDoTelefone,
  type Atendimento, type Cliente, type Compromisso,
} from '@/lib/gestao';
import FormAtendimento from './FormAtendimento';
import Orcamento from './Orcamento';
import type { Config } from '@/lib/tipos';
import { useBase } from './useBase';

type Aviso = (m: string, e?: boolean) => void;

const VAZIO = { nome: '', tipo: 'escritorio', responsavel: '', documento: '', telefone: '', email: '', cidade: '', observacoes: '' };

type Navegar = { abrirRelatorio: (id: number) => void; novoRelatorio: (clienteId: number) => void };

export default function AbaClientes({ avisar, abrirId, config, navegar }: { avisar: Aviso; abrirId?: number | null; config: Config; navegar: Navegar }) {
  const { clientes, servicos, recarregar } = useBase();
  const [totais, setTotais] = useState<Record<number, { total: number; aReceber: number; qtd: number }>>({});
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<number | 'novo' | null>(abrirId ?? null);

  async function carregarTotais() {
    const { data } = await supabase().from('atendimentos').select('cliente_id, valor, status, pago');
    const t: Record<number, { total: number; aReceber: number; qtd: number }> = {};
    for (const a of (data ?? []) as Atendimento[]) {
      if (!a.cliente_id || a.status === 'cancelado') continue;
      t[a.cliente_id] ??= { total: 0, aReceber: 0, qtd: 0 };
      t[a.cliente_id].qtd += 1;
      if (a.status === 'concluido') {
        t[a.cliente_id].total += Number(a.valor) || 0;
        if (!a.pago) t[a.cliente_id].aReceber += Number(a.valor) || 0;
      }
    }
    setTotais(t);
  }
  useEffect(() => { carregarTotais(); }, []);

  const visiveis = clientes.filter((c) => !busca.trim() || combina(`${c.nome} ${c.responsavel} ${c.cidade} ${c.telefone} ${c.email}`, busca));

  if (aberto !== null) {
    return (
      <FichaCliente
        id={aberto === 'novo' ? null : aberto}
        config={config}
        navegar={navegar}
        clientes={clientes}
        servicos={servicos}
        avisar={avisar}
        voltar={() => { setAberto(null); recarregar(); carregarTotais(); }}
        aoCriar={(id) => { recarregar(); setAberto(id); }}
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Clientes</h2>
        <p className="adm-sub">Escritórios, advogados e empresas que contratam você. Clique em um para ver a ficha, os serviços e os valores.</p>
      </div>
      <div className="adm-linha">
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, cidade, telefone…" aria-label="Buscar cliente" style={{ flex: 1, minWidth: 200 }} />
        <button className="adm-btn pri" onClick={() => setAberto('novo')}>+ Novo cliente</button>
      </div>
      {clientes.length === 0 && <p className="adm-sub">Nenhum cliente ainda. Cadastre o primeiro ou use “Virar cliente” em uma solicitação.</p>}
      <div className="adm-lista">
        {visiveis.map((c) => {
          const t = totais[c.id];
          return (
            <button key={c.id} className="adm-item cli-linha" onClick={() => setAberto(c.id)}>
              <span className="cli-inicial">{c.nome.trim()[0]?.toUpperCase() ?? '?'}</span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <strong style={{ display: 'block' }}>{c.nome}</strong>
                <span className="adm-dica" style={{ margin: 0 }}>
                  {rotulo(TIPOS_CLIENTE, c.tipo)}{c.cidade ? ` · ${c.cidade}` : ''}{c.responsavel ? ` · ${c.responsavel}` : ''}
                </span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <strong style={{ display: 'block' }}>{brl(t?.total ?? 0)}</strong>
                <span className="adm-dica" style={{ margin: 0 }}>
                  {t?.qtd ?? 0} serviço{(t?.qtd ?? 0) === 1 ? '' : 's'}{t?.aReceber ? ` · ${brl(t.aReceber)} a receber` : ''}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type RelatorioResumo = { id: number; criado_em: string; dados: { tipo?: string; processo?: string; data?: string; resultado?: string } };
type OrcamentoResumo = { id: number; numero: string; total: number; status: string; criado_em: string; itens: { nome: string; qtd: number }[] };

function FichaCliente({ id, config, navegar, clientes, servicos, avisar, voltar, aoCriar }: {
  id: number | null; config: Config; navegar: Navegar; clientes: Cliente[]; servicos: string[]; avisar: Aviso;
  voltar: () => void; aoCriar: (id: number) => void;
}) {
  const [relatorios, setRelatorios] = useState<RelatorioResumo[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumo[]>([]);
  const [orcando, setOrcando] = useState(false);
  const atual = clientes.find((c) => c.id === id);
  const [v, setV] = useState({ ...VAZIO, ...(atual ?? {}) });
  const [mudou, setMudou] = useState(false);
  const [servs, setServs] = useState<Atendimento[]>([]);
  const [agenda, setAgenda] = useState<Compromisso[]>([]);
  const [editando, setEditando] = useState<Partial<Atendimento> | null>(null);

  useEffect(() => { if (atual) setV({ ...VAZIO, ...atual }); }, [atual]);

  async function carregar() {
    if (!id) return;
    const [a, g, r, o] = await Promise.all([
      supabase().from('atendimentos').select('*').eq('cliente_id', id).order('data', { ascending: false }),
      supabase().from('agenda').select('*').eq('cliente_id', id).order('data', { ascending: false }).limit(20),
      supabase().from('relatorios').select('id, criado_em, dados').eq('cliente_id', id).order('criado_em', { ascending: false }),
      supabase().from('orcamentos').select('id, numero, total, status, criado_em, itens').eq('cliente_id', id).order('criado_em', { ascending: false }),
    ]);
    setRelatorios((r.data as RelatorioResumo[]) ?? []);
    setOrcamentos((o.data as OrcamentoResumo[]) ?? []);
    setServs((a.data as Atendimento[]) ?? []);
    setAgenda((g.data as Compromisso[]) ?? []);
  }
  useEffect(() => { carregar(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (campo: string, valor: string) => { setV((x) => ({ ...x, [campo]: valor })); setMudou(true); };

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const dados = {
      nome: v.nome.trim(), tipo: v.tipo, responsavel: v.responsavel, documento: v.documento,
      telefone: v.telefone, email: v.email, cidade: v.cidade, observacoes: v.observacoes,
    };
    if (id) {
      const { error } = await supabase().from('clientes').update(dados).eq('id', id);
      if (error) return avisar(error.message, true);
      setMudou(false);
      avisar('Cliente salvo');
    } else {
      const { data, error } = await supabase().from('clientes').insert(dados).select('id').single();
      if (error) return avisar(error.message, true);
      avisar('Cliente cadastrado');
      aoCriar((data as { id: number }).id);
    }
  }

  async function excluir() {
    if (!id || !confirm(`Excluir ${v.nome}? Os serviços dele continuam no Financeiro, mas sem cliente.`)) return;
    const { error } = await supabase().from('clientes').delete().eq('id', id);
    if (error) return avisar(error.message, true);
    avisar('Cliente excluído');
    voltar();
  }

  const concluidos = servs.filter((s) => s.status === 'concluido');
  const pendentes = concluidos.filter((a) => !a.pago);

  // Cobrança educada pelo WhatsApp (um serviço ou todos os pendentes)
  function cobrar(lista: Atendimento[]) {
    if (!v.telefone) return avisar('Cadastre o WhatsApp do cliente para cobrar.', true);
    const total = lista.reduce((s, a) => s + (Number(a.valor) || 0), 0);
    const texto = lista.length === 1
      ? mensagemCobranca(config.mensagem_cobranca, { responsavel: v.responsavel, servico: lista[0].servico, data: lista[0].data, valor: total })
      : mensagemCobranca(config.mensagem_cobranca, { responsavel: v.responsavel, servico: `${lista.length} serviços (${lista.map((a) => a.servico).join(', ')})`, data: lista[lista.length - 1].data, valor: total });
    window.open(whatsDoTelefone(v.telefone, texto), '_blank', 'noopener');
  }

  async function mudarStatusOrc(o: OrcamentoResumo, status: string) {
    const { error } = await supabase().from('orcamentos').update({ status }).eq('id', o.id);
    if (error) return avisar(error.message, true);
    setOrcamentos((l) => l.map((x) => (x.id === o.id ? { ...x, status } : x)));
  }
  const total = concluidos.reduce((s, a) => s + (Number(a.valor) || 0), 0);
  const aReceber = concluidos.filter((a) => !a.pago).reduce((s, a) => s + (Number(a.valor) || 0), 0);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
        <button className="adm-btn peq" onClick={voltar}>← Clientes</button>
        {id && v.telefone && (
          <a className="adm-btn peq" href={whatsDoTelefone(v.telefone, `Olá${v.responsavel ? `, ${v.responsavel.split(' ')[0]}` : ''}! Aqui é a Maria Carolina.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        )}
      </div>
      <h2 style={{ margin: 0 }}>{id ? v.nome || 'Cliente' : 'Novo cliente'}</h2>

      {id && (
        <div className="adm-grade">
          <div className="adm-item" style={{ gap: 2 }}><span className="adm-dica" style={{ margin: 0 }}>Total faturado</span><strong className="numero">{brl(total)}</strong></div>
          <div className="adm-item" style={{ gap: 2 }}><span className="adm-dica" style={{ margin: 0 }}>A receber</span><strong className="numero" style={{ color: aReceber ? '#b3261e' : undefined }}>{brl(aReceber)}</strong></div>
          <div className="adm-item" style={{ gap: 2 }}><span className="adm-dica" style={{ margin: 0 }}>Serviços</span><strong className="numero">{servs.filter((s) => s.status !== 'cancelado').length}</strong></div>
        </div>
      )}

      <form className={`adm-item${mudou ? ' mudou' : ''}`} onSubmit={salvar}>
        <h3>Dados</h3>
        <div className="adm-grade">
          <label>Nome do escritório / cliente<input value={v.nome} onChange={(e) => mudar('nome', e.target.value)} required /></label>
          <label>
            Tipo
            <select value={v.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
              {TIPOS_CLIENTE.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
            </select>
          </label>
          <label>Responsável / advogado(a)<input value={v.responsavel} onChange={(e) => mudar('responsavel', e.target.value)} /></label>
          <label>CNPJ / CPF / OAB (opcional)<input value={v.documento} onChange={(e) => mudar('documento', e.target.value)} /></label>
          <label>WhatsApp / telefone<input value={v.telefone} onChange={(e) => mudar('telefone', e.target.value)} inputMode="tel" /></label>
          <label>E-mail<input type="email" value={v.email} onChange={(e) => mudar('email', e.target.value)} /></label>
          <label>Cidade<input value={v.cidade} onChange={(e) => mudar('cidade', e.target.value)} /></label>
          <label style={{ gridColumn: '1 / -1' }}>Anotações<textarea value={v.observacoes} onChange={(e) => mudar('observacoes', e.target.value)} placeholder="Ex.: prefere relatório por e-mail; paga todo dia 10" /></label>
        </div>
        <div className="adm-linha">
          <button className="adm-btn pri" type="submit" disabled={!!id && !mudou}>{id ? (mudou ? 'Salvar alterações' : 'Salvo') : 'Cadastrar cliente'}</button>
          {id && <button className="adm-btn perigo" type="button" onClick={excluir}>Excluir cliente</button>}
        </div>
      </form>

      {id && atual && (
        <div className="adm-linha nao-imprimir">
          <button className="adm-btn pri" onClick={() => setOrcando(true)}>Gerar orçamento</button>
          <button className="adm-btn" onClick={() => navegar.novoRelatorio(id)}>Nova diligência / relatório</button>
          {v.telefone && (
            <a
              className="adm-btn"
              target="_blank"
              rel="noopener noreferrer"
              href={linkPedidoAvaliacao(v)}
              onClick={() => { supabase().from('clientes').update({ avaliacao_pedida_em: new Date().toISOString() }).eq('id', id).then(() => {}); }}
            >
              Pedir avaliação{atual?.avaliacao_pedida_em ? ` (pedida em ${new Date(atual.avaliacao_pedida_em).toLocaleDateString('pt-BR')})` : ''}
            </a>
          )}
          {pendentes.length > 0 && (
            <button className="adm-btn" onClick={() => cobrar(pendentes)}>Cobrar tudo ({brl(aReceber)})</button>
          )}
        </div>
      )}

      {id && atual && orcando && (
        <Orcamento cliente={{ ...atual, ...v } as Cliente} config={config} avisar={avisar} fechar={() => { setOrcando(false); carregar(); }} />
      )}

      {id && !orcando && (
        <>
          <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Serviços deste cliente</h3>
            <button className="adm-btn pri peq" onClick={() => setEditando({ cliente_id: id })}>+ Novo serviço</button>
          </div>
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
          {servs.length === 0 && <p className="adm-sub">Nenhum serviço registrado ainda.</p>}
          <div className="adm-lista">
            {servs.map((s) => (
              <div key={s.id} style={{ display: 'grid', gap: 6 }}>
                <LinhaServico s={s} aoClicar={() => setEditando(s)} />
                {s.status === 'concluido' && !s.pago && (
                  <button className="adm-btn peq" style={{ justifySelf: 'end' }} onClick={() => cobrar([s])}>Cobrar no WhatsApp</button>
                )}
              </div>
            ))}
          </div>

          {orcamentos.length > 0 && (
            <>
              <h3 style={{ margin: '8px 0 0' }}>Orçamentos</h3>
              <div className="adm-lista">
                {orcamentos.map((o) => (
                  <div key={o.id} className="adm-item" style={{ gap: 6 }}>
                    <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
                      <strong>Nº {o.numero} · {brl(o.total)}</strong>
                      <span className="adm-dica" style={{ margin: 0 }}>{new Date(o.criado_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span style={{ fontSize: '0.86rem' }}>{(o.itens ?? []).map((i) => `${i.qtd}x ${i.nome}`).join('; ')}</span>
                    <div className="adm-linha">
                      {['enviado', 'aprovado', 'recusado'].map((st) => (
                        <button key={st} className={`adm-btn peq${o.status === st ? ' pri' : ''}`} onClick={() => mudarStatusOrc(o, st)}>{st[0].toUpperCase() + st.slice(1)}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {relatorios.length > 0 && (
            <>
              <h3 style={{ margin: '8px 0 0' }}>Relatórios de diligência</h3>
              <div className="adm-lista">
                {relatorios.map((r) => (
                  <button key={r.id} className="adm-item cli-linha" onClick={() => navegar.abrirRelatorio(r.id)}>
                    <span style={{ flex: 1, textAlign: 'left' }}>
                      <strong style={{ display: 'block' }}>{r.dados?.tipo || 'Diligência'}{r.dados?.processo ? ` · Proc. ${r.dados.processo}` : ''}</strong>
                      <span className="adm-dica" style={{ margin: 0 }}>{dataBR(r.dados?.data || r.criado_em)} · {r.dados?.resultado}</span>
                    </span>
                    <span className="adm-btn peq">Abrir / PDF</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {agenda.length > 0 && (
            <>
              <h3 style={{ margin: '8px 0 0' }}>Compromissos</h3>
              <div className="adm-lista">
                {agenda.map((g) => (
                  <div key={g.id} className="adm-item" style={{ gap: 2, opacity: g.feito ? 0.6 : 1 }}>
                    <strong>{dataBR(g.data)}{g.hora ? ` às ${g.hora.slice(0, 5)}` : ''} · {g.titulo}</strong>
                    <span className="adm-dica" style={{ margin: 0 }}>{g.feito ? 'Feito' : 'Pendente'}{g.local ? ` · ${g.local}` : ''}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function LinhaServico({ s, cliente, aoClicar }: { s: Atendimento; cliente?: string; aoClicar: () => void }) {
  return (
    <button className="adm-item cli-linha" onClick={aoClicar}>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <strong style={{ display: 'block' }}>{s.servico}</strong>
        <span className="adm-dica" style={{ margin: 0 }}>
          {dataBR(s.data)}{cliente ? ` · ${cliente}` : ''}{s.processo ? ` · Proc. ${s.processo}` : ''}
        </span>
        {s.descricao && <span style={{ display: 'block', fontSize: '0.86rem', marginTop: 2 }}>{s.descricao}</span>}
      </span>
      <span style={{ textAlign: 'right', flexShrink: 0 }}>
        <strong style={{ display: 'block' }}>{brl(s.valor)}</strong>
        <span className={`etiqueta et-${s.status}${s.status === 'concluido' && !s.pago ? ' et-pendente' : ''}`}>
          {s.status === 'concluido' ? (s.pago ? 'Pago' : 'A receber') : rotulo(STATUS, s.status)}
        </span>
      </span>
    </button>
  );
}
