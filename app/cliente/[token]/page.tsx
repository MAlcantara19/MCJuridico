// Área do cliente: /cliente/<link secreto>. O cliente entra com o código de 4 dígitos.
import type { Metadata } from 'next';
import { carregarDados } from '@/lib/dados';
import AreaCliente from '@/components/cliente/AreaCliente';
import '../../admin/admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Área do cliente', robots: { index: false, follow: false } };

export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await carregarDados();
  if (!d) return null;
  return <AreaCliente token={token} config={d.config} />;
}
