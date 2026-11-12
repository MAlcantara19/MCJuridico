'use client';
// "Meus arquivos": biblioteca particular dela (modelos, PDFs, links do Drive).
// Nada daqui aparece no site. Só quem entra no painel vê.
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { apagarPrivado, enviarPrivado, linkPrivado } from '@/lib/arquivos';
import { combina } from '@/lib/util';

type Arquivo = {
  id: number; titulo: string; tipo: 'arquivo' | 'link'; url: string; caminho: string;
  pasta: string; observacao: string; favorito: boolean; tamanho: number; criado_em: string;
};

const LIMITE_MB = 25;

function extensao(a: Arquivo) {
  if (a.tipo === 'link') {
    if (/docs\.google|drive\.google/.test(a.url)) return 'DRIVE';
    return 'LINK';
  }
  const ext = (a.caminho.split('.').pop() || '').toUpperCase();
  return ext.length <= 4 ? ext : 'ARQ';
}

function tamanhoBonito(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AbaArquivos({ avisar }: { avisar: (m: string, e?: boolean) => void }) {
  const [lista, setLista] = useState<Arquivo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [pasta, setPasta] = useState('Todas');
  const [modo, setModo] = useState<'arquivo' | 'link'>('arquivo');
  const [enviando, setEnviando] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [formAberto, setFormAberto] = useState(false);

  async function carregar() {
    setCarregando(true);
    const { data, error } = await supabase().from('arquivos_privados').select('*')
      .order('favorito', { ascending: false }).order('criado_em', { ascending: false });
    setCarregando(false);
    if (error) return avisar(`Erro ao carregar: ${error.message}. Rodou o atualizacao-05.sql?`, true);
    setLista((data as Arquivo[]) ?? []);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pastas = useMemo(() => Array.from(new Set(lista.map((a) => a.pasta || 'Geral'))).sort(), [lista]);
  const termo = busca.trim();
  const visiveis = lista
    .filter((a) => pasta === 'Todas' || (pasta === '★ Favoritos' ? a.favorito : (a.pasta || 'Geral') === pasta))
    .filter((a) => !termo || combina(`${a.titulo} ${a.pasta} ${a.observacao} ${a.url}`, termo));

  async function adicionar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const base = {
      titulo: String(f.get('titulo') || '').trim(),
      pasta: String(f.get('pasta') || 'Geral').trim() || 'Geral',
      observacao: String(f.get('observacao') || '').trim(),
      favorito: f.get('favorito') === 'on',
    };
    setEnviando(true);
    try {
      if (modo === 'link') {
        let url = String(f.get('url') || '').trim();
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        const { error } = await supabase().from('arquivos_privados').insert({ ...base, tipo: 'link', url, titulo: base.titulo || url });
        if (error) throw error;
      } else {
        const arquivos = (f.getAll('arquivo') as File[]).filter((a) => a.size > 0);
        if (!arquivos.length) throw new Error('Escolha pelo menos um arquivo.');
        for (const arq of arquivos) {
          if (arq.size > LIMITE_MB * 1024 * 1024) throw new Error(`"${arq.name}" passa de ${LIMITE_MB} MB.`);
          const caminho = await enviarPrivado(arq);
          const titulo = arquivos.length > 1 || !base.titulo ? arq.name.replace(/\.[^.]+$/, '') : base.titulo;
          const { error } = await supabase().from('arquivos_privados').insert({ ...base, titulo, tipo: 'arquivo', caminho, tamanho: arq.size });
          if (error) throw error;
        }
      }
      form.reset();
      setFormAberto(false);
      avisar('Salvo em Meus arquivos');
      carregar();
    } catch (err: any) {
      avisar(err.message || 'Erro ao salvar', true);
    } finally {
      setEnviando(false);
    }
  }

  async function abrir(a: Arquivo, baixar = false) {
    try {
      if (a.tipo === 'link') return window.open(a.url, '_blank', 'noopener');
      const nome = baixar ? `${a.titulo}.${a.caminho.split('.').pop()}` : undefined;
      const url = await linkPrivado(a.caminho, 60, nome);
      window.open(url, '_blank', 'noopener');
    } catch (err: any) {
      avisar(`Não abriu: ${err.message}`, true);
    }
  }

  // Link para mandar ao cliente. Arquivo: vale 7 dias. Link: o próprio link.
  async function copiarLink(a: Arquivo) {
    try {
      const url = a.tipo === 'link' ? a.url : await linkPrivado(a.caminho, 60 * 60 * 24 * 7);
      try { await navigator.clipboard.writeText(url); } catch { prompt('Copie o link:', url); return; }
      avisar(a.tipo === 'link' ? 'Link copiado' : 'Link copiado (vale por 7 dias)');
    } catch (err: any) {
      avisar(err.message, true);
    }
  }

  async function salvarEdicao(a: Arquivo) {
    const { error } = await supabase().from('arquivos_privados')
      .update({ titulo: a.titulo, pasta: a.pasta || 'Geral', observacao: a.observacao, url: a.url }).eq('id', a.id);
    if (error) return avisar(error.message, true);
    setEditando(null);
    avisar('Salvo');
  }

  async function favoritar(a: Arquivo) {
    const { error } = await supabase().from('arquivos_privados').update({ favorito: !a.favorito }).eq('id', a.id);
    if (error) return avisar(error.message, true);
    setLista((l) => l.map((x) => (x.id === a.id ? { ...x, favorito: !a.favorito } : x)));
  }

  async function excluir(a: Arquivo) {
    if (!confirm(`Excluir "${a.titulo}"? ${a.tipo === 'arquivo' ? 'O arquivo será apagado de vez.' : ''}`)) return;
    if (a.tipo === 'arquivo') await apagarPrivado(a.caminho);
    const { error } = await supabase().from('arquivos_privados').delete().eq('id', a.id);
    if (error) return avisar(error.message, true);
    setLista((l) => l.filter((x) => x.id !== a.id));
    avisar('Excluído');
  }

  function alterar(id: number, campo: keyof Arquivo, valor: string) {
    setLista((l) => l.map((x) => (x.id === id ? { ...x, [campo]: valor } : x)));
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Meus arquivos</h2>
        <p className="adm-sub">Sua pasta particular: modelos, PDFs prontos e links do Drive. Nada daqui aparece no site.</p>
      </div>

      <div className="adm-linha">
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar arquivo, pasta ou anotação…" aria-label="Buscar arquivo" style={{ flex: 1, minWidth: 200 }} />
        <button className="adm-btn pri" onClick={() => setFormAberto(!formAberto)}>{formAberto ? 'Fechar' : '+ Adicionar'}</button>
      </div>

      {formAberto && (
        <form className="adm-item" onSubmit={adicionar}>
          <div className="adm-linha">
            <button type="button" className={`adm-btn peq${modo === 'arquivo' ? ' pri' : ''}`} onClick={() => setModo('arquivo')}>Enviar arquivo</button>
            <button type="button" className={`adm-btn peq${modo === 'link' ? ' pri' : ''}`} onClick={() => setModo('link')}>Salvar link (Drive, site…)</button>
          </div>
          <div className="adm-grade">
            <label>Título{modo === 'arquivo' && ' (opcional)'}<input name="titulo" required={modo === 'link'} placeholder="Ex.: Modelo de procuração" /></label>
            <label>
              Pasta
              <input name="pasta" list="pastas-existentes" defaultValue={pasta !== 'Todas' && pasta !== '★ Favoritos' ? pasta : ''} placeholder="Ex.: Modelos, Clientes, Diligências" />
              <datalist id="pastas-existentes">{pastas.map((p) => <option key={p} value={p} />)}</datalist>
            </label>
            {modo === 'link' ? (
              <label style={{ gridColumn: '1 / -1' }}>Link<input name="url" required inputMode="url" placeholder="https://drive.google.com/..." /></label>
            ) : (
              <label style={{ gridColumn: '1 / -1' }}>Arquivos (pode escolher vários, até {LIMITE_MB} MB cada)<input name="arquivo" type="file" multiple required /></label>
            )}
            <label style={{ gridColumn: '1 / -1' }}>Anotação (opcional)<input name="observacao" placeholder="Ex.: usar para o escritório Silva" /></label>
            <label className="adm-check"><input name="favorito" type="checkbox" /> Favorito (aparece primeiro)</label>
          </div>
          <div><button className="adm-btn pri" type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button></div>
        </form>
      )}

      {pastas.length > 0 && (
        <div className="adm-linha">
          {['Todas', '★ Favoritos', ...pastas].map((p) => (
            <button key={p} className={`adm-btn peq${pasta === p ? ' pri' : ''}`} onClick={() => setPasta(p)}>
              {p}{p !== 'Todas' && p !== '★ Favoritos' ? ` (${lista.filter((a) => (a.pasta || 'Geral') === p).length})` : ''}
            </button>
          ))}
        </div>
      )}

      {carregando && <p className="adm-sub">Carregando…</p>}
      {!carregando && visiveis.length === 0 && (
        <p className="adm-sub">{lista.length === 0 ? 'Nenhum arquivo ainda. Clique em “+ Adicionar”.' : 'Nada encontrado com essa busca.'}</p>
      )}

      <div className="adm-lista">
        {visiveis.map((a) => (
          <div key={a.id} className="adm-item arq">
            <div className="arq-linha">
              <span className="arq-tipo">{extensao(a)}</span>
              {editando === a.id ? (
                <div className="adm-grade" style={{ flex: 1 }}>
                  <label>Título<input value={a.titulo} onChange={(e) => alterar(a.id, 'titulo', e.target.value)} /></label>
                  <label>Pasta<input value={a.pasta} list="pastas-existentes" onChange={(e) => alterar(a.id, 'pasta', e.target.value)} /></label>
                  {a.tipo === 'link' && <label style={{ gridColumn: '1 / -1' }}>Link<input value={a.url} onChange={(e) => alterar(a.id, 'url', e.target.value)} /></label>}
                  <label style={{ gridColumn: '1 / -1' }}>Anotação<input value={a.observacao} onChange={(e) => alterar(a.id, 'observacao', e.target.value)} /></label>
                </div>
              ) : (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong className="arq-titulo">{a.titulo}</strong>
                  <div className="adm-dica" style={{ margin: 0 }}>
                    {a.pasta || 'Geral'} · {new Date(a.criado_em).toLocaleDateString('pt-BR')}{a.tamanho ? ` · ${tamanhoBonito(a.tamanho)}` : ''}
                  </div>
                  {a.observacao && <div style={{ fontSize: '0.88rem', marginTop: 4 }}>{a.observacao}</div>}
                </div>
              )}
              <button className="adm-btn peq" onClick={() => favoritar(a)} aria-label={a.favorito ? 'Tirar dos favoritos' : 'Favoritar'} title="Favorito" style={{ color: a.favorito ? '#a8894e' : undefined }}>
                {a.favorito ? '★' : '☆'}
              </button>
            </div>
            <div className="adm-linha">
              {editando === a.id ? (
                <>
                  <button className="adm-btn pri peq" onClick={() => salvarEdicao(a)}>Salvar</button>
                  <button className="adm-btn peq" onClick={() => { setEditando(null); carregar(); }}>Cancelar</button>
                </>
              ) : (
                <>
                  <button className="adm-btn pri peq" onClick={() => abrir(a)}>Abrir</button>
                  {a.tipo === 'arquivo' && <button className="adm-btn peq" onClick={() => abrir(a, true)}>Baixar</button>}
                  <button className="adm-btn peq" onClick={() => copiarLink(a)}>Copiar link</button>
                  <button className="adm-btn peq" onClick={() => setEditando(a.id)}>Editar</button>
                  <button className="adm-btn peq perigo" onClick={() => excluir(a)}>Excluir</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
