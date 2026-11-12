'use client';
// Textos do site e contatos.
import type { Config } from '@/lib/tipos';
import FormConfig from './FormConfig';

export default function AbaInfo({ config, salvar }: { config: Config; salvar: (p: Partial<Config>) => Promise<void> }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Textos e contatos</h2>
        <p className="adm-sub">Tudo o que aparece escrito no site. Em listas, use uma linha por item.</p>
      </div>
      <FormConfig
        titulo="Apresentação (topo do site)"
        config={config}
        salvar={salvar}
        campos={[
          { nome: 'marca', rotulo: 'Nome da marca (menu e rodapé)', dica: 'Ex.: MC Jurídico' },
          { nome: 'nome', rotulo: 'Nome completo (destaque do topo)' },
          { nome: 'profissao', rotulo: 'Profissão / chamada' },
          { nome: 'descricao_hero', rotulo: 'Texto de apresentação', area: true },
          { nome: 'destaques', rotulo: 'Destaques abaixo dos botões', area: true, dica: 'Uma linha por destaque.' },
        ]}
      />
      <FormConfig
        titulo="Títulos das seções"
        config={config}
        salvar={salvar}
        campos={[
          { nome: 'titulo_servicos', rotulo: 'Serviços: título' },
          { nome: 'sub_servicos', rotulo: 'Serviços: subtítulo', dica: 'Ex.: Atendimento 100% remoto para todo o Brasil · Hora avulsa R$ 40 a R$ 60' },
          { nome: 'nota_servicos', rotulo: 'Serviços: observação pequena', dica: 'Deixe vazio para esconder.' },
          { nome: 'titulo_correspondente', rotulo: 'Correspondente: título' },
          { nome: 'sub_correspondente', rotulo: 'Correspondente: subtítulo' },
          { nome: 'titulo_pacotes', rotulo: 'Pacotes: título' },
          { nome: 'sub_pacotes', rotulo: 'Pacotes: subtítulo' },
          { nome: 'rotulo_teste', rotulo: 'Pacote teste: chamada', dica: 'Ex.: Experimente' },
        ]}
      />
      <FormConfig
        titulo="Contatos"
        config={config}
        salvar={salvar}
        campos={[
          { nome: 'whatsapp', rotulo: 'WhatsApp (só números, com 55 e DDD)', dica: 'Ex.: 5524993270959' },
          { nome: 'whatsapp_exibicao', rotulo: 'WhatsApp como aparece no site', dica: 'Ex.: (24) 99327-0959' },
          { nome: 'instagram', rotulo: 'Instagram (sem @)' },
          { nome: 'email', rotulo: 'E-mail profissional', dica: 'Deixe vazio para esconder.' },
          { nome: 'mensagem_whatsapp', rotulo: 'Mensagem pronta do WhatsApp (botões gerais)', area: true },
          { nome: 'mensagem_servico', rotulo: 'Mensagem ao tocar em um serviço', area: true, dica: 'Use {servico}, {area} e {preco}. Ex.: Tenho interesse no serviço *{servico}*, valor {preco}.' },
          { nome: 'mensagem_pacote', rotulo: 'Mensagem ao escolher um pacote', area: true, dica: 'Use {pacote}, {horas} e {preco}.' },
          { nome: 'mensagem_cobranca', rotulo: 'Mensagem de cobrança (botão Cobrar)', area: true, dica: 'Use {responsavel}, {servico}, {data} e {valor}.' },
        ]}
      />
      <FormConfig
        titulo="Sobre e como funciona"
        config={config}
        salvar={salvar}
        campos={[
          { nome: 'sobre_texto', rotulo: 'Sobre mim', area: true, dica: 'Deixe uma linha em branco entre os parágrafos.' },
          { nome: 'passos', rotulo: 'Como funciona', area: true, dica: 'Uma linha por passo, no formato: Título | texto' },
        ]}
      />
      <FormConfig
        titulo="Correspondente jurídica"
        config={config}
        salvar={salvar}
        campos={[
          { nome: 'area_atendimento', rotulo: 'Área de atendimento', area: true, dica: 'Uma linha por cidade/regra.' },
          { nome: 'observacoes_correspondente', rotulo: 'Observações', area: true },
        ]}
      />
    </div>
  );
}
