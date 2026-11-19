// Página "Para escritórios": feita para advogados de outras cidades que contratam correspondente.
import type { Metadata } from 'next';
import Link from 'next/link';
import { carregarDados } from '@/lib/dados';
import { linhas } from '@/lib/util';
import { emojiArea } from '@/lib/mensagens';
import PaginaSimples from '@/components/site/PaginaSimples';
import FormEscritorio from '@/components/site/FormEscritorio';
import { ListaPrecos } from '@/components/site/Servicos';
import MapaComarcas from '@/components/site/MapaComarcas';
import Depoimentos from '@/components/site/Depoimentos';
import { slugCidade } from '@/lib/cidades';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const d = await carregarDados();
  const c = d?.config;
  return {
    title: `Correspondente jurídica em Três Rios e Paraíba do Sul (RJ) · ${c?.marca || 'MC Jurídico'}`,
    description: 'Diligências, protocolos, cópias, certidões e preposto em Três Rios e Paraíba do Sul (RJ), com relatório e fotos. Para escritórios de qualquer cidade.',
    alternates: { canonical: '/escritorios' },
  };
}

const PASSOS = [
  { titulo: 'Você envia a demanda', texto: 'Pelo WhatsApp ou pelo formulário: processo, comarca, o que precisa e o prazo.' },
  { titulo: 'Confirmo valor e prazo', texto: 'Resposta rápida, com orçamento fechado antes de começar.' },
  { titulo: 'Faço a diligência', texto: 'No fórum, cartório ou audiência, no dia combinado.' },
  { titulo: 'Você recebe o relatório', texto: 'Relatório em PDF com fotos, data, hora e resultado. Incluso no valor.' },
];

const MOTIVOS = [
  { emoji: '📸', titulo: 'Relatório com fotos', texto: 'Cada diligência vem documentada, pronta para juntar ou arquivar.' },
  { emoji: '⏱️', titulo: 'Prazos levados a sério', texto: 'Agenda com controle de prazos e aviso quando algo depende de você.' },
  { emoji: '📍', titulo: 'Quem conhece a comarca', texto: 'Atuação diária nos fóruns e cartórios de Três Rios e Paraíba do Sul.' },
  { emoji: '🔒', titulo: 'Sigilo e organização', texto: 'Documentos tratados com sigilo e área exclusiva para acompanhar seus pedidos.' },
];

export default async function Escritorios() {
  const d = await carregarDados();
  if (!d) return null;
  const c = d.config;
  const presenciais = d.categorias.filter((k) => k.modalidade === 'presencial');
  const ids = presenciais.map((k) => k.id);
  const servicos = d.servicos.filter((s) => s.categoria_id !== null && ids.includes(s.categoria_id));
  const pacote = d.pacotes.find((p) => p.grupo === 'correspondente');
  const juridicos = d.categorias.filter((k) => k.modalidade !== 'presencial' && /jur/i.test(k.nome));
  const remotos = d.servicos.filter((s) => juridicos.some((k) => k.id === s.categoria_id)).slice(0, 6);
  // Avaliações aprovadas com nota alta aparecem sozinhas aqui (as mais recentes primeiro)
  const avaliacoes = d.depoimentos.filter((x) => (x.nota ?? 0) >= 4)
    .sort((a, b) => (b.nota ?? 0) - (a.nota ?? 0) || String(b.criado_em ?? '').localeCompare(String(a.criado_em ?? ''))).slice(0, 6);

  return (
    <PaginaSimples config={c} classe={`estilo-${c.tema_estilo || 'classico'}`}>
      <header className="esc-topo">
        <div className="conteiner">
          <Link href="/" className="esc-voltar">← {c.marca || c.nome}</Link>
          <p className="topo-profissao">Para escritórios de advocacia</p>
          <h1>Correspondente jurídica em Três Rios e Paraíba do Sul (RJ)</h1>
          <p className="esc-sub">Seu escritório fica em outra cidade? Eu faço as diligências presenciais por você, com relatório e fotos de cada uma.</p>
          <div className="topo-acoes">
            <a className="btn btn-ouro" href="#pedir">Pedir uma diligência</a>
            <a className="btn btn-linha" href="#valores">Ver valores</a>
            {!!d.comarcas?.length && c.mostrar_mapa !== false && <a className="btn btn-linha" href="#comarcas">Ver comarcas no mapa</a>}
          </div>
          <ul className="topo-fatos">
            {linhas(c.area_atendimento).map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>
      </header>

      <section className="secao">
        <div className="conteiner">
          <div className="esc-motivos">
            {MOTIVOS.map((m) => (
              <div key={m.titulo} className="esc-motivo">
                <span aria-hidden="true">{m.emoji}</span>
                <h3>{m.titulo}</h3>
                <p>{m.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="valores" className="secao secao-sup">
        <div className="conteiner">
          <div className="secao-cabeca">
            <hr className="filete" />
            <h2>Diligências e valores</h2>
            <p>Toque em um serviço para pedir pelo WhatsApp.</p>
          </div>
          <div className="corresp">
            <div>
              <ListaPrecos servicos={servicos} config={c} area={presenciais[0]?.nome} emoji={emojiArea(presenciais[0])} />
              {linhas(c.observacoes_correspondente).map((o) => <p key={o} className="nota" style={{ margin: '14px 0 0' }}>{o}</p>)}
            </div>
            {pacote && (
              <aside className="cartao-pacote">
                <h3>{pacote.nome}</h3>
                <p>{pacote.publico}</p>
                <div className="valor">{pacote.preco}</div>
                <div className="por">{pacote.horas}</div>
                <a className="btn btn-ouro" style={{ width: '100%' }} href="#pedir">Contratar o pacote</a>
              </aside>
            )}
          </div>
          {remotos.length > 0 && (
            <>
              <h3 className="titulo-area" style={{ marginTop: 40 }}>💻 Também faço à distância</h3>
              <ListaPrecos servicos={remotos} config={c} area={juridicos[0]?.nome} emoji={emojiArea(juridicos[0])} />
            </>
          )}
        </div>
      </section>

      {!!d.comarcas?.length && c.mostrar_mapa !== false && (
        <section id="comarcas" className="secao">
          <div className="conteiner">
            <MapaComarcas comarcas={d.comarcas} config={c} />
            <p className="nota" style={{ marginTop: 18 }}>
              Páginas por cidade: {d.comarcas.map((x, i) => <span key={x.id}>{i ? ' · ' : ''}<Link href={`/advogados/${slugCidade(x.nome)}`}>{x.nome}</Link></span>)}
            </p>
          </div>
        </section>
      )}

      {avaliacoes.length > 0 && <Depoimentos depoimentos={avaliacoes} />}

      <section className="secao secao-sup">
        <div className="conteiner">
          <div className="secao-cabeca">
            <hr className="filete" />
            <h2>Como funciona</h2>
          </div>
          <ol className="passos">
            {PASSOS.map((p) => <li key={p.titulo}><h3>{p.titulo}</h3><p>{p.texto}</p></li>)}
          </ol>
        </div>
      </section>

      <section id="pedir" className="secao">
        <div className="conteiner">
          <div className="secao-cabeca">
            <hr className="filete" />
            <h2>Pedir uma diligência</h2>
            <p>Preencha e a mensagem já abre no WhatsApp, organizada para eu responder rápido.</p>
          </div>
          <FormEscritorio config={c} servicos={servicos.filter((s) => !/inclus/i.test(s.preco)).map((s) => s.nome)} pacote={pacote?.nome} comarcas={d.comarcas?.length ? d.comarcas.map((x) => `${x.nome}/${x.uf || 'RJ'}`) : undefined} />
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
