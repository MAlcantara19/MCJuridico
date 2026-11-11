'use client';
// Só o master vê: quem acessa o painel, aviso legal, rodapé e Google.
import type { Config } from '@/lib/tipos';
import CrudLista from './CrudLista';
import FormConfig from './FormConfig';

export default function AbaMaster({ config, salvar, avisar }: {
  config: Config;
  salvar: (p: Partial<Config>) => Promise<void>;
  avisar: (m: string, e?: boolean) => void;
}) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Master</h2>
        <p className="adm-sub">Acessos ao painel e configurações que só você controla.</p>
      </div>

      <div className="adm-item">
        <h3>Quem pode entrar no painel</h3>
        <p className="adm-dica" style={{ marginTop: -6 }}>
          1) Cadastre o e-mail aqui. 2) No Supabase, vá em Authentication › Users › Add user e crie a conta com o mesmo e-mail e uma senha.
        </p>
        <CrudLista
          tabela="perfis"
          semOrdem
          avisar={avisar}
          textoNovo="Novo acesso"
          novo={{ email: `novo-${Date.now()}@trocar.com`, nome: '', papel: 'admin' }}
          campos={[
            { nome: 'email', rotulo: 'E-mail' },
            { nome: 'nome', rotulo: 'Nome' },
            { nome: 'papel', rotulo: 'Papel', tipo: 'select', opcoes: [{ valor: 'admin', rotulo: 'Admin' }, { valor: 'master', rotulo: 'Master' }] },
          ]}
        />
      </div>

      <FormConfig
        titulo="Rodapé e aviso legal"
        config={config}
        salvar={salvar}
        campos={[
          { nome: 'aviso_legal', rotulo: 'Aviso legal', area: true, dica: 'Importante: ela não é advogada, então mantenha a frase sobre atos privativos.' },
          { nome: 'rodape_credito', rotulo: 'Crédito no rodapé' },
        ]}
      />

      <FormConfig
        titulo="Google e compartilhamento"
        config={config}
        salvar={salvar}
        campos={[
          { nome: 'seo_titulo', rotulo: 'Título no Google / aba do navegador' },
          { nome: 'seo_descricao', rotulo: 'Descrição no Google', area: true },
        ]}
      />
    </div>
  );
}
