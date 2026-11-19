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
  const [baixando, setBaixando] = useState(false);
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

  // Planilha para o contador: um resumo por cliente e todos os pedidos em aberto
  async function excel() {
    setBaixando(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = config.marca || 'MC Jurídico';
      const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;
      const moeda = '"R$" #,##0.00';
      const titulo = (ws: any, texto: string, colunas: number) => {
        ws.mergeCells(1, 1, 1, colunas);
        const t = ws.getCell('A1');
        t.value = texto;
        t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(config.cor_primaria || '#0E1B33') } };
        ws.getRow(1).height = 26;
      };
      const cabecalho = (ws: any, nomes: string[]) => {
        const r = ws.addRow(nomes);
        r.eachCell((c: any) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(config.cor_destaque || '#A8894E') } }; });
      };

      const ws = wb.addWorksheet('Resumo por cliente', { views: [{ state: 'frozen', ySplit: 2 }] });
      titulo(ws, `${config.marca || 'MC Jurídico'} · Valores em aberto · ${dataBR(hojeISO())}`, 8);
      cabecalho(ws, ['Cliente', 'CPF/CNPJ', 'Responsável', 'Telefone', 'Pedidos', 'Mais antigo (dias)', 'Última cobrança', 'Total em aberto']);
      for (const x of fila) {
        const dias = diasDesde(x.maisAntigo);
        const r = ws.addRow([x.c.nome, x.c.documento || '', x.c.responsavel || '', x.c.telefone || '', x.itens.length, dias, x.c.cobrado_em ? dataBR(x.c.cobrado_em) : '—', x.total]);
        r.getCell(8).numFmt = moeda;
        if (dias > 30) r.getCell(6).font = { bold: true, color: { argb: 'FFB3261E' } };
        else if (dias > 15) r.getCell(6).font = { bold: true, color: { argb: 'FFE08A00' } };
      }
      const tot = ws.addRow(['Total', '', '', '', fila.reduce((s, x) => s + x.itens.length, 0), '', '', totalGeral]);
      tot.font = { bold: true };
      tot.getCell(8).numFmt = moeda;
      tot.eachCell((c: any) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF0F4' } }; });
      ws.columns = [{ width: 32 }, { width: 20 }, { width: 24 }, { width: 18 }, { width: 10 }, { width: 18 }, { width: 16 }, { width: 18 }];

      const wp = wb.addWorksheet('Pedidos em aberto', { views: [{ state: 'frozen', ySplit: 2 }] });
      titulo(wp, 'Pedidos concluídos e não pagos', 7);
      cabecalho(wp, ['Cliente', 'Pedido', 'Serviço', 'Processo', 'Concluído em', 'Dias em aberto', 'Valor']);
      for (const x of fila) for (const a of x.itens) {
        const r = wp.addRow([x.c.nome, a.codigo || '', a.servico, a.processo || '', dataBR(a.data), diasDesde(a.data), Number(a.valor) || 0]);
        r.getCell(7).numFmt = moeda;
      }
      wp.columns = [{ width: 30 }, { width: 12 }, { width: 40 }, { width: 26 }, { width: 14 }, { width: 14 }, { width: 14 }];

      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = `inadimplentes-${hojeISO()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      avisar(`Não consegui gerar a planilha: ${e.message}`, true);
    } finally {
      setBaixando(false);
    }
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
        <span className="adm-linha">
          {fila.length > 0 && <button className="adm-btn peq" onClick={excel} disabled={baixando}>{baixando ? 'Gerando…' : '📊 Baixar em Excel (contador)'}</button>}
          <button className="adm-btn peq" onClick={fechar}>Fechar</button>
        </span>
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
