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

// ---------- Arquivos privados (só o painel acessa) ----------
// Ficam na pasta "privado" do Supabase, que não é pública. Para abrir, o painel gera
// um link temporário (assinado) que expira sozinho.
export async function enviarPrivado(arquivo: File) {
  const limpo = arquivo.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const caminho = `${new Date().getFullYear()}/${Date.now()}-${limpo}`;
  const { error } = await supabase().storage.from('privado').upload(caminho, arquivo, {
    contentType: arquivo.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return caminho;
}

export async function linkPrivado(caminho: string, segundos = 60, baixarComo?: string) {
  const { data, error } = await supabase().storage.from('privado')
    .createSignedUrl(caminho, segundos, baixarComo ? { download: baixarComo } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function apagarPrivado(caminho: string) {
  if (!caminho) return;
  await supabase().storage.from('privado').remove([caminho]);
}
