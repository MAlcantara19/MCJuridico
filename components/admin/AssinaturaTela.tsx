'use client';
// Assinar com o dedo (ou mouse) direto na tela. Gera um PNG com fundo transparente.
import { useEffect, useRef, useState } from 'react';

export default function AssinaturaTela({ aoConfirmar, aoCancelar, textoConfirmar = 'Usar esta assinatura' }: {
  aoConfirmar: (png: string) => void; aoCancelar: () => void; textoConfirmar?: string;
}) {
  const tela = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const ultimo = useRef<{ x: number; y: number } | null>(null);
  const [vazio, setVazio] = useState(true);

  // Ajusta a resolução ao tamanho real (fica nítido no celular)
  useEffect(() => {
    const c = tela.current!;
    const ajustar = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const ctx = c.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0b1530';
      setVazio(true);
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, []);

  const ponto = (e: React.PointerEvent) => {
    const r = tela.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5 };
  };

  function comecar(e: React.PointerEvent) {
    e.preventDefault();
    tela.current!.setPointerCapture(e.pointerId);
    desenhando.current = true;
    const p = ponto(e);
    ultimo.current = p;
    const ctx = tela.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1530';
    ctx.fill();
    setVazio(false);
  }
  function mover(e: React.PointerEvent) {
    if (!desenhando.current || !ultimo.current) return;
    const p = ponto(e);
    const ctx = tela.current!.getContext('2d')!;
    const dist = Math.hypot(p.x - ultimo.current.x, p.y - ultimo.current.y);
    ctx.lineWidth = Math.max(1.4, Math.min(3.4, 3.6 - dist / 12)) * (e.pointerType === 'pen' ? 0.6 + p.p : 1);
    ctx.beginPath();
    ctx.moveTo(ultimo.current.x, ultimo.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ultimo.current = p;
  }
  function parar() { desenhando.current = false; ultimo.current = null; }

  function limpar() {
    const c = tela.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    setVazio(true);
  }

  // Recorta as bordas vazias antes de devolver
  function confirmar() {
    const c = tela.current!;
    const ctx = c.getContext('2d')!;
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    let x0 = width, y0 = height, x1 = 0, y1 = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
    }
    if (x1 <= x0) return;
    const m = 12;
    x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(width, x1 + m); y1 = Math.min(height, y1 + m);
    const out = document.createElement('canvas');
    out.width = x1 - x0; out.height = y1 - y0;
    out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    aoConfirmar(out.toDataURL('image/png'));
  }

  return (
    <div className="assinatura-caixa">
      <canvas
        ref={tela}
        className="assinatura-tela"
        onPointerDown={comecar}
        onPointerMove={mover}
        onPointerUp={parar}
        onPointerCancel={parar}
        onPointerLeave={parar}
        aria-label="Área para assinar com o dedo"
      />
      <span className="assinatura-guia" aria-hidden="true">{vazio ? 'Assine aqui com o dedo' : ''}</span>
      <div className="adm-linha">
        <button type="button" className="adm-btn pri" onClick={confirmar} disabled={vazio}>{textoConfirmar}</button>
        <button type="button" className="adm-btn" onClick={limpar} disabled={vazio}>Limpar</button>
        <button type="button" className="adm-btn" onClick={aoCancelar}>Cancelar</button>
      </div>
    </div>
  );
}

// Converte o PNG (data URL) em arquivo para enviar ao Storage
export function pngParaArquivo(dataUrl: string, nome = 'assinatura.png') {
  const [, b64] = dataUrl.split(',');
  const bin = atob(b64);
  return new File([Uint8Array.from(bin, (c) => c.charCodeAt(0))], nome, { type: 'image/png' });
}
