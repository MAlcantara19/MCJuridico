import type { NextConfig } from 'next';

// Cabeçalhos de segurança aplicados em todas as páginas.
// O certificado SSL (cadeado/HTTPS) é emitido e renovado automaticamente pela Vercel.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' ${supabase} ${supabase.replace('https://', 'wss://')}`,
  `frame-src 'self' blob: ${supabase}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const cabecalhos = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    // A política de conteúdo (CSP) só vale no site publicado; no "npm run dev" atrapalharia o modo de desenvolvimento.
    const todos = process.env.NODE_ENV === 'production' ? [...cabecalhos, { key: 'Content-Security-Policy', value: csp }] : cabecalhos;
    return [{ source: '/:path*', headers: todos }];
  },
};

export default nextConfig;
