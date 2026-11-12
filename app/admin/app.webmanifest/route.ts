// Manifesto do app do painel (para instalar na tela inicial do celular).
// Usa a logo enviada em Visual e layout; se não houver, usa o ícone MC padrão.
import { supabaseServidor } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  let logo = '';
  let cor = '#0E1B33';
  let marca = 'MC Jurídico';
  try {
    const { data } = await supabaseServidor().from('configuracoes').select('logo_url, cor_primaria, marca').eq('id', 1).maybeSingle();
    logo = data?.logo_url || '';
    cor = data?.cor_primaria || cor;
    marca = data?.marca || marca;
  } catch {}

  const icones = logo
    ? [
        { src: logo, sizes: '192x192', purpose: 'any' },
        { src: logo, sizes: '512x512', purpose: 'any' },
      ]
    : [
        { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ];

  const manifesto = {
    id: '/admin',
    name: `${marca} · Painel`,
    short_name: marca,
    description: 'Agenda, clientes, financeiro e arquivos',
    start_url: '/admin',
    scope: '/admin',
    display: 'standalone',
    orientation: 'portrait',
    background_color: cor,
    theme_color: cor,
    lang: 'pt-BR',
    icons: icones,
  };

  return new Response(JSON.stringify(manifesto), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' },
  });
}
