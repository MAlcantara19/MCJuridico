'use client';
// Formulário da página "Para escritórios": salva a solicitação no painel e abre o WhatsApp organizado.
import { useRef, useState, type FormEvent } from 'react';
import type { Config } from '@/lib/tipos';
import { linkWhats } from '@/lib/util';
import { supabase } from '@/lib/supabase';
import { registrar } from '@/lib/estatisticas';

export default function FormEscritorio({ config: c, servicos, pacote }: { config: Config; servicos: string[]; pacote?: string }) {
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const abertoEm = useRef(Date.now());

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('site') || Date.now() - abertoEm.current < 3000) return; // anti-robô
    const v = (k: string) => String(f.get(k) || '').trim();
    const servico = v('servico');
    const mensagem = [
      `Escritório: ${v('escritorio')}`,
      `Advogado(a): ${v('advogado')}${v('oab') ? ` (OAB ${v('oab')})` : ''}`,
      v('processo') && `Processo: ${v('processo')}`,
      `Comarca: ${v('comarca')}`,
      v('prazo') && `Prazo: ${v('prazo').split('-').reverse().join('/')}`,
      v('detalhes') && `Detalhes: ${v('detalhes')}`,
    ].filter(Boolean).join('\n');
    setEnviando(true);
    await supabase().from('solicitacoes').insert({ nome: `${v('advogado')} · ${v('escritorio')}`, contato: v('whatsapp'), email: v('email'), servico, mensagem, status: 'nova' });
    setEnviando(false);
    setEnviado(true);
    registrar('whatsapp', false, 'Página para escritórios');
    const texto = [
      'Olá, Maria Carolina! 👋',
      'Sou de um escritório de advocacia e vim pela sua página para escritórios. ⚖️',
      '',
      `💼 *${servico}*`,
      ...mensagem.split('\n').map((l) => `• ${l}`),
      '',
      'Poderia confirmar disponibilidade e valor? 😊',
    ].join('\n');
    window.open(linkWhats(c.whatsapp, texto), '_blank', 'noopener');
  }

  if (enviado) {
    return (
      <div className="aviso-ok" role="status">
        <strong>Pedido enviado. ✅</strong>
        <p style={{ margin: '6px 0 0' }}>Se o WhatsApp não abriu, fale comigo pelo {c.whatsapp_exibicao || 'WhatsApp'}.</p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={enviar}>
      <label>Escritório<input name="escritorio" required autoComplete="organization" /></label>
      <label>Advogado(a) responsável<input name="advogado" required autoComplete="name" /></label>
      <label>OAB (opcional)<input name="oab" placeholder="Ex.: 123456/MG" /></label>
      <label>WhatsApp<input name="whatsapp" required inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" /></label>
      <label className="inteiro">E-mail (opcional)<input name="email" type="email" autoComplete="email" /></label>
      <label>
        Diligência
        <select name="servico" required defaultValue="">
          <option value="" disabled>Escolha</option>
          {servicos.map((s) => <option key={s}>{s}</option>)}
          {pacote && <option>{pacote}</option>}
          <option>Outra diligência</option>
        </select>
      </label>
      <label>Comarca<input name="comarca" required list="comarcas" placeholder="Ex.: Três Rios/RJ" /></label>
      <datalist id="comarcas"><option value="Três Rios/RJ" /><option value="Paraíba do Sul/RJ" /></datalist>
      <label>Nº do processo (opcional)<input name="processo" placeholder="0000000-00.0000.8.19.0000" /></label>
      <label>Prazo (opcional)<input name="prazo" type="date" /></label>
      <label className="inteiro">Detalhes<textarea name="detalhes" placeholder="O que precisa ser feito, vara, documentos que vão ser enviados…" /></label>
      <label className="inteiro consentimento">
        <input type="checkbox" name="aceite" required />
        <span>Concordo com o uso dos dados para responder a este pedido, conforme a <a href="/privacidade" target="_blank">política de privacidade</a>.</span>
      </label>
      <input className="armadilha" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="inteiro"><button type="submit" className="btn btn-navy" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar pelo WhatsApp'}</button></div>
    </form>
  );
}
