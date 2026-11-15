'use client';
// Gera o link secreto da agenda para assinar no Google Agenda ou no iPhone.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function novoCodigo() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export default function AgendaCelular({ avisar }: { avisar: (m: string, e?: boolean) => void }) {
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    supabase().from('segredos').select('agenda_token').eq('id', 1).maybeSingle().then(({ data, error }) => {
      if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-13.sql?`, true);
      setCodigo(data?.agenda_token || '');
    });
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function gerar() {
    if (codigo && !confirm('Gerar um link novo? O link antigo para de funcionar (precisa assinar de novo no celular).')) return;
    const novo = novoCodigo();
    const { error } = await supabase().from('segredos').upsert({ id: 1, agenda_token: novo });
    if (error) return avisar(error.message, true);
    setCodigo(novo);
    avisar('Link da agenda criado');
  }

  const host = typeof window !== 'undefined' ? window.location.host : '';
  const link = codigo ? `https://${host}/api/agenda/${codigo}.ics` : '';

  async function copiar() {
    try { await navigator.clipboard.writeText(link); avisar('Link copiado'); } catch { prompt('Copie o link:', link); }
  }

  return (
    <div className="adm-item">
      <button className="adm-linha" style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', justifyContent: 'space-between', width: '100%' }} onClick={() => setAberto(!aberto)}>
        <strong>📱 Ver esta agenda no celular (Google Agenda / iPhone)</strong>
        <span>{aberto ? '−' : '+'}</span>
      </button>
      {aberto && (
        <>
          {codigo ? (
            <>
              <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link da agenda" />
              <div className="adm-linha">
                <button className="adm-btn pri peq" onClick={copiar}>Copiar link</button>
                <a className="adm-btn peq" href={link.replace('https://', 'webcal://')}>Abrir no iPhone / Mac</a>
                <button className="adm-btn peq perigo" onClick={gerar}>Gerar link novo</button>
              </div>
              <div className="adm-dica" style={{ margin: 0, lineHeight: 1.7 }}>
                <strong>Google Agenda (Android ou computador):</strong> abra calendar.google.com no computador › “Outras agendas” › “+” › “Do URL” › cole o link. Em algumas horas aparece no celular também.<br />
                <strong>iPhone:</strong> toque em “Abrir no iPhone” e confirme “Assinar”, ou vá em Ajustes › Calendário › Contas › Adicionar conta › Outra › Adicionar calendário assinado.<br />
                O calendário atualiza sozinho (o Google pode levar algumas horas). Não compartilhe o link: quem tiver ele vê a agenda.
              </div>
            </>
          ) : codigo === '' ? (
            <div><button className="adm-btn pri" onClick={gerar}>Criar link da agenda</button></div>
          ) : (
            <p className="adm-dica">Carregando…</p>
          )}
        </>
      )}
    </div>
  );
}
