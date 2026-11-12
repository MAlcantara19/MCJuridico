// Página de links para a bio do Instagram: mcjuridico.../links
import type { Metadata } from 'next';
import Link from 'next/link';
import { carregarDados } from '@/lib/dados';
import { iniciais, linkWhats } from '@/lib/util';
import PaginaSimples from '@/components/site/PaginaSimples';
import BotaoRegistro from '@/components/site/BotaoRegistro';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const d = await carregarDados();
  return { title: `${d?.config.marca || 'MC Jurídico'} · Links`, description: d?.config.profissao };
}

export default async function Links() {
  const d = await carregarDados();
  if (!d) return null;
  const c = d.config;
  const insta = c.instagram?.replace('@', '');
  const pacote = d.pacotes.find((p) => p.grupo === 'teste');

  return (
    <PaginaSimples config={c} classe="pagina-links">
      <main className="links">
        <div className="links-arco">
          {c.foto_url ? <img src={c.foto_url} alt={`Foto de ${c.nome}`} /> : <span aria-hidden="true">{iniciais(c.nome)}</span>}
        </div>
        <h1>{c.nome}</h1>
        <p className="links-prof">{c.profissao}</p>

        <nav className="links-lista" aria-label="Links">
          <BotaoRegistro className="link-item destaque" href={linkWhats(c.whatsapp, c.mensagem_whatsapp)}>
            Conversar no WhatsApp
          </BotaoRegistro>
          <Link className="link-item" href="/#servicos">Serviços e valores</Link>
          <Link className="link-item" href="/#correspondente">Diligências e correspondente</Link>
          <Link className="link-item" href="/#pacotes">Pacotes mensais</Link>
          {pacote && (
            <BotaoRegistro className="link-item" href={linkWhats(c.whatsapp, `Olá, Maria Carolina! Quero experimentar o ${pacote.nome} (${pacote.horas}).`)}>
              {pacote.nome}: {pacote.horas} por {pacote.preco}
            </BotaoRegistro>
          )}
          <Link className="link-item" href="/#contato">Solicitar um serviço</Link>
          {d.documentos.length > 0 && <Link className="link-item" href="/#documentos">Modelos e documentos</Link>}
          {insta && <a className="link-item" href={`https://instagram.com/${insta}`} target="_blank" rel="noopener noreferrer">Instagram @{insta}</a>}
          {c.email && <a className="link-item" href={`mailto:${c.email}`}>{c.email}</a>}
        </nav>

        <p className="links-rodape">
          <Link href="/">{c.marca || 'Site completo'}</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/privacidade">Privacidade</Link>
        </p>
      </main>
    </PaginaSimples>
  );
}
