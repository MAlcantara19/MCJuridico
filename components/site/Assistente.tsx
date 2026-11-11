'use client';
// Botões flutuantes (WhatsApp e ajuda) + assistente com respostas pré-programadas.
// As respostas vêm das "Perguntas" cadastradas no painel.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Config, Pergunta } from '@/lib/tipos';
import { linkWhats, normalizar } from '@/lib/util';
import { IconeAjuda, IconeEnviar, IconeFechar, IconeWhats } from './Icones';
import { registrar } from '@/lib/estatisticas';

type Msg = { de: 'bot' | 'eu'; texto: string };

// Procura a pergunta mais parecida com o que a pessoa digitou.
function responder(texto: string, perguntas: Pergunta[]) {
  const palavras = normalizar(texto).split(/[^a-z0-9]+/).filter((p) => p.length > 2);
  let melhor: Pergunta | null = null;
  let pontos = 0;
  for (const p of perguntas) {
    const base = normalizar(`${p.pergunta} ${p.palavras_chave}`);
    const total = palavras.filter((w) => base.includes(w)).length;
    if (total > pontos) { pontos = total; melhor = p; }
  }
  return melhor;
}

export default function Assistente({ config: c, perguntas }: { config: Config; perguntas: Pergunta[] }) {
  const [aberto, setAberto] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ de: 'bot', texto: c.assistente_saudacao || 'Olá! Como posso ajudar?' }]);
  const [texto, setTexto] = useState('');
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, aberto]);

  // Conta a visita (uma vez por sessão) e fecha o chat com a tecla Esc.
  useEffect(() => { registrar('visita', true); }, []);
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aberto]);

  function perguntar(pergunta: string, resposta?: string) {
    const achada = resposta ? null : responder(pergunta, perguntas);
    const r = resposta ?? achada?.resposta ??
      'Não encontrei essa resposta por aqui. Toque no botão verde abaixo e fale direto com a Maria Carolina pelo WhatsApp.';
    setMsgs((m) => [...m, { de: 'eu', texto: pergunta }, { de: 'bot', texto: r }]);
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    perguntar(texto.trim());
    setTexto('');
  }

  const whats = linkWhats(c.whatsapp, c.mensagem_whatsapp);

  if (!aberto) {
    return (
      <div className="flutuantes">
        <span className="balao">Precisa de ajuda?</span>
        {perguntas.length > 0 && (
          <button className="flut flut-ajuda" onClick={() => { setAberto(true); registrar('assistente'); }} aria-label="Abrir assistente">
            <IconeAjuda />
          </button>
        )}
        <a className="flut flut-whats" href={whats} target="_blank" rel="noopener noreferrer" onClick={() => registrar('whatsapp')} aria-label="Conversar no WhatsApp">
          <IconeWhats tamanho={28} />
        </a>
      </div>
    );
  }

  return (
    <div className="chat" role="dialog" aria-label="Assistente virtual">
      <div className="chat-topo">
        <div>
          <strong>Assistente do site</strong>
          <small>Respostas rápidas sobre os serviços</small>
        </div>
        <button className="icone-btn" onClick={() => setAberto(false)} aria-label="Fechar assistente"><IconeFechar /></button>
      </div>
      <div className="chat-msgs" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.de === 'bot' ? 'msg-bot' : 'msg-eu'}`}>{m.texto}</div>
        ))}
        <div className="chips">
          {perguntas.map((p) => (
            <button key={p.id} className="chip" onClick={() => perguntar(p.pergunta, p.resposta)}>{p.pergunta}</button>
          ))}
        </div>
        <div ref={fim} />
      </div>
      <div className="chat-rodape">
        <form className="chat-form" onSubmit={enviar}>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua dúvida" aria-label="Sua dúvida" />
          <button className="icone-btn escuro" type="submit" aria-label="Enviar"><IconeEnviar /></button>
        </form>
        <a className="chat-whats" href={whats} target="_blank" rel="noopener noreferrer" onClick={() => registrar('whatsapp')}>Falar no WhatsApp</a>
      </div>
    </div>
  );
}
