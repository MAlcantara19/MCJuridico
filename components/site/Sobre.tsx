// Sobre ela + formações.
import type { Dados } from '@/lib/tipos';

export default function Sobre({ dados }: { dados: Dados }) {
  const c = dados.config;
  const paragrafos = (c.sobre_texto || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <section id="sobre" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Sobre mim</h2>
        </div>
        <div className="sobre">
          <div className="sobre-texto">
            {paragrafos.map((p) => <p key={p}>{p}</p>)}
          </div>
          {dados.formacoes.length > 0 && (
            <div>
              <h3 className="titulo-serif" style={{ fontSize: '1.7rem', color: 'var(--titulo)', margin: '0 0 24px' }}>Formação</h3>
              <ul className="formacoes">
                {dados.formacoes.map((f) => (
                  <li key={f.id}>
                    {f.ano && <span className="ano">{f.ano}</span>}
                    <h3>{f.titulo}</h3>
                    {f.instituicao && <p>{f.instituicao}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
