'use client';
// Mostra como as mensagens chegam no WhatsApp (negrito, quebras de linha e emojis)
// e permite testar mandando para o próprio WhatsApp dela.
import { useState, type ReactNode } from 'react';
import type { Config } from '@/lib/tipos';
import { linkWhats } from '@/lib/util';
import { MSG_COBRANCA_PADRAO, MSG_GERAL_PADRAO, MSG_PACOTE_PADRAO, MSG_SERVICO_PADRAO, preencher } from '@/lib/mensagens';
import { mensagemCobranca } from '@/lib/gestao';

// *negrito* e _itálico_ como no WhatsApp
function formatar(texto: string) {
  return texto.split('\n').map((linha, i) => {
    const partes: ReactNode[] = [];
    linha.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).forEach((p, j) => {
      if (/^\*[^*]+\*$/.test(p)) partes.push(<strong key={j}>{p.slice(1, -1)}</strong>);
      else if (/^_[^_]+_$/.test(p)) partes.push(<em key={j}>{p.slice(1, -1)}</em>);
      else partes.push(p);
    });
    return <div key={i}>{linha.trim() ? partes : '\u00a0'}</div>;
  });
}

export default function PreviaMensagens({ config: c }: { config: Config }) {
  const exemplos: Record<string, string> = {
    'Botões gerais': c.mensagem_whatsapp || MSG_GERAL_PADRAO,
    'Toque em um serviço': preencher(c.mensagem_servico || MSG_SERVICO_PADRAO, { emoji: '⚖️', servico: 'Controle de prazos e audiências', area: 'Suporte administrativo jurídico', preco: 'R$ 50/h' }),
    'Escolha de pacote': preencher(c.mensagem_pacote || MSG_PACOTE_PADRAO, { emoji: '⭐', pacote: 'Pacote Jurídico', publico: 'Advogados e escritórios', horas: '30h/mês', preco: 'R$ 1.300' }),
    'Cobrança': mensagemCobranca(c.mensagem_cobranca || MSG_COBRANCA_PADRAO, { responsavel: 'Paulo Silva', servico: 'Protocolo físico de petições', data: new Date().toISOString().slice(0, 10), valor: 80 }, c),
  };
  const [qual, setQual] = useState(Object.keys(exemplos)[0]);
  const texto = exemplos[qual];

  return (
    <div className="adm-item">
      <h3>Como as mensagens chegam no WhatsApp</h3>
      <p className="adm-dica" style={{ margin: 0 }}>Mostra as mensagens já salvas (salve antes de conferir). Dados de exemplo no lugar de serviço, cliente e valor.</p>
      <div className="adm-linha">
        {Object.keys(exemplos).map((k) => (
          <button key={k} className={`adm-btn peq${qual === k ? ' pri' : ''}`} onClick={() => setQual(k)}>{k}</button>
        ))}
      </div>
      <div className="zap-fundo">
        <div className="zap-balao">{formatar(texto)}<span className="zap-hora">10:12 ✓✓</span></div>
      </div>
      <div className="adm-linha">
        <a className="adm-btn pri" href={linkWhats(c.whatsapp, texto)} target="_blank" rel="noopener noreferrer">Testar no meu WhatsApp</a>
        <span className="adm-dica" style={{ margin: 0 }}>Abre a conversa com o seu próprio número ({c.whatsapp_exibicao || c.whatsapp}) com a mensagem pronta.</span>
      </div>
    </div>
  );
}
