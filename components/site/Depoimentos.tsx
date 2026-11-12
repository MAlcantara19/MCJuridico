// Depoimentos de clientes (cadastrados no painel). Só aparece se houver algum.
import type { Depoimento } from '@/lib/tipos';

export default function Depoimentos({ depoimentos }: { depoimentos: Depoimento[] }) {
  return (
    <section id="depoimentos" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Quem já trabalhou comigo</h2>
        </div>
        <div className="depoimentos">
          {depoimentos.map((d) => (
            <figure key={d.id} className="depoimento">
              <span className="aspas" aria-hidden="true">“</span>
              {d.nota ? <span className="estrelas" aria-label={`Nota ${d.nota} de 5`}>{'★'.repeat(d.nota)}<span className="estrelas-vazias">{'★'.repeat(5 - d.nota)}</span></span> : null}
              <blockquote>{d.texto}</blockquote>
              <figcaption>
                <strong>{d.nome}</strong>
                {d.cargo && <span>{d.cargo}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
