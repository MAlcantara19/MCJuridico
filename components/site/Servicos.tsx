'use client';
// Serviços remotos, separados por categoria (abas) em formato de tabela de preços.
import { useState } from 'react';
import type { Dados, Servico } from '@/lib/tipos';

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
          <h2>Serviços</h2>
          <p>Atendimento 100% online para todo o Brasil. Escolha uma área para ver os serviços e valores.</p>
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
              {c.nome}
            </button>
          ))}
        </div>

        <div className="painel-servicos" id="painel-servicos" role="tabpanel">
          <div>
            <h3>{atual.nome}</h3>
            <p className="descricao">{atual.descricao}</p>
            <p className="nota">Valores de referência. O orçamento final depende do volume e do prazo.</p>
          </div>
          <ListaPrecos servicos={lista} />
        </div>
      </div>
    </section>
  );
}
