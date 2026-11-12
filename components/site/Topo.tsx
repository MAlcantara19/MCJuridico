'use client';
// Apresentação logo no início da página.
// Layout, moldura da imagem, ajuste e efeito de fundo são escolhidos no painel (Visual e layout).
import type { Config } from '@/lib/tipos';
import { iniciais, linhas, linkWhats } from '@/lib/util';
import { IconeWhats } from './Icones';
import { registrar } from '@/lib/estatisticas';

export default function Topo({ config: c }: { config: Config }) {
  const layout = c.hero_layout || 'com_foto';
  const temImagem = layout !== 'classico';
  const moldura = c.hero_moldura || 'quadrado';
  const ajuste = c.hero_ajuste || 'cobrir';
  const efeito = c.hero_efeito || 'nenhum';
  const fundoComFoto = layout === 'fundo' && c.foto_url;

  const imagem = c.foto_url ? (
    <img src={c.foto_url} alt={`Imagem de ${c.nome}`} />
  ) : (
    <span className="topo-mono" aria-hidden="true">{iniciais(c.nome)}</span>
  );

  return (
    <section
      id="inicio"
      className={`topo topo-${layout} efeito-${efeito}${c.animacoes === false ? '' : ' animado'}`}
    >
      {fundoComFoto && <div className="topo-foto-fundo" style={{ ['--foto-fundo' as string]: `url("${c.foto_url}")` }} aria-hidden="true" />}
      {efeito !== 'nenhum' && <div className="topo-efeito" aria-hidden="true" />}
      <div className="conteiner topo-inner">
        <div className="topo-texto">
          <p className="topo-profissao entrada">{c.profissao}</p>
          <h1 className="topo-nome entrada entrada-2">{c.nome}</h1>
          <p className="topo-desc entrada entrada-3">{c.descricao_hero}</p>
          <div className="topo-acoes entrada entrada-3">
            <a className="btn btn-ouro" href={linkWhats(c.whatsapp, c.mensagem_whatsapp)} target="_blank" rel="noopener noreferrer" onClick={() => registrar('whatsapp', false, 'Topo do site')}>
              <IconeWhats tamanho={18} /> Conversar no WhatsApp
            </a>
            <a className="btn btn-linha" href="#servicos">Ver serviços</a>
          </div>
          <ul className="topo-fatos">
            {linhas(c.destaques).map((d) => <li key={d}>{d}</li>)}
          </ul>
        </div>

        {temImagem && layout !== 'fundo' && (
          <div className={`topo-midia moldura-${moldura} ajuste-${ajuste} entrada entrada-2`}>
            <div className="topo-midia-dentro">{imagem}</div>
          </div>
        )}
      </div>
    </section>
  );
}
