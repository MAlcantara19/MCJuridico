'use client';
// Visão rápida: visitas, cliques no WhatsApp, assistente e solicitações (últimos 30 dias).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { brl, dataBR, hojeISO, intervalo, somarDias, type Atendimento, type Compromisso } from '@/lib/gestao';

type Numeros = { visita: number; whatsapp: number; assistente: number; novas: number; total: number };

export default function AbaResumo({ nome, irPara }: { nome: string; irPara: (aba: string) => void }) {
  const [n, setN] = useState<Numeros | null>(null);
  const [agenda, setAgenda] = useState<Compromisso[]>([]);
  const [cliquesTop, setCliquesTop] = useState<[string, number][]>([]);
  const [mes, setMes] = useState<{ faturado: number; aReceber: number } | null>(null);

  // Agenda de hoje (e atrasados) + dinheiro do mês
  useEffect(() => {
    (async () => {
      const hoje = hojeISO();
      const [ini, fim] = intervalo('mes');
      const [g, a] = await Promise.all([
        supabase().from('agenda').select('*').eq('feito', false).lte('data', somarDias(hoje, 1)).order('data').order('hora', { nullsFirst: true }).limit(8),
        supabase().from('atendimentos').select('valor, status, pago, data').eq('status', 'concluido'),
      ]);
      setAgenda((g.data as Compromisso[]) ?? []);
      const lista = (a.data as Atendimento[]) ?? [];
      setMes({
        faturado: lista.filter((x) => x.data >= ini && x.data <= fim).reduce((s, x) => s + (Number(x.valor) || 0), 0),
        aReceber: lista.filter((x) => !x.pago).reduce((s, x) => s + (Number(x.valor) || 0), 0),
      });
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const contar = (tipo: string) =>
        supabase().from('cliques').select('id', { count: 'exact', head: true }).eq('tipo', tipo).gte('criado_em', desde);
      const [v, w, a, novas, total] = await Promise.all([
        contar('visita'),
        contar('whatsapp'),
        contar('assistente'),
        supabase().from('solicitacoes').select('id', { count: 'exact', head: true }).eq('status', 'nova'),
        supabase().from('solicitacoes').select('id', { count: 'exact', head: true }).gte('criado_em', desde),
      ]);
      // Quais serviços/pacotes mais levaram ao WhatsApp
      const det = await supabase().from('cliques').select('detalhe').eq('tipo', 'whatsapp').gte('criado_em', desde).not('detalhe', 'is', null).limit(2000);
      const cont = new Map<string, number>();
      for (const x of (det.data ?? []) as { detalhe: string }[]) if (x.detalhe) cont.set(x.detalhe, (cont.get(x.detalhe) ?? 0) + 1);
      setCliquesTop(Array.from(cont.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8));
      setN({ visita: v.count ?? 0, whatsapp: w.count ?? 0, assistente: a.count ?? 0, novas: novas.count ?? 0, total: total.count ?? 0 });
    })();
  }, []);

  const cartoes = n ? [
    { rotulo: 'Visitas', valor: n.visita, dica: 'pessoas que abriram o site' },
    { rotulo: 'Cliques no WhatsApp', valor: n.whatsapp, dica: 'contatos iniciados pelo site' },
    { rotulo: 'Assistente aberto', valor: n.assistente, dica: 'vezes que usaram o chat' },
    { rotulo: 'Solicitações', valor: n.total, dica: 'pedidos pelo formulário' },
  ] : [];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Olá{nome ? `, ${nome.split(' ')[0]}` : ''}</h2>
        <p className="adm-sub">Sua agenda, o dinheiro do mês e como o site está indo.</p>
      </div>
      <div className="adm-grade">
        <div className="adm-item">
          <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Hoje e amanhã</h3>
            <button className="adm-btn peq" onClick={() => irPara('agenda')}>Agenda</button>
          </div>
          {agenda.length === 0 && <p className="adm-dica" style={{ margin: 0 }}>Nada pendente.</p>}
          {agenda.map((g) => (
            <div key={g.id} style={{ fontSize: '0.92rem', color: g.data < hojeISO() ? '#b3261e' : undefined }}>
              <strong>{g.data < hojeISO() ? `Atrasado (${dataBR(g.data)})` : g.data === hojeISO() ? 'Hoje' : 'Amanhã'}{g.hora ? ` ${g.hora.slice(0, 5)}` : ''}</strong> · {g.titulo}
            </div>
          ))}
        </div>
        <div className="adm-item" style={{ gap: 2 }}>
          <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
            <span className="adm-dica" style={{ margin: 0 }}>Faturado este mês</span>
            <button className="adm-btn peq" onClick={() => irPara('financeiro')}>Financeiro</button>
          </div>
          <strong className="numero">{brl(mes?.faturado ?? 0)}</strong>
          <span className="adm-dica" style={{ margin: 0, color: mes?.aReceber ? '#b3261e' : undefined }}>{brl(mes?.aReceber ?? 0)} a receber no total</span>
        </div>
      </div>

      <h3 style={{ margin: '8px 0 -6px' }}>Site (últimos 30 dias)</h3>
      {!n && <p className="adm-sub">Carregando…</p>}
      {n && (
        <>
          <div className="adm-grade">
            {cartoes.map((c) => (
              <div key={c.rotulo} className="adm-item" style={{ gap: 2 }}>
                <span className="adm-dica" style={{ margin: 0 }}>{c.rotulo}</span>
                <strong style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '2.6rem', lineHeight: 1.1 }}>{c.valor}</strong>
                <span className="adm-dica" style={{ margin: 0 }}>{c.dica}</span>
              </div>
            ))}
          </div>
          {cliquesTop.length > 0 && (
            <div className="adm-item">
              <h3>O que mais levou ao WhatsApp</h3>
              <ul className="ranking">
                {cliquesTop.map(([nome, qtd]) => (
                  <li key={nome}>
                    <div className="ranking-topo"><span>{nome}</span><strong>{qtd}</strong></div>
                    <div className="ranking-barra"><span style={{ width: `${(qtd / cliquesTop[0][1]) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {n.novas > 0 && (
            <div className="adm-item mudou">
              <strong>{n.novas} {n.novas > 1 ? 'solicitações esperando' : 'solicitação esperando'} resposta</strong>
              <div><button className="adm-btn pri" onClick={() => irPara('solicitacoes')}>Ver solicitações</button></div>
            </div>
          )}
          <div className="adm-item">
            <h3>Atalhos</h3>
            <div className="adm-linha">
              <button className="adm-btn" onClick={() => irPara('arquivos')}>Meus arquivos</button>
              <button className="adm-btn" onClick={() => irPara('documentos')}>PDF no site</button>
              <button className="adm-btn" onClick={() => irPara('servicos')}>Editar preços</button>
              <button className="adm-btn" onClick={() => irPara('visual')}>Mudar visual</button>
              <button className="adm-btn" onClick={() => irPara('perguntas')}>Respostas do assistente</button>
              <button className="adm-btn" onClick={() => irPara('relatorio')}>Relatório de diligência</button>
              <button className="adm-btn" onClick={async () => {
                const link = `${window.location.origin}/links`;
                try { await navigator.clipboard.writeText(link); alert(`Link copiado: ${link}`); } catch { prompt('Copie o link da bio:', link); }
              }}>Copiar link da bio</button>
              <a className="adm-btn" href="/story" target="_blank" rel="noopener noreferrer">Stories para o Instagram</a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
