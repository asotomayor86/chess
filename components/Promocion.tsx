'use client';

import { turno, type Color, type Promocion as TipoPromo } from '@/lib/ajedrez';
import { miColor, useStore } from '@/lib/store';
import { Pieza } from './Pieza';

const OPCIONES: TipoPromo[] = ['q', 'r', 'b', 'n'];
const NOMBRE: Record<TipoPromo, string> = {
  q: 'Dama',
  r: 'Torre',
  b: 'Alfil',
  n: 'Caballo',
};

/** Diálogo de coronación: aparece cuando un peón llega a la última fila. */
export function Promocion() {
  const estado = useStore((s) => s.estado);
  const promocion = useStore((s) => s.promocion);
  const modo = useStore((s) => s.modo);
  const miAsiento = useStore((s) => s.miAsiento);
  const elegir = useStore((s) => s.elegirPromocion);
  const cancelar = useStore((s) => s.cancelarPromocion);

  if (!estado || !promocion) return null;

  const color: Color =
    modo === 'local' || miAsiento === null
      ? turno(estado.fen)
      : miColor(estado, miAsiento);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
      onClick={cancelar}
    >
      <div
        className="rounded-xl border border-white/10 bg-tablaPanel p-5 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-3 text-center text-sm text-crema/80">Corona el peón</p>
        <div className="flex gap-2">
          {OPCIONES.map((p) => (
            <button
              key={p}
              onClick={() => elegir(p)}
              title={NOMBRE[p]}
              className="flex h-16 w-16 items-center justify-center rounded-lg bg-casillaClara text-5xl transition hover:bg-seleccion"
            >
              <Pieza color={color} tipo={p} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
