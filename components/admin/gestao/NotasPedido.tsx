'use client';
// Observações internas do pedido: texto, ditado por voz ou áudio gravado.
// Só quem entra no painel vê. O cliente nunca tem acesso.
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apagarPrivado, enviarPrivado, linkPrivado } from '@/lib/arquivos';

type Nota = { id: number; tipo: 'texto' | 'audio'; texto: string; caminho: string; autor: string; criado_em: string };
type Aviso = (m: string, e?: boolean) => void;

// Reconhecimento de voz do navegador (Chrome e Edge funcionam melhor)
type Reconhecedor = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: any) => void) | null; onend: (() => void) | null; onerror: ((e: any) => void) | null };
const criarReconhecedor = (): Reconhecedor | null => {
  if (typeof window === 'undefined') return null;
  const R = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return R ? new R() : null;
};

export default function NotasPedido({ pedidoId, avisar }: { pedidoId: number; avisar: Aviso }) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [texto, setTexto] = useState('');
  const [ditando, setDitando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [audios, setAudios] = useState<Record<number, string>>({});
  const rec = useRef<Reconhecedor | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const pedacos = useRef<Blob[]>([]);

  async function carregar() {
    const { data, error } = await supabase().from('notas_pedido').select('*').eq('atendimento_id', pedidoId).order('criado_em', { ascending: false });
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-15.sql?`, true);
    setNotas((data as Nota[]) ?? []);
  }
  useEffect(() => { carregar(); }, [pedidoId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function autor() {
    const { data } = await supabase().auth.getUser();
    return (data.user?.email || '').split('@')[0];
  }

  async function salvarTexto() {
    if (!texto.trim()) return;
    const { error } = await supabase().from('notas_pedido').insert({ atendimento_id: pedidoId, tipo: 'texto', texto: texto.trim(), autor: await autor() });
    if (error) return avisar(error.message, true);
    setTexto('');
    carregar();
  }

  function ditar() {
    if (ditando) { rec.current?.stop(); return; }
    const r = criarReconhecedor();
    if (!r) return avisar('Este navegador não faz ditado. Use o Chrome ou o Edge, ou grave um áudio.', true);
    r.lang = 'pt-BR';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e: any) => {
      let falado = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) falado += e.results[i][0].transcript;
      if (falado) setTexto((t) => `${t}${t && !t.endsWith(' ') ? ' ' : ''}${falado.trim()}`);
    };
    r.onerror = () => setDitando(false);
    r.onend = () => setDitando(false);
    rec.current = r;
    r.start();
    setDitando(true);
  }

  async function gravar() {
    if (gravando) { gravador.current?.stop(); return; }
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const g = new MediaRecorder(fluxo);
      pedacos.current = [];
      g.ondataavailable = (e) => { if (e.data.size) pedacos.current.push(e.data); };
      g.onstop = async () => {
        fluxo.getTracks().forEach((t) => t.stop());
        setGravando(false);
        const tipo = g.mimeType || 'audio/webm';
        const ext = tipo.includes('mp4') ? 'm4a' : tipo.includes('ogg') ? 'ogg' : 'webm';
        const arquivo = new File(pedacos.current, `audio-pedido-${pedidoId}.${ext}`, { type: tipo });
        try {
          const caminho = await enviarPrivado(arquivo);
          const { error } = await supabase().from('notas_pedido').insert({ atendimento_id: pedidoId, tipo: 'audio', caminho, texto: texto.trim(), autor: await autor() });
          if (error) throw error;
          setTexto('');
          avisar('Áudio salvo');
          carregar();
        } catch (err: any) { avisar(err.message, true); }
      };
      gravador.current = g;
      g.start();
      setGravando(true);
    } catch {
      avisar('Não foi possível usar o microfone. Libere o acesso no navegador.', true);
    }
  }

  async function ouvir(n: Nota) {
    try { const url = await linkPrivado(n.caminho, 3600); setAudios((a) => ({ ...a, [n.id]: url })); } catch (e: any) { avisar(e.message, true); }
  }

  async function excluir(n: Nota) {
    if (!confirm('Excluir esta observação?')) return;
    if (n.caminho) await apagarPrivado(n.caminho);
    await supabase().from('notas_pedido').delete().eq('id', n.id);
    carregar();
  }

  return (
    <div className="notas">
      <strong>🔒 Observações internas <span className="adm-dica" style={{ fontWeight: 400 }}>(só vocês veem)</span></strong>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: cliente pediu urgência; falar com o cartório do 2º ofício; termo técnico: carta precatória…" />
      <div className="adm-linha">
        <button type="button" className="adm-btn pri peq" onClick={salvarTexto} disabled={!texto.trim()}>Salvar observação</button>
        <button type="button" className={`adm-btn peq${ditando ? ' gravando' : ''}`} onClick={ditar}>{ditando ? '⏹ Parar ditado' : '🎤 Ditar'}</button>
        <button type="button" className={`adm-btn peq${gravando ? ' gravando' : ''}`} onClick={gravar}>{gravando ? '⏹ Parar e salvar áudio' : '🎙️ Gravar áudio'}</button>
      </div>
      {notas.map((n) => (
        <div key={n.id} className="nota">
          <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
            <span className="adm-dica" style={{ margin: 0 }}>{n.tipo === 'audio' ? '🎙️ Áudio' : '📝 Texto'} · {new Date(n.criado_em).toLocaleString('pt-BR')}{n.autor ? ` · ${n.autor}` : ''}</span>
            <button type="button" className="adm-btn peq perigo" onClick={() => excluir(n)} aria-label="Excluir observação">×</button>
          </div>
          {n.texto && <p style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>{n.texto}</p>}
          {n.tipo === 'audio' && (audios[n.id]
            ? <audio controls src={audios[n.id]} style={{ width: '100%', marginTop: 6 }} />
            : <button type="button" className="adm-btn peq" onClick={() => ouvir(n)}>▶ Ouvir</button>)}
        </div>
      ))}
    </div>
  );
}
