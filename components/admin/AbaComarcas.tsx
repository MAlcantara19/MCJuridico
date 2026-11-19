'use client';
// Comarcas atendidas: aparecem no mapa do site (início e página para escritórios).
// O botão "Achar no mapa" busca a localização da cidade sozinho (OpenStreetMap).
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Comarca, Config } from '@/lib/tipos';
import MapaComarcas from '@/components/site/MapaComarcas';
import { brl, kmComarca, valorDeslocamento } from '@/lib/gestao';

// Distância pela estrada (OSRM, gratuito e sem chave)
async function kmEstrada(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`);
  const j = await r.json();
  const m = j?.routes?.[0]?.distance;
  if (!m) throw new Error('sem rota');
  return Math.round(m / 100) / 10;
}

type Aviso = (m: string, e?: boolean) => void;
const TIPOS = [
  { valor: 'base', rotulo: '🔵 Onde estou (base)' },
  { valor: 'deslocamento', rotulo: '🟡 Atendo com deslocamento' },
  { valor: 'consulta', rotulo: '⚪ Sob consulta' },
];

export default function AbaComarcas({ avisar, config }: { avisar: Aviso; config: Config }) {
  const [lista, setLista] = useState<Comarca[]>([]);
  const [mudadas, setMudadas] = useState<Set<number>>(new Set());
  const [buscando, setBuscando] = useState<number | null>(null);
  const [versao, setVersao] = useState(0);
  const [regra, setRegra] = useState({ km_valor: String(config.km_valor ?? 1.2).replace('.', ','), km_franquia: String(config.km_franquia ?? 15), km_ida_volta: !!config.km_ida_volta });
  const [calculando, setCalculando] = useState(false);
  const num = (t: string) => Number(String(t).replace(',', '.')) || 0;
  const regraNum = { km_valor: num(regra.km_valor), km_franquia: num(regra.km_franquia), km_ida_volta: regra.km_ida_volta };

  async function salvarRegra() {
    const { error } = await supabase().from('configuracoes').update(regraNum).eq('id', 1);
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-17.sql?`, true);
    avisar('Regra do deslocamento salva');
    setVersao((n) => n + 1);
  }

  // Calcula a distância pela estrada de todas as comarcas até a base
  async function calcularTodas() {
    const base = lista.find((c) => c.tipo === 'base' && c.lat != null);
    if (!base) return avisar('Marque uma comarca como "Onde estou (base)" e ache ela no mapa primeiro.', true);
    setCalculando(true);
    let ok = 0;
    for (const c of lista) {
      if (c.id === base.id || c.lat == null || c.lng == null) continue;
      try {
        const km = await kmEstrada({ lat: Number(base.lat), lng: Number(base.lng) }, { lat: Number(c.lat), lng: Number(c.lng) });
        await supabase().from('comarcas').update({ km }).eq('id', c.id);
        ok += 1;
      } catch { /* segue para a próxima */ }
    }
    await supabase().from('comarcas').update({ km: 0 }).eq('id', base.id);
    setCalculando(false);
    avisar(`Distância calculada para ${ok} comarca${ok === 1 ? '' : 's'}.`);
    carregar();
  }

  async function carregar() {
    const { data, error } = await supabase().from('comarcas').select('*').order('ordem');
    if (error) return avisar(`Erro: ${error.message}. Rodou o atualizacao-16.sql?`, true);
    setLista((data as Comarca[]) ?? []);
    setMudadas(new Set());
    setVersao((n) => n + 1);
  }
  useEffect(() => { carregar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function alterar(id: number, campo: keyof Comarca, valor: any) {
    setLista((l) => l.map((c) => (c.id === id ? { ...c, [campo]: valor } : c)));
    setMudadas((s) => new Set(s).add(id));
  }

  async function acharNoMapa(c: Comarca) {
    if (!c.nome.trim()) return avisar('Escreva o nome da cidade primeiro.', true);
    setBuscando(c.id);
    try {
      const q = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'br', city: c.nome, state: c.uf === 'RJ' ? 'Rio de Janeiro' : c.uf || '' });
      const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, { headers: { 'Accept-Language': 'pt-BR' } });
      const [achou] = (await r.json()) as { lat: string; lon: string; display_name: string }[];
      if (!achou) return avisar('Não encontrei essa cidade. Confira o nome ou digite a latitude e longitude.', true);
      alterar(c.id, 'lat', Number(Number(achou.lat).toFixed(5)));
      alterar(c.id, 'lng', Number(Number(achou.lon).toFixed(5)));
      avisar(`Achei: ${achou.display_name.split(',').slice(0, 3).join(',')}. Clique em Salvar.`);
    } catch {
      avisar('Não consegui buscar agora. Tente de novo em alguns segundos.', true);
    } finally {
      setBuscando(null);
    }
  }

  async function salvar(c: Comarca) {
    const { id, ...dados } = c;
    const { error } = await supabase().from('comarcas').update({ ...dados, lat: c.lat === null || String(c.lat) === '' ? null : Number(c.lat), lng: c.lng === null || String(c.lng) === '' ? null : Number(c.lng), km: c.km === null || c.km === undefined || String(c.km) === '' ? null : Number(String(c.km).replace(',', '.')) }).eq('id', id);
    if (error) return avisar(error.message, true);
    avisar('Comarca salva');
    setMudadas((s) => { const n = new Set(s); n.delete(id); return n; });
    setVersao((n) => n + 1);
  }

  async function nova() {
    const ordem = (lista.at(-1)?.ordem ?? 0) + 1;
    const { error } = await supabase().from('comarcas').insert({ nome: '', uf: 'RJ', tipo: 'consulta', observacao: 'Sob consulta', ordem });
    if (error) return avisar(error.message, true);
    carregar();
  }

  async function excluir(c: Comarca) {
    if (!confirm(`Tirar ${c.nome || 'esta comarca'} do mapa?`)) return;
    const { error } = await supabase().from('comarcas').delete().eq('id', c.id);
    if (error) return avisar(error.message, true);
    carregar();
  }

  async function mover(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    const a = lista[i], b = lista[j];
    await Promise.all([
      supabase().from('comarcas').update({ ordem: b.ordem }).eq('id', a.id),
      supabase().from('comarcas').update({ ordem: a.ordem }).eq('id', b.id),
    ]);
    carregar();
  }

  const noMapa = lista.filter((c) => c.ativo && c.lat != null && c.lng != null);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div>
        <h2>Comarcas (mapa)</h2>
        <p className="adm-sub">As cidades aparecem no mapa do site, na parte de Correspondente e na página para escritórios. Escreva o nome e clique em <strong>📍 Achar no mapa</strong>: a localização é preenchida sozinha.</p>
      </div>

      <div className="adm-item">
        <h3 style={{ margin: 0 }}>🚗 Deslocamento automático</h3>
        <p className="adm-dica" style={{ margin: 0 }}>O valor aparece no mapa do site e é sugerido sozinho no pedido e no orçamento quando você escolhe a comarca.</p>
        <div className="adm-grade">
          <label>R$ por km<input inputMode="decimal" value={regra.km_valor} onChange={(e) => setRegra((r) => ({ ...r, km_valor: e.target.value }))} /></label>
          <label>Cobrar acima de (km)<input inputMode="decimal" value={regra.km_franquia} onChange={(e) => setRegra((r) => ({ ...r, km_franquia: e.target.value }))} /></label>
          <label className="adm-check"><input type="checkbox" checked={regra.km_ida_volta} onChange={(e) => setRegra((r) => ({ ...r, km_ida_volta: e.target.checked }))} /> Contar ida e volta</label>
        </div>
        <p className="adm-dica" style={{ margin: 0 }}>
          Exemplo: 40 km → {brl(valorDeslocamento(40, regraNum).valor)} ({regraNum.km_ida_volta ? 'ida e volta, ' : ''}{brl(regraNum.km_valor)}/km acima de {regraNum.km_franquia} km).
        </p>
        <div className="adm-linha">
          <button className="adm-btn pri" onClick={salvarRegra}>Salvar regra</button>
          <button className="adm-btn" onClick={calcularTodas} disabled={calculando}>{calculando ? 'Calculando…' : '📏 Calcular km pela estrada (todas)'}</button>
        </div>
      </div>

      {lista.map((c, i) => (
        <div key={c.id} className={`adm-item${mudadas.has(c.id) ? ' mudou' : ''}`} style={{ borderLeft: `5px solid ${c.tipo === 'base' ? '#0e1b33' : c.tipo === 'deslocamento' ? '#a8894e' : '#9aa6bb'}` }}>
          <div className="adm-grade">
            <label>Cidade<input value={c.nome} onChange={(e) => alterar(c.id, 'nome', e.target.value)} placeholder="Ex.: Sapucaia" /></label>
            <label>UF<input value={c.uf || ''} maxLength={2} onChange={(e) => alterar(c.id, 'uf', e.target.value.toUpperCase())} /></label>
            <label>
              Como atendo
              <select value={c.tipo} onChange={(e) => alterar(c.id, 'tipo', e.target.value)}>
                {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
              </select>
            </label>
            <label>Observação (aparece no mapa)<input value={c.observacao || ''} onChange={(e) => alterar(c.id, 'observacao', e.target.value)} placeholder="Ex.: + R$ 30 de deslocamento" /></label>
            <label>Latitude<input inputMode="decimal" value={c.lat ?? ''} onChange={(e) => alterar(c.id, 'lat', e.target.value)} /></label>
            <label>Longitude<input inputMode="decimal" value={c.lng ?? ''} onChange={(e) => alterar(c.id, 'lng', e.target.value)} /></label>
            <label>
              Distância da base (km, estrada)
              <input inputMode="decimal" value={c.km ?? ''} onChange={(e) => alterar(c.id, 'km', e.target.value)} placeholder="Calcular automático" />
              {c.tipo !== 'base' && (() => {
                const base = lista.find((x) => x.tipo === 'base');
                const k = kmComarca({ ...c, km: c.km === null || String(c.km) === '' ? null : Number(String(c.km).replace(',', '.')) }, base);
                const d = valorDeslocamento(k.km, regraNum);
                return k.km ? <span className="adm-dica" style={{ margin: '4px 0 0' }}>{k.estimado ? '≈ ' : ''}{k.km} km · {d.valor ? `deslocamento ${brl(d.valor)}` : 'sem custo de deslocamento'}</span> : null;
              })()}
            </label>
            <label className="adm-check"><input type="checkbox" checked={c.ativo} onChange={(e) => alterar(c.id, 'ativo', e.target.checked)} /> Aparece no mapa</label>
          </div>
          <div className="adm-linha">
            <button className="adm-btn" onClick={() => acharNoMapa(c)} disabled={buscando === c.id}>{buscando === c.id ? 'Buscando…' : '📍 Achar no mapa'}</button>
            <button className="adm-btn pri" onClick={() => salvar(c)} disabled={!mudadas.has(c.id)}>Salvar</button>
            <button className="adm-btn peq" onClick={() => mover(i, -1)} aria-label="Subir">↑</button>
            <button className="adm-btn peq" onClick={() => mover(i, 1)} aria-label="Descer">↓</button>
            <button className="adm-btn peq perigo" onClick={() => excluir(c)}>Excluir</button>
            {(c.lat == null || String(c.lat) === '') && <span className="adm-dica" style={{ margin: 0, color: '#b3261e' }}>Sem localização: não aparece no mapa.</span>}
          </div>
        </div>
      ))}
      <div><button className="adm-btn pri" onClick={nova}>+ Nova comarca</button></div>

      {noMapa.length > 0 && (
        <div className="adm-item site" style={{ ['--navy' as string]: config.cor_primaria || '#0E1B33', ['--ouro' as string]: config.cor_destaque || '#A8894E', ['--fonte-titulo' as string]: `'${config.fonte_titulo || 'Cormorant Garamond'}', Georgia, serif`, minHeight: 0, background: 'transparent' }}>
          <h3 style={{ margin: 0 }}>Prévia do mapa (como aparece no site)</h3>
          <MapaComarcas key={versao} comarcas={noMapa.map((c) => ({ ...c, lat: Number(c.lat), lng: Number(c.lng) }))} config={{ ...config, ...regraNum }} titulo={false} />
        </div>
      )}
      <p className="adm-dica">Mapa: © colaboradores do OpenStreetMap. Gratuito e sem chave de acesso.</p>
    </div>
  );
}
