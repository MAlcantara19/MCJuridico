'use client';
// Área do cliente: pedidos com etapas e prazo, envio de documentos e comprovante,
// Pix para pagar, recibos, orçamentos e horas do pacote.
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Config } from '@/lib/tipos';
import { supabase } from '@/lib/supabase';
import { linhas, linkWhats } from '@/lib/util';
import { COR_STATUS, STATUS, brl, dataBR, definirFeriadosExtras, pixDe, rotulo, situacaoPrazo, type Atendimento, type Cliente, type FeriadoExtra } from '@/lib/gestao';
import { ativarNotificacoes, desativarNotificacoes, inscricaoAtual, precisaInstalar, pushDisponivel } from '@/lib/push';
import { estiloMarca } from '@/components/site/PaginaSimples';
import Recibo from '@/components/admin/gestao/Recibo';
import BotaoInstalar from '@/components/admin/BotaoInstalar';
import { CONTATO } from '@/lib/mensagens';

type Pedido = {
  id: number; codigo: string; servico: string; descricao: string; processo: string; status: string;
  data: string; prazo: string | null; valor: number; pago: boolean; data_pagamento: string | null; forma_pagamento: string;
  pagamento_informado: boolean; checklist: string | null; checklist_feito: string[] | null;
  envios: { nome: string; tipo: string; criado_em: string }[];
  historico?: { status: string; criado_em: string }[];
};
type Orcamento = { numero: string; total: number; status: string; criado_em: string; itens: { nome: string; qtd: number; valor: number }[]; validade_dias: number };
type Dados = { cliente: { nome: string; responsavel: string }; pedidos: Pedido[]; orcamentos: Orcamento[]; horas: { contratadas: number; usadas: number } | null };

