'use client';
// Despesas (custas, cópias, transporte...) para o Financeiro mostrar o lucro de verdade.
// "Repassar ao cliente" marca o que deve ser cobrado de volta (custas e taxas, por exemplo).
import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { enviarPrivado, linkPrivado } from '@/lib/arquivos';
import { CATEGORIAS_DESPESA, brl, dataBR, hojeISO, type Cliente, type Despesa } from '@/lib/gestao';

type Props = { lista: Despesa[]; clientes: Cliente[]; avisar: (m: string, e?: boolean) => void; recarregar: () => void };

export default function Despesas({ lista, clientes, avisar, recarregar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const nomeCliente = (id: number | null) => clientes.find((c) => c.id === id)?.nome ?? '';

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setSalvando(true);
    try {
      const arquivo = f.get('comprovante') as File | null;
      const comprovante = arquivo && arquivo.size ? await enviarPrivado(arquivo) : null;
      const { error } = await supabase().from('despesas').insert({
        data: String(f.get('data') || hojeISO()),
        descricao: String(f.get('descricao') || '').trim(),
        categoria: String(f.get('categoria') || 'Outros'),
        valor: Number(String(f.get('valor') || '0').replace(/\./g, '').replace(',', '.')) || 0,
        cliente_id: f.get('cliente_id') ? Number(f.get('cliente_id')) : null,
        repassar: f.get('repassar') === 'on',
        comprovante,
      });
      if (error) throw error;
      form.reset();
      setAberto(false);
      avisar('Despesa registrada');
      recarregar();
    } catch (err: any) {
      avisar(`Erro: ${err.message}. Rodou o atualizacao-11.sql?`, true);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(d: Despesa) {
    if (!confirm('Excluir esta despesa?')) return;
    const { error } = await supabase().from('despesas').delete().eq('id', d.id);
    if (error) return avisar(error.message, true);
    recarregar();
  }

  async function verComprovante(d: Despesa) {
    if (!d.comprovante) return;
    try { window.open(await linkPrivado(d.comprovante, 120), '_blank', 'noopener'); } catch (e: any) { avisar(e.message, true); }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Despesas do período</h3>
        <button className="adm-btn pri peq" onClick={() => setAberto(!aberto)}>{aberto ? 'Fechar' : '+ Registrar despesa'}</button>
      </div>

      {aberto && (
        <form className="adm-item mudou" onSubmit={salvar}>
          <div className="adm-grade">
            <label>Data<input type="date" name="data" defaultValue={hojeISO()} required /></label>
            <label>Categoria<select name="categoria">{CATEGORIAS_DESPESA.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Valor (R$)<input name="valor" inputMode="decimal" required placeholder="Ex.: 12,40" /></label>
            <label>
              Cliente (opcional)
              <select name="cliente_id" defaultValue="">
                <option value="">Nenhum</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            <label style={{ gridColumn: '1 / -1' }}>Descrição<input name="descricao" required placeholder="Ex.: cópias do processo no Fórum de Três Rios" /></label>
            <label>Comprovante (opcional)<input type="file" name="comprovante" accept="image/*,application/pdf" /></label>
            <label className="adm-check"><input type="checkbox" name="repassar" /> Repassar ao cliente (reembolso)</label>
          </div>
          <div><button className="adm-btn pri" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar despesa'}</button></div>
        </form>
      )}

      {lista.length === 0 && <p className="adm-sub" style={{ margin: 0 }}>Nenhuma despesa neste período.</p>}
      <div className="adm-lista">
        {lista.map((d) => (
          <div key={d.id} className="adm-item cli-linha" style={{ cursor: 'default' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: 'block' }}>{d.descricao}</strong>
              <span className="adm-dica" style={{ margin: 0 }}>
                {dataBR(d.data)} · {d.categoria}{d.cliente_id ? ` · ${nomeCliente(d.cliente_id)}` : ''}
              </span>
            </span>
            <span style={{ textAlign: 'right', display: 'grid', gap: 4, justifyItems: 'end' }}>
              <strong>-{brl(d.valor)}</strong>
              {d.repassar && <span className="etiqueta">Repassar</span>}
              <span className="adm-linha">
                {d.comprovante && <button className="adm-btn peq" onClick={() => verComprovante(d)}>Comprovante</button>}
                <button className="adm-btn peq perigo" onClick={() => excluir(d)} aria-label="Excluir despesa">×</button>
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
