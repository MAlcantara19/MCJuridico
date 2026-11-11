// Estrutura geral de todas as páginas (fontes, tema claro/escuro).
import './globals.css';
import type { ReactNode } from 'react';

// Liga o tema salvo antes da página aparecer (evita piscar).
const scriptTema = `(function(){try{var t=localStorage.getItem('tema');if(t)document.documentElement.dataset.tema=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Fontes que podem ser escolhidas no painel */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Playfair+Display:wght@500;600;700&family=Libre+Baskerville:wght@400;700&family=Marcellus&family=Montserrat:wght@400;500;600;700&display=swap"
        />
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
