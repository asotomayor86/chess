'use client';

import { ButtonHTMLAttributes } from 'react';

type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
}

const CLASES: Record<Variante, string> = {
  primario:
    'bg-acento text-white hover:bg-acentoOscuro disabled:bg-acento/40 disabled:text-white/70',
  secundario:
    'bg-tablaPanel text-crema border border-white/15 hover:bg-black/30 disabled:opacity-50',
  peligro: 'bg-jaque text-white hover:bg-[#c9584b] disabled:bg-jaque/40',
  fantasma: 'bg-transparent text-crema/80 hover:bg-white/10 disabled:opacity-40',
};

export function Boton({ variante = 'primario', className = '', children, ...props }: Props) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium tracking-wide transition disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-acento/50 ${CLASES[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
