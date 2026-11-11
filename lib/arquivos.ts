// Envio de arquivos (PDF, imagens) para o Supabase Storage, pasta "arquivos".
import { supabase } from './supabase';

export async function enviarArquivo(arquivo: File, pasta: string) {
  const limpo = arquivo.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const caminho = `${pasta}/${Date.now()}-${limpo}`;
  const { error } = await supabase().storage.from('arquivos').upload(caminho, arquivo, {
    contentType: arquivo.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase().storage.from('arquivos').getPublicUrl(caminho);
  return { url: data.publicUrl, caminho };
}

export async function apagarArquivo(caminho: string) {
  if (!caminho) return;
  await supabase().storage.from('arquivos').remove([caminho]);
}
