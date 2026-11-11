'use client';
// Envio e organização de PDFs (modelos, formulários, exemplos de trabalho).
import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { apagarArquivo, enviarArquivo } from '@/lib/arquivos';
import CrudLista from './CrudLista';

export default function AbaDocumentos({ avisar }: { avisar: (m: string, e?: boolean) => void }) {
  const [versao, setVersao] = useState(0);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const arquivo = f.get('arquivo') as File | null;
    if (!arquivo || arquivo.size === 0) return avisar('Escolha um arquivo.', true);
    if (arquivo.size > 20 * 1024 * 1024) return avisar('Arquivo maior que 20 MB.', true);
    setEnviando(true);
    try {
      const { url, caminho } = await enviarArquivo(arquivo, 'documentos');
      const { error } = await supabase().from('documentos').insert({
        titulo: String(f.get('titulo') || arquivo.name),
        descricao: String(f.get('descricao') || ''),
        pasta: String(f.get('pasta') || 'Geral'),
        publico: f.get('publico') === 'on',
        arquivo_url: url,
        caminho,
        ordem: Date.now() % 1000000,
      });
      if (error) throw error;
      form.reset();
      setVersao((n) => n + 1);
      avisar('Documento enviado');
    } catch (err: any) {
      avisar(`Erro no envio: ${err.message}`, true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Documentos</h2>
        <p className="adm-sub">Suba PDFs (ou imagens) para mostrar no site. Desmarque “Público” para guardar só aqui no painel.</p>
      </div>

      <form className="adm-item" onSubmit={enviar}>
        <h3>Enviar novo documento</h3>
        <div className="adm-grade">
          <label>Título<input name="titulo" required placeholder="Ex.: Modelo de procuração" /></label>
          <label>Pasta<input name="pasta" defaultValue="Modelos" placeholder="Ex.: Modelos, Formulários, Trabalhos" /></label>
          <label style={{ gridColumn: '1 / -1' }}>Descrição<input name="descricao" placeholder="Opcional" /></label>
          <label>Arquivo<input name="arquivo" type="file" accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx" required /></label>
          <label className="adm-check"><input name="publico" type="checkbox" defaultChecked /> Público (aparece no site)</label>
        </div>
        <div><button className="adm-btn pri" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar documento'}</button></div>
      </form>

      <CrudLista
        tabela="documentos"
        avisar={avisar}
        recarregar={versao}
        textoNovo="Item sem arquivo"
        novo={{ titulo: 'Novo documento', pasta: 'Geral', publico: false }}
        campos={[
          { nome: 'titulo', rotulo: 'Título' },
          { nome: 'pasta', rotulo: 'Pasta' },
          { nome: 'publico', rotulo: 'Público', tipo: 'bool' },
          { nome: 'descricao', rotulo: 'Descrição', tipo: 'area' },
        ]}
        extra={(item) => item.arquivo_url ? (
          <a className="adm-btn peq" href={item.arquivo_url} target="_blank" rel="noopener noreferrer" style={{ justifySelf: 'start' }}>Abrir arquivo</a>
        ) : null}
        aoExcluir={async (item) => { await apagarArquivo(item.caminho); }}
      />
    </div>
  );
}
