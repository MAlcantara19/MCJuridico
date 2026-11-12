'use client';
// Orçamento: marca os serviços da tabela, ajusta quantidade e valor, e gera o PDF com a marca dela.
import { useEffect, useMemo, useState } from 'react';
import type { Config } from '@/lib/tipos';
import { supabase } from '@/lib/supabase';
import { brl, dataBR, hojeISO, somarDias, whatsDoTelefone, type Cliente } from '@/lib/gestao';

type Item = { nome: string; qtd: number; valor: number; referencia?: string };
type Aviso = (m: string, e?: boolean) => void;

// Pega o primeiro número do preço de referência ("R$ 60 a 120" -> 60)
function valorSugerido(preco: string) {
  const m = (preco || '').replace(/\./g, '').match(/(\d+(?:,\d+)?)/);
  return m ? Number(m[1].replace(',', '.')) : 0;
}

export default function Orcamento({ cliente, config, avisar, fechar }: { cliente: Cliente; config: Config; avisar: Aviso; fechar: () => void }) {
  const [tabela, setTabela] = useState<{ area: string; nome: string; preco: string }[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [desconto, setDesconto] = useState('0');
  const [validade, setValidade] = useState('7');
  const [obs, setObs] = useState('');
  const [busca, setBusca] = useState('');
  const numero = useMemo(() => `${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`, []);

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([
        supabase().from('categorias').select('id, nome').order('ordem'),
        supabase().from('servicos').select('nome, preco, categoria_id').eq('ativo', true).order('ordem'),
      ]);
      const cats = (c.data ?? []) as { id: number; nome: string }[];
      setTabela(((s.data ?? []) as { nome: string; preco: string; categoria_id: number }[])
        .filter((x) => !/inclus/i.test(x.preco))
        .map((x) => ({ area: cats.find((k) => k.id === x.categoria_id)?.nome ?? 'Outros', nome: x.nome, preco: x.preco })));
    })();
  }, []);

  const marcado = (nome: string) => itens.some((i) => i.nome === nome);
  function alternar(s: { nome: string; preco: string }) {
    setItens((l) => (marcado(s.nome) ? l.filter((i) => i.nome !== s.nome) : [...l, { nome: s.nome, qtd: 1, valor: valorSugerido(s.preco), referencia: s.preco }]));
  }
  const mudarItem = (i: number, campo: keyof Item, v: string) =>
    setItens((l) => l.map((x, j) => (j === i ? { ...x, [campo]: campo === 'nome' ? v : Number(v.replace(',', '.')) || 0 } : x)));

  const subtotal = itens.reduce((s, i) => s + i.qtd * i.valor, 0);
  const desc = Math.min(subtotal, Number(desconto.replace(',', '.')) || 0);
  const total = subtotal - desc;
  const validoAte = somarDias(hojeISO(), Number(validade) || 7);
  const areas = Array.from(new Set(tabela.map((t) => t.area)));
  const filtrada = tabela.filter((t) => !busca.trim() || t.nome.toLowerCase().includes(busca.toLowerCase()));

  async function salvar(irWhats: boolean) {
    if (!itens.length) return avisar('Marque pelo menos um serviço.', true);
    const { error } = await supabase().from('orcamentos').insert({
      numero, cliente_id: cliente.id, itens, desconto: desc, total, validade_dias: Number(validade) || 7, observacoes: obs,
    });
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-08.sql?`, true);
    // Também aparece no Financeiro como "Orçamento"
    await supabase().from('atendimentos').insert({
      cliente_id: cliente.id, status: 'orcamento', valor: total, data: hojeISO(),
      servico: itens.length === 1 ? itens[0].nome : `Orçamento nº ${numero} (${itens.length} serviços)`,
      descricao: itens.map((i) => `${i.qtd}x ${i.nome}`).join('; '),
    });
    avisar('Orçamento salvo na ficha e no Financeiro');
    if (irWhats && cliente.telefone) {
      const texto = [
        `Olá${cliente.responsavel ? `, ${cliente.responsavel.split(' ')[0]}` : ''}! Segue o orçamento nº ${numero}:`,
        '',
        ...itens.map((i) => `• ${i.qtd > 1 ? `${i.qtd}x ` : ''}${i.nome}: ${brl(i.qtd * i.valor)}`),
        desc ? `Desconto: -${brl(desc)}` : '',
        `*Total: ${brl(total)}*`,
        '',
        `Válido até ${dataBR(validoAte)}. Envio o PDF a seguir.`,
      ].filter((l, k, arr) => l !== '' || arr[k - 1] !== '').join('\n');
      window.open(whatsDoTelefone(cliente.telefone, texto), '_blank', 'noopener');
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="adm-item mudou nao-imprimir">
        <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Novo orçamento para {cliente.nome}</h3>
          <button className="adm-btn peq" onClick={fechar}>Fechar</button>
        </div>

        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar serviço da tabela…" aria-label="Buscar serviço" />
        <div className="orc-tabela">
          {areas.map((a) => {
            const lista = filtrada.filter((t) => t.area === a);
            if (!lista.length) return null;
            return (
              <div key={a}>
                <strong className="adm-dica" style={{ display: 'block', margin: '6px 0' }}>{a}</strong>
                {lista.map((s) => (
                  <label key={s.nome} className="adm-check orc-opcao">
                    <input type="checkbox" checked={marcado(s.nome)} onChange={() => alternar(s)} />
                    <span style={{ flex: 1 }}>{s.nome}</span>
                    <span className="adm-dica" style={{ margin: 0 }}>{s.preco}</span>
                  </label>
                ))}
              </div>
            );
          })}
        </div>
        <button className="adm-btn peq" style={{ justifySelf: 'start' }} onClick={() => setItens((l) => [...l, { nome: 'Outro serviço', qtd: 1, valor: 0 }])}>+ Item avulso</button>

        {itens.length > 0 && (
          <div className="adm-lista">
            {itens.map((i, k) => (
              <div key={k} className="orc-item">
                <input value={i.nome} onChange={(e) => mudarItem(k, 'nome', e.target.value)} aria-label="Serviço" />
                <input value={String(i.qtd)} onChange={(e) => mudarItem(k, 'qtd', e.target.value)} inputMode="numeric" aria-label="Quantidade" />
                <input value={String(i.valor)} onChange={(e) => mudarItem(k, 'valor', e.target.value)} inputMode="decimal" aria-label="Valor unitário" />
                <strong style={{ whiteSpace: 'nowrap' }}>{brl(i.qtd * i.valor)}</strong>
                <button className="adm-btn peq perigo" onClick={() => setItens((l) => l.filter((_, j) => j !== k))} aria-label="Remover">×</button>
              </div>
            ))}
            <p className="adm-dica" style={{ margin: 0 }}>Colunas: serviço · quantidade · valor unitário (sugerido pelo menor valor da tabela).</p>
          </div>
        )}

        <div className="adm-grade">
          <label>Desconto (R$)<input inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} /></label>
          <label>Validade (dias)<input inputMode="numeric" value={validade} onChange={(e) => setValidade(e.target.value)} /></label>
          <label style={{ gridColumn: '1 / -1' }}>Observações / prazo de entrega<textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: entrega em até 2 dias úteis após a confirmação." /></label>
        </div>
        <div className="adm-linha">
          <strong style={{ fontSize: '1.1rem' }}>Total: {brl(total)}</strong>
          <button className="adm-btn" onClick={() => window.print()} disabled={!itens.length}>Gerar PDF</button>
          <button className="adm-btn pri" onClick={() => salvar(true)} disabled={!itens.length}>Salvar e enviar no WhatsApp</button>
          <button className="adm-btn" onClick={() => salvar(false)} disabled={!itens.length}>Só salvar</button>
        </div>
      </div>

      {/* Prévia do PDF */}
      <article className="relatorio" style={{ ['--rel-cor' as string]: config.cor_primaria, ['--rel-ouro' as string]: config.cor_destaque }}>
        <header className="rel-topo">
          <div>
            <div className="rel-marca">{config.marca || config.nome}</div>
            <div>{config.nome} · {config.profissao}</div>
          </div>
          <div className="rel-contato">
            {config.whatsapp_exibicao && <div>WhatsApp {config.whatsapp_exibicao}</div>}
            {config.email && <div>{config.email}</div>}
            {config.instagram && <div>@{config.instagram.replace('@', '')}</div>}
          </div>
        </header>
        <h1>Orçamento nº {numero}</h1>
        <table className="rel-tabela">
          <tbody>
            <tr><th>Cliente</th><td>{cliente.nome}</td></tr>
            {cliente.responsavel && <tr><th>A/C</th><td>{cliente.responsavel}</td></tr>}
            <tr><th>Data</th><td>{dataBR(hojeISO())}</td></tr>
            <tr><th>Válido até</th><td>{dataBR(validoAte)}</td></tr>
          </tbody>
        </table>
        <h2>Serviços</h2>
        <table className="rel-tabela orc-doc">
          <thead><tr><th>Serviço</th><th>Qtd.</th><th>Valor unit.</th><th>Total</th></tr></thead>
          <tbody>
            {itens.map((i, k) => (
              <tr key={k}><td>{i.nome}</td><td>{i.qtd}</td><td>{brl(i.valor)}</td><td>{brl(i.qtd * i.valor)}</td></tr>
            ))}
            {desc > 0 && <tr><td colSpan={3}>Desconto</td><td>-{brl(desc)}</td></tr>}
            <tr className="orc-total"><td colSpan={3}>Total</td><td>{brl(total)}</td></tr>
          </tbody>
        </table>
        <h2>Condições</h2>
        {obs && <p className="rel-texto">{obs}</p>}
        <p className="rel-texto">Pagamento antecipado. Custas, taxas e deslocamentos longos são repassados ao cliente.</p>
        <footer className="rel-assinatura">
          <div className="rel-linha" />
          <div>{config.nome}</div>
          <small>{config.aviso_legal}</small>
        </footer>
      </article>
    </div>
  );
}
