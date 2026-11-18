// Manifesto da área do cliente: o cliente instala o ícone no celular e abre direto na área dele.
import { supabaseServidor } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{16,80}$/.test(token)) return new Response('Não encontrado', { status: 404 });
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
    ? [{ src: logo, sizes: '192x192', purpose: 'any' }, { src: logo, sizes: '512x512', purpose: 'any' }]
    : [
        { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ];
  const caminho = `/cliente/${token}`;
  const manifesto = {
    id: caminho,
    name: `${marca} · Meus pedidos`,
    short_name: marca,
    description: 'Acompanhe seus pedidos, envie documentos e pague por Pix',
    start_url: caminho,
    scope: caminho,
    display: 'standalone',
    orientation: 'portrait',
    background_color: cor,
    theme_color: cor,
    lang: 'pt-BR',
    icons: icones,
  };
  return new Response(JSON.stringify(manifesto), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}
