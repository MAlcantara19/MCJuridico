'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
// Só o master vê: quem acessa o painel, aviso legal, rodapé e Google.
import type { Config } from '@/lib/tipos';
import CrudLista from './CrudLista';
import FormConfig from './FormConfig';

export default function AbaMaster({ config, salvar, avisar }: {
  config: Config;
  salvar: (p: Partial<Config>) => Promise<void>;
  avisar: (m: string, e?: boolean) => void;
}) {
  // Portfólio: quantas pessoas clicaram em "Quero um site assim"
  const [credito, setCredito] = useState<{ mes: number; total: number } | null>(null);
  useEffect(() => {
    (async () => {
      const desde = new Date(Date.now() - 30 * 864e5).toISOString();
      const [m, t] = await Promise.all([
        supabase().from('cliques').select('id', { count: 'exact', head: true }).eq('tipo', 'credito').gte('criado_em', desde),
        supabase().from('cliques').select('id', { count: 'exact', head: true }).eq('tipo', 'credito'),
      ]);
      setCredito({ mes: m.count ?? 0, total: t.count ?? 0 });
    })();
  }, []);

  // Testa o lembrete diário por e-mail
  const [testando, setTestando] = useState(false);
  async function testarLembrete() {
    setTestando(true);
    const { data } = await supabase().auth.getSession();
    const r = await fetch('/api/lembrete?teste=1', { headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } });
    const j = await r.json().catch(() => ({}));
    setTestando(false);
    avisar(j.ok ? 'E-mail de teste enviado. Confira a caixa de entrada (e o spam).' : `Não enviou: ${j.erro || r.status}`, !j.ok);
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="adm-grade">
        <div className="adm-item" style={{ gap: 2 }}>
          <span className="adm-dica" style={{ margin: 0 }}>“Quero um site assim” (30 dias)</span>
          <strong className="numero">{credito?.mes ?? '…'}</strong>
          <span className="adm-dica" style={{ margin: 0 }}>{credito ? `${credito.total} no total` : ''}</span>
        </div>
      </div>
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
        titulo="Aviso legal"
        config={config}
        salvar={salvar}
        campos={[
          { nome: 'aviso_legal', rotulo: 'Aviso legal', area: true, dica: 'Importante: ela não é advogada, então mantenha a frase sobre atos privativos.' },

        ]}
      />

      <div className="adm-item">
        <h3>Lembrete diário por e-mail</h3>
        <p className="adm-dica" style={{ margin: 0 }}>
          Todo dia, entre 18h e 19h, chega um e-mail com os compromissos de amanhã, os atrasados, as cobranças e os pedidos novos.
          Precisa das variáveis do lembrete na Vercel (veja o LEIA-ME).
        </p>
        <div><button className="adm-btn pri" onClick={testarLembrete} disabled={testando}>{testando ? 'Enviando…' : 'Enviar e-mail de teste agora'}</button></div>
      </div>

      <FormConfig
        titulo="Crédito do desenvolvedor (rodapé)"
        config={config}
        salvar={salvar}
        campos={[
          { nome: 'credito_nome', rotulo: 'Nome', dica: 'Deixe vazio para esconder o crédito.' },
          { nome: 'credito_whatsapp', rotulo: 'WhatsApp (só números, com 55 e DDD)' },
          { nome: 'credito_instagram', rotulo: 'Instagram (sem @)' },
          { nome: 'credito_mensagem', rotulo: 'Mensagem pronta para quem quiser um site', area: true },
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
