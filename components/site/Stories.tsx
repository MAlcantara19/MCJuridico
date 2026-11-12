'use client';
// Telas no formato story (9:16). Toque à direita avança, à esquerda volta.
// As barrinhas somem sozinhas depois de 2 segundos para o print sair limpo.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Dados } from '@/lib/tipos';
import { iniciais, linhas } from '@/lib/util';
import { estiloMarca } from './PaginaSimples';
import { IconeArea, IconeInsta, IconeWhats } from './Icones';

export default function Stories({ dados }: { dados: Dados }) {
  const c = dados.config;
  const remotas = dados.categorias.filter((k) => k.modalidade !== 'presencial');
  const presenciais = dados.categorias.filter((k) => k.modalidade === 'presencial');
  const servicosDe = (id: number) => dados.servicos.filter((s) => s.categoria_id === id);
  const mensais = dados.pacotes.filter((p) => p.grupo === 'mensal');
  const teste = dados.pacotes.find((p) => p.grupo === 'teste');
  const pacoteCorr = dados.pacotes.find((p) => p.grupo === 'correspondente');
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const [site, setSite] = useState('');
  useEffect(() => { setSite(window.location.host); }, []);

  const Topo = ({ rotulo, titulo }: { rotulo: string; titulo: string }) => (
    <header className="st-topo">
      <span className="st-rotulo">{rotulo}</span>
      <h2>{titulo}</h2>
      <span className="st-filete" />
    </header>
  );
  const Rodape = () => (
    <footer className="st-rodape">
      <span>{c.nome}</span>
      <span>WhatsApp {c.whatsapp_exibicao}</span>
    </footer>
  );
  const Lista = ({ itens }: { itens: { nome: string; preco: string }[] }) => (
    <ul className="st-lista">
      {itens.map((s) => (
        <li key={s.nome}><span>{s.nome}</span><i /><b>{s.preco}</b></li>
      ))}
    </ul>
  );

  const telas: ReactNode[] = [
    // Capa
    <div key="capa" className="st-tela st-capa">
      <div className="st-mono">
        {c.logo_url ? <img src={c.logo_url} alt="" /> : <span>{iniciais(c.nome)}</span>}
      </div>
      <span className="st-rotulo">{c.profissao}</span>
      <h1>{c.nome}</h1>
      <span className="st-filete" />
      <p className="st-chamada">Tabela de serviços</p>
      <p className="st-mes">atualizada em {mes}</p>
      <ul className="st-destaques">{linhas(c.destaques).map((x) => <li key={x}>{x}</li>)}</ul>
      <p className="st-dica">Arraste para ver os serviços →</p>
    </div>,
    // Uma tela por área
    ...remotas.map((k) => (
      <div key={k.id} className="st-tela">
        <Topo rotulo={c.titulo_servicos || 'Tabela de serviços'} titulo={k.nome} />
        <div className="st-icone"><IconeArea nome={k.icone} tamanho={40} /></div>
        <Lista itens={servicosDe(k.id)} />
        <p className="st-nota">Atendimento 100% online para todo o Brasil</p>
        <Rodape />
      </div>
    )),
    // Correspondente
    ...(presenciais.length ? [
      <div key="corr" className="st-tela">
        <Topo rotulo="Presencial" titulo={c.titulo_correspondente || 'Correspondente jurídica'} />
        <Lista itens={presenciais.flatMap((k) => servicosDe(k.id))} />
        {pacoteCorr && (
          <div className="st-caixa">
            <div><strong>{pacoteCorr.nome}</strong><span>{pacoteCorr.publico}</span></div>
            <b>{pacoteCorr.preco}</b>
          </div>
        )}
        <p className="st-nota">{linhas(c.area_atendimento).join(' ')}</p>
        <Rodape />
      </div>,
    ] : []),
    // Pacotes
    ...(mensais.length ? [
      <div key="pac" className="st-tela">
        <Topo rotulo={c.sub_pacotes || 'Horas fixas por mês'} titulo={c.titulo_pacotes || 'Pacotes mensais'} />
        <div className="st-pacotes">
          {mensais.map((p) => (
            <div key={p.id} className={`st-pacote${p.destaque ? ' destaque' : ''}`}>
              {p.destaque && <em>Mais procurado</em>}
              <div><strong>{p.nome}</strong><span>{p.publico}</span></div>
              <div className="st-pac-valor"><b>{p.preco}</b><span>{p.horas}</span></div>
            </div>
          ))}
        </div>
        {teste && <div className="st-teste"><span>{c.rotulo_teste || 'Experimente'}: {teste.nome.toLowerCase()} de {teste.horas}</span><b>{teste.preco}</b></div>}
        <p className="st-nota">{linhas(c.regras_pacotes).join(' · ')}</p>
        <Rodape />
      </div>,
    ] : []),
    // Contato
    <div key="contato" className="st-tela st-capa">
      <span className="st-rotulo">Vamos conversar?</span>
      <h1>Peça seu orçamento</h1>
      <span className="st-filete" />
      <div className="st-contatos">
        <span><IconeWhats tamanho={30} /> {c.whatsapp_exibicao}</span>
        {c.instagram && <span><IconeInsta tamanho={30} /> @{c.instagram.replace('@', '')}</span>}
        {site && <span className="st-site">{site}</span>}
      </div>
      <p className="st-dica">Link na bio</p>
      <small className="st-aviso">{c.aviso_legal}</small>
    </div>,
  ];

  const [i, setI] = useState(0);
  const [barras, setBarras] = useState(true);
  const ir = useCallback((n: number) => {
    setI((x) => Math.max(0, Math.min(telas.length - 1, x + n)));
    setBarras(true);
  }, [telas.length]);

  useEffect(() => {
    const t = setTimeout(() => setBarras(false), 2000);
    return () => clearTimeout(t);
  }, [i, barras]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') ir(1); if (e.key === 'ArrowLeft') ir(-1); };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ir]);

  return (
    <div className="st-fundo" style={estiloMarca(c)}>
      <div className="st-quadro">
        {telas[i]}
        <div className={`st-barras${barras ? '' : ' some'}`} aria-hidden="true">
          {telas.map((_, k) => <span key={k} className={k <= i ? 'cheia' : ''} />)}
        </div>
        <button className="st-toque esq" onClick={() => ir(-1)} aria-label="Tela anterior" />
        <button className="st-toque dir" onClick={() => ir(1)} aria-label="Próxima tela" />
      </div>
    </div>
  );
}
