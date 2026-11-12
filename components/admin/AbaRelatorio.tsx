'use client';
// Gera o relatório de diligência (com fotos) pronto para salvar em PDF e mandar ao escritório.
// Nada é salvo no banco: as fotos ficam só no aparelho até gerar o PDF.
import { useEffect, useState } from 'react';
import type { Config } from '@/lib/tipos';
import { supabase } from '@/lib/supabase';

type Foto = { url: string; legenda: string };

const agora = () => {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, '0');
  return { data: `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`, hora: `${z(d.getHours())}:${z(d.getMinutes())}` };
};

export default function AbaRelatorio({ config }: { config: Config }) {
  const inicio = agora();
  const [tipos, setTipos] = useState<string[]>([]);
  const [r, setR] = useState({
    cliente: '', advogado: '', processo: '', comarca: 'Três Rios/RJ', local: '',
    tipo: '', data: inicio.data, hora: inicio.hora, resultado: 'Cumprida', descricao: '', observacoes: '', custas: '',
  });
  const [fotos, setFotos] = useState<Foto[]>([]);

  // Tipos de diligência = serviços presenciais cadastrados
  useEffect(() => {
    (async () => {
      const cats = await supabase().from('categorias').select('id').eq('modalidade', 'presencial');
      const ids = (cats.data ?? []).map((c: any) => c.id);
      if (!ids.length) return;
      const s = await supabase().from('servicos').select('nome').in('categoria_id', ids).order('ordem');
      const nomes = (s.data ?? []).map((x: any) => x.nome);
      setTipos(nomes);
      setR((v) => (v.tipo ? v : { ...v, tipo: nomes[0] ?? '' }));
    })();
  }, []);

  function mudar(campo: string, valor: string) { setR((v) => ({ ...v, [campo]: valor })); }

  function addFotos(lista: FileList | null) {
    if (!lista) return;
    const novas = Array.from(lista).slice(0, 8).map((f) => ({ url: URL.createObjectURL(f), legenda: '' }));
    setFotos((x) => [...x, ...novas].slice(0, 8));
  }

  const dataBR = r.data ? r.data.split('-').reverse().join('/') : '';
  const campo = (rotulo: string, nome: keyof typeof r, props: Record<string, any> = {}) => (
    <label>{rotulo}<input value={r[nome]} onChange={(e) => mudar(nome, e.target.value)} {...props} /></label>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="nao-imprimir">
        <h2>Relatório de diligência</h2>
        <p className="adm-sub">Preencha, adicione as fotos e clique em Gerar PDF. No celular, escolha “Salvar como PDF” na tela de impressão.</p>
      </div>

      <div className="adm-item nao-imprimir">
        <div className="adm-grade">
          {campo('Escritório / cliente', 'cliente', { placeholder: 'Ex.: Silva & Souza Advogados' })}
          {campo('Advogado(a) responsável', 'advogado')}
          {campo('Nº do processo', 'processo', { placeholder: '0000000-00.0000.8.19.0000' })}
          {campo('Comarca', 'comarca')}
          {campo('Local', 'local', { placeholder: 'Ex.: Fórum de Três Rios, 2ª Vara Cível' })}
          <label>
            Tipo de diligência
            <select value={r.tipo} onChange={(e) => mudar('tipo', e.target.value)}>
              {tipos.map((t) => <option key={t}>{t}</option>)}
              <option>Outro</option>
            </select>
          </label>
          {campo('Data', 'data', { type: 'date' })}
          {campo('Hora', 'hora', { type: 'time' })}
          <label>
            Resultado
            <select value={r.resultado} onChange={(e) => mudar('resultado', e.target.value)}>
              <option>Cumprida</option>
              <option>Cumprida parcialmente</option>
              <option>Não cumprida</option>
            </select>
          </label>
          {campo('Custas / despesas (opcional)', 'custas', { placeholder: 'Ex.: R$ 12,40 de cópias' })}
          <label style={{ gridColumn: '1 / -1' }}>O que foi feito<textarea value={r.descricao} onChange={(e) => mudar('descricao', e.target.value)} placeholder="Descreva a diligência: com quem falou, o que foi protocolado, retirado ou consultado." /></label>
          <label style={{ gridColumn: '1 / -1' }}>Observações<textarea value={r.observacoes} onChange={(e) => mudar('observacoes', e.target.value)} /></label>
        </div>
        <label>Fotos (até 8)<input type="file" accept="image/*" multiple onChange={(e) => addFotos(e.target.files)} /></label>
        {fotos.length > 0 && (
          <div className="adm-grade">
            {fotos.map((f, i) => (
              <div key={f.url} style={{ display: 'grid', gap: 6 }}>
                <img src={f.url} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 8 }} />
                <input value={f.legenda} placeholder="Legenda" onChange={(e) => setFotos((x) => x.map((y, j) => (j === i ? { ...y, legenda: e.target.value } : y)))} />
                <button className="adm-btn peq perigo" onClick={() => setFotos((x) => x.filter((_, j) => j !== i))}>Remover</button>
              </div>
            ))}
          </div>
        )}
        <div className="adm-linha"><button className="adm-btn pri" onClick={() => window.print()}>Gerar PDF</button></div>
      </div>

      {/* Prévia: é exatamente o que sai no PDF */}
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
        <h1>Relatório de diligência</h1>
        <table className="rel-tabela">
          <tbody>
            {[
              ['Cliente', r.cliente], ['Advogado(a)', r.advogado], ['Processo', r.processo],
              ['Comarca', r.comarca], ['Local', r.local], ['Diligência', r.tipo],
              ['Data e hora', `${dataBR} às ${r.hora}`], ['Resultado', r.resultado], ['Custas', r.custas],
            ].filter(([, v]) => v).map(([k, v]) => (
              <tr key={k}><th>{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
        {r.descricao && (<><h2>Descrição</h2><p className="rel-texto">{r.descricao}</p></>)}
        {r.observacoes && (<><h2>Observações</h2><p className="rel-texto">{r.observacoes}</p></>)}
        {fotos.length > 0 && (
          <>
            <h2>Registro fotográfico</h2>
            <div className="rel-fotos">
              {fotos.map((f, i) => (
                <figure key={f.url}>
                  <img src={f.url} alt={f.legenda || `Foto ${i + 1}`} />
                  <figcaption>Foto {i + 1}{f.legenda ? `: ${f.legenda}` : ''}</figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
        <footer className="rel-assinatura">
          <div className="rel-linha" />
          <div>{config.nome}</div>
          <small>{config.aviso_legal}</small>
        </footer>
      </article>
    </div>
  );
}
