// Área do cliente: /cliente/<link secreto>. O cliente entra com o código de 4 dígitos.
import type { Metadata } from 'next';
import { carregarDados } from '@/lib/dados';
import AreaCliente from '@/components/cliente/AreaCliente';
import '../../admin/admin.css';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const d = await carregarDados();
  const marca = d?.config.marca || 'MC Jurídico';
  const valido = /^[\w-]{16,80}$/.test(token);
  return {
    title: `Meus pedidos · ${marca}`,
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
    ...(valido ? { manifest: `/cliente/${token}/app.webmanifest` } : {}),
    icons: { apple: d?.config.logo_url || '/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: marca, statusBarStyle: 'black-translucent' },
  };
}

export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await carregarDados();
  if (!d) return null;
  return <AreaCliente token={token} config={d.config} feriados={d.feriados} />;
}
