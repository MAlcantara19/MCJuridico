'use client';
// Modelos e documentos (PDFs) que ela sobe pelo painel.
import { useEffect, useState } from 'react';
import type { Documento } from '@/lib/tipos';
import { IconeFechar } from './Icones';

function podeVer(url: string) {
  return /\.(pdf|png|jpe?g|webp|gif)$/i.test((url || '').split('?')[0]);
}

function extensao(url: string) {
  const ext = (url.split('?')[0].split('.').pop() || '').toUpperCase();
  return ext.length <= 4 ? ext : 'ARQ';
}

export default function Documentos({ documentos }: { documentos: Documento[] }) {
  const pastas = Array.from(new Set(documentos.map((d) => d.pasta || 'Geral')));
  const [pasta, setPasta] = useState<string>('Todas');
  const [aberto, setAberto] = useState<Documento | null>(null);
  // Fecha a visualização com a tecla Esc
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(null); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto]);

  // No celular o PDF abre direto (o visualizador embutido não funciona bem em telas pequenas)
  function visualizar(d: Documento) {
    if (window.innerWidth < 700) window.open(d.arquivo_url, '_blank', 'noopener');
    else setAberto(d);
  }

  const lista = pasta === 'Todas' ? documentos : documentos.filter((d) => (d.pasta || 'Geral') === pasta);

  return (
    <section id="documentos" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Modelos e documentos</h2>
          <p>Exemplos de trabalhos, modelos e formulários. Clique para visualizar ou baixar.</p>
        </div>

        {pastas.length > 1 && (
          <div className="filtros" role="tablist" aria-label="Pastas">
            {['Todas', ...pastas].map((p) => (
              <button key={p} role="tab" className="aba" aria-selected={p === pasta} onClick={() => setPasta(p)}>{p}</button>
            ))}
          </div>
        )}

        <ul className="docs">
          {lista.map((d) => (
            <li key={d.id} className="doc">
              <span className="doc-icone" aria-hidden="true">{extensao(d.arquivo_url)}</span>
              <div>
                <h3>{d.titulo}</h3>
                {d.descricao && <p>{d.descricao}</p>}
              </div>
              <div className="doc-acoes">
                {podeVer(d.arquivo_url) && <button className="btn-peq" onClick={() => visualizar(d)}>Visualizar</button>}
                <a className="btn-peq" href={d.arquivo_url} target="_blank" rel="noopener noreferrer" download>Baixar</a>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {aberto && (
        <div className="modal-fundo" onClick={() => setAberto(null)} role="dialog" aria-modal="true" aria-label={aberto.titulo}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-topo">
              <strong>{aberto.titulo}</strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <a className="btn-peq" href={aberto.arquivo_url} target="_blank" rel="noopener noreferrer">Abrir em nova aba</a>
                <button className="icone-btn escuro" onClick={() => setAberto(null)} aria-label="Fechar"><IconeFechar /></button>
              </div>
            </div>
            {/\.(png|jpe?g|webp|gif)$/i.test(aberto.arquivo_url.split('?')[0]) ? (
              <div style={{ flex: 1, overflow: 'auto', display: 'grid', placeItems: 'center' }}>
                <img src={aberto.arquivo_url} alt={aberto.titulo} />
              </div>
            ) : (
              <iframe src={aberto.arquivo_url} title={aberto.titulo} />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
