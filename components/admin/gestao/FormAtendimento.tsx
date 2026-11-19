'use client';
// Formulário de serviço realizado / demanda (usado em Clientes e no Financeiro).
// Extras: checklist de documentos do serviço, comprovante de pagamento e aviso automático ao cliente
// quando a situação muda.
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { linhas } from '@/lib/util';
import { enviarPrivado, linkEnvio, linkPrivado } from '@/lib/arquivos';
import NotasPedido from './NotasPedido';
import EnviosPedido from './EnviosPedido';
import HistoricoPedido from './HistoricoPedido';
import { msgPedirDocumentos, msgStatus } from '@/lib/mensagens';
import { FORMAS_PAGAMENTO, STATUS, brl, dataBR, ehDiaUtil, hojeISO, kmComarca, nomeFeriado, somarDiasUteis, valorDeslocamento, whatsDoTelefone, type Atendimento, type Cliente } from '@/lib/gestao';
import { notificarCliente } from '@/lib/push';
import type { Comarca } from '@/lib/tipos';

const TITULO_ETAPA: Record<string, string> = {
  orcamento: '📝 Orçamento pronto', aguardando_docs: '📂 Aguardando seus documentos', a_fazer: '📌 Pedido recebido',
  andamento: '⚙️ Pedido em andamento', concluido: '✅ Pedido concluído', cancelado: 'Pedido cancelado',
};

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
    prazo: inicial?.prazo ?? '',
    visivel_cliente: inicial?.visivel_cliente ?? true,
    comarca: inicial?.comarca ?? '',
    deslocamento: inicial?.deslocamento ? String(inicial.deslocamento) : '',
  });
  const [comarcas, setComarcas] = useState<Comarca[]>([]);
  const [km, setKm] = useState<{ km_valor?: number; km_franquia?: number; km_ida_volta?: boolean }>({});
  const [push, setPush] = useState('');
  const [feitos, setFeitos] = useState<string[]>(inicial?.checklist_feito ?? []);
  const [comprovante, setComprovante] = useState<string | null>(inicial?.comprovante ?? null);
  const [arquivoComp, setArquivoComp] = useState<File | null>(null);
  const [checklists, setChecklists] = useState<Record<string, string>>({});
  const [prazos, setPrazos] = useState<Record<string, number>>({});
  const [salvo, setSalvo] = useState<{ codigo: string; status: string } | null>(null);
  const [comArea, setComArea] = useState(true);
  const [comAvaliacao, setComAvaliacao] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null); // mensagem pronta para o cliente
  const mudar = (campo: string, valor: any) => setV((x) => ({ ...x, [campo]: valor }));

  // Checklist cadastrado em cada serviço (painel > Serviços)
  useEffect(() => {
    supabase().from('servicos').select('nome, checklist, prazo_dias').then(({ data }) => {
      const mapa: Record<string, string> = {};
      const dias: Record<string, number> = {};
      for (const s of (data ?? []) as { nome: string; checklist: string | null; prazo_dias?: number | null }[]) {
        if (s.checklist) mapa[s.nome] = s.checklist;
        if (s.prazo_dias) dias[s.nome] = s.prazo_dias;
      }
      setChecklists(mapa);
      setPrazos(dias);
    });
    // Comarcas e regra do deslocamento (R$ por km acima da franquia)
    supabase().from('comarcas').select('*').eq('ativo', true).order('ordem').then(({ data }) => setComarcas((data as Comarca[]) ?? []));
    supabase().from('configuracoes').select('km_valor, km_franquia, km_ida_volta').eq('id', 1).maybeSingle().then(({ data }) => setKm((data as any) ?? {}));
  }, []);
  const baseComarca = comarcas.find((c) => c.tipo === 'base');
  const comarcaSel = comarcas.find((c) => c.nome === v.comarca);
  const sugestaoDesl = comarcaSel && comarcaSel.tipo !== 'base' ? valorDeslocamento(kmComarca(comarcaSel, baseComarca).km, km) : null;

  const itens = linhas(checklists[v.servico] || '');
  const faltando = itens.filter((i) => !feitos.includes(i));
  const cliente = clientes.find((c) => c.id === v.cliente_id);
  const prazoPadrao = prazos[v.servico];

  // Escolheu o serviço: o prazo é calculado sozinho (em dias úteis) se ainda estiver vazio
  function escolherServico(nome: string) {
    setV((x) => ({ ...x, servico: nome, prazo: !x.prazo && prazos[nome] ? somarDiasUteis(x.data || hojeISO(), prazos[nome]) : x.prazo }));
  }
  const numero = (t: string) => Number(String(t).replace(/\./g, '').replace(',', '.')) || 0;
  const valorNum = numero(v.valor);
  const deslNum = numero(v.deslocamento);
  function escolherComarca(nome: string) {
    const c = comarcas.find((x) => x.nome === nome);
    const d = c && c.tipo !== 'base' ? valorDeslocamento(kmComarca(c, baseComarca).km, km).valor : 0;
    trocarDeslocamento(d, nome);
  }
  // O deslocamento entra no valor do pedido (o valor é sempre o total cobrado)
  function trocarDeslocamento(novo: number, comarca?: string) {
    const fmt = (n: number) => n.toFixed(2).replace('.', ',');
    setV((x) => {
      const antes = numero(x.deslocamento), total = numero(x.valor) - antes + novo;
      return { ...x, comarca: comarca ?? x.comarca, deslocamento: novo ? fmt(novo) : '', valor: total > 0 ? fmt(total) : '' };
    });
  }

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
        deslocamento: deslNum,
        data_pagamento: v.pago ? (v.data_pagamento || hojeISO()) : null,
        prazo: v.prazo || null,
        pagamento_informado: v.pago ? false : (inicial?.pagamento_informado ?? false),
        checklist_feito: feitos.filter((f) => itens.includes(f)),
        comprovante: caminhoComp,
      };
      const r = inicial?.id
        ? await supabase().from('atendimentos').update(dados).eq('id', inicial.id).select('codigo').single()
        : await supabase().from('atendimentos').insert(dados).select('codigo').single();
      if (r.error) throw r.error;
      avisar('Serviço salvo');
      const codigoSalvo = (r.data as any)?.codigo ?? '';

      // Notificação automática no celular do cliente (se ele ativou na área dele)
      const mudouEtapa = !inicial?.id || inicial.status !== v.status;
      if (cliente && mudouEtapa && v.visivel_cliente && v.status !== 'cancelado' && cliente.acesso_token) {
        notificarCliente({
          cliente_id: cliente.id,
          titulo: TITULO_ETAPA[v.status] ?? 'Novidade no seu pedido',
          corpo: `${codigoSalvo ? `${codigoSalvo} · ` : ''}${v.servico}${v.status === 'concluido' && !v.pago && valorNum ? ` · ${brl(valorNum)} a pagar` : ''}`,
          caminho: `/cliente/${cliente.acesso_token}`,
          tag: `pedido-${codigoSalvo}`,
        }).then((x) => { if (x.enviados) setPush(`🔔 Notificação enviada para ${x.enviados} aparelho${x.enviados > 1 ? 's' : ''} do cliente.`); });
      }

      // Mudou a situação? Oferece avisar o cliente pelo WhatsApp.
      const mudouStatus = !inicial?.id || inicial.status !== v.status;
      if (cliente?.telefone && mudouStatus && textoAviso(v.status, (r.data as any)?.codigo ?? '', false, false)) {
        setSalvo({ codigo: (r.data as any)?.codigo ?? '', status: v.status });
        setAviso('sim');
      } else aoSalvar();
    } catch (err: any) {
      avisar(`Erro: ${err.message}. Rodou o atualizacao-17.sql?`, true);
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

  // Mensagem do aviso, com link da área do cliente e pedido de avaliação (opcionais)
  function textoAviso(status: string, codigo: string, area: boolean, avaliacao: boolean) {
    if (!cliente) return '';
    const origem = typeof window !== 'undefined' ? window.location.origin : '';
    const nome = cliente.responsavel || cliente.nome;
    return msgStatus({
      nome, servico: v.servico, status, codigo, valor: valorNum > 0 ? brl(valorNum) : '', pago: v.pago,
      faltando: status === 'a_fazer' || status === 'aguardando_docs' ? faltando : [],
      prazo: v.prazo ? dataBR(v.prazo) : '',
      linkArea: area && cliente.acesso_token ? `${origem}/cliente/${cliente.acesso_token}` : '',
      linkAvaliacao: avaliacao && status === 'concluido' ? `${origem}/avaliar?n=${encodeURIComponent(nome)}${codigo ? `&p=${encodeURIComponent(codigo)}` : ''}` : '',
    });
  }

  if (aviso && cliente && salvo) {
    const rotuloStatus = STATUS.find((s) => s.valor === salvo.status)?.rotulo ?? salvo.status;
    const texto = textoAviso(salvo.status, salvo.codigo, comArea, comAvaliacao);
    async function marcarAvaliacao() {
      if (salvo?.status === 'concluido' && comAvaliacao && cliente) await supabase().from('clientes').update({ avaliacao_pedida_em: new Date().toISOString() }).eq('id', cliente.id);
    }
    return (
      <div className="adm-item mudou">
        <h3>Avisar {cliente.nome}?</h3>
        <p className="adm-dica" style={{ margin: 0 }}>O serviço mudou para <strong>{rotuloStatus}</strong>. A mensagem já está pronta:</p>
        {push && <p className="adm-dica" style={{ margin: 0, color: '#2e7d32' }}>{push}</p>}
        <div className="adm-linha">
          {cliente.acesso_token && <label className="adm-check"><input type="checkbox" checked={comArea} onChange={(e) => setComArea(e.target.checked)} /> Incluir link da área do cliente</label>}
          {salvo.status === 'concluido' && <label className="adm-check"><input type="checkbox" checked={comAvaliacao} onChange={(e) => setComAvaliacao(e.target.checked)} /> Pedir avaliação ⭐</label>}
        </div>
        <pre className="previa-msg">{texto}</pre>
        <div className="adm-linha">
          <a className="adm-btn pri" href={whatsDoTelefone(cliente.telefone, texto)} target="_blank" rel="noopener noreferrer" onClick={() => { marcarAvaliacao(); setTimeout(aoSalvar, 300); }}>Avisar no WhatsApp</a>
          <button className="adm-btn" onClick={aoSalvar}>Agora não</button>
        </div>
      </div>
    );
  }

  return (
    <form className="adm-item mudou" onSubmit={salvar}>
      <h3>{inicial?.id ? <>Pedido <span className="codigo">{inicial.codigo || `#${inicial.id}`}</span></> : 'Novo pedido'}</h3>

      {inicial?.pagamento_informado && !v.pago && (
        <div className="pag-informado">
          <strong>💰 O cliente informou o pagamento (a conferir)</strong>
          <div className="adm-linha">
            {inicial.comprovante_cliente && (
              <button type="button" className="adm-btn peq" onClick={async () => { try { window.open(await linkEnvio(inicial.comprovante_cliente!), '_blank', 'noopener'); } catch (e: any) { avisar(e.message, true); } }}>Ver comprovante</button>
            )}
            <button type="button" className="adm-btn pri peq" onClick={() => setV((x) => ({ ...x, pago: true, data_pagamento: hojeISO() }))}>Confirmar pagamento</button>
          </div>
          <span className="adm-dica" style={{ margin: 0 }}>Depois de confirmar, clique em Salvar.</span>
        </div>
      )}
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
          <input value={v.servico} onChange={(e) => escolherServico(e.target.value)} list="lista-servicos" required placeholder="Escolha ou digite" />
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
        <label>
          Prazo de entrega (opcional)
          <input type="date" value={v.prazo || ''} onChange={(e) => mudar('prazo', e.target.value)} />
          {prazoPadrao && (
            <span className="adm-dica" style={{ margin: '4px 0 0' }}>
              Padrão: {prazoPadrao} dia{prazoPadrao > 1 ? 's' : ''} útil{prazoPadrao > 1 ? 'eis' : ''}.{' '}
              <button type="button" className="link-btn" onClick={() => mudar('prazo', somarDiasUteis(v.data || hojeISO(), prazoPadrao))}>Recalcular</button>
            </span>
          )}
          {v.prazo && !ehDiaUtil(v.prazo) && (
            <span className="adm-dica" style={{ margin: '4px 0 0', color: '#b3261e' }}>⚠️ {nomeFeriado(v.prazo) || 'Fim de semana'} — não é dia útil.</span>
          )}
        </label>
        <label>Nº do processo (opcional)<input value={v.processo} onChange={(e) => mudar('processo', e.target.value)} /></label>
        {comarcas.length > 0 && (
          <label>
            Comarca (deslocamento)
            <select value={v.comarca || ''} onChange={(e) => escolherComarca(e.target.value)}>
              <option value="">Não informar</option>
              {comarcas.map((c) => <option key={c.id} value={c.nome}>{c.nome}{c.tipo === 'base' ? ' (base)' : ''}</option>)}
            </select>
            {sugestaoDesl && (
              <span className="adm-dica" style={{ margin: '4px 0 0' }}>
                {sugestaoDesl.km} km{kmComarca(comarcaSel!, baseComarca).estimado ? ' (estimado)' : ''} · {sugestaoDesl.valor > 0 ? `deslocamento ${brl(sugestaoDesl.valor)}` : 'dentro da franquia, sem custo'}
              </span>
            )}
          </label>
        )}
        {(v.comarca || deslNum > 0) && (
          <label>
            Deslocamento incluso (R$)
            <input inputMode="decimal" defaultValue={v.deslocamento} key={v.comarca} onBlur={(e) => trocarDeslocamento(numero(e.target.value))} placeholder="0,00" />
            {deslNum > 0 && (
              <span className="adm-dica" style={{ margin: '4px 0 0' }}>
                Já somado no valor: serviço {brl(valorNum - deslNum)} + deslocamento {brl(deslNum)}
              </span>
            )}
          </label>
        )}
        <label className="adm-check"><input type="checkbox" checked={v.visivel_cliente} onChange={(e) => mudar('visivel_cliente', e.target.checked)} /> Aparece na área do cliente</label>
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

      {inicial?.id && <EnviosPedido pedidoId={inicial.id} avisar={avisar} />}
      {inicial?.id && <HistoricoPedido pedidoId={inicial.id} />}
      {inicial?.id && <NotasPedido pedidoId={inicial.id} avisar={avisar} />}
      {!inicial?.id && <p className="adm-dica" style={{ margin: 0 }}>Depois de salvar, abra o pedido para adicionar observações internas, texto, ditado ou áudio.</p>}

      <div className="adm-linha">
        <button className="adm-btn pri" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        <button className="adm-btn" type="button" onClick={aoCancelar}>Cancelar</button>
        {inicial?.id && <button className="adm-btn perigo" type="button" onClick={excluir}>Excluir</button>}
      </div>
    </form>
  );
}
