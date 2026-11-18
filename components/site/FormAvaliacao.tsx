'use client';
// Formulário de avaliação: estrelas, comentário e autorização para publicar.
// Entra no painel desativado; a Maria aprova antes de aparecer no site.
import { useRef, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { linkWhats } from '@/lib/util';

// Pesquisa rápida: o que mais agradou (vira estatística no painel)
export const PONTOS = ['Rapidez', 'Comunicação', 'Organização', 'Relatório', 'Preço justo', 'Cordialidade'];

export default function FormAvaliacao({ nomeInicial, whatsapp, pedido }: { nomeInicial: string; whatsapp: string; pedido?: string }) {
  const [nota, setNota] = useState(0);
  const [pontos, setPontos] = useState<string[]>([]);
  const [passando, setPassando] = useState(0);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const abertoEm = useRef(Date.now());

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('site') || Date.now() - abertoEm.current < 3000) return; // anti-robô
    if (!nota) return setErro('Escolha de 1 a 5 estrelas.');
    setEnviando(true);
    setErro('');
    const { error } = await supabase().from('depoimentos').insert({
      nome: String(f.get('nome') || '').trim().slice(0, 80),
      cargo: String(f.get('cargo') || '').trim().slice(0, 80),
      texto: String(f.get('texto') || '').trim().slice(0, 1200),
      nota,
      autoriza: f.get('autoriza') === 'on',
      ativo: false,
      origem: 'avaliacao',
      ordem: 999,
      pedido: pedido || '',
      pontos,
    });
    setEnviando(false);
    if (error) return setErro('Não foi possível enviar agora. Tente de novo em instantes.');
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="aval-ok">
        <p style={{ fontSize: '2.4rem', margin: 0 }}>{'★'.repeat(nota)}</p>
        <h2>Obrigada pela avaliação!</h2>
        <a className="link-item destaque" href={linkWhats(whatsapp)} target="_blank" rel="noopener noreferrer">Voltar para o WhatsApp</a>
      </div>
    );
  }

  const ativa = passando || nota;
  return (
    <form className="aval" onSubmit={enviar}>
      <div className="aval-estrelas" role="radiogroup" aria-label="Nota de 1 a 5" onMouseLeave={() => setPassando(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
            className={n <= ativa ? 'cheia' : ''}
            onClick={() => setNota(n)}
            onMouseEnter={() => setPassando(n)}
          >★</button>
        ))}
      </div>
      {nota > 0 && (
        <fieldset className="aval-pontos">
          <legend>{nota >= 4 ? 'O que mais gostou?' : 'O que pode melhorar?'} <small>(opcional)</small></legend>
          {PONTOS.map((p) => (
            <button key={p} type="button" aria-pressed={pontos.includes(p)} className={pontos.includes(p) ? 'marcado' : ''}
              onClick={() => setPontos((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]))}>
              {pontos.includes(p) ? '✓ ' : ''}{p}
            </button>
          ))}
        </fieldset>
      )}
      <label>Seu nome<input name="nome" required defaultValue={nomeInicial} autoComplete="name" /></label>
      <label>Escritório / cidade (opcional)<input name="cargo" placeholder="Ex.: Silva Advogados, Juiz de Fora" /></label>
      <label>Comentário<textarea name="texto" required maxLength={1200} placeholder="Conte como foi o serviço" /></label>
      <label className="aval-check"><input type="checkbox" name="autoriza" defaultChecked /> Autorizo publicar minha avaliação no site</label>
      <input className="armadilha" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {erro && <p role="alert" style={{ color: '#ffb4ab', margin: 0 }}>{erro}</p>}
      <button className="link-item destaque" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar avaliação'}</button>
    </form>
  );
}
