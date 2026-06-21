'use client';

import type { Color, TipoPieza } from '@/lib/ajedrez';

// Usamos los glifos Unicode "sólidos" para AMBOS colores y los teñimos por CSS:
// así las dos siluetas son idénticas y se distinguen solo por el color + contorno.
const GLIFO: Record<TipoPieza, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

// Contorno por text-shadow (4 direcciones) para que la pieza resalte sobre
// cualquier color de casilla.
const CONTORNO_BLANCA =
  '0 0 1px #1a1a1a, 1px 1px 1px #1a1a1a, -1px 1px 1px #1a1a1a, 1px -1px 1px #1a1a1a, -1px -1px 1px #1a1a1a';
const CONTORNO_NEGRA =
  '0 0 1px rgba(245,245,240,.7), 1px 1px 1px rgba(245,245,240,.35), -1px -1px 1px rgba(245,245,240,.35)';

export function Pieza({ color, tipo }: { color: Color; tipo: TipoPieza }) {
  const blanca = color === 'w';
  return (
    <span
      className="pieza-aparece pointer-events-none select-none leading-none"
      style={{
        fontSize: '78%',
        color: blanca ? '#f7f7f2' : '#262421',
        textShadow: blanca ? CONTORNO_BLANCA : CONTORNO_NEGRA,
      }}
      aria-hidden
    >
      {GLIFO[tipo]}
    </span>
  );
}
