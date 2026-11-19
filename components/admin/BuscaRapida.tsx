'use client';
// Busca rápida em todo o painel (Ctrl+K ou "/"): clientes, pedidos (código, processo) e agenda.
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { combina } from '@/lib/util';
import { COR_STATUS, STATUS, dataBR, rotulo, type Atendimento, type Cliente, type Compromisso } from '@/lib/gestao';

type Resultado = { chave: string; grupo: string; titulo: string; sub: string; cor?: string; abrir: () => void };

export default function BuscaRapida({ abrirCliente, irPara }: { abrirCliente: (id: number) => void; irPara: (aba: string) => void }) {
  const [aberta, setAberta] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const [base, setBase] = useState<{ c: Cliente[]; a: Atendimento[]; g: Compromisso[] } | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  // Atalho: Ctrl+K / Cmd+K ou "/" fora de campos de texto
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const digitando = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !digitando)) { e.preventDefault(); setAberta(true); }
      if (e.key === 'Escape') setAberta(false);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  useEffect(() => {
    if (!aberta) return;
    setQ(''); setSel(0);
    setTimeout(() => campo.current?.focus(), 30);
    Promise.all([
      supabase().from('clientes').select('*').order('nome'),
      supabase().from('atendimentos').select('id, codigo, servico, processo, descricao, status, data, cliente_id, valor, pago').order('data', { ascending: false }).limit(1500),
      supabase().from('agenda').select('id, titulo, processo, local, data, hora, tipo, feito, cliente_id').eq('feito', false).order('data').limit(500),
    ]).then(([c, a, g]) => setBase({ c: (c.data as Cliente[]) ?? [], a: (a.data as Atendimento[]) ?? [], g: (g.data as Compromisso[]) ?? [] }));
  }, [aberta]);

  const resultados = useMemo<Resultado[]>(() => {
    if (!base || q.trim().length < 2) return [];
    const nome = (id: number | null) => base.c.find((c) => c.id === id)?.nome ?? '';
    const fechar = (f: () => void) => () => { setAberta(false); f(); };
    const clientes = base.c.filter((c) => combina(`${c.nome} ${c.responsavel} ${c.telefone} ${c.documento} ${c.cidade} ${c.email}`, q)).slice(0, 6)
      .map((c) => ({ chave: `c${c.id}`, grupo: 'Clientes', titulo: c.nome, sub: [c.responsavel, c.telefone, c.cidade].filter(Boolean).join(' · '), abrir: fechar(() => abrirCliente(c.id)) }));
    const pedidos = base.a.filter((a) => combina(`${a.codigo} ${a.servico} ${a.processo} ${a.descricao} ${nome(a.cliente_id)}`, q)).slice(0, 8)
      .map((a) => ({ chave: `a${a.id}`, grupo: 'Pedidos', titulo: `${a.codigo ? `${a.codigo} · ` : ''}${a.servico}`, sub: [nome(a.cliente_id), rotulo(STATUS, a.status), dataBR(a.data), a.processo && `Proc. ${a.processo}`].filter(Boolean).join(' · '), cor: COR_STATUS[a.status], abrir: fechar(() => (a.cliente_id ? abrirCliente(a.cliente_id) : irPara('financeiro'))) }));
    const agenda = base.g.filter((g) => combina(`${g.titulo} ${g.processo} ${g.local} ${nome(g.cliente_id)}`, q)).slice(0, 5)
      .map((g) => ({ chave: `g${g.id}`, grupo: 'Agenda', titulo: g.titulo, sub: [dataBR(g.data), g.hora?.slice(0, 5), g.local, nome(g.cliente_id)].filter(Boolean).join(' · '), abrir: fechar(() => irPara('agenda')) }));
    return [...clientes, ...pedidos, ...agenda];
  }, [base, q, abrirCliente, irPara]);

  useEffect(() => { setSel(0); }, [q]);

  function teclado(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(resultados.length - 1, s + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === 'Enter' && resultados[sel]) resultados[sel].abrir();
  }

  return (
    <>
      <button className="adm-btn peq busca-botao" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={() => setAberta(true)} title="Buscar (Ctrl+K)">
        🔍 <span className="busca-rotulo">Buscar</span> <kbd>Ctrl K</kbd>
      </button>
      {aberta && (
        <div className="busca-fundo" onClick={() => setAberta(false)} role="presentation">
          <div className="busca-caixa" role="dialog" aria-modal="true" aria-label="Busca rápida" onClick={(e) => e.stopPropagation()}>
            <input ref={campo} type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={teclado}
              placeholder="Cliente, código do pedido (MC-0012), processo, telefone…" aria-label="Buscar no painel" />
            <div className="busca-resultados" role="listbox">
              {!base && <p className="adm-dica">Carregando…</p>}
              {base && q.trim().length < 2 && <p className="adm-dica">Digite pelo menos 2 letras. Use ↑ ↓ e Enter para abrir.</p>}
              {base && q.trim().length >= 2 && !resultados.length && <p className="adm-dica">Nada encontrado para “{q}”.</p>}
              {resultados.map((r, i) => (
                <div key={r.chave}>
                  {(i === 0 || resultados[i - 1].grupo !== r.grupo) && <span className="busca-grupo">{r.grupo}</span>}
                  <button role="option" aria-selected={i === sel} className={`busca-item${i === sel ? ' ativo' : ''}`} onMouseEnter={() => setSel(i)} onClick={r.abrir}>
                    {r.cor && <span className="busca-cor" style={{ background: r.cor }} />}
                    <span><strong>{r.titulo}</strong><small>{r.sub}</small></span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
