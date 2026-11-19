// Texto do contrato de pacote mensal (o mesmo no painel, no PDF e na página de aceite do cliente).
import type { Config } from '@/lib/tipos';
import { brl, dataBR, porExtenso } from '@/lib/gestao';
import { linhas } from '@/lib/util';

export type DadosContrato = {
  numero: string; pacote: string; horas_mes: number; valor_mensal: number; hora_extra: number;
  dia_vencimento: number; inicio: string; meses: number; clausulas: string;
  status?: string; aceito_em?: string | null; aceito_nome?: string;
  cliente: { nome: string; responsavel?: string; documento?: string; cidade?: string };
};

export const CLAUSULAS_PADRAO = [
  'Os serviços são prestados em caráter de apoio jurídico-administrativo, sem substituir a atuação do advogado responsável pelo processo.',
  'As horas não utilizadas no mês não são acumuladas para o mês seguinte.',
  'Despesas de terceiros (custas, cópias, taxas, correios) e deslocamentos fora da área de atendimento são cobrados à parte, com comprovante.',
  'Os documentos e informações recebidos são tratados com sigilo, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).',
  'Qualquer das partes pode encerrar o contrato com aviso de 30 dias, sem multa. Os serviços já prestados são devidos.',
].join('\n');

export default function TextoContrato({ d, config, assinatura }: { d: DadosContrato; config: Config; assinatura?: string }) {
  const fim = (() => {
    const [a, m, dd] = d.inicio.split('-').map(Number);
    const x = new Date(a, m - 1 + (Number(d.meses) || 12), dd - 1);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  })();
  const cliente = d.cliente;
  const extras = linhas(d.clausulas || CLAUSULAS_PADRAO);
  let n = 0;
  const cl = () => `Cláusula ${++n}ª`;

  return (
    <article className="relatorio contrato" style={{ ['--rel-cor' as string]: config.cor_primaria, ['--rel-ouro' as string]: config.cor_destaque }}>
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
      <h1 className="rel-titulo">Contrato de prestação de serviços · Pacote mensal</h1>
      <p className="rel-sub">Contrato nº {d.numero}</p>

      <p><strong>CONTRATADA:</strong> {config.nome}, {config.profissao}.</p>
      <p><strong>CONTRATANTE:</strong> {cliente.nome}{cliente.documento ? `, ${cliente.documento}` : ''}{cliente.cidade ? `, ${cliente.cidade}` : ''}{cliente.responsavel ? `, neste ato representado(a) por ${cliente.responsavel}` : ''}.</p>

      <h2>{cl()} · Objeto</h2>
      <p>Prestação de serviços do <strong>{d.pacote}</strong>, com até <strong>{String(d.horas_mes).replace('.', ',')} horas por mês</strong>, conforme a tabela de serviços vigente.</p>
      <h2>{cl()} · Valor e pagamento</h2>
      <p>
        O CONTRATANTE pagará <strong>{brl(d.valor_mensal)}</strong> ({porExtenso(Number(d.valor_mensal) || 0)}) por mês, com vencimento todo dia <strong>{d.dia_vencimento}</strong>, por Pix ou transferência.
        {Number(d.hora_extra) > 0 && <> Horas além do pacote custam <strong>{brl(d.hora_extra)}</strong> cada.</>}
      </p>
      <h2>{cl()} · Vigência</h2>
      <p>De <strong>{dataBR(d.inicio)}</strong> a <strong>{dataBR(fim)}</strong> ({d.meses} meses), renovável por acordo entre as partes.</p>
      {extras.map((t, i) => (
        <div key={i}>
          <h2>{cl()}</h2>
          <p>{t}</p>
        </div>
      ))}
      <h2>{cl()} · Aceite</h2>
      <p>O aceite eletrônico (pelo link enviado ou pela resposta “ACEITO” no WhatsApp) tem o mesmo valor da assinatura deste contrato.</p>

      <div className="contrato-assinaturas">
        <footer className="rel-assinatura">
          {assinatura && <img className="rel-ass-img" src={assinatura} alt="Assinatura" />}
          <div className="rel-linha" />
          <div>{config.nome}</div>
          <small>Contratada</small>
        </footer>
        <footer className="rel-assinatura">
          {d.status === 'aceito' && d.aceito_em
            ? <div className="contrato-aceite">✓ Aceito eletronicamente por <strong>{d.aceito_nome}</strong><br />em {new Date(d.aceito_em).toLocaleString('pt-BR')}</div>
            : <div style={{ height: 60 }} />}
          <div className="rel-linha" />
          <div>{cliente.responsavel || cliente.nome}</div>
          <small>Contratante</small>
        </footer>
      </div>
    </article>
  );
}
