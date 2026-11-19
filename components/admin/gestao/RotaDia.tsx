'use client';
// Rota do dia: junta as diligências (e demais compromissos com local) de um dia em sequência no mapa,
// começando pela base, e abre o trajeto pronto no Google Maps.
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import { normalizar } from '@/lib/util';
import { COR_AGENDA, dataBR, diaSemana, distanciaReta, type Compromisso } from '@/lib/gestao';
import type { Comarca } from '@/lib/tipos';

type Ponto = { id: number; titulo: string; local: string; hora: string | null; tipo: string; lat: number; lng: number };
type Aviso = (m: string, e?: boolean) => void;

// Ordem pelo vizinho mais próximo, respeitando quem tem hora marcada (vai na ordem do horário)
function ordenar(base: { lat: number; lng: number } | null, pontos: Ponto[]) {
  const comHora = pontos.filter((p) => p.hora).sort((a, b) => a.hora!.localeCompare(b.hora!));
  const semHora = pontos.filter((p) => !p.hora);
  const r: Ponto[] = [];
  let atual: { lat: number; lng: number } = base ?? comHora[0] ?? semHora[0];
  const resto = [...semHora];
  const pegar = () => { resto.sort((a, b) => distanciaReta(atual, a) - distanciaReta(atual, b)); const p = resto.shift()!; r.push(p); atual = p; };
  // Sem hora: encaixa pelo mais próximo; com hora: entra na ordem do horário
  for (const h of comHora) {
    while (resto.length && Math.min(...resto.map((x) => distanciaReta(atual, x))) < distanciaReta(atual, h)) pegar();
    r.push(h); atual = h;
  }
  while (resto.length) pegar();
  return r;
}

async function geocodificar(local: string) {
  const q = new URLSearchParams({ format: 'json', limit: '1', countrycodes: 'br', q: local });
  const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, { headers: { 'Accept-Language': 'pt-BR' } });
  const [achou] = (await r.json()) as { lat: string; lon: string }[];
  return achou ? { lat: Number(achou.lat), lng: Number(achou.lon) } : null;
}

