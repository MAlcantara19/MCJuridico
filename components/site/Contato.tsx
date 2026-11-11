'use client';
// Contatos + formulário de solicitação (salva no painel e abre o WhatsApp).
import { useState, type FormEvent } from 'react';
import type { Dados } from '@/lib/tipos';
import { linkWhats } from '@/lib/util';
import { supabase } from '@/lib/supabase';
import { IconeEmail, IconeInsta, IconeWhats } from './Icones';
import { registrar } from '@/lib/estatisticas';

export default function Contato({ dados }: { dados: Dados }) {
  const c = dados.config;
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('site')) return; // armadilha anti-robô
    const pedido = {
      nome: String(f.get('nome') || '').trim(),
      contato: String(f.get('contato') || '').trim(),
      email: String(f.get('email') || '').trim(),
      servico: String(f.get('servico') || ''),
      mensagem: String(f.get('mensagem') || '').trim(),
      status: 'nova',
    };
    setEnviando(true);
    setErro('');
    const { error } = await supabase().from('solicitacoes').insert(pedido);
    setEnviando(false);
    if (error) {
      setErro('Não foi possível registrar agora. Use o botão do WhatsApp ao lado.');
      return;
    }
    setEnviado(true);
    const texto = `Olá, Maria Carolina! Sou ${pedido.nome}.\n\nServiço: ${pedido.servico}\n${pedido.mensagem}\n\nContato: ${pedido.contato}`;
    window.open(linkWhats(c.whatsapp, texto), '_blank', 'noopener');
  }

  const nomesServicos = dados.servicos.map((s) => s.nome);

  return (
    <section id="contato" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Solicite um serviço</h2>
          <p>Conte o que você precisa. A mensagem chega para mim e já abre o WhatsApp para agilizar.</p>
        </div>

        <div className="contato">
          <ul className="canais">
            <li>
              <a href={linkWhats(c.whatsapp, c.mensagem_whatsapp)} target="_blank" rel="noopener noreferrer" onClick={() => registrar('whatsapp')}>
                <IconeWhats /> <span><small>WhatsApp</small>{c.whatsapp_exibicao || c.whatsapp}</span>
              </a>
            </li>
            {c.instagram && (
              <li>
                <a href={`https://instagram.com/${c.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
                  <IconeInsta /> <span><small>Instagram</small>@{c.instagram.replace('@', '')}</span>
                </a>
              </li>
            )}
            {c.email && (
              <li>
                <a href={`mailto:${c.email}`}>
                  <IconeEmail /> <span><small>E-mail</small>{c.email}</span>
                </a>
              </li>
            )}
          </ul>

          {enviado ? (
            <div className="aviso-ok" role="status">
              <strong>Solicitação enviada.</strong>
              <p style={{ margin: '6px 0 0' }}>Se o WhatsApp não abriu, toque no botão verde para falar comigo.</p>
            </div>
          ) : (
            <form className="form" onSubmit={enviar}>
              <label>Nome<input name="nome" required autoComplete="name" /></label>
              <label>WhatsApp<input name="contato" required inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" /></label>
              <label className="inteiro">E-mail (opcional)<input name="email" type="email" autoComplete="email" /></label>
              <label className="inteiro">
                Serviço
                <select name="servico" defaultValue="">
                  <option value="" disabled>Escolha um serviço</option>
                  {nomesServicos.map((n) => <option key={n} value={n}>{n}</option>)}
                  <option value="Outro">Outro / não sei qual</option>
                </select>
              </label>
              <label className="inteiro">Mensagem<textarea name="mensagem" required placeholder="Descreva o que precisa, prazos e cidade (se for presencial)." /></label>
              <input className="armadilha" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              {erro && <p className="inteiro" role="alert" style={{ margin: 0, color: '#b3261e' }}>{erro}</p>}
              <div className="inteiro">
                <button type="submit" className="btn btn-navy" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar solicitação'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
