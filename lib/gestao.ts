// Tipos e funções da parte de gestão (clientes, serviços realizados, agenda).
import { MSG_COBRANCA_PADRAO, msgPedirAvaliacao } from './mensagens';

export type Cliente = {
  id: number; nome: string; tipo: string; responsavel: string; documento: string;
  telefone: string; email: string; cidade: string; observacoes: string; ativo: boolean; criado_em: string;
  avaliacao_pedida_em?: string | null;
};

export type Atendimento = {
  id: number; cliente_id: number | null; servico: string; descricao: string; processo: string;
  data: string; valor: number; status: string; pago: boolean; data_pagamento: string | null;
  forma_pagamento: string; criado_em: string;
  checklist_feito?: string[] | null; comprovante?: string | null;
};

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
};

export const TIPOS_CLIENTE = [
  { valor: 'escritorio', rotulo: 'Escritório de advocacia' },
  { valor: 'advogado', rotulo: 'Advogado(a) autônomo(a)' },
  { valor: 'empresa', rotulo: 'Empresa / negócio' },
  { valor: 'pessoa', rotulo: 'Pessoa física' },
];

export const STATUS = [
  { valor: 'orcamento', rotulo: 'Orçamento' },
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
  // api.whatsapp.com (e não wa.me): o redirecionamento do wa.me troca emojis por � no WhatsApp do computador
  return `https://api.whatsapp.com/send?phone=${n}${texto ? `&text=${encodeURIComponent(texto)}` : ''}`;
}

export { MSG_COBRANCA_PADRAO } from './mensagens';

// Monta a mensagem de cobrança com os dados do serviço
export function mensagemCobranca(modelo: string | undefined, dados: { responsavel?: string; servico: string; data: string; valor: number }) {
  const primeiro = (dados.responsavel || '').trim().split(' ')[0];
  return (modelo || MSG_COBRANCA_PADRAO)
    .replaceAll('{responsavel}', primeiro ? `, ${primeiro}` : '')
    .replaceAll('{servico}', dados.servico)
    .replaceAll('{data}', dataBR(dados.data))
    .replaceAll('{valor}', brl(dados.valor));
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
