// Envio de notificações para o celular do cliente (Web Push). Só roda no servidor.
// Precisa das variáveis NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY (veja LEIA-ME, atualização 17).
import webpush from 'web-push';

export type Inscricao = { endpoint: string; p256dh: string; auth: string };
export type Aviso = { titulo: string; corpo: string; url?: string; tag?: string };

let pronto = false;
export function pushConfigurado() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!pronto) {
    webpush.setVapidDetails(process.env.VAPID_CONTATO || 'mailto:contato@exemplo.com.br', pub, priv);
    pronto = true;
  }
  return true;
}

// Envia para todos os aparelhos. Devolve quantos receberam e os endereços que não existem mais (para apagar).
export async function enviarPush(inscricoes: Inscricao[], aviso: Aviso) {
  if (!pushConfigurado()) return { enviados: 0, vencidos: [] as string[], erro: 'Notificações não configuradas na Vercel' };
  const corpo = JSON.stringify({ titulo: aviso.titulo.slice(0, 80), corpo: aviso.corpo.slice(0, 240), url: aviso.url || '/', tag: aviso.tag });
  const vencidos: string[] = [];
  let enviados = 0;
  await Promise.all(inscricoes.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, corpo, { TTL: 60 * 60 * 24, urgency: 'normal' });
      enviados += 1;
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.statusCode === 410) vencidos.push(s.endpoint);
    }
  }));
  return { enviados, vencidos, erro: '' };
}
