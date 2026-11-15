'use client';
// Simulador: a pessoa diz quantas horas precisa por mês e o site mostra o pacote ideal e a economia.
// Hora avulsa e hora extra vêm do painel (Pacotes).
import { useState } from 'react';
import type { Dados, Pacote } from '@/lib/tipos';
import { linkWhats } from '@/lib/util';
import { emojiPacote, msgSimulador } from '@/lib/mensagens';
import { registrar } from '@/lib/estatisticas';
import { IconeWhats } from './Icones';

const numero = (t: string) => Number((t || '').replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/)?.[0] ?? 0);
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const ATALHOS = [
  { rotulo: 'Algumas tarefas por semana', horas: 10 },
  { rotulo: 'Um pouco todo dia', horas: 20 },
  { rotulo: 'Meio período', horas: 40 },
  { rotulo: 'Quase um assistente fixo', horas: 80 },
];

export default function Simulador({ dados }: { dados: Dados }) {
  const c = dados.config;
  const mensais = dados.pacotes
    .filter((p) => p.grupo === 'mensal' && numero(p.horas) > 0)
    .sort((a, b) => numero(a.horas) - numero(b.horas));
  const [horas, setHoras] = useState(20);
  if (!mensais.length) return null;

  const avulsa = Number(c.hora_avulsa) || 50;
  const extra = Number(c.hora_extra) || 40;
  const custoAvulso = horas * avulsa;

  // Pacote com horas suficientes; se passar do maior, usa o maior + horas extras
  const opcoes = mensais.map((p) => {
    const h = numero(p.horas);
    const faltam = Math.max(0, horas - h);
    return { p, total: numero(p.preco) + faltam * extra, faltam };
  });
  const melhor = opcoes.reduce((a, b) => (b.total < a.total || (b.total === a.total && b.faltam < a.faltam) ? b : a));
  const economia = custoAvulso - melhor.total;
  const max = Math.max(100, numero(mensais[mensais.length - 1].horas) + 20);

  const nomePacote = (p: Pacote) => (p.nome.toLowerCase().startsWith('pacote') ? p.nome : `Pacote ${p.nome}`);
  const texto = msgSimulador({
    horas,
    pacote: `${nomePacote(melhor.p)}${melhor.faltam ? ` + ${melhor.faltam}h extras` : ''}`,
    valor: `${brl(melhor.total)} por mês`,
    economia: economia > 0 ? `${brl(economia)} por mês` : undefined,
  });

  return (
    <section id="simulador" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Simule seu pacote</h2>
          <p>Quantas horas de apoio você precisa por mês? Veja o pacote ideal e quanto economiza.</p>
        </div>

        <div className="simulador">
          <div>
            <div className="sim-atalhos">
              {ATALHOS.map((a) => (
                <button key={a.horas} className={`aba${horas === a.horas ? ' ativa-sim' : ''}`} aria-pressed={horas === a.horas} onClick={() => setHoras(a.horas)}>
                  {a.rotulo} <small>~{a.horas}h</small>
                </button>
              ))}
            </div>
            <label className="sim-faixa">
              <span><strong className="sim-horas">{horas}h</strong> por mês</span>
              <input type="range" min={2} max={max} step={1} value={horas} onChange={(e) => setHoras(Number(e.target.value))} aria-label="Horas por mês" />
            </label>
            <p className="nota">Hora avulsa: {brl(avulsa)} · Hora extra nos pacotes: {brl(extra)}</p>
          </div>

          <div className="sim-resultado">
            <span className="sim-rotulo">Pacote ideal</span>
            <h3>{emojiPacote(melhor.p)} {melhor.p.nome}</h3>
            <p className="sim-detalhe">{melhor.p.horas}{melhor.faltam ? ` + ${melhor.faltam}h extras` : ''}</p>
            <div className="sim-valor">{brl(melhor.total)}<small>/mês</small></div>
            {economia > 0 ? (
              <p className="sim-economia">Economia de <strong>{brl(economia)}</strong> por mês em relação à hora avulsa ({brl(custoAvulso)})</p>
            ) : (
              <p className="sim-economia">Para poucas horas, a hora avulsa ou o pacote teste podem sair mais em conta.</p>
            )}
            <a className="btn btn-ouro" href={linkWhats(c.whatsapp, texto)} target="_blank" rel="noopener noreferrer" onClick={() => registrar('whatsapp', false, 'Simulador de pacote')}>
              <IconeWhats tamanho={18} /> Quero este pacote
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
