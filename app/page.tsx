// Página pública (expositora). Busca tudo no banco e monta o site.
import type { Metadata } from 'next';
import { carregarDados as carregar } from '@/lib/dados';
import Site from '@/components/site/Site';
import { URL_SITE } from '@/lib/site';

// Sempre busca dados novos: o que ela muda no painel aparece na hora.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const dados = await carregar();
  const c = dados?.config;
  return {
    metadataBase: new URL(URL_SITE),
    title: c?.seo_titulo || c?.marca || c?.nome || 'MC Jurídico',
    description: c?.seo_descricao || c?.descricao_hero || '',
    icons: c?.logo_url ? { icon: c.logo_url, apple: c.logo_url } : undefined,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      url: '/',
      siteName: c?.marca || 'MC Jurídico',
      title: c?.seo_titulo || c?.nome || '',
      description: c?.seo_descricao || '',
      images: c?.foto_url ? [c.foto_url] : undefined,
    },
  };
}

export default async function Pagina() {
  const dados = await carregar();
  if (!dados) {
    return (
      <main style={{ padding: 40, fontFamily: 'sans-serif' }}>
        <h1>Quase lá</h1>
        <p>O banco ainda não foi configurado. Rode o arquivo supabase/banco.sql no Supabase.</p>
      </main>
    );
  }
  // Ficha para o Google entender quem é, onde atende e como contatar.
  const c = dados.config;
  const ficha = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: c.marca || c.nome,
    description: c.seo_descricao || c.descricao_hero,
    url: URL_SITE,
    image: c.foto_url || c.logo_url || undefined,
    telephone: c.whatsapp ? `+${c.whatsapp.replace(/\D/g, '')}` : undefined,
    email: c.email || undefined,
    founder: { '@type': 'Person', name: c.nome, jobTitle: c.profissao },
    areaServed: ['Brasil', 'Três Rios, RJ', 'Paraíba do Sul, RJ'],
    sameAs: c.instagram ? [`https://instagram.com/${c.instagram.replace('@', '')}`] : undefined,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ficha).replace(/</g, '\\u003c') }} />
      <Site dados={dados} />
    </>
  );
}
