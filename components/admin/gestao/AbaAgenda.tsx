'use client';
// Agenda de prazos, diligências e audiências.
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { combina } from '@/lib/util';
import { TIPOS_AGENDA, dataBR, diaSemana, hojeISO, rotulo, somarDias, type Compromisso } from '@/lib/gestao';
import { useBase } from './useBase';

type Aviso = (m: string, e?: boolean) => void;
type Visao = 'pendentes' | 'hoje' | 'semana' | 'feitos';

export default function AbaAgenda({ avisar }: { avisar: Aviso }) {
  const { clientes } = useBase();
  const [itens, setItens] = useState<Compromisso[]>([]);
  const [visao, setVisao] = useState<Visao>('pendentes');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Partial<Compromisso> | null>(null);

  async function carregar() {
    const { data, error } = await supabase().from('agenda').select('*')
      .gte('data', somarDias(hojeISO(), -120)).order('data').order('hora', { nullsFirst: true });
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-06.sql?`, true);
    setItens((data as Compromisso[]) ?? []);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hoje = hojeISO();
  const nomeCliente = (id: number | null) => clientes.find((c) => c.id === id)?.nome ?? '';
  const atrasados = itens.filter((i) => !i.feito && i.data < hoje);

  const filtrados = itens
    .filter((i) => {
      if (visao === 'feitos') return i.feito;
      if (i.feito) return false;
      if (visao === 'hoje') return i.data <= hoje;
      if (visao === 'semana') return i.data <= somarDias(hoje, 7);
      return true;
    })
    .filter((i) => !busca.trim() || combina(`${i.titulo} ${i.local} ${i.processo} ${i.observacoes} ${nomeCliente(i.cliente_id)}`, busca));
  const ordenados = visao === 'feitos' ? [...filtrados].reverse() : filtrados;

  // Agrupa por dia
  const grupos = ordenados.reduce<Record<string, Compromisso[]>>((g, i) => { (g[i.data] ??= []).push(i); return g; }, {});

  async function alternarFeito(i: Compromisso) {
    const { error } = await supabase().from('agenda').update({ feito: !i.feito }).eq('id', i.id);
    if (error) return avisar(error.message, true);
    setItens((l) => l.map((x) => (x.id === i.id ? { ...x, feito: !i.feito } : x)));
  }

  function rotuloDia(d: string) {
    if (d === hoje) return 'Hoje';
    if (d === somarDias(hoje, 1)) return 'Amanhã';
    if (d < hoje) return `${dataBR(d)} · atrasado`;
    return `${diaSemana(d)}, ${dataBR(d)}`;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Agenda</h2>
        <p className="adm-sub">Prazos, diligências e audiências. Marque como feito quando terminar.</p>
      </div>

      {atrasados.length > 0 && visao !== 'feitos' && (
        <div className="adm-item" style={{ borderColor: '#b3261e' }}>
          <strong style={{ color: '#b3261e' }}>{atrasados.length} compromisso{atrasados.length > 1 ? 's' : ''} atrasado{atrasados.length > 1 ? 's' : ''}</strong>
        </div>
      )}

      <div className="adm-linha">
        {([['pendentes', 'Pendentes'], ['hoje', 'Hoje'], ['semana', 'Próximos 7 dias'], ['feitos', 'Feitos']] as const).map(([k, r]) => (
          <button key={k} className={`adm-btn peq${visao === k ? ' pri' : ''}`} onClick={() => setVisao(k)}>{r}</button>
        ))}
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" aria-label="Buscar compromisso" style={{ flex: 1, minWidth: 150 }} />
        <button className="adm-btn pri" onClick={() => setEditando({ data: hoje, tipo: 'prazo' })}>+ Novo</button>
      </div>

      {editando && (
        <FormCompromisso
          inicial={editando}
          clientes={clientes.map((c) => ({ id: c.id, nome: c.nome }))}
          avisar={avisar}
          aoSalvar={() => { setEditando(null); carregar(); }}
          aoCancelar={() => setEditando(null)}
        />
      )}

      {ordenados.length === 0 && <p className="adm-sub">Nada por aqui.</p>}

      {Object.entries(grupos).map(([dia, lista]) => (
        <div key={dia} style={{ display: 'grid', gap: 8 }}>
          <h3 className={`agenda-dia${dia < hoje && visao !== 'feitos' ? ' atrasado' : ''}`}>{rotuloDia(dia)}</h3>
          {lista.map((i) => (
            <div key={i.id} className={`adm-item agenda-item${i.feito ? ' feito' : ''}`}>
              <input type="checkbox" checked={i.feito} onChange={() => alternarFeito(i)} aria-label={`Marcar ${i.titulo} como feito`} />
              <button className="agenda-texto" onClick={() => setEditando(i)}>
                <span className="etiqueta">{rotulo(TIPOS_AGENDA, i.tipo)}</span>
                <strong>{i.hora ? `${i.hora.slice(0, 5)} · ` : ''}{i.titulo}</strong>
                <span className="adm-dica" style={{ margin: 0 }}>
                  {[nomeCliente(i.cliente_id), i.local, i.processo && `Proc. ${i.processo}`].filter(Boolean).join(' · ')}
                </span>
                {i.observacoes && <span style={{ fontSize: '0.86rem' }}>{i.observacoes}</span>}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function FormCompromisso({ inicial, clientes, avisar, aoSalvar, aoCancelar }: {
  inicial: Partial<Compromisso>; clientes: { id: number; nome: string }[];
  avisar: Aviso; aoSalvar: () => void; aoCancelar: () => void;
}) {
  const [v, setV] = useState({
    titulo: inicial.titulo ?? '', tipo: inicial.tipo ?? 'prazo', data: inicial.data ?? hojeISO(),
    hora: inicial.hora?.slice(0, 5) ?? '', cliente_id: inicial.cliente_id ?? null,
    local: inicial.local ?? '', processo: inicial.processo ?? '', observacoes: inicial.observacoes ?? '',
  });
  const mudar = (c: string, x: any) => setV((o) => ({ ...o, [c]: x }));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const dados = { ...v, hora: v.hora || null };
    const r = inicial.id
      ? await supabase().from('agenda').update(dados).eq('id', inicial.id)
      : await supabase().from('agenda').insert(dados);
    if (r.error) return avisar(r.error.message, true);
    avisar('Salvo na agenda');
    aoSalvar();
  }

  async function excluir() {
    if (!inicial.id || !confirm('Excluir este compromisso?')) return;
    const { error } = await supabase().from('agenda').delete().eq('id', inicial.id);
    if (error) return avisar(error.message, true);
    aoSalvar();
  }

  return (
    <form className="adm-item mudou" onSubmit={salvar}>
      <h3>{inicial.id ? 'Editar compromisso' : 'Novo compromisso'}</h3>
      <div className="adm-grade">
        <label style={{ gridColumn: '1 / -1' }}>O quê<input value={v.titulo} onChange={(e) => mudar('titulo', e.target.value)} required placeholder="Ex.: Protocolar contestação" /></label>
        <label>
          Tipo
          <select value={v.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
            {TIPOS_AGENDA.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
        </label>
        <label>Data<input type="date" value={v.data} onChange={(e) => mudar('data', e.target.value)} required /></label>
        <label>Hora (opcional)<input type="time" value={v.hora} onChange={(e) => mudar('hora', e.target.value)} /></label>
        <label>
          Cliente
          <select value={v.cliente_id ?? ''} onChange={(e) => mudar('cliente_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">Nenhum</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label>Local<input value={v.local} onChange={(e) => mudar('local', e.target.value)} placeholder="Ex.: Fórum de Três Rios" /></label>
        <label>Nº do processo<input value={v.processo} onChange={(e) => mudar('processo', e.target.value)} /></label>
        <label style={{ gridColumn: '1 / -1' }}>Anotações<textarea value={v.observacoes} onChange={(e) => mudar('observacoes', e.target.value)} /></label>
      </div>
      <div className="adm-linha">
        <button className="adm-btn pri" type="submit">Salvar</button>
        <button className="adm-btn" type="button" onClick={aoCancelar}>Cancelar</button>
        {inicial.id && <button className="adm-btn perigo" type="button" onClick={excluir}>Excluir</button>}
      </div>
    </form>
  );
}
