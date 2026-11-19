// Notificações no celular: inscrição (área do cliente) e envio (painel). Roda no navegador.
import { supabase } from './supabase';

const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function pushDisponivel() {
  return typeof window !== 'undefined' && !!CHAVE_PUBLICA && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// iPhone só aceita notificação com o site instalado na tela de início
export function precisaInstalar() {
  if (typeof window === 'undefined') return false;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const instalado = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone;
  return ios && !instalado;
}

function base64ParaBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function registro(escopo: string) {
  const r = await navigator.serviceWorker.register('/sw.js', { scope: escopo });
  await navigator.serviceWorker.ready;
  return r;
}

export async function inscricaoAtual(escopo: string) {
  if (!pushDisponivel()) return null;
  try { return await (await registro(escopo)).pushManager.getSubscription(); } catch { return null; }
}

// Pede permissão e grava o aparelho do cliente no banco
export async function ativarNotificacoes(token: string, pin: string) {
  if (!pushDisponivel()) throw new Error('Este celular/navegador não aceita notificações.');
  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error('As notificações foram bloqueadas. Libere nas configurações do navegador.');
  const reg = await registro(`/cliente/${token}`);
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(CHAVE_PUBLICA) }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { data, error } = await supabase().rpc('cliente_push_inscrever', { token, pin, ep: j.endpoint, chave: j.keys.p256dh, segredo: j.keys.auth });
  if (error || !data) throw new Error('Não foi possível ativar agora. Tente de novo.');
  return true;
}

export async function desativarNotificacoes(token: string, pin: string) {
  const sub = await inscricaoAtual(`/cliente/${token}`);
  if (!sub) return;
  await supabase().rpc('cliente_push_sair', { token, pin, ep: sub.endpoint });
  await sub.unsubscribe();
}

// Painel: avisa o celular do cliente (se ele ativou). Não trava nada se falhar.
export async function notificarCliente(p: { cliente_id: number; titulo: string; corpo: string; caminho?: string; tag?: string }) {
  try {
    const { data } = await supabase().auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt) return { enviados: 0, aparelhos: 0 };
    const r = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }, body: JSON.stringify(p) });
    return (await r.json()) as { enviados: number; aparelhos: number; erro?: string };
  } catch {
    return { enviados: 0, aparelhos: 0 };
  }
}
