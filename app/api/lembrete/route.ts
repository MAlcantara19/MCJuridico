// Lembrete diário por e-mail: compromissos de amanhã, atrasados, cobranças e pedidos novos.
// Roda sozinho todo dia (vercel.json) e pode ser testado pelo painel (aba Master).
// Bônus: como acessa o banco todo dia, o Supabase grátis nunca pausa por falta de uso.
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (v: string) => v.split('-').reverse().join('/');
const esc = (t: string) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function diaSP(somar = 0) {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const [a, m, d] = hoje.split('-').map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + somar));
  return x.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resend = process.env.RESEND_API_KEY;
  const destino = process.env.LEMBRETE_EMAIL;
  if (!url || !chaveServico || !resend || !destino) {
    return Response.json({ ok: false, erro: 'Faltam variáveis na Vercel: SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY e LEMBRETE_EMAIL.' }, { status: 500 });
  }
  const banco = createClient(url, chaveServico, { auth: { persistSession: false } });

  // Quem pode chamar: o agendador da Vercel (CRON_SECRET) ou alguém logado no painel (teste)
  const token = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const teste = new URL(req.url).searchParams.get('teste') === '1';
  let autorizado = !!process.env.CRON_SECRET && token === process.env.CRON_SECRET;
  if (!autorizado && token) {
    const { data } = await banco.auth.getUser(token);
    const email = data.user?.email;
    if (email) {
      const { data: p } = await banco.from('perfis').select('id').ilike('email', email).maybeSingle();
      autorizado = !!p;
    }
  }
  if (!autorizado) return Response.json({ ok: false, erro: 'Não autorizado' }, { status: 401 });

  const hoje = diaSP();
  const amanha = diaSP(1);
  const [ag, rec, sol, conf] = await Promise.all([
    banco.from('agenda').select('titulo, tipo, data, hora, local, processo, clientes(nome)').eq('feito', false).lte('data', amanha).order('data').order('hora', { nullsFirst: true }),
    banco.from('atendimentos').select('valor').eq('status', 'concluido').eq('pago', false),
    banco.from('solicitacoes').select('id', { count: 'exact', head: true }).eq('status', 'nova'),
    banco.from('configuracoes').select('marca, nome, cor_primaria, cor_destaque').eq('id', 1).maybeSingle(),
  ]);

  type Item = { titulo: string; tipo: string; data: string; hora: string | null; local: string; processo: string; clientes: { nome: string } | { nome: string }[] | null };
  const itens = (ag.data ?? []) as unknown as Item[];
  const atrasados = itens.filter((i) => i.data < hoje);
  const deHoje = itens.filter((i) => i.data === hoje);
  const deAmanha = itens.filter((i) => i.data === amanha);
  const aReceber = ((rec.data ?? []) as { valor: number }[]).reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const novas = sol.count ?? 0;

  if (!teste && !itens.length && !novas) return Response.json({ ok: true, enviado: false, motivo: 'Nada pendente' });

  const cor = conf.data?.cor_primaria || '#0E1B33';
  const ouro = conf.data?.cor_destaque || '#A8894E';
  const marca = conf.data?.marca || 'MC Jurídico';
  const nomeCliente = (i: Item) => (Array.isArray(i.clientes) ? i.clientes[0]?.nome : i.clientes?.nome) || '';
  const bloco = (titulo: string, lista: Item[], alerta = false) => !lista.length ? '' : `
    <h3 style="margin:22px 0 8px;font-size:15px;color:${alerta ? '#b3261e' : cor}">${titulo} (${lista.length})</h3>
    ${lista.map((i) => `
      <div style="padding:10px 12px;border:1px solid #e3e6ec;border-radius:8px;margin-bottom:8px">
        <strong>${i.hora ? `${i.hora.slice(0, 5)} · ` : ''}${esc(i.titulo)}</strong>
        <div style="color:#5b6780;font-size:13px">${[alerta ? dataBR(i.data) : '', nomeCliente(i), i.local, i.processo && `Proc. ${i.processo}`].filter(Boolean).map(esc).join(' · ')}</div>
      </div>`).join('')}`;

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#121a2b">
    <div style="background:${cor};color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
      <div style="color:${ouro};font-size:12px;letter-spacing:2px;text-transform:uppercase">${esc(marca)}</div>
      <div style="font-size:22px;font-family:Georgia,serif">Sua agenda de amanhã, ${dataBR(amanha)}</div>
    </div>
    <div style="padding:8px 24px 24px;border:1px solid #e3e6ec;border-top:0;border-radius:0 0 10px 10px">
      ${bloco('Atrasados', atrasados, true)}
      ${bloco('Ainda hoje', deHoje)}
      ${bloco('Amanhã', deAmanha)}
      ${!itens.length ? '<p style="margin-top:20px">Nenhum compromisso pendente. 🎉</p>' : ''}
      <p style="margin-top:22px;font-size:14px">
        ${novas ? `📩 <strong>${novas}</strong> solicitação(ões) nova(s) do site.<br>` : ''}
        ${aReceber ? `💰 <strong>${brl(aReceber)}</strong> a receber.` : ''}
      </p>
      <p style="font-size:12px;color:#5b6780;margin-top:24px">${teste ? 'Este é um e-mail de teste enviado pelo painel.' : 'Lembrete automático enviado todo dia no fim da tarde.'}</p>
    </div>
  </div>`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resend}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.LEMBRETE_REMETENTE || `${marca} <onboarding@resend.dev>`,
      to: destino.split(',').map((x) => x.trim()),
      subject: `${atrasados.length ? `⚠️ ${atrasados.length} atrasado(s) · ` : ''}Agenda de amanhã (${dataBR(amanha)}): ${deAmanha.length} compromisso(s)`,
      html,
    }),
  });
  if (!r.ok) return Response.json({ ok: false, erro: `Resend: ${await r.text()}` }, { status: 502 });
  return Response.json({ ok: true, enviado: true, atrasados: atrasados.length, hoje: deHoje.length, amanha: deAmanha.length });
}
