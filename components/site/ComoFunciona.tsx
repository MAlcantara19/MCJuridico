// Passo a passo do atendimento. Cada linha no painel: "Título | texto".
import type { Config } from '@/lib/tipos';
import { linhas } from '@/lib/util';

export default function ComoFunciona({ config: c }: { config: Config }) {
  const passos = linhas(c.passos).map((l) => {
    const [titulo, ...resto] = l.split('|');
    return { titulo: titulo.trim(), texto: resto.join('|').trim() };
  });
  if (passos.length === 0) return null;

  return (
    <section id="como_funciona" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Como funciona</h2>
        </div>
        <ol className="passos">
          {passos.map((p) => (
            <li key={p.titulo}>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
