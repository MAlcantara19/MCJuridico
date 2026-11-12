// Stories para o Instagram: telas verticais (9:16) com os serviços e preços atualizados.
// Ela abre /story no celular, passa as telas tocando e tira print de cada uma.
import type { Metadata } from 'next';
import { carregarDados } from '@/lib/dados';
import Stories from '@/components/site/Stories';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Stories', robots: { index: false, follow: false } };

export default async function PaginaStory() {
  const d = await carregarDados();
  if (!d) return null;
  return <Stories dados={d} />;
}
