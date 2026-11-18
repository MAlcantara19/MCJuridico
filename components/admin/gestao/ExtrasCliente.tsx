'use client';
// Ficha do cliente: etiquetas, acesso à área do cliente e horas do pacote.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ETIQUETAS, corEtiqueta, dataBR, hojeISO, whatsDoTelefone, type Cliente } from '@/lib/gestao';
import { msgAcessoCliente } from '@/lib/mensagens';

type Aviso = (m: string, e?: boolean) => void;

// ---------- Etiquetas ----------
export function Etiquetas({ cliente, avisar, aoMudar }: { cliente: Cliente; avisar: Aviso; aoMudar: (e: string[]) => void }) {
  const [lista, setLista] = useState<string[]>(cliente.etiquetas ?? []);
  const [nova, setNova] = useState('');

  async function salvar(novas: string[]) {
    setLista(novas);
    const { error } = await supabase().from('clientes').update({ etiquetas: novas }).eq('id', cliente.id);
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-15.sql?`, true);
    aoMudar(novas);
  }
  const alternar = (e: string) => salvar(lista.includes(e) ? lista.filter((x) => x !== e) : [...lista, e]);
  const opcoes = Array.from(new Set([...Object.keys(ETIQUETAS), ...lista]));

  return (
    <div className="adm-item">
      <h3>🏷️ Etiquetas</h3>
      <div className="adm-linha">
        {opcoes.map((e) => (
          <button key={e} type="button" className={`etq${lista.includes(e) ? '' : ' etq-fora'}`} style={{ ['--cor' as string]: corEtiqueta(e), cursor: 'pointer', fontSize: '0.8rem', padding: '5px 12px' }} onClick={() => alternar(e)}>
            {lista.includes(e) ? '✓ ' : '+ '}{e}
          </button>
        ))}
      </div>
      <div className="adm-linha">
        <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova etiqueta" style={{ maxWidth: 220 }} />
        <button type="button" className="adm-btn peq" disabled={!nova.trim()} onClick={() => { if (!lista.includes(nova.trim())) salvar([...lista, nova.trim()]); setNova(''); }}>Criar</button>
      </div>
    </div>
  );
}

// ---------- Área do cliente (link + código de 4 dígitos) ----------
const gerarToken = () => {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};
const gerarPin = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0');

export function AcessoCliente({ cliente, avisar }: { cliente: Cliente; avisar: Aviso }) {
  const [token, setToken] = useState(cliente.acesso_token || '');
  const [pin, setPin] = useState(cliente.acesso_pin || '');
  // Endereço do site só existe no navegador; lido depois de montar para não divergir do servidor
  const [origem, setOrigem] = useState('');
  useEffect(() => { setOrigem(window.location.origin); }, []);
  const link = token ? `${origem}/cliente/${token}` : '';

  async function criar(trocar = false) {
    if (trocar && !confirm('Gerar novo link e novo código? O acesso antigo para de funcionar.')) return;
    const t = gerarToken();
    const p = gerarPin();
    const { error } = await supabase().from('clientes').update({ acesso_token: t, acesso_pin: p, pin_erros: 0, pin_bloqueio: null }).eq('id', cliente.id);
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-15.sql?`, true);
    setToken(t);
    setPin(p);
    avisar('Acesso criado. Envie para o cliente pelo WhatsApp.');
  }

  async function desligar() {
    if (!confirm('Desligar a área do cliente? O link para de funcionar.')) return;
    await supabase().from('clientes').update({ acesso_token: null, acesso_pin: null }).eq('id', cliente.id);
    setToken('');
    setPin('');
  }

  return (
    <div className="adm-item">
      <h3>👤 Área do cliente</h3>
      {!token ? (
        <>
          <p className="adm-dica" style={{ margin: 0 }}>O cliente acompanha os pedidos, envia documentos e comprovantes, e vê orçamentos, recibos e horas do pacote. Ele entra com um link e um código de 4 dígitos, sem senha para criar.</p>
          <div><button type="button" className="adm-btn pri" onClick={() => criar()}>Criar acesso</button></div>
        </>
      ) : (
        <>
          <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link da área do cliente" />
          <p style={{ margin: 0 }}>Código de acesso: <strong style={{ fontSize: '1.2rem', letterSpacing: 3 }}>{pin}</strong></p>
          <div className="adm-linha">
            {cliente.telefone && (
              <a className="adm-btn pri peq" target="_blank" rel="noopener noreferrer" href={whatsDoTelefone(cliente.telefone, msgAcessoCliente({ nome: cliente.responsavel || cliente.nome, link, pin }))}>Enviar acesso no WhatsApp</a>
            )}
            <a className="adm-btn peq" href={link} target="_blank" rel="noopener noreferrer">Ver como o cliente</a>
            <button type="button" className="adm-btn peq" onClick={() => criar(true)}>Gerar novo</button>
            <button type="button" className="adm-btn peq perigo" onClick={desligar}>Desligar</button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Horas do pacote ----------
type Hora = { id: number; data: string; minutos: number; descricao: string };
const fmtHoras = (min: number) => `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, '0')}`;

export function HorasCliente({ cliente, avisar }: { cliente: Cliente; avisar: Aviso }) {
  const [lista, setLista] = useState<Hora[]>([]);
  const [horasMes, setHorasMes] = useState(String(cliente.horas_mes ?? 0));
  const [mostrar, setMostrar] = useState(!!cliente.mostrar_horas);
  const [inicio, setInicio] = useState<number | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const [desc, setDesc] = useState('');
  const [manual, setManual] = useState('');
  const chave = `mc-crono-${cliente.id}`;
  const tique = useRef<ReturnType<typeof setInterval> | null>(null);

  const mesIni = hojeISO().slice(0, 8) + '01';
  async function carregar() {
    const { data, error } = await supabase().from('horas').select('*').eq('cliente_id', cliente.id).gte('data', mesIni).order('data', { ascending: false });
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-15.sql?`, true);
    setLista((data as Hora[]) ?? []);
  }
  useEffect(() => {
    carregar();
    try { const s = localStorage.getItem(chave); if (s) setInicio(Number(s)); } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cronômetro continua mesmo trocando de aba (guarda o início no aparelho)
  useEffect(() => {
    if (inicio) tique.current = setInterval(() => setAgora(Date.now()), 1000);
    return () => { if (tique.current) clearInterval(tique.current); };
  }, [inicio]);

  async function lancar(minutos: number, descricao: string) {
    if (minutos <= 0) return;
    const { error } = await supabase().from('horas').insert({ cliente_id: cliente.id, data: hojeISO(), minutos: Math.round(minutos), descricao });
    if (error) return avisar(error.message, true);
    avisar(`${fmtHoras(minutos)} lançadas`);
    carregar();
  }

  function iniciarParar() {
    if (!inicio) {
      const t = Date.now();
      setInicio(t);
      try { localStorage.setItem(chave, String(t)); } catch {}
    } else {
      const minutos = (Date.now() - inicio) / 60000;
      setInicio(null);
      try { localStorage.removeItem(chave); } catch {}
      lancar(Math.max(1, minutos), desc || 'Cronômetro');
      setDesc('');
    }
  }

  async function salvarConfig(h: string, m: boolean) {
    const { error } = await supabase().from('clientes').update({ horas_mes: Number(h.replace(',', '.')) || 0, mostrar_horas: m }).eq('id', cliente.id);
    if (error) avisar(error.message, true);
  }

  async function excluir(h: Hora) {
    await supabase().from('horas').delete().eq('id', h.id);
    carregar();
  }

  const usados = lista.reduce((s, h) => s + h.minutos, 0);
  const contratados = (Number(horasMes.replace(',', '.')) || 0) * 60;
  const pct = contratados ? Math.min(100, (usados / contratados) * 100) : 0;
  const decorrido = inicio ? (agora - inicio) / 60000 : 0;

  return (
    <div className="adm-item">
      <h3>⏱️ Horas do pacote ({new Date().toLocaleDateString('pt-BR', { month: 'long' })})</h3>
      <div className="adm-grade">
        <label>Horas contratadas por mês<input inputMode="decimal" value={horasMes} onChange={(e) => setHorasMes(e.target.value)} onBlur={() => salvarConfig(horasMes, mostrar)} placeholder="Ex.: 20" /></label>
        <label className="adm-check"><input type="checkbox" checked={mostrar} onChange={(e) => { setMostrar(e.target.checked); salvarConfig(horasMes, e.target.checked); }} /> Mostrar as horas para o cliente</label>
      </div>
      {contratados > 0 && (
        <div>
          <div className="ranking-topo"><span>Usadas: <strong>{fmtHoras(usados)}</strong> de {fmtHoras(contratados)}</span><strong style={{ color: pct >= 90 ? '#b3261e' : undefined }}>{Math.round(pct)}%</strong></div>
          <div className="ranking-barra"><span style={{ width: `${pct}%`, background: pct >= 90 ? '#b3261e' : undefined }} /></div>
          {pct >= 80 && <span className="adm-dica" style={{ margin: 0, color: '#b3261e' }}>As horas do mês estão acabando. Hora extra: avise o cliente.</span>}
        </div>
      )}
      <div className="adm-linha">
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="O que está fazendo?" style={{ flex: 1, minWidth: 160 }} />
        <button type="button" className={`adm-btn${inicio ? ' gravando' : ' pri'}`} onClick={iniciarParar}>{inicio ? `⏹ Parar (${fmtHoras(decorrido)})` : '▶ Iniciar cronômetro'}</button>
      </div>
      <div className="adm-linha">
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Lançar à mão (ex.: 1:30)" style={{ maxWidth: 200 }} />
        <button type="button" className="adm-btn peq" onClick={() => {
          const [h, m] = manual.split(/[:h]/).map((x) => Number(x) || 0);
          lancar(h * 60 + m, desc || 'Lançamento manual');
          setManual('');
        }}>Lançar</button>
      </div>
      {lista.map((h) => (
        <div key={h.id} className="adm-linha" style={{ justifyContent: 'space-between', fontSize: '0.88rem', borderTop: '1px solid var(--l)', paddingTop: 6 }}>
          <span>{dataBR(h.data)} · <strong>{fmtHoras(h.minutos)}</strong> · {h.descricao}</span>
          <button type="button" className="adm-btn peq perigo" onClick={() => excluir(h)} aria-label="Excluir lançamento">×</button>
        </div>
      ))}
      {contratados > 0 && usados > contratados && (
        <span className="adm-dica" style={{ margin: 0, color: '#b3261e' }}>Excedente do mês: {fmtHoras(usados - contratados)} (cobrar como hora extra).</span>
      )}
    </div>
  );
}
