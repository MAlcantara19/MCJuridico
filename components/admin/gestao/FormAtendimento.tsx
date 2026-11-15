'use client';
// Formulário de serviço realizado / demanda (usado em Clientes e no Financeiro).
// Extras: checklist de documentos do serviço, comprovante de pagamento e aviso automático ao cliente
// quando a situação muda.
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { linhas } from '@/lib/util';
import { enviarPrivado, linkPrivado } from '@/lib/arquivos';
import { msgPedirDocumentos, msgStatus } from '@/lib/mensagens';
import { FORMAS_PAGAMENTO, STATUS, brl, hojeISO, whatsDoTelefone, type Atendimento, type Cliente } from '@/lib/gestao';

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
  const [feitos, setFeitos] = useState<string[]>(inicial?.checklist_feito ?? []);
  const [comprovante, setComprovante] = useState<string | null>(inicial?.comprovante ?? null);
  const [arquivoComp, setArquivoComp] = useState<File | null>(null);
  const [checklists, setChecklists] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null); // mensagem pronta para o cliente
  const mudar = (campo: string, valor: any) => setV((x) => ({ ...x, [campo]: valor }));

  // Checklist cadastrado em cada serviço (painel > Serviços)
  useEffect(() => {
    supabase().from('servicos').select('nome, checklist').then(({ data }) => {
      const mapa: Record<string, string> = {};
      for (const s of (data ?? []) as { nome: string; checklist: string | null }[]) if (s.checklist) mapa[s.nome] = s.checklist;
      setChecklists(mapa);
    });
  }, []);

  const itens = linhas(checklists[v.servico] || '');
  const faltando = itens.filter((i) => !feitos.includes(i));
  const cliente = clientes.find((c) => c.id === v.cliente_id);
  const valorNum = Number(String(v.valor).replace(/\./g, '').replace(',', '.')) || 0;

  function pedirDocumentos() {
    if (!cliente?.telefone) return avisar('Cadastre o WhatsApp do cliente para pedir os documentos.', true);
    window.open(whatsDoTelefone(cliente.telefone, msgPedirDocumentos({ nome: cliente.responsavel || cliente.nome, servico: v.servico, faltando })), '_blank', 'noopener');
  }

  async function abrirComprovante() {
    if (!comprovante) return;
    try { window.open(await linkPrivado(comprovante, 120), '_blank', 'noopener'); } catch (e: any) { avisar(e.message, true); }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      let caminhoComp = comprovante;
      if (arquivoComp) {
        if (arquivoComp.size > 10 * 1024 * 1024) throw new Error('Comprovante maior que 10 MB.');
        caminhoComp = await enviarPrivado(arquivoComp);
      }
      const dados = {
        ...v,
        valor: valorNum,
        data_pagamento: v.pago ? (v.data_pagamento || hojeISO()) : null,
        checklist_feito: feitos.filter((f) => itens.includes(f)),
        comprovante: caminhoComp,
      };
      const r = inicial?.id
        ? await supabase().from('atendimentos').update(dados).eq('id', inicial.id)
        : await supabase().from('atendimentos').insert(dados);
      if (r.error) throw r.error;
      avisar('Serviço salvo');

      // Mudou a situação? Oferece avisar o cliente pelo WhatsApp.
      const mudouStatus = !inicial?.id || inicial.status !== v.status;
      const texto = cliente?.telefone && mudouStatus
        ? msgStatus({ nome: cliente.responsavel || cliente.nome, servico: v.servico, status: v.status, valor: brl(valorNum), pago: v.pago, faltando: v.status === 'a_fazer' ? faltando : [] })
        : '';
      if (texto) setAviso(texto);
      else aoSalvar();
    } catch (err: any) {
      avisar(`Erro: ${err.message}. Rodou o atualizacao-11.sql?`, true);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!inicial?.id || !confirm('Excluir este serviço?')) return;
    const { error } = await supabase().from('atendimentos').delete().eq('id', inicial.id);
    if (error) return avisar(error.message, true);
    avisar('Excluído');
    aoSalvar();
  }

  if (aviso && cliente) {
    const rotuloStatus = STATUS.find((s) => s.valor === v.status)?.rotulo ?? v.status;
    return (
      <div className="adm-item mudou">
        <h3>Avisar {cliente.nome}?</h3>
        <p className="adm-dica" style={{ margin: 0 }}>O serviço mudou para <strong>{rotuloStatus}</strong>. A mensagem já está pronta:</p>
        <pre className="previa-msg">{aviso}</pre>
        <div className="adm-linha">
          <a className="adm-btn pri" href={whatsDoTelefone(cliente.telefone, aviso)} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(aoSalvar, 300)}>Avisar no WhatsApp</a>
          <button className="adm-btn" onClick={aoSalvar}>Agora não</button>
        </div>
      </div>
    );
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
            <label>
              Comprovante (opcional)
              <input type="file" accept="image/*,application/pdf" onChange={(e) => setArquivoComp(e.target.files?.[0] ?? null)} />
              {comprovante && !arquivoComp && (
                <span className="adm-linha" style={{ marginTop: 4 }}>
                  <button type="button" className="adm-btn peq" onClick={abrirComprovante}>Ver comprovante</button>
                  <button type="button" className="adm-btn peq perigo" onClick={() => setComprovante(null)}>Tirar</button>
                </span>
              )}
            </label>
          </>
        )}
        <label style={{ gridColumn: '1 / -1' }}>O que foi feito<textarea value={v.descricao} onChange={(e) => mudar('descricao', e.target.value)} placeholder="Ex.: protocolo da petição inicial no Fórum de Três Rios" /></label>
      </div>

      {itens.length > 0 && (
        <div className="checklist-adm">
          <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
            <strong>📂 Checklist do serviço ({itens.length - faltando.length}/{itens.length})</strong>
            {faltando.length > 0 && cliente?.telefone && (
              <button type="button" className="adm-btn peq" onClick={pedirDocumentos}>Pedir o que falta no WhatsApp</button>
            )}
          </div>
          {itens.map((i) => (
            <label key={i} className="adm-check">
              <input type="checkbox" checked={feitos.includes(i)} onChange={(e) => setFeitos((f) => (e.target.checked ? [...f, i] : f.filter((x) => x !== i)))} />
              <span style={{ textDecoration: feitos.includes(i) ? 'line-through' : undefined }}>{i}</span>
            </label>
          ))}
        </div>
      )}

      <div className="adm-linha">
        <button className="adm-btn pri" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        <button className="adm-btn" type="button" onClick={aoCancelar}>Cancelar</button>
        {inicial?.id && <button className="adm-btn perigo" type="button" onClick={excluir}>Excluir</button>}
      </div>
    </form>
  );
}
