'use client';
// Serviços remotos, separados por categoria (abas) em formato de tabela de preços.
import { useState } from 'react';
import type { Dados, Servico } from '@/lib/tipos';
import { IconeArea, IconeBusca } from './Icones';
import { combina, linkWhats } from '@/lib/util';

export function ListaPrecos({ servicos }: { servicos: Servico[] }) {
  return (
    <ul className="lista-precos">
      {servicos.map((s) => (
        <li key={s.id}>
          <span className="nome">{s.nome}</span>
          <span className="pontilhado" aria-hidden="true" />
          <span className="preco">{s.preco}</span>
        </li>
      ))}
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

  function irPara(categoriaId: number | null) {
    const cat = nomeArea(categoriaId);
    setBusca('');
    if (cat?.modalidade === 'presencial') {
      document.getElementById('correspondente')?.scrollIntoView({ behavior: 'smooth' });
    } else if (cat) {
      setAbaId(cat.id);
      document.getElementById('painel-servicos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

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
              <ul className="lista-precos">
                {resultados.map((s) => (
                  <li key={s.id}>
                    <button className="busca-item" onClick={() => irPara(s.categoria_id)}>
                      <span className="nome">{s.nome}<small>{nomeArea(s.categoria_id)?.nome}</small></span>
                    </button>
                    <span className="pontilhado" aria-hidden="true" />
                    <span className="preco">{s.preco}</span>
                  </li>
                ))}
              </ul>
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
          </div>
          <ListaPrecos servicos={lista} />
        </div>
        </>)}
      </div>
    </section>
  );
}
