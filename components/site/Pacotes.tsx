'use client';
// Pacotes mensais de horas + pacote teste.
import type { Dados } from '@/lib/tipos';
import { MSG_PACOTE_PADRAO, linhas, linkWhats, preencher } from '@/lib/util';
import type { Pacote } from '@/lib/tipos';
import { registrar } from '@/lib/estatisticas';

export default function Pacotes({ dados }: { dados: Dados }) {
  const c = dados.config;
  const mensais = dados.pacotes.filter((p) => p.grupo === 'mensal');
  const teste = dados.pacotes.find((p) => p.grupo === 'teste');
  if (mensais.length === 0 && !teste) return null;
  const linkPacote = (p: Pacote) => linkWhats(c.whatsapp, preencher(c.mensagem_pacote || MSG_PACOTE_PADRAO, { pacote: p.nome.toLowerCase().startsWith('pacote') ? p.nome : `pacote ${p.nome}`, horas: p.horas, preco: p.preco }));

  return (
    <section id="pacotes" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>{c.titulo_pacotes || 'Pacotes mensais'}</h2>
          <p>{c.sub_pacotes || 'Horas fixas por mês, com prioridade no atendimento.'}</p>
        </div>

        {mensais.length > 0 && (
          <div className="pacotes">
            {mensais.map((p) => (
              <div key={p.id} className={`pacote${p.destaque ? ' destaque' : ''}`}>
                {p.destaque && <span className="selo">Mais procurado</span>}
                <h3>{p.nome}</h3>
                <div className="publico">{p.publico}</div>
                <div className="horas">{p.horas}</div>
                <div className="valor">{p.preco}</div>
                <a
                  className={`btn-pacote${p.destaque ? ' cheio' : ''}`}
                  href={linkPacote(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => registrar('whatsapp', false, `Pacote ${p.nome}`)}
                >
                  Quero este
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="pacotes-rodape">
          <ul className="regras">
            {linhas(c.regras_pacotes).map((r) => <li key={r}>{r}</li>)}
          </ul>
          {teste && (
            <div className="teste">
              <div>
                <div><strong className="teste-rotulo">{c.rotulo_teste || 'Experimente'}:</strong> {teste.nome.toLowerCase()} de {teste.horas}</div>
                <strong className="teste-preco">{teste.preco}</strong>
              </div>
              <a
                className="btn btn-navy"
                href={linkPacote(teste)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => registrar('whatsapp', false, teste.nome)}
              >
                Quero testar
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
