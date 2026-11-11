// Perguntas frequentes (as mesmas que o assistente usa).
import type { Pergunta } from '@/lib/tipos';

export default function Perguntas({ perguntas }: { perguntas: Pergunta[] }) {
  return (
    <section id="perguntas" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Dúvidas frequentes</h2>
        </div>
        <div className="faq">
          {perguntas.map((p) => (
            <details key={p.id}>
              <summary>{p.pergunta}</summary>
              <p>{p.resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
