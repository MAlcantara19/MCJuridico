// Página que o cliente recebe para avaliar o serviço: /avaliar?n=Nome
import type { Metadata } from 'next';
import { carregarDados } from '@/lib/dados';
import PaginaSimples from '@/components/site/PaginaSimples';
import FormAvaliacao from '@/components/site/FormAvaliacao';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Avalie o atendimento', robots: { index: false, follow: false } };

export default async function Avaliar({ searchParams }: { searchParams: Promise<{ n?: string }> }) {
  const d = await carregarDados();
  if (!d) return null;
  const { n } = await searchParams;
  return (
    <PaginaSimples config={d.config} classe="pagina-links">
      <main className="links">
        <p className="links-prof" style={{ marginBottom: 6 }}>{d.config.marca || d.config.nome}</p>
        <h1>Como foi o atendimento?</h1>
        <p style={{ color: 'rgba(255,255,255,.75)', margin: '0 0 28px' }}>Sua opinião ajuda a melhorar o trabalho e outros escritórios a conhecerem o serviço.</p>
        <FormAvaliacao nomeInicial={(n || '').slice(0, 80)} whatsapp={d.config.whatsapp} />
      </main>
    </PaginaSimples>
  );
}
