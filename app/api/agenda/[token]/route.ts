// Agenda do painel no formato de calendário (.ics), para assinar no Google Agenda ou no iPhone.
// O link tem um código secreto; quem não tem o código não vê nada.
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type Item = { id: number; titulo: string; tipo: string; data: string; hora: string | null; local: string; processo: string; observacoes: string; feito: boolean; cliente: string | null };

const TIPOS: Record<string, string> = { prazo: '⏰ Prazo', diligencia: '💼 Diligência', audiencia: '⚖️ Audiência', reuniao: '👥 Reunião', entrega: '📦 Entrega', outro: '📌' };

// Texto seguro para o formato .ics
const esc = (t: string) => String(t ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
// Quebra linhas longas (o padrão pede no máximo 75 caracteres)
const dobrar = (l: string) => l.match(/.{1,70}/g)?.join('\r\n ') ?? l;
const somarHora = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return `${String(Math.min(23, h + 1)).padStart(2, '0')}${String(m).padStart(2, '0')}00`;
};
const diaSeguinte = (d: string) => {
  const [a, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, dd + 1)).toISOString().slice(0, 10).replace(/-/g, '');
};

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) return new Response('Configuração ausente', { status: 500 });

  const banco = createClient(url, chave, { auth: { persistSession: false } });
  const { data, error } = await banco.rpc('agenda_ics', { codigo: token.replace(/\.ics$/, '') });
  if (error || !data) return new Response('Link inválido', { status: 404 });

  const agora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MC Juridico//Agenda//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:MC Jurídico · Agenda',
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  ];
  for (const i of data as Item[]) {
    const dia = i.data.replace(/-/g, '');
    const titulo = `${i.feito ? '✅ ' : ''}${TIPOS[i.tipo] ?? '📌'} · ${i.titulo}`;
    const descricao = [i.cliente && `Cliente: ${i.cliente}`, i.processo && `Processo: ${i.processo}`, i.observacoes].filter(Boolean).join('\n');
    linhas.push(
      'BEGIN:VEVENT',
      `UID:mc-agenda-${i.id}@mcjuridico`,
      `DTSTAMP:${agora}`,
      ...(i.hora
        ? [`DTSTART;TZID=America/Sao_Paulo:${dia}T${i.hora.slice(0, 5).replace(':', '')}00`, `DTEND;TZID=America/Sao_Paulo:${dia}T${somarHora(i.hora)}`]
        : [`DTSTART;VALUE=DATE:${dia}`, `DTEND;VALUE=DATE:${diaSeguinte(i.data)}`]),
      dobrar(`SUMMARY:${esc(titulo)}`),
      ...(i.local ? [dobrar(`LOCATION:${esc(i.local)}`)] : []),
      ...(descricao ? [dobrar(`DESCRIPTION:${esc(descricao)}`)] : []),
      ...(i.feito ? [] : ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(i.titulo)}`, i.hora ? 'TRIGGER:-PT1H' : 'TRIGGER:-PT15H', 'END:VALARM']),
      'END:VEVENT',
    );
  }
  linhas.push('END:VCALENDAR');

  return new Response(linhas.join('\r\n'), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="agenda-mc-juridico.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
