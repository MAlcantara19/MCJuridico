'use client';
// Botão "Instalar app": no Android/PC usa o aviso do navegador; no iPhone mostra o passo a passo.
import { useEffect, useState } from 'react';

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export default function BotaoInstalar() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [iphone, setIphone] = useState(false);

  useEffect(() => {
    const modoApp = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setInstalado(!!modoApp);
    setIphone(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const pegar = (e: Event) => { e.preventDefault(); setEvento(e as EventoInstalar); };
    window.addEventListener('beforeinstallprompt', pegar);
    window.addEventListener('appinstalled', () => setInstalado(true));
    return () => window.removeEventListener('beforeinstallprompt', pegar);
  }, []);

  if (instalado || (!evento && !iphone)) return null;

  async function instalar() {
    if (evento) {
      await evento.prompt();
      const r = await evento.userChoice;
      if (r.outcome === 'accepted') setInstalado(true);
      setEvento(null);
    } else {
      alert('Para instalar no iPhone:\n\n1. Abra este painel no Safari\n2. Toque em Compartilhar (quadrado com seta)\n3. Toque em "Adicionar à Tela de Início"');
    }
  }

  return (
    <button className="adm-btn peq" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={instalar}>
      Instalar app
    </button>
  );
}
