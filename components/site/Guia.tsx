'use client';
// "Qual serviço eu preciso?": 4 perguntas simples que indicam o serviço e, se for todo mês, o pacote.
// Não usa IA: as respostas apontam para palavras-chave dos serviços cadastrados no painel.
import { useState } from 'react';
import type { Dados, Servico } from '@/lib/tipos';
import { linkWhats, normalizar } from '@/lib/util';
import { emojiArea, emojiPacote, msgGuia } from '@/lib/mensagens';
import { registrar } from '@/lib/estatisticas';
import { IconeWhats } from './Icones';

type Opcao = { rotulo: string; emoji: string; valor: string; chaves?: string[] };

const PERFIS: Opcao[] = [
  { rotulo: 'Escritório ou advogado(a)', emoji: '⚖️', valor: 'escritorio' },
  { rotulo: 'Empresa ou negócio', emoji: '🏪', valor: 'empresa' },
  { rotulo: 'Para mim (pessoa física)', emoji: '🙋', valor: 'pessoa' },
];

const LOCAIS: Opcao[] = [
  { rotulo: 'Sim, alguém precisa ir ao fórum, cartório ou audiência', emoji: '💼', valor: 'presencial' },
  { rotulo: 'Não, pode ser tudo pela internet', emoji: '💻', valor: 'remoto' },
];

// Palavras que aparecem no nome dos serviços (sem acento)
const TAREFAS: Record<string, Opcao[]> = {
  presencial: [
    { rotulo: 'Protocolar uma petição', emoji: '📨', valor: 'Protocolo', chaves: ['protocolo fisico'] },
    { rotulo: 'Tirar cópias ou consultar um processo', emoji: '📑', valor: 'Cópias e consulta', chaves: ['copias', 'consulta presencial'] },
    { rotulo: 'Pedir certidão em cartório', emoji: '🏛️', valor: 'Certidão', chaves: ['certidoes presenciais', 'cartorio de imoveis'] },
    { rotulo: 'Representar em audiência (preposto)', emoji: '🎙️', valor: 'Preposto', chaves: ['preposto'] },
    { rotulo: 'Levar ou buscar documentos / outra diligência', emoji: '🚗', valor: 'Diligência', chaves: ['diligencias', 'retirada'] },
  ],
  remoto: [
    { rotulo: 'Controlar prazos e acompanhar processos', emoji: '⏰', valor: 'Prazos e processos', chaves: ['prazos', 'acompanhamento processual', 'protocolo eletronico'] },
    { rotulo: 'Digitar, organizar documentos e certidões', emoji: '📄', valor: 'Documentos', chaves: ['digitacao', 'organizacao de documentos', 'pastas', 'emissao de certidoes'] },
    { rotulo: 'PDF, formulários, planilhas ou assinatura digital', emoji: '💻', valor: 'Digital', chaves: ['pdf', 'formulario', 'planilha', 'assinatura', 'drive'] },
    { rotulo: 'Financeiro: contas, notas, cobranças', emoji: '💰', valor: 'Financeiro', chaves: ['contas', 'fluxo', 'orcamento', 'notas fiscais', 'cobranca', 'relatorio mensal', 'honorarios'] },
    { rotulo: 'Atender clientes e organizar a agenda', emoji: '📅', valor: 'Atendimento', chaves: ['atendimento', 'agendamento', 'agenda', 'triagem', 'follow'] },
    { rotulo: 'Pedidos, clientes, estoque e rotinas', emoji: '🏪', valor: 'Negócio', chaves: ['pedido', 'cadastro e controle de clientes', 'estoque', 'fornecedores', 'rotinas', 'marketplace', 'cadastros em sistemas'] },
  ],
};

const FREQUENCIAS: Opcao[] = [
  { rotulo: 'Só desta vez', emoji: '1️⃣', valor: 'avulso' },
  { rotulo: 'Toda semana ou todo mês', emoji: '🔁', valor: 'mensal' },
];

