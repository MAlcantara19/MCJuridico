'use client';
// Áreas (categorias) e serviços com preço.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import CrudLista from './CrudLista';
import { ICONES_AREA } from '@/components/site/Icones';

// Emojis para as mensagens (vazio = automático pelo ícone)
const EMOJIS = ['', '⚖️', '💼', '💰', '💻', '🏪', '📄', '📂', '🏛️', '📑', '📊', '📅', '🧾', '✍️', '📌'].map((e) => ({ valor: e, rotulo: e || 'Automático (pelo ícone)' }));

// Prazo de entrega preenchido sozinho no pedido (conta só dias úteis, sem feriados)
const PRAZOS = [{ valor: 0, rotulo: 'Sem prazo padrão' }, ...[1, 2, 3, 4, 5, 7, 10, 15, 20, 30].map((n) => ({ valor: n, rotulo: `${n} dia${n > 1 ? 's' : ''} út${n > 1 ? 'eis' : 'il'}` }))];

type Aviso = (m: string, e?: boolean) => void;

export default function AbaServicos({ avisar }: { avisar: Aviso }) {
  const [categorias, setCategorias] = useState<{ valor: number; rotulo: string }[]>([]);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    supabase().from('categorias').select('id, nome, modalidade').order('ordem').then(({ data }) => {
      setCategorias((data ?? []).map((c: any) => ({ valor: c.id, rotulo: `${c.nome}${c.modalidade === 'presencial' ? ' (presencial)' : ''}` })));
    });
  }, [versao]);

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      <div>
        <h2>Serviços</h2>
        <p className="adm-sub">Escolha a área e edite os serviços dela. O preço é texto livre (ex.: “R$ 50/h”, “desde R$ 150/mês”). O checklist aparece no formulário do site e no serviço registrado, para não esquecer nenhum documento. O prazo padrão preenche sozinho a data de entrega do pedido, contando só dias úteis (sem sábados, domingos e feriados).</p>
        {categorias.length > 0 && (
          <CrudLista
            tabela="servicos"
            avisar={avisar}
            textoNovo="Novo serviço"
            novo={{ nome: 'Novo serviço', preco: '' }}
            filtro={{ campo: 'categoria_id', rotulo: 'Área', opcoes: categorias }}
            campos={[
              { nome: 'nome', rotulo: 'Serviço' },
              { nome: 'preco', rotulo: 'Preço' },
              { nome: 'categoria_id', rotulo: 'Área', tipo: 'select', opcoes: categorias, numero: true },
              { nome: 'ativo', rotulo: 'Aparece no site', tipo: 'bool' },
              { nome: 'prazo_dias', rotulo: 'Prazo padrão (dias úteis)', tipo: 'select', numero: true, opcoes: PRAZOS },
              { nome: 'checklist', rotulo: 'Checklist de documentos (um por linha)', tipo: 'area' },
            ]}
            recarregar={versao}
          />
        )}
      </div>

      <div>
        <h2>Áreas de serviço</h2>
        <p className="adm-sub">“Remoto” aparece em Serviços. “Presencial” aparece em Correspondente jurídica.</p>
        <CrudLista
          tabela="categorias"
          avisar={avisar}
          textoNovo="Nova área"
          novo={{ nome: 'Nova área', descricao: '', modalidade: 'remoto', icone: 'documento' }}
          aoMudar={() => setVersao((n) => n + 1)}
          campos={[
            { nome: 'nome', rotulo: 'Nome da área' },
            { nome: 'modalidade', rotulo: 'Tipo', tipo: 'select', opcoes: [{ valor: 'remoto', rotulo: 'Remoto' }, { valor: 'presencial', rotulo: 'Presencial' }] },
            { nome: 'icone', rotulo: 'Ícone', tipo: 'select', opcoes: ICONES_AREA },
            { nome: 'emoji', rotulo: 'Emoji nas mensagens do WhatsApp', tipo: 'select', opcoes: EMOJIS },
            { nome: 'ativo', rotulo: 'Aparece no site', tipo: 'bool' },
            { nome: 'descricao', rotulo: 'Descrição curta', tipo: 'area' },
          ]}
        />
      </div>
    </div>
  );
}
