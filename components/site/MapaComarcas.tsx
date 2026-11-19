'use client';
// Mapa interativo das comarcas atendidas (OpenStreetMap + Leaflet, sem chave e sem custo).
// Base em destaque, linhas tracejadas até as outras cidades, distância aproximada e pedido direto no WhatsApp.
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Comarca, Config } from '@/lib/tipos';
import { linkWhats } from '@/lib/util';
import { msgComarca } from '@/lib/mensagens';
import { registrar } from '@/lib/estatisticas';
import { brl, kmComarca, valorDeslocamento } from '@/lib/gestao';

const TIPOS: Record<string, { rotulo: string; dica: string }> = {
  base: { rotulo: 'Onde estou', dica: 'Atendimento presencial no dia a dia' },
  deslocamento: { rotulo: 'Atendo com deslocamento', dica: 'Valor do serviço + deslocamento' },
  consulta: { rotulo: 'Sob consulta', dica: 'Verifique disponibilidade' },
};

// Distância até a base: pela estrada (se calculada no painel) ou estimada
const distancia = (base: Comarca, c: Comarca) => Math.round(kmComarca(c, base).km);
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export default function MapaComarcas({ comarcas, config, titulo = true }: { comarcas: Comarca[]; config: Config; titulo?: boolean }) {
  const caixa = useRef<HTMLDivElement>(null);
  const marcadores = useRef<Record<number, any>>({});
  const mapa = useRef<any>(null);
  const [ativa, setAtiva] = useState<number | null>(null);
  const [livre, setLivre] = useState(false); // mapa só "prende" o dedo/rolagem depois do primeiro toque

  const lista = comarcas.filter((c) => c.lat != null && c.lng != null);
  const base = lista.find((c) => c.tipo === 'base') ?? lista[0];

  useEffect(() => {
    if (!caixa.current || !lista.length) return;
    let cancelado = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelado || !caixa.current) return;
      const m = L.map(caixa.current, { scrollWheelZoom: false, dragging: false, zoomControl: true, attributionControl: true, tapHold: false } as any);
      mapa.current = m;
      m.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 17, minZoom: 7, className: 'mapa-tiles',
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(m);

      for (const c of lista) {
        if (base && c.id !== base.id) {
          L.polyline([[base.lat!, base.lng!], [c.lat!, c.lng!]], { className: `mapa-linha mapa-linha-${c.tipo}`, interactive: false }).addTo(m);
        }
      }
      for (const c of lista) {
        const icone = L.divIcon({
          className: '',
          html: `<span class="mapa-pino mapa-pino-${c.tipo}"><span></span></span>`,
          iconSize: c.tipo === 'base' ? [30, 30] : [20, 20],
          iconAnchor: c.tipo === 'base' ? [15, 15] : [10, 10],
          popupAnchor: [0, -12],
        });
        const desl = base && c.id !== base.id && c.tipo === 'deslocamento' ? valorDeslocamento(distancia(base, c), config).valor : 0;
        const km = base && c.id !== base.id ? `<span class="mapa-km">≈ ${distancia(base, c)} km de ${esc(base.nome)}${desl ? ` · deslocamento ${brl(desl)}` : ''}</span>` : '';
        const link = linkWhats(config.whatsapp, msgComarca({ comarca: c.nome, uf: c.uf, tipo: c.tipo }));
        const popup = `<div class="mapa-popup">
          <span class="mapa-etq mapa-etq-${c.tipo}">${esc(TIPOS[c.tipo]?.rotulo ?? '')}</span>
          <strong>${esc(c.nome)}${c.uf ? ` · ${esc(c.uf)}` : ''}</strong>
          ${km}
          ${c.observacao ? `<span>${esc(c.observacao)}</span>` : ''}
          <a class="mapa-zap" href="${link}" target="_blank" rel="noopener noreferrer" data-comarca="${esc(c.nome)}">Pedir serviço em ${esc(c.nome)}</a>
        </div>`;
        const mk = L.marker([c.lat!, c.lng!], { icon: icone, title: c.nome, zIndexOffset: c.tipo === 'base' ? 1000 : 0 })
          .addTo(m).bindPopup(popup, { closeButton: true, maxWidth: 260 });
        mk.on('click', () => setAtiva(c.id));
        marcadores.current[c.id] = mk;
      }
      m.on('popupclose', () => setAtiva(null));
      m.getContainer().addEventListener('click', (e: Event) => {
        const a = (e.target as HTMLElement).closest('a.mapa-zap') as HTMLAnchorElement | null;
        if (a) registrar('whatsapp', false, `Mapa: ${a.dataset.comarca}`);
      });
      const limites = L.latLngBounds(lista.map((c) => [c.lat!, c.lng!] as [number, number]));
      m.fitBounds(limites, { padding: [36, 36], maxZoom: 11 });
    })();
    return () => { cancelado = true; mapa.current?.remove(); mapa.current = null; marcadores.current = {}; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lista.map((c) => [c.id, c.lat, c.lng, c.tipo, c.observacao, c.nome, c.km])), config.km_valor, config.km_franquia, config.km_ida_volta]);

  function liberar() {
    if (livre || !mapa.current) return;
    mapa.current.dragging.enable();
    mapa.current.scrollWheelZoom.enable();
    setLivre(true);
  }

  function focar(c: Comarca) {
    const m = mapa.current;
    if (!m) return;
    m.once('moveend', () => marcadores.current[c.id]?.openPopup());
    m.flyTo([c.lat!, c.lng!], Math.max(m.getZoom(), 11), { duration: 0.8 });
    setAtiva(c.id);
  }

  if (!lista.length) return null;
  const grupos = (['base', 'deslocamento', 'consulta'] as const).map((t) => ({ t, itens: lista.filter((c) => c.tipo === t) })).filter((g) => g.itens.length);

  return (
    <div className="mapa-bloco">
      {titulo && (
        <div className="secao-cabeca">
          <hr className="filete" />
          <h2>Comarcas atendidas</h2>
          <p>Toque em uma cidade para ver a distância e pedir o serviço direto pelo WhatsApp.</p>
        </div>
      )}
      <div className="mapa-grade">
        <div className="mapa-moldura" onClick={liberar}>
          <div ref={caixa} className="mapa" role="region" aria-label="Mapa das comarcas atendidas" />
          {!livre && <span className="mapa-dica" aria-hidden="true">Toque no mapa para mover e dar zoom</span>}
        </div>
        <aside className="mapa-lista">
          {grupos.map(({ t, itens }) => (
            <div key={t}>
              <h3><span className={`mapa-pino mapa-pino-${t} mini`}><span /></span> {TIPOS[t].rotulo}</h3>
              <p className="mapa-dica-tipo">{TIPOS[t].dica}</p>
              <ul>
                {itens.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={ativa === c.id ? 'ativa' : ''} onClick={() => focar(c)}>
                      <span>{c.nome}</span>
                      {base && c.id !== base.id && <small>≈ {distancia(base, c)} km</small>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mapa-rodape">Não achou sua comarca? <a href={linkWhats(config.whatsapp, msgComarca({ comarca: '(qual cidade?)', tipo: 'consulta' }))} target="_blank" rel="noopener noreferrer">Pergunte no WhatsApp</a>.</p>
        </aside>
      </div>
    </div>
  );
}
