// Pix copia e cola (BR Code, padrão do Banco Central) com valor.
// O mesmo texto vira QR Code no orçamento.

function campo(id: string, valor: string) {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

// CRC16-CCITT exigido pelo padrão do Pix
function crc16(texto: string) {
  let crc = 0xffff;
  for (const ch of new TextEncoder().encode(texto)) {
    crc ^= ch << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Tira acentos e caracteres que o padrão não aceita
const limpar = (t: string, max: number) =>
  (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, max).toUpperCase();

export function pixCopiaECola(p: { chave: string; nome: string; cidade: string; valor?: number; identificador?: string }) {
  if (!p.chave) return '';
  // Telefone precisa do +55; CPF/CNPJ só números
  let chave = p.chave.trim();
  if (/^\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(chave)) chave = `+55${chave.replace(/\D/g, '')}`;
  else if (/^[\d.\-/]+$/.test(chave)) chave = chave.replace(/\D/g, '');

  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  const txid = limpar(p.identificador || '***', 25).replace(/ /g, '') || '***';
  const corpo =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (p.valor && p.valor > 0 ? campo('54', p.valor.toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', limpar(p.nome, 25) || 'RECEBEDOR') +
    campo('60', limpar(p.cidade, 15) || 'BRASIL') +
    campo('62', campo('05', txid)) +
    '6304';
  return corpo + crc16(corpo);
}
