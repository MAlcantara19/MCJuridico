// Funções pequenas usadas em vários lugares.

// Monta o link do WhatsApp com mensagem pronta.
// Link padrão (abre o aplicativo no celular). No computador, o CorrigeWhatsApp troca
// para o WhatsApp Web na hora do clique, porque só ele manteve os emojis no teste.
export function linkWhats(numero: string, texto?: string) {
  const n = (numero || '').replace(/\D/g, '');
  const msg = texto ? `&text=${encodeURIComponent(texto)}` : '';
  return `https://api.whatsapp.com/send/?phone=${n}${msg}&type=phone_number&app_absent=0`;
}

// Versão para o computador (WhatsApp Web)
export function linkWhatsWeb(numero: string, texto?: string) {
  const n = (numero || '').replace(/\D/g, '');
  return `https://web.whatsapp.com/send?phone=${n}${texto ? `&text=${encodeURIComponent(texto)}` : ''}`;
}

// true no computador, false no celular/tablet (no servidor, considera celular)
export function ehComputador() {
  if (typeof navigator === 'undefined') return false;
  return !/Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent);
}

// Troca um link de WhatsApp para o formato do aparelho (usado no clique, para links montados no servidor)
export function ajustarLinkWhats(href: string) {
  try {
    const u = new URL(href);
    if (!/(^|\.)whatsapp\.com$|^wa\.me$/.test(u.hostname) || u.hostname === 'web.whatsapp.com') return href;
    const telefone = u.searchParams.get('phone') || u.pathname.replace(/\D/g, '');
    const texto = u.searchParams.get('text') || '';
    return ehComputador() ? linkWhatsWeb(telefone, texto || undefined) : linkWhats(telefone, texto || undefined);
  } catch {
    return href;
  }
}

// Tira acentos e deixa minúsculo (para a busca do assistente).
export function normalizar(s: string) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Quebra um texto em linhas não vazias.
export function linhas(s: string) {
  return (s || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

// Iniciais do nome (ex.: Maria Carolina Costa -> MC).
export function iniciais(nome: string) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '';
  const ultima = partes.length > 1 ? partes[partes.length - 1] : '';
  return (partes[0][0] + (ultima ? ultima[0] : '')).toUpperCase();
}

// Busca tolerante: ignora acento e maiúscula, e aceita singular/plural
// ("certidao" acha "Certidões", "protocolos" acha "Protocolo").
export function combina(texto: string, busca: string) {
  const alvo = normalizar(texto);
  const palavras = normalizar(busca).split(/\s+/).filter(Boolean);
  return palavras.every((w) => {
    const raiz = w.length > 5 ? w.slice(0, w.length - 2) : w.length > 3 ? w.slice(0, w.length - 1) : w;
    return alvo.includes(raiz);
  });
}

// Mensagens do WhatsApp ficam em lib/mensagens.ts (reexportadas aqui para não quebrar imports antigos)
export { preencher, MSG_SERVICO_PADRAO, MSG_PACOTE_PADRAO } from './mensagens';
