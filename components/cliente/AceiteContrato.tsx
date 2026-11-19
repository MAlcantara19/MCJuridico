'use client';
// Botão de aceite do contrato (fica registrado nome, data e hora) e confirmação pelo WhatsApp.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { linkWhats } from '@/lib/util';
import { CONTATO } from '@/lib/mensagens';

export default function AceiteContrato({ token, numero, status, aceitoEm, nomeInicial, whatsapp }: {
  token: string; numero: string; status: string; aceitoEm?: string | null; nomeInicial: string; whatsapp: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [li, setLi] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const router = useRouter();
  const zap = linkWhats(whatsapp, `Olá, ${CONTATO}! 👋\nLi e *ACEITO* o contrato nº ${numero}. ✅`);

  if (status === 'aceito') {
    return (
      <div className="adm-item nao-imprimir" style={{ borderLeft: '5px solid #2e7d32' }}>
        <strong style={{ color: '#2e7d32' }}>✓ Contrato aceito{aceitoEm ? ` em ${new Date(aceitoEm).toLocaleString('pt-BR')}` : ''}.</strong>
        <div className="adm-linha"><button className="adm-btn" onClick={() => window.print()}>Salvar em PDF</button></div>
      </div>
    );
  }

  async function aceitar() {
    setErro('');
    setEnviando(true);
    const { data, error } = await supabase().rpc('contrato_aceitar', { token, nome });
    setEnviando(false);
    if (error || !data) return setErro('Não foi possível registrar agora. Tente de novo ou responda ACEITO no WhatsApp.');
    window.open(zap, '_blank', 'noopener');
    router.refresh();
  }

  return (
    <div className="adm-item mudou nao-imprimir">
      <h2 style={{ margin: 0 }}>Contrato nº {numero}</h2>
      <p className="adm-sub" style={{ margin: 0 }}>Leia o contrato abaixo. Se estiver tudo certo, confirme seu nome e toque em “Li e aceito”.</p>
      <label>Seu nome completo<input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" /></label>
      <label className="adm-check"><input type="checkbox" checked={li} onChange={(e) => setLi(e.target.checked)} /> Li e concordo com todas as cláusulas</label>
      {erro && <p className="ac-erro" role="alert">{erro}</p>}
      <div className="adm-linha">
        <button className="adm-btn pri" disabled={!li || nome.trim().length < 3 || enviando} onClick={aceitar}>{enviando ? 'Registrando…' : '✅ Li e aceito'}</button>
        <button className="adm-btn" onClick={() => window.print()}>Salvar em PDF</button>
        <a className="adm-btn" href={linkWhats(whatsapp, `Olá, ${CONTATO}! 👋\nTenho uma dúvida sobre o contrato nº ${numero}.`)} target="_blank" rel="noopener noreferrer">Tirar dúvida</a>
      </div>
    </div>
  );
}
