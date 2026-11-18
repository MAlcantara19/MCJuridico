'use client';
// Formulário da página "Para empresas": salva a solicitação no painel e abre o WhatsApp organizado.
import { useRef, useState, type FormEvent } from 'react';
import type { Config } from '@/lib/tipos';
import { linkWhats } from '@/lib/util';
import { CONTATO } from '@/lib/mensagens';
import { supabase } from '@/lib/supabase';
import { registrar } from '@/lib/estatisticas';

const VOLUMES = ['Algumas horas por mês', 'Cerca de 10 horas/mês', 'Cerca de 20 horas/mês', '30 horas/mês ou mais', 'Ainda não sei'];

export default function FormEmpresa({ config: c, servicos, pacotes }: { config: Config; servicos: string[]; pacotes: string[] }) {
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
      `Empresa: ${v('empresa')}${v('ramo') ? ` (${v('ramo')})` : ''}`,
      `Responsável: ${v('responsavel')}`,
      v('cidade') && `Cidade: ${v('cidade')}`,
      `Volume: ${v('volume')}`,
      v('detalhes') && `Detalhes: ${v('detalhes')}`,
    ].filter(Boolean).join('\n');
    setEnviando(true);
    await supabase().from('solicitacoes').insert({ nome: `${v('responsavel')} · ${v('empresa')}`, contato: v('whatsapp'), email: v('email'), servico, mensagem, status: 'nova' });
    setEnviando(false);
    setEnviado(true);
    registrar('whatsapp', false, 'Página para empresas');
    const texto = [
      `Olá, ${CONTATO}! 👋`,
      'Tenho uma empresa e vim pela sua página para empresas. 🏢',
      '',
      `💼 *${servico}*`,
      ...mensagem.split('\n').map((l) => `• ${l}`),
      '',
      'Poderia me passar como funciona e os valores? 😊',
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
      <label>Empresa<input name="empresa" required autoComplete="organization" /></label>
      <label>Ramo (opcional)<input name="ramo" placeholder="Ex.: loja de roupas, clínica, oficina" /></label>
      <label>Seu nome<input name="responsavel" required autoComplete="name" /></label>
      <label>WhatsApp<input name="whatsapp" required inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" /></label>
      <label>E-mail (opcional)<input name="email" type="email" autoComplete="email" /></label>
      <label>Cidade (opcional)<input name="cidade" autoComplete="address-level2" /></label>
      <label>
        O que precisa
        <select name="servico" required defaultValue="">
          <option value="" disabled>Escolha</option>
          {servicos.map((s) => <option key={s}>{s}</option>)}
          {pacotes.map((p) => <option key={p}>{p}</option>)}
          <option>Outro serviço</option>
        </select>
      </label>
      <label>
        Quanto de ajuda por mês
        <select name="volume" required defaultValue="">
          <option value="" disabled>Escolha</option>
          {VOLUMES.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className="inteiro">Detalhes<textarea name="detalhes" placeholder="Ex.: quero organizar contas a pagar e receber e responder clientes no WhatsApp…" /></label>
      <label className="inteiro consentimento">
        <input type="checkbox" name="aceite" required />
        <span>Concordo com o uso dos dados para responder a este pedido, conforme a <a href="/privacidade" target="_blank">política de privacidade</a>.</span>
      </label>
      <input className="armadilha" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="inteiro"><button type="submit" className="btn btn-navy" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar pelo WhatsApp'}</button></div>
    </form>
  );
}
