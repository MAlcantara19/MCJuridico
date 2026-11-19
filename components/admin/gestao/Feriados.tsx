'use client';
// Feriados municipais (Três Rios, Paraíba do Sul…): entram no cálculo de dias úteis dos prazos.
// Os nacionais e do estado do RJ já vêm prontos e não precisam ser cadastrados.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dataBR, definirFeriadosExtras, diaSemana, feriados, hojeISO, type FeriadoExtra } from '@/lib/gestao';

type Feriado = FeriadoExtra & { id: number };
type Aviso = (m: string, e?: boolean) => void;

export default function Feriados({ avisar, aoMudar }: { avisar: Aviso; aoMudar?: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [lista, setLista] = useState<Feriado[]>([]);
  const [novo, setNovo] = useState({ data: '', nome: '', cidade: 'Três Rios', recorrente: true });

  async function carregar() {
    const { data, error } = await supabase().from('feriados').select('*').order('data');
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-17.sql?`, true);
    const l = (data as Feriado[]) ?? [];
    setLista(l);
    definirFeriadosExtras(l);
    aoMudar?.();
  }
  useEffect(() => { if (aberto) carregar(); }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function adicionar() {
    if (!novo.data || !novo.nome.trim()) return avisar('Preencha a data e o nome do feriado.', true);
    const { error } = await supabase().from('feriados').insert({ ...novo, nome: novo.nome.trim() });
    if (error) return avisar(error.message, true);
    setNovo((n) => ({ ...n, data: '', nome: '' }));
    avisar('Feriado incluído. Os prazos já contam com ele.');
    carregar();
  }

  async function alterar(f: Feriado, campos: Partial<Feriado>) {
    const { error } = await supabase().from('feriados').update(campos).eq('id', f.id);
    if (error) return avisar(error.message, true);
    carregar();
  }

  async function excluir(f: Feriado) {
    if (!confirm(`Excluir o feriado "${f.nome}"?`)) return;
    const { error } = await supabase().from('feriados').delete().eq('id', f.id);
    if (error) return avisar(error.message, true);
    carregar();
  }

  // Próximos feriados (nacionais, RJ e municipais) dos próximos 12 meses
  const hoje = hojeISO();
  const ano = Number(hoje.slice(0, 4));
  const proximos = aberto
    ? [...Object.entries(feriados(ano)), ...Object.entries(feriados(ano + 1))].filter(([d]) => d >= hoje).sort().slice(0, 10)
    : [];

  if (!aberto) {
    return <button className="adm-btn peq" onClick={() => setAberto(true)}>📅 Feriados municipais</button>;
  }

  return (
    <div className="adm-item mudou" style={{ gap: 12 }}>
      <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>📅 Feriados municipais</h3>
        <button className="adm-btn peq" onClick={() => setAberto(false)}>Fechar</button>
      </div>
      <p className="adm-dica" style={{ margin: 0 }}>
        Os feriados nacionais e do RJ já estão incluídos. Cadastre aqui os das cidades onde você atua: os prazos em dias úteis deixam de cair nesses dias.
        Confira as datas no calendário do TJRJ ou na prefeitura.
      </p>

      {lista.map((f) => (
        <div key={f.id} className="adm-linha feriado-linha" style={{ opacity: f.ativo === false ? 0.5 : 1 }}>
          <strong style={{ minWidth: 92 }}>{f.recorrente !== false ? dataBR(f.data).slice(0, 5) : dataBR(f.data)}</strong>
          <span style={{ flex: 1, minWidth: 140 }}>{f.nome}{f.cidade ? <small className="adm-dica" style={{ margin: 0 }}> · {f.cidade}</small> : null}</span>
          <label className="adm-check"><input type="checkbox" checked={f.recorrente !== false} onChange={(e) => alterar(f, { recorrente: e.target.checked })} /> Todo ano</label>
          <label className="adm-check"><input type="checkbox" checked={f.ativo !== false} onChange={(e) => alterar(f, { ativo: e.target.checked })} /> Vale</label>
          <button className="adm-btn peq perigo" onClick={() => excluir(f)} aria-label={`Excluir ${f.nome}`}>×</button>
        </div>
      ))}
      {!lista.length && <p className="adm-sub" style={{ margin: 0 }}>Nenhum feriado municipal cadastrado.</p>}

      <div className="adm-grade">
        <label>Data<input type="date" value={novo.data} onChange={(e) => setNovo((n) => ({ ...n, data: e.target.value }))} /></label>
        <label>Nome<input value={novo.nome} onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))} placeholder="Ex.: Padroeiro da cidade" /></label>
        <label>Cidade<input value={novo.cidade} onChange={(e) => setNovo((n) => ({ ...n, cidade: e.target.value }))} list="cidades-feriado" /></label>
        <datalist id="cidades-feriado"><option value="Três Rios" /><option value="Paraíba do Sul" /></datalist>
        <label className="adm-check"><input type="checkbox" checked={novo.recorrente} onChange={(e) => setNovo((n) => ({ ...n, recorrente: e.target.checked }))} /> Repete todo ano</label>
      </div>
      <div><button className="adm-btn pri" onClick={adicionar}>+ Incluir feriado</button></div>

      <details>
        <summary className="adm-dica" style={{ cursor: 'pointer' }}>Próximos feriados (todos)</summary>
        <ul className="adm-dica" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          {proximos.map(([d, n]) => <li key={d}>{diaSemana(d)}, {dataBR(d)} · {n}</li>)}
        </ul>
      </details>
    </div>
  );
}
