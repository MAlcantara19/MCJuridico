// Todas as mensagens de WhatsApp do site e do painel, num lugar só.
// Padrão: saudação → contexto → item em *negrito* com emoji → detalhes em tópicos (•) → fechamento.
// As do site (geral, serviço, pacote, cobrança) também podem ser editadas no painel (Textos e contatos).

// Nome usado nas mensagens do WhatsApp (para outro profissional, troque só aqui)
export const CONTATO = 'Maria Carolina';

// ---------- Emojis ----------
// Ícone da área (escolhido no painel) → emoji da mensagem
const EMOJI_POR_ICONE: Record<string, string> = {
  balanca: '⚖️',
  carteira: '💰',
  monitor: '💻',
  loja: '🏪',
  maleta: '💼',
  documento: '📄',
};

export function emojiArea(cat?: { emoji?: string | null; icone?: string | null; modalidade?: string } | null) {
  if (cat?.emoji) return cat.emoji;
  if (cat?.icone && EMOJI_POR_ICONE[cat.icone]) return EMOJI_POR_ICONE[cat.icone];
  return cat?.modalidade === 'presencial' ? '💼' : '📌';
}

export function emojiPacote(p: { grupo: string; destaque?: boolean }) {
  if (p.grupo === 'teste') return '🧪';
  if (p.grupo === 'correspondente') return '💼';
  return p.destaque ? '⭐' : '📦';
}

// ---------- Modelos padrão (os do site podem ser trocados no painel) ----------
export const MSG_GERAL_PADRAO = [
  `Olá, ${CONTATO}! 👋`,
  'Vim através do seu site e gostaria de saber mais sobre os seus serviços. ⚖️',
  '',
  'Poderia me ajudar? 😊',
].join('\n');

export const MSG_SERVICO_PADRAO = [
  `Olá, ${CONTATO}! 👋`,
  'Vim através do seu site e me interessei por este serviço:',
  '',
  '{emoji} *{servico}*',
  '• Área: {area}',
  '• Valor de referência: {preco}',
  '',
  'Poderia me passar mais informações e dar sequência ao atendimento? 😊',
].join('\n');

export const MSG_PACOTE_PADRAO = [
  `Olá, ${CONTATO}! 👋`,
  'Vim através do seu site e me interessei por este pacote:',
  '',
  '{emoji} *{pacote}*',
  '• Indicado para: {publico}',
  '• Inclui: {horas}',
  '• Valor: {preco}',
  '',
  'Poderia me explicar como funciona a contratação? 😊',
].join('\n');

export const MSG_COBRANCA_PADRAO = [
  'Olá{responsavel}! Tudo bem? 😊',
  '',
  'Passando para lembrar do pagamento referente a:',
  '',
  '🧾 *{servico}*',
  '• Data: {data}',
  '• Valor: *{valor}*',
  '',
  'Se já tiver feito, pode desconsiderar esta mensagem. 🙏',
  'Obrigada!',
].join('\n');

