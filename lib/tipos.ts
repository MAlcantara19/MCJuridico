// Formatos dos dados que vêm do banco.

export type Secao = { id: string; visivel: boolean };

export type Config = {
  id: number;
  marca: string;
  nome: string;
  profissao: string;
  descricao_hero: string;
  destaques: string;
  whatsapp: string;
  whatsapp_exibicao: string;
  instagram: string;
  email: string;
  mensagem_whatsapp: string;
  sobre_texto: string;
  area_atendimento: string;
  observacoes_correspondente: string;
  regras_pacotes: string;
  titulo_servicos: string;
  sub_servicos: string;
  nota_servicos: string;
  titulo_correspondente: string;
  sub_correspondente: string;
  titulo_pacotes: string;
  sub_pacotes: string;
  rotulo_teste: string;
  passos: string;
  assistente_saudacao: string;
  aviso_legal: string;
  rodape_credito: string;
  seo_titulo: string;
  seo_descricao: string;
  logo_url: string;
  foto_url: string;
  cor_primaria: string;
  cor_destaque: string;
  fonte_titulo: string;
  tema_padrao: 'auto' | 'claro' | 'escuro';
  hero_layout: 'com_foto' | 'foto_esquerda' | 'centro_com_imagem' | 'fundo' | 'classico';
  hero_moldura: 'livre' | 'quadrado' | 'retrato' | 'circulo' | 'arco';
  hero_ajuste: 'cobrir' | 'conter';
  hero_efeito: 'nenhum' | 'brilho' | 'grade' | 'pontos' | 'linhas';
  animacoes: boolean;
  mensagem_servico: string;
  mensagem_pacote: string;
  mensagem_cobranca: string;
  credito_nome: string;
  credito_whatsapp: string;
  credito_instagram: string;
  credito_mensagem: string;
  secoes: Secao[];
};

export type Categoria = { id: number; nome: string; descricao: string; icone: string; modalidade: 'remoto' | 'presencial'; ordem: number; ativo: boolean };
export type Servico = { id: number; categoria_id: number | null; nome: string; preco: string; ordem: number; ativo: boolean };
export type Pacote = { id: number; nome: string; publico: string; horas: string; preco: string; grupo: 'mensal' | 'teste' | 'correspondente'; destaque: boolean; ordem: number; ativo: boolean };
export type Formacao = { id: number; titulo: string; instituicao: string; ano: string; ordem: number };
export type Documento = { id: number; titulo: string; descricao: string; pasta: string; arquivo_url: string; caminho: string; publico: boolean; ordem: number };
export type Pergunta = { id: number; pergunta: string; resposta: string; palavras_chave: string; ordem: number; ativo: boolean };

export type Depoimento = { id: number; nome: string; cargo: string; texto: string; ordem: number; ativo: boolean };

export type Dados = {
  config: Config;
  categorias: Categoria[];
  servicos: Servico[];
  pacotes: Pacote[];
  formacoes: Formacao[];
  documentos: Documento[];
  perguntas: Pergunta[];
  depoimentos: Depoimento[];
};

// Seções da página, na ordem padrão.
export const SECOES_PADRAO: Secao[] = [
  { id: 'servicos', visivel: true },
  { id: 'correspondente', visivel: true },
  { id: 'pacotes', visivel: true },
  { id: 'como_funciona', visivel: true },
  { id: 'depoimentos', visivel: true },
  { id: 'sobre', visivel: true },
  { id: 'documentos', visivel: true },
  { id: 'perguntas', visivel: true },
  { id: 'contato', visivel: true },
];

// Nomes das seções no menu e no painel.
export const NOMES_SECOES: Record<string, string> = {
  servicos: 'Serviços',
  correspondente: 'Correspondente',
  pacotes: 'Pacotes',
  como_funciona: 'Como funciona',
  depoimentos: 'Depoimentos',
  sobre: 'Sobre',
  documentos: 'Documentos',
  perguntas: 'Dúvidas',
  contato: 'Contato',
};

// Junta as seções salvas no banco com seções novas que surgirem em atualizações.
export function juntarSecoes(salvas: Secao[] | null | undefined): Secao[] {
  const base = Array.isArray(salvas) && salvas.length ? salvas : SECOES_PADRAO;
  const novas = SECOES_PADRAO.filter((s) => !base.some((b) => b.id === s.id));
  // Seção nova entra logo depois de onde ela fica no padrão
  const resultado = [...base];
  for (const n of novas) {
    const idxPadrao = SECOES_PADRAO.findIndex((s) => s.id === n.id);
    const anterior = SECOES_PADRAO[idxPadrao - 1];
    const pos = anterior ? resultado.findIndex((s) => s.id === anterior.id) + 1 : 0;
    resultado.splice(pos, 0, n);
  }
  return resultado;
}
