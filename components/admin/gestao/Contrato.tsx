'use client';
// Contrato de pacote mensal: monta, gera PDF e envia o link de aceite pelo WhatsApp.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Config, Pacote } from '@/lib/tipos';
import { msgContrato } from '@/lib/mensagens';
import { brl, dataBR, hojeISO, whatsDoTelefone, type Cliente } from '@/lib/gestao';
import TextoContrato, { CLAUSULAS_PADRAO, type DadosContrato } from '@/components/cliente/TextoContrato';

type Aviso = (m: string, e?: boolean) => void;
type Salvo = DadosContrato & { id: number; token: string; criado_em: string };

function novoToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
const numeroDe = (p: string) => Number(String(p).replace(/[^\d,]/g, '').replace(',', '.')) || 0;

export default function Contrato({ cliente, config, avisar, fechar }: { cliente: Cliente; config: Config; avisar: Aviso; fechar: () => void }) {
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [salvos, setSalvos] = useState<Salvo[]>([]);
  const [vendo, setVendo] = useState<Salvo | null>(null);
  const numero = useMemo(() => `CT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`, []);
  const [v, setV] = useState({
    pacote: '', horas_mes: String(cliente.horas_mes || ''), valor_mensal: '', hora_extra: String(config.hora_extra || ''),
    dia_vencimento: '10', inicio: hojeISO(), meses: '12', clausulas: CLAUSULAS_PADRAO,
  });
  const mudar = (c: keyof typeof v, x: string) => setV((o) => ({ ...o, [c]: x }));

  async function carregar() {
    const [p, k] = await Promise.all([
      supabase().from('pacotes').select('*').eq('ativo', true).neq('grupo', 'teste').order('ordem'),
      supabase().from('contratos').select('*').eq('cliente_id', cliente.id).order('criado_em', { ascending: false }),
    ]);
    setPacotes((p.data as Pacote[]) ?? []);
    if (k.error) avisar(`Erro: ${k.error.message}. Rodou o atualizacao-17.sql?`, true);
    setSalvos(((k.data ?? []) as any[]).map((x) => ({ ...x, cliente })));
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function escolherPacote(nome: string) {
    const p = pacotes.find((x) => x.nome === nome);
    setV((o) => ({ ...o, pacote: nome, valor_mensal: p ? String(numeroDe(p.preco)).replace('.', ',') : o.valor_mensal, horas_mes: p ? String(numeroDe(p.horas) || o.horas_mes) : o.horas_mes }));
  }

  const dados: DadosContrato = {
    numero, pacote: v.pacote || 'Pacote mensal', horas_mes: numeroDe(v.horas_mes), valor_mensal: numeroDe(v.valor_mensal),
    hora_extra: numeroDe(v.hora_extra), dia_vencimento: Number(v.dia_vencimento) || 10, inicio: v.inicio || hojeISO(),
    meses: Number(v.meses) || 12, clausulas: v.clausulas,
    cliente: { nome: cliente.nome, responsavel: cliente.responsavel, documento: cliente.documento, cidade: cliente.cidade },
  };

  async function salvarEnviar() {
    if (!dados.valor_mensal) return avisar('Preencha o valor mensal.', true);
    const token = novoToken();
    const { cliente: _c, ...resto } = dados;
    const { error } = await supabase().from('contratos').insert({ ...resto, cliente_id: cliente.id, token, status: 'enviado' });
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-17.sql?`, true);
    avisar('Contrato salvo na ficha');
    if (cliente.telefone) {
      window.open(whatsDoTelefone(cliente.telefone, msgContrato({
        nome: cliente.responsavel || cliente.nome, numero, pacote: dados.pacote, valor: brl(dados.valor_mensal), link: `${window.location.origin}/contrato/${token}`,
      })), '_blank', 'noopener');
    }
    carregar();
  }

  async function marcarAceito(k: Salvo) {
    const nome = prompt('Quem aceitou pelo WhatsApp?', cliente.responsavel || cliente.nome);
    if (!nome) return;
    const { error } = await supabase().from('contratos').update({ status: 'aceito', aceito_em: new Date().toISOString(), aceito_nome: `${nome} (pelo WhatsApp)` }).eq('id', k.id);
    if (error) return avisar(error.message, true);
    avisar('Contrato marcado como aceito');
    carregar();
  }
  async function cancelar(k: Salvo) {
    if (!confirm(`Cancelar o contrato ${k.numero}? O link de aceite para de funcionar.`)) return;
    await supabase().from('contratos').update({ status: 'cancelado' }).eq('id', k.id);
    carregar();
  }
  async function copiarLink(k: Salvo) {
    const link = `${window.location.origin}/contrato/${k.token}`;
    try { await navigator.clipboard.writeText(link); avisar('Link copiado'); } catch { prompt('Copie o link:', link); }
  }

  if (vendo) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="adm-linha nao-imprimir">
          <button className="adm-btn pri" onClick={() => window.print()}>Gerar PDF</button>
          <button className="adm-btn" onClick={() => setVendo(null)}>Voltar</button>
        </div>
        <TextoContrato d={vendo} config={config} assinatura={config.assinatura_url} />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="adm-item mudou nao-imprimir">
        <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>📄 Contrato de pacote mensal · {cliente.nome}</h3>
          <button className="adm-btn peq" onClick={fechar}>Fechar</button>
        </div>

        {salvos.length > 0 && (
          <div className="adm-lista">
            {salvos.map((k) => (
              <div key={k.id} className="adm-linha contrato-linha">
                <strong>{k.numero}</strong>
                <span style={{ flex: 1 }}>{k.pacote} · {brl(k.valor_mensal)}/mês · desde {dataBR(k.inicio)}</span>
                <span className="etq" style={{ ['--cor' as string]: k.status === 'aceito' ? '#2e7d32' : k.status === 'cancelado' ? '#5b6780' : '#e08a00' }}>
                  {k.status === 'aceito' ? `✓ Aceito ${k.aceito_em ? new Date(k.aceito_em).toLocaleDateString('pt-BR') : ''}` : k.status === 'cancelado' ? 'Cancelado' : 'Aguardando aceite'}
                </span>
                <button className="adm-btn peq" onClick={() => setVendo(k)}>Ver / PDF</button>
                {k.status === 'enviado' && <>
                  <button className="adm-btn peq" onClick={() => copiarLink(k)}>Copiar link</button>
                  <button className="adm-btn peq" onClick={() => marcarAceito(k)}>Aceitou no WhatsApp</button>
                  <button className="adm-btn peq perigo" onClick={() => cancelar(k)}>Cancelar</button>
                </>}
              </div>
            ))}
          </div>
        )}

        <div className="adm-grade">
          <label>
            Pacote
            <input value={v.pacote} onChange={(e) => escolherPacote(e.target.value)} list="lista-pacotes" placeholder="Escolha ou digite" />
            <datalist id="lista-pacotes">{pacotes.map((p) => <option key={p.id} value={p.nome}>{p.preco}</option>)}</datalist>
          </label>
          <label>Horas por mês<input inputMode="decimal" value={v.horas_mes} onChange={(e) => mudar('horas_mes', e.target.value)} /></label>
          <label>Valor mensal (R$)<input inputMode="decimal" value={v.valor_mensal} onChange={(e) => mudar('valor_mensal', e.target.value)} placeholder="Ex.: 900,00" /></label>
          <label>Hora extra (R$)<input inputMode="decimal" value={v.hora_extra} onChange={(e) => mudar('hora_extra', e.target.value)} /></label>
          <label>Vencimento (dia do mês)<input inputMode="numeric" value={v.dia_vencimento} onChange={(e) => mudar('dia_vencimento', e.target.value)} /></label>
          <label>Início<input type="date" value={v.inicio} onChange={(e) => mudar('inicio', e.target.value)} /></label>
          <label>Duração (meses)<input inputMode="numeric" value={v.meses} onChange={(e) => mudar('meses', e.target.value)} /></label>
          <label style={{ gridColumn: '1 / -1' }}>Cláusulas extras (uma por linha)<textarea rows={6} value={v.clausulas} onChange={(e) => mudar('clausulas', e.target.value)} /></label>
        </div>
        <div className="adm-linha">
          <button className="adm-btn pri" onClick={salvarEnviar}>{cliente.telefone ? 'Salvar e enviar para aceite no WhatsApp' : 'Salvar contrato'}</button>
          <button className="adm-btn" onClick={() => window.print()}>Gerar PDF</button>
        </div>
        <p className="adm-dica" style={{ margin: 0 }}>O cliente recebe um link para ler e aceitar. O aceite fica registrado aqui (nome, data e hora). Se ele responder “ACEITO” no WhatsApp, use “Aceitou no WhatsApp”.</p>
      </div>
      <TextoContrato d={dados} config={config} assinatura={config.assinatura_url} />
    </div>
  );
}
