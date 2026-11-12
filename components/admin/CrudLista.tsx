'use client';
// Lista editável genérica: serve para serviços, pacotes, perguntas, formações etc.
// Cada item tem: editar, salvar, subir/descer e excluir.
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { combina } from '@/lib/util';

export type Campo = {
  nome: string;
  rotulo: string;
  tipo?: 'texto' | 'area' | 'bool' | 'select';
  opcoes?: { valor: string | number; rotulo: string }[];
  numero?: boolean; // select com valores numéricos (ex.: categoria)
};

type Item = Record<string, any> & { id: number; ordem?: number };

type Props = {
  tabela: string;
  campos: Campo[];
  novo: Record<string, any>;       // valores de um item novo
  avisar: (msg: string, erro?: boolean) => void;
  semOrdem?: boolean;              // tabelas sem coluna "ordem"
  filtro?: { campo: string; rotulo: string; opcoes: { valor: number | string; rotulo: string }[] };
  textoNovo?: string;
  extra?: (item: Item) => ReactNode;
  aoExcluir?: (item: Item) => Promise<void>;
  recarregar?: number;             // muda para forçar recarregar a lista
  aoMudar?: () => void;            // avisa a aba que algo mudou
};

export default function CrudLista({ tabela, campos, novo, avisar, semOrdem, filtro, textoNovo, extra, aoExcluir, recarregar, aoMudar }: Props) {
  const [itens, setItens] = useState<Item[]>([]);
  const [mudados, setMudados] = useState<Set<number>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [valorFiltro, setValorFiltro] = useState<string>(filtro?.opcoes[0] ? String(filtro.opcoes[0].valor) : '');

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase().from(tabela).select('*').order(semOrdem ? 'id' : 'ordem').order('id');
    setCarregando(false);
    if (error) return avisar(`Erro ao carregar: ${error.message}`, true);
    setItens((data as Item[]) ?? []);
    setMudados(new Set());
  }

  useEffect(() => { carregar(); }, [tabela, recarregar]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (filtro && !filtro.opcoes.some((o) => String(o.valor) === valorFiltro)) {
      setValorFiltro(filtro.opcoes[0] ? String(filtro.opcoes[0].valor) : '');
    }
  }, [filtro, valorFiltro]);

  const [busca, setBusca] = useState('');
  const termo = busca.trim();
  // Com busca, procura em todos os itens (ignora o filtro de área)
  const visiveis = termo
    ? itens.filter((i) => combina(campos.map((c) => String(i[c.nome] ?? '')).join(' '), termo))
    : filtro ? itens.filter((i) => String(i[filtro.campo]) === valorFiltro) : itens;

  function alterar(id: number, campo: string, valor: any) {
    setItens((lista) => lista.map((i) => (i.id === id ? { ...i, [campo]: valor } : i)));
    setMudados((m) => new Set(m).add(id));
  }

  async function salvar(item: Item) {
    const { id, criado_em, ...resto } = item;
    const { error } = await supabase().from(tabela).update(resto).eq('id', id);
    if (error) return avisar(`Erro ao salvar: ${error.message}`, true);
    setMudados((m) => { const n = new Set(m); n.delete(id); return n; });
    avisar('Salvo');
    aoMudar?.();
  }

  async function adicionar() {
    const ordem = semOrdem ? undefined : Math.max(0, ...itens.map((i) => i.ordem ?? 0)) + 1;
    const dados: Record<string, any> = { ...novo };
    if (ordem !== undefined) dados.ordem = ordem;
    if (filtro && valorFiltro !== '') {
      const opcao = filtro.opcoes.find((o) => String(o.valor) === valorFiltro);
      if (opcao) dados[filtro.campo] = opcao.valor;
    }
    const { data, error } = await supabase().from(tabela).insert(dados).select().single();
    if (error) return avisar(`Erro ao adicionar: ${error.message}`, true);
    setItens((l) => [...l, data as Item]);
    avisar('Item adicionado. Preencha e clique em Salvar.');
    aoMudar?.();
  }

  async function excluir(item: Item) {
    if (!confirm('Excluir este item? Essa ação não pode ser desfeita.')) return;
    if (aoExcluir) await aoExcluir(item);
    const { error } = await supabase().from(tabela).delete().eq('id', item.id);
    if (error) return avisar(`Erro ao excluir: ${error.message}`, true);
    setItens((l) => l.filter((i) => i.id !== item.id));
    avisar('Excluído');
    aoMudar?.();
  }

  // Troca a posição com o vizinho (dentro do que está visível).
  async function mover(item: Item, direcao: -1 | 1) {
    const idx = visiveis.findIndex((i) => i.id === item.id);
    const outro = visiveis[idx + direcao];
    if (!outro) return;
    let a = item.ordem ?? 0;
    let b = outro.ordem ?? 0;
    if (a === b) b = a + direcao; // garante ordens diferentes
    const r1 = await supabase().from(tabela).update({ ordem: b }).eq('id', item.id);
    const r2 = await supabase().from(tabela).update({ ordem: a }).eq('id', outro.id);
    if (r1.error || r2.error) return avisar('Erro ao reordenar', true);
    setItens((l) =>
      l.map((i) => (i.id === item.id ? { ...i, ordem: b } : i.id === outro.id ? { ...i, ordem: a } : i))
        .sort((x, y) => (x.ordem ?? 0) - (y.ordem ?? 0) || x.id - y.id)
    );
    aoMudar?.();
  }

  function campoInput(item: Item, c: Campo) {
    const v = item[c.nome];
    if (c.tipo === 'bool') {
      return (
        <label key={c.nome} className="adm-check">
          <input type="checkbox" checked={!!v} onChange={(e) => alterar(item.id, c.nome, e.target.checked)} />
          {c.rotulo}
        </label>
      );
    }
    if (c.tipo === 'select') {
      return (
        <label key={c.nome}>
          {c.rotulo}
          <select value={v ?? ''} onChange={(e) => alterar(item.id, c.nome, c.numero ? Number(e.target.value) : e.target.value)}>
            {c.opcoes?.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
          </select>
        </label>
      );
    }
    if (c.tipo === 'area') {
      return (
        <label key={c.nome} style={{ gridColumn: '1 / -1' }}>
          {c.rotulo}
          <textarea value={v ?? ''} onChange={(e) => alterar(item.id, c.nome, e.target.value)} />
        </label>
      );
    }
    return (
      <label key={c.nome}>
        {c.rotulo}
        <input value={v ?? ''} onChange={(e) => alterar(item.id, c.nome, e.target.value)} />
      </label>
    );
  }

  return (
    <div className="adm-lista">
      <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
        {filtro ? (
          <label style={{ minWidth: 240 }}>
            {filtro.rotulo}
            <select value={valorFiltro} onChange={(e) => setValorFiltro(e.target.value)}>
              {filtro.opcoes.map((o) => <option key={o.valor} value={String(o.valor)}>{o.rotulo}</option>)}
            </select>
          </label>
        ) : <span />}
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar…"
          aria-label="Buscar nesta lista"
          style={{ maxWidth: 260 }}
        />
        <button className="adm-btn pri" onClick={adicionar}>+ {textoNovo || 'Adicionar'}</button>
      </div>

      {carregando && <p className="adm-sub">Carregando…</p>}
      {!carregando && visiveis.length === 0 && <p className="adm-sub">Nada aqui ainda. Clique em “{textoNovo || 'Adicionar'}”.</p>}

      {visiveis.map((item, i) => (
        <div key={item.id} className={`adm-item${mudados.has(item.id) ? ' mudou' : ''}`}>
          <div className="adm-grade">{campos.map((c) => campoInput(item, c))}</div>
          {extra?.(item)}
          <div className="adm-linha">
            <button className="adm-btn pri peq" onClick={() => salvar(item)} disabled={!mudados.has(item.id)}>
              {mudados.has(item.id) ? 'Salvar' : 'Salvo'}
            </button>
            {!semOrdem && (
              <>
                <button className="adm-btn peq" onClick={() => mover(item, -1)} disabled={i === 0} aria-label="Subir">↑</button>
                <button className="adm-btn peq" onClick={() => mover(item, 1)} disabled={i === visiveis.length - 1} aria-label="Descer">↓</button>
              </>
            )}
            <button className="adm-btn peq perigo" onClick={() => excluir(item)}>Excluir</button>
          </div>
        </div>
      ))}
    </div>
  );
}
