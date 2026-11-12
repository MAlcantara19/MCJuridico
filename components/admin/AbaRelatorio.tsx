'use client';
// Relatório de diligência + "Concluir diligência":
// gera o PDF, salva o relatório (com fotos) na ficha do cliente e lança o serviço no Financeiro, num clique.
import { useEffect, useState } from 'react';
import type { Config } from '@/lib/tipos';
import { supabase } from '@/lib/supabase';
import { enviarPrivado, linkPrivado } from '@/lib/arquivos';
import { brl, dataBR as formatarData, iso, whatsDoTelefone, type Cliente } from '@/lib/gestao';

type Foto = { url: string; legenda: string; arquivo?: File; caminho?: string };

const agora = () => {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return { data: iso(d), hora: `${z(d.getHours())}:${z(d.getMinutes())}` };
};

const VAZIO = () => ({
  cliente: '', advogado: '', processo: '', comarca: 'Três Rios/RJ', local: '',
  tipo: '', data: agora().data, hora: agora().hora, resultado: 'Cumprida', descricao: '', observacoes: '', custas: '',
});

type Props = {
  config: Config;
  avisar: (m: string, e?: boolean) => void;
  relatorioId?: number | null;      // abre um relatório já salvo
  clienteInicial?: number | null;   // começa com este cliente escolhido
  aoConcluir?: (clienteId: number | null) => void;
};

