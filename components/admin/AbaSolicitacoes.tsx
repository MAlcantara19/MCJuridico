'use client';
// Pedidos que chegaram pelo formulário do site.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { combina, linkWhats } from '@/lib/util';

type Solicitacao = { id: number; nome: string; contato: string; email: string; servico: string; mensagem: string; status: string; criado_em: string };
const STATUS = ['nova', 'em andamento', 'concluída'];

export default function AbaSolicitacoes({ avisar, irPara }: { avisar: (m: string, e?: boolean) => void; irPara?: (aba: string) => void }) {
  // Transforma a solicitação em cliente + serviço em "Orçamento"
  async function virarCliente(s: Solicitacao) {
    const { data, error } = await supabase().from('clientes')
      .insert({ nome: s.nome, telefone: s.contato, email: s.email, tipo: 'escritorio', observacoes: 'Veio pelo formulário do site.' })
      .select('id').single();
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-06.sql?`, true);
    await supabase().from('atendimentos').insert({
      cliente_id: (data as { id: number }).id, servico: s.servico || 'A definir', descricao: s.mensagem,
      status: 'orcamento', valor: 0, data: new Date().toISOString().slice(0, 10),
    });
    if (s.status === 'nova') await supabase().from('solicitacoes').update({ status: 'em andamento' }).eq('id', s.id);
    avisar('Cliente criado com o pedido em Orçamento');
    irPara?.('clientes');
  }

  const [lista, setLista] = useState<Solicitacao[]>([]);
  const [filtro, setFiltro] = useState('todas');

  async function carregar() {
    const { data, error } = await supabase().from('solicitacoes').select('*').order('criado_em', { ascending: false });
    if (error) return avisar(error.message, true);
    setLista((data as Solicitacao[]) ?? []);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function mudarStatus(s: Solicitacao, status: string) {
    const { error } = await supabase().from('solicitacoes').update({ status }).eq('id', s.id);
    if (error) return avisar(error.message, true);
    setLista((l) => l.map((x) => (x.id === s.id ? { ...x, status } : x)));
  }

  async function excluir(s: Solicitacao) {
    if (!confirm('Excluir esta solicitação?')) return;
    const { error } = await supabase().from('solicitacoes').delete().eq('id', s.id);
    if (error) return avisar(error.message, true);
    setLista((l) => l.filter((x) => x.id !== s.id));
  }

  const [busca, setBusca] = useState('');
  const termo = busca.trim();
  const visiveis = (filtro === 'todas' ? lista : lista.filter((s) => s.status === filtro))
    .filter((s) => !termo || combina(`${s.nome} ${s.contato} ${s.email} ${s.servico} ${s.mensagem}`, termo));
  const novas = lista.filter((s) => s.status === 'nova').length;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Solicitações {novas > 0 && <span className="adm-badge">{novas} nova{novas > 1 ? 's' : ''}</span>}</h2>
        <p className="adm-sub">Pedidos enviados pelo formulário do site.</p>
      </div>
      <div className="adm-linha">
        {['todas', ...STATUS].map((s) => (
          <button key={s} className={`adm-btn peq${filtro === s ? ' pri' : ''}`} onClick={() => setFiltro(s)}>{s[0].toUpperCase() + s.slice(1)}</button>
        ))}
        <button className="adm-btn peq" onClick={carregar}>Atualizar</button>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar nome, serviço…" aria-label="Buscar solicitação" style={{ maxWidth: 260 }} />
      </div>
      {visiveis.length === 0 && <p className="adm-sub">Nenhuma solicitação aqui.</p>}
      <div className="adm-lista">
        {visiveis.map((s) => (
          <div key={s.id} className="adm-item">
            <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
              <strong>{s.nome}</strong>
              <span className="adm-dica">{new Date(s.criado_em).toLocaleString('pt-BR')}</span>
            </div>
            <div><span className="adm-badge">{s.servico || 'Sem serviço'}</span></div>
            <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{s.mensagem}</p>
            <p className="adm-dica" style={{ margin: 0 }}>{s.contato}{s.email ? ` · ${s.email}` : ''}</p>
            <div className="adm-linha">
              <select value={s.status} onChange={(e) => mudarStatus(s, e.target.value)} style={{ width: 'auto' }} aria-label="Status">
                {STATUS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
              <a className="adm-btn peq" href={linkWhats(s.contato.replace(/\D/g, '').length <= 11 ? `55${s.contato}` : s.contato, `Olá, ${s.nome}! Aqui é a Maria Carolina, recebi sua solicitação pelo site.`)} target="_blank" rel="noopener noreferrer">Responder no WhatsApp</a>
              <button className="adm-btn peq" onClick={() => virarCliente(s)}>Virar cliente</button>
              <button className="adm-btn peq perigo" onClick={() => excluir(s)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
