'use client';
// Link do WhatsApp que conta o clique no Resumo do painel.
import type { ReactNode } from 'react';
import { registrar } from '@/lib/estatisticas';

export default function BotaoRegistro({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" onClick={() => registrar('whatsapp')}>
      {children}
    </a>
  );
}
