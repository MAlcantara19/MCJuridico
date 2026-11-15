'use client';
// Recibo em PDF com a marca dela, para serviços pagos.
import type { Config } from '@/lib/tipos';
import { msgRecibo } from '@/lib/mensagens';
import { brl, dataBR, porExtenso, whatsDoTelefone, type Atendimento, type Cliente } from '@/lib/gestao';

export default function Recibo({ atendimento: a, cliente, config, fechar }: { atendimento: Atendimento; cliente?: Cliente; config: Config; fechar: () => void }) {
  const numero = `REC-${(a.data_pagamento || a.data).slice(0, 4)}-${String(a.id).padStart(4, '0')}`;
  const valor = Number(a.valor) || 0;
  const pagador = cliente?.nome || 'Cliente';
  const dataPag = dataBR(a.data_pagamento || a.data);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="adm-item mudou nao-imprimir">
        <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Recibo nº {numero}</h3>
          <button className="adm-btn peq" onClick={fechar}>Fechar</button>
        </div>
        <div className="adm-linha">
          <button className="adm-btn pri" onClick={() => window.print()}>Gerar PDF</button>
          {cliente?.telefone && (
            <a className="adm-btn" target="_blank" rel="noopener noreferrer"
              href={whatsDoTelefone(cliente.telefone, msgRecibo({ nome: cliente.responsavel || cliente.nome, numero, servico: a.servico, valor: brl(valor) }))}>
              Enviar no WhatsApp
            </a>
          )}
        </div>
        <p className="adm-dica" style={{ margin: 0 }}>Gere o PDF, salve e anexe na conversa do WhatsApp que abrir.</p>
      </div>

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
        <div className="recibo-cabeca">
          <h1>Recibo</h1>
          <div className="recibo-valor">{brl(valor)}</div>
        </div>
        <p className="recibo-texto">
          Recebi de <strong>{pagador}</strong>{cliente?.documento ? `, ${cliente.documento},` : ''} a importância de <strong>{brl(valor)}</strong> ({porExtenso(valor)}),
          referente a <strong>{a.servico}</strong>{a.processo ? `, processo nº ${a.processo}` : ''}.
        </p>
        <table className="rel-tabela">
          <tbody>
            <tr><th>Recibo nº</th><td>{numero}</td></tr>
            <tr><th>Data do pagamento</th><td>{dataPag}</td></tr>
            {a.forma_pagamento && <tr><th>Forma</th><td>{a.forma_pagamento}</td></tr>}
            {a.descricao && <tr><th>Descrição</th><td>{a.descricao}</td></tr>}
          </tbody>
        </table>
        <p className="recibo-texto" style={{ marginTop: 28 }}>Para clareza, firmo o presente recibo, dando plena quitação do valor acima.</p>
        <footer className="rel-assinatura">
          <div className="rel-linha" />
          <div>{config.nome}</div>
          <small>{dataPag}</small>
        </footer>
      </article>
    </div>
  );
}
