// Moldura para páginas avulsas (links, privacidade): aplica cores, tema e fonte do painel.
import type { CSSProperties, ReactNode } from 'react';
import type { Config } from '@/lib/tipos';

export function estiloMarca(c: Config) {
  return {
    '--navy': c.cor_primaria || '#0E1B33',
    '--ouro': c.cor_destaque || '#A8894E',
    '--fonte-titulo': `'${c.fonte_titulo || 'Cormorant Garamond'}', Georgia, serif`,
  } as CSSProperties;
}

export default function PaginaSimples({ config, children, classe }: { config: Config; children: ReactNode; classe?: string }) {
  return (
    <div className={`site ${classe ?? ''}`} style={estiloMarca(config)}>
      {children}
    </div>
  );
}
