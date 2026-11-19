// /advogados: todas as comarcas atendidas, com link para a página de cada cidade.
import type { Metadata } from 'next';
import Link from 'next/link';
import { carregarDados } from '@/lib/dados';
import { slugCidade, ROTULO_TIPO } from '@/lib/cidades';
import PaginaSimples from '@/components/site/PaginaSimples';
import MapaComarcas from '@/components/site/MapaComarcas';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const d = await carregarDados();
  const cidades = (d?.comarcas ?? []).map((c) => c.nome).slice(0, 6).join(', ');
  return {
    title: `Correspondente jurídico na região de Três Rios (RJ) · ${d?.config.marca || 'MC Jurídico'}`,
    description: `Diligências, protocolos, cópias, certidões e audiências para advogados em ${cidades || 'Três Rios e região'}. Relatório com fotos em cada diligência.`,
    alternates: { canonical: '/advogados' },
  };
}

export default async function Advogados() {
  const d = await carregarDados();
  if (!d) return null;
  const c = d.config;
  const comarcas = d.comarcas ?? [];
  return (
    <PaginaSimples config={c} classe={`estilo-${c.tema_estilo || 'classico'}`}>
      <header className="esc-topo">
        <div className="conteiner">
          <Link href="/escritorios" className="esc-voltar">← Para escritórios</Link>
          <p className="topo-profissao">Para advogados</p>
          <h1>Correspondente jurídico na região de Três Rios (RJ)</h1>
          <p className="esc-sub">Escolha a comarca para ver como funciona o atendimento, o deslocamento e pedir direto pelo WhatsApp.</p>
        </div>
      </header>
      <section className="secao">
        <div className="conteiner">
          <ul className="cidades-lista">
            {comarcas.map((k) => (
              <li key={k.id}>
                <Link href={`/advogados/${slugCidade(k.nome)}`}>
                  <strong>Correspondente em {k.nome}{k.uf ? ` - ${k.uf}` : ''}</strong>
                  <span>{ROTULO_TIPO[k.tipo]}</span>
                </Link>
              </li>
            ))}
          </ul>
          {comarcas.length > 0 && c.mostrar_mapa !== false && <div style={{ marginTop: 40 }}><MapaComarcas comarcas={comarcas} config={c} /></div>}
        </div>
      </section>
      <footer className="rodape">
        <div className="conteiner rodape-base" style={{ marginTop: 0, borderTop: 0 }}>
          <span>© {new Date().getFullYear()} {c.nome}. {c.aviso_legal}</span>
          <span><Link href="/">Site completo</Link> · <Link href="/privacidade">Privacidade</Link></span>
        </div>
      </footer>
    </PaginaSimples>
  );
}