export default function RotaDia({ dia, itens, avisar, fechar }: { dia: string; itens: Compromisso[]; avisar: Aviso; fechar: () => void }) {
  const [comarcas, setComarcas] = useState<Comarca[]>([]);
  const [pontos, setPontos] = useState<Ponto[] | null>(null);
  const [semLocal, setSemLocal] = useState<Compromisso[]>([]);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const k = await supabase().from('comarcas').select('*').order('ordem');
      const lista = ((k.data as Comarca[]) ?? []).filter((c) => c.lat != null);
      setComarcas(lista);
      const achados: Ponto[] = [];
      const faltam: Compromisso[] = [];
      for (const i of itens) {
        let pos = i.lat != null && i.lng != null ? { lat: Number(i.lat), lng: Number(i.lng) } : null;
        if (!pos && i.local?.trim()) {
          try { pos = await geocodificar(`${i.local}, RJ`); } catch { /* tenta pela comarca */ }
          // Não achou o endereço? Usa a cidade citada no local (ex.: "Fórum de Paraíba do Sul")
          if (!pos) {
            const c = lista.find((x) => normalizar(i.local).includes(normalizar(x.nome)));
            if (c) pos = { lat: Number(c.lat), lng: Number(c.lng) };
          }
          if (pos) await supabase().from('agenda').update({ lat: pos.lat, lng: pos.lng }).eq('id', i.id);
        }
        if (pos) achados.push({ id: i.id, titulo: i.titulo, local: i.local, hora: i.hora, tipo: i.tipo, ...pos });
        else faltam.push(i);
      }
      const base = lista.find((c) => c.tipo === 'base');
      setPontos(ordenar(base ? { lat: Number(base.lat), lng: Number(base.lng) } : null, achados));
      setSemLocal(faltam);
    })();
  }, [itens]);

  const base = comarcas.find((c) => c.tipo === 'base');
  const inicio = base ? { lat: Number(base.lat), lng: Number(base.lng) } : null;

  // Mapa com os pontos numerados
  useEffect(() => {
    if (!caixa.current || !pontos?.length) return;
    let cancelado = false;
    let mapa: any;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelado || !caixa.current) return;
      mapa = L.map(caixa.current, { scrollWheelZoom: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(mapa);
      const caminho: [number, number][] = [];
      if (inicio) {
        caminho.push([inicio.lat, inicio.lng]);
        L.marker([inicio.lat, inicio.lng], { icon: L.divIcon({ className: '', html: '<span class="rota-num rota-base">🏠</span>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(mapa).bindPopup(`Saída: ${base?.nome}`);
      }
      pontos.forEach((p, i) => {
        caminho.push([p.lat, p.lng]);
        const cor = (COR_AGENDA[p.tipo] ?? COR_AGENDA.outro).cor;
        L.marker([p.lat, p.lng], { icon: L.divIcon({ className: '', html: `<span class="rota-num" style="background:${cor}">${i + 1}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }) })
          .addTo(mapa).bindPopup(`${i + 1}. ${p.hora ? `${p.hora.slice(0, 5)} · ` : ''}${p.titulo.replace(/</g, '&lt;')}`);
      });
      L.polyline(caminho, { color: '#a8894e', weight: 4, dashArray: '8 6' }).addTo(mapa);
      mapa.fitBounds(L.latLngBounds(caminho), { padding: [30, 30], maxZoom: 14 });
    })();
    return () => { cancelado = true; mapa?.remove(); };
  }, [pontos]); // eslint-disable-line react-hooks/exhaustive-deps

  function mover(i: number, d: -1 | 1) {
    setPontos((l) => {
      if (!l) return l;
      const n = [...l];
      const j = i + d;
      if (j < 0 || j >= n.length) return l;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }

  const linkGoogle = () => {
    if (!pontos?.length) return '';
    const ll = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;
    const destino = pontos[pontos.length - 1];
    const meio = pontos.slice(0, -1).map(ll).join('|');
    const q = new URLSearchParams({ api: '1', destination: ll(destino), travelmode: 'driving' });
    if (inicio) q.set('origin', ll(inicio));
    if (meio) q.set('waypoints', meio);
    return `https://www.google.com/maps/dir/?${q}`;
  };
  const kmTotal = pontos?.length
    ? Math.round([inicio, ...pontos].filter(Boolean).reduce((s, p, i, arr) => (i ? s + distanciaReta(arr[i - 1]!, p!) : 0), 0) * 1.3)
    : 0;

  return (
    <div className="adm-item mudou" style={{ gap: 12 }}>
      <div className="adm-linha" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>🗺️ Rota de {diaSemana(dia)}, {dataBR(dia)}</h3>
        <button className="adm-btn peq" onClick={fechar}>Fechar</button>
      </div>
      {!pontos && <p className="adm-sub" style={{ margin: 0 }}>Localizando os endereços…</p>}
      {pontos && !pontos.length && <p className="adm-sub" style={{ margin: 0 }}>Nenhum compromisso deste dia tem local que eu consiga achar no mapa. Preencha o campo “Local” (ex.: Fórum de Três Rios).</p>}
      {!!pontos?.length && (
        <>
          <div ref={caixa} className="rota-mapa" role="region" aria-label="Mapa da rota do dia" />
          <ol className="rota-lista">
            {inicio && <li className="rota-saida">🏠 Saída: {base?.nome}</li>}
            {pontos.map((p, i) => (
              <li key={p.id}>
                <span className="rota-num" style={{ background: (COR_AGENDA[p.tipo] ?? COR_AGENDA.outro).cor }}>{i + 1}</span>
                <span style={{ flex: 1 }}><strong>{p.hora ? `${p.hora.slice(0, 5)} · ` : ''}{p.titulo}</strong><small className="adm-dica" style={{ display: 'block', margin: 0 }}>{p.local}</small></span>
                <button className="adm-btn peq" onClick={() => mover(i, -1)} aria-label="Antes">↑</button>
                <button className="adm-btn peq" onClick={() => mover(i, 1)} aria-label="Depois">↓</button>
              </li>
            ))}
          </ol>
          <div className="adm-linha">
            <a className="adm-btn pri" href={linkGoogle()} target="_blank" rel="noopener noreferrer">Abrir rota no Google Maps</a>
            <span className="adm-dica" style={{ margin: 0 }}>≈ {kmTotal} km no total (estimado). Quem tem hora marcada fica na ordem do horário.</span>
          </div>
        </>
      )}
      {semLocal.length > 0 && (
        <p className="adm-dica" style={{ margin: 0, color: '#b3261e' }}>Fora do mapa (sem local encontrado): {semLocal.map((s) => s.titulo).join(', ')}.</p>
      )}
    </div>
  );
}
