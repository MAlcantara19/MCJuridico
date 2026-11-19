// Lembrete automático para o cliente, 1 dia útil antes (roda 1x por dia pela Vercel, veja vercel.json).
// Avisa no celular de quem ativou as notificações na área do cliente:
// • compromissos da agenda ligados ao cliente (audiência, reunião, prazo…)
// • pedidos com prazo chegando (principalmente os que aguardam documentos)
import { createClient } from '@supabase/supabase-js';
import { enviarPush, type Inscricao } from '@/lib/push-servidor';
import { dataBR, definirFeriadosExtras, diasUteisEntre, type FeriadoExtra } from '@/lib/gestao';

export const dynamic = 'force-dynamic';

type Item = {
  tipo: 'agenda' | 'pedido'; id: number; cliente_id: number; titulo: string; categoria?: string; status?: string;
  codigo?: string; data: string; hora?: string | null; local?: string; token?: string | null; subs: Inscricao[] | null;
};

const NOMES: Record<string, string> = { prazo: 'Prazo', diligencia: 'Diligência', audiencia: 'Audiência', reuniao: 'Reunião', entrega: 'Entrega', outro: 'Compromisso' };

// Data de hoje no horário de Brasília (o servidor roda em UTC)
function hojeBrasilia() {
  const d = new Date(Date.now() - 3 * 3600e3);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) return new Response('Sem acesso', { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return new Response('Configuração ausente', { status: 500 });

  const banco = createClient(url, chave, { auth: { persistSession: false } });
  const { data, error } = await banco.rpc('lembretes_cron', { codigo: segredo });
  if (error || !data) return Response.json({ erro: 'Código do lembrete não confere com o do painel (Master › Notificações)' }, { status: 403 });

  definirFeriadosExtras((data.feriados ?? []) as FeriadoExtra[]);
  const hoje = hojeBrasilia();
  const itens = ((data.itens ?? []) as Item[]).filter((i) => i.data > hoje && diasUteisEntre(hoje, i.data) <= 1);

  const agendaIds: number[] = [], pedidoIds: number[] = [], vencidos: string[] = [];
  let enviados = 0;
  for (const i of itens) {
    const quando = i.data === hojeMaisUm(hoje) ? 'amanhã' : `em ${dataBR(i.data)}`;
    const aviso = i.tipo === 'agenda'
      ? { titulo: `⏰ ${NOMES[i.categoria ?? ''] ?? 'Compromisso'} ${quando}`, corpo: `${i.titulo}${i.hora ? ` às ${i.hora.slice(0, 5)}` : ''}${i.local ? ` · ${i.local}` : ''} (${dataBR(i.data)})` }
      : i.status === 'aguardando_docs'
        ? { titulo: `📂 Documentos pendentes · prazo ${quando}`, corpo: `${i.codigo ? `${i.codigo} · ` : ''}${i.titulo}: envie os documentos pela sua área até ${dataBR(i.data)}.` }
        : { titulo: `📌 Seu pedido tem prazo ${quando}`, corpo: `${i.codigo ? `${i.codigo} · ` : ''}${i.titulo} (${dataBR(i.data)})` };
    const r = await enviarPush(i.subs ?? [], { ...aviso, url: i.token ? `/cliente/${i.token}` : '/', tag: `lembrete-${i.tipo}-${i.id}` });
    enviados += r.enviados;
    vencidos.push(...r.vencidos);
    if (r.enviados > 0) (i.tipo === 'agenda' ? agendaIds : pedidoIds).push(i.id);
  }
  await banco.rpc('lembretes_marcar', { codigo: segredo, agenda_ids: agendaIds, pedido_ids: pedidoIds, vencidos });
  return Response.json({ hoje, avaliados: itens.length, enviados });
}

function hojeMaisUm(d: string) {
  const [a, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, dd + 1)).toISOString().slice(0, 10);
}
