'use client';
// Painel de administração: login + abas.
// master (você) vê tudo; admin (ela) vê tudo menos a aba "Master".
import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Config } from '@/lib/tipos';
import AbaVisual from './AbaVisual';
import AbaInfo from './AbaInfo';
import AbaServicos from './AbaServicos';
import AbaListas from './AbaListas';
import AbaDocumentos from './AbaDocumentos';
import AbaSolicitacoes from './AbaSolicitacoes';
import AbaMaster from './AbaMaster';
import AbaResumo from './AbaResumo';
import AbaRelatorio from './AbaRelatorio';
import AbaArquivos from './AbaArquivos';
import AbaClientes from './gestao/AbaClientes';
import AbaFinanceiro from './gestao/AbaFinanceiro';
import AbaAgenda from './gestao/AbaAgenda';
import BotaoInstalar from './BotaoInstalar';

type Perfil = { email: string; nome: string; papel: 'master' | 'admin' };

const ABAS: { id: string; nome: string; soMaster?: boolean; grupo?: boolean }[] = [
  { id: 'resumo', nome: 'Resumo' },
  { id: 'g-trabalho', nome: 'Trabalho', grupo: true },
  { id: 'agenda', nome: 'Agenda' },
  { id: 'clientes', nome: 'Clientes' },
  { id: 'financeiro', nome: 'Financeiro' },
  { id: 'solicitacoes', nome: 'Solicitações' },
  { id: 'arquivos', nome: 'Meus arquivos' },
  { id: 'relatorio', nome: 'Relatório de diligência' },
  { id: 'g-site', nome: 'Site', grupo: true },
  { id: 'visual', nome: 'Visual e layout' },
  { id: 'info', nome: 'Textos e contatos' },
  { id: 'servicos', nome: 'Serviços' },
  { id: 'pacotes', nome: 'Pacotes' },
  { id: 'documentos', nome: 'Documentos do site' },
  { id: 'perguntas', nome: 'Assistente e dúvidas' },
  { id: 'formacoes', nome: 'Formação' },
  { id: 'depoimentos', nome: 'Depoimentos' },
  { id: 'master', nome: 'Master', soMaster: true },
];

