'use client';
// Pacotes mensais de horas + pacote teste.
import type { Dados } from '@/lib/tipos';
import { linhas, linkWhats } from '@/lib/util';
import { registrar } from '@/lib/estatisticas';

export default function Pacotes({ dados }: { dados: Dados }) {
  const c = dados.config;
  const mensais = dados.pacotes.filter((p) => p.grupo === 'mensal');
  const teste = dados.pacotes.find((p) => p.grupo === 'teste');
  if (mensais.length === 0 && !teste) return null;

  return (
    <section id="pacotes" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Pacotes mensais</h2>
          <p>Horas fixas por mês, com prioridade no atendimento.</p>
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
                <div style={{ fontWeight: 600 }}>{teste.nome} · {teste.horas}</div>
                <strong>{teste.preco}</strong>
              </div>
              <a
                className="btn btn-navy"
                href={linkWhats(c.whatsapp, `Olá, Maria Carolina! Quero experimentar o ${teste.nome} (${teste.horas}).`)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => registrar('whatsapp')}
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
