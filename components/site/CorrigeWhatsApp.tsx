'use client';
// No computador, todo link de WhatsApp vira WhatsApp Web na hora do clique
// (o link do aplicativo troca emojis por � no computador). Vale para links e para window.open. No celular nada muda.
import { useEffect } from 'react';
import { ajustarLinkWhats, ehComputador } from '@/lib/util';

export default function CorrigeWhatsApp() {
  useEffect(() => {
    if (!ehComputador()) return;
    const aoClicar = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || !/whatsapp\.com|wa\.me/.test(a.href)) return;
      const novo = ajustarLinkWhats(a.href);
      if (novo !== a.href) a.href = novo;
    };
    document.addEventListener('click', aoClicar, true);
    // Botões que abrem o WhatsApp por código (window.open) também passam pela troca
    const original = window.open;
    window.open = function (url?: string | URL, ...resto: any[]) {
      const u = url ? ajustarLinkWhats(String(url)) : url;
      return original.call(window, u as any, ...resto);
    } as typeof window.open;
    return () => { document.removeEventListener('click', aoClicar, true); window.open = original; };
  }, []);
  return null;
}
