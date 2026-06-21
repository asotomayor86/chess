'use client';

import { material, type Color, type TipoPieza } from '@/lib/ajedrez';

const GLIFO: Record<TipoPieza, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

/**
 * Fila de piezas capturadas por un bando + ventaja de material. `bando` es el
 * color que CAPTURÓ (muestra las piezas rivales que se comió).
 */
export function Capturas({ fen, bando }: { fen: string; bando: Color }) {
  const m = material(fen);
  // Si yo soy blancas, muestro las negras que capturé (= capturadasNegras).
  const capturadas = bando === 'w' ? m.capturadasNegras : m.capturadasBlancas;
  const ventaja = bando === 'w' ? m.ventaja : -m.ventaja;

  return (
    <div className="flex min-h-[20px] items-center gap-1 text-lg leading-none">
      <span className="flex flex-wrap" style={{ color: bando === 'w' ? '#262421' : '#f7f7f2' }}>
        {capturadas.map((t, i) => (
          <span key={i} aria-hidden>
            {GLIFO[t]}
          </span>
        ))}
      </span>
      {ventaja > 0 && <span className="text-xs font-semibold text-crema/60">+{ventaja}</span>}
    </div>
  );
}
