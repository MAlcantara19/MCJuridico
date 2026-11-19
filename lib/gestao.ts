// Tipos e funções da parte de gestão (clientes, serviços realizados, agenda).
import { MSG_COBRANCA_PADRAO, msgPedirAvaliacao } from './mensagens';
import { pixCopiaECola } from './pix';
import { linkWhats } from './util';

type DadosPix = { pix_chave?: string; pix_nome?: string; pix_cidade?: string; nome?: string };

// Pix copia e cola com valor (vazio se a chave não estiver cadastrada no painel)
export function pixDe(c: DadosPix | undefined, valor?: number, identificador?: string) {
  if (!c?.pix_chave) return '';
  return pixCopiaECola({ chave: c.pix_chave, nome: c.pix_nome || c.nome || '', cidade: c.pix_cidade || 'Tres Rios', valor, identificador });
}

export type Cliente = {
  id: number; nome: string; tipo: string; responsavel: string; documento: string;
  telefone: string; email: string; cidade: string; observacoes: string; ativo: boolean; criado_em: string;
  avaliacao_pedida_em?: string | null;
  etiquetas?: string[] | null; horas_mes?: number | null; mostrar_horas?: boolean | null;
  acesso_token?: string | null; acesso_pin?: string | null;
  cobrado_em?: string | null;
};

// Etiquetas sugeridas (dá para criar outras) e suas cores
export const ETIQUETAS: Record<string, string> = {
  'Pacote mensal': '#2e7d32',
  'VIP': '#a8894e',
  'Inadimplente': '#b3261e',
  'Escritório parceiro': '#1d4f91',
  'Novo': '#6a3fb5',
  'Outra cidade': '#00796b',
};
export const corEtiqueta = (e: string) => ETIQUETAS[e] ?? '#5b6780';

// Cor da situação do pedido (tabela, etiquetas e área do cliente)
export const COR_STATUS: Record<string, string> = {
  orcamento: '#6a3fb5', aguardando_docs: '#e08a00', a_fazer: '#1d4f91', andamento: '#00796b', concluido: '#2e7d32', cancelado: '#5b6780',
};

// ---------- Dias úteis (sem sábado, domingo e feriados nacionais + RJ) ----------
function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
let cacheFeriados: Record<number, Record<string, string>> = {};
// Feriados municipais cadastrados no painel (Agenda › Feriados). Recorrente = todo ano no mesmo dia.
export type FeriadoExtra = { data: string; nome: string; cidade?: string; recorrente?: boolean; ativo?: boolean };
let extras: FeriadoExtra[] = [];
export function definirFeriadosExtras(lista: FeriadoExtra[]) {
  extras = (lista ?? []).filter((f) => f && f.data && f.ativo !== false);
  cacheFeriados = {};
}
export function feriados(ano: number) {
  if (cacheFeriados[ano]) return cacheFeriados[ano];
  const p = pascoa(ano);
  const f: Record<string, string> = {
    [`${ano}-01-01`]: 'Confraternização Universal', [`${ano}-04-21`]: 'Tiradentes', [`${ano}-04-23`]: 'São Jorge (RJ)',
    [`${ano}-05-01`]: 'Dia do Trabalho', [`${ano}-09-07`]: 'Independência', [`${ano}-10-12`]: 'Nossa Senhora Aparecida',
    [`${ano}-11-02`]: 'Finados', [`${ano}-11-15`]: 'Proclamação da República', [`${ano}-11-20`]: 'Consciência Negra',
    [`${ano}-12-25`]: 'Natal',
    [somarDias(p, -48)]: 'Carnaval', [somarDias(p, -47)]: 'Carnaval', [somarDias(p, -2)]: 'Sexta-feira Santa',
    [somarDias(p, 60)]: 'Corpus Christi',
  };
  for (const e of extras) {
    const d = e.recorrente !== false ? `${ano}-${e.data.slice(5, 10)}` : e.data.slice(0, 10);
    if (d.startsWith(String(ano))) f[d] = f[d] ? `${f[d]} / ${e.nome}` : `${e.nome}${e.cidade ? ` (${e.cidade})` : ''}`;
  }
  return (cacheFeriados[ano] = f);
}
export const nomeFeriado = (d: string) => feriados(Number(d.slice(0, 4)))[d] ?? '';
export function ehDiaUtil(d: string) {
  const s = new Date(`${d}T12:00:00`).getDay();
  return s !== 0 && s !== 6 && !nomeFeriado(d);
}
// Soma N dias úteis a partir de uma data (o dia de hoje não conta)
export function somarDiasUteis(d: string, n: number) {
  let r = d, faltam = n;
  while (faltam > 0) { r = somarDias(r, 1); if (ehDiaUtil(r)) faltam -= 1; }
  return r;
}
// Quantos dias úteis entre duas datas (negativo se 'ate' já passou)
export function diasUteisEntre(de: string, ate: string) {
  if (de === ate) return 0;
  const sinal = ate > de ? 1 : -1;
  let n = 0, d = de;
  while (d !== ate) { d = somarDias(d, sinal); if (ehDiaUtil(d)) n += sinal; }
  return n;
}