export default function Painel() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [iniciando, setIniciando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [semAcesso, setSemAcesso] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [aba, setAba] = useState('resumo');
  const [relatorioId, setRelatorioId] = useState<number | null>(null);
  const [relatorioCliente, setRelatorioCliente] = useState<number | null>(null);
  const [clienteAberto, setClienteAberto] = useState<number | null>(null);
  const [recuperando, setRecuperando] = useState(false);
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; erro?: boolean } | null>(null);

  function avisar(texto: string, erro?: boolean) {
    setMsg({ texto, erro });
    setTimeout(() => setMsg(null), erro ? 5000 : 2200);
  }

  // Registra o service worker (necessário para instalar como app em alguns celulares)
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/admin' }).catch(() => {});
  }, []);

  // Sessão de login
  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => { setSessao(data.session); setIniciando(false); });
    const { data } = supabase().auth.onAuthStateChange((evento, s) => {
      setSessao(s);
      // Chegou pelo link de "esqueci minha senha" do e-mail
      if (evento === 'PASSWORD_RECOVERY') setTrocandoSenha(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Confere se o e-mail tem permissão e carrega as configurações
  useEffect(() => {
    if (!sessao) { setPerfil(null); return; }
    (async () => {
      const email = sessao.user.email ?? '';
      const { data } = await supabase().from('perfis').select('email, nome, papel').ilike('email', email).maybeSingle();
      if (!data) { setSemAcesso(true); return; }
      setSemAcesso(false);
      setPerfil(data as Perfil);
      try { localStorage.setItem('mc-admin', '1'); } catch {} // não conta suas visitas no Resumo
      const c = await supabase().from('configuracoes').select('*').eq('id', 1).single();
      if (c.data) setConfig(c.data as Config);
    })();
  }, [sessao]);

  async function salvarConfig(parcial: Partial<Config>) {
    const { error } = await supabase().from('configuracoes').update({ ...parcial, atualizado_em: new Date().toISOString() }).eq('id', 1);
    if (error) return avisar(`Erro ao salvar: ${error.message}`, true);
    setConfig((c) => (c ? { ...c, ...parcial } : c));
    avisar('Salvo. Atualize o site para ver.');
  }

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase().auth.signInWithPassword({
      email: String(f.get('email')),
      password: String(f.get('senha')),
    });
    if (error) avisar('E-mail ou senha incorretos.', true);
  }

  async function esqueci(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email'));
    const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin` });
    if (error) return avisar(`Erro: ${error.message}`, true);
    avisar('Se o e-mail estiver cadastrado, chega um link para criar nova senha.');
    setRecuperando(false);
  }

  async function novaSenha(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const senha = String(f.get('senha'));
    if (senha.length < 8) return avisar('Use pelo menos 8 caracteres.', true);
    if (senha !== String(f.get('confirmar'))) return avisar('As senhas não são iguais.', true);
    const { error } = await supabase().auth.updateUser({ password: senha });
    if (error) return avisar(`Erro: ${error.message}`, true);
    setTrocandoSenha(false);
    avisar('Senha alterada.');
  }

  async function sair() {
    await supabase().auth.signOut();
    try { localStorage.removeItem('mc-admin'); } catch {}
    setConfig(null);
    setPerfil(null);
    setSemAcesso(false);
  }

  const toast = msg && <div className={`adm-msg${msg.erro ? ' erro' : ''}`} role="status">{msg.texto}</div>;

  if (iniciando) return <div className="adm adm-login" />;

  if (sessao && trocandoSenha) {
    return (
      <div className="adm adm-login">
        <form onSubmit={novaSenha}>
          <h1>Nova senha</h1>
          <label>Nova senha<input name="senha" type="password" required minLength={8} autoComplete="new-password" /></label>
          <label>Repita a senha<input name="confirmar" type="password" required minLength={8} autoComplete="new-password" /></label>
          <button className="adm-btn pri" type="submit">Salvar senha</button>
          <button className="adm-btn" type="button" onClick={() => setTrocandoSenha(false)}>Cancelar</button>
        </form>
        {toast}
      </div>
    );
  }

  if (!sessao && recuperando) {
    return (
      <div className="adm adm-login">
        <form onSubmit={esqueci}>
          <h1>Esqueci a senha</h1>
          <p style={{ margin: 0, color: '#5b6780' }}>Digite seu e-mail. Você vai receber um link para criar uma senha nova.</p>
          <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
          <button className="adm-btn pri" type="submit">Enviar link</button>
          <button className="adm-btn" type="button" onClick={() => setRecuperando(false)}>Voltar</button>
        </form>
        {toast}
      </div>
    );
  }

  if (!sessao) {
    return (
      <div className="adm adm-login">
        <form onSubmit={entrar}>
          <h1>Painel</h1>
          <p style={{ margin: 0, color: '#5b6780' }}>Entre para editar o site.</p>
          <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
          <label>Senha<input name="senha" type="password" required autoComplete="current-password" /></label>
          <button className="adm-btn pri" type="submit">Entrar</button>
          <button className="adm-btn" type="button" onClick={() => setRecuperando(true)}>Esqueci minha senha</button>
          <a href="/" style={{ fontSize: '0.85rem', color: '#5b6780' }}>Voltar ao site</a>
        </form>
        {toast}
      </div>
    );
  }

  if (semAcesso) {
    return (
      <div className="adm adm-login">
        <form onSubmit={(e) => { e.preventDefault(); sair(); }}>
          <h1>Sem acesso</h1>
          <p style={{ margin: 0 }}>O e-mail {sessao.user.email} não está liberado no painel. Peça ao master para cadastrar.</p>
          <button className="adm-btn pri" type="submit">Sair</button>
        </form>
      </div>
    );
  }

  if (!perfil || !config) return <div className="adm adm-login" />;

  const abas = ABAS.filter((a) => !a.soMaster || perfil.papel === 'master');

  return (
    <div className="adm">
      <header className="adm-topo">
        <div>
          <strong>{config.marca || 'Painel do site'}</strong>
          <small>{perfil.nome || perfil.email} · {perfil.papel === 'master' ? 'Master' : 'Administradora'}</small>
        </div>
        <div className="adm-linha">
          <BotaoInstalar />
          <a className="adm-btn peq" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} href="/" target="_blank" rel="noopener noreferrer">Ver site</a>
          <button className="adm-btn peq" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={() => setTrocandoSenha(true)}>Trocar senha</button>
          <button className="adm-btn peq" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={sair}>Sair</button>
        </div>
      </header>

      <div className="adm-corpo">
        <nav className="adm-abas" aria-label="Seções do painel">
          {abas.map((a) => (
            a.grupo
              ? <span key={a.id} className="adm-grupo">{a.nome}</span>
              : <button key={a.id} className={`adm-aba${aba === a.id ? ' ativa' : ''}`} onClick={() => { setAba(a.id); if (a.id === 'relatorio') { setRelatorioId(null); setRelatorioCliente(null); } if (a.id === 'clientes') setClienteAberto(null); }}>{a.nome}</button>
          ))}
        </nav>

        <section className="adm-card">
          {aba === 'resumo' && <AbaResumo nome={perfil.nome} irPara={setAba} />}
          {aba === 'solicitacoes' && <AbaSolicitacoes avisar={avisar} irPara={setAba} />}
          {aba === 'agenda' && <AbaAgenda avisar={avisar} />}
          {aba === 'clientes' && (
            <AbaClientes
              key={clienteAberto ?? 'lista'}
              avisar={avisar}
              config={config}
              abrirId={clienteAberto}
              navegar={{
                abrirRelatorio: (id) => { setRelatorioId(id); setRelatorioCliente(null); setAba('relatorio'); },
                novoRelatorio: (cid) => { setRelatorioId(null); setRelatorioCliente(cid); setAba('relatorio'); },
              }}
            />
          )}
          {aba === 'financeiro' && <AbaFinanceiro avisar={avisar} config={config} />}
          {aba === 'relatorio' && (
            <AbaRelatorio
              key={`${relatorioId}-${relatorioCliente}`}
              config={config}
              avisar={avisar}
              relatorioId={relatorioId}
              clienteInicial={relatorioCliente}
              aoConcluir={() => { setRelatorioId(null); setRelatorioCliente(null); }}
            />
          )}
          {aba === 'arquivos' && <AbaArquivos avisar={avisar} />}
          {aba === 'depoimentos' && <AbaListas tipo="depoimentos" config={config} salvar={salvarConfig} avisar={avisar} />}
          {aba === 'visual' && <AbaVisual config={config} salvar={salvarConfig} avisar={avisar} />}
          {aba === 'info' && <AbaInfo config={config} salvar={salvarConfig} />}
          {aba === 'servicos' && <AbaServicos avisar={avisar} />}
          {aba === 'pacotes' && <AbaListas tipo="pacotes" config={config} salvar={salvarConfig} avisar={avisar} />}
          {aba === 'perguntas' && <AbaListas tipo="perguntas" config={config} salvar={salvarConfig} avisar={avisar} />}
          {aba === 'formacoes' && <AbaListas tipo="formacoes" config={config} salvar={salvarConfig} avisar={avisar} />}
          {aba === 'documentos' && <AbaDocumentos avisar={avisar} />}
          {aba === 'master' && perfil.papel === 'master' && <AbaMaster config={config} salvar={salvarConfig} avisar={avisar} />}
        </section>
      </div>
      {toast}
    </div>
  );
}
