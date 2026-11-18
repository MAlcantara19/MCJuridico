// Página "Para empresas": pequenos negócios que precisam de ajuda no financeiro, atendimento e rotina administrativa.
import type { Metadata } from 'next';
import Link from 'next/link';
import { carregarDados } from '@/lib/dados';
import { emojiArea } from '@/lib/mensagens';
import PaginaSimples from '@/components/site/PaginaSimples';
import FormEmpresa from '@/components/site/FormEmpresa';
import { ListaPrecos } from '@/components/site/Servicos';
import Pacotes from '@/components/site/Pacotes';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const d = await carregarDados();
  const c = d?.config;
  return {
    title: `Assistente virtual para empresas · ${c?.marca || 'MC Jurídico'}`,
    description: 'Financeiro, atendimento ao cliente e rotinas administrativas para pequenos negócios, 100% online, por hora ou pacote mensal.',
    alternates: { canonical: '/empresas' },
  };
}

const DORES = [
  { emoji: '💰', titulo: 'Financeiro em dia', texto: 'Contas a pagar e receber, cobranças, conciliação e relatórios simples para você saber quanto entra e quanto sai.' },
  { emoji: '💬', titulo: 'Atendimento que não para', texto: 'Resposta a clientes no WhatsApp e e-mail, agendamentos e pós-venda, com o tom da sua empresa.' },
  { emoji: '🗂️', titulo: 'Rotina organizada', texto: 'Planilhas, cadastros, pedidos, estoque e documentos arrumados e fáceis de achar.' },
  { emoji: '⏱️', titulo: 'Você paga só o que usa', texto: 'Por hora ou pacote mensal. Sem encargos de funcionário, sem contrato longo.' },
];

const PASSOS = [
  { titulo: 'Conversa rápida', texto: 'Você conta o que toma seu tempo hoje. Sem compromisso.' },
  { titulo: 'Proposta sob medida', texto: 'Indico as horas e o pacote que fazem sentido, com valor fechado.' },
  { titulo: 'Mão na massa', texto: 'Começo com acesso só ao que for preciso, com sigilo e organização.' },
  { titulo: 'Relatório do mês', texto: 'Você acompanha o que foi feito e as horas usadas na sua área do cliente.' },
];

export default async function Empresas() {
  const d = await carregarDados();
  if (!d) return null;
  const c = d.config;
  const areas = d.categorias.filter((k) => k.modalidade !== 'presencial' && !/jur/i.test(k.nome));
  const porArea = areas.map((a) => ({ a, servicos: d.servicos.filter((s) => s.categoria_id === a.id) })).filter((x) => x.servicos.length);
  const opcoes = porArea.flatMap((x) => x.servicos.filter((s) => !/inclus/i.test(s.preco)).map((s) => s.nome));
  const mensais = d.pacotes.filter((p) => p.grupo === 'mensal' || p.grupo === 'teste').map((p) => (p.nome.toLowerCase().startsWith('pacote') ? p.nome : `Pacote ${p.nome}`));

  return (
    <PaginaSimples config={c} classe={`estilo-${c.tema_estilo || 'classico'}`}>
      <header className="esc-topo">
        <div className="conteiner">
          <Link href="/" className="esc-voltar">← {c.marca || c.nome}</Link>
          <p className="topo-profissao">Para empresas e pequenos negócios</p>
          <h1>Uma assistente para o financeiro e o atendimento da sua empresa</h1>
          <p className="esc-sub">Você cuida do negócio; eu cuido das planilhas, cobranças, clientes no WhatsApp e da papelada. 100% online, por hora ou pacote mensal.</p>
          <div className="topo-acoes">
            <a className="btn btn-ouro" href="#pedir">Quero uma proposta</a>
            <a className="btn btn-linha" href="#pacotes">Ver pacotes</a>
          </div>
        </div>
      </header>

      <section className="secao">
        <div className="conteiner">
          <div className="esc-motivos">
            {DORES.map((m) => (
              <div key={m.titulo} className="esc-motivo">
                <span aria-hidden="true">{m.emoji}</span>
                <h3>{m.titulo}</h3>
                <p>{m.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {porArea.length > 0 && (
        <section id="servicos" className="secao secao-sup">
          <div className="conteiner">
            <div className="secao-cabeca">
              <hr className="filete" />
              <h2>Serviços e valores</h2>
              <p>Toque em um serviço para pedir pelo WhatsApp.</p>
            </div>
            <div style={{ display: 'grid', gap: 40 }}>
              {porArea.map(({ a, servicos }) => (
                <div key={a.id}>
                  <h3 className="titulo-area">{emojiArea(a)} {a.nome}</h3>
                  {a.descricao && <p className="nota" style={{ margin: '0 0 12px' }}>{a.descricao}</p>}
                  <ListaPrecos servicos={servicos} config={c} area={a.nome} emoji={emojiArea(a)} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Pacotes dados={d} />

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
            <h2>Pedir uma proposta</h2>
            <p>Preencha e a mensagem já abre no WhatsApp, organizada para eu responder rápido.</p>
          </div>
          <FormEmpresa config={c} servicos={opcoes} pacotes={mensais} />
        </div>
      </section>

      <footer className="rodape">
        <div className="conteiner rodape-base" style={{ marginTop: 0, borderTop: 0 }}>
          <span>© {new Date().getFullYear()} {c.nome}. {c.aviso_legal}</span>
          <span><Link href="/">Site completo</Link> · <Link href="/escritorios">Para escritórios</Link> · <Link href="/privacidade">Privacidade</Link></span>
        </div>
      </footer>
    </PaginaSimples>
  );
}
