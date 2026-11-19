// /advogados/<cidade>: página de cada comarca para o Google ("correspondente jurídico em Vassouras").
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { carregarDados } from '@/lib/dados';
import { URL_SITE } from '@/lib/site';
import { linkWhats } from '@/lib/util';
import { emojiArea, msgComarca } from '@/lib/mensagens';
import { brl, kmComarca, valorDeslocamento } from '@/lib/gestao';
import { acharCidade, slugCidade, ROTULO_TIPO } from '@/lib/cidades';
import PaginaSimples from '@/components/site/PaginaSimples';
import { ListaPrecos } from '@/components/site/Servicos';
import Depoimentos from '@/components/site/Depoimentos';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ cidade: string }> }): Promise<Metadata> {
  const { cidade } = await params;
  const d = await carregarDados();
  const k = acharCidade(d?.comarcas, cidade);
  if (!k) return { title: 'Cidade não encontrada', robots: { index: false } };
  const local = `${k.nome}${k.uf ? ` - ${k.uf}` : ''}`;
  return {
    title: `Correspondente jurídico em ${local} · ${d?.config.marca || 'MC Jurídico'}`,
    description: `Correspondente jurídica em ${local}: diligências, protocolos, cópias, certidões e audiências para escritórios de qualquer cidade, com relatório e fotos.`,
    alternates: { canonical: `/advogados/${slugCidade(k.nome)}` },
    openGraph: { title: `Correspondente jurídico em ${local}`, url: `${URL_SITE}/advogados/${slugCidade(k.nome)}` },
  };
}

export default async function Cidade({ params }: { params: Promise<{ cidade: string }> }) {
  const { cidade } = await params;
  const d = await carregarDados();
  if (!d) return null;
  const k = acharCidade(d.comarcas, cidade);
  if (!k) notFound();
  const c = d.config;
  const base = d.comarcas?.find((x) => x.tipo === 'base');
  const local = `${k.nome}${k.uf ? ` - ${k.uf}` : ''}`;
  const dist = base && base.id !== k.id ? kmComarca(k, base) : null;
  const desl = dist && k.tipo === 'deslocamento' ? valorDeslocamento(dist.km, c) : null;
  const presenciais = d.categorias.filter((x) => x.modalidade === 'presencial');
  const servicos = d.servicos.filter((s) => s.categoria_id !== null && presenciais.some((x) => x.id === s.categoria_id));
  const boas = d.depoimentos.filter((x) => (x.nota ?? 0) >= 4).slice(0, 6);
  const zap = linkWhats(c.whatsapp, msgComarca({ comarca: k.nome, uf: k.uf, tipo: k.tipo }));
  const outras = (d.comarcas ?? []).filter((x) => x.id !== k.id);

  const perguntas = [
    { p: `Você atende presencialmente em ${k.nome}?`, r: k.tipo === 'consulta' ? `Sim, sob consulta. Me envie o processo e o prazo pelo WhatsApp que confirmo a disponibilidade para ${k.nome}.` : `Sim. ${ROTULO_TIPO[k.tipo]} em ${k.nome}, em fóruns, cartórios e órgãos públicos.` },
    { p: 'Como recebo o resultado da diligência?', r: 'Você recebe um relatório em PDF com fotos, data, hora e o que foi feito, incluso no valor.' },
    { p: 'Há custo de deslocamento?', r: desl ? (desl.valor ? `Para ${k.nome}, o deslocamento é de ${brl(desl.valor)} (cerca de ${Math.round(desl.km)} km), somado ao valor do serviço.` : `Não, ${k.nome} está dentro da área sem custo de deslocamento.`) : k.tipo === 'base' ? `Não. ${k.nome} é a minha base de atendimento.` : 'O valor do deslocamento é informado no orçamento, antes de começar.' },
  ];
  const jsonLd = [
    {
      '@context': 'https://schema.org', '@type': 'LegalService', name: `${c.marca || c.nome} · Correspondente jurídica em ${k.nome}`,
      url: `${URL_SITE}/advogados/${slugCidade(k.nome)}`, telephone: c.whatsapp_exibicao || undefined, email: c.email || undefined,
      areaServed: { '@type': 'City', name: k.nome, ...(k.lat != null ? { geo: { '@type': 'GeoCoordinates', latitude: k.lat, longitude: k.lng } } : {}) },
      ...(base ? { address: { '@type': 'PostalAddress', addressLocality: base.nome, addressRegion: base.uf || 'RJ', addressCountry: 'BR' } } : {}),
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: perguntas.map((x) => ({ '@type': 'Question', name: x.p, acceptedAnswer: { '@type': 'Answer', text: x.r } })) },
  ];

  return (
    <PaginaSimples config={c} classe={`estilo-${c.tema_estilo || 'classico'}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <header className="esc-topo">
        <div className="conteiner">
          <Link href="/advogados" className="esc-voltar">← Todas as comarcas</Link>
          <p className="topo-profissao">Correspondente jurídica · {ROTULO_TIPO[k.tipo]}</p>
          <h1>Correspondente jurídico em {local}</h1>
          <p className="esc-sub">Diligências, protocolos, cópias, certidões e audiências em {k.nome}, para escritórios de qualquer cidade. Cada diligência vem com relatório e fotos.</p>
          <div className="topo-acoes">
            <a className="btn btn-ouro" href={zap} target="_blank" rel="noopener noreferrer">Pedir serviço em {k.nome}</a>
            <a className="btn btn-linha" href="#valores">Ver valores</a>
          </div>
          <ul className="topo-fatos">
            {dist && <li>≈ {Math.round(dist.km)} km de {base!.nome}</li>}
            {desl && <li>{desl.valor ? `Deslocamento: ${brl(desl.valor)}` : 'Sem custo de deslocamento'}</li>}
            {k.observacao && <li>{k.observacao}</li>}
          </ul>
        </div>
      </header>

      <section id="valores" className="secao">
        <div className="conteiner">
          <div className="secao-cabeca">
            <hr className="filete" />
            <h2>Serviços em {k.nome}</h2>
            <p>Toque em um serviço para pedir pelo WhatsApp.{desl?.valor ? ` Em ${k.nome}, soma-se ${brl(desl.valor)} de deslocamento.` : ''}</p>
          </div>
          <ListaPrecos servicos={servicos} config={c} area={presenciais[0]?.nome} emoji={emojiArea(presenciais[0])} />
        </div>
      </section>

      {boas.length > 0 && <Depoimentos depoimentos={boas} />}

      <section className="secao secao-sup">
        <div className="conteiner">
          <div className="secao-cabeca"><hr className="filete" /><h2>Dúvidas sobre {k.nome}</h2></div>
          <div className="cidade-perguntas">
            {perguntas.map((x) => <details key={x.p}><summary>{x.p}</summary><p>{x.r}</p></details>)}
          </div>
          {outras.length > 0 && (
            <p className="nota" style={{ marginTop: 28 }}>
              Também atendo: {outras.map((x, i) => <span key={x.id}>{i ? ', ' : ''}<Link href={`/advogados/${slugCidade(x.nome)}`}>{x.nome}</Link></span>)}.
            </p>
          )}
        </div>
      </section>

      <footer className="rodape">
        <div className="conteiner rodape-base" style={{ marginTop: 0, borderTop: 0 }}>
          <span>© {new Date().getFullYear()} {c.nome}. {c.aviso_legal}</span>
          <span><Link href="/">Site completo</Link> · <Link href="/escritorios">Para escritórios</Link></span>
        </div>
      </footer>
    </PaginaSimples>
  );
}
