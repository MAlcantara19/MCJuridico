'use client';
// Tabela colorida de clientes: pedidos em aberto, prazos e valores.
// Imprime em A4 deitado (colorido) ou baixa em Excel (.xlsx) com as mesmas cores.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Config } from '@/lib/tipos';
import { COR_STATUS, STATUS, brl, corEtiqueta, dataBR, hojeISO, rotulo, situacaoPrazo, type Atendimento, type Cliente, type Compromisso } from '@/lib/gestao';

type Linha = {
  c: Cliente;
  abertos: Atendimento[];
  proximo: { data: string; texto: string } | null;
  faturado: number;
  aReceber: number;
  aConferir: number;
};

export default function TabelaClientes({ clientes, config, fechar, filtroEtiqueta }: { clientes: Cliente[]; config: Config; fechar: () => void; filtroEtiqueta?: string }) {
  const [pedidos, setPedidos] = useState<Atendimento[]>([]);
  const [agenda, setAgenda] = useState<Compromisso[]>([]);
  const [baixando, setBaixando] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase().from('atendimentos').select('*').neq('status', 'cancelado'),
      supabase().from('agenda').select('*').eq('feito', false),
    ]).then(([a, g]) => { setPedidos((a.data as Atendimento[]) ?? []); setAgenda((g.data as Compromisso[]) ?? []); });
  }, []);

  const linhas: Linha[] = useMemo(() => clientes
    .filter((c) => !filtroEtiqueta || (c.etiquetas ?? []).includes(filtroEtiqueta))
    .map((c) => {
      const deles = pedidos.filter((a) => a.cliente_id === c.id);
      const abertos = deles.filter((a) => a.status !== 'concluido');
      const concl = deles.filter((a) => a.status === 'concluido');
      const datas = [
        ...abertos.filter((a) => a.prazo).map((a) => ({ data: a.prazo!, texto: `${a.codigo ?? ''} ${a.servico}`.trim() })),
        ...agenda.filter((g) => g.cliente_id === c.id).map((g) => ({ data: g.data, texto: g.titulo })),
      ].sort((x, y) => x.data.localeCompare(y.data));
      return {
        c, abertos,
        proximo: datas[0] ?? null,
        faturado: concl.reduce((s, a) => s + (Number(a.valor) || 0), 0),
        aReceber: concl.filter((a) => !a.pago && !a.pagamento_informado).reduce((s, a) => s + (Number(a.valor) || 0), 0),
        aConferir: concl.filter((a) => !a.pago && a.pagamento_informado).reduce((s, a) => s + (Number(a.valor) || 0), 0),
      };
    })
    // mais urgentes primeiro: prazo mais perto, depois quem deve
    .sort((a, b) => (a.proximo?.data ?? '9999').localeCompare(b.proximo?.data ?? '9999') || b.aReceber - a.aReceber),
  [clientes, pedidos, agenda, filtroEtiqueta]);

  const totais = linhas.reduce((s, l) => ({ f: s.f + l.faturado, r: s.r + l.aReceber, a: s.a + l.abertos.length }), { f: 0, r: 0, a: 0 });

  async function excel() {
    setBaixando(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Clientes', { views: [{ state: 'frozen', ySplit: 2 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
      const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;
      ws.mergeCells('A1:H1');
      const t = ws.getCell('A1');
      t.value = `${config.marca || 'MC Jurídico'} · Clientes, pedidos e prazos · ${dataBR(hojeISO())}`;
      t.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(config.cor_primaria || '#0E1B33') } };
      ws.getRow(1).height = 26;
      const cab = ws.addRow(['Cliente', 'Contato', 'Etiquetas', 'Pedidos em aberto', 'Próximo prazo', 'Situação do prazo', 'Faturado', 'A receber']);
      cab.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(config.cor_destaque || '#A8894E') } }; c.alignment = { vertical: 'middle' }; });
      for (const l of linhas) {
        const p = situacaoPrazo(l.proximo?.data);
        const r = ws.addRow([
          `${l.c.nome}${l.c.responsavel ? `\n${l.c.responsavel}` : ''}`,
          [l.c.telefone, l.c.email].filter(Boolean).join('\n'),
          (l.c.etiquetas ?? []).join(', '),
          l.abertos.map((a) => `${a.codigo ?? ''} ${a.servico} (${rotulo(STATUS, a.status)})`).join('\n') || '—',
          l.proximo ? `${dataBR(l.proximo.data)} · ${l.proximo.texto}` : '—',
          l.proximo ? p.rotulo.split(' · ')[1] ?? '' : '',
          l.faturado,
          l.aReceber,
        ]);
        r.alignment = { wrapText: true, vertical: 'top' };
        if (l.proximo) {
          const cor = p.nivel === 3 ? 'FFF8D7D5' : p.nivel === 2 ? 'FFFDEBC8' : 'FFDDF0DE';
          [5, 6].forEach((i) => { r.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cor } }; r.getCell(i).font = { bold: true, color: { argb: argb(p.cor) } }; });
        }
        if (l.aReceber > 0) { r.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8D7D5' } }; r.getCell(8).font = { bold: true, color: { argb: 'FFB3261E' } }; }
        if ((l.c.etiquetas ?? []).length) r.getCell(3).font = { bold: true, color: { argb: argb(corEtiqueta(l.c.etiquetas![0])) } };
        [7, 8].forEach((i) => { r.getCell(i).numFmt = '"R$" #,##0.00'; });
      }
      const tot = ws.addRow(['Total', '', '', `${totais.a} em aberto`, '', '', totais.f, totais.r]);
      tot.font = { bold: true };
      [7, 8].forEach((i) => { tot.getCell(i).numFmt = '"R$" #,##0.00'; });
      tot.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF0F4' } }; });
      ws.columns = [{ width: 30 }, { width: 24 }, { width: 18 }, { width: 46 }, { width: 34 }, { width: 16 }, { width: 14 }, { width: 14 }];
      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = `clientes-${hojeISO()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="adm-linha nao-imprimir" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Tabela de clientes{filtroEtiqueta ? ` · ${filtroEtiqueta}` : ''}</h2>
        <span className="adm-linha">
          <button className="adm-btn pri" onClick={() => window.print()}>Imprimir / PDF</button>
          <button className="adm-btn" onClick={excel} disabled={baixando}>{baixando ? 'Gerando…' : 'Baixar Excel'}</button>
          <button className="adm-btn" onClick={fechar}>← Voltar</button>
        </span>
      </div>
      <p className="adm-dica nao-imprimir" style={{ margin: 0 }}>Ordem: prazos mais próximos primeiro. 🔴 atrasado ou hoje · 🟠 até 3 dias · 🟢 no prazo.</p>

      <article className="relatorio tabela-clientes" style={{ ['--rel-cor' as string]: config.cor_primaria, ['--rel-ouro' as string]: config.cor_destaque }}>
        <header className="rel-topo">
          <div><div className="rel-marca">{config.marca || config.nome}</div><div>Clientes, pedidos e prazos</div></div>
          <div className="rel-contato"><div>{dataBR(hojeISO())}</div><div>{linhas.length} cliente(s) · {totais.a} pedido(s) em aberto</div></div>
        </header>
        <table className="tc">
          <thead>
            <tr><th>Cliente</th><th>Pedidos em aberto</th><th>Próximo prazo</th><th className="num">Faturado</th><th className="num">A receber</th></tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const p = situacaoPrazo(l.proximo?.data);
              return (
                <tr key={l.c.id}>
                  <td>
                    <strong>{l.c.nome}</strong>
                    {l.c.responsavel && <div className="tc-sub">{l.c.responsavel}</div>}
                    {l.c.telefone && <div className="tc-sub">{l.c.telefone}</div>}
                    <div>{(l.c.etiquetas ?? []).map((e) => <span key={e} className="etq" style={{ ['--cor' as string]: corEtiqueta(e), marginRight: 3 }}>{e}</span>)}</div>
                  </td>
                  <td>
                    {l.abertos.length ? l.abertos.map((a) => (
                      <div key={a.id} className="tc-pedido">
                        <span className="etq" style={{ ['--cor' as string]: COR_STATUS[a.status] ?? '#5b6780' }}>{rotulo(STATUS, a.status)}</span> <strong>{a.codigo}</strong> {a.servico}
                      </div>
                    )) : <span className="tc-sub">—</span>}
                  </td>
                  <td style={{ background: l.proximo ? `color-mix(in srgb, ${p.cor} 14%, white)` : undefined, color: l.proximo ? p.cor : undefined }}>
                    {l.proximo ? <><strong>{p.rotulo}</strong><div className="tc-sub" style={{ color: 'inherit' }}>{l.proximo.texto}</div></> : '—'}
                  </td>
                  <td className="num">{brl(l.faturado)}</td>
                  <td className="num" style={{ color: l.aReceber ? '#b3261e' : undefined, fontWeight: l.aReceber ? 700 : 400, background: l.aReceber ? '#fbe9e8' : undefined }}>
                    {brl(l.aReceber)}
                    {l.aConferir > 0 && <div className="tc-sub" style={{ color: '#00796b' }}>+ {brl(l.aConferir)} a conferir</div>}
                  </td>
                </tr>
              );
            })}
            <tr className="orc-total"><td>Total</td><td>{totais.a} em aberto</td><td /><td className="num">{brl(totais.f)}</td><td className="num">{brl(totais.r)}</td></tr>
          </tbody>
        </table>
      </article>
    </div>
  );
}
