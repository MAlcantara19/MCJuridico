'use client';
// Lembrete para o próprio cliente, 1 dia útil antes do compromisso ou do prazo.
// Quem ativou as notificações na área do cliente recebe sozinho (todo dia de manhã);
// para os outros, a mensagem do WhatsApp fica pronta aqui, um clique por cliente.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { msgLembreteCliente } from '@/lib/mensagens';
import { COR_AGENDA, dataBR, diaSemana, diasUteisEntre, hojeISO, somarDias, whatsDoTelefone, type Atendimento, type Cliente, type Compromisso } from '@/lib/gestao';

type Item = { chave: string; tabela: 'agenda' | 'atendimentos'; id: number; cliente: Cliente; titulo: string; data: string; hora?: string | null; local?: string; tipo: string; codigo?: string | null; enviado: boolean };

export default function LembretesClientes({ clientes, versao }: { clientes: Cliente[]; versao: number }) {
  const [itens, setItens] = useState<Item[]>([]);
  const [comPush, setComPush] = useState<Set<number>>(new Set());
  const [aberto, setAberto] = useState(true);

  useEffect(() => {
    if (!clientes.length) return;
    (async () => {
      const hoje = hojeISO();
      const ate = somarDias(hoje, 7);
      const [g, a, p] = await Promise.all([
        supabase().from('agenda').select('*').eq('feito', false).not('cliente_id', 'is', null).gt('data', hoje).lte('data', ate),
        supabase().from('atendimentos').select('*').in('status', ['aguardando_docs', 'a_fazer', 'andamento']).not('cliente_id', 'is', null).gt('prazo', hoje).lte('prazo', ate),
        supabase().from('push_inscricoes').select('cliente_id'),
      ]);
      const cli = (id: number | null) => clientes.find((c) => c.id === id);
      const perto = (d: string) => diasUteisEntre(hoje, d) <= 1;
      const lista: Item[] = [
        ...((g.data as Compromisso[]) ?? []).filter((x) => x.lembrar_cliente !== false && perto(x.data) && cli(x.cliente_id)).map((x) => ({
          chave: `g${x.id}`, tabela: 'agenda' as const, id: x.id, cliente: cli(x.cliente_id)!, titulo: x.titulo, data: x.data, hora: x.hora, local: x.local, tipo: x.tipo, enviado: !!x.lembrete_cliente_em,
        })),
        ...((a.data as (Atendimento & { lembrete_cliente_em?: string | null })[]) ?? []).filter((x) => x.prazo && perto(x.prazo) && cli(x.cliente_id)).map((x) => ({
          chave: `a${x.id}`, tabela: 'atendimentos' as const, id: x.id, cliente: cli(x.cliente_id)!, titulo: x.servico, data: x.prazo!, tipo: x.status === 'aguardando_docs' ? 'docs' : 'pedido', codigo: x.codigo, enviado: !!x.lembrete_cliente_em,
        })),
      ].sort((x, y) => x.data.localeCompare(y.data));
      setItens(lista);
      setComPush(new Set(((p.data ?? []) as { cliente_id: number }[]).map((x) => x.cliente_id)));
    })();
  }, [clientes, versao]);

  if (!itens.length) return null;
  const pendentes = itens.filter((i) => !i.enviado);

  async function avisar(i: Item) {
    const origem = window.location.origin;
    const texto = msgLembreteCliente({
      nome: i.cliente.responsavel || i.cliente.nome, titulo: i.titulo, data: `${diaSemana(i.data)}, ${dataBR(i.data)}`,
      hora: i.hora?.slice(0, 5), local: i.local, codigo: i.codigo || undefined, documentos: i.tipo === 'docs',
      linkArea: i.cliente.acesso_token ? `${origem}/cliente/${i.cliente.acesso_token}` : '',
    });
    window.open(whatsDoTelefone(i.cliente.telefone, texto), '_blank', 'noopener');
    await supabase().from(i.tabela).update({ lembrete_cliente_em: new Date().toISOString() }).eq('id', i.id);
    setItens((l) => l.map((x) => (x.chave === i.chave ? { ...x, enviado: true } : x)));
  }

  return (
    <div className="adm-item" style={{ borderLeft: '5px solid #a8894e', gap: 8 }}>
      <button className="link-btn" style={{ textAlign: 'left', fontWeight: 700, fontSize: '1rem' }} onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        🔔 Lembrar clientes (próximo dia útil) · {pendentes.length} pendente{pendentes.length === 1 ? '' : 's'} {aberto ? '▾' : '▸'}
      </button>
      {aberto && itens.map((i) => {
        const auto = comPush.has(i.cliente.id);
        return (
          <div key={i.chave} className="adm-linha lembrete-linha" style={{ opacity: i.enviado ? 0.55 : 1 }}>
            <span className="etq" style={{ ['--cor' as string]: i.tipo === 'docs' ? '#e08a00' : (COR_AGENDA[i.tipo] ?? COR_AGENDA.outro).cor }}>{diaSemana(i.data)} {dataBR(i.data).slice(0, 5)}</span>
            <span style={{ flex: 1, minWidth: 160 }}><strong>{i.cliente.nome}</strong> · {i.tipo === 'docs' ? '📂 documentos de ' : ''}{i.titulo}{i.hora ? ` às ${i.hora.slice(0, 5)}` : ''}</span>
            {auto && <span className="adm-dica" style={{ margin: 0, color: '#2e7d32' }} title="O cliente ativou as notificações: o aviso vai sozinho de manhã">📲 automático</span>}
            {i.enviado
              ? <span className="adm-dica" style={{ margin: 0 }}>✓ avisado</span>
              : i.cliente.telefone && <button className="adm-btn peq" onClick={() => avisar(i)}>Lembrar no WhatsApp</button>}
          </div>
        );
      })}
    </div>
  );
}
