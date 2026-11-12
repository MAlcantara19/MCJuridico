'use client';
// Cores, fonte, tema, layout do topo, logo, foto e ordem das seções.
import { useState } from 'react';
import type { Config, Secao } from '@/lib/tipos';
import { NOMES_SECOES, juntarSecoes } from '@/lib/tipos';
import { enviarArquivo } from '@/lib/arquivos';
import Topo from '@/components/site/Topo';
import { estiloMarca } from '@/components/site/PaginaSimples';

const FONTES = ['Cormorant Garamond', 'Playfair Display', 'Libre Baskerville', 'Marcellus'];

// Combinações prontas (cor principal + destaque)
const PALETAS = [
  { nome: 'Marinho e dourado', p: '#0E1B33', d: '#A8894E' },
  { nome: 'Azul real e prata', p: '#13294B', d: '#9AA5B8' },
  { nome: 'Petróleo e champanhe', p: '#0F2A36', d: '#B79B6C' },
  { nome: 'Preto e dourado', p: '#111318', d: '#A8894E' },
];

export default function AbaVisual({ config, salvar, avisar }: {
  config: Config;
  salvar: (p: Partial<Config>) => Promise<void>;
  avisar: (m: string, e?: boolean) => void;
}) {
  const [v, setV] = useState({
    cor_primaria: config.cor_primaria || '#0E1B33',
    cor_destaque: config.cor_destaque || '#A8894E',
    fonte_titulo: config.fonte_titulo || FONTES[0],
    tema_padrao: config.tema_padrao || 'claro',
    hero_layout: config.hero_layout || 'com_foto',
    hero_moldura: config.hero_moldura || 'quadrado',
    hero_ajuste: config.hero_ajuste || 'cobrir',
    hero_efeito: config.hero_efeito || 'brilho',
    animacoes: config.animacoes !== false,
    logo_url: config.logo_url || '',
    foto_url: config.foto_url || '',
  });
  // Garante que seções novas apareçam mesmo em bancos antigos
  const [secoes, setSecoes] = useState<Secao[]>(juntarSecoes(config.secoes));
  const [enviando, setEnviando] = useState('');

  function mudar(campo: string, valor: string | boolean) { setV((x) => ({ ...x, [campo]: valor })); }

  async function subirImagem(campo: 'logo_url' | 'foto_url', arquivo?: File) {
    if (!arquivo) return;
    if (arquivo.size > 5 * 1024 * 1024) return avisar('Imagem maior que 5 MB. Reduza antes de enviar.', true);
    try {
      setEnviando(campo);
      const { url } = await enviarArquivo(arquivo, 'imagens');
      mudar(campo, url);
      avisar('Imagem enviada. Clique em Salvar visual.');
    } catch (e: any) {
      avisar(`Erro no envio: ${e.message}`, true);
    } finally {
      setEnviando('');
    }
  }

  function moverSecao(i: number, d: -1 | 1) {
    const n = [...secoes];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    setSecoes(n);
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Visual e layout</h2>
        <p className="adm-sub">Mude cores, fonte, tema e a ordem das partes do site. Depois clique em Salvar visual.</p>
      </div>

      <div className="adm-item">
        <h3>Cores</h3>
        <div className="adm-linha">
          {PALETAS.map((p) => (
            <button key={p.nome} className="adm-btn peq" onClick={() => setV((x) => ({ ...x, cor_primaria: p.p, cor_destaque: p.d }))}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: p.p, display: 'inline-block' }} />
              <span style={{ width: 14, height: 14, borderRadius: 4, background: p.d, display: 'inline-block' }} />
              {p.nome}
            </button>
          ))}
        </div>
        <div className="adm-grade">
          <label>Cor principal<input type="color" value={v.cor_primaria} onChange={(e) => mudar('cor_primaria', e.target.value)} /></label>
          <label>Cor de destaque<input type="color" value={v.cor_destaque} onChange={(e) => mudar('cor_destaque', e.target.value)} /></label>
        </div>
      </div>

      <div className="adm-item">
        <h3>Estilo</h3>
        <div className="adm-grade">
          <label>
            Fonte dos títulos
            <select value={v.fonte_titulo} onChange={(e) => mudar('fonte_titulo', e.target.value)} style={{ fontFamily: v.fonte_titulo }}>
              {FONTES.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            </select>
          </label>
          <label>
            Tema ao abrir o site
            <select value={v.tema_padrao} onChange={(e) => mudar('tema_padrao', e.target.value)}>
              <option value="claro">Claro</option>
              <option value="escuro">Escuro</option>
              <option value="auto">Automático (igual ao celular)</option>
            </select>
          </label>
        </div>
        <p style={{ fontFamily: v.fonte_titulo, fontSize: '2rem', margin: '4px 0 0', color: v.cor_primaria }}>{config.nome}</p>
      </div>

      <div className="adm-item">
        <h3>Apresentação (topo do site)</h3>
        <div className="adm-grade">
          <label>
            Formato
            <select value={v.hero_layout} onChange={(e) => mudar('hero_layout', e.target.value)}>
              <option value="com_foto">Imagem à direita</option>
              <option value="foto_esquerda">Imagem à esquerda</option>
              <option value="centro_com_imagem">Centralizado com imagem em cima</option>
              <option value="fundo">Imagem no fundo (tela cheia)</option>
              <option value="classico">Centralizado só com texto</option>
            </select>
          </label>
          <label>
            Moldura da imagem
            <select value={v.hero_moldura} onChange={(e) => mudar('hero_moldura', e.target.value)} disabled={v.hero_layout === 'fundo' || v.hero_layout === 'classico'}>
              <option value="livre">Sem moldura (ideal para logo)</option>
              <option value="quadrado">Quadrado com contorno dourado</option>
              <option value="retrato">Retrato (vertical) com contorno</option>
              <option value="circulo">Círculo com anel dourado</option>
              <option value="arco">Arco</option>
            </select>
          </label>
          <label>
            Ajuste da imagem
            <select value={v.hero_ajuste} onChange={(e) => mudar('hero_ajuste', e.target.value)}>
              <option value="cobrir">Preencher (corta as bordas, bom para foto)</option>
              <option value="conter">Mostrar inteira (bom para logo)</option>
            </select>
          </label>
          <label>
            Efeito de fundo
            <select value={v.hero_efeito} onChange={(e) => mudar('hero_efeito', e.target.value)}>
              <option value="nenhum">Nenhum</option>
              <option value="brilho">Brilho dourado suave</option>
              <option value="grade">Grade fina</option>
              <option value="pontos">Pontilhado</option>
              <option value="linhas">Linhas diagonais</option>
            </select>
          </label>
          <label className="adm-check"><input type="checkbox" checked={v.animacoes} onChange={(e) => mudar('animacoes', e.target.checked)} /> Animações suaves (imagem flutuando e seções aparecendo ao rolar)</label>
        </div>
        <p className="adm-dica">Prévia (muda na hora; só vai para o site quando clicar em Salvar visual):</p>
        <div className="previa-topo">
          <div className="site" style={estiloMarca({ ...config, ...v } as Config)}>
            <Topo config={{ ...config, ...v } as Config} />
          </div>
        </div>
      </div>

      <div className="adm-item">
        <h3>Logo e foto</h3>
        <div className="adm-grade">
          <div style={{ display: 'grid', gap: 8 }}>
            <strong style={{ fontSize: '0.85rem' }}>Logo (quadrada, 512×512)</strong>
            {v.logo_url && <img src={v.logo_url} alt="Logo" className="adm-img" />}
            <input type="file" accept="image/*" onChange={(e) => subirImagem('logo_url', e.target.files?.[0])} />
            {enviando === 'logo_url' && <span className="adm-dica">Enviando…</span>}
            {v.logo_url && <button className="adm-btn peq perigo" onClick={() => mudar('logo_url', '')}>Remover logo</button>}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <strong style={{ fontSize: '0.85rem' }}>Imagem do topo (foto ou logo)</strong>
            {v.foto_url && <img src={v.foto_url} alt="Foto" className="adm-img" style={{ borderRadius: '44px 44px 6px 6px', height: 110 }} />}
            <input type="file" accept="image/*" onChange={(e) => subirImagem('foto_url', e.target.files?.[0])} />
            {enviando === 'foto_url' && <span className="adm-dica">Enviando…</span>}
            {v.foto_url && <button className="adm-btn peq perigo" onClick={() => mudar('foto_url', '')}>Remover foto</button>}
          </div>
        </div>
        <p className="adm-dica">Sem logo, aparecem as iniciais. Sem foto, o arco mostra as iniciais.</p>
      </div>

      <div className="adm-item">
        <h3>Partes do site (ordem e visibilidade)</h3>
        <div className="adm-secoes">
          {secoes.map((s, i) => (
            <div key={s.id} className="adm-secao">
              <input
                type="checkbox"
                checked={s.visivel}
                aria-label={`Mostrar ${NOMES_SECOES[s.id]}`}
                onChange={(e) => setSecoes(secoes.map((x) => (x.id === s.id ? { ...x, visivel: e.target.checked } : x)))}
                style={{ width: 20, height: 20 }}
              />
              <span style={{ opacity: s.visivel ? 1 : 0.5 }}>{NOMES_SECOES[s.id] || s.id}</span>
              <button className="adm-btn peq" onClick={() => moverSecao(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
              <button className="adm-btn peq" onClick={() => moverSecao(i, 1)} disabled={i === secoes.length - 1} aria-label="Descer">↓</button>
            </div>
          ))}
        </div>
      </div>

      <div><button className="adm-btn pri" onClick={() => salvar({ ...(v as Partial<Config>), secoes })}>Salvar visual</button></div>
    </div>
  );
}