export default function Guia({ dados }: { dados: Dados }) {
  const c = dados.config;
  const [passo, setPasso] = useState(0);
  const [perfil, setPerfil] = useState<Opcao | null>(null);
  const [local, setLocal] = useState<Opcao | null>(null);
  const [tarefas, setTarefas] = useState<Opcao[]>([]);
  const [freq, setFreq] = useState<Opcao | null>(null);

  const cat = (s: Servico) => dados.categorias.find((k) => k.id === s.categoria_id);
  const resultado = (() => {
    if (!local || !freq) return [];
    const chaves = tarefas.flatMap((t) => t.chaves ?? []);
    return dados.servicos
      .filter((s) => !/inclus/i.test(s.preco))
      .filter((s) => (cat(s)?.modalidade === 'presencial') === (local.valor === 'presencial'))
      .filter((s) => chaves.some((k) => normalizar(s.nome).includes(k)))
      .slice(0, 6);
  })();

  // Pacote sugerido para quem precisa todo mês
  const pacote = (() => {
    if (freq?.valor !== 'mensal') return null;
    if (local?.valor === 'presencial') return dados.pacotes.find((p) => p.grupo === 'correspondente') ?? null;
    const mensais = dados.pacotes.filter((p) => p.grupo === 'mensal');
    const nome = perfil?.valor === 'escritorio' ? 'juridico' : perfil?.valor === 'empresa' ? 'essencial' : 'start';
    return mensais.find((p) => normalizar(p.nome).includes(nome)) ?? mensais.find((p) => p.destaque) ?? mensais[0] ?? null;
  })();

  function reiniciar() { setPasso(0); setPerfil(null); setLocal(null); setTarefas([]); setFreq(null); }

  const texto = msgGuia({
    perfil: perfil?.rotulo ?? '',
    local: local?.valor === 'presencial' ? 'Presencial' : 'Online',
    frequencia: freq?.rotulo ?? '',
    pacote: pacote ? `${emojiPacote(pacote)} ${pacote.nome} (${pacote.preco})` : undefined,
    servicos: resultado.length
      ? resultado.map((s) => ({ nome: s.nome, preco: s.preco, emoji: emojiArea(cat(s)) }))
      : tarefas.map((t) => ({ nome: t.rotulo, preco: 'a combinar', emoji: t.emoji })),
  });

  const Botoes = ({ opcoes, aoEscolher, marcados }: { opcoes: Opcao[]; aoEscolher: (o: Opcao) => void; marcados?: Opcao[] }) => (
    <div className="guia-opcoes">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          className={`guia-opcao${marcados?.some((m) => m.valor === o.valor) ? ' marcada' : ''}`}
          onClick={() => aoEscolher(o)}
          aria-pressed={marcados ? marcados.some((m) => m.valor === o.valor) : undefined}
        >
          <span className="guia-emoji" aria-hidden="true">{o.emoji}</span>{o.rotulo}
        </button>
      ))}
    </div>
  );

  const PERGUNTAS = ['Para quem é o serviço?', 'Precisa de alguém indo presencialmente?', 'O que você precisa? (pode marcar mais de um)', 'Com que frequência?'];

  return (
    <section id="guia" className="secao">
      <div className="conteiner">
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Qual serviço eu preciso?</h2>
          <p>Responda 4 perguntas rápidas e veja o serviço indicado para o seu caso.</p>
        </div>

        <div className="guia">
          {passo < 4 && (
            <>
              <div className="guia-progresso" aria-hidden="true">{[0, 1, 2, 3].map((i) => <span key={i} className={i <= passo ? 'cheio' : ''} />)}</div>
              <p className="guia-passo">Pergunta {passo + 1} de 4</p>
              <h3>{PERGUNTAS[passo]}</h3>
              {passo === 0 && <Botoes opcoes={PERFIS} aoEscolher={(o) => { setPerfil(o); setPasso(1); }} />}
              {passo === 1 && <Botoes opcoes={LOCAIS} aoEscolher={(o) => { setLocal(o); setTarefas([]); setPasso(2); }} />}
              {passo === 2 && local && (
                <>
                  <Botoes
                    opcoes={TAREFAS[local.valor]}
                    marcados={tarefas}
                    aoEscolher={(o) => setTarefas((t) => (t.some((x) => x.valor === o.valor) ? t.filter((x) => x.valor !== o.valor) : [...t, o]))}
                  />
                  <button className="btn btn-navy" style={{ marginTop: 18 }} disabled={!tarefas.length} onClick={() => setPasso(3)}>Continuar</button>
                </>
              )}
              {passo === 3 && <Botoes opcoes={FREQUENCIAS} aoEscolher={(o) => { setFreq(o); setPasso(4); }} />}
              {passo > 0 && <button className="guia-voltar" onClick={() => setPasso(passo - 1)}>← Voltar</button>}
            </>
          )}

          {passo === 4 && (
            <div className="guia-resultado">
              <p className="guia-passo">Resultado</p>
              <h3>{resultado.length ? 'Estes serviços combinam com você:' : 'Seu caso é sob medida:'}</h3>
              {resultado.length > 0 ? (
                <ul className="lista-precos">
                  {resultado.map((s) => (
                    <li key={s.id}><span className="linha-servico"><span className="nome">{emojiArea(cat(s))} {s.nome}</span><span className="pontilhado" aria-hidden="true" /><span className="preco">{s.preco}</span></span></li>
                  ))}
                </ul>
              ) : (
                <p className="nota">Não achei um serviço exato na tabela, mas dá para montar um atendimento para você. Mande os detalhes pelo WhatsApp.</p>
              )}
              {pacote && (
                <div className="guia-pacote">
                  <span>{emojiPacote(pacote)} Como é todo mês, vale a pena o <strong>{pacote.nome}</strong> ({pacote.horas})</span>
                  <strong>{pacote.preco}</strong>
                </div>
              )}
              <div className="topo-acoes" style={{ marginTop: 22, marginBottom: 0 }}>
                <a className="btn btn-ouro" href={linkWhats(c.whatsapp, texto)} target="_blank" rel="noopener noreferrer" onClick={() => registrar('whatsapp', false, 'Qual serviço eu preciso')}>
                  <IconeWhats tamanho={18} /> Enviar resultado no WhatsApp
                </a>
                <button className="btn btn-linha-escura" onClick={reiniciar}>Refazer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
