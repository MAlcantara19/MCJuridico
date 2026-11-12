'use client';
// Serviços presenciais (correspondente jurídica) com o pacote em destaque.
import type { Dados } from '@/lib/tipos';
import { MSG_PACOTE_PADRAO, linhas, linkWhats, preencher } from '@/lib/util';
import { registrar } from '@/lib/estatisticas';
import { ListaPrecos } from './Servicos';
import { IconeArea } from './Icones';

export default function Correspondente({ dados }: { dados: Dados }) {
  const c = dados.config;
  const cats = dados.categorias.filter((x) => x.modalidade === 'presencial');
  if (cats.length === 0) return null;
  const ids = cats.map((x) => x.id);
  const lista = dados.servicos.filter((s) => s.categoria_id !== null && ids.includes(s.categoria_id));
  const pacote = dados.pacotes.find((p) => p.grupo === 'correspondente');
  const area = linhas(c.area_atendimento);

  return (
    <section id="correspondente" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>{c.titulo_correspondente || 'Correspondente jurídica'}</h2>
          <p>{c.sub_correspondente || cats[0].descricao}</p>
        </div>

        <div className="corresp">
          <div>
            <h3 className="titulo-area"><IconeArea nome={cats[0].icone} tamanho={26} /> {cats[0].nome}</h3>
            <ListaPrecos servicos={lista} config={c} area={cats[0].nome} />
            {linhas(c.observacoes_correspondente).map((o) => (
              <p key={o} className="nota" style={{ margin: '14px 0 0' }}>{o}</p>
            ))}
            {area.length > 0 && (
              <div className="area">
                {area.map((a) => <p key={a}>{a}</p>)}
              </div>
            )}
          </div>

          {pacote && (
            <aside className="cartao-pacote">
              <h3>{pacote.nome}</h3>
              <p>{pacote.publico}</p>
              <div className="valor">{pacote.preco}</div>
              <div className="por">{pacote.horas}</div>
              <a
                className="btn btn-ouro"
                style={{ width: '100%' }}
                href={linkWhats(c.whatsapp, preencher(c.mensagem_pacote || MSG_PACOTE_PADRAO, { pacote: pacote.nome, horas: pacote.horas, preco: pacote.preco }))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => registrar('whatsapp', false, pacote.nome)}
              >
                Solicitar diligência
              </a>
            </aside>
          )}
        </div>
      </div>
    </section>
  );
}