export default function AbaRelatorio({ config, avisar, relatorioId, clienteInicial, aoConcluir }: Props) {
  const [tipos, setTipos] = useState<string[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState<number | null>(clienteInicial ?? null);
  const [r, setR] = useState(VAZIO());
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [concluindo, setConcluindo] = useState(false);
  const [valor, setValor] = useState('');
  const [lancar, setLancar] = useState(true);
  const [pago, setPago] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Tipos de diligência (serviços presenciais) e clientes
  useEffect(() => {
    (async () => {
      const [cats, cli] = await Promise.all([
        supabase().from('categorias').select('id').eq('modalidade', 'presencial'),
        supabase().from('clientes').select('*').order('nome'),
      ]);
      setClientes((cli.data as Cliente[]) ?? []);
      const ids = (cats.data ?? []).map((c: any) => c.id);
      if (!ids.length) return;
      const s = await supabase().from('servicos').select('nome').in('categoria_id', ids).order('ordem');
      const nomes = (s.data ?? []).map((x: any) => x.nome).filter((n: string) => !/relat/i.test(n));
      setTipos(nomes);
      setR((v) => (v.tipo ? v : { ...v, tipo: nomes[0] ?? '' }));
    })();
  }, []);

  // Preenche cliente e advogado ao escolher o cliente
  useEffect(() => {
    const c = clientes.find((x) => x.id === clienteId);
    if (c && !relatorioId) setR((v) => ({ ...v, cliente: c.nome, advogado: v.advogado || c.responsavel }));
  }, [clienteId, clientes, relatorioId]);

  // Abre relatório salvo
  useEffect(() => {
    if (!relatorioId) return;
    (async () => {
      const { data, error } = await supabase().from('relatorios').select('*').eq('id', relatorioId).single();
      if (error || !data) return avisar('Não foi possível abrir o relatório.', true);
      setR({ ...VAZIO(), ...(data.dados as object) });
      setClienteId(data.cliente_id);
      setSalvoEm(data.criado_em);
      const lista: Foto[] = [];
      for (const f of (data.fotos as { caminho: string; legenda: string }[]) ?? []) {
        try { lista.push({ url: await linkPrivado(f.caminho, 3600), legenda: f.legenda, caminho: f.caminho }); } catch {}
      }
      setFotos(lista);
    })();
  }, [relatorioId]); // eslint-disable-line react-hooks/exhaustive-deps

  function mudar(campo: string, v: string) { setR((x) => ({ ...x, [campo]: v })); }

  function addFotos(lista: FileList | null) {
    if (!lista) return;
    const novas = Array.from(lista).slice(0, 8).map((f) => ({ url: URL.createObjectURL(f), legenda: '', arquivo: f }));
    setFotos((x) => [...x, ...novas].slice(0, 8));
  }

  function novo() {
    setR(VAZIO()); setFotos([]); setSalvoEm(null); setConcluindo(false); setValor(''); setPago(false);
    aoConcluir?.(null);
  }

  async function concluir() {
    setSalvando(true);
    try {
      // 1) fotos para a pasta privada
      const fotosSalvas: { caminho: string; legenda: string }[] = [];
      for (const f of fotos) {
        if (f.caminho) { fotosSalvas.push({ caminho: f.caminho, legenda: f.legenda }); continue; }
        if (f.arquivo) fotosSalvas.push({ caminho: await enviarPrivado(f.arquivo), legenda: f.legenda });
      }
      // 2) serviço no financeiro
      let atendimentoId: number | null = null;
      if (lancar) {
        const v = Number(valor.replace(/\./g, '').replace(',', '.')) || 0;
        const { data, error } = await supabase().from('atendimentos').insert({
          cliente_id: clienteId, servico: r.tipo || 'Diligência', processo: r.processo, data: r.data, valor: v,
          descricao: [r.local, r.descricao].filter(Boolean).join(' · '), status: 'concluido',
          pago, data_pagamento: pago ? iso(new Date()) : null, forma_pagamento: pago ? 'Pix' : '',
        }).select('id').single();
        if (error) throw error;
        atendimentoId = (data as { id: number }).id;
      }
      // 3) relatório
      const { error } = await supabase().from('relatorios').insert({ cliente_id: clienteId, atendimento_id: atendimentoId, dados: r, fotos: fotosSalvas });
      if (error) throw error;
      setFotos((x) => x.map((f, i) => ({ ...f, caminho: fotosSalvas[i]?.caminho, arquivo: undefined })));
      setSalvoEm(new Date().toISOString());
      setConcluindo(false);
      avisar(lancar ? 'Diligência concluída: relatório salvo e serviço lançado no Financeiro' : 'Relatório salvo na ficha do cliente');
    } catch (e: any) {
      avisar(`Erro: ${e.message}. Rodou o atualizacao-08.sql?`, true);
    } finally {
      setSalvando(false);
    }
  }

  const dataBR = r.data ? formatarData(r.data) : '';
  const campo = (rotulo: string, nome: keyof ReturnType<typeof VAZIO>, props: Record<string, any> = {}) => (
    <label>{rotulo}<input value={r[nome]} onChange={(e) => mudar(nome, e.target.value)} {...props} /></label>
  );
  const clienteAtual = clientes.find((c) => c.id === clienteId);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="nao-imprimir">
        <h2>Relatório de diligência</h2>
        <p className="adm-sub">
          Preencha, adicione as fotos e gere o PDF. Em “Concluir diligência”, o relatório fica salvo na ficha do cliente e o serviço já vai para o Financeiro.
        </p>
      </div>

      {salvoEm && (
        <div className="adm-item mudou nao-imprimir">
          <strong>Relatório salvo em {new Date(salvoEm).toLocaleString('pt-BR')}{clienteAtual ? ` · ${clienteAtual.nome}` : ''}</strong>
          <div className="adm-linha">
            <button className="adm-btn pri" onClick={() => window.print()}>Gerar PDF de novo</button>
            {clienteAtual?.telefone && (
              <a className="adm-btn" target="_blank" rel="noopener noreferrer"
                href={whatsDoTelefone(clienteAtual.telefone, `Olá${clienteAtual.responsavel ? `, ${clienteAtual.responsavel.split(' ')[0]}` : ''}! Segue o relatório da diligência (${r.tipo}${r.processo ? `, proc. ${r.processo}` : ''}), realizada em ${dataBR}. Resultado: ${r.resultado}.`)}>
                Avisar cliente no WhatsApp
              </a>
            )}
            <button className="adm-btn" onClick={novo}>Novo relatório</button>
          </div>
          <p className="adm-dica" style={{ margin: 0 }}>Dica: gere o PDF, salve no celular e anexe na conversa do WhatsApp que abrir.</p>
        </div>
      )}

      {!salvoEm && (
        <div className="adm-item nao-imprimir">
          <div className="adm-grade">
            <label>
              Cliente cadastrado
              <select value={clienteId ?? ''} onChange={(e) => setClienteId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Nenhum (digitar abaixo)</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            {campo('Escritório / cliente (no PDF)', 'cliente', { placeholder: 'Ex.: Silva & Souza Advogados' })}
            {campo('Advogado(a) responsável', 'advogado')}
            {campo('Nº do processo', 'processo', { placeholder: '0000000-00.0000.8.19.0000' })}
            {campo('Comarca', 'comarca')}
            {campo('Local', 'local', { placeholder: 'Ex.: Fórum de Três Rios, 2ª Vara Cível' })}
            <label>
              Tipo de diligência
              <select value={r.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
                {tipos.map((t) => <option key={t}>{t}</option>)}
                <option>Outro</option>
              </select>
            </label>
            {campo('Data', 'data', { type: 'date' })}
            {campo('Hora', 'hora', { type: 'time' })}
            <label>
              Resultado
              <select value={r.resultado} onChange={(e) => mudar('resultado', e.target.value)}>
                <option>Cumprida</option>
                <option>Cumprida parcialmente</option>
                <option>Não cumprida</option>
              </select>
            </label>
            {campo('Custas / despesas (opcional)', 'custas', { placeholder: 'Ex.: R$ 12,40 de cópias' })}
            <label style={{ gridColumn: '1 / -1' }}>O que foi feito<textarea value={r.descricao} onChange={(e) => mudar('descricao', e.target.value)} placeholder="Descreva a diligência: com quem falou, o que foi protocolado, retirado ou consultado." /></label>
            <label style={{ gridColumn: '1 / -1' }}>Observações<textarea value={r.observacoes} onChange={(e) => mudar('observacoes', e.target.value)} /></label>
          </div>
          <label>Fotos (até 8)<input type="file" accept="image/*" multiple onChange={(e) => addFotos(e.target.files)} /></label>
          {fotos.length > 0 && (
            <div className="adm-grade">
              {fotos.map((f, i) => (
                <div key={f.url} style={{ display: 'grid', gap: 6 }}>
                  <img src={f.url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8 }} />
                  <input value={f.legenda} placeholder="Legenda" onChange={(e) => setFotos((x) => x.map((y, j) => (j === i ? { ...y, legenda: e.target.value } : y)))} />
                  <button className="adm-btn peq perigo" onClick={() => setFotos((x) => x.filter((_, j) => j !== i))}>Remover</button>
                </div>
              ))}
            </div>
          )}
          <div className="adm-linha">
            <button className="adm-btn" onClick={() => window.print()}>Gerar PDF</button>
            <button className="adm-btn pri" onClick={() => setConcluindo(!concluindo)}>Concluir diligência</button>
          </div>

          {concluindo && (
            <div className="adm-item mudou">
              <h3>Concluir diligência</h3>
              <div className="adm-grade">
                <label className="adm-check"><input type="checkbox" checked={lancar} onChange={(e) => setLancar(e.target.checked)} /> Lançar no Financeiro</label>
                {lancar && <label>Valor cobrado (R$)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="Ex.: 90,00" /></label>}
                {lancar && <label className="adm-check"><input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} /> Já foi pago</label>}
              </div>
              {!clienteId && <p className="adm-dica" style={{ margin: 0 }}>Sem cliente cadastrado escolhido: o relatório fica salvo, mas não aparece em nenhuma ficha.</p>}
              <div className="adm-linha">
                <button className="adm-btn pri" onClick={concluir} disabled={salvando}>{salvando ? 'Salvando…' : `Salvar${lancar && valor ? ` e lançar ${brl(Number(valor.replace(/\./g, '').replace(',', '.')) || 0)}` : ''}`}</button>
                <button className="adm-btn" onClick={() => setConcluindo(false)}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Prévia: é exatamente o que sai no PDF */}
      <article className="relatorio" style={{ ['--rel-cor' as string]: config.cor_primaria, ['--rel-ouro' as string]: config.cor_destaque }}>
        <header className="rel-topo">
          <div>
            <div className="rel-marca">{config.marca || config.nome}</div>
            <div>{config.nome} · {config.profissao}</div>
          </div>
          <div className="rel-contato">
            {config.whatsapp_exibicao && <div>WhatsApp {config.whatsapp_exibicao}</div>}
            {config.email && <div>{config.email}</div>}
          </div>
        </header>
        <h1>Relatório de diligência</h1>
        <table className="rel-tabela">
          <tbody>
            {[
              ['Cliente', r.cliente], ['Advogado(a)', r.advogado], ['Processo', r.processo],
              ['Comarca', r.comarca], ['Local', r.local], ['Diligência', r.tipo],
              ['Data e hora', `${dataBR} às ${r.hora}`], ['Resultado', r.resultado], ['Custas', r.custas],
            ].filter(([, v]) => v).map(([k, v]) => (
              <tr key={k}><th>{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
        {r.descricao && (<><h2>Descrição</h2><p className="rel-texto">{r.descricao}</p></>)}
        {r.observacoes && (<><h2>Observações</h2><p className="rel-texto">{r.observacoes}</p></>)}
        {fotos.length > 0 && (
          <>
            <h2>Registro fotográfico</h2>
            <div className="rel-fotos">
              {fotos.map((f, i) => (
                <figure key={f.url}>
                  <img src={f.url} alt={f.legenda || `Foto ${i + 1}`} />
                  <figcaption>Foto {i + 1}{f.legenda ? `: ${f.legenda}` : ''}</figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
        <footer className="rel-assinatura">
          <div className="rel-linha" />
          <div>{config.nome}</div>
          <small>{config.aviso_legal}</small>
        </footer>
      </article>
    </div>
  );
}