// Prazo: atrasado (vermelho), até 2 dias úteis (laranja), ok (verde)
export function situacaoPrazo(prazo?: string | null, feito?: boolean) {
  if (!prazo || feito) return { cor: '#5b6780', rotulo: prazo ? dataBR(prazo) : '—', nivel: 0 };
  const hoje = hojeISO();
  if (prazo < hoje) return { cor: '#b3261e', rotulo: `${dataBR(prazo)} · atrasado ${Math.max(1, -diasUteisEntre(hoje, prazo))} d.u.`, nivel: 3 };
  if (prazo === hoje) return { cor: '#b3261e', rotulo: `${dataBR(prazo)} · hoje`, nivel: 3 };
  const du = diasUteisEntre(hoje, prazo);
  if (du <= 2) return { cor: '#e08a00', rotulo: `${dataBR(prazo)} · em ${du} d.u.`, nivel: 2 };
  return { cor: '#2e7d32', rotulo: `${dataBR(prazo)} · em ${du} d.u.`, nivel: 1 };
}

export type Atendimento = {
  id: number; cliente_id: number | null; servico: string; descricao: string; processo: string;
  data: string; valor: number; status: string; pago: boolean; data_pagamento: string | null;
  forma_pagamento: string; criado_em: string;
  checklist_feito?: string[] | null; comprovante?: string | null;
  codigo?: string | null; prazo?: string | null; visivel_cliente?: boolean | null;
  pagamento_informado?: boolean | null; comprovante_cliente?: string | null;
  comarca?: string | null; deslocamento?: number | null;
};

// ---------- Deslocamento ----------
type ConfigKm = { km_valor?: number | null; km_franquia?: number | null; km_ida_volta?: boolean | null };
// Valor do deslocamento para uma distância (km pela estrada até a base).
// Ex.: R$ 1,20/km acima de 15 km → 40 km = 25 × 1,20 = R$ 30,00
export function valorDeslocamento(km: number | null | undefined, c: ConfigKm) {
  const valor = Number(c.km_valor ?? 1.2) || 0;
  const franquia = Number(c.km_franquia ?? 15) || 0;
  const dist = (Number(km) || 0) * (c.km_ida_volta ? 2 : 1);
  const cobrado = Math.max(0, dist - franquia * (c.km_ida_volta ? 2 : 1));
  return { km: dist, cobrado, valor: Math.round(cobrado * valor * 100) / 100 };
}
// Distância em linha reta (km), usada quando a distância pela estrada ainda não foi calculada
export function distanciaReta(a: { lat?: number | null; lng?: number | null }, b: { lat?: number | null; lng?: number | null }) {
  const r = (g: number) => (g * Math.PI) / 180;
  const dLat = r((b.lat ?? 0) - (a.lat ?? 0)), dLng = r((b.lng ?? 0) - (a.lng ?? 0));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat ?? 0)) * Math.cos(r(b.lat ?? 0)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
// km da comarca: o da estrada (se calculado) ou a linha reta × 1,3 (estimativa)
export function kmComarca(c: { km?: number | null; lat?: number | null; lng?: number | null }, base?: { lat?: number | null; lng?: number | null } | null) {
  if (c.km != null && String(c.km) !== '') return { km: Number(c.km), estimado: false };
  if (!base || c.lat == null || base.lat == null) return { km: 0, estimado: true };
  return { km: Math.round(distanciaReta(base, c) * 1.3), estimado: true };
}

export type Despesa = {
  id: number; data: string; descricao: string; categoria: string; valor: number;
  cliente_id: number | null; repassar: boolean; comprovante: string | null; criado_em: string;
};

export const CATEGORIAS_DESPESA = ['Custas e taxas', 'Cópias e impressões', 'Transporte', 'Combustível', 'Correios', 'Material', 'Internet e telefone', 'Outros'];

// Valor por extenso (para o recibo). Ex.: 1350.5 -> "mil, trezentos e cinquenta reais e cinquenta centavos"
export function porExtenso(valor: number) {
  const u = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  const ate999 = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const partes: string[] = [];
    if (n >= 100) partes.push(c[Math.floor(n / 100)]);
    const r = n % 100;
    if (r >= 20) partes.push(d[Math.floor(r / 10)] + (r % 10 ? ` e ${u[r % 10]}` : ''));
    else if (r > 0) partes.push(u[r]);
    return partes.join(' e ');
  };
  const inteiro = Math.floor(Math.round(valor * 100) / 100);
  const centavos = Math.round((valor - inteiro) * 100);
  const milhares = Math.floor(inteiro / 1000);
  const resto = inteiro % 1000;
  let reais = '';
  if (milhares) reais = milhares === 1 ? 'mil' : `${ate999(milhares)} mil`;
  if (resto) reais += (reais ? (resto < 100 || resto % 100 === 0 ? ' e ' : ', ') : '') + ate999(resto);
  const txtReais = inteiro ? `${reais} ${inteiro === 1 ? 'real' : 'reais'}` : '';
  const txtCent = centavos ? `${ate999(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}` : '';
  return [txtReais, txtCent].filter(Boolean).join(' e ') || 'zero reais';
}

