'use client';
// Serviços remotos, separados por categoria (abas) em formato de tabela de preços.
import { useState } from 'react';
import type { Config, Dados, Servico } from '@/lib/tipos';
import { registrar } from '@/lib/estatisticas';
import { IconeArea, IconeBusca, IconeWhats } from './Icones';
import { MSG_SERVICO_PADRAO, combina, linkWhats, preencher } from '@/lib/util';

// Lista de preços: cada linha abre o WhatsApp já com o nome do serviço na mensagem.
export function linkServico(c: Config, s: Servico, area?: string) {
  return linkWhats(c.whatsapp, preencher(c.mensagem_servico || MSG_SERVICO_PADRAO, { servico: s.nome, preco: s.preco, area }));
}

export function ListaPrecos({ servicos, config, area }: { servicos: Servico[]; config: Config; area?: string }) {
  return (
    <ul className="lista-precos">
      {servicos.map((s) => {
        const conteudo = (
          <>
            <span className="nome">{s.nome}</span>
            <span className="pontilhado" aria-hidden="true" />
            <span className="preco">{s.preco}</span>
          </>
        );
        // "incluso" não é um serviço para contratar sozinho
        if (/inclus/i.test(s.preco)) return <li key={s.id}><span className="linha-servico">{conteudo}</span></li>;
        return (
          <li key={s.id}>
            <a
              className="linha-servico"
              href={linkServico(config, s, area)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => registrar('whatsapp', false, s.nome)}
              title="Pedir este serviço pelo WhatsApp"
            >
              {conteudo}
              <span className="linha-whats" aria-hidden="true"><IconeWhats tamanho={16} /></span>
              <span className="sr-only"> (pedir pelo WhatsApp)</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export default function Servicos({ dados }: { dados: Dados }) {
  const categorias = dados.categorias.filter((c) => c.modalidade !== 'presencial');
  const [abaId, setAbaId] = useState<number | undefined>(categorias[0]?.id);
  const [busca, setBusca] = useState('');
  const atual = categorias.find((c) => c.id === abaId) ?? categorias[0];
  if (!atual) return null;
  const lista = dados.servicos.filter((s) => s.categoria_id === atual.id);

  // Busca em todos os serviços (remotos e presenciais), sem acento e sem maiúscula
  const termo = busca.trim();
  const nomeArea = (id: number | null) => dados.categorias.find((c) => c.id === id);
  const resultados = termo
    ? dados.servicos.filter((s) => combina(`${s.nome} ${nomeArea(s.categoria_id)?.nome ?? ''}`, termo))
    : [];

  return (
    <section id="servicos" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>{dados.config.titulo_servicos || 'Serviços'}</h2>
          <p>{dados.config.sub_servicos || 'Atendimento 100% remoto para todo o Brasil.'}</p>
        </div>

        <label className="busca">
          <IconeBusca />
          <input
            id="busca-servicos"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar serviço (ex.: certidão, PDF, protocolo)"
            aria-label="Buscar serviço"
          />
        </label>

        {termo && (
          <div className="busca-resultados" aria-live="polite">
            {resultados.length > 0 ? (
              <>
                {resultados.map((s) => (
                  <ListaPrecos key={s.id} servicos={[s]} config={dados.config} area={nomeArea(s.categoria_id)?.nome} />
                ))}
                <p className="nota" style={{ marginTop: 10 }}>Toque no serviço para pedir pelo WhatsApp.</p>
              </>
            ) : (
              <p className="nota">
                Nenhum serviço com “{busca}”.{' '}
                <a href={linkWhats(dados.config.whatsapp, `Olá, Maria Carolina! Vocês fazem ${busca}?`)} target="_blank" rel="noopener noreferrer">Pergunte no WhatsApp</a>: muita coisa é feita sob consulta.
              </p>
            )}
          </div>
        )}

        {!termo && (<>
        <div className="abas" role="tablist" aria-label="Áreas de serviço">
          {categorias.map((c) => (
            <button
              key={c.id}
              role="tab"
              className="aba"
              aria-selected={c.id === atual.id}
              aria-controls="painel-servicos"
              onClick={() => setAbaId(c.id)}
            >
              <IconeArea nome={c.icone} tamanho={18} /> {c.nome}
            </button>
          ))}
        </div>

        <div className="painel-servicos" id="painel-servicos" role="tabpanel">
          <div>
            <span className="area-icone"><IconeArea nome={atual.icone} tamanho={30} /></span>
            <h3>{atual.nome}</h3>
            <p className="descricao">{atual.descricao}</p>
            {dados.config.nota_servicos && <p className="nota">{dados.config.nota_servicos}</p>}
            <p className="nota dica-toque"><IconeWhats tamanho={14} /> Toque em um serviço para pedir pelo WhatsApp.</p>
          </div>
          <ListaPrecos servicos={lista} config={dados.config} area={atual.nome} />
        </div>
        </>)}
      </div>
    </section>
  );
}
