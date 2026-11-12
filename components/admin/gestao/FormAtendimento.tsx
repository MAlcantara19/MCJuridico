'use client';
// Formulário de serviço realizado / demanda (usado em Clientes e no Financeiro).
import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { FORMAS_PAGAMENTO, STATUS, hojeISO, type Atendimento, type Cliente } from '@/lib/gestao';

type Props = {
  inicial?: Partial<Atendimento>;
  clientes: Cliente[];
  servicos: string[];
  avisar: (m: string, e?: boolean) => void;
  aoSalvar: () => void;
  aoCancelar: () => void;
};

export default function FormAtendimento({ inicial, clientes, servicos, avisar, aoSalvar, aoCancelar }: Props) {
  const [v, setV] = useState({
    cliente_id: inicial?.cliente_id ?? (clientes[0]?.id ?? null),
    servico: inicial?.servico ?? '',
    descricao: inicial?.descricao ?? '',
    processo: inicial?.processo ?? '',
    data: inicial?.data ?? hojeISO(),
    valor: inicial?.valor != null ? String(inicial.valor) : '',
    status: inicial?.status ?? 'concluido',
    pago: inicial?.pago ?? false,
    data_pagamento: inicial?.data_pagamento ?? '',
    forma_pagamento: inicial?.forma_pagamento ?? 'Pix',
  });
  const [salvando, setSalvando] = useState(false);
  const mudar = (campo: string, valor: any) => setV((x) => ({ ...x, [campo]: valor }));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const valor = Number(String(v.valor).replace(/\./g, '').replace(',', '.')) || 0;
    const dados = {
      ...v,
      valor,
      data_pagamento: v.pago ? (v.data_pagamento || hojeISO()) : null,
    };
    setSalvando(true);
    const r = inicial?.id
      ? await supabase().from('atendimentos').update(dados).eq('id', inicial.id)
      : await supabase().from('atendimentos').insert(dados);
    setSalvando(false);
    if (r.error) return avisar(`Erro: ${r.error.message}`, true);
    avisar('Serviço salvo');
    aoSalvar();
  }

  async function excluir() {
    if (!inicial?.id || !confirm('Excluir este serviço?')) return;
    const { error } = await supabase().from('atendimentos').delete().eq('id', inicial.id);
    if (error) return avisar(error.message, true);
    avisar('Excluído');
    aoSalvar();
  }

  return (
    <form className="adm-item mudou" onSubmit={salvar}>
      <h3>{inicial?.id ? 'Editar serviço' : 'Novo serviço'}</h3>
      <div className="adm-grade">
        <label>
          Cliente
          <select value={v.cliente_id ?? ''} onChange={(e) => mudar('cliente_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">Sem cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label>
          Serviço
          <input value={v.servico} onChange={(e) => mudar('servico', e.target.value)} list="lista-servicos" required placeholder="Escolha ou digite" />
          <datalist id="lista-servicos">{servicos.map((s) => <option key={s} value={s} />)}</datalist>
        </label>
        <label>Data<input type="date" value={v.data} onChange={(e) => mudar('data', e.target.value)} required /></label>
        <label>Valor (R$)<input inputMode="decimal" value={v.valor} onChange={(e) => mudar('valor', e.target.value)} placeholder="Ex.: 120,00" /></label>
        <label>
          Situação
          <select value={v.status} onChange={(e) => mudar('status', e.target.value)}>
            {STATUS.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
          </select>
        </label>
        <label>Nº do processo (opcional)<input value={v.processo} onChange={(e) => mudar('processo', e.target.value)} /></label>
        <label className="adm-check"><input type="checkbox" checked={v.pago} onChange={(e) => mudar('pago', e.target.checked)} /> Já foi pago</label>
        {v.pago && (
          <>
            <label>Data do pagamento<input type="date" value={v.data_pagamento || hojeISO()} onChange={(e) => mudar('data_pagamento', e.target.value)} /></label>
            <label>
              Forma
              <select value={v.forma_pagamento} onChange={(e) => mudar('forma_pagamento', e.target.value)}>
                {FORMAS_PAGAMENTO.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
          </>
        )}
        <label style={{ gridColumn: '1 / -1' }}>O que foi feito<textarea value={v.descricao} onChange={(e) => mudar('descricao', e.target.value)} placeholder="Ex.: protocolo da petição inicial no Fórum de Três Rios" /></label>
      </div>
      <div className="adm-linha">
        <button className="adm-btn pri" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        <button className="adm-btn" type="button" onClick={aoCancelar}>Cancelar</button>
        {inicial?.id && <button className="adm-btn perigo" type="button" onClick={excluir}>Excluir</button>}
      </div>
    </form>
  );
}
