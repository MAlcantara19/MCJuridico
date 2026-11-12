'use client';
// Rodapé: contatos, selos de segurança reais e crédito de quem desenvolveu o site.
import { useEffect, useState } from 'react';
import type { Config } from '@/lib/tipos';
import { linkWhats } from '@/lib/util';
import { registrar } from '@/lib/estatisticas';
import { IconeCadeado, IconeEmail, IconeEscudo, IconeInsta, IconeWhats } from './Icones';

export default function Rodape({ config: c }: { config: Config }) {
  const ano = new Date().getFullYear();
  const [dominio, setDominio] = useState('');
  useEffect(() => { setDominio(window.location.hostname); }, []);
  const insta = (c.instagram || '').replace('@', '');
  const credInsta = (c.credito_instagram || '').replace('@', '');

  return (
    <footer className="rodape">
      <div className="conteiner">
        <div className="rodape-inner">
          <div>
            <div className="marca-nome">{c.marca || c.nome}</div>
            <div>{c.nome} · {c.profissao}</div>
          </div>
          <div className="rodape-links">
            <a className="icone-btn" href={linkWhats(c.whatsapp, c.mensagem_whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" onClick={() => registrar('whatsapp', false, 'Rodapé')}><IconeWhats tamanho={20} /></a>
            {insta && (
              <a className="icone-btn" href={`https://instagram.com/${insta}`} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconeInsta tamanho={20} /></a>
            )}
            {c.email && <a className="icone-btn" href={`mailto:${c.email}`} aria-label="E-mail"><IconeEmail tamanho={20} /></a>}
          </div>
        </div>

        {/* Selos verdadeiros: conexão HTTPS (certificado SSL da Vercel), política LGPD e verificação pública do Google */}
        <div className="selos">
          <span className="selo-seg"><IconeCadeado /> Conexão segura (HTTPS)</span>
          <a className="selo-seg" href="/privacidade"><IconeEscudo /> Privacidade · LGPD</a>
          {dominio && !dominio.includes('localhost') && (
            <a
              className="selo-seg"
              href={`https://transparencyreport.google.com/safe-browsing/search?url=${encodeURIComponent(dominio)}&hl=pt_BR`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconeEscudo /> Verificar no Google Navegação Segura
            </a>
          )}
        </div>

        <div className="rodape-base">
          <span>© {ano} {c.nome}. {c.aviso_legal}</span>
          <span><a href="/privacidade">Política de privacidade</a></span>
        </div>

        {c.credito_nome && (
          <div className="credito">
            <span>Desenvolvido por <strong>{c.credito_nome}</strong></span>
            <span className="credito-links">
              {c.credito_whatsapp && (
                <a
                  href={linkWhats(c.credito_whatsapp, c.credito_mensagem || `Olá! Vi o site ${c.marca || c.nome} e tenho interesse em criar um site assim também.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => registrar('credito')}
                >
                  <IconeWhats tamanho={14} /> Quero um site assim
                </a>
              )}
              {credInsta && (
                <a href={`https://instagram.com/${credInsta}`} target="_blank" rel="noopener noreferrer">
                  <IconeInsta tamanho={14} /> @{credInsta}
                </a>
              )}
            </span>
          </div>
        )}
      </div>
    </footer>
  );
}
