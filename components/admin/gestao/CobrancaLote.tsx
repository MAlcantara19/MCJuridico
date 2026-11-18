'use client';
// Cobrança em lote: fila com todos os clientes que têm serviço concluído e não pago.
// Uma mensagem por cliente (com todos os pedidos e o Pix do total), um de cada vez.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Config } from '@/lib/tipos';
import { msgCobrancaLote } from '@/lib/mensagens';
import { brl, dataBR, hojeISO, pixDe, whatsDoTelefone, type Atendimento, type Cliente } from '@/lib/gestao';

type Props = { todos: Atendimento[]; clientes: Cliente[]; config: Config; avisar: (m: string, e?: boolean) => void; fechar: () => void; aoMudar: () => void };

const diasDesde = (d: string) => Math.max(0, Math.round((new Date(`${hojeISO()}T12:00:00`).getTime() - new Date(`${d.slice(0, 10)}T12:00:00`).getTime()) / 864e5));

export default function CobrancaLote({ todos, clientes, config, avisar, fechar, aoMudar }: Props) {
  const [feitos, setFeitos] = useState<number[]>([]);
  const [cobradoEm, setCobradoEm] = useState<Record<number, string>>({});
  const [origem, setOrigem] = useState('');
  useEffect(() => { setOrigem(window.location.origin); }, []);

  const fila = clientes
    .map((c) => {
      const itens = todos.filter((a) => a.cliente_id === c.id && a.status === 'concluido' && !a.pago && !a.pagamento_informado).sort((a, b) => a.data.localeCompare(b.data));
      const total = itens.reduce((s, a) => s + (Number(a.valor) || 0), 0);
      return { c, itens, total, maisAntigo: itens[0]?.data ?? '' };
    })
    .filter((x) => x.itens.length && x.total > 0)
    .sort((a, b) => a.maisAntigo.localeCompare(b.maisAntigo));
  const pendentes = fila.filter((x) => !feitos.includes(x.c.id));
  const totalGeral = fila.reduce((s, x) => s + x.total, 0);

  function mensagem(x: (typeof fila)[number]) {
    return msgCobrancaLote({
      nome: x.c.responsavel || x.c.nome,
      itens: x.itens.map((a) => ({ codigo: a.codigo, servico: a.servico, data: dataBR(a.data), valor: brl(a.valor) })),
      total: brl(x.total),
      pix: pixDe(config, x.total, x.itens.length === 1 ? x.itens[0].codigo || undefined : undefined),
      linkArea: x.c.acesso_token ? `${origem}/cliente/${x.c.acesso_token}` : '',
    });
  }

  async function cobrar(x: (typeof fila)[number]) {
    if (!x.c.telefone) return avisar(`${x.c.nome} não tem WhatsApp cadastrado.`, true);
    window.open(whatsDoTelefone(x.c.telefone, mensagem(x)), '_blank', 'noopener');
    const agora = new Date().toISOString();
    setFeitos((f) => [...f, x.c.id]);
    setCobradoEm((m) => ({ ...m, [x.c.id]: agora }));
    const { error } = await supabase().from('clientes').update({ cobrado_em: agora }).eq('id', x.c.id);
    if (!error) aoMudar();
  }

  return (
    <div className="adm-item mudou" style={{ gap: 12 }}>
      <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>💰 Cobrar inadimplentes ({fila.length})</h3>
        <button className="adm-btn peq" onClick={fechar}>Fechar</button>
      </div>
      <p className="adm-dica" style={{ margin: 0 }}>
        Total em aberto: <strong>{brl(totalGeral)}</strong>. Cada cliente recebe uma mensagem só, com todos os pedidos e o Pix do total.
        Quem já informou o pagamento (a conferir) não aparece aqui.
      </p>
      {!fila.length && <p className="adm-sub" style={{ margin: 0 }}>Ninguém devendo. 🎉</p>}
      {pendentes[0] && (
        <div className="lote-proximo">
          <span className="adm-dica" style={{ margin: 0 }}>Próximo da fila ({fila.length - pendentes.length + 1} de {fila.length})</span>
          <strong style={{ fontSize: '1.1rem' }}>{pendentes[0].c.nome} · {brl(pendentes[0].total)}</strong>
          <pre className="previa-msg">{mensagem(pendentes[0])}</pre>
          <div className="adm-linha">
            <button className="adm-btn pri" onClick={() => cobrar(pendentes[0])}>Cobrar no WhatsApp e ir para o próximo</button>
            <button className="adm-btn" onClick={() => setFeitos((f) => [...f, pendentes[0].c.id])}>Pular</button>
          </div>
        </div>
      )}
      {fila.length > 0 && !pendentes.length && <p style={{ margin: 0, color: '#2e7d32', fontWeight: 600 }}>✅ Fila terminada! Volte aqui em alguns dias para conferir quem ainda não pagou.</p>}
      <table className="tc">
        <thead><tr><th>Cliente</th><th>Pedidos</th><th>Mais antigo</th><th>Última cobrança</th><th className="num">Total</th><th /></tr></thead>
        <tbody>
          {fila.map((x) => {
            const dias = diasDesde(x.maisAntigo);
            const ultima = cobradoEm[x.c.id] || x.c.cobrado_em;
            return (
              <tr key={x.c.id} style={{ opacity: feitos.includes(x.c.id) ? 0.5 : 1 }}>
                <td>{x.c.nome}{!x.c.telefone && <small style={{ color: '#b3261e' }}> · sem WhatsApp</small>}</td>
                <td>{x.itens.map((a) => a.codigo || a.servico).join(', ')}</td>
                <td style={{ color: dias > 30 ? '#b3261e' : dias > 15 ? '#e08a00' : undefined, fontWeight: 600 }}>{dias} dia{dias === 1 ? '' : 's'}</td>
                <td>{ultima ? (diasDesde(ultima) === 0 ? 'hoje' : `há ${diasDesde(ultima)} dia${diasDesde(ultima) === 1 ? '' : 's'}`) : '—'}</td>
                <td className="num">{brl(x.total)}</td>
                <td>{!feitos.includes(x.c.id) && <button className="adm-btn peq" onClick={() => cobrar(x)}>Cobrar</button>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
