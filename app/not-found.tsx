// Página de "não encontrado" (404).
import Link from 'next/link';

export default function NaoEncontrado() {
  return (
    <div className="site pagina-404" style={{ ['--navy' as string]: '#0E1B33', ['--ouro' as string]: '#A8894E', ['--fonte-titulo' as string]: "'Cormorant Garamond', Georgia, serif" }}>
      <main className="conteiner">
        <p className="topo-profissao">Erro 404</p>
        <h1>Página não encontrada</h1>
        <p>O endereço pode estar errado ou a página foi removida.</p>
        <Link className="btn btn-navy" href="/">Voltar ao início</Link>
      </main>
    </div>
  );
}
