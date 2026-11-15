'use client';
// Backup: baixa todos os dados do banco num arquivo .json (guarde no computador ou no Drive).
// Arquivos (PDFs, fotos, comprovantes) ficam no Supabase Storage e não entram neste arquivo.
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const TABELAS = [
  'configuracoes', 'categorias', 'servicos', 'pacotes', 'formacoes', 'documentos', 'perguntas', 'depoimentos',
  'solicitacoes', 'clientes', 'atendimentos', 'agenda', 'relatorios', 'orcamentos', 'despesas', 'respostas',
  'arquivos_privados', 'perfis',
];

export default function Backup({ avisar }: { avisar: (m: string, e?: boolean) => void }) {
  const [baixando, setBaixando] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(() => {
    try { return localStorage.getItem('mc-backup'); } catch { return null; }
  });

  async function baixar() {
    setBaixando(true);
    const dados: Record<string, unknown[]> = {};
    const avisos: string[] = [];
    for (const t of TABELAS) {
      const { data, error } = await supabase().from(t).select('*').limit(50000);
      if (error) avisos.push(t);
      else dados[t] = data ?? [];
    }
    const conteudo = { site: 'MC Jurídico', gerado_em: new Date().toISOString(), tabelas: dados };
    const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    const dia = new Date().toISOString().slice(0, 10);
    a.href = URL.createObjectURL(blob);
    a.download = `backup-mcjuridico-${dia}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    const agora = new Date().toLocaleString('pt-BR');
    try { localStorage.setItem('mc-backup', agora); } catch {}
    setUltimo(agora);
    setBaixando(false);
    const total = Object.values(dados).reduce((s, l) => s + l.length, 0);
    avisar(avisos.length ? `Backup baixado (${total} registros). Não deu para ler: ${avisos.join(', ')}` : `Backup baixado: ${total} registros`, avisos.length > 0);
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
        <button className="adm-btn pri" onClick={baixar} disabled={baixando}>{baixando ? 'Gerando…' : 'Baixar backup agora'}</button>
        <span className="adm-dica" style={{ margin: 0 }}>{ultimo ? `Último backup neste aparelho: ${ultimo}` : 'Nenhum backup feito neste aparelho ainda.'}{atrasado ? ' · Hora de fazer um novo!' : ''}</span>
      </div>
    </div>
  );
}
