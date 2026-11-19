// Painel → notificação no celular do cliente (quando a etapa do pedido muda).
// Só quem está logado no painel consegue usar: o banco só devolve os aparelhos do cliente para admin.
import { createClient } from '@supabase/supabase-js';
import { enviarPush, pushConfigurado, type Inscricao } from '@/lib/push-servidor';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ configurado: pushConfigurado() });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!url || !chave || !jwt) return Response.json({ erro: 'Sem acesso' }, { status: 401 });

  let corpo: { cliente_id?: number; titulo?: string; corpo?: string; caminho?: string; tag?: string };
  try { corpo = await req.json(); } catch { return Response.json({ erro: 'Pedido inválido' }, { status: 400 }); }
  const cid = Number(corpo.cliente_id);
  if (!cid || !corpo.titulo) return Response.json({ erro: 'Pedido inválido' }, { status: 400 });

  // Usa o login de quem chamou: as regras do banco garantem que só admin vê push_inscricoes
  const banco = createClient(url, chave, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jwt}` } } });
  const { data: admin } = await banco.rpc('eh_admin');
  if (!admin) return Response.json({ erro: 'Sem acesso' }, { status: 403 });

  const { data } = await banco.from('push_inscricoes').select('endpoint, p256dh, auth').eq('cliente_id', cid);
  const inscricoes = (data as Inscricao[]) ?? [];
  if (!inscricoes.length) return Response.json({ enviados: 0, aparelhos: 0 });

  // Só caminhos do próprio site (nunca um link externo)
  const caminho = typeof corpo.caminho === 'string' && corpo.caminho.startsWith('/') && !corpo.caminho.startsWith('//') ? corpo.caminho : '/';
  const r = await enviarPush(inscricoes, { titulo: String(corpo.titulo), corpo: String(corpo.corpo || ''), url: caminho, tag: corpo.tag });
  if (r.vencidos.length) await banco.from('push_inscricoes').delete().in('endpoint', r.vencidos);
  return Response.json({ enviados: r.enviados, aparelhos: inscricoes.length, erro: r.erro || undefined });
}
