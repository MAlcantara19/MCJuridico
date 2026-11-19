'use client';
// Master › Notificações: confere se as chaves estão na Vercel e guarda o código do lembrete automático.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Notificacoes({ avisar }: { avisar: (m: string, e?: boolean) => void }) {
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [codigo, setCodigo] = useState('');
  const [aparelhos, setAparelhos] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/push').then((r) => r.json()).then((j) => setConfigurado(!!j.configurado)).catch(() => setConfigurado(false));
    supabase().from('segredos').select('cron_token').eq('id', 1).maybeSingle().then(({ data }) => setCodigo((data as any)?.cron_token || ''));
    supabase().from('push_inscricoes').select('id', { count: 'exact', head: true }).then(({ count }) => setAparelhos(count ?? 0));
  }, []);

  async function salvar() {
    if (codigo.trim().length < 32) return avisar('O código precisa ter pelo menos 32 caracteres (use o CRON_SECRET da Vercel).', true);
    const { error } = await supabase().from('segredos').upsert({ id: 1, cron_token: codigo.trim() });
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-17.sql?`, true);
    avisar('Código do lembrete salvo');
  }
  function gerar() {
    const b = new Uint8Array(24);
    crypto.getRandomValues(b);
    setCodigo(Array.from(b, (x) => x.toString(16).padStart(2, '0')).join(''));
  }

  return (
    <div className="adm-item">
      <h3>🔔 Notificações e lembrete automático</h3>
      <p className="adm-dica" style={{ margin: 0 }}>
        Chaves na Vercel: {configurado === null ? 'conferindo…' : configurado ? <strong style={{ color: '#2e7d32' }}>✓ configuradas</strong> : <strong style={{ color: '#b3261e' }}>faltando (NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY)</strong>}
        {aparelhos !== null && <> · {aparelhos} aparelho{aparelhos === 1 ? '' : 's'} de clientes com avisos ligados</>}
      </p>
      <label>
        Código do lembrete (o mesmo valor do CRON_SECRET na Vercel)
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="cole aqui o CRON_SECRET" spellCheck={false} />
      </label>
      <div className="adm-linha">
        <button className="adm-btn pri" onClick={salvar}>Salvar código</button>
        {!codigo && <button className="adm-btn" onClick={gerar}>Gerar um código novo</button>}
      </div>
      <p className="adm-dica" style={{ margin: 0 }}>Todo dia às 8h a Vercel chama o lembrete: os clientes com avisos ligados recebem no celular os compromissos e prazos do próximo dia útil.</p>
    </div>
  );
}
