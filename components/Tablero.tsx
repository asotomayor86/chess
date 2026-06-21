'use client';

import { useMemo } from 'react';
import {
  aCasilla,
  casillaJaque,
  movimientosLegales,
  tableroDesdeFen,
  type Color,
  type Square,
} from '@/lib/ajedrez';
import { miColor, useStore } from '@/lib/store';
import { Pieza } from './Pieza';

export function Tablero() {
  const estado = useStore((s) => s.estado);
  const seleccion = useStore((s) => s.seleccion);
  const modo = useStore((s) => s.modo);
  const miAsiento = useStore((s) => s.miAsiento);
  const seleccionar = useStore((s) => s.seleccionar);

  // Orientación: en local siempre blancas abajo; en online, mi color abajo.
  const blancasAbajo =
    modo === 'local' || miAsiento === null || !estado
      ? true
      : miColor(estado, miAsiento) === 'w';

  const tablero = useMemo(
    () => (estado ? tableroDesdeFen(estado.fen) : null),
    [estado],
  );

  const destinos = useMemo(() => {
    if (!estado || !seleccion) return new Map<Square, boolean>();
    const m = new Map<Square, boolean>();
    for (const mov of movimientosLegales(estado.fen, seleccion)) {
      m.set(mov.destino, mov.captura);
    }
    return m;
  }, [estado, seleccion]);

  const jaque = useMemo(() => (estado ? casillaJaque(estado.fen) : null), [estado]);

  if (!estado || !tablero) {
    return <div className="aspect-square w-full max-w-[640px] rounded bg-tablaPanel" />;
  }

  // Orden de filas/columnas de PINTADO según la orientación.
  const filas = blancasAbajo ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = blancasAbajo ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="aspect-square w-full max-w-[640px] overflow-hidden rounded-md shadow-tablero ring-1 ring-black/40">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">
        {filas.map((fila) =>
          cols.map((col) => {
            const sq = aCasilla(fila, col);
            const pieza = tablero[fila][col];
            const clara = (fila + col) % 2 === 0;
            const esSeleccion = seleccion === sq;
            const esDestino = destinos.has(sq);
            const esCaptura = destinos.get(sq) === true;
            const esUltimo = estado.ultimo && (estado.ultimo.from === sq || estado.ultimo.to === sq);
            const esJaque = jaque === sq;

            // La fila/columna de borde muestra coordenadas (relativas a la orientación).
            const muestraFila = col === (blancasAbajo ? 0 : 7);
            const muestraCol = fila === (blancasAbajo ? 7 : 0);

            return (
              <button
                key={sq}
                onClick={() => seleccionar(sq)}
                className="relative flex items-center justify-center"
                style={{
                  backgroundColor: clara ? '#f0d9b5' : '#b58863',
                  fontSize: 'min(8.2vw, 4.6rem)',
                }}
                aria-label={sq}
              >
                {/* Resaltados de fondo (apilados). */}
                {esUltimo && <span className="absolute inset-0 bg-[#cdd26a]/55" />}
                {esSeleccion && <span className="absolute inset-0 bg-[#f6f669]/60" />}
                {esJaque && (
                  <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(224,108,94,.95)_0%,rgba(224,108,94,.35)_70%,transparent_75%)]" />
                )}

                {/* Coordenadas. */}
                {muestraFila && (
                  <span
                    className="pointer-events-none absolute left-0.5 top-0 text-[10px] font-semibold"
                    style={{ color: clara ? '#b58863' : '#f0d9b5' }}
                  >
                    {8 - fila}
                  </span>
                )}
                {muestraCol && (
                  <span
                    className="pointer-events-none absolute bottom-0 right-0.5 text-[10px] font-semibold"
                    style={{ color: clara ? '#b58863' : '#f0d9b5' }}
                  >
                    {'abcdefgh'[col]}
                  </span>
                )}

                {/* Pieza. */}
                {pieza && <Pieza color={pieza.color as Color} tipo={pieza.tipo} />}

                {/* Indicador de movimiento legal. */}
                {esDestino && !esCaptura && (
                  <span className="punto-movimiento absolute" />
                )}
                {esDestino && esCaptura && (
                  <span className="anillo-captura absolute inset-0" />
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
