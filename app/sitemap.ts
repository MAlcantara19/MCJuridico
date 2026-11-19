// Mapa do site para o Google (inclui uma página por comarca em /advogados/<cidade>).
import type { MetadataRoute } from 'next';
import { URL_SITE } from '@/lib/site';
import { carregarDados } from '@/lib/dados';
import { slugCidade } from '@/lib/cidades';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const agora = new Date();
  let cidades: MetadataRoute.Sitemap = [];
  try {
    const d = await carregarDados();
    cidades = (d?.comarcas ?? []).map((c) => ({ url: `${URL_SITE}/advogados/${slugCidade(c.nome)}`, lastModified: agora, changeFrequency: 'monthly' as const, priority: c.tipo === 'base' ? 0.8 : 0.6 }));
  } catch { /* sem banco: só as páginas fixas */ }
  return [
    { url: URL_SITE, lastModified: agora, changeFrequency: 'weekly', priority: 1 },
    { url: `${URL_SITE}/escritorios`, lastModified: agora, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${URL_SITE}/empresas`, lastModified: agora, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${URL_SITE}/advogados`, lastModified: agora, changeFrequency: 'monthly', priority: 0.7 },
    ...cidades,
  ];
}
