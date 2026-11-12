'use client';
// Rodapé com contatos, aviso legal e crédito.
import type { Config } from '@/lib/tipos';
import { linkWhats } from '@/lib/util';
import { registrar } from '@/lib/estatisticas';
import { IconeEmail, IconeInsta, IconeWhats } from './Icones';

export default function Rodape({ config: c }: { config: Config }) {
  const ano = new Date().getFullYear();
  return (
    <footer className="rodape">
      <div className="conteiner">
        <div className="rodape-inner">
          <div>
            <div className="marca-nome">{c.marca || c.nome}</div>
            <div>{c.nome} · {c.profissao}</div>
          </div>
          <div className="rodape-links">
            <a className="icone-btn" href={linkWhats(c.whatsapp, c.mensagem_whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" onClick={() => registrar('whatsapp')}><IconeWhats tamanho={20} /></a>
            {c.instagram && (
              <a className="icone-btn" href={`https://instagram.com/${c.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconeInsta tamanho={20} /></a>
            )}
            {c.email && <a className="icone-btn" href={`mailto:${c.email}`} aria-label="E-mail"><IconeEmail tamanho={20} /></a>}
          </div>
        </div>
        <div className="rodape-base">
          <span>© {ano} {c.nome}. {c.aviso_legal}</span>
          <span><a href="/privacidade">Privacidade</a>{c.rodape_credito ? ` · ${c.rodape_credito}` : ''}</span>
        </div>
      </div>
    </footer>
  );
}
