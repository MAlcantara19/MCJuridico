'use client';
// Serviços remotos, separados por categoria (abas) em formato de tabela de preços.
import { useState } from 'react';
import type { Dados, Servico } from '@/lib/tipos';
import { IconeArea } from './Icones';

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
  const atual = categorias.find((c) => c.id === abaId) ?? categorias[0];
  if (!atual) return null;
  const lista = dados.servicos.filter((s) => s.categoria_id === atual.id);

  return (
    <section id="servicos" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>{dados.config.titulo_servicos || 'Serviços'}</h2>
          <p>{dados.config.sub_servicos || 'Atendimento 100% remoto para todo o Brasil.'}</p>
        </div>

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
      </div>
    </section>
  );
}