// Linha do tempo do pedido
const ETAPAS = [
  { id: 'recebido', rotulo: 'Recebido', status: ['orcamento', 'a_fazer', 'aguardando_docs'] },
  { id: 'andamento', rotulo: 'Em andamento', status: ['andamento'] },
  { id: 'concluido', rotulo: 'Concluído', status: ['concluido'] },
  { id: 'pago', rotulo: 'Pago', status: [] as string[] },
];
// Data em que o pedido chegou em cada etapa (vem do histórico gravado pelo banco)
function datasEtapas(p: Pedido) {
  const h = p.historico ?? [];
  const primeira = (lista: string[]) => h.find((x) => lista.includes(x.status))?.criado_em;
  const curta = (d?: string | null) => (d ? new Date(d.length > 10 ? d : `${d}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '');
  return [curta(h[0]?.criado_em || p.data), curta(primeira(['andamento'])), curta(primeira(['concluido'])), curta(p.pago ? p.data_pagamento : null)];
}
function etapaAtual(p: Pedido) {
  if (p.status === 'concluido') return p.pago ? 3 : 2;
  if (p.status === 'andamento') return 1;
  return 0;
}

const LIMITE_MB = 15;

// Botão para receber avisos no celular (etapa do pedido e lembrete de prazo)
function BotaoAvisos({ token, pin }: { token: string; pin: string }) {
  const [estado, setEstado] = useState<'carregando' | 'indisponivel' | 'instalar' | 'desligado' | 'ligado'>('carregando');
  const [erro, setErro] = useState('');
  useEffect(() => {
    if (precisaInstalar()) return setEstado('instalar');
    if (!pushDisponivel()) return setEstado('indisponivel');
    inscricaoAtual(`/cliente/${token}`).then((s) => setEstado(s && Notification.permission === 'granted' ? 'ligado' : 'desligado'));
  }, [token]);

  if (estado === 'carregando' || estado === 'indisponivel') return null;
  if (estado === 'instalar') return <p className="ac-sub ac-avisos">🔔 Para receber avisos no iPhone, toque em <strong>Compartilhar › Adicionar à Tela de Início</strong> e abra pelo ícone.</p>;
  return (
    <div className="ac-avisos">
      {estado === 'ligado' ? (
        <>
          <span>🔔 Avisos ligados neste celular: você recebe quando o pedido mudar de etapa e um dia útil antes dos prazos.</span>
          <button className="link-btn" onClick={async () => { await desativarNotificacoes(token, pin); setEstado('desligado'); }}>Desligar</button>
        </>
      ) : (
        <button className="ac-btn ac-btn-linha" onClick={async () => {
          setErro('');
          try { await ativarNotificacoes(token, pin); setEstado('ligado'); } catch (e: any) { setErro(e.message); }
        }}>🔔 Receber avisos no celular</button>
      )}
      {erro && <span className="ac-erro">{erro}</span>}
    </div>
  );
}

export default function AreaCliente({ token, config, feriados }: { token: string; config: Config; feriados?: FeriadoExtra[] }) {
  useMemo(() => { if (feriados) definirFeriadosExtras(feriados); }, [feriados]);
  const chavePin = `mc-pin-${token.slice(0, 8)}`;
  const [pin, setPin] = useState('');
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [enviando, setEnviando] = useState<string>('');
  const [recibo, setRecibo] = useState<Pedido | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [lembrar, setLembrar] = useState(false);

  async function entrar(codigo: string) {
    setEntrando(true);
    setErro('');
    const { data, error } = await supabase().rpc('cliente_area', { token, pin: codigo });
    setEntrando(false);
    if (error) {
      setErro(/bloqueado/i.test(error.message) ? 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' : 'Não foi possível entrar agora. Tente de novo em instantes.');
      return;
    }
    if (!data) {
      setErro('Código incorreto. Confira a mensagem que você recebeu no WhatsApp.');
      try { sessionStorage.removeItem(chavePin); localStorage.removeItem(chavePin); } catch {}
      return;
    }
    setPin(codigo);
    setDados(data as Dados);
    try { sessionStorage.setItem(chavePin, codigo); } catch {}
    try { if (lembrar) localStorage.setItem(chavePin, codigo); } catch {}
  }

  // Lembra o código enquanto a aba estiver aberta
  useEffect(() => {
    try { const salvo = sessionStorage.getItem(chavePin) || localStorage.getItem(chavePin); if (salvo) entrar(salvo); } catch {}
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: `/cliente/${token}` }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function enviar(p: Pedido, arquivos: FileList | null, tipo: 'documento' | 'comprovante') {
    if (!arquivos?.length) return;
    setEnviando(`${p.id}-${tipo}`);
    try {
      for (const arq of Array.from(arquivos)) {
        if (arq.size > LIMITE_MB * 1024 * 1024) throw new Error(`"${arq.name}" passa de ${LIMITE_MB} MB.`);
        const limpo = arq.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
        const caminho = `${token}/${p.codigo || p.id}-${Date.now()}-${limpo}`;
        const up = await supabase().storage.from('envios').upload(caminho, arq, { contentType: arq.type || undefined, upsert: false });
        if (up.error) throw up.error;
        const r = await supabase().rpc('cliente_registrar_envio', { token, pin, pedido: p.id, nome: arq.name, caminho, tamanho: arq.size, tipo });
        if (r.error || !r.data) throw new Error('Não foi possível registrar o arquivo.');
      }
      await entrar(pin);
    } catch (e: any) {
      alert(e.message || 'Erro ao enviar. Tente de novo.');
    } finally {
      setEnviando('');
    }
  }

  async function copiarPix(p: Pedido, codigo: string) {
    try { await navigator.clipboard.writeText(codigo); setCopiado(p.id); setTimeout(() => setCopiado(null), 2500); } catch { prompt('Copie o código Pix:', codigo); }
  }

  const estilo = estiloMarca(config) as CSSProperties;

  // ---------- Tela do código ----------
  if (!dados) {
    return (
      <div className="ac" style={estilo}>
        <form className="ac-login" onSubmit={(e) => { e.preventDefault(); entrar(String(new FormData(e.currentTarget).get('pin') || '').trim()); }}>
          <p className="ac-marca">{config.marca || config.nome}</p>
          <h1>Área do cliente</h1>
          <p>Digite o código de 4 dígitos que você recebeu no WhatsApp.</p>
          <input name="pin" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoComplete="one-time-code" required aria-label="Código de acesso" className="ac-pin" />
          <label className="ac-lembrar"><input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} /> Lembrar neste celular</label>
          {erro && <p className="ac-erro" role="alert">{erro}</p>}
          <button className="ac-btn" type="submit" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
          <a className="ac-link" href={linkWhats(config.whatsapp, `Olá, ${CONTATO}! 👋\nNão estou conseguindo entrar na área do cliente. Pode me ajudar? 😊`)} target="_blank" rel="noopener noreferrer">Perdi o código</a>
        </form>
      </div>
    );
  }

  // ---------- Recibo ----------
  if (recibo) {
    const a = { ...recibo, cliente_id: null, criado_em: recibo.data } as unknown as Atendimento;
    const c = { nome: dados.cliente.nome, responsavel: dados.cliente.responsavel } as Cliente;
    return (
      <div className="adm" style={{ padding: 16, minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Recibo atendimento={a} cliente={c} config={config} fechar={() => setRecibo(null)} publico />
        </div>
      </div>
    );
  }

  const abertos = dados.pedidos.filter((p) => p.status !== 'concluido' || !p.pago);
  const finalizados = dados.pedidos.filter((p) => p.status === 'concluido' && p.pago);
  const nome = (dados.cliente.responsavel || dados.cliente.nome).split(' ')[0];

  const Cartao = ({ p }: { p: Pedido }) => {
    const etapa = etapaAtual(p);
    const datas = datasEtapas(p);
    const itens = linhas(p.checklist || '');
    const feitos = p.checklist_feito ?? [];
    const prazo = situacaoPrazo(p.prazo, p.status === 'concluido');
    const aPagar = p.status === 'concluido' && !p.pago;
    const pix = aPagar && !p.pagamento_informado ? pixDe(config, Number(p.valor) || 0, p.codigo) : '';
    const cor = p.status === 'concluido' ? (p.pago ? '#2e7d32' : p.pagamento_informado ? '#00796b' : '#b3261e') : COR_STATUS[p.status] ?? '#5b6780';
    const situacao = p.status === 'concluido' ? (p.pago ? 'Pago' : p.pagamento_informado ? 'Pagamento em conferência' : 'Aguardando pagamento') : rotulo(STATUS, p.status);

    return (
      <article className="ac-pedido" style={{ borderTopColor: cor }}>
        <header>
          <div>
            <span className="ac-codigo">{p.codigo}</span>
            <h3>{p.servico}</h3>
            <span className="ac-sub">Pedido em {dataBR(p.data)}{p.processo ? ` · Proc. ${p.processo}` : ''}</span>
          </div>
          <span className="ac-chip" style={{ background: cor }}>{situacao}</span>
        </header>

        <ol className="ac-etapas" aria-label="Etapas do pedido">
          {ETAPAS.map((e, i) => <li key={e.id} className={i <= etapa ? 'feita' : ''}><span />{e.rotulo}{i <= etapa && datas[i] && <small>{datas[i]}</small>}</li>)}
        </ol>

        <div className="ac-info">
          {p.prazo && p.status !== 'concluido' && <div><span>Prazo</span><strong style={{ color: prazo.cor }}>{dataBR(p.prazo)}</strong></div>}
          {Number(p.valor) > 0 && <div><span>Valor</span><strong>{brl(p.valor)}</strong></div>}
          {p.pago && p.data_pagamento && <div><span>Pago em</span><strong>{dataBR(p.data_pagamento)}</strong></div>}
        </div>
        {p.descricao && <p className="ac-desc">{p.descricao}</p>}

        {itens.length > 0 && p.status !== 'concluido' && (
          <div className="ac-bloco">
            <strong>📂 Documentos necessários</strong>
            <ul className="ac-check">{itens.map((i) => <li key={i} className={feitos.includes(i) ? 'ok' : ''}>{feitos.includes(i) ? '✓' : '○'} {i}</li>)}</ul>
          </div>
        )}

        {p.envios.length > 0 && (
          <div className="ac-bloco">
            <strong>📎 Arquivos enviados</strong>
            <ul className="ac-envios">{p.envios.map((e, i) => <li key={i}>{e.tipo === 'comprovante' ? '💰' : '📄'} {e.nome} <span>{dataBR(e.criado_em.slice(0, 10))}</span></li>)}</ul>
          </div>
        )}

        <div className="ac-acoes">
          {p.status !== 'concluido' && (
            <label className="ac-btn ac-btn-linha">
              {enviando === `${p.id}-documento` ? 'Enviando…' : '📤 Enviar documentos'}
              <input type="file" multiple hidden onChange={(e) => { enviar(p, e.target.files, 'documento'); e.target.value = ''; }} />
            </label>
          )}
          {p.pago && <button className="ac-btn ac-btn-linha" onClick={() => setRecibo(p)}>🧾 Recibo</button>}
        </div>

        {aPagar && !p.pagamento_informado && (
          <div className="ac-pagar">
            <strong>💠 Pagar com Pix</strong>
            {pix ? (
              <>
                <code>{pix}</code>
                <button className="ac-btn" onClick={() => copiarPix(p, pix)}>{copiado === p.id ? '✓ Código copiado!' : 'Copiar código Pix'}</button>
                <span className="ac-sub">Abra o app do banco › Pix › Pix copia e cola. O valor já vem preenchido.</span>
              </>
            ) : (
              <span className="ac-sub">Fale comigo no WhatsApp para receber os dados de pagamento.</span>
            )}
            <label className="ac-btn ac-btn-linha">
              {enviando === `${p.id}-comprovante` ? 'Enviando…' : '✅ Já paguei: enviar comprovante'}
              <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => { enviar(p, e.target.files, 'comprovante'); e.target.value = ''; }} />
            </label>
          </div>
        )}
        {aPagar && p.pagamento_informado && <p className="ac-sub" style={{ color: '#00796b' }}>✅ Recebemos seu comprovante. Assim que for conferido, o recibo fica disponível aqui.</p>}
      </article>
    );
  };

  return (
    <div className="ac" style={estilo}>
      <header className="ac-topo">
        <div className="ac-topo-inner">
          <div>
            <p className="ac-marca">{config.marca || config.nome}</p>
            <h1>Olá, {nome}!</h1>
            <p className="ac-sub" style={{ color: 'rgba(255,255,255,.75)' }}>{dados.cliente.nome}</p>
          </div>
          <div className="ac-topo-acoes">
          <BotaoInstalar classe="ac-btn ac-btn-linha" estilo={{}} oQue="esta página" rotulo="📲 Instalar no celular" />
          <a className="ac-btn" href={linkWhats(config.whatsapp, `Olá, ${CONTATO}! 👋\nSou ${dados.cliente.nome} e estou na minha área do cliente.\n\nPoderia me ajudar? 😊`)} target="_blank" rel="noopener noreferrer">💬 Falar no WhatsApp</a>
          </div>
        </div>
      </header>

      <main className="ac-corpo">
        <BotaoAvisos token={token} pin={pin} />
        {dados.horas && Number(dados.horas.contratadas) > 0 && (() => {
          const pct = Math.min(100, (dados.horas!.usadas / Number(dados.horas!.contratadas)) * 100);
          return (
            <section className="ac-pedido" style={{ borderTopColor: config.cor_destaque }}>
              <h3>⏱️ Horas do seu pacote neste mês</h3>
              <p style={{ margin: '6px 0' }}><strong>{dados.horas!.usadas.toFixed(1).replace('.', ',')}h</strong> usadas de {Number(dados.horas!.contratadas).toString().replace('.', ',')}h</p>
              <div className="ac-barra"><span style={{ width: `${pct}%`, background: pct >= 90 ? '#b3261e' : undefined }} /></div>
            </section>
          );
        })()}

        <h2>Pedidos em aberto ({abertos.length})</h2>
        {!abertos.length && <p className="ac-sub">Nenhum pedido em aberto no momento. 😊</p>}
        {abertos.map((p) => <Cartao key={p.id} p={p} />)}

        {dados.orcamentos.length > 0 && (
          <>
            <h2>Orçamentos</h2>
            {dados.orcamentos.map((o) => (
              <article key={o.numero} className="ac-pedido" style={{ borderTopColor: '#6a3fb5' }}>
                <header>
                  <div><span className="ac-codigo">Nº {o.numero}</span><h3>{brl(o.total)}</h3><span className="ac-sub">{dataBR(o.criado_em.slice(0, 10))}</span></div>
                  <span className="ac-chip" style={{ background: o.status === 'aprovado' ? '#2e7d32' : o.status === 'recusado' ? '#5b6780' : '#6a3fb5' }}>{o.status[0].toUpperCase() + o.status.slice(1)}</span>
                </header>
                <ul className="ac-envios">{(o.itens ?? []).map((i, k) => <li key={k}>{i.qtd > 1 ? `${i.qtd}x ` : ''}{i.nome} <span>{brl(i.qtd * i.valor)}</span></li>)}</ul>
                {o.status === 'enviado' && (
                  <a className="ac-btn" href={linkWhats(config.whatsapp, `Olá, ${CONTATO}! 👋\nQuero aprovar o orçamento nº *${o.numero}* (${brl(o.total)}). ✅\n\nComo seguimos? 😊`)} target="_blank" rel="noopener noreferrer">Aprovar pelo WhatsApp</a>
                )}
              </article>
            ))}
          </>
        )}

        {finalizados.length > 0 && (
          <>
            <h2>Concluídos e pagos ({finalizados.length})</h2>
            {finalizados.map((p) => <Cartao key={p.id} p={p} />)}
          </>
        )}

        <p className="ac-rodape">{config.aviso_legal}</p>
      </main>
    </div>
  );
}
