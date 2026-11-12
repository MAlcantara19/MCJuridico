// Layout do painel: não aparece no Google e pode ser instalado como app no celular.
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { supabaseServidor } from '@/lib/supabase';
import './admin.css';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = { themeColor: '#0E1B33' };

export async function generateMetadata(): Promise<Metadata> {
  let logo = '';
  let marca = 'MC Jurídico';
  try {
    const { data } = await supabaseServidor().from('configuracoes').select('logo_url, marca').eq('id', 1).maybeSingle();
    logo = data?.logo_url || '';
    marca = data?.marca || marca;
  } catch {}
  return {
    title: `Painel · ${marca}`,
    robots: { index: false, follow: false },
    manifest: '/admin/app.webmanifest',
    icons: { apple: logo || '/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: marca, statusBarStyle: 'black-translucent' },
  };
}

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return children;
}