export type Compromisso = {
  id: number; titulo: string; tipo: string; data: string; hora: string | null; cliente_id: number | null;
  local: string; processo: string; observacoes: string; feito: boolean; criado_em: string;
  lat?: number | null; lng?: number | null; lembrar_cliente?: boolean | null; lembrete_cliente_em?: string | null;
};

export const TIPOS_CLIENTE = [
  { valor: 'escritorio', rotulo: 'Escritório de advocacia' },
  { valor: 'advogado', rotulo: 'Advogado(a) autônomo(a)' },
  { valor: 'empresa', rotulo: 'Empresa / negócio' },
  { valor: 'pessoa', rotulo: 'Pessoa física' },
];

export const STATUS = [
  { valor: 'orcamento', rotulo: 'Orçamento' },
  { valor: 'aguardando_docs', rotulo: 'Aguardando documentos' },
  { valor: 'a_fazer', rotulo: 'A fazer' },
  { valor: 'andamento', rotulo: 'Em andamento' },
  { valor: 'concluido', rotulo: 'Concluído' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
];

export const TIPOS_AGENDA = [
  { valor: 'prazo', rotulo: 'Prazo' },
  { valor: 'diligencia', rotulo: 'Diligência' },
  { valor: 'audiencia', rotulo: 'Audiência' },
  { valor: 'reuniao', rotulo: 'Reunião' },
  { valor: 'entrega', rotulo: 'Entrega' },
  { valor: 'outro', rotulo: 'Outro' },
];

// Cor e emoji de cada tipo de compromisso (agenda do painel e calendário do celular)
export const COR_AGENDA: Record<string, { cor: string; emoji: string }> = {
  prazo: { cor: '#b3261e', emoji: '⏰' },
  diligencia: { cor: '#1d4f91', emoji: '💼' },
  audiencia: { cor: '#6a3fb5', emoji: '⚖️' },
  reuniao: { cor: '#00796b', emoji: '👥' },
  entrega: { cor: '#e08a00', emoji: '📦' },
  outro: { cor: '#5b6780', emoji: '📌' },
};

export const FORMAS_PAGAMENTO = ['Pix', 'Transferência', 'Dinheiro', 'Boleto', 'Cartão'];

export const rotulo = (lista: { valor: string; rotulo: string }[], v: string) => lista.find((x) => x.valor === v)?.rotulo ?? v;

export const brl = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Datas no formato do banco (AAAA-MM-DD), sempre no horário local
export function iso(d: Date) {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
export const hojeISO = () => iso(new Date());
export function somarDias(base: string, dias: number) {
  const [a, m, d] = base.split('-').map(Number);
  return iso(new Date(a, m - 1, d + dias));
}
export function dataBR(v?: string | null) {
  if (!v) return '';
  const [a, m, d] = v.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
export function diaSemana(v: string) {
  const [a, m, d] = v.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

// Períodos do financeiro
export const PERIODOS = [
  { valor: 'semana', rotulo: 'Esta semana' },
  { valor: 'mes', rotulo: 'Este mês' },
  { valor: 'mes_passado', rotulo: 'Mês passado' },
  { valor: '3meses', rotulo: 'Últimos 3 meses' },
  { valor: 'ano', rotulo: 'Este ano' },
  { valor: '12meses', rotulo: 'Últimos 12 meses' },
  { valor: 'tudo', rotulo: 'Tudo' },
];

export function intervalo(periodo: string): [string, string] {
  const h = new Date();
  const hoje = iso(h);
  switch (periodo) {
    case 'semana': {
      const dia = (h.getDay() + 6) % 7; // segunda = 0
      return [somarDias(hoje, -dia), somarDias(hoje, 6 - dia)];
    }
    case 'mes': return [iso(new Date(h.getFullYear(), h.getMonth(), 1)), iso(new Date(h.getFullYear(), h.getMonth() + 1, 0))];
    case 'mes_passado': return [iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), iso(new Date(h.getFullYear(), h.getMonth(), 0))];
    case '3meses': return [iso(new Date(h.getFullYear(), h.getMonth() - 2, 1)), iso(new Date(h.getFullYear(), h.getMonth() + 1, 0))];
    case 'ano': return [`${h.getFullYear()}-01-01`, `${h.getFullYear()}-12-31`];
    case '12meses': return [iso(new Date(h.getFullYear(), h.getMonth() - 11, 1)), iso(new Date(h.getFullYear(), h.getMonth() + 1, 0))];
    default: return ['1900-01-01', '2999-12-31'];
  }
}

// Link de WhatsApp a partir de um telefone digitado de qualquer jeito
export function whatsDoTelefone(tel: string, texto?: string) {
  let n = (tel || '').replace(/\D/g, '');
  if (n.length <= 11) n = `55${n}`;
  return linkWhats(n, texto);
}

export { MSG_COBRANCA_PADRAO } from './mensagens';

// Monta a mensagem de cobrança com os dados do serviço
export function mensagemCobranca(modelo: string | undefined, dados: { responsavel?: string; servico: string; data: string; valor: number }, pix?: DadosPix) {
  const primeiro = (dados.responsavel || '').trim().split(' ')[0];
  return (modelo || MSG_COBRANCA_PADRAO)
    .replaceAll('{responsavel}', primeiro ? `, ${primeiro}` : '')
    .replaceAll('{servico}', dados.servico)
    .replaceAll('{data}', dataBR(dados.data))
    .replaceAll('{valor}', brl(dados.valor))
    + (pix?.pix_chave ? `\n\n💠 *Pix copia e cola* (já com o valor):\n${pixDe(pix, dados.valor)}` : '');
}

// Baixa uma lista como planilha (CSV que o Excel abre direto, com acentos e vírgula decimal)
export function baixarPlanilha(nomeArquivo: string, cabecalho: string[], linhas: (string | number)[][]) {
  const celula = (v: string | number) => {
    const t = typeof v === 'number' ? v.toFixed(2).replace('.', ',') : String(v ?? '');
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const texto = [cabecalho, ...linhas].map((l) => l.map(celula).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF' + texto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- Pedido de avaliação ----------
// Link do WhatsApp com o convite para avaliar (página /avaliar)
export function linkPedidoAvaliacao(c: Pick<Cliente, 'telefone' | 'responsavel' | 'nome'>) {
  const origem = typeof window !== 'undefined' ? window.location.origin : '';
  return whatsDoTelefone(c.telefone, msgPedirAvaliacao(c.responsavel || c.nome, `${origem}/avaliar?n=${encodeURIComponent(c.responsavel || c.nome)}`));
}

// Pode pedir de novo? (não pediu ainda ou faz mais de 90 dias)
export function podePedirAvaliacao(c?: Pick<Cliente, 'telefone' | 'avaliacao_pedida_em'> | null) {
  if (!c?.telefone) return false;
  if (!c.avaliacao_pedida_em) return true;
  return Date.now() - new Date(c.avaliacao_pedida_em).getTime() > 90 * 864e5;
}
