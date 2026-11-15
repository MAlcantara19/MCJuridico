'use client';
// Respostas prontas: modelos de mensagem para copiar e colar no WhatsApp Web ou abrir direto na conversa.
// {nome} = primeiro nome do cliente · {cliente} = nome do escritório/cliente · {site} = endereço do site
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { combina } from '@/lib/util';
import { whatsDoTelefone, type Cliente } from '@/lib/gestao';
import CrudLista from './CrudLista';

type Resposta = { id: number; titulo: string; texto: string; ordem: number; ativo: boolean };

export default function AbaRespostas({ avisar }: { avisar: (m: string, e?: boolean) => void }) {
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [nomeLivre, setNomeLivre] = useState('');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    (async () => {
      const [r, c] = await Promise.all([
        supabase().from('respostas').select('*').eq('ativo', true).order('ordem'),
        supabase().from('clientes').select('*').order('nome'),
      ]);
      if (r.error) avisar(`Erro: ${r.error.message}. Rodou o atualizacao-11.sql?`, true);
      setRespostas((r.data as Resposta[]) ?? []);
      setClientes((c.data as Cliente[]) ?? []);
    })();
  }, [versao]); // eslint-disable-line react-hooks/exhaustive-deps

  const cliente = clientes.find((c) => c.id === clienteId);
  const nome = (cliente?.responsavel || cliente?.nome || nomeLivre).trim().split(' ')[0];
  const site = typeof window !== 'undefined' ? window.location.origin : '';
  const preencher = (t: string) => t
    .replace(/,? ?\{nome\}/g, (m) => (nome ? m.replace('{nome}', nome) : ''))
    .replaceAll('{cliente}', cliente?.nome || nomeLivre || '')
    .replaceAll('{site}', site);

  async function copiar(r: Resposta) {
    const texto = preencher(r.texto);
    try { await navigator.clipboard.writeText(texto); avisar(`"${r.titulo}" copiada. É só colar no WhatsApp.`); } catch { prompt('Copie a mensagem:', texto); }
  }

  const visiveis = respostas.filter((r) => !busca.trim() || combina(`${r.titulo} ${r.texto}`, busca));

  if (editando) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Editar respostas</h2>
          <button className="adm-btn" onClick={() => { setEditando(false); setVersao((n) => n + 1); }}>← Voltar para usar</button>
        </div>
        <p className="adm-sub">Use {'{nome}'} para o primeiro nome do cliente, {'{cliente}'} para o nome do escritório e {'{site}'} para o endereço do site. *Negrito* funciona no WhatsApp.</p>
        <CrudLista
          tabela="respostas"
          avisar={avisar}
          textoNovo="Nova resposta"
          novo={{ titulo: 'Nova resposta', texto: 'Olá, {nome}! 👋\n\n' }}
          campos={[
            { nome: 'titulo', rotulo: 'Nome da resposta' },
            { nome: 'ativo', rotulo: 'Ativa', tipo: 'bool' },
            { nome: 'texto', rotulo: 'Mensagem', tipo: 'area' },
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Respostas prontas</h2>
        <p className="adm-sub">Escolha o cliente, copie a mensagem e cole no WhatsApp Web (ou abra direto na conversa).</p>
      </div>

      <div className="adm-item">
        <div className="adm-grade">
          <label>
            Cliente
            <select value={clienteId ?? ''} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Nenhum (digitar nome)</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          {!cliente && <label>Nome da pessoa<input value={nomeLivre} onChange={(e) => setNomeLivre(e.target.value)} placeholder="Ex.: Paulo" /></label>}
          <label>Buscar<input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: documentos, pagamento…" /></label>
        </div>
        <div><button className="adm-btn peq" onClick={() => setEditando(true)}>Editar / criar respostas</button></div>
      </div>

      {visiveis.length === 0 && <p className="adm-sub">Nenhuma resposta encontrada.</p>}
      <div className="respostas">
        {visiveis.map((r) => (
          <div key={r.id} className="adm-item resposta">
            <strong>{r.titulo}</strong>
            <pre className="previa-msg">{preencher(r.texto)}</pre>
            <div className="adm-linha">
              <button className="adm-btn pri peq" onClick={() => copiar(r)}>Copiar</button>
              {cliente?.telefone && (
                <a className="adm-btn peq" href={whatsDoTelefone(cliente.telefone, preencher(r.texto))} target="_blank" rel="noopener noreferrer">Abrir no WhatsApp</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
