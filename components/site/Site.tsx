'use client';
// Junta todas as partes da página pública, na ordem escolhida no painel.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import type { Dados } from '@/lib/tipos';
import { juntarSecoes } from '@/lib/tipos';
import Cabecalho from './Cabecalho';
import Topo from './Topo';
import Servicos from './Servicos';
import Correspondente from './Correspondente';
import Pacotes from './Pacotes';
import ComoFunciona from './ComoFunciona';
import Sobre from './Sobre';
import Documentos from './Documentos';
import Perguntas from './Perguntas';
import Contato from './Contato';
import Rodape from './Rodape';
import Assistente from './Assistente';
import Depoimentos from './Depoimentos';

export default function Site({ dados }: { dados: Dados }) {
  const c = dados.config;

  // Tema padrão escolhido no painel (se a pessoa ainda não escolheu o dela).
  useEffect(() => {
    let salvo: string | null = null;
    try { salvo = localStorage.getItem('tema'); } catch {}
    if (!salvo && c.tema_padrao !== 'auto') {
      document.documentElement.dataset.tema = c.tema_padrao === 'escuro' ? 'escuro' : 'claro';
    }
  }, [c.tema_padrao]);

  // Seções aparecem suavemente ao rolar (pode desligar no painel: Visual e layout)
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (c.animacoes === false || !raiz.current || !('IntersectionObserver' in window)) return;
    const el = raiz.current;
    el.classList.add('js-anim');
    const obs = new IntersectionObserver((itens) => {
      for (const i of itens) if (i.isIntersecting) { i.target.classList.add('visivel'); obs.unobserve(i.target); }
    }, { rootMargin: '0px 0px -10% 0px' });
    el.querySelectorAll('.revelar').forEach((x) => obs.observe(x));
    return () => obs.disconnect();
  }, [c.animacoes]);

  const estilo = {
    '--navy': c.cor_primaria || '#0E1B33',
    '--ouro': c.cor_destaque || '#A8894E',
    '--fonte-titulo': `'${c.fonte_titulo || 'Cormorant Garamond'}', Georgia, serif`,
  } as CSSProperties;

  // Seções visíveis, na ordem do painel. "Documentos" só aparece se houver arquivos.
  const ordem = juntarSecoes(c.secoes)
    .filter((s) => s.visivel)
    .map((s) => s.id)
    .filter((id) => id !== 'documentos' || dados.documentos.length > 0)
    .filter((id) => id !== 'perguntas' || dados.perguntas.length > 0)
    .filter((id) => id !== 'depoimentos' || dados.depoimentos.length > 0);

  const blocos: Record<string, ReactNode> = {
    servicos: <Servicos dados={dados} />,
    correspondente: <Correspondente dados={dados} />,
    pacotes: <Pacotes dados={dados} />,
    como_funciona: <ComoFunciona config={c} />,
    depoimentos: <Depoimentos depoimentos={dados.depoimentos} />,
    sobre: <Sobre dados={dados} />,
    documentos: <Documentos documentos={dados.documentos} />,
    perguntas: <Perguntas perguntas={dados.perguntas} />,
    contato: <Contato dados={dados} />,
  };

  // Alterna o fundo cinza claro entre as seções, para separar visualmente.
  return (
    <div className="site" style={estilo} ref={raiz}>
      <Cabecalho config={c} secoes={ordem} />
      <main>
        <Topo config={c} />
        {ordem.map((id, i) => (
          <div key={id} className={`revelar${i % 2 === 1 ? ' secao-sup' : ''}`}>
            {blocos[id]}
          </div>
        ))}
      </main>
      <Rodape config={c} />
      <Assistente config={c} perguntas={dados.perguntas} />
    </div>
  );
}
