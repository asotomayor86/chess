'use client';

import { useEffect, useRef } from 'react';

/** Lista de jugadas en notación SAN, agrupadas por número de jugada. */
export function Historial({ jugadas }: { jugadas: string[] }) {
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [jugadas.length]);

  const pares: { n: number; blanca: string; negra?: string }[] = [];
  for (let i = 0; i < jugadas.length; i += 2) {
    pares.push({ n: i / 2 + 1, blanca: jugadas[i], negra: jugadas[i + 1] });
  }

  return (
    <div className="h-40 overflow-y-auto rounded-md border border-white/10 bg-black/20 p-2 text-sm md:h-full">
      {pares.length === 0 ? (
        <p className="px-1 py-2 text-crema/40">Aún no hay jugadas.</p>
      ) : (
        <ol className="space-y-0.5">
          {pares.map((p) => (
            <li key={p.n} className="grid grid-cols-[2rem_1fr_1fr] gap-1">
              <span className="text-crema/40">{p.n}.</span>
              <span className="font-medium text-crema">{p.blanca}</span>
              <span className="font-medium text-crema/85">{p.negra ?? ''}</span>
            </li>
          ))}
        </ol>
      )}
      <div ref={finRef} />
    </div>
  );
}
