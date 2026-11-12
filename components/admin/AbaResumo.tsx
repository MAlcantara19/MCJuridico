'use client';
// Visão rápida: visitas, cliques no WhatsApp, assistente e solicitações (últimos 30 dias).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Numeros = { visita: number; whatsapp: number; assistente: number; novas: number; total: number };

export default function AbaResumo({ nome, irPara }: { nome: string; irPara: (aba: string) => void }) {
  const [n, setN] = useState<Numeros | null>(null);

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
        <p className="adm-sub">Números dos últimos 30 dias. Suas próprias visitas logada não entram na conta.</p>
      </div>
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
