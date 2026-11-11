'use client';
// Barra do topo: logo, menu, modo claro/escuro e WhatsApp.
import { useState } from 'react';
import type { Config } from '@/lib/tipos';
import { NOMES_SECOES } from '@/lib/tipos';
import { iniciais, linkWhats } from '@/lib/util';
import { IconeFechar, IconeMenu, IconeTema, IconeWhats } from './Icones';
import { registrar } from '@/lib/estatisticas';

// Seções que aparecem no menu (as outras ficam só na rolagem).
const NO_MENU = ['servicos', 'correspondente', 'pacotes', 'sobre', 'documentos', 'contato'];

export function alternarTema() {
  const html = document.documentElement;
  const escuroAgora = html.dataset.tema
    ? html.dataset.tema === 'escuro'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  const novo = escuroAgora ? 'claro' : 'escuro';
  html.dataset.tema = novo;
  try { localStorage.setItem('tema', novo); } catch {}
}

export default function Cabecalho({ config: c, secoes }: { config: Config; secoes: string[] }) {
  const [aberto, setAberto] = useState(false);
  const itens = secoes.filter((s) => NO_MENU.includes(s));

  return (
    <header className="cabecalho">
      <div className="conteiner cabecalho-inner">
        <a href="#inicio" className="marca" onClick={() => setAberto(false)}>
          {c.logo_url ? (
            <img src={c.logo_url} alt="" className="marca-logo" />
          ) : (
            <span className="marca-mono" aria-hidden="true">{iniciais(c.nome)}</span>
          )}
          <span className="marca-nome">{c.marca || c.nome}</span>
        </a>

        <nav className={`menu${aberto ? ' aberto' : ''}`} aria-label="Menu principal">
          {itens.map((id) => (
            <a key={id} href={`#${id}`} onClick={() => setAberto(false)}>{NOMES_SECOES[id]}</a>
          ))}
        </nav>

        <div className="cabecalho-acoes">
          <button className="icone-btn" onClick={alternarTema} aria-label="Alternar modo claro e escuro" title="Modo claro / escuro">
            <IconeTema />
          </button>
          <a className="icone-btn some-celular" href={linkWhats(c.whatsapp, c.mensagem_whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="Conversar no WhatsApp" onClick={() => registrar('whatsapp')}>
            <IconeWhats tamanho={20} />
          </a>
          <button className="icone-btn so-celular" onClick={() => setAberto(!aberto)} aria-label={aberto ? 'Fechar menu' : 'Abrir menu'} aria-expanded={aberto}>
            {aberto ? <IconeFechar /> : <IconeMenu />}
          </button>
        </div>
      </div>
    </header>
  );
}
