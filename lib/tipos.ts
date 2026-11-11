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
  hero_layout: 'classico' | 'com_foto';
  secoes: Secao[];
};

export type Categoria = { id: number; nome: string; descricao: string; modalidade: 'remoto' | 'presencial'; ordem: number; ativo: boolean };
export type Servico = { id: number; categoria_id: number | null; nome: string; preco: string; ordem: number; ativo: boolean };
export type Pacote = { id: number; nome: string; publico: string; horas: string; preco: string; grupo: 'mensal' | 'teste' | 'correspondente'; destaque: boolean; ordem: number; ativo: boolean };
export type Formacao = { id: number; titulo: string; instituicao: string; ano: string; ordem: number };
export type Documento = { id: number; titulo: string; descricao: string; pasta: string; arquivo_url: string; caminho: string; publico: boolean; ordem: number };
export type Pergunta = { id: number; pergunta: string; resposta: string; palavras_chave: string; ordem: number; ativo: boolean };

export type Dados = {
  config: Config;
  categorias: Categoria[];
  servicos: Servico[];
  pacotes: Pacote[];
  formacoes: Formacao[];
  documentos: Documento[];
  perguntas: Pergunta[];
};

// Seções da página, na ordem padrão.
export const SECOES_PADRAO: Secao[] = [
  { id: 'servicos', visivel: true },
  { id: 'correspondente', visivel: true },
  { id: 'pacotes', visivel: true },
  { id: 'como_funciona', visivel: true },
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
  sobre: 'Sobre',
  documentos: 'Documentos',
  perguntas: 'Dúvidas',
  contato: 'Contato',
};
