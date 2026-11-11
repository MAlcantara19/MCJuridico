'use client';
// Apresentação logo no início da página.
import type { Config } from '@/lib/tipos';
import { iniciais, linhas, linkWhats } from '@/lib/util';
import { IconeWhats } from './Icones';
import { registrar } from '@/lib/estatisticas';

export default function Topo({ config: c }: { config: Config }) {
  const comFoto = c.hero_layout !== 'classico';
  return (
    <section id="inicio" className={`topo ${comFoto ? 'topo-com-foto' : 'topo-classico'}`}>
      <div className="conteiner topo-inner">
        <div>
          <p className="topo-profissao entrada">{c.profissao}</p>
          <h1 className="topo-nome entrada entrada-2">{c.nome}</h1>
          <p className="topo-desc entrada entrada-3">{c.descricao_hero}</p>
          <div className="topo-acoes entrada entrada-3">
            <a className="btn btn-ouro" href={linkWhats(c.whatsapp, c.mensagem_whatsapp)} target="_blank" rel="noopener noreferrer" onClick={() => registrar('whatsapp')}>
              <IconeWhats tamanho={18} /> Conversar no WhatsApp
            </a>
            <a className="btn btn-linha" href="#servicos">Ver serviços</a>
          </div>
          <ul className="topo-fatos">
            {linhas(c.destaques).map((d) => <li key={d}>{d}</li>)}
          </ul>
        </div>

        {comFoto && (
          <div className="topo-arco entrada entrada-2">
            <div className="topo-arco-dentro">
              {c.foto_url ? (
                <img src={c.foto_url} alt={`Foto de ${c.nome}`} />
              ) : (
                <span className="arco-mono" aria-hidden="true">{iniciais(c.nome)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
