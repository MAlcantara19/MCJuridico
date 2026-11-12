// Funções pequenas usadas em vários lugares.

// Monta o link do WhatsApp com mensagem pronta.
export function linkWhats(numero: string, texto?: string) {
  const n = (numero || '').replace(/\D/g, '');
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
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
