// Página que o cliente recebe para ler e aceitar o contrato do pacote: /contrato/<link secreto>
import type { Metadata } from 'next';
import { carregarDados } from '@/lib/dados';
import { supabaseServidor } from '@/lib/supabase';
import TextoContrato, { type DadosContrato } from '@/components/cliente/TextoContrato';
import AceiteContrato from '@/components/cliente/AceiteContrato';
import '../../admin/admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Contrato', robots: { index: false, follow: false }, referrer: 'no-referrer' };

export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const d = await carregarDados();
  if (!d) return null;
  const valido = /^[a-f0-9]{32,80}$/.test(token);
  const r = valido ? await supabaseServidor().rpc('contrato_ver', { token }) : { data: null };
  const k = r.data as DadosContrato | null;

  return (
    <div className="adm" style={{ padding: 16, minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 16 }}>
        {!k ? (
          <div className="adm-item"><h2>Contrato não encontrado</h2><p className="adm-sub">O link pode ter sido digitado errado ou o contrato foi cancelado. Fale comigo pelo WhatsApp.</p></div>
        ) : (
          <>
            <AceiteContrato token={token} numero={k.numero} status={k.status || 'enviado'} aceitoEm={k.aceito_em} nomeInicial={k.cliente.responsavel || k.cliente.nome} whatsapp={d.config.whatsapp} />
            <TextoContrato d={k} config={d.config} assinatura={d.config.assinatura_url} />
          </>
        )}
      </div>
    </div>
  );
}
