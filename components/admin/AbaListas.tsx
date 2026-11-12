'use client';
// Pacotes, perguntas do assistente e formações.
import type { Config } from '@/lib/tipos';
import CrudLista from './CrudLista';
import FormConfig from './FormConfig';

type Props = {
  tipo: 'pacotes' | 'perguntas' | 'formacoes' | 'depoimentos';
  config: Config;
  salvar: (p: Partial<Config>) => Promise<void>;
  avisar: (m: string, e?: boolean) => void;
};

export default function AbaListas({ tipo, config, salvar, avisar }: Props) {
  if (tipo === 'pacotes') {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2>Pacotes</h2>
          <p className="adm-sub">“Mensal” aparece em Pacotes, “Teste” no quadro tracejado e “Correspondente” no cartão da seção de diligências.</p>
        </div>
        <CrudLista
          tabela="pacotes"
          avisar={avisar}
          textoNovo="Novo pacote"
          novo={{ nome: 'Novo pacote', grupo: 'mensal' }}
          campos={[
            { nome: 'nome', rotulo: 'Nome' },
            { nome: 'publico', rotulo: 'Para quem é' },
            { nome: 'horas', rotulo: 'Horas / quantidade' },
            { nome: 'preco', rotulo: 'Preço' },
            { nome: 'grupo', rotulo: 'Onde aparece', tipo: 'select', opcoes: [
              { valor: 'mensal', rotulo: 'Mensal' }, { valor: 'teste', rotulo: 'Teste' }, { valor: 'correspondente', rotulo: 'Correspondente' },
            ] },
            { nome: 'destaque', rotulo: 'Destaque (mais procurado)', tipo: 'bool' },
            { nome: 'ativo', rotulo: 'Aparece no site', tipo: 'bool' },
          ]}
        />
        <FormConfig titulo="Regras dos pacotes" config={config} salvar={salvar}
          campos={[{ nome: 'regras_pacotes', rotulo: 'Uma regra por linha', area: true }]} />
      </div>
    );
  }

  if (tipo === 'perguntas') {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2>Assistente e dúvidas</h2>
          <p className="adm-sub">Essas perguntas aparecem na seção Dúvidas e no assistente do site. As palavras-chave ajudam o assistente a achar a resposta quando a pessoa digita.</p>
        </div>
        <FormConfig titulo="Mensagem de boas-vindas do assistente" config={config} salvar={salvar}
          campos={[{ nome: 'assistente_saudacao', rotulo: 'Saudação', area: true }]} />
        <CrudLista
          tabela="perguntas"
          avisar={avisar}
          textoNovo="Nova pergunta"
          novo={{ pergunta: 'Nova pergunta', resposta: '' }}
          campos={[
            { nome: 'pergunta', rotulo: 'Pergunta' },
            { nome: 'palavras_chave', rotulo: 'Palavras-chave (separadas por espaço)' },
            { nome: 'ativo', rotulo: 'Ativa', tipo: 'bool' },
            { nome: 'resposta', rotulo: 'Resposta', tipo: 'area' },
          ]}
        />
      </div>
    );
  }

  if (tipo === 'depoimentos') {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <h2>Depoimentos</h2>
          <p className="adm-sub">Peça aos clientes satisfeitos uma frase curta e autorização para publicar. A seção só aparece no site quando houver pelo menos um depoimento ativo.</p>
        </div>
        <CrudLista
          tabela="depoimentos"
          avisar={avisar}
          textoNovo="Novo depoimento"
          novo={{ nome: 'Nome do cliente', cargo: '', texto: '' }}
          campos={[
            { nome: 'nome', rotulo: 'Nome' },
            { nome: 'cargo', rotulo: 'Cargo / cidade', },
            { nome: 'ativo', rotulo: 'Aparece no site', tipo: 'bool' },
            { nome: 'texto', rotulo: 'Depoimento', tipo: 'area' },
          ]}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Formação</h2>
        <p className="adm-sub">Graduação, cursos e certificados. Aparecem na seção Sobre.</p>
      </div>
      <CrudLista
        tabela="formacoes"
        avisar={avisar}
        textoNovo="Nova formação"
        novo={{ titulo: 'Novo curso' }}
        campos={[
          { nome: 'titulo', rotulo: 'Curso / título' },
          { nome: 'instituicao', rotulo: 'Instituição' },
          { nome: 'ano', rotulo: 'Ano' },
        ]}
      />
    </div>
  );
}
