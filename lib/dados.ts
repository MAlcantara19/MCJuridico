// Busca tudo o que o site precisa no banco (usado pelas páginas públicas).
import { cache } from 'react';
import { supabaseServidor } from './supabase';
import type { Dados } from './tipos';

export const carregarDados = cache(async (): Promise<Dados | null> => {
  const sb = supabaseServidor();
  const [config, categorias, servicos, pacotes, formacoes, documentos, perguntas, depoimentos] = await Promise.all([
    sb.from('configuracoes').select('*').eq('id', 1).maybeSingle(),
    sb.from('categorias').select('*').eq('ativo', true).order('ordem'),
    sb.from('servicos').select('*').eq('ativo', true).order('ordem'),
    sb.from('pacotes').select('*').eq('ativo', true).order('ordem'),
    sb.from('formacoes').select('*').order('ordem'),
    sb.from('documentos').select('*').eq('publico', true).order('ordem'),
    sb.from('perguntas').select('*').eq('ativo', true).order('ordem'),
    sb.from('depoimentos').select('*').eq('ativo', true).order('ordem'),
  ]);
  if (!config.data) return null;
  return {
    config: config.data,
    categorias: categorias.data ?? [],
    servicos: servicos.data ?? [],
    pacotes: pacotes.data ?? [],
    formacoes: formacoes.data ?? [],
    documentos: documentos.data ?? [],
    perguntas: perguntas.data ?? [],
    depoimentos: depoimentos.data ?? [], // se a tabela ainda não existir, fica vazio
  };
});