// ---------- Preenchimento ----------
// Troca {campo} pelos valores, mantém as quebras de linha e remove tópicos que ficaram vazios.
export function preencher(modelo: string, valores: Record<string, string | undefined>) {
  return (modelo || '')
    .replace(/\{(\w+)\}/g, (_, k) => valores[k] ?? '')
    .split('\n')
    .map((l) => l.replace(/\(\s*\)/g, '').replace(/[ \t]{2,}/g, ' ').trimEnd())
    .filter((l) => !/^\s*[•\-]\s*[^:]*:\s*$/.test(l)) // "• Indicado para: " sem valor
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Junta blocos de texto com uma linha em branco entre eles
const juntar = (...blocos: (string | false | null | undefined)[]) => blocos.filter(Boolean).join('\n\n');
const topicos = (itens: (string | false | null | undefined)[]) => itens.filter(Boolean).map((t) => `• ${t}`).join('\n');
const primeiroNome = (nome?: string) => (nome || '').trim().split(' ')[0];
const ola = (nome?: string) => `Olá${primeiroNome(nome) ? `, ${primeiroNome(nome)}` : ''}! 👋`;

// ---------- Mensagens do site (cliente → Maria) ----------
export function msgSolicitacao(p: { nome: string; servico: string; emoji?: string; mensagem: string; contato: string; email?: string }) {
  return juntar(
    `Olá, ${CONTATO}! 👋\nAcabei de enviar uma solicitação pelo seu site. 📝`,
    `${p.emoji || '📌'} *${p.servico || 'Serviço a definir'}*`,
    topicos([`Nome: ${p.nome}`, `WhatsApp: ${p.contato}`, p.email && `E-mail: ${p.email}`]),
    `💬 ${p.mensagem}`,
    'Fico no aguardo do seu retorno! 😊',
  );
}

export function msgBuscaSemResultado(termo: string) {
  return juntar(
    `Olá, ${CONTATO}! 👋\nVim através do seu site e procurei por um serviço que não encontrei na tabela:`,
    `🔎 *${termo}*`,
    'Você consegue me ajudar com isso? 😊',
  );
}

export function msgGuia(p: { perfil: string; local: string; servicos: { nome: string; emoji: string; preco: string }[]; pacote?: string; frequencia: string }) {
  return juntar(
    `Olá, ${CONTATO}! 👋\nFiz o "Qual serviço eu preciso?" no seu site e o resultado foi este:`,
    p.servicos.map((s) => `${s.emoji} *${s.nome}*\n• Valor de referência: ${s.preco}`).join('\n\n'),
    topicos([`Perfil: ${p.perfil}`, `Atendimento: ${p.local}`, `Frequência: ${p.frequencia}`, p.pacote && `Pacote sugerido: ${p.pacote}`]),
    'Poderia confirmar se é isso mesmo e me passar um orçamento? 😊',
  );
}

export function msgSimulador(p: { horas: number; pacote: string; valor: string; economia?: string }) {
  return juntar(
    `Olá, ${CONTATO}! 👋\nUsei o simulador de pacotes do seu site:`,
    `📦 *${p.pacote}*\n` + topicos([`Horas estimadas: ${p.horas}h por mês`, `Valor: ${p.valor}`, p.economia && `Economia em relação à hora avulsa: ${p.economia}`]),
    'Poderia me explicar como funciona a contratação? 😊',
  );
}

export function msgCredito(marca: string, nome: string) {
  return juntar(
    'Olá, Matheus! 👋',
    `Vi o site da *${marca}* (${nome}) e gostei muito. 💻`,
    'Tenho interesse em criar um site assim também. Podemos conversar? 😊',
  );
}

// ---------- Mensagens do painel (Maria → cliente) ----------
export function msgRespostaSolicitacao(nome: string, servico: string) {
  return juntar(
    ola(nome),
    `Aqui é a ${CONTATO}. Recebi sua solicitação pelo site. ✅`,
    servico && `📌 *${servico}*`,
    'Vou analisar e já te retorno com as informações. Qualquer dúvida, é só me chamar por aqui! 😊',
  );
}

export function msgPedirAvaliacao(nome: string, link: string) {
  return juntar(
    ola(nome),
    'Muito obrigada pela confiança no meu trabalho! 🙏',
    'Se puder, deixe sua avaliação sobre o atendimento. Leva menos de 1 minuto: ⭐',
    `👉 ${link}`,
    'Sua opinião ajuda muito! 😊',
  );
}

export function msgOrcamento(p: { nome: string; numero: string; itens: string[]; desconto?: string; total: string; validade: string }) {
  return juntar(
    ola(p.nome),
    `Segue o orçamento nº *${p.numero}*: 📋`,
    p.itens.map((i) => `• ${i}`).join('\n') + (p.desconto ? `\n• Desconto: -${p.desconto}` : ''),
    `💰 *Total: ${p.total}*\n📅 Válido até ${p.validade}`,
    'Envio o PDF completo logo abaixo. Qualquer dúvida, estou à disposição! 😊',
  );
}

export function msgRelatorio(p: { nome: string; tipo: string; processo?: string; data: string; resultado: string }) {
  return juntar(
    ola(p.nome),
    'A diligência foi realizada. Segue o resumo: ✅',
    `💼 *${p.tipo}*`,
    topicos([p.processo && `Processo: ${p.processo}`, `Data: ${p.data}`, `Resultado: ${p.resultado}`]),
    'Envio o relatório completo com fotos em PDF logo abaixo. 📎',
  );
}

export function msgPedirDocumentos(p: { nome: string; servico: string; faltando: string[] }) {
  return juntar(
    ola(p.nome),
    'Para dar andamento ao serviço abaixo, preciso de alguns documentos: 📂',
    `📌 *${p.servico}*`,
    p.faltando.map((d) => `☐ ${d}`).join('\n'),
    'Pode me enviar por aqui mesmo. Obrigada! 😊',
  );
}

export function msgRecibo(p: { nome: string; numero: string; servico: string; valor: string }) {
  return juntar(
    ola(p.nome),
    'Pagamento recebido, muito obrigada! ✅',
    `🧾 *Recibo nº ${p.numero}*`,
    topicos([`Referente a: ${p.servico}`, `Valor: ${p.valor}`]),
    'Envio o recibo em PDF logo abaixo. 📎',
  );
}

// Aviso automático quando a situação de um serviço muda
export function msgStatus(p: { nome: string; servico: string; status: string; valor?: string; pago?: boolean; faltando?: string[]; codigo?: string; prazo?: string; linkArea?: string; linkAvaliacao?: string }) {
  const corpo: Record<string, string> = {
    aguardando_docs: 'Para dar andamento ao seu pedido, estou *aguardando alguns documentos*. 📂',
    a_fazer: 'Recebi seu pedido e ele já está na minha fila de trabalho. ✅',
    andamento: 'Seu serviço está *em andamento*. ⏳ Assim que concluir, te aviso por aqui.',
    concluido: 'Seu serviço foi *concluído*! ✅',
    orcamento: 'Estou preparando o orçamento do seu pedido. 📋',
  };
  if (!corpo[p.status]) return '';
  return juntar(
    ola(p.nome),
    corpo[p.status],
    `📌 *${p.servico}*${p.codigo ? ` (${p.codigo})` : ''}`,
    !!p.prazo && p.status !== 'concluido' && `📅 Previsão de entrega: *${p.prazo}*`,
    p.status === 'concluido' && p.valor && !p.pago && `💰 Valor: *${p.valor}*\nPode fazer o pagamento por Pix. Se precisar dos dados, é só me pedir. 🙏`,
    !!p.faltando?.length && `Para agilizar, preciso que me envie:\n${p.faltando.map((d) => `☐ ${d}`).join('\n')}`,
    !!p.linkArea && `🔐 Acompanhe tudo pela sua área (o código de acesso é o mesmo de sempre):\n${p.linkArea}`,
    !!p.linkAvaliacao && `⭐ Se puder, conte como foi o atendimento (leva 1 minuto):\n${p.linkAvaliacao}`,
    'Qualquer dúvida, estou à disposição! 😊',
  );
}

// ---------- Fase 2 ----------
export function msgAcessoCliente(p: { nome: string; link: string; pin: string }) {
  return juntar(
    ola(p.nome),
    'Agora você pode acompanhar seus pedidos comigo pela sua área do cliente: 📋',
    topicos(['Situação e prazo de cada pedido', 'Envio de documentos', 'Orçamentos e recibos', 'Confirmação de pagamento']),
    `👉 ${p.link}\n🔑 Código de acesso: *${p.pin}*`,
    'Guarde esta mensagem. Qualquer dúvida, é só me chamar! 😊',
  );
}

// Só o código Pix, para copiar com um toque
export function msgSoPix(pix: string) {
  return pix;
}

// Cobrança em lote: todos os pedidos em aberto do cliente numa mensagem só
export function msgCobrancaLote(p: { nome: string; itens: { codigo?: string | null; servico: string; data: string; valor: string }[]; total: string; pix?: string; linkArea?: string }) {
  return juntar(
    ola(p.nome),
    'Tudo bem? Passando para lembrar, com carinho, dos serviços que ficaram em aberto: 🙏',
    p.itens.map((i) => `📌 *${i.servico}*${i.codigo ? ` (${i.codigo})` : ''}\n• Concluído em ${i.data} · ${i.valor}`).join('\n\n'),
    `💰 *Total: ${p.total}*`,
    !!p.pix && `💠 *Pix copia e cola* (já com o valor):\n${p.pix}`,
    !!p.linkArea && `🔐 Se preferir, envie o comprovante pela sua área:\n${p.linkArea}`,
    'Se já tiver pago, me desconsidere e me mande o comprovante, por favor. Obrigada! 😊',
  );
}

// Pedido feito pelo mapa de comarcas
export function msgComarca(p: { comarca: string; uf?: string; tipo?: string }) {
  return juntar(
    `Olá, ${CONTATO}! 👋\nVi o mapa de comarcas no seu site e preciso de um serviço presencial. ⚖️`,
    `📍 *Comarca: ${p.comarca}${p.uf ? ` - ${p.uf}` : ''}*`,
    topicos(['Serviço: ', 'Nº do processo: ', 'Prazo: ']),
    p.tipo === 'consulta' ? 'Sei que essa comarca é sob consulta. Pode verificar disponibilidade e valores? 😊' : 'Pode me passar disponibilidade e valores? 😊',
  );
}

export function msgEscritorio(p: { cidade?: string; servico?: string }) {
  return juntar(
    `Olá, ${CONTATO}! 👋\nSou de um escritório de advocacia e vim pela sua página para escritórios. ⚖️`,
    `💼 *${p.servico || 'Correspondente jurídica'}*`,
    topicos([p.cidade && `Comarca: ${p.cidade}`]),
    'Poderia me passar disponibilidade e valores? 😊',
  );
}

// Lembrete ao cliente, 1 dia útil antes (agenda ou prazo do pedido)
export function msgLembreteCliente(p: { nome: string; titulo: string; data: string; hora?: string; local?: string; codigo?: string; documentos?: boolean; linkArea?: string }) {
  return juntar(
    ola(p.nome),
    p.documentos ? 'Passando para lembrar que o prazo para os documentos está chegando: 📂' : 'Passando para lembrar do nosso compromisso: ⏰',
    `📌 *${p.titulo}*${p.codigo ? ` (${p.codigo})` : ''}`,
    topicos([`Data: ${p.data}`, p.hora && `Horário: ${p.hora}`, p.local && `Local: ${p.local}`]),
    !!p.linkArea && `${p.documentos ? '📤 Você pode enviar os documentos pela sua área:' : '🔐 Acompanhe pela sua área:'}\n${p.linkArea}`,
    'Qualquer dúvida, é só me chamar. 😊',
  );
}

// Contrato de pacote mensal para aceite
export function msgContrato(p: { nome: string; numero: string; pacote: string; valor: string; link: string }) {
  return juntar(
    ola(p.nome),
    'Segue o contrato do seu pacote mensal para leitura e aceite: 📄',
    `📦 *${p.pacote}*\n• Contrato nº ${p.numero}\n• Valor mensal: ${p.valor}`,
    `🔗 Leia e aceite por aqui (leva 1 minuto):\n${p.link}`,
    'Se preferir, pode responder esta mensagem com *ACEITO*. Qualquer dúvida, me chame! 😊',
  );
}
