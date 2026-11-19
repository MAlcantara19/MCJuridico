'use client';
// Backup: baixa todos os dados do banco num arquivo .json (guarde no computador ou no Drive).
// Arquivos (PDFs, fotos, comprovantes) ficam no Supabase Storage e não entram neste arquivo.
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const TABELAS = [
  'configuracoes', 'categorias', 'servicos', 'pacotes', 'formacoes', 'documentos', 'perguntas', 'depoimentos',
  'solicitacoes', 'clientes', 'atendimentos', 'agenda', 'relatorios', 'orcamentos', 'despesas', 'respostas',
  'arquivos_privados', 'notas_pedido', 'horas', 'envios', 'comarcas', 'historico_pedido', 'feriados', 'contratos', 'perfis',
];

// Só a "cara" do site, sem dados de clientes: serve de modelo para montar o site de outro profissional
const MODELO = ['configuracoes', 'categorias', 'servicos', 'pacotes', 'perguntas', 'respostas', 'comarcas'];

// Modelo "limpo" para vender a outros profissionais: troca nome, marca, contatos, Pix e imagens por campos a preencher
const LIMPAR_CONFIG: Record<string, string> = {
  nome: 'Seu Nome', marca: 'Sua Marca', whatsapp: '5500000000000', whatsapp_exibicao: '(00) 00000-0000',
  instagram: '', email: '', pix_chave: '', pix_nome: '', pix_cidade: '', logo_url: '', foto_url: '', assinatura_url: '',
  area_atendimento: 'Sua cidade/UF', rodape_credito: '',
};
function limparTextos(valor: unknown, trocas: [string, string][]): unknown {
  if (typeof valor === 'string') return trocas.reduce((t, [de, para]) => (de ? t.split(de).join(para) : t), valor);
  if (Array.isArray(valor)) return valor.map((v) => limparTextos(v, trocas));
  if (valor && typeof valor === 'object') return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limparTextos(v, trocas)]));
  return valor;
}
// O que a restauração completa repõe (os acessos ao painel nunca são trocados)
const RESTAURAVEIS = TABELAS.filter((t) => t !== 'perfis');

