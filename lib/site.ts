// Endereço público do site (usado no Google e no compartilhamento).
// Na Vercel, crie a variável NEXT_PUBLIC_SITE_URL com o domínio final (ex.: https://mcjuridico.com.br).
export const URL_SITE = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
).replace(/\/$/, '');
