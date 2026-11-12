// Diz ao Google o que pode aparecer na busca (o painel fica de fora).
import type { MetadataRoute } from 'next';
import { URL_SITE } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/story'] },
    sitemap: `${URL_SITE}/sitemap.xml`,
  };
}