export default function Backup({ avisar }: { avisar: (m: string, e?: boolean) => void }) {
  const [baixando, setBaixando] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(() => {
    try { return localStorage.getItem('mc-backup'); } catch { return null; }
  });

  const [restaurando, setRestaurando] = useState(false);

  async function baixar(lista: string[] = TABELAS, tipo: 'backup' | 'modelo' | 'generico' = 'backup') {
    setBaixando(true);
    const dados: Record<string, unknown[]> = {};
    const avisos: string[] = [];
    for (const t of lista) {
      const { data, error } = await supabase().from(t).select('*').limit(50000);
      if (error) avisos.push(t);
      else dados[t] = data ?? [];
    }
    if (tipo === 'generico' && dados.configuracoes?.[0]) {
      const cfg = dados.configuracoes[0] as Record<string, any>;
      const nome = String(cfg.nome || '').trim();
      const trocas: [string, string][] = [
        [nome, 'Seu Nome'], [nome.split(' ').slice(0, 2).join(' '), 'Seu Nome'], [String(cfg.marca || ''), 'Sua Marca'],
        [String(cfg.whatsapp_exibicao || ''), '(00) 00000-0000'], [String(cfg.instagram || ''), ''], [String(cfg.email || ''), ''],
      ].filter(([de]) => de.length > 2) as [string, string][];
      for (const t of Object.keys(dados)) dados[t] = limparTextos(dados[t], trocas) as unknown[];
      Object.assign(dados.configuracoes[0] as object, LIMPAR_CONFIG);
    }
    const conteudo = { site: 'MC Jurídico', tipo: tipo === 'generico' ? 'modelo' : tipo, gerado_em: new Date().toISOString(), tabelas: dados };
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const dia = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = tipo === 'generico' ? `modelo-generico-${dia}.json` : `${tipo}-mcjuridico-${dia}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    if (tipo === 'backup') {
      const agora = new Date().toLocaleString('pt-BR');
      try { localStorage.setItem('mc-backup', agora); } catch {}
      setUltimo(agora);
    }
    setBaixando(false);
    const total = Object.values(dados).reduce((s, l) => s + l.length, 0);
    if (tipo !== 'backup') return avisar(`Modelo baixado (${total} registros)`);
    avisar(avisos.length ? `Backup baixado (${total} registros). Não deu para ler: ${avisos.join(', ')}` : `Backup baixado: ${total} registros`, avisos.length > 0);
  }

  // Restaura um arquivo de backup (tudo) ou de modelo (só a cara do site)
  async function restaurar(arquivo: File | undefined, soModelo: boolean) {
    if (!arquivo) return;
    let conteudo: { tipo?: string; tabelas?: Record<string, unknown[]> };
    try { conteudo = JSON.parse(await arquivo.text()); } catch { return avisar('Arquivo inválido. Use um .json baixado por este painel.', true); }
    if (!conteudo?.tabelas) return avisar('Arquivo inválido. Use um .json baixado por este painel.', true);
    const lista = (soModelo ? MODELO : RESTAURAVEIS).filter((t) => conteudo.tabelas![t]);
    const aviso = soModelo
      ? 'Importar o modelo vai SUBSTITUIR textos, cores, serviços, pacotes, perguntas e respostas prontas deste site. Clientes e financeiro não mudam.'
      : 'Restaurar vai SUBSTITUIR todos os dados atuais pelos do arquivo (os acessos ao painel continuam iguais).';
    const resp = prompt(`${aviso}\n\nAntes, um backup do que existe hoje será baixado.\n\nPara confirmar, digite RESTAURAR:`);
    if (resp?.trim().toUpperCase() !== 'RESTAURAR') return avisar('Restauração cancelada.');
    setRestaurando(true);
    await baixar(); // segurança: guarda o estado atual antes
    const { data, error } = await supabase().rpc('restaurar_dados', { dados: conteudo, tabelas: lista });
    setRestaurando(false);
    if (error) return avisar(`Erro ao restaurar: ${error.message}. Rodou o atualizacao-15.sql? Os dados atuais não foram alterados.`, true);
    avisar(`Pronto! ${(data as { total: number })?.total ?? 0} registros restaurados. Recarregando…`);
    setTimeout(() => window.location.reload(), 1800);
  }

  // Lembra de fazer backup se faz mais de 7 dias
  const atrasado = (() => {
    if (!ultimo) return true;
    const [d, m, rest] = ultimo.split('/');
    const data = new Date(Number(rest?.slice(0, 4)), Number(m) - 1, Number(d));
    return Date.now() - data.getTime() > 7 * 864e5;
  })();

  return (
    <div className={`adm-item${atrasado ? ' mudou' : ''}`}>
      <h3>Backup dos dados</h3>
      <p className="adm-dica" style={{ margin: 0 }}>
        Baixa tudo do banco (clientes, financeiro, agenda, serviços, textos…) num arquivo .json. O plano grátis do Supabase não faz backup sozinho, então baixe uma vez por semana e guarde no Drive.
        PDFs, fotos e comprovantes ficam no Supabase e não entram no arquivo.
      </p>
      <div className="adm-linha">
        <button className="adm-btn pri" onClick={() => baixar()} disabled={baixando}>{baixando ? 'Gerando…' : 'Baixar backup agora'}</button>
        <span className="adm-dica" style={{ margin: 0 }}>{ultimo ? `Último backup neste aparelho: ${ultimo}` : 'Nenhum backup feito neste aparelho ainda.'}{atrasado ? ' · Hora de fazer um novo!' : ''}</span>
      </div>
      <div className="adm-linha" style={{ borderTop: '1px solid var(--l)', paddingTop: 12 }}>
        <label className="adm-btn" style={{ cursor: 'pointer' }}>
          {restaurando ? 'Restaurando…' : '♻️ Restaurar backup'}
          <input type="file" accept="application/json,.json" hidden disabled={restaurando} onChange={(e) => { restaurar(e.target.files?.[0], false); e.target.value = ''; }} />
        </label>
        <span className="adm-dica" style={{ margin: 0 }}>Use só se algo der errado. Substitui os dados pelos do arquivo.</span>
      </div>

      <div style={{ borderTop: '1px solid var(--l)', paddingTop: 12, display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Duplicar site (modelo)</h3>
        <p className="adm-dica" style={{ margin: 0 }}>Baixe o modelo deste site (textos, cores, tema, serviços, pacotes, perguntas e respostas prontas, sem nenhum dado de cliente) e importe no site de outro profissional. Passo a passo no arquivo NOVO-SITE.md do projeto.</p>
        <div className="adm-linha">
          <button className="adm-btn" onClick={() => baixar(MODELO, 'modelo')} disabled={baixando}>Baixar modelo do site</button>
          <button className="adm-btn" onClick={() => baixar(MODELO.filter((t) => t !== 'comarcas'), 'generico')} disabled={baixando} title="Sem nome, marca, contatos, Pix, imagens e comarcas">Baixar modelo genérico (limpo)</button>
          <label className="adm-btn" style={{ cursor: 'pointer' }}>
            Importar modelo
            <input type="file" accept="application/json,.json" hidden disabled={restaurando} onChange={(e) => { restaurar(e.target.files?.[0], true); e.target.value = ''; }} />
          </label>
        </div>
      </div>
    </div>
  );
}
